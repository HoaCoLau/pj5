const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Friend = sequelize.define('Friend', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  friendId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' } // pending, accepted, rejected
});

module.exports = Friend;