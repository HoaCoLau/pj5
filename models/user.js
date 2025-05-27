// models/user.js
'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Associations sẽ được định nghĩa ở đây sau
      User.hasMany(models.Message, { foreignKey: 'userId', onDelete: 'CASCADE' });
      User.hasMany(models.Room, { foreignKey: 'creatorId', as: 'createdRooms', onDelete: 'SET NULL' }); // Nếu user bị xóa, phòng vẫn còn nhưng creatorId = null
      User.belongsToMany(models.Room, { through: models.UserRoom, foreignKey: 'userId', otherKey: 'roomId', as: 'joinedRooms' });

      User.belongsToMany(models.User, {
        as: 'Friends', // User A is friends with User B
        through: models.Friendship,
        foreignKey: 'userId1', // User A's ID
        otherKey: 'userId2',   // User B's ID
        constraints: false // Tắt tự động tạo khóa ngoại nếu cần xử lý logic phức tạp
      });
      User.belongsToMany(models.User, {
        as: 'FriendOf', // User B is a friend of User A
        through: models.Friendship,
        foreignKey: 'userId2', // User B's ID
        otherKey: 'userId1',   // User A's ID
        constraints: false
      });
    }

    // Instance method to check password
    async validPassword(password) {
      return bcrypt.compare(password, this.password);
    }
  }
  User.init({
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        args: true,
        msg: 'Username đã tồn tại!'
      },
      validate: {
        notEmpty: { msg: "Username không được để trống." },
        len: {
          args: [3, 100],
          msg: "Username phải từ 3 đến 100 ký tự."
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Email đã được sử dụng!'
      },
      validate: {
        isEmail: { msg: "Email không hợp lệ." },
        notEmpty: { msg: "Email không được để trống." }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Mật khẩu không được để trống." },
        len: {
          args: [6, 255], // Ít nhất 6 ký tự
          msg: "Mật khẩu phải có ít nhất 6 ký tự."
        }
      }
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    }
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => { // Hook này cần cẩn thận nếu không muốn hash lại password mỗi lần update
        if (user.changed('password') && user.password) { // Chỉ hash nếu password thay đổi
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });
  return User;
};