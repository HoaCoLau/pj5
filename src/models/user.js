const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  avatar: DataTypes.STRING,
  role: { type: DataTypes.STRING, defaultValue: 'user' }
});

module.exports = User;