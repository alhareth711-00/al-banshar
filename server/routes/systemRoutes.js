const express = require('express');
const router = express.Router();
const db = require('../db/database');
const backupEngine = require('../utils/backupEngine');
const { executeHandoverPurge } = require('../scripts/handoverPurge');
const { asyncHandler, AppError } = require('../utils/errorHandler');

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
