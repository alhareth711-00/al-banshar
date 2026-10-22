const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/init');
const { seedDatabase } = require('./db/seed');
const { errorHandler } = require('./utils/errorHandler');

// Import routes
const vehicleRoutes = require('./routes/vehicleRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const workerRoutes = require('./routes/workerRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const purchaseReturnRoutes = require('./routes/purchaseReturnRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const expenseCategoryRoutes = require('./routes/expenseCategoryRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const vehicleController = require('./controllers/vehicleController');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Quick Lube & Tire Touch POS - Yemen',
    timestamp: new Date().toISOString(),
    version: '1.0.0-phase1',
  });
});

// Direct alias for Customer Retention Radar
app.get('/api/retention-radar', vehicleController.getRetentionRadar);

// Database Backup Endpoint (Download SQLite snapshot)
app.get('/api/backup', (req, res) => {
  try {
    const db = require('./db/database');
    db.pragma('wal_checkpoint(PASSIVE)');
    const dbFile = path.join(__dirname, 'db', 'quick_lube.db');
    const dateStr = new Date().toISOString().slice(0, 10);
    res.download(dbFile, `quick_lube_backup_${dateStr}.sqlite`);
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل تصدير النسخة الاحتياطية', error: err.message });
  }
});

// Database Integrity & Self-Maintenance Check
const backupEngine = require('./utils/backupEngine');
app.get('/api/backup/integrity', (req, res) => {
  const result = backupEngine.checkDatabaseIntegrity();
  res.json({ success: true, data: result });
});

// Manual Instant Snapshot Trigger
app.post('/api/backup/create-now', (req, res) => {
  const result = backupEngine.createManualBackup();
  res.json({ success: true, message: 'تم أخذ لقطة احتياطية فورية وحفظها بنجاح', data: result });
});

// List local automated backups
app.get('/api/backup/list', (req, res) => {
  const list = backupEngine.listBackups();
  res.json({ success: true, data: list });
});

// API Routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/purchase-returns', purchaseReturnRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/shifts', shiftRoutes);

// Global Error Handler
app.use(errorHandler);

// Initialize DB and Seed data before listening
try {
  initDb();
  seedDatabase();
  backupEngine.performDailyAutoBackup();
  app.listen(PORT, () => {
    console.log(`🚀 Quick Lube POS Backend running on http://localhost:${PORT}`);
    console.log(`📡 Ready for Phase 1 endpoints testing`);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}

module.exports = app;
