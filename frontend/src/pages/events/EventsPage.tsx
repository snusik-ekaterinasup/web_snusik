import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './events.module.scss';
import { eventService } from '../../api/eventService'; // Импортируем значение (объект сервиса)
import type { IEvent as ApiEvent } from '../../api/eventService'; 
import { getUser } from '../../utils/storage';
import { authService } from '../../api/authService';
import { AxiosError } from 'axios';

// Тип для категорий, чтобы было удобнее
type CategoryType = 'concert' | 'lecture' | 'exhibition';

// Массив категорий для генерации кнопок фильтра
const CATEGORIES: CategoryType[] = ['concert', 'lecture', 'exhibition'];

// Маппинг для отображения названий категорий на русском
const CATEGORY_DISPLAY_NAMES: Record<CategoryType, string> = {
  concert: 'Концерты',
  lecture: 'Лекции',
  exhibition: 'Выставки',
};

const EventsPage: React.FC = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Новое состояние для выбранной категории фильтра
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);

  // Функция загрузки мероприятий, обернута в useCallback для стабильности
  const loadEvents = useCallback(async (categoryToLoad?: CategoryType) => {
    setIsLoading(true);
    setError(null);
    try {
      // eventService.getEvents ожидает category или undefined
      const data = await eventService.getEvents(categoryToLoad);
      setEvents(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string; error?: string }>;
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        setError(`${axiosError.response.status} - ${data.message || data.error || 'Ошибка сервера'}`);
      } else if (axiosError.message) {
        setError(`Ошибка загрузки мероприятий: ${axiosError.message}`);
      } else {
        setError('Не удалось загрузить мероприятия. Попробуйте позже.');
      }
      console.error('Ошибка загрузки мероприятий:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Пустой массив зависимостей, так как сама функция не зависит от внешних переменных, которые меняются

 
  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/login', { replace: true });
    } else {
      setUsername(user.name);
    }
  }, [navigate]);

  // Эффект для загрузки/перезагрузки событий при изменении фильтра
  // или при первой авторизованной загрузке (когда username установится)
  useEffect(() => {
    if (username) { // Загружаем события, только если пользователь определен (прошел проверку авторизации)
      loadEvents(selectedCategory ?? undefined); // Передаем null как undefined для сервиса
    }
  }, [username, selectedCategory, loadEvents]); // Зависим от username, выбранной категории и самой функции загрузки

  const handleLogout = () => {
    authService.logout();
    setUsername(null);
    navigate('/login');
  };

  // Обработчик для выбора категории
  const handleSelectCategory = (category: CategoryType | null) => {
    setSelectedCategory(category);
    // Загрузка данных произойдет автоматически через useEffect, который следит за selectedCategory
  };

  if (!username && isLoading) {
    // Можно показать глобальный лоадер или ничего, пока не произойдет редирект или установка username
    return <div className={styles.loadingIndicator}>Проверка авторизации...</div>;
  }

  return (
    <div className={styles.eventsPageContainer}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          MyApp
        </Link>
        {username && (
          <div className={styles.userInfo}>
            <span>Здравствуйте, {username}!</span>
            <button onClick={handleLogout} className={styles.navButton}>
              Выйти
            </button>
          </div>
        )}
      </header>

      <main className={styles.mainContent}>
        <h1>Список мероприятий</h1>

        {/* Блок фильтров */}
        <div className={styles.filtersContainer}>
          <h3>Фильтры</h3>
          <div className={styles.filterButtons}>
            <button
              onClick={() => handleSelectCategory(null)}
              className={`${styles.filterButton} ${selectedCategory === null ? styles.activeFilter : ''}`}
            >
              Все категории
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleSelectCategory(category)}
                className={`${styles.filterButton} ${selectedCategory === category ? styles.activeFilter : ''}`}
              >
                {CATEGORY_DISPLAY_NAMES[category]}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div className={styles.loadingIndicator}>Загрузка мероприятий...</div>}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {!isLoading && !error && events.length === 0 && (
          <p className={styles.noEventsMessage}>
            {selectedCategory
              ? `Нет мероприятий в категории "${CATEGORY_DISPLAY_NAMES[selectedCategory]}"`
              : 'Нет доступных мероприятий.'}
          </p>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className={styles.eventsList}>
            {events.map((event) => (
              <div key={event.id} className={styles.eventCard}>
                <div className={styles.eventCardContent}>
                  <h3>{event.title}</h3>
                  <p className={styles.eventCategory}>
                    <strong>Категория:</strong> {CATEGORY_DISPLAY_NAMES[event.category as CategoryType] || event.category}
                  </p>
                  <p className={styles.eventDateLocation}>
                    {event.date && (
                      <>
                        <strong>Дата:</strong> {new Date(event.date).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                        <br/>
                      </>
                    )}
                    {/* На бэкенде нет location, используем category или другое поле если есть */}
                    {/* <strong>Место:</strong> {event.location || 'Не указано'} */}
                  </p>
                  <p className={styles.eventDescription}>{event.description || 'Описание отсутствует.'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Приложение Мероприятий. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default EventsPage;