const { Friend, User } = require('../models');

exports.invite = async (req, res) => {
  const { friendId } = req.body;
  if (friendId === req.user.id) return res.status(400).json({ message: 'Không thể kết bạn với chính mình' });
  await Friend.create({ userId: req.user.id, friendId });
  res.json({ message: 'Đã gửi lời mời' });
};

exports.accept = async (req, res) => {
  const { friendId } = req.body;
  const friend = await Friend.findOne({ where: { userId: friendId, friendId: req.user.id } });
  if (!friend) return res.status(404).json({ message: 'Không tìm thấy lời mời' });
  friend.status = 'accepted';
  await friend.save();
  res.json({ message: 'Đã chấp nhận' });
};

exports.list = async (req, res) => {
  const friends = await Friend.findAll({
    where: { userId: req.user.id, status: 'accepted' },
    include: [{ model: User, as: 'Friend', attributes: ['id', 'username', 'avatar'] }]
  });
  res.json(friends);
};