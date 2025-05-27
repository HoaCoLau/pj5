const { Message, User } = require('../models');

exports.getRoomMessages = async (req, res) => {
  const { roomId } = req.params;
  const messages = await Message.findAll({
    where: { roomId },
    include: [{ model: User, attributes: ['username', 'avatar'] }],
    order: [['createdAt', 'ASC']]
  });
  res.json(messages);
};