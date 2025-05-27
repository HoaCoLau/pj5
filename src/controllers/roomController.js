const { Room, User } = require('../models');

exports.createRoom = async (req, res) => {
  const { name } = req.body;
  const room = await Room.create({ name, ownerId: req.user.id });
  res.json(room);
};

exports.getRooms = async (req, res) => {
  const rooms = await Room.findAll({ include: [{ model: User, attributes: ['username'] }] });
  res.json(rooms);
};