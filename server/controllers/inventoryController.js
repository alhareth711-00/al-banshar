const inventoryModel = require('../models/inventoryModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const inventoryController = {
  getAll: asyncHandler(async (req, res) => {
    const items = inventoryModel.getAll(req.query);
    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const item = inventoryModel.getById(id);
    if (!item) {
      throw new AppError('الصنف غير موجود في المخزن', 404);
    }
    res.json({
      success: true,
      data: item,
    });
  }),

  getByBarcode: asyncHandler(async (req, res) => {
    const barcode = req.params.barcode ? req.params.barcode.trim() : '';
    if (!barcode) {
      throw new AppError('الباركود مطلوب للبحث', 400);
    }
    const item = inventoryModel.getByBarcode(barcode);
    if (!item) {
      throw new AppError(`لا يوجد أي صنف مسجل برقم الباركود: ${barcode}`, 404);
    }
    res.json({
      success: true,
      data: item,
    });
  }),

  getLowStock: asyncHandler(async (req, res) => {
    const items = inventoryModel.getLowStockItems();
    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  }),

  getValuationSummary: asyncHandler(async (req, res) => {
    const summary = inventoryModel.getValuationSummary();
    res.json({
      success: true,
      data: summary,
    });
  }),

  getTurnoverAnalytics: asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : 90;
    const analytics = inventoryModel.getTurnoverAnalytics(days);
    res.json({
      success: true,
      data: analytics,
    });
  }),

  getReorderSuggestions: asyncHandler(async (req, res) => {
    const suggestions = inventoryModel.getReorderSuggestions();
    res.json({
      success: true,
      data: suggestions,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const { sku, name, category, brand, cost_price, sell_price } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('اسم الصنف مطلوب', 400);
    }
    if (!category) {
      throw new AppError('فئة الصنف مطلوبة', 400);
    }

    // Check duplicate name
    const existingName = inventoryModel.getByName(name.trim());
    if (existingName && existingName.is_active === 1) {
      throw new AppError(`يوجد صنف مسجل بنفس الاسم مسبقاً: "${existingName.name}" (كود: ${existingName.sku}) لمنع الازدواجية`, 400);
    }

    if (cost_price !== undefined && cost_price !== null && Number(cost_price) < 0) {
      throw new AppError('سعر التكلفة لا يمكن أن يكون قيمة سالبة', 400);
    }
    if (sell_price !== undefined && sell_price !== null && Number(sell_price) < 0) {
      throw new AppError('سعر البيع لا يمكن أن يكون قيمة سالبة', 400);
    }

    if (sku && sku.trim()) {
      const existing = inventoryModel.getBySku(sku.trim());
      if (existing) {
        throw new AppError(`كود الصنف (SKU) "${sku}" مسجل مسبقاً للصنف: ${existing.name}`, 400);
      }
    }

    if (req.body.barcode && req.body.barcode.trim()) {
      const existingBarcode = inventoryModel.getByBarcode(req.body.barcode.trim());
      if (existingBarcode) {
        throw new AppError(`الباركود "${req.body.barcode}" مسجل مسبقاً للصنف: ${existingBarcode.name}`, 400);
      }
    }

    const newItem = inventoryModel.create(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة الصنف إلى المخزون بنجاح',
      data: newItem,
    });
  }),

  update: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = inventoryModel.getById(id);
    if (!existing) {
      throw new AppError('الصنف المطلوب تحديثه غير موجود', 404);
    }

    const { name, sku, barcode, cost_price, sell_price } = req.body;

    if (name && name.trim()) {
      const existingName = inventoryModel.getByName(name.trim());
      if (existingName && existingName.id !== id && existingName.is_active === 1) {
        throw new AppError(`يوجد صنف آخر مسجل مسبقاً بنفس الاسم: "${existingName.name}" (كود: ${existingName.sku})`, 400);
      }
    }

    if (sku && sku.trim()) {
      const existingSku = inventoryModel.getBySku(sku.trim());
      if (existingSku && existingSku.id !== id) {
        throw new AppError(`كود الصنف (SKU) "${sku}" مسجل بالفعل لصنف آخر: ${existingSku.name}`, 400);
      }
    }

    if (cost_price !== undefined && cost_price !== null && Number(cost_price) < 0) {
      throw new AppError('سعر التكلفة لا يمكن أن يكون قيمة سالبة', 400);
    }
    if (sell_price !== undefined && sell_price !== null && Number(sell_price) < 0) {
      throw new AppError('سعر البيع لا يمكن أن يكون قيمة سالبة', 400);
    }

    if (barcode && barcode.trim()) {
      const barcodeItem = inventoryModel.getByBarcode(barcode.trim());
      if (barcodeItem && barcodeItem.id !== id) {
        throw new AppError(`الباركود "${barcode}" مستخدم بالفعل مع صنف آخر: ${barcodeItem.name}`, 400);
      }
    }

    const updated = inventoryModel.update(id, req.body);
    res.json({
      success: true,
      message: 'تم تحديث بيانات الصنف بنجاح',
      data: updated,
    });
  }),

  deleteOrArchive: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const result = inventoryModel.deleteOrArchive(id);
    if (!result) {
      throw new AppError('الصنف غير موجود أو تم حذفه مسبقاً', 404);
    }

    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  }),

  toggleActive: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const item = inventoryModel.toggleActive(id);
    if (!item) {
      throw new AppError('الصنف غير موجود', 404);
    }

    const statusMsg = item.is_active ? 'تم تفعيل الصنف وإتاحته في البيع' : 'تم تعطيل الصنف وإيقافه عن الظهور في شاشة البيع';
    res.json({
      success: true,
      data: item,
      message: statusMsg,
    });
  }),

  adjustStock: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { qty_delta, reason, adjusted_by } = req.body;

    if (qty_delta === undefined || qty_delta === null || Number(qty_delta) === 0) {
      throw new AppError('يجب تحديد كمية التسوية بفارق موجب أو سالب غير صفري', 400);
    }

    try {
      const updated = inventoryModel.adjustStock(id, {
        qty_delta: Number(qty_delta),
        reason: reason || 'تسوية جردية رسمية',
        adjusted_by: adjusted_by || 'مدير النظام',
      });

      res.json({
        success: true,
        message: 'تمت التسوية الجردية وترحيل الأثر المحاسبي في دفتر اليومية بنجاح',
        data: updated,
      });
    } catch (err) {
      throw new AppError(err.message, 400);
    }
  }),

  convertPackaging: asyncHandler(async (req, res) => {
    const { from_id, to_id, packages_to_convert, units_per_package } = req.body;

    if (!from_id || !to_id) {
      throw new AppError('يجب تحديد الصنف المصدر (الكرتون/البرميل) والصنف الهدف (العلبة/اللتر)', 400);
    }

    if (from_id === to_id) {
      throw new AppError('لا يمكن التحويل من نفس الصنف لنفسه', 400);
    }

    try {
      const result = inventoryModel.convertPackaging({
        from_id: parseInt(from_id, 10),
        to_id: parseInt(to_id, 10),
        packages_to_convert: Number(packages_to_convert || 1),
        units_per_package: units_per_package ? Number(units_per_package) : undefined,
      });

      res.json({
        success: true,
        message: `تم فك وتحويل ${result.packages_converted} عبوة إلى ${result.units_produced} وحدة بنجاح`,
        data: result,
      });
    } catch (err) {
      throw new AppError(err.message, 400);
    }
  }),
};

module.exports = inventoryController;
