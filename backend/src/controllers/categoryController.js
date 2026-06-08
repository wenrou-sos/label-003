const { Op } = require('sequelize');
const { Category, Ingredient } = require('../models');
const response = require('../utils/response');

const createCategory = async (req, res, next) => {
  try {
    const { name, parentId, sort, remark } = req.body;

    if (!name) {
      return res.status(400).json(response.error('分类名称不能为空', 400));
    }

    if (parentId !== null && parentId !== undefined) {
      const parent = await Category.findByPk(parentId);
      if (!parent) {
        return res.status(400).json(response.error('父分类不存在', 400));
      }
    }

    const existWhere = { name };
    if (parentId === null || parentId === undefined) {
      existWhere.parentId = null;
    } else {
      existWhere.parentId = parentId;
    }
    const exist = await Category.findOne({ where: existWhere });
    if (exist) {
      return res.status(400).json(response.error('同级分类名称已存在', 400));
    }

    const category = await Category.create({ name, parentId, sort, remark });
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
    const { name, parentId, sort, remark } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json(response.error('分类不存在', 404));
    }

    if (parentId !== undefined) {
      if (parentId !== null) {
        if (parseInt(parentId) === parseInt(id)) {
          return res.status(400).json(response.error('不能将自己设为父分类', 400));
        }
        const parent = await Category.findByPk(parentId);
        if (!parent) {
          return res.status(400).json(response.error('父分类不存在', 400));
        }
      }
    }

    const effectiveParentId = parentId !== undefined ? parentId : category.parentId;
    const effectiveName = name !== undefined ? name : category.name;

    if (effectiveName !== category.name || effectiveParentId !== category.parentId) {
      const existWhere = { name: effectiveName };
      if (effectiveParentId === null || effectiveParentId === undefined) {
        existWhere.parentId = null;
      } else {
        existWhere.parentId = effectiveParentId;
      }
      existWhere.id = { [Op.ne]: id };
      const exist = await Category.findOne({ where: existWhere });
      if (exist) {
        return res.status(400).json(response.error('同级分类名称已存在', 400));
      }
    }

    await category.update({ name, parentId, sort, remark });
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

const buildCategoryTree = (categories, parentId = null) => {
  return categories
    .filter(cat => parentId === null ? cat.parentId === null : cat.parentId === parentId)
    .sort((a, b) => a.sort - b.sort || b.id - a.id)
    .map(cat => {
      const children = buildCategoryTree(categories, cat.id);
      return {
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        sort: cat.sort,
        remark: cat.remark,
        type: 'category',
        children
      };
    });
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

    const attachIngredients = (nodes) => {
      return nodes.map(node => {
        if (node.children && node.children.length > 0) {
          node.children = attachIngredients(node.children);
        }
        const ingChildren = ingredients
          .filter(ing => ing.categoryId === node.id)
          .map(ing => ({
            id: ing.id,
            name: ing.name,
            unit: ing.unit,
            type: 'ingredient'
          }));
        node.children = [...node.children, ...ingChildren];
        return node;
      });
    };

    const categoryTree = buildCategoryTree(categories, null);
    const tree = attachIngredients(categoryTree);

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
