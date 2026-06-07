const express = require('express');
const router = express.Router();
const {
  createSupplier,
  getSuppliers,
  getAllSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/supplierController');
const auth = require('../middleware/auth');

router.post('/', auth, createSupplier);
router.get('/', auth, getSuppliers);
router.get('/all', auth, getAllSuppliers);
router.get('/:id', auth, getSupplier);
router.put('/:id', auth, updateSupplier);
router.delete('/:id', auth, deleteSupplier);

module.exports = router;
