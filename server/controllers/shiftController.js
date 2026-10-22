const shiftModel = require('../models/shiftModel');
const { asyncHandler } = require('../utils/errorHandler');

const shiftController = {
  getCurrentShift: asyncHandler(async (req, res) => {
    const data = shiftModel.getCurrentShift();
    res.json({
      success: true,
      data,
    });
  }),

  openShift: asyncHandler(async (req, res) => {
    const shift = shiftModel.openShift(req.body);
    res.status(201).json({
      success: true,
      message: `تم فتح الوردية (${shift.shift_code}) بنجاح`,
      data: shift,
    });
  }),

  closeShift: asyncHandler(async (req, res) => {
    const shift = shiftModel.closeShift(req.body);
    res.json({
      success: true,
      message: `تم إغلاق الوردية (${shift.shift_code}) واعتماد تسليم الصندوق`,
      data: shift,
    });
  }),

  getShiftHistory: asyncHandler(async (req, res) => {
    const shifts = shiftModel.getShiftHistory({
      status: req.query.status,
      date: req.query.date,
    });
    res.json({
      success: true,
      data: shifts,
    });
  }),

  getShiftSlip: asyncHandler(async (req, res) => {
    const slip = shiftModel.getShiftSlip(req.params.id);
    if (!slip) {
      return res.status(404).json({
        success: false,
        message: 'الوردية غير موجودة',
      });
    }
    res.json({
      success: true,
      data: slip,
    });
  }),
};

module.exports = shiftController;
