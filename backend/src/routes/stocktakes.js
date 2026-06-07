const express = require('express');
const router = express.Router();
const {
  createStocktake,
  getStocktakes,
  getStocktake,
  updateStocktakeItem,
  updateSingleStocktakeItem,
  batchUpdateStocktakeItems,
  confirmStocktake,
  cancelStocktake,
  deleteStocktake
} = require('../controllers/stocktakeController');
const auth = require('../middleware/auth');

router.post('/', auth, createStocktake);
router.get('/', auth, getStocktakes);
router.get('/:id', auth, getStocktake);
router.put('/:id/items', auth, updateStocktakeItem);
router.put('/:id/items/batch', auth, batchUpdateStocktakeItems);
router.put('/:id/items/:itemId', auth, updateSingleStocktakeItem);
router.post('/:id/confirm', auth, confirmStocktake);
router.post('/:id/cancel', auth, cancelStocktake);
router.delete('/:id', auth, deleteStocktake);

module.exports = router;
