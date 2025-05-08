// src/pages/home/home.tsx

import React, { useEffect } from "react"; // Убрали useState, если он больше не нужен для currentUser
import { Link, useNavigate } from "react-router-dom";
import styles from "./home.module.scss";
// import { getUser } from '../../utils/storage'; // Больше не нужен прямой вызов
// import { authService } from '../../api/authService'; // logout теперь через Redux

// Redux imports
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  logout,
  selectCurrentUser,
  selectIsAuthenticated,
} from "../../features/auth/authSlice";

const HomePage: React.FC = () => {
  // const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null); // Заменяем на Redux
  const navigate = useNavigate(); // Оставляем, если нужен для других целей
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector(selectCurrentUser); // Получаем пользователя из Redux
  const isAuthenticated = useAppSelector(selectIsAuthenticated); // Для общей проверки

  // useEffect для каких-либо действий при монтировании или изменении isAuthenticated, если нужно.
  // Например, если бы мы хотели загружать какие-то данные для главной страницы,
  // зависящие от статуса авторизации.
  // В данном случае, authSlice уже инициализируется из localStorage,
  // так что selectCurrentUser должен вернуть актуальные данные.
  useEffect(() => {
    // Если нужно выполнить какие-то действия при изменении currentUser или isAuthenticated
    // console.log('HomePage: Auth state changed:', isAuthenticated, currentUser);
  }, [isAuthenticated, currentUser]);

  const handleLogout = () => {
    dispatch(logout());
    // После диспатча logout, currentUser и isAuthenticated в Redux обновятся,
    // и компонент автоматически перерисуется с новым состоянием.
    // navigate('/login'); // Можно не делать, т.к. кнопки и так изменятся
  };

  return (
    <div className={styles.homePageContainer}>
      <header className={styles.header}>
        <div className={styles.logo}>MyAppLogo</div>
        <nav className={styles.navigation}>
          {currentUser ? ( // Проверяем currentUser из Redux
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
            Наше приложение поможет вам находить самые интересные мероприятия в
            вашем городе, управлять своим участием и не пропускать ничего
            важного. Присоединяйтесь к нам!
          </p>
          <Link to="/events" className={styles.ctaButton}>
            Смотреть мероприятия
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          © {new Date().getFullYear()} Приложение Мероприятий. Все права
          защищены.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
