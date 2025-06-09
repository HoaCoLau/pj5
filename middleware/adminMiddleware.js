// File: middleware/adminMiddleware.js

const adminMiddleware = (req, res, next) => {
    // Middleware này được giả định là chạy SAU authMiddleware,
    // nên chúng ta luôn có req.user
    if (req.user && req.user.role === 'admin') {
        next(); // Là admin, cho phép đi tiếp
    } else {
        // Không phải admin, trả về lỗi 403 Forbidden (Cấm truy cập)
        res.status(403).send('<h1>Lỗi 403: Bạn không có quyền truy cập trang này.</h1>');
    }
};

module.exports = { adminMiddleware };