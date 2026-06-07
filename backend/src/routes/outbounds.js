const express = require('express');
const router = express.Router();
const {
  createOutbound,
  getOutbounds,
  getOutbound,
  cancelOutbound,
  batchCreateOutbound
} = require('../controllers/outboundController');
const auth = require('../middleware/auth');

router.post('/', auth, createOutbound);
router.post('/batch', auth, batchCreateOutbound);
router.get('/', auth, getOutbounds);
router.get('/:id', auth, getOutbound);
router.put('/:id/cancel', auth, cancelOutbound);

module.exports = router;
