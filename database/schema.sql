-- =============================================
-- 食材库存管理系统 - 数据库建表脚本
-- 数据库类型: MySQL 5.7+ / 8.0+
-- 字符集: utf8mb4
-- =============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------
-- 用户表
-- ---------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username`    VARCHAR(50)     NOT NULL                COMMENT '用户名',
  `password`    VARCHAR(255)    NOT NULL                COMMENT '密码(加密存储)',
  `real_name`   VARCHAR(50)     DEFAULT NULL            COMMENT '真实姓名',
  `role`        VARCHAR(20)     NOT NULL DEFAULT 'operator' COMMENT '角色: admin-管理员, operator-操作员',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ---------------------------------------------
-- 供应商表
-- ---------------------------------------------
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`        VARCHAR(100)    NOT NULL                COMMENT '供应商名称',
  `contact`     VARCHAR(50)     DEFAULT NULL            COMMENT '联系人',
  `phone`       VARCHAR(30)     DEFAULT NULL            COMMENT '联系电话',
  `address`     VARCHAR(255)    DEFAULT NULL            COMMENT '地址',
  `remark`      VARCHAR(500)    DEFAULT NULL            COMMENT '备注',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商表';

-- ---------------------------------------------
-- 食材分类表 (支持多级分类)
-- ---------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`        VARCHAR(50)     NOT NULL                COMMENT '分类名称',
  `parent_id`   BIGINT UNSIGNED DEFAULT 0               COMMENT '父分类ID, 0表示顶级分类',
  `sort_order`  INT             NOT NULL DEFAULT 0      COMMENT '排序值, 数值越小越靠前',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食材分类表';

-- ---------------------------------------------
-- 食材信息表
-- ---------------------------------------------
DROP TABLE IF EXISTS `ingredients`;
CREATE TABLE `ingredients` (
  `id`                        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`                      VARCHAR(100)    NOT NULL                COMMENT '食材名称',
  `category_id`               BIGINT UNSIGNED NOT NULL                COMMENT '分类ID',
  `unit`                      VARCHAR(20)     NOT NULL                COMMENT '计量单位(如: kg, g, 箱, 袋)',
  `safety_stock`              DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '安全库存数量',
  `shelf_life_warning_days`   INT             NOT NULL DEFAULT 0      COMMENT '保质期预警天数',
  `created_at`                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_name` (`name`),
  CONSTRAINT `fk_ingredients_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食材信息表';

