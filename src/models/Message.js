const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

   class Message extends Model {}

Message.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Message content cannot be empty.' },
    },
  },
  type: { // Để phân biệt tin nhắn văn bản và icon
    type: DataTypes.ENUM('text', 'icon'),
    defaultValue: 'text',
    allowNull: false,
  },
  userId: { // Foreign key liên kết với người gửi
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE', // Xóa tin nhắn nếu người gửi bị xóa
  },
  roomId: { // Foreign key liên kết với phòng chat
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE', // Xóa tin nhắn nếu phòng bị xóa
  },
  timestamp: { // Thời gian gửi tin nhắn, Sequelize timestamps (createdAt) cũng có thể dùng
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  // createdAt và updatedAt được Sequelize tự động quản lý
}, {
  sequelize,
  modelName: 'Message',
  tableName: 'messages',
  timestamps: true,
});

module.exports = Message;