const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  roomId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  text: { type: DataTypes.STRING, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = Message;