// File: models/image.js
module.exports = (sequelize, DataTypes) => {
    const Image = sequelize.define('Image', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        message_id: { type: DataTypes.BIGINT, allowNull: false },
        image_url: { type: DataTypes.TEXT, allowNull: false },
    }, {
        tableName: 'images',
        timestamps: true,
        createdAt: 'uploaded_at',
        updatedAt: false
    });

    Image.associate = (models) => {
        Image.belongsTo(models.Message, { foreignKey: 'message_id' });
    };

    return Image;
};