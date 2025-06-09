// File: controllers/adminController.js
const db = require('../models');

// GET /admin - Hiển thị trang dashboard
exports.getDashboard = async (req, res) => {
    try {
        // Lấy một vài số liệu thống kê
        const totalUsers = await db.User.count();
        const totalChats = await db.Chat.count();
        const totalMessages = await db.Message.count();

        // Lấy các log hoạt động gần nhất
        const recentLogs = await db.UserLog.findAll({
            limit: 20,
            order: [['created_at', 'DESC']],
            include: [{
                model: db.User,
                attributes: ['id', 'username']
            }]
        });

        res.render('admin/dashboard', {
            title: 'Trang Quản trị',
            totalUsers,
            totalChats,
            totalMessages,
            recentLogs
        });

    } catch (error) {
        console.error("Lỗi lấy dữ liệu dashboard:", error);
        res.status(500).send("Lỗi server");
    }
};