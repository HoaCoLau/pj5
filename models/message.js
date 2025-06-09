// File: models/message.js
module.exports = (sequelize, DataTypes) => {
    const Message = sequelize.define('Message', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        sender_id: { type: DataTypes.BIGINT },
        chat_id: { type: DataTypes.BIGINT, allowNull: false },
        content: { type: DataTypes.TEXT },
        message_type: { type: DataTypes.ENUM('text', 'image', 'file', 'system'), defaultValue: 'text' },
        is_deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
        edited_at: { type: DataTypes.DATE },
    }, {
        tableName: 'messages',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false // Chỉ có created_at và edited_at
    });

    Message.associate = (models) => {
        // Một Message thuộc về một Chat
        Message.belongsTo(models.Chat, { foreignKey: 'chat_id', as: 'Chat' });
        // Một Message được gửi bởi một User
        Message.belongsTo(models.User, { foreignKey: 'sender_id', as: 'Sender' });
        // Một Message có thể chứa nhiều Image
        Message.hasMany(models.Image, { foreignKey: 'message_id', as: 'Images' });
    };

    return Message;
};