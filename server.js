// File: server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();
const path = require('path');
const cookieParser = require('cookie-parser');
const ejsLayouts = require('express-ejs-layouts');  
const socketHandler = require('./sockets/socketHandler');



const db = require('./models'); // Import db object từ models/index.js
const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const { authMiddleware } = require('./middleware/authMiddleware');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');


const app = express();
app.use(ejsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.set('io', io);

const PORT = process.env.PORT || 3000;

// Middleware cơ bản
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')))

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/chats', chatRoutes);
app.use('/users', userRoutes);

app.get('/', authMiddleware, async (req, res) => {
    try {
        // Lấy danh sách chat mà user là thành viên
        const userChats = await db.Chat.findAll({
            include: [{
                model: db.User,
                as: 'Members',
                where: { id: req.user.id },
                attributes: [] // Không cần lấy thông tin user ở đây
            }],
            order: [['updated_at', 'DESC']]
        });

        // Lấy danh sách bạn bè để mời
        const friendships = await db.Friendship.findAll({
            where: { status: 'accepted', [db.Sequelize.Op.or]: [{ requester_id: req.user.id }, { addressee_id: req.user.id }] },
            include: [{ model: db.User, as: 'Requester' }, { model: db.User, as: 'Addressee' }]
        });
        const friends = friendships.map(f => f.requester_id === req.user.id ? f.Addressee : f.Requester);

        res.render('index', {
            title: 'Trang chủ',
            chats: userChats,
            friends: friends
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi server');
    }
});
// Logic Socket.IO
socketHandler(io); 

io.on('connection', (socket) => {
    console.log(`⚡: Một người dùng đã kết nối: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`🔥: Một người dùng đã ngắt kết nối: ${socket.id}`);
    });

    // Thêm các sự kiện socket khác ở đây (e.g., chat message, join room, ...)
});

// Đồng bộ database và khởi chạy server
// { force: true } sẽ xóa và tạo lại bảng - CHỈ DÙNG TRONG DEVELOPMENT
// { alter: true } sẽ cố gắng cập nhật bảng để khớp với model - an toàn hơn
db.sequelize.sync({ alter: true }).then(() => {
    console.log('✅ Database đã được đồng bộ.');
    server.listen(PORT, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ Không thể kết nối đến database:', err);
});