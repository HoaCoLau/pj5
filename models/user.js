// File: models/user.js
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
        email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
        password_hash: { type: DataTypes.STRING(255), allowNull: false },
        avatar_url: { type: DataTypes.TEXT },
        bio: { type: DataTypes.TEXT },
        role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
        is_online: { type: DataTypes.BOOLEAN, defaultValue: false },
        last_seen_at: { type: DataTypes.DATE },
    }, {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    User.associate = (models) => {
        // User tạo ra nhiều Chat (group)
        User.hasMany(models.Chat, { foreignKey: 'created_by', as: 'CreatedChats' });
        // User gửi nhiều Message
        User.hasMany(models.Message, { foreignKey: 'sender_id', as: 'SentMessages' });
        // User có nhiều UserLog
        User.hasMany(models.UserLog, { foreignKey: 'user_id', as: 'Logs' });
        // User có thể bị block nhiều lần
        User.hasMany(models.UserBlock, { foreignKey: 'user_id', as: 'Blocks' });
        // User tham gia nhiều Chat (quan hệ N-N)
        User.belongsToMany(models.Chat, { through: models.ChatMember, foreignKey: 'user_id', as: 'Chats' });
        // Quan hệ bạn bè (tự tham chiếu)
        User.belongsToMany(models.User, {
            through: models.Friendship,
            foreignKey: 'requester_id',
            otherKey: 'addressee_id',
            as: 'Friends'
        });
        User.belongsToMany(models.User, {
            through: models.Friendship,
            foreignKey: 'addressee_id',
            otherKey: 'requester_id',
            as: 'FriendOf'
        });
    };

    return User;
};