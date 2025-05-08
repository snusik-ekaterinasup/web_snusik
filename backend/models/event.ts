// --- START OF FILE models/event.ts ---
import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '@config/db';
import type { Request, Response, NextFunction } from 'express';

// Импортируем связанные модели
import { User } from './user';
import { EventParticipant } from './eventParticipant';

/**
 * @openapi
 * components:
 *   schemas:
 *     EventModel:
 *       type: object
 *       required: [title, category, createdBy]
 *       properties:
 *         id: { type: integer, format: int64, description: Уникальный идентификатор, readOnly: true, example: 1 }
 *         title: { type: string, description: Название мероприятия, example: "Концерт" }
 *         description: { type: string, nullable: true, description: Описание, example: "Описание концерта" }
 *         date: { type: string, format: date-time, nullable: true, description: Дата и время (ISO 8601), example: "2024-12-31T19:00:00Z" }
 *         category: { type: string, enum: [concert, lecture, exhibition], description: Категория, example: concert }
 *         createdBy: { type: integer, format: int64, description: ID создателя, example: 101 }
 *         createdAt: { type: string, format: date-time, description: Дата создания, readOnly: true }
 *         updatedAt: { type: string, format: date-time, description: Дата обновления, readOnly: true }
 *         participantsCount: { type: integer, description: Кол-во участников, readOnly: true, example: 15 }
 *         isCurrentUserParticipating: { type: boolean, description: Участвует ли текущий пользователь, readOnly: true, example: false }
 */

export interface EventAttributes {
  id: number;
  title: string;
  description: string | null;
  date: Date | null;
  category: 'concert' | 'lecture' | 'exhibition';
  createdBy: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EventCreationAttributes = Optional<
  EventAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'description' | 'date'
>;

export class EventModel extends Model<EventAttributes, EventCreationAttributes> implements EventAttributes {
  public id!: number;
  public title!: string;
  public description!: string | null;
  public date!: Date | null;
  public category!: 'concert' | 'lecture' | 'exhibition';
  public createdBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // --- Статический метод для определения ассоциаций ---
  public static associate() {
    // Связь с создателем (событие принадлежит одному пользователю)
    EventModel.belongsTo(User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Связь с участниками (многие-ко-многим через EventParticipant)
    EventModel.belongsToMany(User, {
      through: EventParticipant,
      foreignKey: 'eventId',
      otherKey: 'userId',
      as: 'participants'
    });

    // Связь с записями об участии (один-ко-многим)
    EventModel.hasMany(EventParticipant, {
      foreignKey: 'eventId',
      as: 'participations'
    });
  }
}

EventModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false, validate: { len: { args: [3, 100], msg: 'Название от 3 до 100 символов'}, notEmpty: { msg: 'Название не пустое' } } },
    description: { type: DataTypes.TEXT, allowNull: true },
    date: { type: DataTypes.DATE, allowNull: true },
    category: { type: DataTypes.ENUM('concert', 'lecture', 'exhibition'), allowNull: false, validate: { notEmpty: { msg: 'Категория обязательна' }, isIn: { args: [['concert', 'lecture', 'exhibition']], msg: 'Недопустимая категория' } } },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false, // Оставляем false, т.к. событие должно иметь создателя
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      // ИСПРАВЛЕНО: Устанавливаем RESTRICT вместо SET NULL, т.к. allowNull: false
      onDelete: 'RESTRICT', // Запретить удаление пользователя, если у него есть созданные события
    },
  },
  {
    sequelize,
    modelName: 'EventModel',
    tableName: 'events',
    timestamps: true,
    underscored: false,
  },
);

// --- Middleware apiKeyAuth (оставляем как есть) ---
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedApiKey = process.env.API_KEY;
  if (!expectedApiKey) { console.error('[CRITICAL_ERROR] API_KEY не установлен.'); res.status(500).json({ message: 'Ошибка конфигурации сервера' }); return; }
  if (!apiKey) { res.status(401).json({ message: 'API Key не предоставлен', details: "Добавьте 'x-api-key' в заголовок или 'apiKey' в query" }); return; }
  if (apiKey !== expectedApiKey) { res.status(403).json({ message: 'Неверный API Key' }); return; }
  next();
};
// --- END OF FILE models/event.ts ---