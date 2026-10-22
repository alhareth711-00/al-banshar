const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

router.get('/', voucherController.getAll);
router.get('/cash-drawer', voucherController.getCashDrawerSummary);
router.get('/cash-drawer/audits', voucherController.getCashDrawerAudits);
router.post('/cash-drawer/audit', voucherController.saveCashDrawerAudit);
router.post('/cash-drawer/adjust-variance', voucherController.adjustCashDrawerVariance);
router.get('/owner-drawings-summary', voucherController.getOwnerDrawingsSummary);
router.get('/cash-flow-analytics', voucherController.getCashFlowAnalytics);
router.get('/customer-debts', voucherController.getCustomerDebts);
router.get('/:id', voucherController.getById);
router.post('/receipt', voucherController.createReceipt);
router.post('/payment', voucherController.createPayment);

module.exports = router;
