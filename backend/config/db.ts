// --- START OF FILE config/db.ts ---

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Загрузка .env (ваш код остается)
dotenv.config(); // Убедитесь, что путь правильный или dotenv настроен глобально

// Чтение конфигурации БД (ваш код остается)
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT_STR = process.env.DB_PORT;

if (!DB_NAME || !DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT_STR) {
  console.error('[DB Config] [ERROR] Не все переменные окружения для БД определены!');
  process.exit(1);
}
const DB_PORT = parseInt(DB_PORT_STR, 10);
if (isNaN(DB_PORT)) {
  console.error('[DB Config] [ERROR] Неверный формат DB_PORT!');
  process.exit(1);
}

// --- Создание экземпляра Sequelize (ваш код остается) ---
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false, // или console.log для отладки
});

// --- УДАЛИТЬ ИМПОРТЫ МОДЕЛЕЙ ОТСЮДА ---
// --- УДАЛИТЬ ЦИКЛ УСТАНОВКИ АССОЦИАЦИЙ ОТСЮДА ---

// --- Экспортируем только экземпляр sequelize ---
export default sequelize;

// --- END OF FILE config/db.ts ---