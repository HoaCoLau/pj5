const { Room, Message, User } = require('../models');

exports.createRoom = async (req, res) => {
  const room = await Room.create({
    name: req.body.name,
    ownerId: req.user.id
  });
  res.json(room);
};

exports.getRoomMessages = async (req, res) => {
  const messages = await Message.findAll({
    where: { roomId: req.params.room },
    order: [['timestamp', 'DESC']],
    limit: 100,
    include: [{ model: User, attributes: ['username', 'avatar'] }]
  });
  res.json(messages.reverse());
};