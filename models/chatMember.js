// File: models/chatMember.js
module.exports = (sequelize, DataTypes) => {
    const ChatMember = sequelize.define('ChatMember', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        chat_id: { type: DataTypes.BIGINT, allowNull: false },
        user_id: { type: DataTypes.BIGINT, allowNull: false },
        last_read_message_id: { type: DataTypes.BIGINT },
        join_message_id: { type: DataTypes.BIGINT },
        joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
        tableName: 'chat_members',
        timestamps: false // Bảng này không cần created_at, updated_at
    });

    // Bảng trung gian không cần định nghĩa associate ở đây vì đã được định nghĩa
    // trong quan hệ belongsToMany của User và Chat
    return ChatMember;
};