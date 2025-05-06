// src/api/axios.ts
import axios from 'axios'; 
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getToken } from '../utils/storage';

const apiInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Используем переменную окружения
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления JWT токена в заголовки
apiInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken(); // Получаем токен из localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


export default apiInstance;