// src/models/Friendship.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Friendship extends Model {}

Friendship.init({
  // userOneId sẽ là người gửi yêu cầu, userTwoId là người nhận
  userOneId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users', // Tên bảng 'users'
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  userTwoId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  status: {
    // pending: userOneId đã gửi lời mời tới userTwoId
    // accepted: userTwoId đã chấp nhận lời mời từ userOneId
    // declined: userTwoId đã từ chối lời mời từ userOneId
    // blocked_by_one: userOneId chặn userTwoId
    // blocked_by_two: userTwoId chặn userOneId
    // (Cân nhắc: 'blocked' có thể cần một bảng riêng hoặc logic phức tạp hơn nếu muốn chặn 2 chiều hoàn toàn)
    // Để đơn giản, ban đầu có thể dùng 'pending' và 'accepted'.
    type: DataTypes.ENUM('pending', 'accepted', 'declined', 'blocked'),
    defaultValue: 'pending',
    allowNull: false,
  },
  // Không cần `id` riêng nếu khóa chính là (userOneId, userTwoId)
  // Tuy nhiên, có thể thêm một `actionUserId` để biết ai thực hiện hành động cuối cùng (ví dụ: ai gửi request, ai accept/decline)
  // actionUserId: {
  //   type: DataTypes.INTEGER,
  //   allowNull: false,
  //   references: { model: 'users', key: 'id' }
  // }
}, {
  sequelize,
  modelName: 'Friendship',
  tableName: 'friendships',
  timestamps: true, // createdAt (khi request được tạo), updatedAt (khi status thay đổi)
  // Đảm bảo không có hai hàng (A,B) và (B,A) cùng tồn tại với status accepted.
  // Điều này cần xử lý ở logic nghiệp vụ hoặc trigger database.
  // Hoặc luôn lưu user có ID nhỏ hơn vào userOneId.
  indexes: [
    {
      fields: ['userOneId', 'userTwoId'],
      unique: true // Đảm bảo cặp (userOneId, userTwoId) là duy nhất
    },
    {
      fields: ['userTwoId', 'userOneId'] // Index cho truy vấn ngược lại
    }
  ]
});

module.exports = Friendship;