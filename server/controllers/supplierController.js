const supplierModel = require('../models/supplierModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const supplierController = {
  getAll: asyncHandler(async (req, res) => {
    const suppliers = supplierModel.getAll(req.query);
    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const supplier = supplierModel.getById(id);
    if (!supplier) {
      throw new AppError('المورد غير موجود', 404);
    }
    res.json({
      success: true,
      data: supplier,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      throw new AppError('اسم المورد مطلوب', 400);
    }

    const newSupplier = supplierModel.create(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة المورد بنجاح',
      data: newSupplier,
    });
  }),

  update: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const updated = supplierModel.update(id, req.body);
    if (!updated) {
      throw new AppError('المورد غير موجود لتعديله', 404);
    }
    res.json({
      success: true,
      message: 'تم تحديث بيانات المورد بنجاح',
      data: updated,
    });
  }),

  toggleActive: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const updated = supplierModel.toggleActive(id);
    if (!updated) {
      throw new AppError('المورد غير موجود لتعديل حالته', 404);
    }
    res.json({
      success: true,
      message: updated.is_active === 1 ? 'تم تفعيل المورد بنجاح' : 'تم تعطيل المورد بنجاح',
      data: updated,
    });
  }),

  delete: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const result = supplierModel.delete(id);
    res.json({
      success: true,
      message: result.message,
    });
  }),

  payDebt: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { amount, payment_method, notes, purchase_id } = req.body;
    if (!amount || Number(amount) <= 0) {
      throw new AppError('المبلغ يجب أن يكون أكبر من الصفر', 400);
    }

    const updated = supplierModel.paySupplierDebt(id, { amount, payment_method, notes, purchase_id });
    res.json({
      success: true,
      message: 'تم تسجيل سند سداد دفعة المورد وتحديث الحسابات والمخزن بنجاح',
      data: updated,
    });
  }),

  getVouchers: asyncHandler(async (req, res) => {
    const vouchers = supplierModel.getPaymentVouchers(req.query);
    res.json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  }),

  getVoucherById: asyncHandler(async (req, res) => {
    const voucher = supplierModel.getPaymentVoucherById(req.params.id);
    if (!voucher) {
      throw new AppError('سند الصرف غير موجود', 404);
    }
    res.json({
      success: true,
      data: voucher,
    });
  }),
};

module.exports = supplierController;
