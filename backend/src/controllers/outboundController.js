const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
  sequelize,
  Outbound,
  OutboundItem,
  InventoryBatch,
  Ingredient,
  WarningLog,
  WarningConfig
} = require('../models');
const response = require('../utils/response');

const generateOutboundNo = () => {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OUT${timestamp}${random}`;
};

const createOutbound = async (req, res, next) => {
  const transaction = await sequelize.transaction({
    isolationLevel: 'READ COMMITTED'
  });

  try {
    let { outboundDate, outboundType, items, remark } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      if (req.body.ingredientId) {
        items = [req.body];
      } else {
        await transaction.rollback();
        return res.status(400).json(response.error('出库明细不能为空', 400));
      }
    }

    const outboundNo = generateOutboundNo();
    let totalAmount = 0;
    const outboundItemPromises = [];
    const ingredientIds = new Set();

    for (const item of items) {
      const { ingredientId, quantity, department, operator, remark: itemRemark } = item;

      if (!ingredientId || !quantity || quantity <= 0) {
        throw new Error('出库明细数据不完整');
      }

      ingredientIds.add(ingredientId);

      const batches = await InventoryBatch.findAll({
        where: {
          ingredientId,
          quantity: { [Op.gt]: 0 },
          status: 1
        },
        order: [
          ['inboundDate', 'ASC'],
          ['expireDate', 'ASC'],
          ['id', 'ASC']
        ],
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.quantity), 0);
      if (totalAvailable < quantity) {
        const ingredient = await Ingredient.findByPk(ingredientId);
        throw new Error(
          `${ingredient?.name || '食材'} 库存不足，当前库存: ${totalAvailable}，需要: ${quantity}`
        );
      }

      let remainingQty = quantity;
      const batchDetails = [];
      let itemTotalAmount = 0;
      let totalDeductedQty = 0;

      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const batchQty = parseFloat(batch.quantity);
        const deductQty = Math.min(batchQty, remainingQty);

        if (deductQty > 0) {
          const newQty = batchQty - deductQty;
          await batch.update({
            quantity: newQty,
            status: newQty <= 0 ? 0 : 1
          }, { transaction });

          const batchAmount = deductQty * parseFloat(batch.unitPrice || 0);
          itemTotalAmount += batchAmount;
          totalDeductedQty += deductQty;

          batchDetails.push({
            batchId: batch.id,
            batchNo: batch.batchNo,
            deductQty,
            unitPrice: batch.unitPrice,
            amount: batchAmount.toFixed(2)
          });

          remainingQty -= deductQty;
        }
      }

      totalAmount += itemTotalAmount;

      const avgPrice = totalDeductedQty > 0 ? (itemTotalAmount / totalDeductedQty) : 0;

      const outboundItemPromise = OutboundItem.create({
        ingredientId,
        quantity: totalDeductedQty,
        unitPrice: avgPrice.toFixed(2),
        amount: itemTotalAmount.toFixed(2),
        department,
        operator,
        remark: itemRemark,
        batchDetails: JSON.stringify(batchDetails)
      }, { transaction });

      outboundItemPromises.push(outboundItemPromise);
    }

    const outbound = await Outbound.create({
      outboundNo,
      outboundDate: outboundDate || new Date(),
      outboundType: outboundType || 'normal',
      totalAmount: totalAmount.toFixed(2),
      operatorId: req.user?.id,
      remark
    }, { transaction });

    const createdItems = await Promise.all(outboundItemPromises);
    for (const item of createdItems) {
      await item.update({ outboundId: outbound.id }, { transaction });
    }

    for (const ingredientId of ingredientIds) {
      await checkAndCreateStockWarning(ingredientId, transaction);
    }

    await transaction.commit();

    res.json(response.success({
      id: outbound.id,
      outboundNo: outbound.outboundNo,
      totalAmount: totalAmount.toFixed(2)
    }, '出库成功'));
  } catch (err) {
    await transaction.rollback();
    if (err.message && (err.message.includes('库存不足') || err.message.includes('数据不完整') || err.message.includes('不能为空'))) {
      return res.status(400).json(response.error(err.message, 400));
    }
    next(err);
  }
};

const checkAndCreateStockWarning = async (ingredientId, transaction) => {
  const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
  if (!ingredient) return;

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
};

const getOutbounds = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, outboundType, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;

    const outboundWhere = {};
    if (outboundType) {
      outboundWhere.outboundType = outboundType;
    }
    if (startDate && endDate) {
      outboundWhere.outboundDate = {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      };
    } else if (startDate) {
      outboundWhere.outboundDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      outboundWhere.outboundDate = { [Op.lte]: new Date(endDate + ' 23:59:59') };
    }

    const ingredientWhere = {};
    if (keyword) {
      ingredientWhere.name = { [Op.like]: `%${keyword}%` };
    }

    const itemWhere = {};
    if (keyword) {
      itemWhere[Op.or] = [
        { '$outbound.outboundNo$': { [Op.like]: `%${keyword}%` } },
        { '$ingredient.name$': { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await OutboundItem.findAndCountAll({
      where: itemWhere,
      include: [
        { model: Outbound, as: 'outbound', where: outboundWhere, required: true, attributes: ['id', 'outboundNo', 'outboundDate', 'outboundType', 'totalAmount', 'remark', 'createdAt'] },
        { model: Ingredient, as: 'ingredient', attributes: ['id', 'name', 'unit'], where: Object.keys(ingredientWhere).length ? ingredientWhere : undefined }
      ],
      order: [
        [{ model: Outbound, as: 'outbound' }, 'outboundDate', 'DESC'],
        ['id', 'DESC']
      ],
      distinct: true,
      offset,
      limit: parseInt(pageSize)
    });

    const list = rows.map(item => {
      const qty = parseFloat(item.quantity || 0);
      const price = parseFloat(item.unitPrice || 0);
      const batchDetails = item.batchDetails ? JSON.parse(item.batchDetails) : [];
      const batchNo = batchDetails.length > 0 ? batchDetails.map(b => b.batchNo).join(', ') : '';
      return {
        id: item.id,
        outboundId: item.outboundId,
        orderNo: item.outbound?.outboundNo || '',
        outboundNo: item.outbound?.outboundNo || '',
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient?.name || '',
        unit: item.ingredient?.unit || '',
        department: item.department || '',
        operator: item.operator || '',
        quantity: qty,
        price: price,
        totalAmount: parseFloat(item.amount || (qty * price).toFixed(2)),
        batchNo: batchNo,
        batchDetails: batchDetails,
        outboundType: item.outbound?.outboundType || 'normal',
        outboundDate: item.outbound?.outboundDate,
        remark: item.outbound?.remark || item.remark || '',
        status: 1,
        createdAt: item.outbound?.createdAt || item.createdAt,
        updatedAt: item.updatedAt
      };
    });

    res.json(response.page(list, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getOutbound = async (req, res, next) => {
  try {
    const { id } = req.params;
    const outbound = await Outbound.findByPk(id, {
      include: [
        {
          model: OutboundItem,
          as: 'items',
          include: [{ model: Ingredient, as: 'ingredient', attributes: ['id', 'name', 'unit'] }]
        }
      ]
    });

    if (!outbound) {
      return res.status(404).json(response.error('出库单不存在', 404));
    }

    const result = outbound.toJSON();
    result.items = result.items.map(item => ({
      ...item,
      batchDetails: item.batchDetails ? JSON.parse(item.batchDetails) : []
    }));

    res.json(response.success(result));
  } catch (err) {
    next(err);
  }
};

const cancelOutbound = async (req, res, next) => {
  const transaction = await sequelize.transaction({
    isolationLevel: 'READ COMMITTED'
  });

  try {
    const { id } = req.params;

    const outbound = await Outbound.findByPk(id, {
      include: [{ model: OutboundItem, as: 'items' }],
      transaction
    });

    if (!outbound) {
      await transaction.rollback();
      return res.status(404).json(response.error('出库单不存在', 404));
    }

    const ingredientIds = new Set();

    for (const item of outbound.items) {
      if (item.batchDetails) {
        const details = JSON.parse(item.batchDetails);
        for (const detail of details) {
          const batch = await InventoryBatch.findByPk(detail.batchId, {
            lock: transaction.LOCK.UPDATE,
            transaction
          });
          if (batch) {
            const newQty = parseFloat(batch.quantity) + parseFloat(detail.deductQty);
            await batch.update({
              quantity: newQty,
              status: newQty > 0 ? 1 : batch.status
            }, { transaction });
          }
        }
      }
      ingredientIds.add(item.ingredientId);
    }

    await OutboundItem.destroy({
      where: { outboundId: id },
      transaction
    });

    await outbound.destroy({ transaction });

    for (const ingredientId of ingredientIds) {
      await checkAndCreateStockWarning(ingredientId, transaction);
    }

    await transaction.commit();

    res.json(response.success(null, '取消出库成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const batchCreateOutbound = async (req, res, next) => {
  const transaction = await sequelize.transaction({
    isolationLevel: 'READ COMMITTED'
  });

  try {
    let { records, items } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      if (items && Array.isArray(items) && items.length > 0) {
        records = items.map(item => ({
          outboundDate: item.outboundDate,
          outboundType: item.outboundType,
          remark: item.remark,
          items: [item]
        }));
      } else {
        await transaction.rollback();
        return res.status(400).json(response.error('出库数据不能为空', 400));
      }
    }

    const results = [];
    const allIngredientIds = new Set();

    for (const record of records) {
      let { outboundDate, outboundType, items: recItems, remark } = record;

      if (!recItems || !Array.isArray(recItems) || recItems.length === 0) {
        if (record.ingredientId) {
          recItems = [record];
        } else {
          throw new Error('出库明细不能为空');
        }
      }

      const outboundNo = generateOutboundNo();
      let totalAmount = 0;
      const outboundItemPromises = [];
      const ingredientIds = new Set();

      for (const item of recItems) {
        const { ingredientId, quantity, department, operator, remark: itemRemark } = item;

        if (!ingredientId || !quantity || quantity <= 0) {
          throw new Error('出库明细数据不完整');
        }

        ingredientIds.add(ingredientId);
        allIngredientIds.add(ingredientId);

        const batches = await InventoryBatch.findAll({
          where: {
            ingredientId,
            quantity: { [Op.gt]: 0 },
            status: 1
          },
          order: [
            ['inboundDate', 'ASC'],
            ['expireDate', 'ASC'],
            ['id', 'ASC']
          ],
          lock: transaction.LOCK.UPDATE,
          transaction
        });

        const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.quantity), 0);
        if (totalAvailable < quantity) {
          const ingredient = await Ingredient.findByPk(ingredientId);
          throw new Error(
            `${ingredient?.name || '食材'} 库存不足，当前库存: ${totalAvailable}，需要: ${quantity}`
          );
        }

        let remainingQty = quantity;
        const batchDetails = [];
        let itemTotalAmount = 0;
        let totalDeductedQty = 0;

        for (const batch of batches) {
          if (remainingQty <= 0) break;

          const batchQty = parseFloat(batch.quantity);
          const deductQty = Math.min(batchQty, remainingQty);

          if (deductQty > 0) {
            const newQty = batchQty - deductQty;
            await batch.update({
              quantity: newQty,
              status: newQty <= 0 ? 0 : 1
            }, { transaction });

            const batchAmount = deductQty * parseFloat(batch.unitPrice || 0);
            itemTotalAmount += batchAmount;
            totalDeductedQty += deductQty;

            batchDetails.push({
              batchId: batch.id,
              batchNo: batch.batchNo,
              deductQty,
              unitPrice: batch.unitPrice,
              amount: batchAmount.toFixed(2)
            });

            remainingQty -= deductQty;
          }
        }

        totalAmount += itemTotalAmount;

        const avgPrice = totalDeductedQty > 0 ? (itemTotalAmount / totalDeductedQty) : 0;

        const outboundItemPromise = OutboundItem.create({
          ingredientId,
          quantity: totalDeductedQty,
          unitPrice: avgPrice.toFixed(2),
          amount: itemTotalAmount.toFixed(2),
          department,
          operator,
          remark: itemRemark,
          batchDetails: JSON.stringify(batchDetails)
        }, { transaction });

        outboundItemPromises.push(outboundItemPromise);
      }

      const outbound = await Outbound.create({
        outboundNo,
        outboundDate: outboundDate || new Date(),
        outboundType: outboundType || 'normal',
        totalAmount: totalAmount.toFixed(2),
        operatorId: req.user?.id,
        remark
      }, { transaction });

      const createdItems = await Promise.all(outboundItemPromises);
      for (const item of createdItems) {
        await item.update({ outboundId: outbound.id }, { transaction });
      }

      results.push({
        id: outbound.id,
        outboundNo: outbound.outboundNo,
        totalAmount: totalAmount.toFixed(2)
      });
    }

    for (const ingredientId of allIngredientIds) {
      await checkAndCreateStockWarning(ingredientId, transaction);
    }

    await transaction.commit();

    res.json(response.success({ results, count: results.length }, '批量出库成功'));
  } catch (err) {
    await transaction.rollback();
    if (err.message && (err.message.includes('库存不足') || err.message.includes('数据不完整') || err.message.includes('不能为空'))) {
      return res.status(400).json(response.error(err.message, 400));
    }
    next(err);
  }
};

module.exports = {
  createOutbound,
  getOutbounds,
  getOutbound,
  cancelOutbound,
  batchCreateOutbound
};
