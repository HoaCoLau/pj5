// models/room.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      Room.belongsTo(models.User, { foreignKey: 'creatorId', as: 'creator' });
      Room.hasMany(models.Message, { foreignKey: 'roomId', onDelete: 'CASCADE' }); // Nếu phòng bị xóa, tin nhắn cũng xóa
      Room.belongsToMany(models.User, { through: models.UserRoom, foreignKey: 'roomId', otherKey: 'userId', as: 'members' });
    }
  }
  Room.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Tên phòng đã tồn tại!'
      },
      validate: {
        notEmpty: { msg: "Tên phòng không được để trống." },
        len: [3, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: true // Cho phép admin tạo hoặc người tạo đã bị xóa
    }
  }, {
    sequelize,
    modelName: 'Room',
  });
  return Room;
};