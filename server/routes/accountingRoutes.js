const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accountingController');

// Chart of Accounts & Dynamic Account Helpers
router.get('/liquid-accounts', accountingController.getLiquidAccounts);
router.get('/expense-accounts', accountingController.getExpenseAccounts);
router.get('/accounts', accountingController.getAccounts);
router.get('/accounts/next-code', accountingController.getNextCode);
router.get('/accounts/liquid', accountingController.getLiquidAccounts);
router.get('/accounts/expenses', accountingController.getExpenseAccounts);
router.post('/accounts', accountingController.createAccount);
router.get('/accounts/:code', accountingController.getAccountDetails);
router.get('/accounts/:code/ledger', accountingController.getAccountLedger);
router.put('/accounts/:code', accountingController.updateAccount);
router.delete('/accounts/:code', accountingController.deleteAccount);

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
