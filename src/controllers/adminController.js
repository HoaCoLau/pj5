const { User, Room, Message } = require('../models');

exports.dashboard = async (req, res) => {
  const users = await User.findAll();
  const rooms = await Room.findAll();
  const messages = await Message.findAll({ limit: 20, order: [['createdAt', 'DESC']] });
  res.render('admin', { users, rooms, messages, title: 'Quản trị' });
};

exports.deleteUser = async (req, res) => {
  await User.destroy({ where: { id: req.params.id } });
  res.redirect('/admin');
};

exports.deleteRoom = async (req, res) => {
  await Room.destroy({ where: { id: req.params.id } });
  res.redirect('/admin');
};