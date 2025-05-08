// src/pages/eventFormPage/EventFormPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  // Thunks
  createEvent,
  updateEvent,
  fetchEventById,
  // Selectors
  selectEventsSubmitting,
  selectEventsSubmitError,
  selectEventsFetchSingleError,
  selectCurrentEventDetails,
  selectEventsSingleLoading,
  // Actions
  clearEventsSubmitError,
  clearCurrentEvent,
} from '../../features/events/eventsSlice';
// Types
import type { EventFormData, CategoryType } from '../../features/events/eventsSlice';
import styles from './eventFormPage.module.scss';
// Константы категорий
const CATEGORIES: CategoryType[] = ['concert', 'lecture', 'exhibition'];
const CATEGORY_DISPLAY_NAMES: Record<CategoryType, string> = {
  concert: 'Концерт',
  lecture: 'Лекция',
  exhibition: 'Выставка',
};

/**
 * Хелпер для форматирования объекта Date или строки ISO
 * в формат 'YYYY-MM-DDTHH:mm', понятный для input[type=datetime-local].
 */
const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      console.warn("Invalid date received for formatting:", date);
      return '';
    }
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting date:", date, e);
    return '';
  }
};

const EventFormPage: React.FC = () => {
  // --- Hooks ---
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // --- Режим работы ---
  const eventId = id ? parseInt(id, 10) : null;
  const isEditMode = eventId !== null && !isNaN(eventId);

  // --- Данные из Redux ---
  const currentEvent = useAppSelector(selectCurrentEventDetails);
  const isLoadingDetails = useAppSelector(selectEventsSingleLoading);
  const fetchError = useAppSelector(selectEventsFetchSingleError);
  const isSubmitting = useAppSelector(selectEventsSubmitting);
  const submitError = useAppSelector(selectEventsSubmitError);

  // --- Локальное состояние формы ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<CategoryType>('concert');

  // --- Эффекты ---

  // 1. Загрузка данных для редактирования
  useEffect(() => {
    if (isEditMode && eventId) {
      dispatch(fetchEventById(eventId));
    } else {
      dispatch(clearCurrentEvent()); // Сброс для режима создания
    }
    // Очистка при размонтировании
    return () => {
      dispatch(clearCurrentEvent());
    };
  }, [dispatch, eventId, isEditMode]);

  // 2. Заполнение формы данными из Redux
  useEffect(() => {
    if (isEditMode && currentEvent) {
      setTitle(currentEvent.title || '');
      setDescription(currentEvent.description || '');
      setDate(formatDateForInput(currentEvent.date));
      setCategory(currentEvent.category || 'concert');
    } else if (!isEditMode) {
      // Сброс формы при переключении на создание
      setTitle('');
      setDescription('');
      setDate('');
      setCategory('concert');
    }
  }, [currentEvent, isEditMode]);

  // 3. Очистка ошибки отправки при монтировании
  useEffect(() => {
    dispatch(clearEventsSubmitError());
  }, [dispatch]);


  // --- Обработчик отправки формы (ИСПРАВЛЕННЫЙ) ---
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearEventsSubmitError());

    if (!title.trim() || !category) {
      alert('Пожалуйста, заполните название и категорию мероприятия.');
      return;
    }

    const formData: EventFormData = {
      title: title.trim(),
      description: description.trim() || null,
      date: date || null,
      category,
    };

    console.log('Отправка данных:', formData);

    if (isEditMode && eventId) {
      // Режим редактирования: диспатчим updateEvent
      dispatch(updateEvent({ id: eventId, data: formData }))
        .unwrap()
        .then((result) => {
          console.log('Событие успешно обновлено:', result);
          navigate('/events');
        })
        .catch((error) => {
          console.error('Ошибка обновления события:', error);
          // Ошибка уже в Redux state (submitError)
        });
    } else {
      // Режим создания: диспатчим createEvent
      dispatch(createEvent(formData))
        .unwrap()
        .then((result) => {
          console.log('Событие успешно создано:', result);
          navigate('/events');
        })
        .catch((error) => {
          console.error('Ошибка создания события:', error);
          // Ошибка уже в Redux state (submitError)
        });
    }
  };

  // --- Рендеринг ---

  if (isLoadingDetails) {
    return <div className={styles.loading}>Загрузка данных события...</div>;
  }

  if (fetchError && isEditMode) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.error}>Ошибка загрузки данных: {fetchError}</p>
        <Link to="/events">Вернуться к списку</Link>
      </div>
    );
  }

   if (isEditMode && !currentEvent && !isLoadingDetails) {
     return (
       <div className={styles.errorContainer}>
         <p className={styles.error}>Событие с ID {eventId} не найдено.</p>
         <Link to="/events">Вернуться к списку</Link>
       </div>
     );
  }

  return (
    <div className={styles.formContainer}>
      <h2>{isEditMode ? 'Редактирование мероприятия' : 'Создание мероприятия'}</h2>
      <form onSubmit={handleSubmit}>
        {submitError && <div className={styles.error} role="alert">{submitError}</div>}

        <div className={styles.formGroup}>
          <label htmlFor="title">Название:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isSubmitting}
            aria-describedby={submitError ? 'submit-error-desc' : undefined}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Описание:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            disabled={isSubmitting}
            aria-describedby={submitError ? 'submit-error-desc' : undefined}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="date">Дата и время:</label>
          <input
            type="datetime-local"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={submitError ? 'submit-error-desc' : undefined}
          />
           <small>Оставьте пустым, если дата не определена.</small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category">Категория:</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryType)}
            required
            disabled={isSubmitting}
            aria-describedby={submitError ? 'submit-error-desc' : undefined}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_DISPLAY_NAMES[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formActions}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Создать мероприятие')}
          </button>
          <Link to="/events" className={styles.cancelButton}>Отмена</Link>
        </div>

        {/* Скрытый элемент для связи ошибки с полями для скринридеров */}
        {submitError && <p id="submit-error-desc" role="alert" style={{ display: 'none' }}>{submitError}</p>}

      </form>
    </div>
  );
};

export default EventFormPage;