// --- START OF FILE models/eventParticipant.ts ---
import { DataTypes, Model } from 'sequelize';
import sequelize from '@config/db';
// Импорты для типизации внешних ключей (не обязательно, но улучшает читаемость)
// import { User } from './user';
// import { EventModel } from './event';

/**
 * @openapi
 * components:
 *   schemas:
 *     EventParticipant:
 *       type: object
 *       description: Запись об участии пользователя в мероприятии (связующая таблица)
 *       properties:
 *         userId:
 *           type: integer
 *           format: int64
 *           description: ID пользователя (часть составного первичного ключа)
 *           example: 42
 *         eventId:
 *           type: integer
 *           format: int64
 *           description: ID мероприятия (часть составного первичного ключа)
 *           example: 9
 *       required:
 *         - userId
 *         - eventId
 */

// Интерфейс атрибутов для связующей таблицы
// Включает только внешние ключи, которые образуют составной первичный ключ
export interface EventParticipantAttributes {
  userId: number;
  eventId: number;
  // НЕ ДОБАВЛЯЕМ createdAt и updatedAt, так как timestamps: false
}

// Модель для связующей таблицы EventParticipant
// Для связующих таблиц CreationAttributes обычно не нужны,
// так как все поля являются обязательными ключами.
export class EventParticipant
  extends Model<EventParticipantAttributes>
  implements EventParticipantAttributes
{
  // Явно объявляем поля для TypeScript
  public userId!: number;
  public eventId!: number;

  // Ассоциации обычно не определяются для самой связующей модели,
  // но если нужно (например, для include из EventParticipant), можно добавить:
  // public static associate(models: any) {
  //   EventParticipant.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  //   EventParticipant.belongsTo(models.EventModel, { foreignKey: 'eventId', as: 'event' });
  // }
}

// Инициализация модели EventParticipant
EventParticipant.init(
  {
    // Определяем столбцы как часть составного первичного ключа
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true, // Часть первичного ключа
      allowNull: false,
      references: {
        model: 'users', // Имя таблицы, на которую ссылаемся
        key: 'id',     // Поле, на которое ссылаемся
      },
      onDelete: 'CASCADE', // При удалении пользователя удаляем запись об участии
      onUpdate: 'CASCADE',
    },
    eventId: {
      type: DataTypes.INTEGER,
      primaryKey: true, // Часть первичного ключа
      allowNull: false,
      references: {
        model: 'events', // Имя таблицы, на которую ссылаемся
        key: 'id',      // Поле, на которое ссылаемся
      },
      onDelete: 'CASCADE', // При удалении события удаляем запись об участии
      onUpdate: 'CASCADE',
    },
    // Явно НЕ определяем поля createdAt и updatedAt
  },
  {
    // Опции модели
    sequelize, // Экземпляр Sequelize
    modelName: 'EventParticipant', // Имя модели в коде
    tableName: 'event_participants', // Имя таблицы в базе данных
    timestamps: false, // <--- ВАЖНО: Отключаем автоматические временные метки
    underscored: false, // Использовать camelCase для имен полей (userId, eventId)
  }
);

// --- END OF FILE models/eventParticipant.ts ---