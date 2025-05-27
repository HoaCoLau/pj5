// models/userroom.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserRoom extends Model {
    static associate(models) {
      // Associations cho bảng trung gian thường không cần thiết ở đây
      // vì chúng đã được định nghĩa trong User và Room models (belongsToMany)
    }
  }
  UserRoom.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    }
  }, {
    sequelize,
    modelName: 'UserRoom', // Tên model
    tableName: 'UserRooms' // Tên bảng trong DB (thường Sequelize tự động thêm 's')
  });
  return UserRoom;
};