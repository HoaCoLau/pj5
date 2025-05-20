// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();
const logger = require('./logger'); // Sử dụng logger đã tạo

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg), // Log các query SQL ở mức debug
    // logging: false, // Tắt logging SQL query nếu không muốn
    dialectOptions: {
      // Các tùy chọn cụ thể cho MySQL
      // connectTimeout: 60000
    },
    pool: { // Cấu hình connection pool
      max: 10, // Số kết nối tối đa
      min: 0,  // Số kết nối tối thiểu
      acquire: 30000, // Thời gian tối đa (ms) để cố gắng lấy kết nối trước khi báo lỗi
      idle: 10000     // Thời gian tối đa (ms) một kết nối có thể không hoạt động trước khi bị giải phóng
    },
    define: {
      // Các tùy chọn mặc định cho tất cả models
      underscored: false, // true nếu muốn tên bảng và cột theo dạng snake_case (ví dụ: user_name)
      freezeTableName: false, // true nếu muốn tên bảng giống hệt tên model (không tự động thêm 's')
      timestamps: true, // Tự động thêm createdAt và updatedAt
    }
  }
);

module.exports = sequelize;