const express = require('express');
const router = express.Router();
const {
  createCategory,
  getCategories,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
} = require('../controllers/categoryController');
const auth = require('../middleware/auth');

router.post('/', auth, createCategory);
router.get('/', auth, getCategories);
router.get('/all', auth, getAllCategories);
router.get('/tree', auth, getCategoryTree);
router.get('/:id', auth, getCategory);
router.put('/:id', auth, updateCategory);
router.delete('/:id', auth, deleteCategory);

module.exports = router;
