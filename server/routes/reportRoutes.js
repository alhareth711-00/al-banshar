const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/daily-closing', reportController.getDailyClosing);

module.exports = router;
