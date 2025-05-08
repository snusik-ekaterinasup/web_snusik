import { useDispatch, useSelector } from "react-redux"; // Импортируем значения (хуки)
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./store"; // Импортируем типы из нашего store

// Используйте эти типизированные хуки во всем приложении вместо стандартных `useDispatch` и `useSelector`

// Типизированная версия useDispatch
// Нет необходимости явно типизировать возвращаемое значение, TypeScript сам его выведет из AppDispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Типизированная версия useSelector
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
