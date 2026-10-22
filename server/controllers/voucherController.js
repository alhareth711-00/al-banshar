const voucherModel = require('../models/voucherModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const voucherController = {
  getAll: asyncHandler(async (req, res) => {
    const vouchers = voucherModel.getAll(req.query);
    res.json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const voucher = voucherModel.getById(req.params.id);
    if (!voucher) {
      throw new AppError('السند غير موجود', 404);
    }
    res.json({
      success: true,
      data: voucher,
    });
  }),

  createReceipt: asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      throw new AppError('مبلغ سند القبض يجب أن يكون أكبر من الصفر', 400);
    }

    const payload = {
      ...req.body,
      voucher_type: 'receipt',
    };

    const newVoucher = voucherModel.create(payload);
    res.status(201).json({
      success: true,
      message: 'تم اعتماد سند القبض وترحيل القيد المحاسبي المزدوج وتحديث الحساب بنجاح',
      data: newVoucher,
    });
  }),

  createPayment: asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      throw new AppError('مبلغ سند الصرف يجب أن يكون أكبر من الصفر', 400);
    }

    const payload = {
      ...req.body,
      voucher_type: 'payment',
    };

    const newVoucher = voucherModel.create(payload);
    res.status(201).json({
      success: true,
      message: 'تم اعتماد سند الصرف وخصم المبلغ وترحيل القيد المحاسبي بنجاح',
      data: newVoucher,
    });
  }),

  getCashDrawerSummary: asyncHandler(async (req, res) => {
    const summary = voucherModel.getCashDrawerSummary();
    res.json({
      success: true,
      data: summary,
    });
  }),

  getCustomerDebts: asyncHandler(async (req, res) => {
    const debts = voucherModel.getCustomerDebts();
    res.json({
      success: true,
      count: debts.length,
      data: debts,
    });
  }),

  // Stage 5 Pro Upgrade 2: Cash Drawer Reconciliation
  saveCashDrawerAudit: asyncHandler(async (req, res) => {
    const { physical_balance, notes, created_by } = req.body;
    if (physical_balance === undefined || physical_balance === null || isNaN(Number(physical_balance))) {
      throw new AppError('يرجى إدخال المبلغ الإجمالي الفعلي الموجود في الصندوق', 400);
    }
    const audit = voucherModel.saveCashDrawerAudit({ physical_balance, notes, created_by });
    res.status(201).json({
      success: true,
      message: 'تم حفظ محضر جرد ومطابقة الصندوق بنجاح',
      data: audit,
    });
  }),

  getCashDrawerAudits: asyncHandler(async (req, res) => {
    const audits = voucherModel.getCashDrawerAudits(req.query.limit ? parseInt(req.query.limit, 10) : 30);
    res.json({
      success: true,
      count: audits.length,
      data: audits,
    });
  }),

  adjustCashDrawerVariance: asyncHandler(async (req, res) => {
    const { audit_id } = req.body;
    if (!audit_id) {
      throw new AppError('معرف محضر الجرد (audit_id) مطلوب', 400);
    }
    const result = voucherModel.adjustCashDrawerVariance(parseInt(audit_id, 10));
    res.json({
      success: true,
      ...result,
    });
  }),

  // Stage 5 Pro Upgrade 3: Owner Drawings vs Operating Profit
  getOwnerDrawingsSummary: asyncHandler(async (req, res) => {
    const summary = voucherModel.getOwnerDrawingsAnalytics();
    res.json({
      success: true,
      data: summary,
    });
  }),

  // Stage 5 Pro Upgrade 5: Cash Flow Movement Analytics
  getCashFlowAnalytics: asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : 7;
    const analytics = voucherModel.getCashFlowAnalytics(days);
    res.json({
      success: true,
      data: analytics,
    });
  }),
};

module.exports = voucherController;
