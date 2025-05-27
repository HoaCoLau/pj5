const express = require('express');
const http = require('http');
const cors = require('cors');
const pino = require('pino')();
const { Server } = require('socket.io');
const sequelize = require('./config/database');
const roomRoutes = require('./routes/room');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

require('./sockets')(io);

app.use(cors());
app.use(express.json());
app.use('/rooms', roomRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static('public'));

sequelize.sync().then(() => {
  server.listen(process.env.PORT || 3000, () => {
    pino.info('Server started');
  });
});