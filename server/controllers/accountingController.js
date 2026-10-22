const accountingModel = require('../models/accountingModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const accountingController = {
  getAccounts: asyncHandler(async (req, res) => {
    const accounts = accountingModel.getChartOfAccounts();
    res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  }),

  getAccountDetails: asyncHandler(async (req, res) => {
    const { code } = req.params;
    const account = accountingModel.getAccountByCode(code);
    if (!account) {
      throw new AppError('الحساب المالي غير موجود في دليل الحسابات', 404);
    }
    res.json({
      success: true,
      data: account,
    });
  }),

  createAccount: asyncHandler(async (req, res) => {
    const { code, name, type } = req.body;
    if (!code || !name || !type) {
      throw new AppError('رمز الحساب، الاسم، والنوع الرئيسي حقول إلزامية', 400);
    }
    const account = accountingModel.createAccount(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إضافة الحساب المالي بنجاح',
      data: account,
    });
  }),

  getJournalEntries: asyncHandler(async (req, res) => {
    const entries = accountingModel.getJournalEntries(req.query);
    res.json({
      success: true,
      count: entries.length,
      data: entries,
    });
  }),

  getJournalEntryById: asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const entry = accountingModel.getJournalEntryById(id);
    if (!entry) {
      throw new AppError('القيد المحاسبي غير موجود', 404);
    }
    res.json({
      success: true,
      data: entry,
    });
  }),

  createManualEntry: asyncHandler(async (req, res) => {
    const { entry_date, description, lines } = req.body;
    if (!description || !lines || !Array.isArray(lines) || lines.length < 2) {
      throw new AppError('بيان القيد وبنود القيد (طرف مدين وطرف دائن على الأقل) مطلوبة', 400);
    }
    const newEntry = accountingModel.createManualJournalEntry(req.body);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل القيد المحاسبي بنجاح وتأكيد توازنه',
      data: newEntry,
    });
  }),

  getStatementOfAccount: asyncHandler(async (req, res) => {
    const { party_type, party_id, start_date, end_date, paper_bill_number } = req.query;
    if (!party_type || !party_id) {
      throw new AppError('نوع الحساب (customer / supplier / worker) والمعرف (party_id) مطلوبان', 400);
    }
    const statement = accountingModel.getStatementOfAccount({
      party_type,
      party_id: parseInt(party_id, 10),
      start_date,
      end_date,
      paper_bill_number,
    });
    res.json({
      success: true,
      data: statement,
    });
  }),

  getTrialBalance: asyncHandler(async (req, res) => {
    const { as_of_date } = req.query;
    const trialBalance = accountingModel.getTrialBalance(as_of_date);
    res.json({
      success: true,
      data: trialBalance,
    });
  }),

  getIncomeStatement: asyncHandler(async (req, res) => {
    const incomeStatement = accountingModel.getIncomeStatement(req.query);
    res.json({
      success: true,
      data: incomeStatement,
    });
  }),

  getBalanceSheet: asyncHandler(async (req, res) => {
    const balanceSheet = accountingModel.getBalanceSheet();
    res.json({
      success: true,
      data: balanceSheet,
    });
  }),

  getFinancialPulse: asyncHandler(async (req, res) => {
    const pulse = accountingModel.getFinancialPulse();
    res.json({
      success: true,
      data: pulse,
    });
  }),

  getBayProfitability: asyncHandler(async (req, res) => {
    const bayData = accountingModel.getBayProfitability(req.query);
    res.json({
      success: true,
      data: bayData,
    });
  }),

  checkSafeguards: asyncHandler(async (req, res) => {
    const safeguards = accountingModel.checkInvoiceSafeguards(req.body);
    res.json({
      success: true,
      data: safeguards,
    });
  }),

  getStockMovements: asyncHandler(async (req, res) => {
    const movements = accountingModel.getStockMovements(req.query);
    res.json({
      success: true,
      count: movements.length,
      data: movements,
    });
  }),
};

module.exports = accountingController;
