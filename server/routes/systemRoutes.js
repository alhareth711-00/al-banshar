const express = require('express');
const router = express.Router();
const db = require('../db/database');
const backupEngine = require('../utils/backupEngine');
const licenseEngine = require('../utils/licenseEngine');
const updateEngine = require('../utils/updateEngine');
const { executeHandoverPurge } = require('../scripts/handoverPurge');
const { asyncHandler, AppError } = require('../utils/errorHandler');

/**
 * System Version API
 * GET /api/system/version
 */
router.get('/version', asyncHandler(async (req, res) => {
  const version = updateEngine.getCurrentVersion();
  res.json({
    success: true,
    data: version,
  });
}));

/**
 * Apply Software Update Package (.zip)
 * POST /api/system/apply-update
 * Body: { fileBase64, fileName, confirmation_word }
 */
router.post('/apply-update', asyncHandler(async (req, res) => {
  const { fileBase64, fileName, confirmation_word } = req.body;

  if (!confirmation_word || confirmation_word.trim() !== 'تحديث') {
    throw new AppError('يرجى كتابة كلمة "تحديث" لتأكيد تثبيت الترقية البرمجية بأمان', 400);
  }

  if (!fileBase64) {
    throw new AppError('لم يتم إرسال ملف حزمة التحديث (.zip)', 400);
  }

  const zipBuffer = Buffer.from(fileBase64, 'base64');
  if (zipBuffer.length === 0) {
    throw new AppError('ملف حزمة التحديث فارغ أو تالف', 400);
  }

  const result = updateEngine.applyUpdatePackage(zipBuffer);

  res.json({
    success: true,
    message: result.message,
    data: result,
  });
}));

/**
 * License Status API
 * GET /api/system/license/status
 */
router.get('/license/status', asyncHandler(async (req, res) => {
  const status = licenseEngine.getLicenseStatus(db);
  res.json({
    success: true,
    data: status,
  });
}));

/**
 * License Activation API
 * POST /api/system/license/activate
 * Body: { licenseKey: 'ALB-...', shopName?: '...' }
 */
router.post('/license/activate', asyncHandler(async (req, res) => {
  const { licenseKey, shopName } = req.body;
  if (!licenseKey) {
    throw new AppError('يرجى إدخال كود مفتاح التفعيل', 400);
  }

  const updatedStatus = licenseEngine.activateLicense(db, { licenseKey, shopName });
  res.json({
    success: true,
    message: 'تم تفعيل وتجديد ترخيص النظام بنجاح تام 🛡️🎉',
    data: updatedStatus,
  });
}));

/**
 * Factory Reset API (تصفير البيانات وتجهيز النظام لعميل جديد)
 * POST /api/system/factory-reset
 * Body: { mode: 'preserve_catalog' | 'full_wipe', confirmation_word: 'تصفير' }
 */
router.post('/factory-reset', asyncHandler(async (req, res) => {
  const { mode = 'preserve_catalog', confirmation_word } = req.body;

  if (!confirmation_word || confirmation_word.trim() !== 'تصفير') {
    throw new AppError('يرجى كتابة كلمة "تصفير" للتأكيد على تفريغ وتجهيز النظام', 400);
  }

  const result = executeHandoverPurge({ preserveCatalog: mode !== 'full_wipe' });

  res.json({
    success: true,
    message: mode === 'full_wipe'
      ? 'تم تصفير النظام بالكامل بنجاح وتجهيزه كنسخة بيضاء من الصفر.'
      : 'تم تصفير العمليات والفواتير والديون بنجاح، وتجهيز المخزون برصيد 0 مع الحفاظ على كتالوج الأصناف والأسعار.',
    backup: result.backupFile,
    mode,
  });
}));

module.exports = router;
