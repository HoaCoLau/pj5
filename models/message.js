// models/message.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.User, { foreignKey: 'userId', as: 'sender' });
      Message.belongsTo(models.Room, { foreignKey: 'roomId' });
    }
  }
  Message.init({
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Nội dung tin nhắn không được để trống." }
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Message',
  });
  return Message;
};