// File: models/chat.js
module.exports = (sequelize, DataTypes) => {
    const Chat = sequelize.define('Chat', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        is_group: { type: DataTypes.BOOLEAN, defaultValue: false },
        name: { type: DataTypes.STRING(100) },
        chat_avatar_url: { type: DataTypes.TEXT },
        created_by: { type: DataTypes.BIGINT },
    }, {
        tableName: 'chats',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    Chat.associate = (models) => {
        // Một Chat được tạo bởi một User
        Chat.belongsTo(models.User, { foreignKey: 'created_by', as: 'Creator' });
        // Một Chat có nhiều Message
        Chat.hasMany(models.Message, { foreignKey: 'chat_id', as: 'Messages' });
        // Một Chat có nhiều thành viên (quan hệ N-N)
        Chat.belongsToMany(models.User, { through: models.ChatMember, foreignKey: 'chat_id', as: 'Members' });
    };

    return Chat;
};