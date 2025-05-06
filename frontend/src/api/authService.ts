// src/api/authService.ts
import apiInstance from './axios';
import { saveToken, saveRefreshToken, saveUser, clearAuthData } from '../utils/storage';

// Определим типы для API (можно вынести в src/types/auth.ts)
// Эти типы должны соответствовать тому, что ожидает и возвращает ваш бэкенд

// Тело запроса для регистрации (из вашего backend models/user.ts UserInput)
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

// Тело запроса для логина (из вашего backend routes/auth.ts LoginInput)
export interface LoginPayload {
  email: string;
  password: string;
}

// Пользователь, возвращаемый API (из вашего backend models/user.ts User)
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt?: string; // или Date
  updatedAt?: string; // или Date
}

// Ответ API при успешном логине (из вашего backend routes/auth.ts AuthResponse)
export interface LoginResponse {
  accessToken: string; // "Bearer <token>"
  refreshToken: string;
  user: UserResponse;
}

// Ответ API при успешной регистрации
export interface RegisterResponse {
  message: string;
  user: UserResponse;
}

export const authService = {
  login: async (credentials: LoginPayload): Promise<LoginResponse> => {
    try {
      const response = await apiInstance.post<LoginResponse>('/auth/login', credentials);
      const { accessToken, refreshToken, user } = response.data;

      // accessToken приходит как "Bearer <actual_token>", нам нужно сохранить только сам токен
      const actualToken = accessToken.startsWith('Bearer ') ? accessToken.split(' ')[1] : accessToken;

      saveToken(actualToken);
      saveRefreshToken(refreshToken);
      saveUser(user);
      return response.data;
    } catch (error) {
      // Axios по умолчанию выбрасывает ошибку при статусах != 2xx
      // Можно добавить более детальную обработку ошибок здесь
      console.error('Login error:', error);
      throw error; // Перебрасываем ошибку, чтобы компонент мог ее обработать
    }
  },

  register: async (userData: RegisterPayload): Promise<RegisterResponse> => {
    try {
      const response = await apiInstance.post<RegisterResponse>('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  logout: (): void => {
    clearAuthData();
    // Опционально: можно также сделать запрос к бэкенду для инвалидации refresh токена,
    // если ваш API это поддерживает. Ваш текущий бэкенд не имеет такого эндпоинта.
  },

  // TODO: Реализовать refreshToken, если будете использовать интерцептор для автоматического обновления
  // refreshToken: async (): Promise<string> => {
  //   const currentRefreshToken = getRefreshToken();
  //   if (!currentRefreshToken) throw new Error('No refresh token available');
  //   const response = await apiInstance.post<{ accessToken: string }>('/auth/refresh', { refreshToken: currentRefreshToken });
  //   const newAccessToken = response.data.accessToken.startsWith('Bearer ') ? response.data.accessToken.split(' ')[1] : response.data.accessToken;
  //   saveToken(newAccessToken);
  //   return newAccessToken;
  // }
};