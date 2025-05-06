// src/utils/storage.ts

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'authUser';

// --- Auth Token ---
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// --- Refresh Token ---
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const saveRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeRefreshToken = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// --- User Info ---
// Тип для пользователя (можно вынести в src/types)
interface StoredUser {
  id: number;
  name: string;
  email: string;
  // Добавьте другие поля пользователя, которые возвращает ваш API и вы хотите хранить
}

export const getUser = (): StoredUser | null => {
  const user = localStorage.getItem(USER_KEY);
  return user ? (JSON.parse(user) as StoredUser) : null;
};

export const saveUser = (user: StoredUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

// --- Clear All Auth Data ---
export const clearAuthData = (): void => {
  removeToken();
  removeRefreshToken();
  removeUser();
};