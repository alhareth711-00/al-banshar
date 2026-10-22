const expenseCategoryModel = require('../models/expenseCategoryModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const expenseCategoryController = {
  getAll: asyncHandler(async (req, res) => {
    const categories = expenseCategoryModel.getAll();
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      throw new AppError('اسم تصنيف المصروف مطلوب', 400);
    }

    const newCat = expenseCategoryModel.create(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة تصنيف المصروف بنجاح',
      data: newCat,
    });
  }),

  update: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const updated = expenseCategoryModel.update(id, req.body);
    if (!updated) {
      throw new AppError('تصنيف المصروف غير موجود', 404);
    }
    res.json({
      success: true,
      message: 'تم تحديث اسم تصنيف المصروف بنجاح',
      data: updated,
    });
  }),

  delete: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const success = expenseCategoryModel.delete(id);
    if (!success) {
      throw new AppError('تعذر حذف تصنيف المصروف', 404);
    }
    res.json({
      success: true,
      message: 'تم حذف تصنيف المصروف بنجاح',
    });
  }),
};

module.exports = expenseCategoryController;
