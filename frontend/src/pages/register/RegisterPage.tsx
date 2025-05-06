import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './register.module.scss';
import { authService } from '../../api/authService'; // Импортируем значение (объект сервиса)
import type { RegisterPayload } from '../../api/authService'; // Импортируем тип RegisterPayloadimport { AxiosError } from 'axios';
import { getToken } from '../../utils/storage';
import { AxiosError } from 'axios'


const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (token) {
      navigate('/events', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username || !email || !password || !confirmPassword) {
      setError('Пожалуйста, заполните все поля.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Пожалуйста, введите корректный email.');
      return;
    }
    if (password.length < 6) { // Пример валидации длины пароля (бэкенд может иметь свои правила)
      setError('Пароль должен содержать не менее 6 символов.');
      return;
    }

    const userData: RegisterPayload = { name: username, email, password };

    try {
      const registerResponse = await authService.register(userData);
      console.log('Успешная регистрация:', registerResponse.message, registerResponse.user);
      navigate('/login', {
        replace: true, // Чтобы нельзя было вернуться на страницу регистрации кнопкой "назад"
        state: { message: 'Регистрация прошла успешно! Теперь вы можете войти.' }
      });
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string; details?: any; error?: string }>;
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        let errorMessage = `${axiosError.response.status} - ${data.message || data.error || 'Ошибка сервера'}`;
        if (data.details && Array.isArray(data.details)) {
          errorMessage += `: ${data.details.join(', ')}`;
        } else if (data.details && typeof data.details === 'string') {
          errorMessage += `: ${data.details}`;
        }
        setError(errorMessage);
      } else if (axiosError.message) {
        setError(axiosError.message);
      } else {
        setError('Произошла неизвестная ошибка при регистрации.');
      }
      console.error('Ошибка регистрации:', err);
    }
  };

  return (
    <div className={styles.registerPageContainer}>
      <div className={styles.registerFormWrapper}>
        <h2>Регистрация</h2>
        <form onSubmit={handleSubmit} className={styles.registerForm}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={styles.formGroup}>
            <label htmlFor="username">Имя пользователя:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Ваше имя"
            />
          </div>
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
              placeholder="Минимум 6 символов"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Подтвердите пароль:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Повторите пароль"
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            Зарегистрироваться
          </button>
        </form>
        <div className={styles.alternativeAction}>
          Уже есть аккаунт?{' '}
          <Link to="/login" className={styles.link}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;