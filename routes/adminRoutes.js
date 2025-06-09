// File: routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');

// Áp dụng cả 2 middleware. Request phải đi qua authMiddleware trước,
// sau đó mới đến adminMiddleware.
router.use(authMiddleware, adminMiddleware);

// GET /admin/
router.get('/', adminController.getDashboard);

module.exports = router;