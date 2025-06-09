// File: models/friendship.js
module.exports = (sequelize, DataTypes) => {
    const Friendship = sequelize.define('Friendship', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        requester_id: { type: DataTypes.BIGINT, allowNull: false },
        addressee_id: { type: DataTypes.BIGINT, allowNull: false },
        status: { type: DataTypes.ENUM('pending', 'accepted', 'blocked'), defaultValue: 'pending' },
        responded_at: { type: DataTypes.DATE },
    }, {
        tableName: 'friendships',
        timestamps: true,
        createdAt: 'requested_at',
        updatedAt: false
    });

    Friendship.associate = (models) => {
        Friendship.belongsTo(models.User, { as: 'Requester', foreignKey: 'requester_id' });
        Friendship.belongsTo(models.User, { as: 'Addressee', foreignKey: 'addressee_id' });
    };
    return Friendship;
};