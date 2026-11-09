const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');

router.get('/daily-stats', workerController.getDailyStats);
router.get('/', workerController.getAll);
router.get('/:id', workerController.getById);
router.get('/:id/balance', workerController.getBalance);
router.post('/', workerController.create);
router.put('/:id', workerController.update);
router.post('/:id/toggle-attendance', workerController.toggleAttendance);

module.exports = router;
