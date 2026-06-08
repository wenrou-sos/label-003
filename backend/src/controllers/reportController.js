const { Op } = require('sequelize');
const XLSX = require('xlsx');
const dayjs = require('dayjs');
const {
  User,
  Inbound,
  Outbound,
  OutboundItem,
  InventoryBatch,
  Ingredient,
  Category,
  Supplier
} = require('../models');
const response = require('../utils/response');

const getInboundRecords = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      ingredientId,
      categoryId,
      supplierId,
      startDate,
      endDate
    } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {};
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

    const batchWhere = { status: 1 };
    if (ingredientId) {
      batchWhere.ingredientId = ingredientId;
    }

    const ingredientWhere = {};
    if (categoryId) {
      ingredientWhere.categoryId = categoryId;
    }
    if (keyword) {
      ingredientWhere.name = { [Op.like]: `%${keyword}%` };
    }

    const { count, rows } = await InventoryBatch.findAndCountAll({
      where: batchWhere,
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          where: Object.keys(ingredientWhere).length ? ingredientWhere : undefined,
          include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] }
      ],
      order: [['inboundDate', 'DESC'], ['id', 'DESC']],
      offset,
      limit: parseInt(pageSize)
    });

    const records = rows.map(batch => {
      const qty = parseFloat(batch.originalQuantity) || 0;
      const price = parseFloat(batch.unitPrice) || 0;
      return {
        id: batch.id,
        type: 'inbound',
        typeName: '入库',
        orderNo: batch.batchNo,
        batchNo: batch.batchNo,
        ingredientId: batch.ingredientId,
        ingredientName: batch.ingredient?.name || '',
        categoryId: batch.ingredient?.categoryId,
        categoryName: batch.ingredient?.category?.name || '',
        unit: batch.ingredient?.unit || '',
        supplierId: batch.supplierId,
        supplierName: batch.supplier?.name || '',
        quantity: qty,
        price: price,
        totalAmount: parseFloat((qty * price).toFixed(2)),
        unitPrice: price,
        amount: parseFloat((qty * price).toFixed(2)),
        date: batch.inboundDate,
        inboundDate: batch.inboundDate,
        expireDate: batch.expireDate,
        operator: '',
        operatorName: '',
        remark: batch.remark || '',
        createdAt: batch.createdAt
      };
    });

    res.json(response.page(records, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getOutboundRecords = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      ingredientId,
      categoryId,
      outboundType,
      startDate,
      endDate
    } = req.query;
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

    const itemWhere = {};
    if (ingredientId) {
      itemWhere.ingredientId = ingredientId;
    }

    const ingredientWhere = {};
    if (categoryId) {
      ingredientWhere.categoryId = categoryId;
    }

    const { count, rows } = await OutboundItem.findAndCountAll({
      where: itemWhere,
      include: [
        {
          model: Outbound,
          as: 'outbound',
          where: outboundWhere,
          required: true,
          include: [{ model: User, as: 'operator', attributes: ['id', 'username', 'realName'] }]
        },
        {
          model: Ingredient,
          as: 'ingredient',
          where: Object.keys(ingredientWhere).length ? ingredientWhere : undefined,
          include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        }
      ],
      order: [
        [{ model: Outbound, as: 'outbound' }, 'outboundDate', 'DESC'],
        ['id', 'DESC']
      ],
      offset,
      limit: parseInt(pageSize)
    });

    const records = rows.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const amount = parseFloat(item.amount) || parseFloat((qty * price).toFixed(2));
      let batchNos = '';
      try {
        const batchDetails = item.batchDetails ? JSON.parse(item.batchDetails) : [];
        batchNos = batchDetails.map(b => b.batchNo).join(', ');
      } catch (e) { /* ignore */ }
      return {
        id: item.id,
        type: 'outbound',
        typeName: item.outbound.outboundType === 'waste' ? '报损' :
                  item.outbound.outboundType === 'adjust' ? '调整' : '出库',
        orderNo: item.outbound.outboundNo,
        outboundNo: item.outbound.outboundNo,
        outboundType: item.outbound.outboundType,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient?.name || '',
        categoryId: item.ingredient?.categoryId,
        categoryName: item.ingredient?.category?.name || '',
        unit: item.ingredient?.unit || '',
        batchNo: batchNos,
        department: item.department || '',
        operator: item.operator || '',
        operatorName: item.outbound.operator?.realName || item.outbound.operator?.username || item.operator || '',
        quantity: qty,
        price: price,
        totalAmount: amount,
        unitPrice: price,
        amount: amount,
        date: item.outbound.outboundDate,
        outboundDate: item.outbound.outboundDate,
        remark: item.outbound.remark || item.remark || '',
        createdAt: item.outbound.createdAt || item.createdAt
      };
    });

    res.json(response.page(records, count, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getAllRecords = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      type,
      ingredientId,
      categoryId,
      startDate,
      endDate
    } = req.query;

    let allRecords = [];

    if (!type || type === 'inbound') {
      const inboundParams = { ...req.query, page: 1, pageSize: 10000 };
      const inboundRes = await getInboundRecordsInternal(inboundParams);
      allRecords = allRecords.concat(inboundRes);
    }

    if (!type || type === 'outbound') {
      const outboundParams = { ...req.query, page: 1, pageSize: 10000 };
      const outboundRes = await getOutboundRecordsInternal(outboundParams);
      allRecords = allRecords.concat(outboundRes);
    }

    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = allRecords.length;
    const offset = (page - 1) * pageSize;
    const paginatedList = allRecords.slice(offset, offset + parseInt(pageSize));

    res.json(response.page(paginatedList, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

const getInboundRecordsInternal = async (params) => {
  const { ingredientId, categoryId, supplierId, startDate, endDate } = params;

  const batchWhere = { status: 1 };
  if (ingredientId) batchWhere.ingredientId = ingredientId;
  if (supplierId) batchWhere.supplierId = supplierId;
  if (startDate && endDate) {
    batchWhere.inboundDate = {
      [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
    };
  } else if (startDate) {
    batchWhere.inboundDate = { [Op.gte]: new Date(startDate) };
  } else if (endDate) {
    batchWhere.inboundDate = { [Op.lte]: new Date(endDate + ' 23:59:59') };
  }

  const ingredientWhere = {};
  if (categoryId) ingredientWhere.categoryId = categoryId;

  const batches = await InventoryBatch.findAll({
    where: batchWhere,
    include: [
      {
        model: Ingredient,
        as: 'ingredient',
        where: Object.keys(ingredientWhere).length ? ingredientWhere : undefined,
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      },
      { model: Supplier, as: 'supplier', attributes: ['id', 'name'] }
    ]
  });

  return batches.map(batch => {
    const qty = parseFloat(batch.originalQuantity) || 0;
    const price = parseFloat(batch.unitPrice) || 0;
    return {
      id: `in_${batch.id}`,
      type: 'inbound',
      typeName: '入库',
      orderNo: batch.batchNo,
      batchNo: batch.batchNo,
      ingredientId: batch.ingredientId,
      ingredientName: batch.ingredient?.name || '',
      categoryId: batch.ingredient?.categoryId,
      categoryName: batch.ingredient?.category?.name || '',
      unit: batch.ingredient?.unit || '',
      supplierId: batch.supplierId,
      supplierName: batch.supplier?.name || '',
      quantity: qty,
      price: price,
      totalAmount: parseFloat((qty * price).toFixed(2)),
      unitPrice: price,
      amount: parseFloat((qty * price).toFixed(2)),
      date: batch.inboundDate,
      inboundDate: batch.inboundDate,
      expireDate: batch.expireDate,
      operator: '',
      operatorName: '',
      remark: batch.remark || ''
    };
  });
};

const getOutboundRecordsInternal = async (params) => {
  const { ingredientId, categoryId, outboundType, startDate, endDate } = params;

  const outboundWhere = {};
  if (outboundType) outboundWhere.outboundType = outboundType;
  if (startDate && endDate) {
    outboundWhere.outboundDate = {
      [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
    };
  } else if (startDate) {
    outboundWhere.outboundDate = { [Op.gte]: new Date(startDate) };
  } else if (endDate) {
    outboundWhere.outboundDate = { [Op.lte]: new Date(endDate + ' 23:59:59') };
  }

  const itemWhere = {};
  if (ingredientId) itemWhere.ingredientId = ingredientId;

  const ingredientWhere = {};
  if (categoryId) ingredientWhere.categoryId = categoryId;

  const items = await OutboundItem.findAll({
    where: itemWhere,
    include: [
      {
        model: Outbound,
        as: 'outbound',
        where: outboundWhere,
        required: true,
        include: [{ model: User, as: 'operator', attributes: ['id', 'username', 'realName'] }]
      },
      {
        model: Ingredient,
        as: 'ingredient',
        where: Object.keys(ingredientWhere).length ? ingredientWhere : undefined,
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
      }
    ]
  });

  return items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const amount = parseFloat(item.amount) || parseFloat((qty * price).toFixed(2));
    let batchNos = '';
    try {
      const batchDetails = item.batchDetails ? JSON.parse(item.batchDetails) : [];
      batchNos = batchDetails.map(b => b.batchNo).join(', ');
    } catch (e) { /* ignore */ }
    return {
      id: `out_${item.id}`,
      type: 'outbound',
      typeName: item.outbound.outboundType === 'waste' ? '报损' :
                item.outbound.outboundType === 'adjust' ? '调整' : '出库',
      orderNo: item.outbound.outboundNo,
      outboundNo: item.outbound.outboundNo,
      outboundType: item.outbound.outboundType,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredient?.name || '',
      categoryId: item.ingredient?.categoryId,
      categoryName: item.ingredient?.category?.name || '',
      unit: item.ingredient?.unit || '',
      batchNo: batchNos,
      department: item.department || '',
      operator: item.operator || '',
      operatorName: item.outbound.operator?.realName || item.outbound.operator?.username || item.operator || '',
      quantity: qty,
      price: price,
      totalAmount: amount,
      unitPrice: price,
      amount: amount,
      date: item.outbound.outboundDate,
      outboundDate: item.outbound.outboundDate,
      remark: item.outbound.remark || item.remark || '',
      createdAt: item.outbound.createdAt || item.createdAt
    };
  });
};

const exportInboundExcel = async (req, res, next) => {
  try {
    const records = await getInboundRecordsInternal(req.query);

    const data = records.map(r => ({
      '类型': r.typeName,
      '批次号': r.batchNo,
      '食材名称': r.ingredient?.name || '',
      '分类': r.ingredient?.category?.name || '',
      '单位': r.ingredient?.unit || '',
      '供应商': r.supplier?.name || '',
      '数量': r.quantity,
      '单价': r.unitPrice,
      '金额': r.amount,
      '入库日期': dayjs(r.date).format('YYYY-MM-DD'),
      '过期日期': r.expireDate ? dayjs(r.expireDate).format('YYYY-MM-DD') : '',
      '备注': r.remark || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '入库记录');

    const fileName = `入库记录_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const exportOutboundExcel = async (req, res, next) => {
  try {
    const records = await getOutboundRecordsInternal(req.query);

    const data = records.map(r => ({
      '类型': r.typeName,
      '出库单号': r.outboundNo,
      '食材名称': r.ingredient?.name || '',
      '分类': r.ingredient?.category?.name || '',
      '单位': r.ingredient?.unit || '',
      '数量': r.quantity,
      '单价': r.unitPrice,
      '金额': r.amount,
      '出库日期': dayjs(r.date).format('YYYY-MM-DD'),
      '备注': r.remark || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '出库记录');

    const fileName = `出库记录_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const exportAllExcel = async (req, res, next) => {
  try {
    let allRecords = [];

    const inboundRes = await getInboundRecordsInternal(req.query);
    allRecords = allRecords.concat(inboundRes);

    const outboundRes = await getOutboundRecordsInternal(req.query);
    allRecords = allRecords.concat(outboundRes);

    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    const data = allRecords.map(r => ({
      '类型': r.typeName,
      '单号': r.batchNo || r.outboundNo || '',
      '食材名称': r.ingredient?.name || '',
      '分类': r.ingredient?.category?.name || '',
      '单位': r.ingredient?.unit || '',
      '供应商': r.supplier?.name || '',
      '数量': r.quantity,
      '单价': r.unitPrice,
      '金额': r.amount,
      '日期': dayjs(r.date).format('YYYY-MM-DD'),
      '备注': r.remark || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '流水记录');

    const fileName = `流水记录_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const getStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      };
    } else if (startDate) {
      dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      dateWhere.createdAt = { [Op.lte]: new Date(endDate + ' 23:59:59') };
    }

    const inboundBatches = await InventoryBatch.findAll({
      where: { ...dateWhere, status: 1 }
    });

    const outboundItems = await OutboundItem.findAll({
      include: [{ model: Outbound, as: 'outbound', where: dateWhere, required: true }]
    });

    let inboundTotalAmount = 0;
    let inboundTotalQuantity = 0;
    inboundBatches.forEach(b => {
      const qty = parseFloat(b.originalQuantity);
      const price = parseFloat(b.unitPrice);
      inboundTotalQuantity += qty;
      inboundTotalAmount += qty * price;
    });

    let outboundTotalAmount = 0;
    let outboundTotalQuantity = 0;
    let wasteTotalAmount = 0;
    let wasteTotalQuantity = 0;
    outboundItems.forEach(item => {
      const qty = parseFloat(item.quantity);
      const amount = parseFloat(item.amount);
      if (item.outbound.outboundType === 'waste') {
        wasteTotalQuantity += qty;
        wasteTotalAmount += amount;
      } else {
        outboundTotalQuantity += qty;
        outboundTotalAmount += amount;
      }
    });

    const currentBatches = await InventoryBatch.findAll({
      where: { quantity: { [Op.gt]: 0 }, status: 1 }
    });
    let currentStockAmount = 0;
    currentBatches.forEach(b => {
      currentStockAmount += parseFloat(b.quantity) * parseFloat(b.unitPrice);
    });

    res.json(response.success({
      inboundTotalAmount: inboundTotalAmount.toFixed(2),
      inboundTotalQuantity: inboundTotalQuantity.toFixed(2),
      outboundTotalAmount: outboundTotalAmount.toFixed(2),
      outboundTotalQuantity: outboundTotalQuantity.toFixed(2),
      wasteTotalAmount: wasteTotalAmount.toFixed(2),
      wasteTotalQuantity: wasteTotalQuantity.toFixed(2),
      currentStockAmount: currentStockAmount.toFixed(2)
    }));
  } catch (err) {
    next(err);
  }
};

const getFlowRecords = async (req, res, next) => {
  return getAllRecords(req, res, next);
};

const getSummary = async (req, res, next) => {
  return getStatistics(req, res, next);
};

const exportExcel = async (req, res, next) => {
  return exportAllExcel(req, res, next);
};

module.exports = {
  getInboundRecords,
  getOutboundRecords,
  getAllRecords,
  getFlowRecords,
  exportInboundExcel,
  exportOutboundExcel,
  exportAllExcel,
  exportExcel,
  getStatistics,
  getSummary
};
