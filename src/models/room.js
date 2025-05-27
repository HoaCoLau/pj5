const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.STRING,
  ownerId: { type: DataTypes.INTEGER, allowNull: false }
});

module.exports = Room;