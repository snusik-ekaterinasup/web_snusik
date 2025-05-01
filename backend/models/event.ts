// --- START OF FILE models/event.ts ---

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@config/db';

// Импорт экземпляра Sequelize
import { Request, Response, NextFunction } from 'express'; // Для middleware apiKeyAuth

// --- Model Definition ---

/**
 * @openapi
 * components:
 *   schemas:
 *     EventModel: # Переименовано во избежание конфликтов с DOM Event
 *       type: object
 *       required:
 *         - title
 *         - category
 *         - createdBy
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: Уникальный идентификатор мероприятия (автогенерация)
 *           readOnly: true
 *           example: 1
 *         title:
 *           type: string
 *           description: Название мероприятия
 *           example: Концерт группы "Космос"
 *         description:
 *           type: string
 *           description: Подробное описание мероприятия
 *           example: Большой сольный концерт с презентацией нового альбома.
 *         date:
 *           type: string
 *           format: date-time
 *           description: Дата и время проведения мероприятия
 *           example: "2024-12-31T19:00:00Z"
 *         category:
 *           type: string
 *           enum: [concert, lecture, exhibition]
 *           description: Категория мероприятия
 *           example: concert
 *         createdBy:
 *           type: integer
 *           format: int64
 *           description: ID пользователя (из модели User), создавшего мероприятие
 *           example: 101
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Дата и время создания записи
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Дата и время последнего обновления записи
 *           readOnly: true
 */

// Interface for Event attributes (свойства экземпляра модели)
interface EventAttributes {
  id: number;
  title: string;
  description?: string | null;
  date?: Date | null;
  category: 'concert' | 'lecture' | 'exhibition';
  createdBy: number; // Внешний ключ к User
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for Event creation attributes (передаваемые в Model.create)
// Делаем 'id', 'createdAt', 'updatedAt' и необязательные поля опциональными
// --- ДОБАВЛЕН export ---
export type EventCreationAttributes = Optional<
  EventAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'description' | 'date'
>;
// --- КОНЕЦ ДОБАВЛЕНИЯ export ---

// Define the Event model class
export class EventModel
  extends Model<EventAttributes, EventCreationAttributes>
  implements EventAttributes
{
  // Используем `declare` для информирования TypeScript о полях, не мешая Sequelize
  declare public id: number;
  declare public title: string;
  declare public description: string | null; // Важно, чтобы тип совпадал с EventAttributes
  declare public date: Date | null; // Важно, чтобы тип совпадал с EventAttributes
  declare public category: 'concert' | 'lecture' | 'exhibition';
  declare public createdBy: number; // Foreign Key

  // Timestamps управляются Sequelize
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // Опционально: Определить ассоциации здесь, если нужно
  // public static associate(models: any) {
  //   EventModel.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
  // }
}

// Initialize the Event model
EventModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(100), // Можно указать длину
      allowNull: false,
      validate: {
        len: [3, 100], // Пример валидации длины
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true, // Разрешаем null, если дата не обязательна при создании
    },
    category: {
      type: DataTypes.ENUM('concert', 'lecture', 'exhibition'),
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // Имя целевой таблицы
        key: 'id',
      },
      onUpdate: 'CASCADE', // Действие при обновлении связанного пользователя
      onDelete: 'SET NULL', // Действие при удалении связанного пользователя (или CASCADE)
    },
  },
  {
    sequelize,
    modelName: 'EventModel', // Имя модели в Sequelize
    tableName: 'events', // Имя таблицы в БД
    timestamps: true, // Включаем createdAt и updatedAt
    underscored: false, // Используем camelCase для авто-полей (например, createdAt)
    // paranoid: true,       // Если нужно мягкое удаление (добавляет deletedAt)
  },
);

// --- Middleware Definition ---

// Middleware для аутентификации по API ключуn
export const apiKeyAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    console.error(
      'КРИТИЧЕСКАЯ ОШИБКА: Переменная окружения API_KEY не установлена.',
    );
    res.status(500).json({ message: 'Ошибка конфигурации сервера' });
    return;
  }

  if (!apiKey) {
    res.status(401).json({
      message: 'API Key не предоставлен',
      details:
        "Добавьте API Key в заголовок 'x-api-key' или параметр запроса 'apiKey'",
    });
    return;
  }

  if (apiKey !== expectedApiKey) {
    res.status(403).json({
      message: 'Неверный API Key',
      details: 'Проверьте правильность предоставленного API Key',
    });
    return;
  }

  next(); // Ключ верный, пропускаем дальше
};

// --- END OF FILE models/event.ts ---
