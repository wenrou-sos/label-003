const express = require('express');
const router = express.Router();
const {
  getWarningConfigs,
  createWarningConfig,
  updateWarningConfig,
  deleteWarningConfig,
  getWarningLogs,
  handleWarningLog,
  batchHandleWarningLogs,
  checkExpireWarnings,
  batchUpdateWarningConfigs,
  getPendingStockWarnings
} = require('../controllers/warningController');
const auth = require('../middleware/auth');

router.get('/configs', auth, getWarningConfigs);
router.post('/configs', auth, createWarningConfig);
router.put('/configs/:id', auth, updateWarningConfig);
router.delete('/configs/:id', auth, deleteWarningConfig);
router.put('/configs/batch/update', auth, batchUpdateWarningConfigs);

router.get('/logs', auth, getWarningLogs);
router.get('/pending-stock', auth, getPendingStockWarnings);
router.put('/logs/:id', auth, handleWarningLog);
router.put('/logs/batch/handle', auth, batchHandleWarningLogs);
router.post('/check-expire', auth, checkExpireWarnings);

module.exports = router;
