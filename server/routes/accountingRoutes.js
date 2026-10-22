const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accountingController');

// Chart of Accounts
router.get('/accounts', accountingController.getAccounts);
router.post('/accounts', accountingController.createAccount);
router.get('/accounts/:code', accountingController.getAccountDetails);

// Journal Entries
router.get('/journal-entries', accountingController.getJournalEntries);
router.post('/journal-entries', accountingController.createManualEntry);
router.get('/journal-entries/:id', accountingController.getJournalEntryById);

// Financial Reports & Statements
router.get('/statement-of-account', accountingController.getStatementOfAccount);
router.get('/trial-balance', accountingController.getTrialBalance);
router.get('/income-statement', accountingController.getIncomeStatement);
router.get('/balance-sheet', accountingController.getBalanceSheet);
router.get('/financial-pulse', accountingController.getFinancialPulse);
router.get('/bay-profitability', accountingController.getBayProfitability);
router.post('/check-safeguards', accountingController.checkSafeguards);
router.get('/stock-movements', accountingController.getStockMovements);

module.exports = router;
