const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stocktake = sequelize.define('Stocktake', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stocktakeNo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '盘点单号'
  },
  name: {
    type: DataTypes.STRING(100),
    comment: '盘点名称'
  },
  stocktakeDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '盘点日期'
  },
  status: {
    type: DataTypes.ENUM('draft', 'confirmed', 'cancelled'),
    defaultValue: 'draft',
    comment: '状态 draft-草稿 confirmed-已确认 cancelled-已取消'
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
  tableName: 'stocktakes',
  timestamps: true
});

module.exports = Stocktake;
