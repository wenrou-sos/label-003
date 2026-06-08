-- =============================================
-- 食材库存管理系统 - 数据库建表脚本
-- 数据库类型: MySQL 5.7+ / 8.0+
-- 字符集: utf8mb4
-- 对应 Sequelize 模型定义
-- =============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------
-- 用户表
-- ---------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id`          INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username`    VARCHAR(50)     NOT NULL                COMMENT '用户名',
  `password`    VARCHAR(255)    NOT NULL                COMMENT '密码(加密存储)',
  `realName`    VARCHAR(50)     DEFAULT NULL            COMMENT '真实姓名',
  `role`        ENUM('admin','manager','staff') NOT NULL DEFAULT 'staff' COMMENT '角色: admin-管理员, manager-经理, staff-员工',
  `status`      TINYINT         NOT NULL DEFAULT 1      COMMENT '状态 1-启用 0-禁用',
  `createdAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ---------------------------------------------
-- 供应商表
-- ---------------------------------------------
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id`          INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`        VARCHAR(100)    NOT NULL                COMMENT '供应商名称',
  `contact`     VARCHAR(50)     DEFAULT NULL            COMMENT '联系人',
  `phone`       VARCHAR(20)     DEFAULT NULL            COMMENT '联系电话',
  `address`     VARCHAR(255)    DEFAULT NULL            COMMENT '地址',
  `remark`      VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `status`      TINYINT         NOT NULL DEFAULT 1      COMMENT '状态 1-启用 0-禁用',
  `createdAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商表';

