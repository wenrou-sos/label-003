const { Op } = require('sequelize');
const { Category, Ingredient } = require('../models');
const response = require('../utils/response');

const createCategory = async (req, res, next) => {
  try {
    const { name, sort, remark } = req.body;

    if (!name) {
      return res.status(400).json(response.error('分类名称不能为空', 400));
    }

    const exist = await Category.findOne({ where: { name } });
    if (exist) {
      return res.status(400).json(response.error('分类名称已存在', 400));
    }

    const category = await Category.create({ name, sort, remark });
    res.json(response.success(category, '创建成功'));
  } catch (err) {
    next(err);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }

    const { count, rows } = await Category.findAndCountAll({
      where,
      order: [['sort', 'ASC'], ['id', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    res.json(response.page(rows, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [['sort', 'ASC'], ['id', 'DESC']]
    });
    res.json(response.success(categories));
  } catch (err) {
    next(err);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json(response.error('分类不存在', 404));
    }

    res.json(response.success(category));
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sort, remark } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json(response.error('分类不存在', 404));
    }

    if (name && name !== category.name) {
      const exist = await Category.findOne({ where: { name } });
      if (exist) {
        return res.status(400).json(response.error('分类名称已存在', 400));
      }
    }

    await category.update({ name, sort, remark });
    res.json(response.success(category, '更新成功'));
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json(response.error('分类不存在', 404));
    }

    await category.destroy();
    res.json(response.success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
};

const getCategoryTree = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [['sort', 'ASC'], ['id', 'DESC']]
    });

    const ingredients = await Ingredient.findAll({
      where: { status: 1 },
      order: [['id', 'DESC']]
    });

    const tree = categories.map(category => {
      const children = ingredients
        .filter(ing => ing.categoryId === category.id)
        .map(ing => ({
          id: ing.id,
          name: ing.name,
          unit: ing.unit,
          type: 'ingredient'
        }));

      return {
        id: category.id,
        name: category.name,
        sort: category.sort,
        remark: category.remark,
        type: 'category',
        children
      };
    });

    res.json(response.success(tree));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
};
