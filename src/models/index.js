const sequelize = require('../config/database');
const User = require('./User');
const Room = require('./Room');
const Message = require('./Message');
const Friend = require('./Friend');

// Quan hệ
User.hasMany(Room, { foreignKey: 'ownerId' });
Room.belongsTo(User, { foreignKey: 'ownerId' });

Room.hasMany(Message, { foreignKey: 'roomId' });
Message.belongsTo(Room, { foreignKey: 'roomId' });

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

User.belongsToMany(User, { as: 'Friends', through: Friend, foreignKey: 'userId', otherKey: 'friendId' });

module.exports = { sequelize, User, Room, Message, Friend };