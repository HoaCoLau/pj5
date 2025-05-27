'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ... trong file migration của Friendship
    await queryInterface.createTable('Friendships', {
      id: { // Thêm id làm khóa chính
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId1: { // Người gửi lời mời
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId2: { // Người nhận lời mời
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'declined', 'blocked'),
        allowNull: false,
        defaultValue: 'pending'
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
    // Thêm unique constraint để đảm bảo một cặp user chỉ có một record Friendship
    // hoặc (userId1, userId2) hoặc (userId2, userId1) là duy nhất (cần xử lý logic này ở service)
    // Hoặc đơn giản là (userId1, userId2, status) là unique nếu không muốn update status mà tạo record mới
    // Để đơn giản, có thể chỉ cần (userId1, userId2) là unique, và không cho phép (userId2, userId1) tồn tại song song
    await queryInterface.addConstraint('Friendships', {
      fields: ['userId1', 'userId2'],
      type: 'unique',
      name: 'unique_friendship_pair'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Friendships');
  }
};