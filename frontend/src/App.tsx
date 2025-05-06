import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Убираем Navigate, если он больше не нужен здесь
import HomePage from "./pages/home/home";
import LoginPage from "./pages/login/LoginPage";
import RegisterPage from "./pages/register/RegisterPage";
import EventsPage from "./pages/events/EventsPage";
import NotFoundPage from "./pages/notFound/NotFoundPage"; // <--- Импортируем NotFoundPage

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/events" element={<EventsPage />} />
        {/* Маршрут для страницы 404 должен быть последним */}
        <Route path="*" element={<NotFoundPage />} />{" "}
        {/* <--- Изменяем этот маршрут */}
      </Routes>
    </BrowserRouter>
  );
};

export default App;
