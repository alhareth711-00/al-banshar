const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Specialized Inventory Endpoints (must precede /:id)
router.get('/import-template', inventoryController.getImportTemplate);
router.post('/import-preview', inventoryController.previewImport);
router.post('/import-commit', inventoryController.commitImport);
router.get('/valuation', inventoryController.getValuationSummary);
router.get('/turnover-analytics', inventoryController.getTurnoverAnalytics);
router.get('/reorder-suggestions', inventoryController.getReorderSuggestions);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/consignment-settlements', inventoryController.getConsignmentSettlementSummary);
router.get('/barcode/:barcode', inventoryController.getByBarcode);
router.post('/convert-packaging', inventoryController.convertPackaging);

// Item Specific Endpoints
router.post('/:id/adjust', inventoryController.adjustStock);
router.post('/:id/consignment-inbound', inventoryController.receiveConsignmentStock);
router.put('/:id/toggle-active', inventoryController.toggleActive);
router.get('/', inventoryController.getAll);
router.get('/:id', inventoryController.getById);
router.post('/', inventoryController.create);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.deleteOrArchive);

module.exports = router;
