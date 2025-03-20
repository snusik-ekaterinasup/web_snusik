const express = require("express"); // Для работы с сервером
const dotenv = require("dotenv"); // Для загрузки конфигурации из .env файла
const cors = require("cors"); // Для разрешения запросов с других доменов
const sequelize = require("./config/db"); // Импортируем sequelize
const eventRoutes = require("./routes/events"); // Импортируем маршруты для мероприятий
const userRoutes = require("./routes/users"); // Импортируем маршруты для пользователей
const swaggerDocs = require("./config/swagger"); // Импортируем функцию для подключения Swagger
const Event = require("./models/event");
const User = require("./models/user");
const morgan = require("morgan"); // Подключаем morgan

dotenv.config(); // Загружаем переменные окружения из .env

const app = express(); // Создаем объект приложения Express

// Подключаем morgan для логирования запросов
app.use(morgan("dev")); // 'dev' - предустановленный формат логирования

app.use(express.json()); // Для обработки входящих JSON-запросов
app.use(cors()); // Для разрешения кросс-доменных запросов

const port = 3000; //process.env.PORT ||

// Подключаем Swagger
swaggerDocs(app); // Вызываем функцию для подключения Swagger

// Подключаем маршруты для мероприятий
app.use("/events", eventRoutes);
app.use("/users", userRoutes); // Подключаем маршруты для пользователей

// Определяем связь между моделями
User.hasMany(Event, { foreignKey: "createdBy" }); // У одного пользователя может быть много мероприятий
Event.belongsTo(User, { foreignKey: "createdBy" }); // Одно мероприятие принадлежит одному пользователю

// Синхронизация моделей с базой данных
sequelize
  .sync({ force: true }) // force: false - не пересоздавать таблицы, если они уже существуют
  .then(() => {
    console.log("База данных синхронизирована.");
  })
  .catch((err) => {
    console.error("Ошибка при синхронизации базы данных:", err);
  });

sequelize
  .authenticate()
  .then(() => {
    console.log("Подключение к базе данных установлено.");
  })
  .catch((err) => {
    console.error("Ошибка при подключении к базе данных:", err);
  });

app.listen(port, (err) => {
  if (err) {
    console.error("Ошибка при запуске сервера:", err);
  } else {
    console.log(`Сервер запущен на порту ${port}`);
  }
});
