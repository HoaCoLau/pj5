'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ... trong file migration của Room
    await queryInterface.createTable('Rooms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true // Tên phòng là duy nhất
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      creatorId: {
        type: Sequelize.INTEGER,
        allowNull: true, // Có thể null nếu admin tạo hoặc người tạo bị xóa
        references: {
          model: 'Users', // Tên bảng Users
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // Nếu User bị xóa, set creatorId = NULL
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Rooms');
  }
};