// src/components/ProtectedRoute.tsx

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks"; // Наш типизированный хук
import {
  selectIsAuthenticated,
  selectCurrentUser,
} from "../features/auth/authSlice"; // Селекторы из authSlice

interface ProtectedRouteProps {
  // Можно добавить пропсы для проверки ролей, если потребуется в будущем
  // allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);
  const location = useLocation();

  if (!isAuthenticated) {
    // Перенаправляем на страницу логина, сохраняя текущий путь в state,
    // чтобы после логина можно было вернуться обратно.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если пользователь аутентифицирован, отображаем дочерний компонент (страницу)
  // <Outlet /> будет рендерить соответствующий компонент для вложенного маршрута
  return <Outlet />;
};

export default ProtectedRoute;
