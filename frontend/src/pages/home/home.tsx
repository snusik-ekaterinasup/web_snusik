import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './home.module.scss';
import { getUser } from '../../utils/storage';
import { authService } from '../../api/authService';

const HomePage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);
  const navigate = useNavigate();

  // Функция для проверки состояния авторизации и обновления UI
  const checkAuthState = () => {
    const user = getUser();
    if (user) {
      setCurrentUser({ name: user.name });
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    checkAuthState(); // Проверяем при монтировании

    // Подписываемся на событие storage, чтобы реагировать на изменения
    // в других вкладках (если токен меняется там)
    // А также чтобы обновить состояние, если логин/логаут произошел на другой странице
    // и мы вернулись на главную.
    const handleStorageChange = () => {
      checkAuthState();
    };

    window.addEventListener('storage', handleStorageChange);
    // Дополнительно, можно использовать кастомное событие после логина/логаута,
    // чтобы обновлять состояние в активной вкладке без перезагрузки страницы.
    // Это требует более сложной архитектуры (например, Context API).
    // Для простоты, сейчас HomePage будет обновляться при навигации или изменении в localStorage.

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Этот useEffect будет срабатывать каждый раз, когда пользователь переходит на эту страницу,
  // обеспечивая актуальность отображения имени пользователя.
  useEffect(() => {
    checkAuthState();
  }, [navigate]); // Зависимость от navigate (или location.pathname, если используется)

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    // Можно добавить navigate('/login'); если хотите принудительно перенаправить
    // но кнопки Авторизация/Регистрация и так появятся.
  };

  return (
    <div className={styles.homePageContainer}>
      <header className={styles.header}>
        <div className={styles.logo}>
          {/* Замените на ваш реальный логотип */}
          MyApp
        </div>
        <nav className={styles.navigation}>
          {currentUser ? (
            <div className={styles.userInfo}>
              <span>Здравствуйте, {currentUser.name}!</span>
              <button onClick={handleLogout} className={styles.navButton}>
                Выйти
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className={styles.navButton}>
                Авторизация
              </Link>
              <Link to="/register" className={styles.navButton}>
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.heroSection}>
          <h1>Добро пожаловать в Приложение Мероприятий!</h1>
          <p className={styles.appDescription}>
            Наше приложение поможет вам находить самые интересные мероприятия в вашем городе,
            управлять своим участием и не пропускать ничего важного.
            Присоединяйтесь к нам!
          </p>
          <Link to="/events" className={styles.ctaButton}>
            Смотреть мероприятия
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Приложение Мероприятий. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default HomePage;