-- ---------------------------------------------
-- 库存批次表 (用于FIFO先进先出管理)
-- ---------------------------------------------
DROP TABLE IF EXISTS `inventory_batches`;
CREATE TABLE `inventory_batches` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ingredient_id`   BIGINT UNSIGNED NOT NULL                COMMENT '食材ID',
  `batch_no`        VARCHAR(50)     NOT NULL                COMMENT '批次号',
  `quantity`        DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '当前批次剩余数量',
  `unit_price`      DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '单价',
  `expire_date`     DATE            DEFAULT NULL            COMMENT '过期日期',
  `inbound_date`    DATE            NOT NULL                COMMENT '入库日期',
  `supplier_id`     BIGINT UNSIGNED DEFAULT NULL            COMMENT '供应商ID',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_batch_no` (`batch_no`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  KEY `idx_expire_date` (`expire_date`),
  KEY `idx_inbound_date` (`inbound_date`),
  KEY `idx_fifo` (`ingredient_id`, `inbound_date`, `expire_date`),
  CONSTRAINT `fk_batches_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_batches_supplier`   FOREIGN KEY (`supplier_id`)   REFERENCES `suppliers` (`id`)    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存批次表';

-- ---------------------------------------------
-- 入库记录表
-- ---------------------------------------------
DROP TABLE IF EXISTS `inbounds`;
CREATE TABLE `inbounds` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ingredient_id`   BIGINT UNSIGNED NOT NULL                COMMENT '食材ID',
  `batch_id`        BIGINT UNSIGNED DEFAULT NULL            COMMENT '批次ID',
  `quantity`        DECIMAL(10,2)   NOT NULL                COMMENT '入库数量',
  `unit`            VARCHAR(20)     NOT NULL                COMMENT '计量单位',
  `unit_price`      DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '单价',
  `total_price`     DECIMAL(12,2)   NOT NULL DEFAULT 0      COMMENT '总金额',
  `supplier_id`     BIGINT UNSIGNED DEFAULT NULL            COMMENT '供应商ID',
  `expire_date`     DATE            DEFAULT NULL            COMMENT '过期日期',
  `inbound_date`    DATE            NOT NULL                COMMENT '入库日期',
  `operator`        VARCHAR(50)     DEFAULT NULL            COMMENT '操作人',
  `remark`          VARCHAR(500)    DEFAULT NULL            COMMENT '备注',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_inbound_date` (`inbound_date`),
  KEY `idx_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_inbounds_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inbounds_batch`      FOREIGN KEY (`batch_id`)      REFERENCES `inventory_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_inbounds_supplier`   FOREIGN KEY (`supplier_id`)   REFERENCES `suppliers` (`id`)       ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入库记录表';

-- ---------------------------------------------
-- 出库记录表
-- ---------------------------------------------
DROP TABLE IF EXISTS `outbounds`;
CREATE TABLE `outbounds` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ingredient_id`   BIGINT UNSIGNED NOT NULL                COMMENT '食材ID',
  `quantity`        DECIMAL(10,2)   NOT NULL                COMMENT '出库总数量',
  `unit`            VARCHAR(20)     NOT NULL                COMMENT '计量单位',
  `total_price`     DECIMAL(12,2)   NOT NULL DEFAULT 0      COMMENT '总金额',
  `purpose`         VARCHAR(100)    DEFAULT NULL            COMMENT '出库用途',
  `operator`        VARCHAR(50)     DEFAULT NULL            COMMENT '操作人',
  `remark`          VARCHAR(500)    DEFAULT NULL            COMMENT '备注',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_outbounds_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库记录表';

-- ---------------------------------------------
-- 出库明细-批次扣减表 (FIFO先进先出批次扣减记录)
-- ---------------------------------------------
DROP TABLE IF EXISTS `outbound_items`;
CREATE TABLE `outbound_items` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `outbound_id`     BIGINT UNSIGNED NOT NULL                COMMENT '出库单ID',
  `batch_id`        BIGINT UNSIGNED NOT NULL                COMMENT '批次ID',
  `quantity`        DECIMAL(10,2)   NOT NULL                COMMENT '从该批次扣减的数量',
  `unit_price`      DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '该批次单价(出库时快照)',
  PRIMARY KEY (`id`),
  KEY `idx_outbound_id` (`outbound_id`),
  KEY `idx_batch_id` (`batch_id`),
  CONSTRAINT `fk_outbound_items_outbound` FOREIGN KEY (`outbound_id`) REFERENCES `outbounds`         (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `fk_outbound_items_batch`    FOREIGN KEY (`batch_id`)    REFERENCES `inventory_batches` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库明细-批次扣减表';

-- ---------------------------------------------
-- 盘点记录表
-- ---------------------------------------------
DROP TABLE IF EXISTS `stocktakes`;
CREATE TABLE `stocktakes` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stocktake_no`    VARCHAR(50)     NOT NULL                COMMENT '盘点单号',
  `stocktake_date`  DATE            NOT NULL                COMMENT '盘点日期',
  `operator`        VARCHAR(50)     DEFAULT NULL            COMMENT '操作人',
  `status`          VARCHAR(20)     NOT NULL DEFAULT 'draft' COMMENT '状态: draft-草稿, completed-已完成',
  `remark`          VARCHAR(500)    DEFAULT NULL            COMMENT '备注',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stocktake_no` (`stocktake_no`),
  KEY `idx_stocktake_date` (`stocktake_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='盘点记录表';

-- ---------------------------------------------
-- 盘点明细表
-- ---------------------------------------------
DROP TABLE IF EXISTS `stocktake_items`;
CREATE TABLE `stocktake_items` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stocktake_id`      BIGINT UNSIGNED NOT NULL                COMMENT '盘点单ID',
  `ingredient_id`     BIGINT UNSIGNED NOT NULL                COMMENT '食材ID',
  `system_quantity`   DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '系统账面数量',
  `actual_quantity`   DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '实际盘点数量',
  `difference`        DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '差异数量(实际-账面)',
  `remark`            VARCHAR(500)    DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_stocktake_id` (`stocktake_id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  CONSTRAINT `fk_stocktake_items_stocktake`  FOREIGN KEY (`stocktake_id`)  REFERENCES `stocktakes`   (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_stocktake_items_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='盘点明细表';

-- ---------------------------------------------
-- 预警配置表
-- ---------------------------------------------
DROP TABLE IF EXISTS `warning_configs`;
CREATE TABLE `warning_configs` (
  `id`                        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ingredient_id`             BIGINT UNSIGNED NOT NULL                COMMENT '食材ID',
  `safety_stock`              DECIMAL(10,2)   NOT NULL DEFAULT 0      COMMENT '安全库存阈值',
  `shelf_life_warning_days`   INT             NOT NULL DEFAULT 0      COMMENT '保质期预警天数',
  `operator`                  VARCHAR(50)     DEFAULT NULL            COMMENT '操作人',
  `created_at`                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ingredient_id` (`ingredient_id`),
  CONSTRAINT `fk_warning_configs_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预警配置表';

-- ---------------------------------------------
-- 预警日志表
-- ---------------------------------------------
DROP TABLE IF EXISTS `warning_logs`;
CREATE TABLE `warning_logs` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ingredient_id`     BIGINT UNSIGNED NOT NULL                COMMENT '食材ID',
  `warning_type`      VARCHAR(20)     NOT NULL                COMMENT '预警类型: stock-库存预警, shelf_life-保质期预警',
  `warning_content`   VARCHAR(500)    NOT NULL                COMMENT '预警内容',
  `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  KEY `idx_warning_type` (`warning_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_warning_logs_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预警日志表';

SET FOREIGN_KEY_CHECKS = 1;
