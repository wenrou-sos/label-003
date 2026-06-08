const sequelize = require('../config/database');

const User = require('./User');
const Category = require('./Category');
const Ingredient = require('./Ingredient');
const InventoryBatch = require('./InventoryBatch');
const Inbound = require('./Inbound');
const Outbound = require('./Outbound');
const OutboundItem = require('./OutboundItem');
const Stocktake = require('./Stocktake');
const StocktakeItem = require('./StocktakeItem');
const Supplier = require('./Supplier');
const WarningLog = require('./WarningLog');
const WarningConfig = require('./WarningConfig');

Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });

Category.hasMany(Ingredient, { foreignKey: 'categoryId', as: 'ingredients' });
Ingredient.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Ingredient.hasMany(InventoryBatch, { foreignKey: 'ingredientId', as: 'batches' });
InventoryBatch.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

Supplier.hasMany(InventoryBatch, { foreignKey: 'supplierId', as: 'batches' });
InventoryBatch.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

Supplier.hasMany(Inbound, { foreignKey: 'supplierId', as: 'inbounds' });
Inbound.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

User.hasMany(Inbound, { foreignKey: 'operatorId', as: 'inbounds' });
Inbound.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

Outbound.hasMany(OutboundItem, { foreignKey: 'outboundId', as: 'items' });
OutboundItem.belongsTo(Outbound, { foreignKey: 'outboundId', as: 'outbound' });

OutboundItem.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

User.hasMany(Outbound, { foreignKey: 'operatorId', as: 'outbounds' });
Outbound.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

Stocktake.hasMany(StocktakeItem, { foreignKey: 'stocktakeId', as: 'items' });
StocktakeItem.belongsTo(Stocktake, { foreignKey: 'stocktakeId', as: 'stocktake' });

StocktakeItem.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

User.hasMany(Stocktake, { foreignKey: 'operatorId', as: 'stocktakes' });
Stocktake.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

WarningLog.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });
WarningLog.belongsTo(InventoryBatch, { foreignKey: 'batchId', as: 'batch' });
WarningLog.belongsTo(User, { foreignKey: 'handledBy', as: 'handler' });

WarningConfig.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

module.exports = {
  sequelize,
  User,
  Category,
  Ingredient,
  InventoryBatch,
  Inbound,
  Outbound,
  OutboundItem,
  Stocktake,
  StocktakeItem,
  Supplier,
  WarningLog,
  WarningConfig
};
