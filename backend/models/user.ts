// --- START OF FILE models/user.ts ---
import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '@config/db'; // Путь к вашему экземпляру sequelize
import { EventModel } from './event'; // Импортируем EventModel для ассоциации
import { EventParticipant } from './eventParticipant'; // Импортируем таблицу связи

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: Пользователь системы (без пароля)
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
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Дата обновления
 *           readOnly: true
 *       required:
 *         - id
 *         - name
 *         - email
 *         - createdAt
 *         - updatedAt
 *     UserInput:
 *       type: object
 *       description: Данные для создания или обновления пользователя
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
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

// Интерфейс атрибутов пользователя
export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password?: string; // Пароль может быть опциональным в объекте (не для БД)
  createdAt?: Date;
  updatedAt?: Date;
}

// Интерфейс для создания пользователя (пароль обязателен при создании)
// ID, createdAt, updatedAt генерируются автоматически
interface UserCreationAttributes
  extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'password'> {
  password: string; // Пароль делаем обязательным именно для создания
}

// Класс модели User
export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  // Объявление полей для TypeScript
  public id!: number; // ! - означает, что поле будет инициализировано Sequelize
  public name!: string;
  public email!: string;
  public password!: string; // В БД поле обязательное

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // --- Ассоциации (опционально для типизации при include) ---
  // public readonly attendedEvents?: EventModel[]; // Если будем делать include

  // --- Методы экземпляра ---
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    // Сначала проверяем, есть ли вообще хэш пароля у этого экземпляра
    // (он может отсутствовать из-за defaultScope)
    if (!this.password) {
        // Если хэша нет, возможно, нужно перезагрузить модель со скоупом 'withPassword'
        console.warn(`Attempted to compare password for user ${this.id} without password hash loaded.`);
        // Можно либо выбросить ошибку, либо попробовать перезагрузить
        // await this.reload({ scope: 'withPassword' });
        // if (!this.password) return false; // Если и после reload нет, то точно false
        return false; // Безопаснее вернуть false
    }
    return bcrypt.compare(candidatePassword, this.password);
  }

  // --- Приватные статические методы ---
  private static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10; // Рекомендуемое количество раундов соли
    return bcrypt.hash(password, saltRounds);
  }

  // --- Статические методы (для определения ассоциаций) ---
  public static associate(models:any) {
    // Пользователь УЧАСТВУЕТ во МНОГИХ Мероприятиях (через EventParticipant)
    User.belongsToMany(EventModel, {
      through: EventParticipant,
      foreignKey: 'userId',       // Ключ в таблице связи, ссылающийся на User
      otherKey: 'eventId',        // Ключ в таблице связи, ссылающийся на Event
      as: 'attendedEvents',       // Псевдоним, по которому можно будет запросить мероприятия
      timestamps: false // Если в таблице связи нет timestamps
    });

    // Пользователь СОЗДАЛ МНОГО Мероприятий (Связь один-ко-многим)
    // Эта ассоциация позволяет получить создателя из EventModel (event.getCreator())
    // А также получить все созданные события из User (user.getCreatedEvents())
     User.hasMany(EventModel, {
         foreignKey: 'createdBy', // Ключ в таблице events, ссылающийся на User
         as: 'createdEvents'      // Псевдоним для этой связи
     });
  }

  // --- Хуки Sequelize ---
  // Хук перед созданием записи
  static async beforeCreateHook(user: User): Promise<void> {
    if (user.password) {
      user.password = await User.hashPassword(user.password);
    }
  }

  // Хук перед обновлением записи
  static async beforeUpdateHook(user: User): Promise<void> {
    // Проверяем, изменилось ли поле 'password'
    if (user.changed('password') && user.password) {
       // Дополнительная проверка, что это не хэш (на всякий случай)
       if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
            user.password = await User.hashPassword(user.password);
       }
    }
  }
}

// --- Инициализация модели ---
User.init(
  {
    // Определение атрибутов таблицы
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Email должен быть уникальным
      validate: {
        isEmail: true, // Встроенная валидация формата email
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      // Валидация длины пароля - лучше делать на уровне приложения/сервиса,
      // но можно добавить и сюда, если нужно ограничение в БД
      // validate: {
      //   len: [6, 100] // Например, от 6 до 100 символов
      // }
    },
    // createdAt и updatedAt добавляются автоматически, если timestamps: true
  },
  {
    // Опции модели
    sequelize, // Экземпляр Sequelize
    modelName: 'User', // Имя модели
    tableName: 'users', // Имя таблицы в БД
    timestamps: true, // Включаем createdAt и updatedAt

    // Scope по умолчанию, чтобы не возвращать пароль при обычных запросах
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    // Дополнительные scopes
    scopes: {
      // Scope для запроса пользователя ВМЕСТЕ с паролем (нужно для логина)
      withPassword: {
        attributes: { include: ['password'] }, // Включаем все поля, включая пароль
      },
    },

    // Подключаем хуки
    hooks: {
      beforeCreate: User.beforeCreateHook,
      beforeUpdate: User.beforeUpdateHook,
    },
  }
);

// --- END OF FILE models/user.ts ---