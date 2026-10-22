const workerModel = require('../models/workerModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const workerController = {
  getAll: asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === 'true';
    const workers = workerModel.getAll(activeOnly);
    res.json({
      success: true,
      count: workers.length,
      data: workers,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const worker = workerModel.getById(id);
    if (!worker) {
      throw new AppError('الفني غير موجود في سجلات النظام', 404);
    }
    res.json({
      success: true,
      data: worker,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const { name, role } = req.body;
    if (!name || !name.trim()) {
      throw new AppError('اسم الفني مطلوب', 400);
    }
    if (!role || !role.trim()) {
      throw new AppError('تخصص أو دور الفني مطلوب', 400);
    }

    const newWorker = workerModel.create(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة الفني بنجاح',
      data: newWorker,
    });
  }),

  update: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const updated = workerModel.update(id, req.body);
    if (!updated) {
      throw new AppError('سجل الفني المطلوب تحديثه غير موجود', 404);
    }
    res.json({
      success: true,
      message: 'تم تحديث بيانات الفني بنجاح',
      data: updated,
    });
  }),

  getDailyStats: asyncHandler(async (req, res) => {
    const stats = workerModel.getDailyStats(req.query.date);
    res.json({
      success: true,
      count: stats.length,
      data: stats,
    });
  }),
};

module.exports = workerController;
