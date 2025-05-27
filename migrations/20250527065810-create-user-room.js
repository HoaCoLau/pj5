'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ... trong file migration của UserRoom
await queryInterface.createTable('UserRooms', {
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true, // Part of composite primary key
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  roomId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true, // Part of composite primary key
    references: {
      model: 'Rooms',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
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
    await queryInterface.dropTable('UserRooms');
  }
};