// File: utils/logger.js
const pino = require('pino');
const logger = pino({
    transport: {
        target: 'pino-pretty', // Giúp log hiển thị đẹp hơn trên terminal
        options: { colorize: true }
    }
});
module.exports = logger;