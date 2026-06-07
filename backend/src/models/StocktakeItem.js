const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StocktakeItem = sequelize.define('StocktakeItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stocktakeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '盘点单ID'
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '食材ID'
  },
  systemQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '系统库存'
  },
  actualQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '实际库存'
  },
  diffQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '差异数量'
  },
  remark: {
    type: DataTypes.STRING(255),
    comment: '备注'
  }
}, {
  tableName: 'stocktake_items',
  timestamps: true
});

module.exports = StocktakeItem;
