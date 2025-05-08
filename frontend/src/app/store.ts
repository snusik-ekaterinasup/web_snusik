// src/app/store.ts

import { configureStore } from "@reduxjs/toolkit";
// Мы пока не создали срезы (slices), поэтому закомментируем импорты редьюсеров.
// Мы их добавим по мере создания срезов.
import authReducer from "../features/auth/authSlice";
import eventsReducer from "../features/events/eventsSlice";
// import uiReducer from '../features/ui/uiSlice'; // Если будет UI срез

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
    // ui: uiReducer,
    // Пока оставим пустым, чтобы код компилировался
  },
  // Redux Toolkit по умолчанию включает полезные middleware, такие как redux-thunk (для асинхронных actions)
  // и проверку на немутабельность состояния в режиме разработки.
  // devTools: process.env.NODE_ENV !== 'production', // Включает Redux DevTools только в разработке (по умолчанию так и есть)
});

// Выводим типы RootState и AppDispatch из самого store
// RootState будет представлять тип всего состояния вашего приложения
export type RootState = ReturnType<typeof store.getState>;
// AppDispatch - это тип функции dispatch вашего store, уже включающий типы для thunk-ов и других middleware
export type AppDispatch = typeof store.dispatch;