-- ---------------------------------------------
-- 食材分类表
-- ---------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id`          INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`        VARCHAR(50)     NOT NULL                COMMENT '分类名称',
  `parentId`    INT             DEFAULT NULL            COMMENT '父分类ID, NULL表示顶级分类',
  `sort`        INT             NOT NULL DEFAULT 0      COMMENT '排序值, 数值越小越靠前',
  `remark`      VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `createdAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name_parent` (`name`, `parentId`),
  KEY `idx_parentId` (`parentId`),
  KEY `idx_sort` (`sort`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parentId`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食材分类表';

-- ---------------------------------------------
-- 食材信息表
-- ---------------------------------------------
DROP TABLE IF EXISTS `ingredients`;
CREATE TABLE `ingredients` (
  `id`              INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`            VARCHAR(100)    NOT NULL                COMMENT '食材名称',
  `categoryId`      INT             NOT NULL                COMMENT '分类ID',
  `unit`            VARCHAR(20)     NOT NULL                COMMENT '计量单位(如: kg, g, 箱, 袋)',
  `spec`            VARCHAR(50)     DEFAULT NULL            COMMENT '规格',
  `warningStock`    DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '预警库存数量',
  `shelfLifeDays`   INT             DEFAULT NULL            COMMENT '保质期天数',
  `remark`          VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `status`          TINYINT         NOT NULL DEFAULT 1      COMMENT '状态 1-启用 0-禁用',
  `createdAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_categoryId` (`categoryId`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ingredients_category` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食材信息表';

-- ---------------------------------------------
-- 库存批次表 (用于FIFO先进先出管理)
-- ---------------------------------------------
DROP TABLE IF EXISTS `inventory_batches`;
CREATE TABLE `inventory_batches` (
  `id`                INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `batchNo`           VARCHAR(50)     NOT NULL                COMMENT '批次号',
  `ingredientId`      INT             NOT NULL                COMMENT '食材ID',
  `supplierId`        INT             DEFAULT NULL            COMMENT '供应商ID',
  `inboundDate`       DATETIME        NOT NULL                COMMENT '入库日期',
  `expireDate`        DATETIME        DEFAULT NULL            COMMENT '过期日期',
  `quantity`          DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '当前批次剩余数量',
  `originalQuantity`  DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '原始入库数量',
  `unitPrice`         DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '单价',
  `remark`            VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `status`            TINYINT         NOT NULL DEFAULT 1      COMMENT '状态 1-正常 0-已清空',
  `createdAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_batchNo` (`batchNo`),
  KEY `idx_ingredientId` (`ingredientId`),
  KEY `idx_supplierId` (`supplierId`),
  KEY `idx_expireDate` (`expireDate`),
  KEY `idx_status` (`status`),
  KEY `idx_ingredient_inbound` (`ingredientId`, `inboundDate`),
  KEY `idx_ingredient_expire` (`ingredientId`, `expireDate`),
  CONSTRAINT `fk_batches_ingredient` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_batches_supplier`   FOREIGN KEY (`supplierId`)   REFERENCES `suppliers`   (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存批次表';

-- ---------------------------------------------
-- 入库记录表
-- ---------------------------------------------
DROP TABLE IF EXISTS `inbounds`;
CREATE TABLE `inbounds` (
  `id`              INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `inboundNo`       VARCHAR(50)     NOT NULL                COMMENT '入库单号',
  `supplierId`      INT             DEFAULT NULL            COMMENT '供应商ID',
  `inboundDate`     DATETIME        NOT NULL                COMMENT '入库日期',
  `totalAmount`     DECIMAL(12,2)   NOT NULL DEFAULT 0      COMMENT '总金额',
  `operatorId`      INT             DEFAULT NULL            COMMENT '操作人ID',
  `remark`          VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `createdAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inboundNo` (`inboundNo`),
  KEY `idx_supplierId` (`supplierId`),
  KEY `idx_inboundDate` (`inboundDate`),
  KEY `idx_operatorId` (`operatorId`),
  CONSTRAINT `fk_inbounds_supplier` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inbounds_operator` FOREIGN KEY (`operatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库记录表';

-- ---------------------------------------------
-- 出库记录表
-- ---------------------------------------------
DROP TABLE IF EXISTS `outbounds`;
CREATE TABLE `outbounds` (
  `id`              INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `outboundNo`      VARCHAR(50)     NOT NULL                COMMENT '出库单号',
  `outboundDate`    DATETIME        NOT NULL                COMMENT '出库日期',
  `outboundType`    ENUM('normal','waste','adjust') NOT NULL DEFAULT 'normal' COMMENT '出库类型 normal-正常出库 waste-报损 adjust-调整',
  `totalAmount`     DECIMAL(12,2)   NOT NULL DEFAULT 0      COMMENT '总金额',
  `operatorId`      INT             DEFAULT NULL            COMMENT '操作人ID',
  `remark`          VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `createdAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outboundNo` (`outboundNo`),
  KEY `idx_outboundDate` (`outboundDate`),
  KEY `idx_outboundType` (`outboundType`),
  KEY `idx_operatorId` (`operatorId`),
  CONSTRAINT `fk_outbounds_operator` FOREIGN KEY (`operatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库记录表';

-- ---------------------------------------------
-- 出库明细表
-- ---------------------------------------------
DROP TABLE IF EXISTS `outbound_items`;
CREATE TABLE `outbound_items` (
  `id`            INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `outboundId`    INT             NOT NULL                COMMENT '出库单ID',
  `ingredientId`  INT             NOT NULL                COMMENT '食材ID',
  `quantity`      DECIMAL(10,2)   NOT NULL                COMMENT '出库数量',
  `unitPrice`     DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '单价',
  `amount`        DECIMAL(12,2)   NOT NULL DEFAULT 0      COMMENT '金额',
  `batchDetails`  TEXT            DEFAULT NULL            COMMENT '批次扣减详情 JSON',
  `createdAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_outboundId` (`outboundId`),
  KEY `idx_ingredientId` (`ingredientId`),
  CONSTRAINT `fk_outbound_items_outbound` FOREIGN KEY (`outboundId`)   REFERENCES `outbounds`    (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `fk_outbound_items_ingredient` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库明细表';

-- ---------------------------------------------
-- 盘点记录表
-- ---------------------------------------------
DROP TABLE IF EXISTS `stocktakes`;
CREATE TABLE `stocktakes` (
  `id`              INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stocktakeNo`     VARCHAR(50)     NOT NULL                COMMENT '盘点单号',
  `stocktakeDate`   DATETIME        NOT NULL                COMMENT '盘点日期',
  `status`          ENUM('draft','confirmed','cancelled') NOT NULL DEFAULT 'draft' COMMENT '状态 draft-草稿 confirmed-已确认 cancelled-已取消',
  `operatorId`      INT             DEFAULT NULL            COMMENT '操作人ID',
  `remark`          VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `createdAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stocktakeNo` (`stocktakeNo`),
  KEY `idx_stocktakeDate` (`stocktakeDate`),
  KEY `idx_status` (`status`),
  KEY `idx_operatorId` (`operatorId`),
  CONSTRAINT `fk_stocktakes_operator` FOREIGN KEY (`operatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='盘点记录表';

-- ---------------------------------------------
-- 盘点明细表
-- ---------------------------------------------
DROP TABLE IF EXISTS `stocktake_items`;
CREATE TABLE `stocktake_items` (
  `id`                INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stocktakeId`       INT             NOT NULL                COMMENT '盘点单ID',
  `ingredientId`      INT             NOT NULL                COMMENT '食材ID',
  `systemQuantity`    DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '系统账面数量',
  `actualQuantity`    DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '实际盘点数量',
  `diffQuantity`      DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '差异数量(实际-账面)',
  `remark`            VARCHAR(255)    DEFAULT NULL            COMMENT '备注',
  `createdAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_stocktakeId` (`stocktakeId`),
  KEY `idx_ingredientId` (`ingredientId`),
  CONSTRAINT `fk_stocktake_items_stocktake`  FOREIGN KEY (`stocktakeId`)  REFERENCES `stocktakes`   (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_stocktake_items_ingredient` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='盘点明细表';

-- ---------------------------------------------
-- 预警配置表
-- ---------------------------------------------
DROP TABLE IF EXISTS `warning_configs`;
CREATE TABLE `warning_configs` (
  `id`                INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `warningType`       ENUM('stock','expire') NOT NULL          COMMENT '预警类型 stock-库存预警 expire-过期预警',
  `ingredientId`      INT             DEFAULT NULL            COMMENT '食材ID，为空则为全局配置',
  `thresholdValue`    DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '阈值（库存预警为数量，过期预警为天数）',
  `enabled`           TINYINT         NOT NULL DEFAULT 1      COMMENT '是否启用 1-启用 0-禁用',
  `createdAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_warningType` (`warningType`),
  KEY `idx_ingredientId` (`ingredientId`),
  CONSTRAINT `fk_warning_configs_ingredient` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预警配置表';

-- ---------------------------------------------
-- 预警日志表
-- ---------------------------------------------
DROP TABLE IF EXISTS `warning_logs`;
CREATE TABLE `warning_logs` (
  `id`                INT             NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `warningType`       ENUM('stock','expire') NOT NULL          COMMENT '预警类型 stock-库存预警 expire-过期预警',
  `ingredientId`      INT             NOT NULL                COMMENT '食材ID',
  `batchId`           INT             DEFAULT NULL            COMMENT '批次ID（过期预警使用）',
  `currentValue`      DECIMAL(10,2)   DEFAULT NULL            COMMENT '当前值',
  `thresholdValue`    DECIMAL(10,2)   DEFAULT NULL            COMMENT '阈值',
  `message`           VARCHAR(255)    DEFAULT NULL            COMMENT '预警消息',
  `status`            ENUM('pending','handled','ignored') NOT NULL DEFAULT 'pending' COMMENT '状态 pending-待处理 handled-已处理 ignored-已忽略',
  `handledBy`         INT             DEFAULT NULL            COMMENT '处理人ID',
  `handledAt`         DATETIME        DEFAULT NULL            COMMENT '处理时间',
  `createdAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_warningType` (`warningType`),
  KEY `idx_ingredientId` (`ingredientId`),
  KEY `idx_batchId` (`batchId`),
  KEY `idx_status` (`status`),
  KEY `idx_createdAt` (`createdAt`),
  CONSTRAINT `fk_warning_logs_ingredient` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`       (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_warning_logs_batch`      FOREIGN KEY (`batchId`)      REFERENCES `inventory_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_warning_logs_handledBy`  FOREIGN KEY (`handledBy`)    REFERENCES `users`               (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预警日志表';

SET FOREIGN_KEY_CHECKS = 1;
