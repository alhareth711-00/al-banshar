const invoiceModel = require('../models/invoiceModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const invoiceController = {
  createInvoice: asyncHandler(async (req, res) => {
    const { vehicle_id, items, payment_method } = req.body;

    if (!vehicle_id) {
      throw new AppError('معرف السيارة (vehicle_id) مطلوب لإصدار الفاتورة', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('يجب أن تحتوي الفاتورة على صنف أو خدمة واحدة على الأقل', 400);
    }

    const validPaymentMethods = ['cash', 'jeeb', 'jawali', 'kuraimi', 'onecash', 'credit', 'split'];
    if (payment_method && !validPaymentMethods.includes(payment_method)) {
      throw new AppError(`طريقة الدفع غير صالحة. الطرق المتاحة: ${validPaymentMethods.join(', ')}`, 400);
    }

    const invoice = invoiceModel.create(req.body);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفاتورة وتحديث المخزون وسجل السيارة بنجاح',
      data: invoice,
    });
  }),

  getAllInvoices: asyncHandler(async (req, res) => {
    const invoices = invoiceModel.getAll(req.query);
    res.json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  }),

  getInvoiceById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const invoice = invoiceModel.getById(id);
    if (!invoice) {
      throw new AppError('لم يتم العثور على الفاتورة المطلوبة', 404);
    }
    res.json({
      success: true,
      data: invoice,
    });
  }),
};

module.exports = invoiceController;
