const express = require('express');
const router = express.Router();
const {
  createIngredient,
  getIngredients,
  getAllIngredients,
  getIngredient,
  updateIngredient,
  deleteIngredient
} = require('../controllers/ingredientController');
const auth = require('../middleware/auth');

router.post('/', auth, createIngredient);
router.get('/', auth, getIngredients);
router.get('/all', auth, getAllIngredients);
router.get('/:id', auth, getIngredient);
router.put('/:id', auth, updateIngredient);
router.delete('/:id', auth, deleteIngredient);

module.exports = router;
