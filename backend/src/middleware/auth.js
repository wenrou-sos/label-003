const jwt = require('jsonwebtoken');
const response = require('../utils/response');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.headers.token;

  if (!token) {
    return res.status(401).json(response.error('未提供认证令牌', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json(response.error('认证令牌无效或已过期', 401));
  }
};

module.exports = auth;
