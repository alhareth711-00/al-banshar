const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');

router.get('/current', shiftController.getCurrentShift);
router.post('/open', shiftController.openShift);
router.post('/close', shiftController.closeShift);
router.get('/history', shiftController.getShiftHistory);
router.get('/:id/slip', shiftController.getShiftSlip);

module.exports = router;
