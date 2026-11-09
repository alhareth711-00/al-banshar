const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
const systemRoutes = require('./routes/systemRoutes');
const vehicleController = require('./controllers/vehicleController');
const voucherController = require('./controllers/voucherController');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing (supporting up to 50MB for SQLite backup uploads)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Backup Sentinel: Check if backup is stale (> 7 days)
app.get('/api/backup/status', (req, res) => {
  const status = backupEngine.getBackupStatus();
  res.json({ success: true, data: status });
});

// Validate Backup File before restoration
app.post('/api/backup/validate', (req, res) => {
  try {
    const fs = require('fs');
    const { fileBase64, localFileName } = req.body;

    let targetPath = null;
    let isTemp = false;

    if (localFileName) {
      targetPath = path.join(backupEngine.getBackupsDir(), path.basename(localFileName));
    } else if (fileBase64) {
      const buffer = Buffer.from(fileBase64, 'base64');
      targetPath = path.join(backupEngine.getBackupsDir(), `temp_val_${Date.now()}.sqlite`);
      fs.writeFileSync(targetPath, buffer);
      isTemp = true;
    } else {
      return res.status(400).json({ success: false, message: 'يجب تقديم ملف النسخة الاحتياطية أو اسمه' });
    }

    const validation = backupEngine.validateBackupFile(targetPath);

    if (isTemp && fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch (e) {}
    }

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    res.json({ success: true, data: validation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشل فحص النسخة الاحتياطية', error: err.message });
  }
});

// Restore Database from Uploaded Backup File (Hot-Swap)
app.post('/api/backup/restore-upload', (req, res) => {
  const fs = require('fs');
  let tempPath = null;
  try {
    const { fileBase64, fileName, confirmation_word } = req.body;

    if (!confirmation_word || confirmation_word.trim() !== 'استعادة') {
      return res.status(400).json({ success: false, message: 'يرجى كتابة كلمة "استعادة" لتأكيد عملية استرجاع البيانات' });
    }

    if (!fileBase64) {
      return res.status(400).json({ success: false, message: 'لم يتم استلام ملف النسخة الاحتياطية' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    tempPath = path.join(backupEngine.getBackupsDir(), `temp_restore_${Date.now()}.sqlite`);
    fs.writeFileSync(tempPath, buffer);

    const result = backupEngine.restoreFromBackup(tempPath, { createSafetySnapshot: true });

    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }

    res.json({
      success: true,
      message: 'تمت استعادة وتنشيط قاعدة البيانات بنجاح تام، وأخذ لقطة أمان احتياطية تلقائياً 🛡️',
      data: result,
    });
  } catch (err) {
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
    res.status(500).json({ success: false, message: 'فشلت استعادة النسخة الاحتياطية', error: err.message });
  }
});

// Restore Database from Existing Local Backup Snapshot
app.post('/api/backup/restore-local', (req, res) => {
  try {
    const { fileName, confirmation_word } = req.body;

    if (!confirmation_word || confirmation_word.trim() !== 'استعادة') {
      return res.status(400).json({ success: false, message: 'يرجى كتابة كلمة "استعادة" لتأكيد عملية استرجاع البيانات' });
    }

    if (!fileName) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد اسم ملف النسخة الاحتياطية' });
    }

    const targetPath = path.join(backupEngine.getBackupsDir(), path.basename(fileName));
    if (!require('fs').existsSync(targetPath)) {
      return res.status(404).json({ success: false, message: 'ملف النسخة الاحتياطية المحدد غير موجود على القرص' });
    }

    const result = backupEngine.restoreFromBackup(targetPath, { createSafetySnapshot: true });

    res.json({
      success: true,
      message: `تمت استعادة البيانات بنجاح من اللقطة (${fileName}) 🛡️`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'فشلت استعادة اللقطة المحلية', error: err.message });
  }
});

// License Guard Middleware: Blocks destructive / write actions when subscription is locked
const licenseEngine = require('./utils/licenseEngine');
app.use('/api', (req, res, next) => {
  if (
    req.method === 'GET' ||
    req.path.startsWith('/system/license') ||
    req.path.startsWith('/backup') ||
    req.path === '/system/factory-reset'
  ) {
    return next();
  }
  const db = require('./db/database');
  const status = licenseEngine.getLicenseStatus(db);
  if (!status.valid) {
    return res.status(403).json({
      success: false,
      code: 'LICENSE_LOCKED',
      message: status.message || 'انتهت فترة اشتراك النظام ومهلة السماح. يرجى إدخال كود التجديد لاستئناف العمل.',
      data: status,
    });
  }
  next();
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
app.get('/api/expenses', voucherController.getExpenses);
app.use('/api/accounting', accountingRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/system', systemRoutes);

// Serve production static frontend if available
const clientDistCandidates = [
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(__dirname, '..', '..', 'client', 'dist'),
  path.join(__dirname, '..', 'resources', 'client', 'dist'),
];
const clientDistPath = clientDistCandidates.find((p) => fs.existsSync(p)) || clientDistCandidates[0];
if (fs.existsSync(clientDistPath)) {
  console.log('[Server] Serving production static frontend from:', clientDistPath);
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.warn('[Server] Warning: client/dist not found in candidates:', clientDistCandidates);
}

// Global Error Handler
app.use(errorHandler);

// Initialize DB and Seed data before listening
try {
  initDb();
  if (process.env.SEED_DEMO_DATA === 'true') {
    seedDatabase();
  }
  backupEngine.performDailyAutoBackup();
  try {
    const { initPrinterSelfHealing } = require('./utils/printerSelfHealer');
    initPrinterSelfHealing();
  } catch (e) {}
  const serverInstance = app.listen(PORT, () => {
    console.log(`🚀 Quick Lube POS Backend running on http://localhost:${PORT}`);
    console.log(`📡 Ready for Phase 1 endpoints testing`);
  });
  serverInstance.on('error', (err) => {
    console.error('⚠️ Server listener error:', err.message);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  try {
    fs.appendFileSync(path.join(__dirname, '..', 'desktop_boot.log'), `[SERVER CRASH] ${err.stack || err}\n`);
  } catch (e) {}
  process.exit(1);
}

module.exports = app;
