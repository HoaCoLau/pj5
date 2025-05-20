// src/controllers/roomController.js
const { Message, User, Room, UserRoom, sequelize } = require('../models'); // Đảm bảo Message và User được import
const Joi = require('joi');
const logger = require('../config/logger');
const { Op } = require('sequelize'); // Để sử dụng các toán tử của Sequelize

// Joi Schema để validate tạo phòng
const createRoomSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional().allow(null, ''),
});

// Tạo phòng mới
exports.createRoom = async (req, res) => {
  try {
    // 1. Validate request body
    const { error, value } = createRoomSchema.validate(req.body);
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn('Create room validation failed:', errors);
      return res.status(400).json({ success: false, errors });
    }

    const { name, description } = value;
    const creatorId = req.user.id; // Lấy từ middleware `protect`

    // 2. Kiểm tra tên phòng đã tồn tại chưa (Sequelize unique constraint cũng sẽ làm việc này)
    const existingRoom = await Room.findOne({ where: { name } });
    if (existingRoom) {
      logger.warn(`Attempt to create room with existing name: ${name}`);
      return res.status(409).json({ success: false, message: 'Room name already exists.' });
    }

    // 3. Tạo phòng mới
    const newRoom = await Room.create({
      name,
      description,
      creatorId,
    });

    // 4. Tự động thêm người tạo phòng vào bảng UserRoom (họ là thành viên đầu tiên)
    await UserRoom.create({
      userId: creatorId,
      roomId: newRoom.id,
    });

    logger.info(`Room created: "${newRoom.name}" (ID: ${newRoom.id}) by User ID: ${creatorId}`);
    // Trả về thông tin phòng cùng với người tạo
    const roomWithCreator = await Room.findByPk(newRoom.id, {
        include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'displayName'] }]
    });

    return res.status(201).json({ success: true, message: 'Room created successfully!', room: roomWithCreator });

  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
        logger.error('Create room SequelizeUniqueConstraintError:', err);
        return res.status(409).json({ success: false, message: `Room name '${err.errors[0].value}' is already taken.` });
    }
    logger.error('Server error during room creation:', err);
    return res.status(500).json({ success: false, message: 'Server error during room creation.', error: err.message });
  }
};

// Lấy danh sách tất cả các phòng
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll({
      include: [
        {
          model: User,
          as: 'creator', // Lấy thông tin người tạo
          attributes: ['id', 'username', 'displayName'],
        },
        // Nếu muốn đếm số lượng member, có thể dùng subquery hoặc Sequelize.fn
        // {
        //   model: User,
        //   as: 'members',
        //   attributes: [], // Không lấy trường nào của User, chỉ để count
        //   through: { attributes: [] } // Không lấy trường nào của bảng UserRoom
        // }
      ],
      // attributes: {
      //   include: [
      //     [sequelize.fn("COUNT", sequelize.col("members.id")), "memberCount"] // Ví dụ đếm members
      //   ]
      // },
      // group: ['Room.id', 'creator.id'], // Cần group nếu có aggregate function
      order: [['createdAt', 'DESC']],
    });

    logger.info('Fetched all rooms.');
    return res.status(200).json({ success: true, rooms });
  } catch (error) {
    logger.error('Error fetching all rooms:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// Lấy thông tin chi tiết một phòng
exports.getRoomById = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findByPk(roomId, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'displayName', 'avatarUrl'],
                },
                {
                    model: User,
                    as: 'members', // Lấy danh sách thành viên của phòng
                    attributes: ['id', 'username', 'displayName', 'avatarUrl'],
                    through: { attributes: ['joinedAt'] } // Lấy cả thời gian join từ bảng UserRoom
                }
            ],
        });

        if (!room) {
            logger.warn(`Room not found with ID: ${roomId}`);
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        // (Tùy chọn) Kiểm tra xem người dùng có phải là thành viên của phòng không để cho phép xem
        // const isMember = await UserRoom.findOne({ where: { userId: req.user.id, roomId: room.id } });
        // if (!isMember && req.user.id !== room.creatorId && req.user.role !== 'admin') {
        //    logger.warn(`User ${req.user.id} attempt to access room ${roomId} without being a member.`);
        //    return res.status(403).json({ success: false, message: 'You are not a member of this room.' });
        // }


        logger.info(`Workspaceed room details for ID: ${roomId}`);
        return res.status(200).json({ success: true, room });
    } catch (error) {
        logger.error(`Error fetching room by ID ${req.params.roomId}:`, error);
        return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
    }
};

