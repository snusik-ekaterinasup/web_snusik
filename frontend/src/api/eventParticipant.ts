// src/models/eventParticipant.ts
import { DataTypes, Model } from 'sequelize';
// Optional не используется в этой модели, можно убрать, если не нужен
// import type { Optional } from 'sequelize'; // Используем type import, если включен verbatimModuleSyntax
import sequelize from '../config/db'; // Этот путь теперь должен разрешаться благодаря tsconfig

// Атрибуты модели EventParticipant
interface EventParticipantAttributes {
  userId: number;
  eventId: number;
  createdAt?: Date; // Добавлено "?" т.к. управляется Sequelize
  updatedAt?: Date; // Добавлено "?" т.к. управляется Sequelize
}

// Атрибуты для создания - userId и eventId обязательны
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EventParticipantCreationAttributes extends Pick<EventParticipantAttributes, 'userId' | 'eventId'> {}


export class EventParticipant extends Model<EventParticipantAttributes, EventParticipantCreationAttributes> implements EventParticipantAttributes {
  public userId!: number;
  public eventId!: number;

  // Sequelize добавит их автоматически, если timestamps: true
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EventParticipant.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true, // Часть составного первичного ключа
      allowNull: false, // Явно указываем, что не может быть null
      references: {
        model: 'users', // Имя таблицы пользователей
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    eventId: {
      type: DataTypes.INTEGER,
      primaryKey: true, // Часть составного первичного ключа
      allowNull: false, // Явно указываем, что не может быть null
      references: {
        model: 'events', // Имя таблицы мероприятий
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    // createdAt и updatedAt управляются опцией timestamps ниже
  },
  {
    sequelize,
    modelName: 'EventParticipant',
    tableName: 'event_participants',
    timestamps: true, // Включаем createdAt и updatedAt
  }
);