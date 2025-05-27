// models/friendship.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Friendship extends Model {
    static associate(models) {
      Friendship.belongsTo(models.User, { as: 'userOne', foreignKey: 'userId1' });
      Friendship.belongsTo(models.User, { as: 'userTwo', foreignKey: 'userId2' });
    }
  }
  Friendship.init({
    // id sẽ tự động được Sequelize thêm vào nếu không định nghĩa primaryKey: true ở đây
    userId1: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId2: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined', 'blocked'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'accepted', 'declined', 'blocked']],
          msg: "Trạng thái không hợp lệ."
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Friendship',
    // indexes: [ // Có thể thêm index ở đây hoặc trong migration
    //   {
    //     unique: true,
    //     fields: ['userId1', 'userId2']
    //   }
    // ]
  });
  return Friendship;
};