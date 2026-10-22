const purchaseModel = require('../models/purchaseModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const purchaseController = {
  getAll: asyncHandler(async (req, res) => {
    const purchases = purchaseModel.getAll(req.query);
    res.json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const purchase = purchaseModel.getById(id);
    if (!purchase) {
      throw new AppError('فاتورة المشتريات غير موجودة', 404);
    }
    res.json({
      success: true,
      data: purchase,
    });
  }),

  getOverduePayables: asyncHandler(async (req, res) => {
    const payables = purchaseModel.getOverduePayables();
    const today = new Date().toISOString().split('T')[0];
    const overdueBills = payables.filter(p => p.due_date && p.due_date <= today);
    const totalOverdueDebt = overdueBills.reduce((acc, p) => acc + (Number(p.remaining_debt) || 0), 0);

    res.json({
      success: true,
      count: payables.length,
      data: {
        total_overdue_count: overdueBills.length,
        total_overdue_debt: totalOverdueDebt,
        overdue_bills: overdueBills,
        all_payables: payables,
      },
    });
  }),

  getDueCalendar: asyncHandler(async (req, res) => {
    const calendar = purchaseModel.getDueCalendar();
    res.json({
      success: true,
      data: calendar,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const { items, supplier_name } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('يجب أن تحتوي فاتورة المشتريات على صنف واحد على الأقل', 400);
    }

    const newPurchase = purchaseModel.create(req.body);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل فاتورة المشتريات وتوريد البضاعة للمخزن وتحديث الصندوق بنجاح',
      data: newPurchase,
    });
  }),
};

module.exports = purchaseController;
