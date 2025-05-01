import {
  DataTypes,
  Model, // Import if needed for explicit typing
} from 'sequelize';
// Import the configured Sequelize instance (assuming default export)
import sequelize from '@config/db';
// import { User } from './user.js'; // <-- Uncomment if needed

/**
 * @openapi
 * components:
 *   schemas:
 *     RefreshToken:
 *       type: object
 *       required:
 *         - token
 *         - userId
 *         - expiresAt
 *       properties:
 *         token:
 *           type: string
 *           description: Уникальный токен обновления (первичный ключ)
 *           example: 'abcdef1234567890abcdef1234567890'
 *         userId:
 *           type: integer
 *           format: int64
 *           description: ID пользователя (внешний ключ к таблице users)
 *           example: 101
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Дата и время истечения срока действия токена
 *           example: "2025-01-15T10:30:00Z"
 */

// Interface for RefreshToken attributes (properties of the model instance)
interface RefreshTokenAttributes {
  token: string;
  userId: number; // Foreign Key for User
  expiresAt: Date;
  // Optional: Explicitly define association keys if needed for typing elsewhere
  // user?: User; // If you associate and include User
}

// Interface for RefreshToken creation attributes (properties passed to Model.create)
// No auto-generated fields here, so it's the same as Attributes for required fields
type RefreshTokenCreationAttributes = RefreshTokenAttributes;

// Define the RefreshToken model class extending Sequelize Model
export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  // Explicitly declare properties for type safety
  public token!: string; // ! asserts that Sequelize will initialize it
  public userId!: number; // Foreign Key
  public expiresAt!: Date;

  // --- Optional: Define associations within the class ---
  // public static associate(models: any) {
  //   RefreshToken.belongsTo(models.User, {
  //     foreignKey: 'userId',
  //     as: 'user', // Example alias
  //   });
  // }
}

// Initialize the RefreshToken model
RefreshToken.init(
  {
    // Define attributes matching the interface
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true, // Token itself is the primary key
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        // Define foreign key constraint details
        model: 'users', // Name of the target table
        key: 'id',
      },
      onUpdate: 'CASCADE', // Or other action
      onDelete: 'CASCADE', // If a user is deleted, delete their refresh tokens
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    // Other model options
    sequelize, // Pass the connection instance
    modelName: 'RefreshToken', // Model name in PascalCase for Sequelize
    tableName: 'refresh_tokens', // Explicitly define the table name
    timestamps: false, // Disable createdAt and updatedAt fields as specified
  },
);

// Export the model using named export (or default if preferred)
// export default RefreshToken; // Uncomment for default export
