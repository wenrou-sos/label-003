const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inbound = sequelize.define('Inbound', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  inboundNo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '入库单号'
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
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: '总金额'
  },
  operatorId: {
    type: DataTypes.INTEGER,
    comment: '操作人ID'
  },
  remark: {
    type: DataTypes.STRING(255),
    comment: '备注'
  }
}, {
  tableName: 'inbounds',
  timestamps: true
});

module.exports = Inbound;
