const { User, Room } = require('../models');

exports.getUsers = async (req, res) => {
  const users = await User.findAll();
  res.json(users);
};

exports.getRooms = async (req, res) => {
  const rooms = await Room.findAll();
  res.json(rooms);
};