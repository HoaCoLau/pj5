// src/models/User.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

class User extends Model {
  // Phương thức instance để so sánh mật khẩu
  async isValidPassword(password) {
    return bcrypt.compare(password, this.password);
  }

  // Ghi đè toJSON để loại bỏ mật khẩu khi trả về user object
  toJSON() {
    const values = { ...this.get() };
    delete values.password; // Hoặc bất kỳ trường nhạy cảm nào khác
    return values;
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      name: 'users_username_unique', // Tên cho ràng buộc unique
      msg: 'Username already in use!',
    },
    validate: {
      notEmpty: { msg: 'Username cannot be empty.' },
      len: {
        args: [3, 50],
        msg: 'Username must be between 3 and 50 characters.',
      },
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      name: 'users_email_unique',
      msg: 'Email already registered!',
    },
    validate: {
      isEmail: { msg: 'Invalid email format.' },
      notEmpty: { msg: 'Email cannot be empty.' },
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Password cannot be empty.' },
      len: {
        args: [6, 255], // Giữ độ dài cho mật khẩu đã hash
        msg: 'Password must be at least 6 characters.',
      },
    },
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true, // Có thể null, sẽ fallback về username nếu cần
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
    allowNull: false,
  },
  // createdAt và updatedAt được Sequelize tự động quản lý vì timestamps: true ở config
}, {
  sequelize,
  modelName: 'User', // Tên model
  tableName: 'users', // Tên bảng trong database (Sequelize sẽ tự động đặt là 'Users' nếu không có)
  timestamps: true,   // Bật createdAt, updatedAt
  hooks: {
    // Hook để hash mật khẩu trước khi tạo hoặc cập nhật User
    beforeSave: async (user, options) => {
      if (user.changed('password')) { // Chỉ hash nếu trường password thay đổi
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      // Đặt displayName mặc định nếu không được cung cấp
      if (!user.displayName && user.username) {
        user.displayName = user.username;
      }
    },
  },
});

module.exports = User;