const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '供应商名称'
  },
  contact: {
    type: DataTypes.STRING(50),
    comment: '联系人'
  },
  phone: {
    type: DataTypes.STRING(20),
    comment: '联系电话'
  },
  address: {
    type: DataTypes.STRING(255),
    comment: '地址'
  },
  remark: {
    type: DataTypes.STRING(255),
    comment: '备注'
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '状态 1-启用 0-禁用'
  }
}, {
  tableName: 'suppliers',
  timestamps: true
});

module.exports = Supplier;
