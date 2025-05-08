// src/pages/login/LoginPage.tsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styles from "./login.module.scss";
import type { LoginPayload } from "../../api/authService"; // Импортируем тип

// Redux imports
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  loginUser,
  selectAuthIsLoading,
  selectAuthError,
  selectIsAuthenticated,
  clearAuthError, // Экшен для сброса ошибки
} from "../../features/auth/authSlice";

// Компонент для отображения ошибок
import ErrorNotification from "../../components/errorNotification/ErrorNotification"; // Импортируем компонент

// Утилита для проверки токена (для начального редиректа)
import { getToken } from "../../utils/storage";

const LoginPage: React.FC = () => {
  // Локальное состояние для полей ввода и сообщения об успехе после регистрации
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Для сообщения после регистрации

  const navigate = useNavigate();
  const location = useLocation(); // Для получения state (сообщения)
  const dispatch = useAppDispatch();

  // Получаем состояние из Redux store
  const isLoading = useAppSelector(selectAuthIsLoading);
  const authError = useAppSelector(selectAuthError); // Сообщение об ошибке из Redux
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    // Редирект, если пользователь уже аутентифицирован
    if (isAuthenticated) {
      // Пытаемся получить путь, с которого пришли, или по умолчанию на /events
      const from = location.state?.from?.pathname || "/events";
      navigate(from, { replace: true });
      return; // Прерываем эффект
    }

    // Дополнительная проверка токена на случай, если Redux стейт еще не синхронизирован
    const token = getToken();
    if (token && !isAuthenticated) {
      navigate("/events", { replace: true });
      return;
    }

    // Проверка сообщения об успешной регистрации, переданного через state
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Очищаем state в истории браузера, чтобы сообщение не показывалось повторно
      window.history.replaceState({}, document.title);
    }

    // Функция очистки для useEffect: сбрасываем ошибку при размонтировании
    // return () => {
    //   dispatch(clearAuthError());
    // };
    // Убрал очистку при размонтировании, т.к. теперь есть кнопка для сброса
  }, [navigate, location.state, isAuthenticated, dispatch]); // Убрал зависимость от getToken

  // Обработчик отправки формы
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null); // Сбрасываем сообщение об успехе при новой попытке
    dispatch(clearAuthError()); // Сбрасываем предыдущие ошибки перед новым запросом

    // Простая локальная валидация на пустоту полей
    if (!email || !password) {
      // Вместо установки локальной ошибки, можно диспатчить кастомный экшен
      // или просто не отправлять запрос и положиться на required атрибуты HTML (хотя это не лучший UX)
      // Пока просто выведем в консоль или можно сделать локальный setError, если нужно
      console.warn("Поля Email и Пароль не должны быть пустыми.");
      // Если хотите показать ошибку валидации через наш компонент:
      // dispatch(/* ваш кастомный экшен для ошибки валидации */);
      return;
    }

    const credentials: LoginPayload = { email, password };

    // Диспатчим асинхронный thunk loginUser
    // Результат (успех или ошибка) будет обработан в extraReducers в authSlice,
    // что обновит состояние isLoading, authError, isAuthenticated, user.
    // Компонент перерисуется благодаря useAppSelector.
    // Редирект при успехе произойдет в useEffect выше при изменении isAuthenticated.
    dispatch(loginUser(credentials));
  };

  // Функция для сброса ошибки при нажатии на кнопку закрытия в ErrorNotification
  const handleDismissError = () => {
    dispatch(clearAuthError());
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginFormWrapper}>
        <h2>Авторизация</h2>
        <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
          {/* Используем компонент ErrorNotification для отображения ошибки из Redux */}
          <ErrorNotification
            message={authError}
            onDismiss={handleDismissError}
          />

          {/* Отображение сообщения об успехе после регистрации */}
          {successMessage && (
            <div className={styles.successMessage}>{successMessage}</div>
          )}

          {/* Поле Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email" // Атрибут name важен для автозаполнения браузера
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required // HTML5 валидация
              placeholder="your@example.com"
              disabled={isLoading} // Блокируем поле во время загрузки
              autoComplete="email"
            />
          </div>

          {/* Поле Пароль */}
          <div className={styles.formGroup}>
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {/* Кнопка отправки */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>
        </form>

        {/* Ссылка на регистрацию */}
        <div className={styles.alternativeAction}>
          Нет аккаунта?{" "}
          <Link to="/register" className={styles.link}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
