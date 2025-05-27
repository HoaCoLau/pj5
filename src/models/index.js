const User = require('./user');
const Room = require('./room');
const Message = require('./message');
const Friend = require('./friend');

// Associations
User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

Room.hasMany(Message, { foreignKey: 'roomId' });
Message.belongsTo(Room, { foreignKey: 'roomId' });

User.hasMany(Room, { foreignKey: 'ownerId' });
Room.belongsTo(User, { foreignKey: 'ownerId' });

User.belongsToMany(User, { as: 'Friends', through: Friend, foreignKey: 'userId', otherKey: 'friendId' });

module.exports = { User, Room, Message, Friend };