/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: Уникальный идентификатор пользователя
 *         name:
 *           type: string
 *           description: Имя пользователя
 *         email:
 *           type: string
 *           format: email
 *           description: Email пользователя (должен быть уникальным)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Дата создания пользователя
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false, // Имя пользователя обязательно
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false, // Email пользователя обязателен
      unique: true, // Email должен быть уникальным
    },
  },
  {
    tableName: "users", // Явное указание имени таблицы
  }
);

module.exports = User;
