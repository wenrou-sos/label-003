const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryBatch = sequelize.define('InventoryBatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  batchNo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '批次号'
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '食材ID'
  },
  supplierId: {
    type: DataTypes.INTEGER,
    comment: '供应商ID'
  },
  inboundDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '入库日期'
  },
  expireDate: {
    type: DataTypes.DATE,
    comment: '过期日期'
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '库存数量'
  },
  originalQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '原始入库数量'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '单价'
  },
  remark: {
    type: DataTypes.STRING(255),
    comment: '备注'
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '状态 1-正常 0-已清空'
  }
}, {
  tableName: 'inventory_batches',
  timestamps: true,
  indexes: [
    {
      name: 'idx_ingredient_inbound',
      fields: ['ingredientId', 'inboundDate']
    },
    {
      name: 'idx_ingredient_expire',
      fields: ['ingredientId', 'expireDate']
    }
  ]
});

module.exports = InventoryBatch;
