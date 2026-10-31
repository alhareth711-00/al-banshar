const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

router.get('/', voucherController.getAll);
router.get('/metrics', voucherController.getSummaryMetrics);
router.get('/summary/metrics', voucherController.getSummaryMetrics);
router.get('/parties/search', voucherController.searchParties);
router.get('/cash-drawer', voucherController.getCashDrawerSummary);
router.get('/cash-drawer/audits', voucherController.getCashDrawerAudits);
router.post('/cash-drawer/audit', voucherController.saveCashDrawerAudit);
router.post('/cash-drawer/adjust-variance', voucherController.adjustCashDrawerVariance);
router.get('/owner-drawings-summary', voucherController.getOwnerDrawingsSummary);
router.get('/cash-flow-analytics', voucherController.getCashFlowAnalytics);
router.get('/customer-debts', voucherController.getCustomerDebts);
router.get('/expenses', voucherController.getExpenses);
router.get('/:id', voucherController.getById);
router.put('/:id', voucherController.update);
router.post('/:id/void', voucherController.voidVoucher);
router.post('/receipt', voucherController.createReceipt);
router.post('/payment', voucherController.createPayment);
router.post('/opening-capital', voucherController.recordOpeningCapital);

module.exports = router;
