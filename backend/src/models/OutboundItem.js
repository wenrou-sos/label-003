const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OutboundItem = sequelize.define('OutboundItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  outboundId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '出库单ID'
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '食材ID'
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '出库数量'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '单价'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '金额'
  },
  batchDetails: {
    type: DataTypes.TEXT,
    comment: '批次扣减详情 JSON'
  }
}, {
  tableName: 'outbound_items',
  timestamps: true
});

module.exports = OutboundItem;
