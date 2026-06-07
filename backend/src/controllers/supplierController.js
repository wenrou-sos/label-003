const { Op } = require('sequelize');
const { Supplier } = require('../models');
const response = require('../utils/response');

const createSupplier = async (req, res, next) => {
  try {
    const { name, contact, phone, address, remark, status } = req.body;

    if (!name) {
      return res.status(400).json(response.error('供应商名称不能为空', 400));
    }

    const supplier = await Supplier.create({ name, contact, phone, address, remark, status });
    res.json(response.success(supplier, '创建成功'));
  } catch (err) {
    next(err);
  }
};

const getSuppliers = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, status } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { contact: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (status !== undefined) {
      where.status = status;
    }

    const { count, rows } = await Supplier.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    res.json(response.page(rows, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getAllSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { status: 1 },
      order: [['id', 'DESC']]
    });
    res.json(response.success(suppliers));
  } catch (err) {
    next(err);
  }
};

const getSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      return res.status(404).json(response.error('供应商不存在', 404));
    }

    res.json(response.success(supplier));
  } catch (err) {
    next(err);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact, phone, address, remark, status } = req.body;

    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json(response.error('供应商不存在', 404));
    }

    await supplier.update({ name, contact, phone, address, remark, status });
    res.json(response.success(supplier, '更新成功'));
  } catch (err) {
    next(err);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      return res.status(404).json(response.error('供应商不存在', 404));
    }

    await supplier.destroy();
    res.json(response.success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  getAllSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier
};
