// controllers/roomController.js
const { Room, User, UserRoom, Message, sequelize } = require('../models'); // UserRoom cho việc thêm thành viên
const { Op } = require('sequelize');

// Logger (Giả sử bạn có logger chung, hoặc dùng console.log)
const logger = {
    info: (...args) => console.log('[INFO][RoomCtrl]', ...args),
    warn: (...args) => console.warn('[WARN][RoomCtrl]', ...args),
    error: (...args) => console.error('[ERROR][RoomCtrl]', ...args)
};

// GET /rooms - Hiển thị danh sách các phòng
exports.listRooms = async (req, res) => {
    try {
        const rooms = await Room.findAll({
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'username'] // Chỉ lấy thông tin cần thiết của người tạo
            }],
            order: [['createdAt', 'DESC']]
        });
        res.render('chat/list_rooms', {
            title: 'Danh sách phòng chat',
            rooms: rooms,
            // currentUser đã có từ res.locals.currentUser
        });
    } catch (error) {
        logger.error('Error listing rooms:', error);
        // res.status(500).send('Lỗi server khi tải danh sách phòng.');
        // Hoặc render trang lỗi
        res.render('error_page', { title: 'Lỗi', message: 'Không thể tải danh sách phòng.'});
    }
};

// GET /rooms/new - Hiển thị form tạo phòng mới
exports.showCreateRoomForm = (req, res) => {
    res.render('chat/create_room', {
        title: 'Tạo phòng chat mới',
        errors: [],
        formData: {}
    });
};

// POST /rooms - Xử lý tạo phòng mới
exports.createRoom = async (req, res) => {
    const { name, description } = req.body;
    const creatorId = req.user.id; // req.user đã được thiết lập bởi authenticateToken

    try {
        logger.info(`Attempting to create room: "${name}" by user ID: ${creatorId}`);

        // Kiểm tra tên phòng đã tồn tại chưa (model Room đã có unique constraint cho name)
        const existingRoom = await Room.findOne({ where: { name } });
        if (existingRoom) {
            logger.warn(`Room creation failed: Name "${name}" already exists.`);
            return res.status(400).render('chat/create_room', {
                title: 'Tạo phòng chat mới',
                errors: [{ field: 'name', message: 'Tên phòng này đã được sử dụng.' }],
                formData: req.body
            });
        }

        // Bắt đầu một transaction
        const result = await sequelize.transaction(async (t) => {
            const newRoom = await Room.create({
                name,
                description,
                creatorId
            }, { transaction: t });

            logger.info(`Room "${newRoom.name}" (ID: ${newRoom.id}) created successfully by user ID: ${creatorId}.`);

            // Tự động thêm người tạo phòng vào bảng UserRooms (làm thành viên của phòng)
            await UserRoom.create({
                userId: creatorId,
                roomId: newRoom.id
            }, { transaction: t });

            logger.info(`User ID: ${creatorId} automatically added as a member to room ID: ${newRoom.id}.`);
            return newRoom;
        });


        // req.flash('success_msg', 'Phòng chat đã được tạo thành công!'); // Nếu dùng connect-flash
        // Chuyển hướng đến danh sách phòng hoặc phòng vừa tạo
        res.redirect(`/rooms/${result.id}`); // Chuyển đến phòng vừa tạo

    } catch (error) {
        logger.error('Error creating room:', error);
        // Nếu lỗi là từ validation của Sequelize (ví dụ unique constraint)
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).render('chat/create_room', {
                title: 'Tạo phòng chat mới',
                errors: error.errors.map(e => ({ field: e.path, message: e.message })),
                formData: req.body
            });
        }
        // Lỗi chung
        res.status(500).render('chat/create_room', {
            title: 'Tạo phòng chat mới',
            errors: [{ message: 'Lỗi server khi tạo phòng. Vui lòng thử lại.' }],
            formData: req.body
        });
    }
};


// GET /rooms/:roomId - Hiển thị một phòng chat cụ thể
exports.showRoom = async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const userId = req.user.id;

        const room = await Room.findByPk(roomId, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username'] },
                // Lấy danh sách thành viên trong phòng (chỉ ID và username)
                // {
                //     model: User,
                //     as: 'members',
                //     attributes: ['id', 'username', 'avatar'],
                //     through: { attributes: [] } // Không lấy thông tin từ bảng UserRooms
                // }
            ]
        });

        if (!room) {
            logger.warn(`Room with ID ${roomId} not found.`);
            // req.flash('error_msg', 'Không tìm thấy phòng chat.');
            return res.status(404).render('error_page', { title: 'Lỗi 404', message: 'Không tìm thấy phòng chat bạn yêu cầu.'});
        }

        // Kiểm tra xem user hiện tại có phải là thành viên của phòng không
        // Điều này quan trọng để quyết định có cho user vào xem không,
        // hoặc có thể để mở cho tất cả user đã login, và chỉ cho join khi gửi tin nhắn.
        // Tạm thời, cứ cho user đã login xem phòng. Logic join/tham gia sẽ xử lý qua Socket.IO.

        // Lấy 20 tin nhắn gần nhất (sẽ được xử lý bởi Socket.IO khi join, nhưng có thể load sẵn ở đây)
        // const messages = await Message.findAll({
        //     where: { roomId: roomId },
        //     include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
        //     order: [['createdAt', 'DESC']],
        //     limit: 20
        // });

        res.render('chat/room_detail', {
            title: `Phòng: ${room.name}`,
            room: room,
            // messages: messages.reverse(), // Reverse để hiển thị từ cũ đến mới
            // currentUser đã có từ res.locals
        });

    } catch (error) {
        logger.error(`Error showing room ID ${req.params.roomId}:`, error);
        res.status(500).render('error_page', { title: 'Lỗi Server', message: 'Không thể hiển thị phòng chat.'});
    }
};