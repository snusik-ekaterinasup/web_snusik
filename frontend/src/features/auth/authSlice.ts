// src/features/auth/authSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"; // Значения
import type { PayloadAction } from "@reduxjs/toolkit"; // Тип

import { authService } from "../../api/authService"; // Значение
import type {
  LoginPayload,
  RegisterPayload,
  UserResponse,
  LoginResponse,
} from "../../api/authService"; // Типы

import type { RootState } from "../../app/store"; // Тип

import {
  saveToken,
  saveRefreshToken,
  saveUser,
  clearAuthData,
  getUser,
  getToken,
} from "../../utils/storage"; // Значения
// Тип для состояния аутентификации
export interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean; // Общий флаг ошибки для асинхронных операций
  errorMessage: string | null;
  // Можно добавить специфичные флаги загрузки/ошибки для каждого thunk'а, если нужно более гранулярное управление
  // loginLoading: boolean;
  // registerLoading: boolean;
}

// Начальное состояние
// Пытаемся загрузить пользователя и токен из localStorage при инициализации
const initialUser = getUser();
const initialToken = getToken();

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: !!initialToken && !!initialUser, // Если есть токен и пользователь, считаем авторизованным
  isLoading: false,
  isError: false,
  errorMessage: null,
};

// Асинхронный thunk для входа пользователя
// Первый дженерик - тип возвращаемого значения успешного выполнения
// Второй дженерик - тип аргумента, передаваемого в thunk (payload creator)
// Третий дженерик - конфигурация thunk (включает {dispatch, getState, extra, rejectWithValue})
export const loginUser = createAsyncThunk<
  LoginResponse, // Что вернет успешный thunk
  LoginPayload, // Аргументы для thunk-а (credentials)
  { rejectValue: string } // Тип значения, которое вернется при ошибке (через rejectWithValue)
>(
  "auth/login", // Префикс для генерируемых типов экшенов (auth/login/pending, auth/login/fulfilled, auth/login/rejected)
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      // authService.login уже сохраняет токены и пользователя в localStorage
      return response; // Возвращаем полный ответ, включая user, accessToken, refreshToken
    } catch (error: any) {
      // Используем any и проверяем ниже
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Ошибка входа";
      return rejectWithValue(message); // Возвращаем сообщение об ошибке
    }
  }
);

// Асинхронный thunk для регистрации пользователя
export const registerUser = createAsyncThunk<
  UserResponse, // Возвращаем только данные пользователя после регистрации
  RegisterPayload,
  { rejectValue: string }
>("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await authService.register(userData);
    return response.user; // Возвращаем только данные пользователя
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Ошибка регистрации";
    if (
      error.response?.data?.details &&
      Array.isArray(error.response.data.details)
    ) {
      return rejectWithValue(
        `${message}: ${error.response.data.details.join(", ")}`
      );
    }
    return rejectWithValue(message);
  }
});

// Создание среза (slice)
const authSlice = createSlice({
  name: "auth", // Имя среза, используется в Redux DevTools и как префикс для экшенов
  initialState,
  // Редьюсеры для синхронных экшенов
  reducers: {
    logout: (state) => {
      authService.logout(); // Очищаем localStorage
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isError = false;
      state.errorMessage = null;
    },
    // Можно добавить экшен для сброса ошибок вручную, если нужно
    clearAuthError: (state) => {
      state.isError = false;
      state.errorMessage = null;
    },
  },
  // Редьюсеры для обработки состояний асинхронных thunk-ов
  extraReducers: (builder) => {
    builder
      // Обработка loginUser
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = null;
      })
      .addCase(
        loginUser.fulfilled,
        (state, action: PayloadAction<LoginResponse>) => {
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user; // Сохраняем пользователя в состояние
          state.isError = false;
          state.errorMessage = null;
          // Токены уже сохранены в localStorage через authService.login
        }
      )
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.isError = true;
        state.errorMessage = action.payload as string; // action.payload будет содержать то, что вернул rejectWithValue
      })
      // Обработка registerUser
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true; // Можно использовать отдельный registerLoading, если нужно
        state.isError = false;
        state.errorMessage = null;
      })
      .addCase(
        registerUser.fulfilled,
        (state /*, action: PayloadAction<UserResponse>*/) => {
          // После успешной регистрации пользователь не логинится автоматически в текущей логике
          // Он будет перенаправлен на страницу логина.
          // Поэтому состояние isAuthenticated и user здесь не меняем.
          state.isLoading = false;
          state.isError = false;
          state.errorMessage = null; // Можно установить сообщение об успехе, если нужно, но обычно это UI задача
        }
      )
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      });
  },
});

// Экспорт синхронных экшенов
export const { logout, clearAuthError } = authSlice.actions;

// Селекторы для удобного доступа к состоянию (опционально, но рекомендуется)
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectAuthIsLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.errorMessage;

// Экспорт редьюсера среза
export default authSlice.reducer;
