const success = (data = null, message = 'success') => {
  return {
    code: 0,
    message,
    data
  };
};

const error = (message = 'error', code = 1, data = null) => {
  return {
    code,
    message,
    data
  };
};

const page = (list = [], total = 0, page = 1, pageSize = 10) => {
  return {
    code: 0,
    message: 'success',
    data: {
      list,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize) || 0
    }
  };
};

module.exports = {
  success,
  error,
  page
};
