const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
  sequelize,
  WarningLog,
  WarningConfig,
  InventoryBatch,
  Ingredient,
  Category
} = require('../models');
const response = require('../utils/response');

const getWarningConfigs = async (req, res, next) => {
  try {
    const { warningType, ingredientId } = req.query;

    const where = {};
    if (warningType) {
      where.warningType = warningType;
    }
    if (ingredientId !== undefined) {
      where.ingredientId = ingredientId;
    }

    const configs = await WarningConfig.findAll({
      where,
      include: [{
        model: Ingredient,
        as: 'ingredient',
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
        required: false
      }],
      order: [['id', 'DESC']]
    });

    res.json(response.success(configs));
  } catch (err) {
    next(err);
  }
};

const createWarningConfig = async (req, res, next) => {
  try {
    const { warningType, ingredientId, thresholdValue, enabled } = req.body;

    if (!warningType) {
      return res.status(400).json(response.error('预警类型不能为空', 400));
    }

    if (thresholdValue === undefined || thresholdValue === null) {
      return res.status(400).json(response.error('阈值不能为空', 400));
    }

    const where = { warningType };
    if (ingredientId) {
      where.ingredientId = ingredientId;
    } else {
      where.ingredientId = null;
    }

    const existConfig = await WarningConfig.findOne({ where });
    if (existConfig) {
      await existConfig.update({ thresholdValue, enabled });
      return res.json(response.success(existConfig, '更新成功'));
    }

    const config = await WarningConfig.create({
      warningType,
      ingredientId,
      thresholdValue,
      enabled
    });

    res.json(response.success(config, '创建成功'));
  } catch (err) {
    next(err);
  }
};

const updateWarningConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { thresholdValue, enabled } = req.body;

    const config = await WarningConfig.findByPk(id);
    if (!config) {
      return res.status(404).json(response.error('预警配置不存在', 404));
    }

    await config.update({ thresholdValue, enabled });
    res.json(response.success(config, '更新成功'));
  } catch (err) {
    next(err);
  }
};

const deleteWarningConfig = async (req, res, next) => {
  try {
    const { id } = req.params;

    const config = await WarningConfig.findByPk(id);
    if (!config) {
      return res.status(404).json(response.error('预警配置不存在', 404));
    }

    await config.destroy();
    res.json(response.success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
};

const getWarningLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      warningType,
      status,
      ingredientId,
      startDate,
      endDate
    } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
    if (warningType) {
      where.warningType = warningType;
    }
    if (status) {
      where.status = status;
    }
    if (ingredientId) {
      where.ingredientId = ingredientId;
    }
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate + ' 23:59:59') };
    }

    const { count, rows } = await WarningLog.findAndCountAll({
      where,
      include: [{
        model: Ingredient,
        as: 'ingredient',
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      }],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    res.json(response.page(rows, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const handleWarningLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const log = await WarningLog.findByPk(id);
    if (!log) {
      return res.status(404).json(response.error('预警日志不存在', 404));
    }

    if (!['handled', 'ignored'].includes(status)) {
      return res.status(400).json(response.error('无效的状态值', 400));
    }

    await log.update({
      status,
      handledBy: req.user?.id,
      handledAt: new Date()
    });

    res.json(response.success(null, '处理成功'));
  } catch (err) {
    next(err);
  }
};

const batchHandleWarningLogs = async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(response.error('请选择要处理的预警', 400));
    }

    if (!['handled', 'ignored'].includes(status)) {
      return res.status(400).json(response.error('无效的状态值', 400));
    }

    await WarningLog.update(
      {
        status,
        handledBy: req.user?.id,
        handledAt: new Date()
      },
      { where: { id: { [Op.in]: ids } } }
    );

    res.json(response.success(null, '批量处理成功'));
  } catch (err) {
    next(err);
  }
};

