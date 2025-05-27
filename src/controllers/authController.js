const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Friend } = require('../models');
const pino = require('pino')();

exports.register = async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await User.create({ username, password: hash });
  pino.info(`User ${username} registered`);
  res.redirect('/auth/login');
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.render('login', { title: 'Đăng nhập', error: 'Sai thông tin' });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  res.cookie('token', token);
  pino.info(`User ${username} logged in`);
  res.redirect('/');
};

exports.profileGet = async (req, res) => {
  res.render('profile', { user: req.user, title: 'Hồ sơ' });
};

exports.profilePost = async (req, res) => {
  const { username } = req.body;
  let update = { username };
  if (req.file) update.avatar = '/uploads/' + req.file.filename;
  await User.update(update, { where: { id: req.user.id } });
  res.redirect('/auth/profile');
};

exports.addFriend = async (req, res) => {
  await Friend.create({ userId: req.user.id, friendId: req.params.id, status: 'pending' });
  res.redirect('/friends');
};

exports.acceptFriend = async (req, res) => {
  await Friend.update({ status: 'accepted' }, { where: { userId: req.params.id, friendId: req.user.id } });
  res.redirect('/friends');
};

exports.friends = async (req, res) => {
  const friends = await Friend.findAll({ where: { userId: req.user.id, status: 'accepted' } });
  res.render('friends', { friends, title: 'Bạn bè' });
};