import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './login.module.scss';
import { authService } from '../../api/authService'; // Импортируем значение (объект сервиса)
import type { LoginPayload } from '../../api/authService'; // Импортируем тип LoginPayloadimport { AxiosError } from 'axios';
import { getToken } from '../../utils/storage'; // Для проверки авторизации
import { AxiosError } from 'axios'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Для сообщения после регистрации
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Проверка, авторизован ли пользователь при монтировании компонента
    const token = getToken(); // Используем функцию из storage
    if (token) {
      navigate('/events', { replace: true });
    }

    // Проверка сообщения об успешной регистрации
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Очищаем state, чтобы сообщение не показывалось снова при обновлении
      window.history.replaceState({}, document.title)
    }
  }, [navigate, location.state]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null); // Сбрасываем сообщение об успехе при новой попытке

    if (!email || !password) {
      setError('Пожалуйста, заполните все поля.');
      return;
    }

    const credentials: LoginPayload = { email, password };

    try {
      const loginResponse = await authService.login(credentials);
      console.log('Успешный вход, пользователь:', loginResponse.user);
      // Токены и пользователь уже сохранены в localStorage через authService
      // Можно обновить глобальное состояние здесь, если используется (например, через Context)
      navigate('/events'); // Перенаправляем на страницу мероприятий
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string; details?: any; error?: string }>;
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        setError(`${axiosError.response.status} - ${data.message || data.error || 'Ошибка сервера'}`);
      } else if (axiosError.message) {
        setError(axiosError.message);
      } else {
        setError('Произошла неизвестная ошибка при авторизации.');
      }
      console.error('Ошибка авторизации:', err);
    }
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginFormWrapper}>
        <h2>Авторизация</h2>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
          <div className={styles.formGroup}>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@example.com"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            Войти
          </button>
        </form>
        <div className={styles.alternativeAction}>
          Нет аккаунта?{' '}
          <Link to="/register" className={styles.link}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;