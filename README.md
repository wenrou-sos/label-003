# 厨房库存管理系统

## 项目简介
餐厅后厨食材库存管理系统，支持食材分类管理、入库登记、出库扣减（FIFO先进先出）、库存看板、月度盘点、出入库流水、预警配置等功能。

## 技术栈
- 前端：Vue 3 + Vite + Naive UI + Pinia + Vue Router + Axios
- 后端：Node.js + Express + Sequelize
- 数据库：MySQL 5.7+ / 8.0

## 目录结构
```
label-003/
├── backend/         # 后端项目
├── frontend/        # 前端项目
├── database/        # 数据库脚本
│   ├── schema.sql   # 建表脚本
│   └── seed.sql     # 测试数据脚本
└── README.md
```

## 环境要求
- Node.js >= 16.x
- MySQL >= 5.7
- npm 或 yarn

## 快速开始

### 1. 数据库初始化
```bash
# 登录MySQL
mysql -u root -ppassword

# 创建数据库
CREATE DATABASE kitchen_inventory DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入建表脚本
USE kitchen_inventory;
SOURCE C:/UserProject/Development/label-003/database/schema.sql;

# 导入测试数据
SOURCE C:/UserProject/Development/label-003/database/seed.sql;
```

### 2. 启动后端服务
```bash
cd backend
npm install
npm start
```
后端服务运行在 http://localhost:3000

### 3. 启动前端服务
```bash
cd frontend
npm install
npm run dev
```
前端运行在 http://localhost:5173

## 默认账号
| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 管理员 |
| operator | 123456 | 操作员 |

## 功能模块
- 食材分类管理：多级树形分类、增删改
- 食材管理：食材信息维护
- 入库登记：单条/批量入库、批次管理
- 出库领料：FIFO先进先出扣减、并发控制、库存校验
- 库存看板：实时库存、低库存预警高亮、筛选、搜索、排序
- 盘点管理：创建盘点单、实盘录入、差异计算、盘点确认
- 出入库流水：多条件筛选、分页、Excel导出
- 预警配置：安全库存线、保质期提前预警、批量设置
- 供应商管理：供应商信息维护

## API接口规范
所有接口返回统一格式：
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```
- code: 0 成功，非0失败
- data: 返回数据，分页格式：{ list, total, page, pageSize, totalPages }

## 使用说明
详细使用说明请参考文档中的各功能模块介绍。
