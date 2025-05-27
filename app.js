// app.js
require('dotenv').config(); // Nạp biến môi trường từ file .env

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const pino = require('pino');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); // Thêm dòng này

// Import models (để sử dụng trong xác thực socket hoặc các middleware khác nếu cần)
const { sequelize, User } = require('./models'); // models/index.js sẽ export sequelize và các models

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { // Cấu hình CORS nếu client và server khác domain/port
        origin: "*", // Cho phép tất cả các origin (thay đổi cho production)
        methods: ["GET", "POST"]
    }
});

// --- Cấu hình Logger (Pino) ---
const logger = pino({
    transport: {
        target: 'pino-pretty', // Làm cho output log đẹp hơn khi dev
        options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname'
        }
    }
}, pino.destination(path.join(__dirname, 'logs', 'app.log'))); // Ghi log vào file
// Để ghi ra console nữa (ngoài file)
const stream = pino.multistream([
    { stream: process.stdout }, // console
    { stream: pino.destination(path.join(__dirname, 'logs', 'app.log')) } // file
]);
const multiLogger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname'
        }
    }
}, stream);


// --- Cấu hình Express ---
// View Engine Setup (EJS và express-ejs-layouts)
app.use(expressLayouts);
app.set('layout', './layouts/main'); // Đặt layout mặc định
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware để parse JSON và URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // false để dùng querystring library, true dùng qs (phức tạp hơn)
app.use(cookieParser());
// Phục vụ các file tĩnh từ thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Phục vụ file upload từ thư mục 'uploads' (nếu muốn truy cập trực tiếp)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- Middleware Xác thực Token cho Socket.IO ---
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    multiLogger.info(`Socket connection attempt. Token: ${token ? 'provided' : 'not provided'}`);

    if (!token) {
        multiLogger.warn('Socket Auth Error: Token not provided.');
        return next(new Error('Authentication error: Token not provided.'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'email', 'role', 'avatar'] // Chỉ lấy các trường cần thiết
        });
        if (!user) {
            multiLogger.warn(`Socket Auth Error: User not found for ID ${decoded.id}`);
            return next(new Error('Authentication error: User not found.'));
        }
        socket.user = user.get({ plain: true }); // Gắn thông tin user vào socket (dạng plain object)
        multiLogger.info(`Socket Authenticated: User ${socket.user.username} (ID: ${socket.user.id})`);
        next();
    } catch (err) {
        multiLogger.error(`Socket Auth Error: ${err.message}`);
        if (err.name === 'TokenExpiredError') {
            return next(new Error('Authentication error: Token expired.'));
        }
        return next(new Error('Authentication error: Invalid token.'));
    }
});

// // --- Xử lý Kết nối Socket.IO ---
// const chatHandler = require('./sockets/chatHandler'); // Import chatHandler
// io.on('connection', (socket) => {
//     multiLogger.info(`User ${socket.user.username} (Socket ID: ${socket.id}) connected via WebSocket.`);

//     // Gọi hàm xử lý các sự kiện chat, truyền io, socket và logger
//     chatHandler(io, socket, multiLogger);

//     socket.on('disconnect', (reason) => {
//         multiLogger.info(`User ${socket.user ? socket.user.username : 'Unknown'} (Socket ID: ${socket.id}) disconnected. Reason: ${reason}`);
//         // Logic xử lý khi user rời phòng sẽ nằm trong chatHandler
//     });

//     socket.on('error', (error) => {
//         multiLogger.error(`Socket error for user ${socket.user ? socket.user.username : 'Unknown'} (Socket ID: ${socket.id}): ${error.message}`);
//     });
// });


// --- Routes (Sẽ định nghĩa sau) ---
// Ví dụ:
const authRoutes = require('./routes/authRoutes');
const { authenticateToken, setViewLocals } = require('./middlewares/authMiddleware'); // Chỉ import cái cần
const roomRoutes = require('./routes/roomRoutes');
app.use(authenticateToken);
app.use(setViewLocals);

// const roomRoutes = require('./routes/roomRoutes');
// const apiRoutes = require('./routes/apiRoutes');
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
// app.use('/api', apiRoutes);

// Route cơ bản để test
app.get('/', (req, res) => {
    // multiLogger.info(`Rendering / route. currentUser from res.locals: ${res.locals.currentUser ? res.locals.currentUser.username : 'null'}`); // Thêm log này để kiểm tra
    console.log(`[INFO] Rendering / route. currentUser from res.locals: ${res.locals.currentUser ? res.locals.currentUser.username : 'null'}`);
    res.render('index', {
        title: 'Trang Chủ Chat App'
        // user: res.locals.currentUser // Không cần truyền user nữa vì đã có currentUser trong res.locals
    });
});


// --- Middleware xử lý lỗi tập trung (cho Express) ---
// Ví dụ:
// app.use((err, req, res, next) => {
//   multiLogger.error({
//     message: err.message,
//     stack: err.stack,
//     url: req.originalUrl,
//     method: req.method,
//     ip: req.ip
//   });
//   res.status(err.status || 500).send(err.message || 'Lỗi Server');
// });


// --- Khởi động Server ---
const PORT = process.env.SERVER_PORT || 3000;

sequelize.authenticate()
    .then(() => {
        multiLogger.info('Kết nối cơ sở dữ liệu thành công! (Sequelize)');
        // sequelize.sync({ force: false }) // true sẽ xóa và tạo lại bảng, false chỉ tạo nếu chưa có. Thường dùng migrate.
        //     .then(() => {
        //         multiLogger.info('Đồng bộ hóa model với cơ sở dữ liệu thành công.');
        //         server.listen(PORT, () => {
        //             multiLogger.info(`Server đang chạy trên cổng ${PORT}`);
        //         });
        //     })
        //     .catch(syncErr => {
        //         multiLogger.error('Lỗi đồng bộ hóa model:', syncErr);
        //     });
        server.listen(PORT, () => { // Khởi động server sau khi kết nối DB thành công
            multiLogger.info(`Server: http://localhost:${PORT}/`);
        });
    })
    .catch(err => {
        multiLogger.error('Không thể kết nối đến cơ sở dữ liệu:', err);
    });