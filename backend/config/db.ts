// --- START OF FILE config/db.ts ---

// Используем require для импорта модулей в CommonJS
import { Sequelize } from 'sequelize'; // Используем import
import dotenv from 'dotenv'; // Используем import

// --- Получаем __dirname в CommonJS ---
// В CommonJS переменная __dirname доступна глобально и указывает на папку текущего файла.
// Нет необходимости использовать import.meta.url или fileURLToPath.

// --- Конфигурируем dotenv для загрузки .env из корня проекта ---
// Определяем путь к файлу .env, который находится на два уровня выше
// текущей папки (т.к. скомпилированный файл будет в dist/config)
const dotenvResult = dotenv.config();

// Проверяем, удалось ли загрузить .env, и выводим предупреждение, если нет
if (dotenvResult.error) {
  // В зависимости от критичности .env, можно раскомментировать строку ниже
  // throw new Error(`Критическая ошибка: Не удалось загрузить файл .env из ${envPath}`);
}

// --- Чтение конфигурации БД из переменных окружения ---
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT_STR = process.env.DB_PORT;

// --- Валидация необходимых переменных окружения ---
// Проверяем, что все необходимые переменные были загружены
if (!DB_NAME || !DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT_STR) {
  process.exit(1); // Завершаем процесс, если конфигурация неполная
}

// --- Парсинг порта в число ---
// Преобразуем строковое значение порта в число
const DB_PORT = parseInt(DB_PORT_STR, 10);
// Проверяем, является ли результат валидным числом
if (isNaN(DB_PORT)) {
  process.exit(1); // Завершаем процесс при неверном порте
}

// --- Создание экземпляра Sequelize ---
// Инициализируем Sequelize с полученными данными
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT, // Используем числовое значение порта
  dialect: 'postgres', // Указываем диалект базы данных
  logging: false, // Отключаем логирование SQL-запросов (можно включить: console.log или true)
  // dialectOptions: { // Опции для диалекта, например, для SSL
  //   ssl: {
  //     require: true, // Пример: требовать SSL
  //     rejectUnauthorized: false // Пример: не проверять сертификат (НЕ рекомендуется для продакшена)
  //   }
  // },
});

// --- Опционально: Функция для проверки соединения с БД ---
// Эту функцию можно экспортировать и вызывать при старте приложения для проверки
/*
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Соединение с базой данных успешно установлено.');
  } catch (error) {
    console.error('Не удалось подключиться к базе данных:');
    if (error instanceof Error) {
      console.error('Детали ошибки:', {
        name: error.name,
        message: error.message,
        // Можно добавить другие свойства ошибки Sequelize, если нужно
      });
    } else {
      console.error('Произошла неожиданная ошибка:', error);
    }
  }
}
*/

// --- Экспортируем созданный экземпляр sequelize через module.exports ---
// Это стандартный способ экспорта в CommonJS
export default sequelize;

// --- END OF FILE config/db.ts ---
