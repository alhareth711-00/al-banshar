const vehicleModel = require('../models/vehicleModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { validateYemeniPhone } = require('../utils/helpers');

const vehicleController = {
  searchVehicles: asyncHandler(async (req, res) => {
    const query = req.query.q || '';
    const limit = req.query.limit ? Number(req.query.limit) : (query ? 25 : null);
    const results = vehicleModel.getAll({ q: query, limit });
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  }),

  getVehicleById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const vehicle = vehicleModel.getById(id);
    if (!vehicle) {
      throw new AppError('لم يتم العثور على سجل العميل أو المركبة المطلوبة', 404);
    }
    res.json({
      success: true,
      data: vehicle,
    });
  }),

  getLastService: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const lastService = vehicleModel.getLastService(id);
    res.json({
      success: true,
      data: lastService,
    });
  }),

  createVehicle: asyncHandler(async (req, res) => {
    let { plate_number, car_make_model, customer_name, phone } = req.body;

    if (!customer_name || !customer_name.trim()) {
      throw new AppError('اسم العميل مطلوب', 400);
    }
    if (!phone || !phone.trim()) {
      throw new AppError('رقم هاتف العميل مطلوب', 400);
    }

    // Plate number is OPTIONAL. If empty, generate internal unique ID e.g. "بدون-771234567"
    let finalPlate = (plate_number && plate_number.trim()) || '';
    if (!finalPlate) {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      finalPlate = `بدون-${cleanPhone || Date.now().toString().slice(-6)}`;
      const existingAuto = vehicleModel.getByPlate(finalPlate);
      if (existingAuto) {
        finalPlate = `${finalPlate}-${Date.now().toString().slice(-4)}`;
      }
    } else {
      // Check if real plate already exists
      const existing = vehicleModel.getByPlate(finalPlate);
      if (existing) {
        throw new AppError(`رقم اللوحة "${finalPlate}" مسجل مسبقاً للعميل ${existing.customer_name}`, 400);
      }
    }

    const payload = {
      ...req.body,
      plate_number: finalPlate,
      car_make_model: car_make_model && car_make_model.trim() ? car_make_model.trim() : 'سيارة بدون تحديد',
    };

    const newVehicle = vehicleModel.create(payload);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل العميل بنجاح',
      data: newVehicle,
    });
  }),

  updateVehicle: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const updated = vehicleModel.update(id, req.body);
    if (!updated) {
      throw new AppError('لم يتم العثور على سجل المركبة لتحديثها', 404);
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات العميل والمركبة بنجاح',
      data: updated,
    });
  }),

  getRetentionRadar: asyncHandler(async (req, res) => {
    const radarData = vehicleModel.getRetentionRadar();
    res.json({
      success: true,
      count: radarData.length,
      data: radarData,
    });
  }),

  // Upgrade 3: Fleet & Corporate Accounts
  getCorporateAccounts: asyncHandler(async (req, res) => {
    const accounts = vehicleModel.getCorporateAccounts();
    res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  }),

  // Upgrade 4: Log WhatsApp / Voice Reminder
  logReminder: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const logs = vehicleModel.logReminder(id, req.body);
    res.json({
      success: true,
      message: 'تم تسجيل التذكير بنجاح في سجل المتابعة',
      data: logs,
    });
  }),
};

module.exports = vehicleController;
