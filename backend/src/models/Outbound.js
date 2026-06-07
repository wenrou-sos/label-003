const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Outbound = sequelize.define('Outbound', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  outboundNo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '出库单号'
  },
  outboundDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '出库日期'
  },
  outboundType: {
    type: DataTypes.ENUM('normal', 'waste', 'adjust'),
    defaultValue: 'normal',
    comment: '出库类型 normal-正常出库 waste-报损 adjust-调整'
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
  tableName: 'outbounds',
  timestamps: true
});

module.exports = Outbound;
