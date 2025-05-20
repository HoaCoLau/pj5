// src/config/logger.js
const pino = require('pino');
require('dotenv').config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard', // HH:MM:ss
      ignore: 'pid,hostname',
    },
  } : undefined, // Trong production, bạn có thể muốn ghi log ra file hoặc dịch vụ log tập trung
});




module.exports = logger;