const checkExpireWarnings = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const defaultExpireConfig = await WarningConfig.findOne({
      where: { warningType: 'expire', ingredientId: null, enabled: 1 },
      transaction
    });

    const defaultDays = defaultExpireConfig ? parseFloat(defaultExpireConfig.thresholdValue) : 7;

    const ingredientExpireConfigs = await WarningConfig.findAll({
      where: { warningType: 'expire', ingredientId: { [Op.ne]: null }, enabled: 1 },
      transaction
    });

    const configMap = new Map();
    ingredientExpireConfigs.forEach(c => {
      configMap.set(c.ingredientId, parseFloat(c.thresholdValue));
    });

    const batches = await InventoryBatch.findAll({
      where: {
        quantity: { [Op.gt]: 0 },
        status: 1,
        expireDate: { [Op.ne]: null }
      },
      include: [{ model: Ingredient, as: 'ingredient' }],
      transaction
    });

    const now = dayjs();
    let createdCount = 0;

    for (const batch of batches) {
      if (!batch.expireDate || !batch.ingredient) continue;

      const daysLeft = dayjs(batch.expireDate).diff(now, 'day');
      const threshold = configMap.get(batch.ingredientId) || defaultDays;

      if (daysLeft <= threshold) {
        const existWarning = await WarningLog.findOne({
          where: {
            warningType: 'expire',
            batchId: batch.id,
            status: 'pending'
          },
          transaction
        });

        if (!existWarning) {
          await WarningLog.create({
            warningType: 'expire',
            ingredientId: batch.ingredientId,
            batchId: batch.id,
            currentValue: daysLeft,
            thresholdValue: threshold,
            message: `${batch.ingredient.name} 批次[${batch.batchNo}]即将过期，剩余 ${daysLeft} 天`,
            status: 'pending'
          }, { transaction });
          createdCount++;
        }
      }
    }

    await transaction.commit();

    res.json(response.success({ createdCount }, `检测完成，新增 ${createdCount} 条过期预警`));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const batchUpdateWarningConfigs = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { warningType, ingredientIds, thresholdValue, enabled } = req.body;

    if (!warningType) {
      await transaction.rollback();
      return res.status(400).json(response.error('预警类型不能为空', 400));
    }

    if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json(response.error('请选择食材', 400));
    }

    if (thresholdValue === undefined || thresholdValue === null) {
      await transaction.rollback();
      return res.status(400).json(response.error('阈值不能为空', 400));
    }

    for (const ingredientId of ingredientIds) {
      const existConfig = await WarningConfig.findOne({
        where: { warningType, ingredientId },
        transaction
      });

      if (existConfig) {
        await existConfig.update({ thresholdValue, enabled }, { transaction });
      } else {
        await WarningConfig.create({
          warningType,
          ingredientId,
          thresholdValue,
          enabled
        }, { transaction });
      }
    }

    await transaction.commit();
    res.json(response.success(null, '批量设置成功'));
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const getPendingStockWarnings = async (req, res, next) => {
  try {
    const logs = await WarningLog.findAll({
      where: {
        warningType: 'stock',
        status: 'pending'
      },
      include: [{
        model: Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'spec', 'unit', 'warningStock', 'categoryId'],
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      }],
      order: [['createdAt', 'DESC'], ['id', 'DESC']]
    });

    const list = logs.map(log => ({
      id: log.id,
      warningType: log.warningType,
      ingredientId: log.ingredientId,
      ingredientName: log.ingredient?.name || '',
      ingredientCode: '',
      categoryId: log.ingredient?.categoryId,
      categoryName: log.ingredient?.category?.name || '',
      spec: log.ingredient?.spec || '',
      unit: log.ingredient?.unit || '',
      currentValue: parseFloat(log.currentValue) || 0,
      thresholdValue: parseFloat(log.thresholdValue) || 0,
      message: log.message,
      status: log.status,
      createdAt: log.createdAt
    }));

    res.json(response.success({ list, count: list.length }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWarningConfigs,
  createWarningConfig,
  updateWarningConfig,
  deleteWarningConfig,
  getWarningLogs,
  handleWarningLog,
  batchHandleWarningLogs,
  checkExpireWarnings,
  batchUpdateWarningConfigs,
  getPendingStockWarnings
};
