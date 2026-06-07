const jwt = require('jsonwebtoken');
const { User } = require('../models');
const response = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json(response.error('用户名和密码不能为空', 400));
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json(response.error('用户名或密码错误', 401));
    }

    if (user.status !== 1) {
      return res.status(401).json(response.error('账户已被禁用', 401));
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json(response.error('用户名或密码错误', 401));
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json(response.success({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role
      }
    }, '登录成功'));
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { username, password, realName, role } = req.body;

    if (!username || !password) {
      return res.status(400).json(response.error('用户名和密码不能为空', 400));
    }

    const existUser = await User.findOne({ where: { username } });
    if (existUser) {
      return res.status(400).json(response.error('用户名已存在', 400));
    }

    const user = await User.create({
      username,
      password,
      realName,
      role: role || 'staff'
    });

    res.json(response.success({
      id: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role
    }, '注册成功'));
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'realName', 'role', 'status', 'createdAt']
    });

    if (!user) {
      return res.status(404).json(response.error('用户不存在', 404));
    }

    res.json(response.success(user));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  register,
  getProfile
};
