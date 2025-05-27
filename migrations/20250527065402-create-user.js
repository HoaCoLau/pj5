'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
await queryInterface.createTable('Users', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER
  },
  username: {
    type: Sequelize.STRING(100), // Giới hạn độ dài
    allowNull: false,
    unique: true
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    validate: { 
      isEmail: true
    }
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  avatar: {
    type: Sequelize.STRING,
    allowNull: true // Avatar có thể null ban đầu
  },
  role: {
    type: Sequelize.ENUM('user', 'admin'),
    allowNull: false,
    defaultValue: 'user' // Vai trò mặc định là user
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
    await queryInterface.dropTable('Users');
  }
};