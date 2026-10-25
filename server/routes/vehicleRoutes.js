const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

router.get('/search', vehicleController.searchVehicles);
router.get('/retention-radar', vehicleController.getRetentionRadar);
router.get('/corporate-accounts', vehicleController.getCorporateAccounts);
router.get('/:id/last-service', vehicleController.getLastService);
router.get('/', vehicleController.searchVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.post('/:id/log-reminder', vehicleController.logReminder);
router.post('/', vehicleController.createVehicle);
router.put('/:id', vehicleController.updateVehicle);

module.exports = router;
