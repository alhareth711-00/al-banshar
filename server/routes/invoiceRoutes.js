const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/', invoiceController.getAllInvoices);
router.get('/pending-services', invoiceController.getPendingServices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.patch('/:id/complete-service', invoiceController.completeService);
router.delete('/:id', invoiceController.voidInvoice);

module.exports = router;
