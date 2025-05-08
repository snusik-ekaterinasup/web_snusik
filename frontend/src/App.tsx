// src/App.tsx

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/home/home";
import LoginPage from "./pages/login/LoginPage";
import RegisterPage from "./pages/register/RegisterPage";
import EventsPage from "./pages/events/EventsPage";
import NotFoundPage from "./pages/notFound/NotFoundPage";
import ProtectedRoute from "./components/ProtectedRoute"; // <--- Импортируем ProtectedRoute
import EventFormPage from "./pages/eventFormPage/EventFormPage";
import Button from "@mui/material/Button";
import ProfilePage from "./pages/profile/ProfilePage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... (публичные маршруты) ... */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Защищенные маршруты */}
        <Route element={<ProtectedRoute />}>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/create" element={<EventFormPage />} />
          <Route path="/events/edit/:eventId" element={<EventFormPage />} />
          <Route path="/profile" element={<ProfilePage />} />{" "}
          {/* <--- ДОБАВЛЕН МАРШРУТ */}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
