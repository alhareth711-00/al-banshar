const express = require('express');
const router = express.Router();
const purchaseReturnController = require('../controllers/purchaseReturnController');

router.get('/', purchaseReturnController.getAll);
router.get('/:id', purchaseReturnController.getById);
router.post('/', purchaseReturnController.create);

module.exports = router;
