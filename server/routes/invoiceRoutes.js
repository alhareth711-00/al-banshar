const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/', invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.delete('/:id', invoiceController.voidInvoice);

module.exports = router;
