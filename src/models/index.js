// src/models/index.js
const { Sequelize } = require('sequelize'); // Đảm bảo Sequelize được import
const sequelize = require('../config/database');
const logger = require('../config/logger');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User');
db.Room = require('./Room');         // Thêm dòng này
db.Message = require('./Message');   // Thêm dòng này
db.UserRoom = require('./UserRoom'); // Thêm dòng này

// Định nghĩa Associations (Mối quan hệ)

// User - Room (One-to-Many: Một User tạo nhiều Room)
db.User.hasMany(db.Room, {
  foreignKey: 'creatorId',
  as: 'createdRooms', // Bí danh cho mối quan hệ
});
db.Room.belongsTo(db.User, {
  foreignKey: 'creatorId',
  as: 'creator',
});

// User - Room (Many-to-Many: Users tham gia Rooms thông qua UserRoom)
db.User.belongsToMany(db.Room, {
  through: db.UserRoom, // Bảng trung gian
  foreignKey: 'userId',   // Khóa ngoại trong UserRoom trỏ tới User
  otherKey: 'roomId',     // Khóa ngoại trong UserRoom trỏ tới Room
  as: 'joinedRooms',      // Bí danh khi lấy các phòng user đã tham gia
});
db.Room.belongsToMany(db.User, {
  through: db.UserRoom,
  foreignKey: 'roomId',
  otherKey: 'userId',
  as: 'members',          // Bí danh khi lấy các member của một phòng
});

// User - Message (One-to-Many: Một User gửi nhiều Message)
db.User.hasMany(db.Message, {
  foreignKey: 'userId',
  as: 'messagesSent',
});
db.Message.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'sender',
});

// Room - Message (One-to-Many: Một Room có nhiều Message)
db.Room.hasMany(db.Message, {
  foreignKey: 'roomId',
  as: 'messages',
});
db.Message.belongsTo(db.Room, {
  foreignKey: 'roomId',
  as: 'room',
});


// (Optional) UserRoom explicitly linked if needed for direct queries on UserRoom
// db.User.hasMany(db.UserRoom, { foreignKey: 'userId' });
// db.UserRoom.belongsTo(db.User, { foreignKey: 'userId' });
// db.Room.hasMany(db.UserRoom, { foreignKey: 'roomId' });
// db.UserRoom.belongsTo(db.Room, { foreignKey: 'roomId' });


module.exports = db;