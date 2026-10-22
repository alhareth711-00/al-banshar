const purchaseReturnModel = require('../models/purchaseReturnModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const purchaseReturnController = {
  getAll: asyncHandler(async (req, res) => {
    const returns = purchaseReturnModel.getAll(req.query);
    res.json({
      success: true,
      count: returns.length,
      data: returns,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ret = purchaseReturnModel.getById(id);
    if (!ret) {
      throw new AppError('سجل مرتجع المشتريات غير موجود', 404);
    }
    res.json({
      success: true,
      data: ret,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const { items, reason } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('يرجى تحديد صنف واحد على الأقل للمرتجع', 400);
    }
    if (!reason || !reason.trim()) {
      throw new AppError('يرجى توضيح سبب إرجاع البضاعة للمورد', 400);
    }

    const newReturn = purchaseReturnModel.create(req.body);
    res.status(201).json({
      success: true,
      message: 'تم اعتماد مرتجع المشتريات وتحديث المخزون وقيد اليومية بنجاح',
      data: newReturn,
    });
  }),
};

module.exports = purchaseReturnController;
