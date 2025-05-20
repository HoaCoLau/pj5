require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // Bỏ comment dòng này
const cors = require('cors');
const logger = require('./config/logger');
const sequelize = require('./config/database');
const path = require('path'); // Thêm path module
const multer = require('multer'); // Thêm multer module
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes'); // Thêm dòng này
const friendshipRoutes = require('./routes/friendshipRoutes');
// Import middleware xác thực cho Socket.IO (sẽ tạo ở bước sau)
const { authenticateSocket } = require('./middlewares/socketAuthMiddleware');
// Import handler cho các sự kiện Socket.IO (sẽ tạo ở bước sau)
const initializeSocketHandlers = require('./sockets/socketHandlers');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));


app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes); // Thêm dòng này
app.use('/api/friendships', friendshipRoutes);
const httpServer = http.createServer(app);

// Khởi tạo Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Cho phép tất cả các nguồn. Trong production, bạn nên giới hạn: ['http://localhost:YOUR_FRONTEND_PORT']
        methods: ["GET", "POST"],
        // credentials: true // Nếu bạn cần gửi cookie qua socket
    }
});

// Áp dụng middleware xác thực cho Socket.IO
io.use(authenticateSocket);

// Khởi tạo các handlers cho sự kiện Socket.IO
initializeSocketHandlers(io);

app.use((err, req, res, next) => {
  logger.error('Unhandled Express error:', err, JSON.stringify(err));
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

async function startServer() {
    try {
        await sequelize.authenticate();
        logger.info('MySQL Database connection has been established successfully.');
        await sequelize.sync({ alter: true });
        logger.info('All models were synchronized successfully.');

        httpServer.listen(PORT, () => {
            logger.info(`Server is running on port http://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error('Unable to connect to the database or start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, httpServer, io }; // Xuất io để có thể sử dụng ở nơi khác nếu cần
