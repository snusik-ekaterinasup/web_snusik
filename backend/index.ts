// --- START OF FILE index.ts ---

import express, { Express, Request, Response } from 'express'; // Добавлен NextFunction
import dotenv from 'dotenv';
import cors, { CorsOptions } from 'cors'; // Импортируем CorsOptions
import morgan from 'morgan';

// --- Конфигурация ---
import sequelize from '@config/db'; // Предполагаем export default sequelize
import setupSwagger from '@config/swagger'; // Предполагаем export default function
import '@config/passport'; // Импортируем для выполнения passport.use() - side effects only

// --- Маршруты ---
import eventRoutes from '@routes/events'; // Предполагаем export default router
import userRoutes from '@routes/users'; // Предполагаем export default router
import authRoutes from '@routes/auth'; // Предполагаем export default router

// --- Инициализация ---
console.log('[Init] Загрузка переменных окружения...');
dotenv.config(); // Загружаем переменные окружения из файла .env в корне проекта
console.log('[Init] Переменные окружения загружены.');

const app: Express = express(); // Создаем экземпляр Express с типом
const port = process.env.PORT || 3000; // Используем переменную окружения PORT или 3000 по умолчанию

console.log(`[Init] Порт сервера установлен на: ${port}`);

// --- Middleware ---
console.log('[Init] Подключение middleware...');
app.use(morgan('dev')); // Логирование HTTP запросов

// --- ЯВНАЯ КОНФИГУРАЦИЯ CORS ---
// Укажите здесь источник(и), с которого будет разрешен доступ к вашему API.
// Для разработки можно использовать '*' или более конкретные URL.
// Для Swagger UI, запущенного на том же порту, localhost должен работать.
const allowedOrigins = [
  `http://localhost:${port}`, // Разрешаем доступ с того же хоста и порта (для Swagger UI)
  'http://127.0.0.1:3000', // Можно добавить и 127.0.0.1 на всякий случай
  'http://localhost:5173', // Пример: добавьте URL вашего фронтенда (если он есть)
];

const corsOptions: CorsOptions = {
  // origin: '*', // Самый простой вариант для разработки, но менее безопасный
  origin: function (origin, callback) {
    // Разрешить запросы без origin (например, Postman, curl) И запросы из списка разрешенных
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Отклонен запрос от недопустимого origin: ${origin}`);
      callback(new Error('Не разрешено политикой CORS')); // Отклоняем запрос
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Явно разрешаем все нужные методы
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'], // Явно разрешаем необходимые заголовки
  credentials: true, // Разрешить передачу кук и заголовков авторизации (важно для JWT в Authorization)
  optionsSuccessStatus: 200, // для старых браузеров (IE11) и некоторых SmartTVs
};
app.use(cors(corsOptions));
// --------------------------------

app.use(express.json()); // Обработка JSON-тел запросов
// app.use(passport.initialize()); // Не нужно, если не используете сессии passport
console.log('[Init] Middleware подключены (Morgan, CORS, JSON).');

// --- Настройка Swagger ---
console.log('[Init] Настройка Swagger...');
setupSwagger(app);
console.log(`[Init] Swagger UI доступен по адресу /api-docs`);

// --- Маршруты API ---
console.log('[Init] Подключение маршрутов API...');
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
console.log(
  '[Init] Маршруты API подключены (/api/events, /api/users, /api/auth).',
);

// --- Тестовый корневой маршрут (опционально) ---
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('API Сервер работает!');
});

// --- Обработка несуществующих маршрутов (404) ---
// Должен идти после всех основных маршрутов
app.use((req: Request, res: Response) => {
  console.warn(`[404] Маршрут не найден: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Запрашиваемый ресурс не найден' });
});

// --- Глобальный обработчик ошибок Express ---
// Должен быть последним middleware
app.use((err: Error, req: Request, res: Response) => {
  // Добавлен тип NextFunction
  // Обработка ошибки CORS, если она дошла сюда
  if (err.message === 'Не разрешено политикой CORS') {
    return res
      .status(403)
      .json({ message: 'Доступ с этого источника запрещен политикой CORS' });
  }

  // Логирование остальных ошибок
  console.error('[Server] [ERROR] Неперехваченная ошибка:', err.stack || err);

  // Отправка ответа клиенту
  // В продакшене лучше не отправлять детали ошибки
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode; // Если статус не установлен, ставим 500
  res.status(statusCode).json({
    message: 'Внутренняя ошибка сервера',
    // Можно добавить поле 'error' только в режиме разработки:
    // error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// --- Запуск сервера и синхронизация с БД ---
const startServer = async () => {
  try {
    console.log('[DB] Попытка аутентификации в базе данных...');
    await sequelize.authenticate();
    console.log('[DB] [SUCCESS] Аутентификация в базе данных прошла успешно.');

    console.log('[DB] Попытка синхронизации моделей...');
    // force: false - рекомендуется для продакшена и разработки, чтобы не терять данные
    await sequelize.sync({ force: false });
    console.log(
      '[DB] [SUCCESS] Синхронизация моделей с базой данных прошла успешно.',
    );

    console.log('[Server] Попытка запуска сервера...');
    app
      .listen(port, () => {
        console.log(
          `[Server] [SUCCESS] Сервер успешно запущен и слушает порт ${port}`,
        );
        console.log(
          `[Server] Документация API доступна по адресу: http://localhost:${port}/api-docs`,
        );
      })
      .on('error', (error: NodeJS.ErrnoException) => {
        // Обработка ошибок самого listen
        if (error.code === 'EADDRINUSE') {
          console.error(
            `[Server] [ERROR] Порт ${port} уже занят. Возможно, сервер уже запущен?`,
          );
        } else {
          console.error('[Server] [ERROR] Ошибка при запуске listener:', error);
        }
        process.exit(1);
      });
  } catch (error) {
    console.error(
      '[DB/Server] [ERROR] Критическая ошибка при инициализации или запуске сервера:',
    );
    if (error instanceof Error) {
      console.error('  Тип ошибки:', error.name);
      console.error('  Сообщение:', error.message);
      // @ts-expect-error отловка ошибки
      if (error.original) {
        // @ts-expect-error Хочу поиграть вмайнкрафт олавлива
        console.error('  Оригинальная ошибка БД:', error.original);
      }
    } else {
      console.error('  Неизвестная ошибка:', error);
    }
    process.exit(1); // Выход из процесса при критической ошибке
  }
};

// Вызываем асинхронную функцию запуска
startServer();

// --- END OF FILE index.ts ---
