const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ingredient = sequelize.define('Ingredient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '食材名称'
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '分类ID'
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '单位'
  },
  spec: {
    type: DataTypes.STRING(50),
    comment: '规格'
  },
  warningStock: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '预警库存'
  },
  shelfLifeDays: {
    type: DataTypes.INTEGER,
    comment: '保质期天数'
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
  tableName: 'ingredients',
  timestamps: true
});

module.exports = Ingredient;
