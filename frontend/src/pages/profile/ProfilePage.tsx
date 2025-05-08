// src/pages/profile/ProfilePage.tsx

import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout, selectCurrentUser } from "../../features/auth/authSlice";
import {
  deleteEvent,
  selectAllEvents,
  selectEventsSubmitting,
  clearEventsError, // Опционально, для сброса ошибок при входе на страницу
} from "../../features/events/eventsSlice";
import styles from "./profilePage.module.scss"; // Стили для страницы профиля
import eventCardStyles from "../events/events.module.scss"; // Импортируем стили карточки для переиспользования
import type { IEvent as ApiEvent } from "../../api/eventService"; // Убрали EventCategory

// Маппинг для отображения названий категорий (можно вынести в общие utils)
const CATEGORY_DISPLAY_NAMES: Record<ApiEvent['category'], string> = {
    concert: "Концерты",
    lecture: "Лекции",
    exhibition: "Выставки",
  };

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Получаем данные из Redux
  const currentUser = useAppSelector(selectCurrentUser);
  const allEvents = useAppSelector(selectAllEvents); // Получаем ВСЕ события
  const isProcessingEvent = useAppSelector(selectEventsSubmitting); // Флаг удаления/обновления/создания

  // Локальное состояние для отслеживания удаляемого ID
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  // Фильтруем события, чтобы показать только те, что созданы текущим пользователем
  // Используем useMemo для мемоизации результата фильтрации
  const userEvents = useMemo(() => {
    if (!currentUser) {
      return []; // Если пользователя нет, то и его событий нет
    }
    return allEvents.filter((event) => event.createdBy === currentUser.id);
  }, [allEvents, currentUser]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login"); // Перенаправляем после выхода
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (window.confirm("Вы уверены, что хотите удалить это мероприятие?")) {
      setDeletingEventId(eventId);
      dispatch(clearEventsError());
      try {
        await dispatch(deleteEvent(eventId)).unwrap();
        console.log(`Мероприятие с ID ${eventId} успешно удалено.`);
      } catch (err) {
        console.error(`Ошибка удаления мероприятия с ID ${eventId}:`, err);
        // Можно отобразить ошибку из Redux submitError или показать alert/toast
        // alert(`Не удалось удалить мероприятие: ${err.message || 'Неизвестная ошибка'}`);
      } finally {
        setDeletingEventId(null);
      }
    }
  };

  // Если currentUser еще не загружен (например, при первой загрузке приложения)
  if (!currentUser) {
    // Можно показать лоадер или просто пустой фрагмент, ProtectedRoute должен был сработать
    return <div className={styles.loading}>Загрузка профиля...</div>;
  }

  return (
    <div className={styles.profilePageContainer}>
      {/* Можно добавить общую шапку/Layout */}
      <header className={eventCardStyles.header}>
        <Link to="/" className={eventCardStyles.logo}>
          {" "}
          MyAppLogo{" "}
        </Link>
        <div className={eventCardStyles.userInfo}>
          <span>Здравствуйте, {currentUser.name}!</span>
          {/* Добавляем ссылки на все мероприятия и кнопку выхода */}
          <Link to="/events" className={eventCardStyles.navButton}>
            Все мероприятия
          </Link>
          <button onClick={handleLogout} className={eventCardStyles.navButton}>
            {" "}
            Выйти{" "}
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <h1>Профиль пользователя</h1>

        {/* Секция информации о пользователе */}
        <section className={styles.userInfoSection}>
          <h2>Ваши данные</h2>
          <div className={styles.infoBox}>
            <p>
              <strong>Имя:</strong> {currentUser.name}
            </p>
            <p>
              <strong>Email:</strong> {currentUser.email}
            </p>
          </div>
        </section>

        {/* Секция мероприятий пользователя */}
        <section className={styles.userEventsSection}>
          <h2>Мои мероприятия</h2>
          {userEvents.length === 0 ? (
            <p>Вы пока не создали ни одного мероприятия.</p>
          ) : (
            <div className={eventCardStyles.eventsList}>
              {" "}
              {/* Переиспользуем класс для сетки */}
              {userEvents.map((event) => {
                const isDeletingThisEvent =
                  isProcessingEvent && deletingEventId === event.id;
                return (
                  // Переиспользуем стили карточки из events.module.scss
                  <div
                    key={event.id}
                    className={`${eventCardStyles.eventCard} ${isDeletingThisEvent ? eventCardStyles.deleting : ""}`}
                  >
                    <div className={eventCardStyles.eventCardContent}>
                      <h3>{event.title}</h3>
                      <p className={eventCardStyles.eventCategory}>
                        <strong>Категория:</strong>{" "}
                        {CATEGORY_DISPLAY_NAMES[event.category] ||
                          event.category}
                      </p>
                      <p className={eventCardStyles.eventDateLocation}>
                        {event.date && (
                          <>
                            <strong>Дата:</strong>{" "}
                            {new Date(event.date).toLocaleDateString("ru-RU", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            <br />
                          </>
                        )}
                      </p>
                      <p className={eventCardStyles.eventDescription}>
                        {event.description || "Описание отсутствует."}
                      </p>
                    </div>
                    <div className={eventCardStyles.cardActions}>
                      <Link
                        to={`/events/edit/${event.id}`}
                        className={`${eventCardStyles.editButton} ${isDeletingThisEvent ? eventCardStyles.disabledLink : ""}`}
                        onClick={(e) => {
                          if (isDeletingThisEvent) e.preventDefault();
                        }}
                        aria-disabled={isDeletingThisEvent}
                      >
                        Редактировать
                      </Link>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className={eventCardStyles.deleteButton} // Используем стиль кнопки удаления
                        disabled={isProcessingEvent} // Блокируем, если идет любая CUD операция
                      >
                        {isDeletingThisEvent ? "Удаление..." : "Удалить"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Кнопка для создания нового мероприятия */}
          <div className={styles.createButtonContainer}>
            <Link
              to="/events/create"
              className={styles.createEventButtonProfile}
            >
              Создать новое мероприятие
            </Link>
          </div>
        </section>
      </main>
      {/* Можно добавить общий подвал/Layout */}
      <footer className={eventCardStyles.footer}>
        <p>
          © {new Date().getFullYear()} Приложение Мероприятий. Все права
          защищены.
        </p>
      </footer>
    </div>
  );
};

export default ProfilePage;
