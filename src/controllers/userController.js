const { User } = require('../models');

exports.updateProfile = async (req, res) => {
  const { username } = req.body;
  const user = await User.findByPk(req.user.id);
  if (username) user.username = username;
  if (req.file) user.avatar = req.file.path;
  await user.save();
  res.json({ message: 'Cập nhật thành công', user });
};