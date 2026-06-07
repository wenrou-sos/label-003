const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WarningConfig = sequelize.define('WarningConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  warningType: {
    type: DataTypes.ENUM('stock', 'expire'),
    allowNull: false,
    comment: '预警类型 stock-库存预警 expire-过期预警'
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    comment: '食材ID，为空则为全局配置'
  },
  thresholdValue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '阈值（库存预警为数量，过期预警为天数）'
  },
  enabled: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '是否启用 1-启用 0-禁用'
  }
}, {
  tableName: 'warning_configs',
  timestamps: true
});

module.exports = WarningConfig;
