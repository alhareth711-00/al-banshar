const reportModel = require('../models/reportModel');
const { asyncHandler } = require('../utils/errorHandler');

const reportController = {
  getDailyClosing: asyncHandler(async (req, res) => {
    const date = req.query.date; // Defaults to today in model if not provided
    const report = reportModel.getDailyClosing(date);
    res.json({
      success: true,
      data: report,
    });
  }),
};

module.exports = reportController;
