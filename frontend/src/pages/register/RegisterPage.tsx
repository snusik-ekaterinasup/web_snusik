// src/pages/register/RegisterPage.tsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./register.module.scss";
import type { RegisterPayload } from "../../api/authService"; // Импортируем тип

// Redux imports
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  registerUser,
  selectAuthIsLoading,
  selectAuthError,
  clearAuthError, // Экшен для сброса ошибки
  selectIsAuthenticated,
} from "../../features/auth/authSlice";

// Компонент для отображения ошибок
import ErrorNotification from "../../components/errorNotification/ErrorNotification"; // Импортируем компонент

// Утилита для проверки токена (для начального редиректа)
import { getToken } from "../../utils/storage";

const RegisterPage: React.FC = () => {
  // Локальное состояние для полей формы
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Локальное состояние для ошибок валидации формы (не связанных с Redux)
  const [formValidationError, setFormValidationError] = useState<string | null>(
    null
  );

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Получаем состояние из Redux store
  const isLoading = useAppSelector(selectAuthIsLoading); // Используем общий isLoading из authSlice
  const authError = useAppSelector(selectAuthError); // Ошибка регистрации из Redux
  const isAuthenticated = useAppSelector(selectIsAuthenticated); // Для редиректа, если уже авторизован

  useEffect(() => {
    // Редирект, если пользователь уже аутентифицирован
    if (isAuthenticated) {
      navigate("/events", { replace: true });
      return;
    }
    // Дополнительная проверка токена на случай, если Redux стейт еще не синхронизирован
    const token = getToken();
    if (token && !isAuthenticated) {
      navigate("/events", { replace: true });
    }

    // Функция очистки для useEffect: сбрасываем ошибку Redux при размонтировании
    return () => {
      dispatch(clearAuthError());
    };
  }, [navigate, isAuthenticated, dispatch]);

  // Обработчик отправки формы
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearAuthError()); // Сбрасываем ошибку Redux перед отправкой
    setFormValidationError(null); // Сбрасываем локальную ошибку валидации

    // Локальная валидация формы
    if (!username || !email || !password || !confirmPassword) {
      setFormValidationError("Пожалуйста, заполните все поля.");
      return;
    }
    if (password !== confirmPassword) {
      setFormValidationError("Пароли не совпадают.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setFormValidationError("Пожалуйста, введите корректный email.");
      return;
    }
    if (password.length < 6) {
      // Пример валидации длины пароля
      setFormValidationError("Пароль должен содержать не менее 6 символов.");
      return;
    }

    const userData: RegisterPayload = { name: username, email, password };

    // Диспатчим асинхронный thunk registerUser
    dispatch(registerUser(userData))
      .unwrap() // Используем unwrap для обработки промиса
      .then(() => {
        // При успехе (fulfilled) перенаправляем на логин с сообщением
        navigate("/login", {
          replace: true,
          state: {
            message: "Регистрация прошла успешно! Теперь вы можете войти.",
          },
        });
      })
      .catch((rejectedValueOrSerializedError) => {
        // При ошибке (rejected), ошибка уже будет установлена в Redux (authError)
        // и отобразится через ErrorNotification. Логируем для отладки.
        console.error(
          "Ошибка регистрации (перехвачено в компоненте):",
          rejectedValueOrSerializedError
        );
      });
  };

  // Функция для сброса ошибки Redux при нажатии на кнопку закрытия
  const handleDismissAuthError = () => {
    dispatch(clearAuthError());
  };
  // Функция для сброса локальной ошибки валидации
  const handleDismissFormError = () => {
    setFormValidationError(null);
  };

  return (
    <div className={styles.registerPageContainer}>
      <div className={styles.registerFormWrapper}>
        <h2>Регистрация</h2>
        <form
          onSubmit={handleSubmit}
          className={styles.registerForm}
          noValidate
        >
          {/* Отображаем ошибку валидации формы */}
          <ErrorNotification
            message={formValidationError}
            onDismiss={handleDismissFormError}
          />
          {/* Отображаем ошибку от API (из Redux) */}
          <ErrorNotification
            message={authError}
            onDismiss={handleDismissAuthError}
          />

          {/* Поле Имя пользователя */}
          <div className={styles.formGroup}>
            <label htmlFor="username">Имя пользователя:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Ваше имя"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          {/* Поле Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@example.com"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          {/* Поле Пароль */}
          <div className={styles.formGroup}>
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              name="new-password" // Помогает избежать автозаполнения сохраненным паролем
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Минимум 6 символов"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          {/* Поле Подтверждение пароля */}
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Подтвердите пароль:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Повторите пароль"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          {/* Кнопка отправки */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        {/* Ссылка на авторизацию */}
        <div className={styles.alternativeAction}>
          Уже есть аккаунт?{" "}
          <Link to="/login" className={styles.link}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
