/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Уникальный идентификатор мероприятия
 *         title:
 *           type: string
 *           description: Название мероприятия
 *         description:
 *           type: string
 *           description: Описание мероприятия
 *         date:
 *           type: string
 *           format: date-time
 *           description: Дата проведения мероприятия
 *         createdBy:
 *           type: integer
 *           description: ID пользователя, создавшего мероприятие
 *         category:
 *           type: string
 *           enum: [concert, lecture, exhibition]
 *           description: Категория мероприятия
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false, // Название мероприятия обязательно
    },
    description: {
      type: DataTypes.TEXT,
    },
    date: {
      type: DataTypes.DATE,
    },
    category: {
      type: DataTypes.ENUM("concert", "lecture", "exhibition"),
      allowNull: false, // Категория обязательна
    },
    createdBy: {
      type: DataTypes.INTEGER, // Внешний ключ для пользователя
      allowNull: false,
    },
  },
  {
    tableName: "events", // Явное указание имени таблицы
  }
);

module.exports = Event;
