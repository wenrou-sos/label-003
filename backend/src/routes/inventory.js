const express = require('express');
const router = express.Router();
const {
  getInventoryList,
  getInventoryBatches,
  getInventorySummary,
  getIngredientInventory
} = require('../controllers/inventoryController');
const auth = require('../middleware/auth');

router.get('/', auth, getInventoryList);
router.get('/batches', auth, getInventoryBatches);
router.get('/summary', auth, getInventorySummary);
router.get('/ingredient/:id', auth, getIngredientInventory);

module.exports = router;
