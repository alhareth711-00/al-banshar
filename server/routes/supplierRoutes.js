const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

router.get('/', supplierController.getAll);
router.get('/vouchers', supplierController.getVouchers);
router.get('/vouchers/:id', supplierController.getVoucherById);
router.get('/:id', supplierController.getById);
router.post('/', supplierController.create);
router.put('/:id', supplierController.update);
router.post('/:id/pay', supplierController.payDebt);

module.exports = router;
