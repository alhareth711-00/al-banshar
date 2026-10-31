const transactionModel = require('../models/transactionModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const transactionController = {
  getAll: asyncHandler(async (req, res) => {
    const transactions = transactionModel.getAll(req.query);
    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const tx = transactionModel.getById(id);
    if (!tx) {
      throw new AppError('السند أو المعاملة المالية غير موجودة', 404);
    }
    res.json({
      success: true,
      data: tx,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const { tx_type, amount, description } = req.body;
    const worker_id = req.body.worker_id || req.body.workerId || (req.body.worker && req.body.worker.id);
    const vehicle_id = req.body.vehicle_id || req.body.vehicleId || (req.body.vehicle && req.body.vehicle.id);

    const validTypes = ['expense', 'worker_advance', 'debt_collection', 'owner_drawing'];
    if (!tx_type || !validTypes.includes(tx_type)) {
      throw new AppError(`نوع المعاملة يجب أن يكون واحداً من: ${validTypes.join(', ')}`, 400);
    }

    if (!amount || Number(amount) <= 0) {
      throw new AppError('المبلغ يجب أن يكون رقماً موجباً أكبر من الصفر', 400);
    }

    if (!description || !description.trim()) {
      throw new AppError('البيان / الوصف مطلوب للمعاملة المالية', 400);
    }

    if (tx_type === 'worker_advance' && !worker_id) {
      throw new AppError('معرف الفني (worker_id) مطلوب عند تسجيل سلفة عامل', 400);
    }

    if (tx_type === 'debt_collection' && !vehicle_id) {
      throw new AppError('معرف سيارة العميل (vehicle_id) مطلوب عند تسجيل سند قبض دين', 400);
    }

    const newTx = transactionModel.create({
      ...req.body,
      worker_id: worker_id ? Number(worker_id) : null,
      vehicle_id: vehicle_id ? Number(vehicle_id) : null,
    });

    let message = 'تم تسجيل المعاملة بنجاح';
    if (tx_type === 'expense') message = 'تم تسجيل المصروف التشغيلي بنجاح';
    if (tx_type === 'worker_advance') message = 'تم صرف وتسجيل سلفة الفني بنجاح';
    if (tx_type === 'debt_collection') message = 'تم تسجيل سند قبض وتسديد الدين بنجاح';

    res.status(201).json({
      success: true,
      message,
      data: newTx,
    });
  }),
};

module.exports = transactionController;
