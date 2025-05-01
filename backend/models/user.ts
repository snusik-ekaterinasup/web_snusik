// --- START OF FILE models/user.ts (Исправление JSDoc) ---
import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '@config/db';

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: Уникальный идентификатор пользователя
 *           example: 1
 *         name:
 *           type: string
 *           description: Имя пользователя
 *           example: "Иван Иванов"
 *         email:
 *           type: string
 *           format: email
 *           description: Адрес электронной почты
 *           example: "ivan.ivanov@example.com"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Дата создания
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Дата обновления
 *     UserInput:
 *       type: object
 *       required:         # <-- Убедитесь, что здесь правильный отступ
 *         - name          # <-- Элементы массива с тем же отступом + дефис
 *         - email
 *         - password
 *       properties:       # <-- Свойство properties на том же уровне, что и required
 *         name:           # <-- Свойства объекта properties с доп. отступом
 *           type: string
 *           description: Имя пользователя
 *           example: "Иван Иванов"
 *         email:
 *           type: string
 *           format: email
 *           description: Адрес электронной почты (должен быть уникальным)
 *           example: "ivan.ivanov@example.com"
 *         password:
 *           type: string
 *           format: password
 *           description: Пароль пользователя (минимум 6 символов)
 *           example: "securePassword123"
 */

// Интерфейс атрибутов
export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Интерфейс создания
interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    'id' | 'createdAt' | 'updatedAt' | 'password'
  > {
  password: string;
}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare name: string;
  declare email: string;
  declare password: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(...args: any[]) {
    super(...args);
  }

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  private static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async beforeCreateHook(user: User): Promise<void> {
    if (user.password) {
      user.password = await User.hashPassword(user.password);
    }
  }

  static async beforeUpdateHook(user: User): Promise<void> {
    if (
      user.changed('password') &&
      user.password &&
      !user.password.startsWith('$2')
    ) {
      user.password = await User.hashPassword(user.password);
    }
  }
}

// Инициализация модели User
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: { exclude: [] },
      },
    },
    hooks: {
      beforeCreate: User.beforeCreateHook,
      beforeUpdate: User.beforeUpdateHook,
    },
  },
);

// --- END OF FILE models/user.ts ---
