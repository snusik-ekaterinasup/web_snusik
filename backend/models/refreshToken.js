const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: "refresh_tokens",
    timestamps: false
  }
);

module.exports = RefreshToken;