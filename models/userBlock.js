// File: models/userBlock.js
module.exports = (sequelize, DataTypes) => {
    const UserBlock = sequelize.define('UserBlock', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.BIGINT, allowNull: false },
        blocked_until: { type: DataTypes.DATE },
        reason: { type: DataTypes.TEXT },
    }, {
        tableName: 'user_blocks',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    UserBlock.associate = (models) => {
        UserBlock.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return UserBlock;
};