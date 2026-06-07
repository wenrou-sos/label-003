const response = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json(response.error('数据验证失败', 400, errors));
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json(response.error('数据已存在', 400));
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json(response.error('关联数据不存在', 400));
  }

  if (err.status === 400 || err.code === 400) {
    return res.status(400).json(response.error(err.message || '请求参数错误', 400));
  }

  if (err.status === 401 || err.code === 401) {
    return res.status(401).json(response.error(err.message || '未授权', 401));
  }

  if (err.status === 403 || err.code === 403) {
    return res.status(403).json(response.error(err.message || '禁止访问', 403));
  }

  if (err.status === 404 || err.code === 404) {
    return res.status(404).json(response.error(err.message || '资源不存在', 404));
  }

  res.status(500).json(response.error(err.message || '服务器内部错误', 500));
};

module.exports = errorHandler;
