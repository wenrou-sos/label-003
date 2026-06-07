const express = require('express');
const router = express.Router();
const {
  createInbound,
  getInbounds,
  getInbound,
  cancelInbound,
  batchCreateInbound
} = require('../controllers/inboundController');
const auth = require('../middleware/auth');

router.post('/', auth, createInbound);
router.post('/batch', auth, batchCreateInbound);
router.get('/', auth, getInbounds);
router.get('/:id', auth, getInbound);
router.put('/:id/cancel', auth, cancelInbound);

module.exports = router;
