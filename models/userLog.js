// File: models/userLog.js
module.exports = (sequelize, DataTypes) => {
    const UserLog = sequelize.define('UserLog', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.BIGINT, allowNull: false },
        action: { type: DataTypes.ENUM('connect', 'disconnect', 'message', 'join_room', 'leave_room'), allowNull: false },
        detail: { type: DataTypes.TEXT },
    }, {
        tableName: 'user_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    UserLog.associate = (models) => {
        UserLog.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return UserLog;
};