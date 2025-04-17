const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const sequelize = require("./config/db");
const passport = require('passport');

// Импортируем модели
const User = require("./models/user");
const Event = require("./models/event");
const RefreshToken = require("./models/refreshToken");

// Импортируем роутеры
const eventRoutes = require("./routes/events");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");

// Swagger
const swaggerDocs = require("./config/swagger");

// Инициализация Passport
require("./config/passport");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Подключение роутеров
app.use("/events", eventRoutes);
app.use("/users", userRoutes);
app.use("/auth", authRoutes);

// Настройка ассоциаций
User.hasMany(Event, { foreignKey: "createdBy" });
Event.belongsTo(User, { foreignKey: "createdBy" });

User.hasMany(RefreshToken, { foreignKey: "userId" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

// Подключение Swagger
swaggerDocs(app);

// Проверка подключения и синхронизация БД
sequelize.authenticate()
  .then(() => {
    console.log("Подключение к БД установлено");
    return sequelize.sync({ force: false });
  })
  .then(() => {
    console.log("Модели синхронизированы");
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Ошибка при запуске сервера:", err);
  });