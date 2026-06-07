const express = require('express');
const router = express.Router();
const {
  getInboundRecords,
  getOutboundRecords,
  getAllRecords,
  getFlowRecords,
  exportInboundExcel,
  exportOutboundExcel,
  exportAllExcel,
  exportExcel,
  getStatistics,
  getSummary
} = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.get('/inbounds', auth, getInboundRecords);
router.get('/outbounds', auth, getOutboundRecords);
router.get('/all', auth, getAllRecords);
router.get('/flow', auth, getFlowRecords);
router.get('/statistics', auth, getStatistics);
router.get('/summary', auth, getSummary);

router.get('/export/inbounds', auth, exportInboundExcel);
router.get('/export/outbounds', auth, exportOutboundExcel);
router.get('/export/all', auth, exportAllExcel);
router.get('/export', auth, exportExcel);

module.exports = router;
