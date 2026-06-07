const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WarningLog = sequelize.define('WarningLog', {
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
    allowNull: false,
    comment: '食材ID'
  },
  batchId: {
    type: DataTypes.INTEGER,
    comment: '批次ID（过期预警使用）'
  },
  currentValue: {
    type: DataTypes.DECIMAL(10, 2),
    comment: '当前值'
  },
  thresholdValue: {
    type: DataTypes.DECIMAL(10, 2),
    comment: '阈值'
  },
  message: {
    type: DataTypes.STRING(255),
    comment: '预警消息'
  },
  status: {
    type: DataTypes.ENUM('pending', 'handled', 'ignored'),
    defaultValue: 'pending',
    comment: '状态 pending-待处理 handled-已处理 ignored-已忽略'
  },
  handledBy: {
    type: DataTypes.INTEGER,
    comment: '处理人ID'
  },
  handledAt: {
    type: DataTypes.DATE,
    comment: '处理时间'
  }
}, {
  tableName: 'warning_logs',
  timestamps: true
});

module.exports = WarningLog;
