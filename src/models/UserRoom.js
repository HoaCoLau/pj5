// src/models/UserRoom.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class UserRoom extends Model {}

UserRoom.init({
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Một phần của khóa chính phức hợp
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  roomId: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Một phần của khóa chính phức hợp
    references: {
      model: 'rooms',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  // Bạn có thể thêm các trường khác như vai trò của user trong phòng (ví dụ: 'member', 'moderator')
  // roleInRoom: {
  //   type: DataTypes.ENUM('member', 'admin', 'moderator'),
  //   defaultValue: 'member'
  // }
}, {
  sequelize,
  modelName: 'UserRoom',
  tableName: 'user_rooms',
  timestamps: false, // Thường không cần timestamps cho bảng nối, joinedAt đã đủ
});

module.exports = UserRoom;