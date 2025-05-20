const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Room extends Model { }

Room.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            name: 'rooms_name_unique',
            msg: 'Room name already exists!',
        },
        validate: {
            notEmpty: { msg: 'Room name cannot be empty.' },
            len: {
                args: [3, 100],
                msg: 'Room name must be between 3 and 100 characters.',
            },
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    creatorId: { // Foreign key để liên kết với người tạo phòng
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users', // Tên bảng 'users' (hoặc Model User nếu đã import)
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Hoặc 'CASCADE' nếu muốn xóa phòng khi user tạo bị xóa
    },
    // createdAt và updatedAt được Sequelize tự động quản lý
}, {
    sequelize,
    modelName: 'Room',
    tableName: 'rooms',
    timestamps: true,
});

module.exports = Room;