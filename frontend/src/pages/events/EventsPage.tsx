// src/pages/events/EventsPage.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './events.module.scss'; // Стили для страницы

// Redux imports
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  // Thunks
  fetchEvents,
  participateInEvent,
  cancelParticipation,
  deleteEvent,
  fetchParticipants,
  // Selectors
  selectAllEvents,
  selectEventsIsLoading,
  selectEventsError,
  selectParticipationLoading,
  selectParticipantsModalState,
  selectEventsSubmitting, // Используется для delete
  // Actions
  clearEventsError,
  openParticipantsModal,
  closeParticipantsModal,
} from '../../features/events/eventsSlice';
import {
  logout,
  selectCurrentUser,
  selectIsAuthenticated,
} from '../../features/auth/authSlice';
import type { IEvent as ApiEvent } from '../../api/eventService'; // Тип события

// Компонент модального окна (предполагается, что он существует)
import ParticipantsModal from '../../components/ParticipantsModal'; // Путь к вашему компоненту модалки

// Тип для категорий и маппинг
type CategoryType = 'concert' | 'lecture' | 'exhibition';
const CATEGORIES: CategoryType[] = ['concert', 'lecture', 'exhibition'];
const CATEGORY_DISPLAY_NAMES: Record<CategoryType, string> = {
  concert: 'Концерты',
  lecture: 'Лекции',
  exhibition: 'Выставки',
};

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // --- Состояние из Redux ---
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const events = useAppSelector(selectAllEvents);
  const isLoadingEvents = useAppSelector(selectEventsIsLoading); // Загрузка списка
  const eventsError = useAppSelector(selectEventsError);         // Ошибка списка
  const participationLoading = useAppSelector(selectParticipationLoading); // Загрузка участия { eventId: boolean }
  const participantsModal = useAppSelector(selectParticipantsModalState); // Состояние модалки
  const isDeleting = useAppSelector(selectEventsSubmitting); // Используем общий флаг isSubmitting для удаления

  // --- Локальное состояние для фильтра ---
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);

  // --- Эффекты ---

  // 1. Проверка авторизации и загрузка данных
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    dispatch(fetchEvents(selectedCategory ?? undefined));
    return () => { dispatch(clearEventsError()); }
  }, [isAuthenticated, selectedCategory, dispatch, navigate]);

  // 2. Загрузка участников при открытии модального окна
  useEffect(() => {
    if (participantsModal.isOpen && participantsModal.eventId !== null) {
      dispatch(fetchParticipants(participantsModal.eventId));
    }
  }, [participantsModal.isOpen, participantsModal.eventId, dispatch]);


  // --- Обработчики ---

  const handleLogout = () => { dispatch(logout()); };
  const handleSelectCategory = (category: CategoryType | null) => { setSelectedCategory(category); };

  const handleParticipate = (eventId: number) => {
    if (!participationLoading[eventId]) {
      dispatch(participateInEvent(eventId));
    }
  };

  const handleCancelParticipation = (eventId: number) => {
    if (!participationLoading[eventId]) {
      dispatch(cancelParticipation(eventId));
    }
  };

  const handleDelete = (eventId: number) => {
    if (isDeleting) return; // Не запускать удаление, если уже идет
    if (window.confirm('Вы уверены, что хотите удалить это мероприятие?')) {
      dispatch(deleteEvent(eventId))
        .unwrap()
        .then(() => console.log(`Событие ${eventId} удалено`))
        .catch(err => console.error(`Ошибка удаления события ${eventId}:`, err));
    }
  };

  const handleViewParticipants = (eventId: number) => {
    dispatch(openParticipantsModal(eventId));
  };

  const handleCloseModal = () => {
    dispatch(closeParticipantsModal());
  };


  // --- Рендеринг ---

  if (!isAuthenticated && !currentUser) { // Проверка перед рендером
    return <div className={styles.loadingIndicator}>Проверка авторизации...</div>;
  }

  return (
    <div className={styles.eventsPageContainer}>
      {/* --- Шапка --- */}
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          MyAppLogo
        </Link>
        {currentUser && (
          <div className={styles.userInfo}>
            <span>Здравствуйте, {currentUser.name}!</span>
            <Link to="/profile" className={styles.navButton}>
              Профиль
            </Link>
            <Link to="/events/create" className={styles.navButton}>
              Создать
            </Link>
            <button onClick={handleLogout} className={styles.navButton}>
              Выйти
            </button>
          </div>
        )}
      </header>

      <main className={styles.mainContent}>
        <h1>Список мероприятий</h1>

        {/* --- Фильтры --- */}
        <div className={styles.filtersContainer}>
          <h3>Фильтры</h3>
          <div className={styles.filterButtons}>
            <button onClick={() => handleSelectCategory(null)} className={`${styles.filterButton} ${selectedCategory === null ? styles.activeFilter : ''}`} disabled={isLoadingEvents}>Все категории</button>
            {CATEGORIES.map((category) => ( <button key={category} onClick={() => handleSelectCategory(category)} className={`${styles.filterButton} ${selectedCategory === category ? styles.activeFilter : ''}`} disabled={isLoadingEvents}>{CATEGORY_DISPLAY_NAMES[category]}</button> ))}
          </div>
        </div>

        {/* --- Статус загрузки/ошибки списка --- */}
        {isLoadingEvents && <div className={styles.loadingIndicator}>Загрузка мероприятий...</div>}
        {eventsError && <div className={styles.errorMessage}>{eventsError}</div>}

        {/* --- Список событий / Сообщение об отсутствии --- */}
        {!isLoadingEvents && !eventsError && events.length === 0 && ( <p className={styles.noEventsMessage}>{selectedCategory ? `Нет мероприятий в категории "${CATEGORY_DISPLAY_NAMES[selectedCategory]}"` : 'Нет доступных мероприятий.'}</p> )}
        {!isLoadingEvents && !eventsError && events.length > 0 && (
          <div className={styles.eventsList}>
            {events.map((event: ApiEvent) => {
              const isCreator = currentUser?.id === event.createdBy;
              const isParticipating = event.isCurrentUserParticipating;
              const participationLoad = participationLoading[event.id] ?? false;
              const deleteLoad = isDeleting; // Используем общий флаг для удаления

              return (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventCardContent}>
                    <h3>{event.title}</h3>
                    <p className={styles.eventCategory}><strong>Категория:</strong> {CATEGORY_DISPLAY_NAMES[event.category as CategoryType] || event.category}</p>
                    <p className={styles.eventDateLocation}>{event.date && (<><strong>Дата:</strong> {new Date(event.date).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}<br/></>)}</p>
                    <p className={styles.eventDescription}>{event.description || 'Описание отсутствует.'}</p>
                  </div>
                  {/* --- Блок кнопок на карточке --- */}
                  <div className={styles.eventCardActions}>
                    {/* Кнопка Участники */}
                    <button
                        onClick={() => handleViewParticipants(event.id)}
                        className={`${styles.actionButton} ${styles.participantsButton}`}
                        disabled={isLoadingEvents} // Блокируем, пока грузится список
                    >
                      Участники ({event.participantsCount ?? 0})
                    </button>

                    {/* Кнопки Участия (не показываем создателю) */}
                    {!isCreator && (
                       isParticipating ? (
                        <button
                          onClick={() => handleCancelParticipation(event.id)}
                          className={`${styles.actionButton} ${styles.cancelButton}`}
                          disabled={participationLoad}
                        >
                          {participationLoad ? 'Отмена...' : 'Отменить участие'}
                        </button>
                       ) : (
                        <button
                          onClick={() => handleParticipate(event.id)}
                          className={`${styles.actionButton} ${styles.participateButton}`}
                          disabled={participationLoad}
                         >
                           {participationLoad ? 'Регистрация...' : 'Участвовать'}
                         </button>
                       )
                    )}

                    {/* Кнопки Редактирования/Удаления (только для создателя) */}
                    {isCreator && (
                       <>
                        <Link to={`/events/edit/${event.id}`} className={`${styles.actionButton} ${styles.editButton}`}>
                            Редактировать
                        </Link>
                        <button
                            onClick={() => handleDelete(event.id)}
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            disabled={deleteLoad} // Используем общий флаг удаления
                        >
                            {deleteLoad ? 'Удаление...' : 'Удалить'}
                        </button>
                       </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Приложение Мероприятий. Все права защищены.</p>
      </footer>

      {/* --- Модальное окно участников --- */}
      {participantsModal.isOpen && (
        <ParticipantsModal
          isOpen={participantsModal.isOpen}
          onClose={handleCloseModal}
          participants={participantsModal.participants}
          isLoading={participantsModal.isLoading}
          error={participantsModal.error}
          // eventId={participantsModal.eventId} // Можно передать ID, если нужно в модалке
        />
      )}
    </div>
  );
};

export default EventsPage;