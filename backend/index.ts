// backend/src/index.ts

import express, { Express, Request, Response, NextFunction } from 'express'; // Добавил NextFunction для Error handler
import dotenv from 'dotenv';
import cors from 'cors';
import type { CorsOptions } from 'cors'; // Импорт типа
import morgan from 'morgan';
import passport from 'passport'; // Импортируем passport (хотя его initialize может быть не нужен)

// --- Конфигурация ---
import sequelize from '@config/db';
import setupSwagger from '@config/swagger';
import '@config/passport'; // Инициализация стратегий passport (side effects)

// --- Импорт Моделей (Важно импортировать ВСЕ модели) ---
import { User } from '@models/user';
import { EventModel } from '@models/event';
import { EventParticipant } from '@models/eventParticipant';
import { RefreshToken } from '@models/refreshToken';

// --- Маршруты ---
import eventRoutes from '@routes/events';
import userRoutes from '@routes/users';
import authRoutes from '@routes/auth';

// --- Инициализация ---
console.log('[Init] Загрузка переменных окружения...');
dotenv.config();
console.log('[Init] Переменные окружения загружены.');

const app: Express = express();
const port = process.env.PORT || 3000;
console.log(`[Init] Порт сервера установлен на: ${port}`);

// --- ВЫЗОВ АССОЦИАЦИЙ МОДЕЛЕЙ (ДОБАВЛЕНО/ИЗМЕНЕНО) ---
console.log('[Init] Настройка ассоциаций моделей...');
// Собираем все модели в объект для удобства передачи в associate, если это нужно
const models = { User, EventModel, EventParticipant, RefreshToken };
// Проходим по всем моделям и вызываем associate, если он есть
Object.values(models).forEach((model: any) => {
    if (typeof model.associate === 'function') {
        console.log(`[Init] Вызов associate для ${model.name}...`);
        model.associate(models); // Передаем все модели в associate
    }
});
console.log('[Init] Ассоциации моделей настроены.');
// ----------------------------------------------------

// --- Middleware ---
console.log('[Init] Подключение middleware...');
app.use(morgan('dev'));

const allowedOrigins = [
  `http://localhost:${port}`,
  'http://127.0.0.1:3000',
  'http://localhost:5173', // <-- Убедитесь, что ваш фронтенд порт здесь есть
];
const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Отклонен запрос от недопустимого origin: ${origin}`);
      callback(new Error('Не разрешено политикой CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
// app.use(passport.initialize()); // Обычно не нужен, если session: false в authenticate
console.log('[Init] Middleware подключены.');

// --- Настройка Swagger ---
console.log('[Init] Настройка Swagger...');
setupSwagger(app);
console.log(`[Init] Swagger UI доступен по адресу /api-docs`);

// --- Маршруты API ---
console.log('[Init] Подключение маршрутов API...');
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
console.log('[Init] Маршруты API подключены.');

// --- Тестовый корневой маршрут ---
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('API Сервер работает!');
});

// --- Обработка несуществующих маршрутов (404) ---
app.use((req: Request, res: Response) => {
  console.warn(`[404] Маршрут не найден: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Запрашиваемый ресурс не найден' });
});

// --- Глобальный обработчик ошибок Express ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => { // Добавлен next, хотя он не используется здесь
  if (err.message === 'Не разрешено политикой CORS') {
    return res.status(403).json({ message: 'Доступ запрещен политикой CORS' });
  }

  console.error('[Server] [ERROR] Неперехваченная ошибка:', err.stack || err);

  // Отправляем общий ответ об ошибке
  res.status(500).json({
    message: 'Внутренняя ошибка сервера',
    // Можно добавить детали только в development
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// --- Запуск сервера и синхронизация с БД ---
const startServer = async () => {
  try {
    console.log('[DB] Попытка аутентификации...');
    await sequelize.authenticate();
    console.log('[DB] [SUCCESS] Аутентификация прошла успешно.');

    console.log('[DB] Попытка синхронизации моделей...');
    await sequelize.sync({ force: false }); // force: false - не удалять таблицы
    console.log('[DB] [SUCCESS] Синхронизация моделей прошла успешно.');

    console.log('[Server] Попытка запуска сервера...');
    app.listen(port, () => {
        console.log(`[Server] [SUCCESS] Сервер запущен на порту ${port}`);
        console.log(`[Server] Документация API: http://localhost:${port}/api-docs`);
      })
      .on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[Server] [ERROR] Порт ${port} уже занят.`);
        } else {
          console.error('[Server] [ERROR] Ошибка запуска:', error);
        }
        process.exit(1);
      });
  } catch (error) {
    console.error('[DB/Server] [ERROR] Критическая ошибка при инициализации:', error);
    process.exit(1);
  }
};

// Вызываем асинхронную функцию запуска
startServer();