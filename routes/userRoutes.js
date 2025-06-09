// File: routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware'); 
const { uploadAvatar } = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

// THÊM DÒNG BỊ THIẾU VÀO ĐÂY
router.get('/', userController.listUsers);

// GET /users/profile
router.get('/profile', userController.getProfile);

// POST /users/profile
router.post('/profile', uploadAvatar.single('avatar'), userController.updateProfile);
router.get('/friends', userController.listFriendsAndRequests);
router.post('/friends/request/:id', userController.sendFriendRequest);
router.post('/friends/accept/:friendshipId', userController.acceptFriendRequest);


module.exports = router;