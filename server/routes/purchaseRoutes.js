const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

router.get('/', purchaseController.getAll);
router.get('/overdue-payables', purchaseController.getOverduePayables);
router.get('/due-calendar', purchaseController.getDueCalendar);
router.get('/:id', purchaseController.getById);
router.post('/', purchaseController.create);

module.exports = router;
