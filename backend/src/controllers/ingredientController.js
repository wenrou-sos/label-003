const { Op } = require('sequelize');
const { Ingredient, Category } = require('../models');
const response = require('../utils/response');

const createIngredient = async (req, res, next) => {
  try {
    const { name, categoryId, unit, spec, warningStock, shelfLifeDays, remark, status } = req.body;

    if (!name || !categoryId || !unit) {
      return res.status(400).json(response.error('食材名称、分类和单位不能为空', 400));
    }

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(400).json(response.error('分类不存在', 400));
    }

    const ingredient = await Ingredient.create({
      name, categoryId, unit, spec, warningStock, shelfLifeDays, remark, status
    });
    res.json(response.success(ingredient, '创建成功'));
  } catch (err) {
    next(err);
  }
};

const getIngredients = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, categoryId, status } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (status !== undefined) {
      where.status = status;
    }

    const { count, rows } = await Ingredient.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['id', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    res.json(response.page(rows, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getAllIngredients = async (req, res, next) => {
  try {
    const ingredients = await Ingredient.findAll({
      where: { status: 1 },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['id', 'DESC']]
    });
    res.json(response.success(ingredients));
  } catch (err) {
    next(err);
  }
};

const getIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ingredient = await Ingredient.findByPk(id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
    });

    if (!ingredient) {
      return res.status(404).json(response.error('食材不存在', 404));
    }

    res.json(response.success(ingredient));
  } catch (err) {
    next(err);
  }
};

const updateIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, categoryId, unit, spec, warningStock, shelfLifeDays, remark, status } = req.body;

    const ingredient = await Ingredient.findByPk(id);
    if (!ingredient) {
      return res.status(404).json(response.error('食材不存在', 404));
    }

    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json(response.error('分类不存在', 400));
      }
    }

    await ingredient.update({ name, categoryId, unit, spec, warningStock, shelfLifeDays, remark, status });
    res.json(response.success(ingredient, '更新成功'));
  } catch (err) {
    next(err);
  }
};

const deleteIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ingredient = await Ingredient.findByPk(id);

    if (!ingredient) {
      return res.status(404).json(response.error('食材不存在', 404));
    }

    await ingredient.destroy();
    res.json(response.success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createIngredient,
  getIngredients,
  getAllIngredients,
  getIngredient,
  updateIngredient,
  deleteIngredient
};
