const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const {
  sequelize,
  Inbound,
  InventoryBatch,
  Ingredient,
  Supplier,
  WarningLog,
  WarningConfig
} = require('../models');
const response = require('../utils/response');

const generateBatchNo = () => {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BATCH${timestamp}${random}`;
};

const generateInboundNo = () => {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `IN${timestamp}${random}`;
};

const createInbound = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { supplierId, inboundDate, items, remark } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json(response.error('入库明细不能为空', 400));
    }

    const inboundNo = generateInboundNo();
    let totalAmount = 0;

    const batchPromises = items.map(async item => {
      const { ingredientId, quantity, unitPrice, expireDate, remark: itemRemark } = item;

      if (!ingredientId || !quantity || quantity <= 0) {
        throw new Error('入库明细数据不完整');
      }

      const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
      if (!ingredient) {
        throw new Error(`食材ID ${ingredientId} 不存在`);
      }

      const amount = parseFloat(quantity) * parseFloat(unitPrice || 0);
      totalAmount += amount;

      const batchNo = generateBatchNo();

      let finalExpireDate = expireDate;
      if (!finalExpireDate && ingredient.shelfLifeDays) {
        finalExpireDate = dayjs(inboundDate || new Date())
          .add(ingredient.shelfLifeDays, 'day')
          .toDate();
      }

      await InventoryBatch.create({
        batchNo,
        ingredientId,
        supplierId,
        inboundDate: inboundDate || new Date(),
        expireDate: finalExpireDate,
        quantity,
        originalQuantity: quantity,
        unitPrice: unitPrice || 0,
        remark: itemRemark,
        status: 1
      }, { transaction });

      return { ingredientId, quantity, unitPrice, expireDate: finalExpireDate };
    });

    await Promise.all(batchPromises);

    const inbound = await Inbound.create({
      inboundNo,
      supplierId,
      inboundDate: inboundDate || new Date(),
      totalAmount: totalAmount.toFixed(2),
      operatorId: req.user?.id,
      remark
    }, { transaction });

    await checkAndCreateStockWarnings(items, transaction);

    await transaction.commit();

    res.json(response.success({
      id: inbound.id,
      inboundNo: inbound.inboundNo,
      totalAmount: totalAmount.toFixed(2)
    }, '入库成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const checkAndCreateStockWarnings = async (items, transaction) => {
  for (const item of items) {
    const { ingredientId } = item;

    const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
    if (!ingredient) continue;

    const batches = await InventoryBatch.findAll({
      where: { ingredientId, status: 1 },
      transaction
    });

    const totalStock = batches.reduce((sum, b) => sum + parseFloat(b.quantity), 0);

    let warningThreshold = ingredient.warningStock || 0;
    const warningConfig = await WarningConfig.findOne({
      where: { warningType: 'stock', ingredientId, enabled: 1 },
      transaction
    });
    if (warningConfig) {
      warningThreshold = warningConfig.thresholdValue;
    }

    if (warningThreshold > 0 && totalStock <= warningThreshold) {
      const existWarning = await WarningLog.findOne({
        where: {
          warningType: 'stock',
          ingredientId,
          status: 'pending'
        },
        transaction
      });

      if (!existWarning) {
        await WarningLog.create({
          warningType: 'stock',
          ingredientId,
          currentValue: totalStock,
          thresholdValue: warningThreshold,
          message: `${ingredient.name} 库存不足，当前库存: ${totalStock}，阈值: ${warningThreshold}`,
          status: 'pending'
        }, { transaction });
      }
    }
  }
};

const getInbounds = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, supplierId, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
    if (keyword) {
      where.inboundNo = { [Op.like]: `%${keyword}%` };
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }
    if (startDate && endDate) {
      where.inboundDate = {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      };
    } else if (startDate) {
      where.inboundDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.inboundDate = { [Op.lte]: new Date(endDate + ' 23:59:59') };
    }

    const { count, rows } = await Inbound.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] }
      ],
      order: [['inboundDate', 'DESC'], ['id', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    res.json(response.page(rows, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getInbound = async (req, res, next) => {
  try {
    const { id } = req.params;
    const inbound = await Inbound.findByPk(id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] }
      ]
    });

    if (!inbound) {
      return res.status(404).json(response.error('入库单不存在', 404));
    }

    const batches = await InventoryBatch.findAll({
      where: {
        inboundDate: inbound.inboundDate,
        supplierId: inbound.supplierId
      },
      include: [{ model: Ingredient, as: 'ingredient', attributes: ['id', 'name', 'unit'] }],
      order: [['id', 'ASC']]
    });

    res.json(response.success({
      ...inbound.toJSON(),
      items: batches
    }));
  } catch (err) {
    next(err);
  }
};

const cancelInbound = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const inbound = await Inbound.findByPk(id, { transaction });
    if (!inbound) {
      await transaction.rollback();
      return res.status(404).json(response.error('入库单不存在', 404));
    }

    const batches = await InventoryBatch.findAll({
      where: {
        inboundDate: inbound.inboundDate,
        supplierId: inbound.supplierId
      },
      transaction
    });

    const { OutboundItem } = require('../models');
    for (const batch of batches) {
      const usedItems = await OutboundItem.findAll({ transaction });
      for (const item of usedItems) {
        if (item.batchDetails) {
          const details = JSON.parse(item.batchDetails);
          const usedInBatch = details.find(d => d.batchId === batch.id);
          if (usedInBatch) {
            await transaction.rollback();
            return res.status(400).json(response.error('该入库批次已被出库使用，无法取消', 400));
          }
        }
      }
    }

    for (const batch of batches) {
      if (parseFloat(batch.quantity) !== parseFloat(batch.originalQuantity)) {
        await transaction.rollback();
        return res.status(400).json(response.error('该入库批次已被部分出库，无法取消', 400));
      }
    }

    await InventoryBatch.destroy({
      where: {
        inboundDate: inbound.inboundDate,
        supplierId: inbound.supplierId
      },
      transaction
    });

    await inbound.destroy({ transaction });

    await transaction.commit();

    res.json(response.success(null, '取消入库成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const batchCreateInbound = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      await transaction.rollback();
      return res.status(400).json(response.error('入库数据不能为空', 400));
    }

    const results = [];

    for (const record of records) {
      const { supplierId, inboundDate, items, remark } = record;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('入库明细不能为空');
      }

      const inboundNo = generateInboundNo();
      let totalAmount = 0;

      const batchPromises = items.map(async item => {
        const { ingredientId, quantity, unitPrice, expireDate, remark: itemRemark } = item;

        if (!ingredientId || !quantity || quantity <= 0) {
          throw new Error('入库明细数据不完整');
        }

        const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
        if (!ingredient) {
          throw new Error(`食材ID ${ingredientId} 不存在`);
        }

        const amount = parseFloat(quantity) * parseFloat(unitPrice || 0);
        totalAmount += amount;

        const batchNo = generateBatchNo();

        let finalExpireDate = expireDate;
        if (!finalExpireDate && ingredient.shelfLifeDays) {
          finalExpireDate = dayjs(inboundDate || new Date())
            .add(ingredient.shelfLifeDays, 'day')
            .toDate();
        }

        await InventoryBatch.create({
          batchNo,
          ingredientId,
          supplierId,
          inboundDate: inboundDate || new Date(),
          expireDate: finalExpireDate,
          quantity,
          originalQuantity: quantity,
          unitPrice: unitPrice || 0,
          remark: itemRemark,
          status: 1
        }, { transaction });

        return { ingredientId, quantity, unitPrice, expireDate: finalExpireDate };
      });

      await Promise.all(batchPromises);

      const inbound = await Inbound.create({
        inboundNo,
        supplierId,
        inboundDate: inboundDate || new Date(),
        totalAmount: totalAmount.toFixed(2),
        operatorId: req.user?.id,
        remark
      }, { transaction });

      await checkAndCreateStockWarnings(items, transaction);

      results.push({
        id: inbound.id,
        inboundNo: inbound.inboundNo,
        totalAmount: totalAmount.toFixed(2)
      });
    }

    await transaction.commit();

    res.json(response.success({ results, count: results.length }, '批量入库成功'));
  } catch (err) {
    await transaction.rollback();
    if (err.message) {
      return res.status(400).json(response.error(err.message, 400));
    }
    next(err);
  }
};

module.exports = {
  createInbound,
  getInbounds,
  getInbound,
  cancelInbound,
  batchCreateInbound
};
