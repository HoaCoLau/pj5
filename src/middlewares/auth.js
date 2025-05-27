const jwt = require('jsonwebtoken');
const User = require('../models/user');
module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};