// Cho phép người dùng tham gia vào một phòng
exports.joinRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;

        const room = await Room.findByPk(roomId);
        if (!room) {
            logger.warn(`Attempt to join non-existent room ID: ${roomId} by User ID: ${userId}`);
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        const existingMembership = await UserRoom.findOne({ where: { userId, roomId } });
        if (existingMembership) {
            logger.info(`User ID: ${userId} is already a member of room ID: ${roomId}`);
            return res.status(400).json({ success: false, message: 'You are already a member of this room.' });
        }

        await UserRoom.create({ userId, roomId });
        logger.info(`User ID: ${userId} joined room ID: ${roomId}`);

        // Lấy thông tin phòng với thành viên mới nhất
        const updatedRoom = await Room.findByPk(roomId, {
            include: [{ model: User, as: 'members', attributes: ['id', 'username', 'displayName'] }]
        });

        return res.status(200).json({ success: true, message: 'Successfully joined the room.', room: updatedRoom });
    } catch (error) {
        logger.error(`Error user ID ${req.user.id} joining room ID ${req.params.roomId}:`, error);
        return res.status(500).json({ success: false, message: 'Server error while joining room.', error: error.message });
    }
};

// Cho phép người dùng rời khỏi một phòng
exports.leaveRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;

        const room = await Room.findByPk(roomId);
        if (!room) {
            logger.warn(`Attempt to leave non-existent room ID: ${roomId} by User ID: ${userId}`);
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        const membership = await UserRoom.findOne({ where: { userId, roomId } });
        if (!membership) {
            logger.info(`User ID: ${userId} is not a member of room ID: ${roomId}, cannot leave.`);
            return res.status(400).json({ success: false, message: 'You are not a member of this room.' });
        }

        await membership.destroy();
        logger.info(`User ID: ${userId} left room ID: ${roomId}`);

        // Nếu người rời phòng là người tạo phòng, có thể có logic thêm (ví dụ: chuyển quyền admin phòng, hoặc phòng bị đánh dấu inactive)
        // For now, just leave.

        return res.status(200).json({ success: true, message: 'Successfully left the room.' });
    } catch (error) {
        logger.error(`Error user ID ${req.user.id} leaving room ID ${req.params.roomId}:`, error);
        return res.status(500).json({ success: false, message: 'Server error while leaving room.', error: error.message });
    }
};
exports.getMessagesForRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id; // Từ middleware protect

    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20; // Mặc định 20 tin nhắn mỗi trang
    const offset = (page - 1) * limit;

    // Kiểm tra phòng có tồn tại không
    const room = await Room.findByPk(roomId);
    if (!room) {
      logger.warn(`Attempt to get messages for non-existent room ID: ${roomId}`);
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    // Kiểm tra xem user có phải là thành viên của phòng không
    const isMember = await UserRoom.findOne({ where: { userId, roomId } });
    if (!isMember && req.user.role !== 'admin') { // Admin có thể xem tất cả
        logger.warn(`User ${userId} attempted to get messages for room ${roomId} without being a member.`);
        return res.status(403).json({ success: false, message: 'You are not authorized to view messages in this room.' });
    }

    const { count, rows: messages } = await Message.findAndCountAll({
      where: { roomId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'displayName', 'avatarUrl'],
      }],
      order: [['timestamp', 'DESC']], // Lấy tin mới nhất trước cho logic cuộn vô hạn
                                     // Hoặc 'ASC' nếu muốn hiển thị từ cũ đến mới ngay
      limit,
      offset,
    });

    logger.info(`Workspaceed ${messages.length} messages for room ID: ${roomId}, page: ${page}`);
    return res.status(200).json({
      success: true,
      messages,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalMessages: count,
    });
  } catch (error) {
    logger.error(`Error fetching messages for room ${req.params.roomId}:`, error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};