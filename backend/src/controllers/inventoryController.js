const { Op, fn, col, literal } = require('sequelize');
const { InventoryBatch, Ingredient, Category, Supplier, WarningConfig, WarningLog } = require('../models');
const response = require('../utils/response');
const dayjs = require('dayjs');

const getInventoryList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, categoryId } = req.query;
    const offset = (page - 1) * pageSize;

    const ingredientWhere = {};
    if (keyword) {
      ingredientWhere.name = { [Op.like]: `%${keyword}%` };
    }
    if (categoryId) {
      ingredientWhere.categoryId = categoryId;
    }

    const batches = await InventoryBatch.findAll({
      where: {
        quantity: { [Op.gt]: 0 },
        status: 1
      },
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          where: ingredientWhere,
          include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] }
      ],
      order: [
        [{ model: Ingredient, as: 'ingredient' }, 'id', 'DESC'],
        ['inboundDate', 'ASC'],
        ['expireDate', 'ASC']
      ]
    });

    const inventoryMap = new Map();
    batches.forEach(batch => {
      const ingredientId = batch.ingredientId;
      if (!inventoryMap.has(ingredientId)) {
        inventoryMap.set(ingredientId, {
          ingredient: batch.ingredient,
          totalQuantity: 0,
          totalAmount: 0,
          batches: []
        });
      }
      const item = inventoryMap.get(ingredientId);
      const qty = parseFloat(batch.quantity);
      const price = parseFloat(batch.unitPrice);
      item.totalQuantity += qty;
      item.totalAmount += qty * price;
      item.batches.push(batch);
    });

    const now = dayjs();
    const list = Array.from(inventoryMap.values()).map(item => {
      const ingredient = item.ingredient;
      const totalQty = item.totalQuantity;
      let warningThreshold = parseFloat(ingredient.warningStock) || 0;
      let isStockWarning = false;
      let isExpireWarning = false;

      for (const batch of item.batches) {
        if (batch.expireDate) {
          const daysLeft = dayjs(batch.expireDate).diff(now, 'day');
          if (daysLeft <= 7 && daysLeft >= 0) {
            isExpireWarning = true;
            break;
          }
        }
      }

      if (warningThreshold > 0 && totalQty <= warningThreshold) {
        isStockWarning = true;
      }

      const warningStatus = isStockWarning && isExpireWarning ? 'both' :
                            isStockWarning ? 'stock' :
                            isExpireWarning ? 'expire' : 'normal';

      return {
        ingredient,
        totalQuantity: totalQty.toFixed(2),
        totalAmount: item.totalAmount.toFixed(2),
        avgPrice: item.totalQuantity > 0 ? (item.totalAmount / item.totalQuantity).toFixed(2) : '0.00',
        batchCount: item.batches.length,
        warningStatus,
        isStockWarning,
        isExpireWarning
      };
    });

    const total = list.length;
    const paginatedList = list.slice(offset, offset + parseInt(pageSize));

    res.json(response.page(paginatedList, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getInventoryBatches = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, ingredientId, keyword, onlyAvailable = 'true' } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
    if (ingredientId) {
      where.ingredientId = ingredientId;
    }
    if (onlyAvailable === 'true') {
      where.quantity = { [Op.gt]: 0 };
      where.status = 1;
    }

    const ingredientWhere = {};
    if (keyword) {
      ingredientWhere.name = { [Op.like]: `%${keyword}%` };
    }

    const { count, rows } = await InventoryBatch.findAndCountAll({
      where,
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          where: Object.keys(ingredientWhere).length ? ingredientWhere : undefined,
          include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] }
      ],
      order: [
        ['inboundDate', 'ASC'],
        ['expireDate', 'ASC'],
        ['id', 'ASC']
      ],
      offset,
      limit: parseInt(pageSize)
    });

    res.json(response.page(rows, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getInventorySummary = async (req, res, next) => {
  try {
    const batches = await InventoryBatch.findAll({
      where: { quantity: { [Op.gt]: 0 }, status: 1 },
      include: [{ model: Ingredient, as: 'ingredient' }]
    });

    let totalItems = 0;
    let totalQuantity = 0;
    let totalAmount = 0;
    const ingredientSet = new Set();

    batches.forEach(batch => {
      ingredientSet.add(batch.ingredientId);
      const qty = parseFloat(batch.quantity);
      const price = parseFloat(batch.unitPrice);
      totalQuantity += qty;
      totalAmount += qty * price;
    });

    totalItems = ingredientSet.size;

    const now = dayjs();
    let expireWarningCount = 0;
    batches.forEach(batch => {
      if (batch.expireDate) {
        const daysLeft = dayjs(batch.expireDate).diff(now, 'day');
        if (daysLeft <= 7 && daysLeft >= 0) {
          expireWarningCount++;
        }
      }
    });

    res.json(response.success({
      totalItems,
      totalQuantity: totalQuantity.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      batchCount: batches.length,
      expireWarningCount
    }));
  } catch (err) {
    next(err);
  }
};

const getIngredientInventory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batches = await InventoryBatch.findAll({
      where: {
        ingredientId: id,
        status: 1
      },
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name'] }],
      order: [
        ['inboundDate', 'ASC'],
        ['expireDate', 'ASC']
      ]
    });

    const ingredient = await Ingredient.findByPk(id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
    });

    let totalQuantity = 0;
    let totalAmount = 0;

    batches.forEach(batch => {
      const qty = parseFloat(batch.quantity);
      const price = parseFloat(batch.unitPrice);
      totalQuantity += qty;
      totalAmount += qty * price;
    });

    res.json(response.success({
      ingredient,
      totalQuantity: totalQuantity.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      avgPrice: totalQuantity > 0 ? (totalAmount / totalQuantity).toFixed(2) : '0.00',
      batches
    }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInventoryList,
  getInventoryBatches,
  getInventorySummary,
  getIngredientInventory
};
