const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
  sequelize,
  Stocktake,
  StocktakeItem,
  InventoryBatch,
  Ingredient,
  Category
} = require('../models');
const response = require('../utils/response');

const generateStocktakeNo = () => {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ST${timestamp}${random}`;
};

const createStocktake = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { stocktakeDate, categoryId, ingredientIds, remark } = req.body;

    const stocktakeNo = generateStocktakeNo();

    const ingredientWhere = { status: 1 };
    if (ingredientIds && ingredientIds.length > 0) {
      ingredientWhere.id = { [Op.in]: ingredientIds };
    }
    if (categoryId) {
      ingredientWhere.categoryId = categoryId;
    }

    const ingredients = await Ingredient.findAll({
      where: ingredientWhere,
      transaction
    });

    if (ingredients.length === 0) {
      await transaction.rollback();
      return res.status(400).json(response.error('没有可盘点的食材', 400));
    }

    const stocktake = await Stocktake.create({
      stocktakeNo,
      stocktakeDate: stocktakeDate || new Date(),
      status: 'draft',
      operatorId: req.user?.id,
      remark
    }, { transaction });

    const itemPromises = ingredients.map(async ingredient => {
      const batches = await InventoryBatch.findAll({
        where: { ingredientId: ingredient.id, status: 1 },
        transaction
      });

      const systemQuantity = batches.reduce((sum, b) => sum + parseFloat(b.quantity), 0);

      return StocktakeItem.create({
        stocktakeId: stocktake.id,
        ingredientId: ingredient.id,
        systemQuantity,
        actualQuantity: systemQuantity,
        diffQuantity: 0
      }, { transaction });
    });

    await Promise.all(itemPromises);

    await transaction.commit();

    res.json(response.success({
      id: stocktake.id,
      stocktakeNo: stocktake.stocktakeNo,
      itemCount: ingredients.length
    }, '盘点单创建成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const getStocktakes = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, status, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
    if (keyword) {
      where.stocktakeNo = { [Op.like]: `%${keyword}%` };
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where.stocktakeDate = {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      };
    } else if (startDate) {
      where.stocktakeDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.stocktakeDate = { [Op.lte]: new Date(endDate + ' 23:59:59') };
    }

    const { count, rows } = await Stocktake.findAndCountAll({
      where,
      order: [['stocktakeDate', 'DESC'], ['id', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    res.json(response.page(rows, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getStocktake = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stocktake = await Stocktake.findByPk(id, {
      include: [
        {
          model: StocktakeItem,
          as: 'items',
          include: [
            {
              model: Ingredient,
              as: 'ingredient',
              include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
              attributes: ['id', 'name', 'unit']
            }
          ]
        }
      ]
    });

    if (!stocktake) {
      return res.status(404).json(response.error('盘点单不存在', 404));
    }

    res.json(response.success(stocktake));
  } catch (err) {
    next(err);
  }
};

const updateStocktakeItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const stocktake = await Stocktake.findByPk(id);
    if (!stocktake) {
      return res.status(404).json(response.error('盘点单不存在', 404));
    }

    if (stocktake.status !== 'draft') {
      return res.status(400).json(response.error('只能修改草稿状态的盘点单', 400));
    }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json(response.error('盘点明细不能为空', 400));
    }

    for (const item of items) {
      const stocktakeItem = await StocktakeItem.findByPk(item.id);
      if (stocktakeItem && stocktakeItem.stocktakeId === parseInt(id)) {
        const actualQuantity = parseFloat(item.actualQuantity) || 0;
        const systemQuantity = parseFloat(stocktakeItem.systemQuantity);
        await stocktakeItem.update({
          actualQuantity,
          diffQuantity: actualQuantity - systemQuantity,
          remark: item.remark
        });
      }
    }

    res.json(response.success(null, '更新成功'));
  } catch (err) {
    next(err);
  }
};

const updateSingleStocktakeItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { actualQuantity, remark } = req.body;

    const stocktake = await Stocktake.findByPk(id);
    if (!stocktake) {
      return res.status(404).json(response.error('盘点单不存在', 404));
    }

    if (stocktake.status !== 'draft') {
      return res.status(400).json(response.error('只能修改草稿状态的盘点单', 400));
    }

    const stocktakeItem = await StocktakeItem.findByPk(itemId);
    if (!stocktakeItem) {
      return res.status(404).json(response.error('盘点明细不存在', 404));
    }

    if (stocktakeItem.stocktakeId !== parseInt(id)) {
      return res.status(400).json(response.error('盘点明细不属于该盘点单', 400));
    }

    const actualQty = parseFloat(actualQuantity) || 0;
    const systemQty = parseFloat(stocktakeItem.systemQuantity);
    await stocktakeItem.update({
      actualQuantity: actualQty,
      diffQuantity: actualQty - systemQty,
      remark
    });

    res.json(response.success(stocktakeItem, '更新成功'));
  } catch (err) {
    next(err);
  }
};

const batchUpdateStocktakeItems = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { items } = req.body;

    const stocktake = await Stocktake.findByPk(id, { transaction });
    if (!stocktake) {
      await transaction.rollback();
      return res.status(404).json(response.error('盘点单不存在', 404));
    }

    if (stocktake.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json(response.error('只能修改草稿状态的盘点单', 400));
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json(response.error('盘点明细不能为空', 400));
    }

    const stocktakeId = parseInt(id);
    const updatedCount = [];

    for (const item of items) {
      const stocktakeItem = await StocktakeItem.findByPk(item.id, { transaction });
      if (stocktakeItem && stocktakeItem.stocktakeId === stocktakeId) {
        const actualQty = parseFloat(item.actualQuantity) || 0;
        const systemQty = parseFloat(stocktakeItem.systemQuantity);
        await stocktakeItem.update({
          actualQuantity: actualQty,
          diffQuantity: actualQty - systemQty,
          remark: item.remark
        }, { transaction });
        updatedCount.push(stocktakeItem.id);
      }
    }

    await transaction.commit();

    res.json(response.success({ updatedCount: updatedCount.length }, '批量更新成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const confirmStocktake = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const stocktake = await Stocktake.findByPk(id, {
      include: [{ model: StocktakeItem, as: 'items' }],
      transaction
    });

    if (!stocktake) {
      await transaction.rollback();
      return res.status(404).json(response.error('盘点单不存在', 404));
    }

    if (stocktake.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json(response.error('盘点单只能确认一次', 400));
    }

    for (const item of stocktake.items) {
      const diff = parseFloat(item.diffQuantity);
      if (diff !== 0) {
        const batches = await InventoryBatch.findAll({
          where: { ingredientId: item.ingredientId, status: 1 },
          order: [
            ['inboundDate', 'ASC'],
            ['expireDate', 'ASC'],
            ['id', 'ASC']
          ],
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        if (diff < 0) {
          let remaining = Math.abs(diff);
          for (const batch of batches) {
            if (remaining <= 0) break;
            const batchQty = parseFloat(batch.quantity);
            const deduct = Math.min(batchQty, remaining);
            const newQty = batchQty - deduct;
            await batch.update({
              quantity: newQty,
              status: newQty <= 0 ? 0 : 1
            }, { transaction });
            remaining -= deduct;
          }
        } else if (diff > 0) {
          const latestBatch = batches[batches.length - 1];
          if (latestBatch) {
            const newQty = parseFloat(latestBatch.quantity) + diff;
            await latestBatch.update({ quantity: newQty }, { transaction });
          } else {
            await InventoryBatch.create({
              batchNo: `ADJ${dayjs().format('YYYYMMDDHHmmss')}${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
              ingredientId: item.ingredientId,
              inboundDate: new Date(),
              quantity: diff,
              originalQuantity: diff,
              unitPrice: 0,
              status: 1,
              remark: '盘点调整'
            }, { transaction });
          }
        }
      }
    }

    await stocktake.update({ status: 'confirmed' }, { transaction });
    await transaction.commit();

    res.json(response.success(null, '盘点确认成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const cancelStocktake = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stocktake = await Stocktake.findByPk(id);
    if (!stocktake) {
      return res.status(404).json(response.error('盘点单不存在', 404));
    }

    if (stocktake.status !== 'draft') {
      return res.status(400).json(response.error('只能取消草稿状态的盘点单', 400));
    }

    await stocktake.update({ status: 'cancelled' });
    res.json(response.success(null, '取消成功'));
  } catch (err) {
    next(err);
  }
};

const deleteStocktake = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const stocktake = await Stocktake.findByPk(id, { transaction });
    if (!stocktake) {
      await transaction.rollback();
      return res.status(404).json(response.error('盘点单不存在', 404));
    }

    await StocktakeItem.destroy({
      where: { stocktakeId: id },
      transaction
    });

    await stocktake.destroy({ transaction });

    await transaction.commit();
    res.json(response.success(null, '删除成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

module.exports = {
  createStocktake,
  getStocktakes,
  getStocktake,
  updateStocktakeItem,
  updateSingleStocktakeItem,
  batchUpdateStocktakeItems,
  confirmStocktake,
  cancelStocktake,
  deleteStocktake
};
