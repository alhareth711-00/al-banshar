const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategoryController');

router.get('/', expenseCategoryController.getAll);
router.post('/', expenseCategoryController.create);
router.put('/:id', expenseCategoryController.update);
router.delete('/:id', expenseCategoryController.delete);

module.exports = router;
