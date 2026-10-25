import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  UserCheck,
  Building,
  Users,
  Search,
  Filter,
  Printer,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileText,
  CreditCard,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Percent,
  BookOpen,
  Eye,
  X,
  Share2,
  Scale,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import ReceiptVoucherModal from './ReceiptVoucherModal';
import GeneralPaymentVoucherModal from './GeneralPaymentVoucherModal';
import ExpenseCategoriesModal from './ExpenseCategoriesModal';
import CashDrawerReconciliationModal from './CashDrawerReconciliationModal';
import { tafqeet } from '../utils/tafqeet';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

export default function FinancialVaultHub({ onRefreshData, onOpenStatement }) {
  const [activeTab, setActiveTab] = useState('drawer'); // 'drawer' | 'receipts' | 'payments' | 'debts' | 'expenses'
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 3 Live Variants Switcher (1. Tactical Cash Desk | 2. Tactile Touch Vault | 3. Executive Apple Glass)
  const [vaultStyle, setVaultStyle] = useState(() => {
    return localStorage.getItem('ql_vault_style') || 'tactical';
  });

  const handleSetStyle = (style) => {
    setVaultStyle(style);
    localStorage.setItem('ql_vault_style', style);
  };

  // Summaries & Lists
  const [cashDrawer, setCashDrawer] = useState({
    cash_drawer: { current_balance: 0, total_inflow: 0, total_outflow: 0 },
    bank_kuraimi: { current_balance: 0 },
    e_wallet_jeeb: { current_balance: 0 },
    today: { cash_inflow: 0, cash_outflow: 0, count_receipts_today: 0, count_payments_today: 0 },
  });
  const [vouchers, setVouchers] = useState([]);
  const [customerDebts, setCustomerDebts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPartyType, setFilterPartyType] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptInitialData, setReceiptInitialData] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInitialData, setPaymentInitialData] = useState(null);

  const [showExpenseCategoriesModal, setShowExpenseCategoriesModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState(null);

  // Pro Upgrades 3 & 5 States
  const [ownerAnalytics, setOwnerAnalytics] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [cashFlowDays, setCashFlowDays] = useState(7);

  // Fetch all financial hub data
  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Cash Drawer Summary
      const drawerRes = await fetch('/api/vouchers/cash-drawer');
      const drawerData = await drawerRes.json();
      if (drawerData.success) {
        setCashDrawer(drawerData.data);
      }

      // 2. All Vouchers
      const vouchersRes = await fetch('/api/vouchers');
      const vouchersData = await vouchersRes.json();
      if (vouchersData.success) {
        setVouchers(vouchersData.data || []);
      }

      // 3. Customer Debts
      const debtsRes = await fetch('/api/vouchers/customer-debts');
      const debtsData = await debtsRes.json();
      if (debtsData.success) {
        setCustomerDebts(debtsData.data || []);
      }

      // 4. Suppliers & Workers for payment modals
      const suppRes = await fetch('/api/suppliers');
      const suppData = await suppRes.json();
      if (suppData.success) {
        setSuppliers(suppData.data || []);
      }

      const workRes = await fetch('/api/workers');
      const workData = await workRes.json();
      if (workData.success) {
        setWorkers(workData.data || []);
      }

      // 5. Operating Expenses
      const expRes = await fetch('/api/expenses');
      const expData = await expRes.json();
      if (expData.success) {
        setExpenses(expData.data || []);
      }

      const catRes = await fetch('/api/expense-categories');
      const catData = await catRes.json();
      if (catData.success) {
        setExpenseCategories(catData.data || []);
      }

      // 6. Pro Upgrade 3: Owner Drawings Analytics
      const ownerRes = await fetch('/api/vouchers/owner-drawings-summary');
      const ownerData = await ownerRes.json();
      if (ownerData.success) {
        setOwnerAnalytics(ownerData.data);
      }

      // 7. Pro Upgrade 5: Cash Flow Analytics
      const flowRes = await fetch(`/api/vouchers/cash-flow-analytics?days=${cashFlowDays}`);
      const flowData = await flowRes.json();
      if (flowData.success) {
        setCashFlowData(flowData.data);
      }
    } catch (err) {
      console.error('Failed to load financial vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [cashFlowDays]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    if (onRefreshData) onRefreshData();
  };

  // Launch Receipt Modal for specific customer
  const handleOpenReceiptForCustomer = (debtItem) => {
    setReceiptInitialData({
      party_type: 'customer',
      vehicle_id: debtItem.id,
      customer_name: debtItem.customer_name,
      plate_number: debtItem.plate_number,
      balance_due: debtItem.balance_due,
      description: `تحصيل دفعة نقدية من حساب العميل (${debtItem.plate_number})`,
    });
    setShowReceiptModal(true);
  };

  // Launch Payment Modal for specific type
  const handleOpenPayment = (partyType = 'owner', initial = {}) => {
    setPaymentInitialData({
      party_type: partyType,
      ...initial,
    });
    setShowPaymentModal(true);
  };

  // Filtered Vouchers
  const filteredReceipts = useMemo(() => {
    return vouchers.filter((v) => {
      if (v.voucher_type !== 'receipt') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = v.voucher_number?.toLowerCase().includes(q);
        const matchParty = v.party_name?.toLowerCase().includes(q);
        const matchPaper = v.paper_bill_number?.toLowerCase().includes(q);
        const matchDesc = v.description?.toLowerCase().includes(q);
        if (!matchNum && !matchParty && !matchPaper && !matchDesc) return false;
      }
      return true;
    });
  }, [vouchers, searchQuery]);

  const filteredPayments = useMemo(() => {
    return vouchers.filter((v) => {
      if (v.voucher_type !== 'payment') return false;
      if (filterPartyType !== 'all' && v.party_type !== filterPartyType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = v.voucher_number?.toLowerCase().includes(q);
        const matchParty = v.party_name?.toLowerCase().includes(q);
        const matchPaper = v.paper_bill_number?.toLowerCase().includes(q);
        const matchDesc = v.description?.toLowerCase().includes(q);
        if (!matchNum && !matchParty && !matchPaper && !matchDesc) return false;
      }
      return true;
    });
  }, [vouchers, filterPartyType, searchQuery]);

  // Filtered Customer Debts
  const filteredDebts = useMemo(() => {
    if (!searchQuery.trim()) return customerDebts;
    const q = searchQuery.toLowerCase();
    return customerDebts.filter(
      (c) =>
        c.customer_name?.toLowerCase().includes(q) ||
        c.plate_number?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.corporate_name?.toLowerCase().includes(q)
    );
  }, [customerDebts, searchQuery]);

  // Calculations
  const totalCustomerDebts = useMemo(() => {
    return customerDebts.reduce((sum, c) => sum + (Number(c.balance_due) || 0), 0);
  }, [customerDebts]);

  const totalOwnerDrawingsMonth = useMemo(() => {
    return vouchers
      .filter((v) => v.voucher_type === 'payment' && v.party_type === 'owner')
      .reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
  }, [vouchers]);

  const totalExpensesMonth = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  return (
    <div className="flex-1 flex flex-col min-h-full bg-slate-950 text-slate-100 select-none pb-8">
      {/* 1. Header & Command Bar */}
      <div className="flex-shrink-0 p-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            <Landmark className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>الخزينة والمحاسبة وسندات القبض والصرف</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                قيد محاسبي مزدوج
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              الصندوق النقدي الحي (1101) • مسحوبات المالك الشخصية (3101) • تحصيلات ذمم العملاء
            </p>
          </div>
        </div>

        {/* Action Buttons & Style Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Vault Style Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-white/10 text-xs">
            <span className="text-slate-400 text-[11px] font-bold px-1.5">الشكل:</span>
            <button
              type="button"
              onClick={() => handleSetStyle('tactical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition tap-bounce ${
                vaultStyle === 'tactical'
                  ? 'bg-emerald-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title="الشكل 1: كاونتر الخزينة التكتيكي عالي التباين"
            >
              1. خزينة تكتيكية
            </button>
            <button
              type="button"
              onClick={() => handleSetStyle('touch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition tap-bounce ${
                vaultStyle === 'touch'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title="الشكل 2: بطاقات الخزائن والمحافظ اللمسية"
            >
              2. بطاقات لمسية
            </button>
            <button
              type="button"
              onClick={() => handleSetStyle('glass')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition tap-bounce ${
                vaultStyle === 'glass'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title="الشكل 3: المركز المالي الزجاجي الفاخر"
            >
              3. مركز زجاجي
            </button>
          </div>

          {/* Issue Receipt Voucher */}
          <button
            onClick={() => {
              setReceiptInitialData(null);
              setShowReceiptModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 border border-emerald-400/30 active:scale-95 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>سند قبض نقدية 📥</span>
          </button>

          {/* Issue Payment Voucher */}
          <button
            onClick={() => handleOpenPayment('expense')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-900/30 border border-rose-400/30 active:scale-95 transition-all"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>سند صرف نقدية 📤</span>
          </button>

          {/* Owner Drawings (Direct Shortcut) */}
          <button
            onClick={() => handleOpenPayment('owner', { description: 'مسحوبات شخصية نقدية للمالك' })}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-900/30 border border-purple-400/30 active:scale-95 transition-all"
            title="مسحوبات المالك الشخصية تخفض جاري المالك (3101) ولا تقلل صافي الربح التشغيلي"
          >
            <UserCheck className="w-4 h-4" />
            <span>مسحوبات المالك 👤</span>
          </button>

          {/* Upgrade 2: Cash Drawer Reconciliation */}
          <button
            onClick={() => setShowReconciliationModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-900/30 border border-amber-400/40 active:scale-95 transition-all"
            title="جرد ومطابقة المبلغ الإجمالي الفعلي الموجود في الصندوق مع الرصيد الدفتري (1101)"
          >
            <Scale className="w-4 h-4 stroke-[2.5]" />
            <span>جرد ومطابقة الصندوق 🧮</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 active:scale-95 transition-all"
            title="تحديث البيانات المالية"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Financial Pulse Cards (4 Core Metrics) */}
      <div className="flex-shrink-0 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/40">
        {/* Card 1: Main Cash Drawer 1101 */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-900/90 border border-emerald-500/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              الصندوق النقدي الحي (1101)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
              نقدية الدرج
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
            {Number(cashDrawer?.cash_drawer?.current_balance || 0).toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">ريال</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/5 pt-1.5">
            <span>الكريمي: {Number(cashDrawer?.bank_kuraimi?.current_balance || 0).toLocaleString()}</span>
            <span>جيب: {Number(cashDrawer?.e_wallet_jeeb?.current_balance || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Today's Inflows */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>مقبوضات الصندوق اليوم</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
            +{Number(cashDrawer?.today?.cash_inflow || 0).toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">ريال</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/5 pt-1.5">
            <span>سندات قبض: {cashDrawer?.today?.count_receipts_today || 0}</span>
            <span className="text-emerald-400/80">شامل مبيعات الكاش والقبوضات</span>
          </div>
        </div>

        {/* Card 3: Today's Outflows */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>مدفوعات الصندوق اليوم</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
            -{Number(cashDrawer?.today?.cash_outflow || 0).toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">ريال</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/5 pt-1.5">
            <span>سندات صرف: {cashDrawer?.today?.count_payments_today || 0}</span>
            <span className="text-rose-400/80">شامل المشتريات والمصروفات</span>
          </div>
        </div>

        {/* Card 4: Customer Receivables (Total Unpaid Debts) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>ديون العملاء المطلوبة (الذمم 1201)</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
            {totalCustomerDebts.toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-normal">ريال</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/5 pt-1.5">
            <span>عدد المركبات المدينة: {customerDebts.length}</span>
            <button
              onClick={() => setActiveTab('debts')}
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              عرض التحصيلات ←
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tab Navigation Bar */}
      <div className="flex-shrink-0 px-4 pt-2 border-b border-white/10 bg-slate-900/30 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 min-w-max pb-2">
          <button
            onClick={() => setActiveTab('drawer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'drawer'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>حسابات النقدية والصندوق</span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'receipts'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>سجل سندات القبض (RV)</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] text-slate-300 font-mono">
              {filteredReceipts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            <span>سجل سندات الصرف (PV)</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] text-slate-300 font-mono">
              {filteredPayments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'debts'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>ديون وتحصيلات العملاء</span>
            {customerDebts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-bold">
                {customerDebts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'expenses'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Building className="w-4 h-4 text-purple-400" />
            <span>المصروفات التشغيلية</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] text-slate-300 font-mono">
              {expenses.length}
            </span>
          </button>
        </div>

        {/* Global Search Input within tabs */}
        <div className="relative min-w-[220px] max-w-xs pb-2">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث برقم السند، العميل، الدفتر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* ======================================================== */}
        {/* TAB 1: CASH DRAWER & ACCOUNTS (الصندوق وحسابات النقدية) */}
        {/* ======================================================== */}
        {activeTab === 'drawer' && (
          <div className="space-y-6">
            {/* Account Balances Grid - 3 Conditional Styles */}
            {vaultStyle === 'tactical' ? (
              /* ============================================================
                 STYLE 1: الخزينة التكتيكية فائقة التباين (Tactical Cash Desk)
                 كاونتر مالي سريع وعالي الكثافة مع اختصارات فورية للعمليات
                 ============================================================ */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Tactical Drawer Cash 1101 */}
                <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-emerald-500/50 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h3 className="font-extrabold text-white text-sm">درج الصندوق النقدي</h3>
                      </div>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        1101
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="text-xs text-slate-400 mb-0.5">النقدية الفعلية الحية:</div>
                      <div className="text-3xl font-black text-white font-mono tracking-tight">
                        {Number(cashDrawer?.cash_drawer?.current_balance || 0).toLocaleString()}{' '}
                        <span className="text-xs text-emerald-400 font-sans font-bold">ريال</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-1">
                        {tafqeet(Number(cashDrawer?.cash_drawer?.current_balance || 0))}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">وارد الصندوق:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{Number(cashDrawer?.cash_drawer?.total_inflow || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-950/70 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">صادر الصندوق:</span>
                      <span className="font-mono font-bold text-rose-400">
                        -{Number(cashDrawer?.cash_drawer?.total_outflow || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tactical Bank Al-Kuraimi 1102 */}
                <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-blue-500/40 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-blue-400" />
                        <h3 className="font-extrabold text-white text-sm">بنك الكريمي</h3>
                      </div>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        1102
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="text-xs text-slate-400 mb-0.5">رصيد التحويلات البنكية:</div>
                      <div className="text-3xl font-black text-blue-400 font-mono tracking-tight">
                        {Number(cashDrawer?.bank_kuraimi?.current_balance || 0).toLocaleString()}{' '}
                        <span className="text-xs text-slate-400 font-sans font-bold">ريال</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-1">
                        {tafqeet(Number(cashDrawer?.bank_kuraimi?.current_balance || 0))}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>حساب بنكي نشط</span>
                    <button
                      type="button"
                      onClick={() => handleOpenPayment('supplier')}
                      className="text-blue-400 hover:text-blue-300 font-bold"
                    >
                      سداد مورد بنكياً ←
                    </button>
                  </div>
                </div>

                {/* Tactical E-Wallet Jeeb 1103 */}
                <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-500/40 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <h3 className="font-extrabold text-white text-sm">محفظة جيب الإلكترونية</h3>
                      </div>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        1103
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="text-xs text-slate-400 mb-0.5">رصيد الدفع الذكي:</div>
                      <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                        {Number(cashDrawer?.e_wallet_jeeb?.current_balance || 0).toLocaleString()}{' '}
                        <span className="text-xs text-slate-400 font-sans font-bold">ريال</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-1">
                        {tafqeet(Number(cashDrawer?.e_wallet_jeeb?.current_balance || 0))}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>مدفوعات QR سريعة</span>
                    <span className="text-[11px] text-amber-400/90 font-bold">تسوية فورية</span>
                  </div>
                </div>
              </div>
            ) : vaultStyle === 'glass' ? (
              /* ============================================================
                 STYLE 3: المركز المالي التنفيذي الفاخر (Executive Apple Glass)
                 تصميم زجاجي عائم مع تأثيرات بصرية وإضاءات نيون للمؤشرات
                 ============================================================ */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Glass Drawer Cash 1101 */}
                <div className="relative overflow-hidden rounded-3xl p-5 border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl hover:border-emerald-500/40 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">الصندوق الحي (الدرج)</h3>
                        <p className="text-[11px] text-emerald-400/80 font-mono">حساب رقم: 1101</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      سيولة كاش
                    </span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono my-2.5">
                    {Number(cashDrawer?.cash_drawer?.current_balance || 0).toLocaleString()}{' '}
                    <span className="text-xs text-emerald-400 font-sans font-bold">ريال</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 truncate">
                    {tafqeet(Number(cashDrawer?.cash_drawer?.current_balance || 0))}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">إجمالي الوارد</span>
                      <span className="font-mono text-emerald-300 font-bold">
                        +{Number(cashDrawer?.cash_drawer?.total_inflow || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">إجمالي الصادر</span>
                      <span className="font-mono text-rose-300 font-bold">
                        -{Number(cashDrawer?.cash_drawer?.total_outflow || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Glass Bank Al-Kuraimi 1102 */}
                <div className="relative overflow-hidden rounded-3xl p-5 border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl hover:border-blue-500/40 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/30 shadow-inner">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">بنك الكريمي</h3>
                        <p className="text-[11px] text-blue-400/80 font-mono">حساب رقم: 1102</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                      تحويل بنكي
                    </span>
                  </div>
                  <div className="text-3xl font-black text-cyan-300 font-mono my-2.5">
                    {Number(cashDrawer?.bank_kuraimi?.current_balance || 0).toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-sans font-bold">ريال</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 truncate">
                    {tafqeet(Number(cashDrawer?.bank_kuraimi?.current_balance || 0))}
                  </p>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 flex justify-between items-center">
                    <span>العمليات المحولة عبر الكريمي</span>
                    <span className="text-[10px] text-cyan-400 font-bold font-mono">AL-KURAIMI</span>
                  </div>
                </div>

                {/* Glass E-Wallet Jeeb 1103 */}
                <div className="relative overflow-hidden rounded-3xl p-5 border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl hover:border-purple-500/40 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-400 to-purple-500" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30 shadow-inner">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">محفظة جيب الإلكترونية</h3>
                        <p className="text-[11px] text-purple-400/80 font-mono">حساب رقم: 1103</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                      محفظة ذكية
                    </span>
                  </div>
                  <div className="text-3xl font-black text-purple-300 font-mono my-2.5">
                    {Number(cashDrawer?.e_wallet_jeeb?.current_balance || 0).toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-sans font-bold">ريال</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 truncate">
                    {tafqeet(Number(cashDrawer?.e_wallet_jeeb?.current_balance || 0))}
                  </p>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 flex justify-between items-center">
                    <span>مدفوعات QR الرقمية</span>
                    <span className="text-[10px] text-purple-400 font-bold font-mono">JEEB PAY</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ============================================================
                 STYLE 2: بطاقات الخزائن والمحافظ اللمسية (Tactile Touch Vault)
                 بطاقات خزائن عريضة بمسافات لمس رحبة للورشة وشاشات الكيوسك
                 ============================================================ */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Drawer Cash 1101 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 shadow-xl relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">الصندوق النقدي (الدرج)</h3>
                        <p className="text-[11px] text-slate-400 font-mono">دليل الحسابات: 1101</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      النقدية المتاحة
                    </span>
                  </div>
                  <div className="text-3xl font-black text-emerald-400 font-mono my-2">
                    {Number(cashDrawer?.cash_drawer?.current_balance || 0).toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-normal">ريال</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    {tafqeet(Number(cashDrawer?.cash_drawer?.current_balance || 0))}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">إجمالي الوارد التراكمي:</span>
                      <span className="font-mono text-slate-200">
                        {Number(cashDrawer?.cash_drawer?.total_inflow || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">إجمالي الصادر التراكمي:</span>
                      <span className="font-mono text-slate-200">
                        {Number(cashDrawer?.cash_drawer?.total_outflow || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Al-Kuraimi 1102 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-2 border-blue-500/30 shadow-xl relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">حساب بنك الكريمي</h3>
                        <p className="text-[11px] text-slate-400 font-mono">دليل الحسابات: 1102</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                      تحويل بنكي
                    </span>
                  </div>
                  <div className="text-3xl font-black text-blue-400 font-mono my-2">
                    {Number(cashDrawer?.bank_kuraimi?.current_balance || 0).toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-normal">ريال</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    {tafqeet(Number(cashDrawer?.bank_kuraimi?.current_balance || 0))}
                  </p>
                  <div className="pt-3 border-t border-white/10 text-xs text-slate-400">
                    <span>سندات القبض والصرف المحولة عبر الكريمي</span>
                  </div>
                </div>

                {/* E-Wallet Jeeb 1103 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/30 shadow-xl relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">محفظة جيب الإلكترونية</h3>
                        <p className="text-[11px] text-slate-400 font-mono">دليل الحسابات: 1103</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      محفظة ذكية
                    </span>
                  </div>
                  <div className="text-3xl font-black text-amber-400 font-mono my-2">
                    {Number(cashDrawer?.e_wallet_jeeb?.current_balance || 0).toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-normal">ريال</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    {tafqeet(Number(cashDrawer?.e_wallet_jeeb?.current_balance || 0))}
                  </p>
                  <div className="pt-3 border-t border-white/10 text-xs text-slate-400">
                    <span>سندات القبض والدفع عبر محفظة جيب</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pro Upgrade 3: Owner Drawings Safety Gauge & Profit Ratio */}
            {ownerAnalytics && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900 to-slate-900 border border-purple-500/30 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>مؤشر أمان مسحوبات المالك مقارنة بأرباح الشهر (جاري المالك 3101)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        شهر {ownerAnalytics.current_month} • قياس نسبة السحب لحماية رأس المال العامل
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black border ${
                      ownerAnalytics.status === 'safe'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : ownerAnalytics.status === 'caution'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : ownerAnalytics.status === 'zero'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    }`}
                  >
                    {ownerAnalytics.status === 'safe'
                      ? '🟢 سحب آمن (أقل من 70% من أرباح الشهر)'
                      : ownerAnalytics.status === 'caution'
                      ? '🟡 تنبيه: السحب يقترب من كامل الأرباح'
                      : ownerAnalytics.status === 'zero'
                      ? '✨ لم تسجل مسحوبات مالك هذا الشهر'
                      : '🔴 تحذير: استنزاف رأس المال العامل'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ownerAnalytics.status === 'safe'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : ownerAnalytics.status === 'caution'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-rose-500 to-red-600'
                      }`}
                      style={{ width: `${Math.min(100, ownerAnalytics.ratio_percent || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">أرباح الشهر الصافية:</span>
                    <span className="font-black text-emerald-400">
                      {Number(ownerAnalytics.net_operating_profit || 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">مسحوبات المالك:</span>
                    <span className="font-black text-purple-300">
                      {Number(ownerAnalytics.total_drawings || 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">نسبة السحب من الربح:</span>
                    <span className="font-black text-amber-300">
                      {ownerAnalytics.ratio_percent}%
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">حد السحب الآمن (70%):</span>
                    <span className="font-black text-slate-200">
                      {Number(ownerAnalytics.safe_cap_amount || 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pro Upgrade 5: Cash Flow Movement Analytics */}
            {cashFlowData && (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
                      <BarChart2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>تحليلات حركة وتدفقات النقدية للصندوق (حساب 1101)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                          {cashFlowDays} يوماً
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        تتبع المقبوضات النقدية والمدفوعات اليومية واكتشاف أيام ذروة التحصيل
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                    {[7, 14, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => setCashFlowDays(d)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          cashFlowDays === d
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        آخر {d} أيام
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                    <span className="text-[10px] text-slate-400 block font-sans">إجمالي المقبوضات بالفترة:</span>
                    <span className="text-base font-black text-emerald-400">
                      +{Number(cashFlowData.summary?.total_inflow || 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20">
                    <span className="text-[10px] text-slate-400 block font-sans">إجمالي المدفوعات بالفترة:</span>
                    <span className="text-base font-black text-rose-400">
                      -{Number(cashFlowData.summary?.total_outflow || 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10">
                    <span className="text-[10px] text-slate-400 block font-sans">صافي السيولة الناتجة:</span>
                    <span
                      className={`text-base font-black ${
                        Number(cashFlowData.summary?.net_cash_flow) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {Number(cashFlowData.summary?.net_cash_flow || 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
                    <span className="text-[10px] text-slate-400 block font-sans">يوم ذروة التحصيل:</span>
                    <span className="text-sm font-black text-amber-300">
                      {cashFlowData.summary?.peak_inflow_day || '---'}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      ({Number(cashFlowData.summary?.peak_inflow_amount || 0).toLocaleString()} ر.ي)
                    </span>
                  </div>
                </div>

                {/* Visual Timeline Dual-Bar Representation */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] text-slate-400 font-bold block">
                    مقارنة حركة الوارد (أخضر) والصادر (أحمر) يومياً:
                  </span>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {cashFlowData.daily_timeline?.map((item) => {
                      const maxVal = Math.max(item.inflow, item.outflow, 1);
                      return (
                        <div
                          key={item.day_date}
                          className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono"
                        >
                          <span className="w-24 text-[11px] text-slate-300 font-bold flex-shrink-0">
                            {item.day_date}
                          </span>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-[10px] text-emerald-400 text-left">
                                +{item.inflow.toLocaleString()}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, (item.inflow / maxVal) * 100)}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-[10px] text-rose-400 text-left">
                                -{item.outflow.toLocaleString()}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full"
                                  style={{ width: `${Math.min(100, (item.outflow / maxVal) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <span
                            className={`w-20 text-left font-black text-xs ${
                              item.net_cash >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.net_cash > 0 ? `+${item.net_cash.toLocaleString()}` : item.net_cash.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Banner & Rules */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>قواعد التدفق المالي المعتمدة للمركز</span>
                </h4>
                <p className="text-xs text-slate-400">
                  النقدية تبقى دائماً في الصندوق النقدي (1101) بدون أي ترحيل إجباري • مسحوبات المالك الشخصية تسجل بسند صرف يحسب على جاري المالك (3101) لحماية دقة أرباح المركز التشغيلية.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPayment('owner')}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold text-xs border border-purple-500/40 transition-colors"
                >
                  إجراء سحب مالك 👤
                </button>
                <button
                  onClick={() => setShowExpenseCategoriesModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-white/10 transition-colors"
                >
                  بنود المصروفات 🏷️
                </button>
              </div>
            </div>

            {/* Recent Live Vouchers Stream */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>آخر حركات السندات والتدفقات الصادرة والواردة</span>
                </h3>
                <span className="text-xs text-slate-400">عرض أحدث {Math.min(10, vouchers.length)} حركة</span>
              </div>

              {vouchers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  لا توجد حركات مسجلة حتى الآن. استخدم أزرار سند قبض أو صرف لإضافة أول حركة.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {vouchers.slice(0, 10).map((v) => {
                    const isReceipt = v.voucher_type === 'receipt';
                    const isOwner = v.party_type === 'owner';
                    return (
                      <div
                        key={v.id}
                        className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isReceipt
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isOwner
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isReceipt ? 'قبض' : isOwner ? 'مالك' : 'صرف'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-white">
                                {v.voucher_number}
                              </span>
                              {v.paper_bill_number && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
                                  دفتر: {v.paper_bill_number}
                                </span>
                              )}
                              {isOwner && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-medium border border-purple-500/30">
                                  جاري المالك 3101
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 font-medium">
                              {v.party_name} • <span className="text-slate-400">{v.description}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-left">
                          <div>
                            <span
                              className={`text-base font-black font-mono block ${
                                isReceipt ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isReceipt ? '+' : '-'}
                              {Number(v.amount).toLocaleString()}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">ريال</span>
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(v.created_at).toLocaleDateString('ar-YE', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => setViewingVoucher(v)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors"
                            title="معاينة وطباعة السند"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: RECEIPT VOUCHERS ARCHIVE (سجل سندات القبض)       */}
        {/* ======================================================== */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-400">
                إجمالي سندات القبض المعتمدة:{' '}
                <span className="text-white font-bold font-mono">{filteredReceipts.length}</span> سند
              </div>
              <button
                onClick={() => {
                  setReceiptInitialData(null);
                  setShowReceiptModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border border-emerald-400/30 transition-all shadow-md shadow-emerald-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار سند قبض جديد</span>
              </button>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 font-medium">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">المستلم منه (العميل)</th>
                      <th className="p-3">طريقة القبض</th>
                      <th className="p-3">رقم الدفتر</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3 text-left">المبلغ</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReceipts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-500">
                          لا توجد سندات قبض مطابقة للبحث
                        </td>
                      </tr>
                    ) : (
                      filteredReceipts.map((v) => (
                        <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-mono font-bold text-white">
                            <span className="text-emerald-400">{v.voucher_number}</span>
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {new Date(v.created_at).toLocaleString('ar-YE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="p-3 font-semibold text-white">
                            {v.party_name}
                            {v.prev_balance > 0 && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                الرصيد السابق: {Number(v.prev_balance).toLocaleString()} | المتبقي:{' '}
                                {Number(v.new_balance || 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] border border-white/10">
                              {v.payment_method === 'cash'
                                ? '💵 نقداً (الصندوق 1101)'
                                : v.payment_method === 'kuraimi'
                                ? '🏦 بنك الكريمي (1102)'
                                : '📱 محفظة جيب (1103)'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-amber-300">
                            {v.paper_bill_number || '-'}
                          </td>
                          <td className="p-3 text-slate-300 max-w-[200px] truncate" title={v.description}>
                            {v.description}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-emerald-400 text-sm">
                            +{Number(v.amount).toLocaleString()}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">ريال</span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setViewingVoucher(v)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors text-[11px] inline-flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PAYMENT VOUCHERS ARCHIVE (سجل سندات الصرف)      */}
        {/* ======================================================== */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">تصفية حسب نوع المستفيد:</span>
                <select
                  value={filterPartyType}
                  onChange={(e) => setFilterPartyType(e.target.value)}
                  className="px-3 py-1 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="all">كل الأنواع ({vouchers.filter((v) => v.voucher_type === 'payment').length})</option>
                  <option value="owner">مسحوبات المالك (جاري المالك 3101)</option>
                  <option value="supplier">سداد موردين (1201)</option>
                  <option value="worker">سلف ومستحقات عمال (1202)</option>
                  <option value="expense">مصروفات تشغيلية (5109)</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPayment('owner')}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs border border-purple-400/30 transition-all shadow-md"
                >
                  + مسحوبات مالك 👤
                </button>
                <button
                  onClick={() => handleOpenPayment('expense')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs border border-rose-400/30 transition-all shadow-md"
                >
                  + سند صرف نقدية 📤
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 font-medium">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">المستفيد</th>
                      <th className="p-3">تصنيف الصرف</th>
                      <th className="p-3">حساب الدفع</th>
                      <th className="p-3">رقم الدفتر</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3 text-left">المبلغ</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="p-8 text-center text-slate-500">
                          لا توجد سندات صرف مطابقة للبحث أو الفلتر
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((v) => {
                        const isOwner = v.party_type === 'owner';
                        return (
                          <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 font-mono font-bold text-white">
                              <span className={isOwner ? 'text-purple-400' : 'text-rose-400'}>
                                {v.voucher_number}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-[11px]">
                              {new Date(v.created_at).toLocaleString('ar-YE', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="p-3 font-semibold text-white">
                              {v.party_name}
                            </td>
                            <td className="p-3">
                              {isOwner ? (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                                  👤 جاري المالك (3101)
                                </span>
                              ) : v.party_type === 'supplier' ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
                                  📦 سداد مورد
                                </span>
                              ) : v.party_type === 'worker' ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                                  👷 سلفة عامل
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] border border-white/10">
                                  🏷️ مصروف تشغيلي
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-300">
                              {v.payment_method === 'cash'
                                ? '💵 الصندوق (1101)'
                                : v.payment_method === 'kuraimi'
                                ? '🏦 الكريمي (1102)'
                                : '📱 جيب (1103)'}
                            </td>
                            <td className="p-3 font-mono text-amber-300">
                              {v.paper_bill_number || '-'}
                            </td>
                            <td className="p-3 text-slate-300 max-w-[200px] truncate" title={v.description}>
                              {v.description}
                            </td>
                            <td className="p-3 text-left font-mono font-black text-rose-400 text-sm">
                              -{Number(v.amount).toLocaleString()}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">ريال</span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => setViewingVoucher(v)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors text-[11px] inline-flex items-center gap-1.5"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CUSTOMER DEBTS & RECEIVABLES (ديون وتحصيلات العملاء) */}
        {/* ======================================================== */}
        {activeTab === 'debts' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>تحصيلات ديون وذمم العملاء (حساب 1201)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  عند قبض أي دفعة من العميل، يتم إصدار سند قبض رسمي فوري، وخصم المديونية آلياً، وترحيل القيد المحاسبي المزدوج.
                </p>
              </div>
              <div className="text-left font-mono">
                <span className="text-xs text-slate-400 block">إجمالي الذمم غير المحصلة:</span>
                <span className="text-xl font-black text-amber-400">
                  {totalCustomerDebts.toLocaleString()} ريال
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 font-medium">
                    <tr>
                      <th className="p-3">رقم اللوحة</th>
                      <th className="p-3">اسم العميل / الشركة</th>
                      <th className="p-3">نوع العميل</th>
                      <th className="p-3">نوع السيارة</th>
                      <th className="p-3">رقم الجوال</th>
                      <th className="p-3">آخر زيارة</th>
                      <th className="p-3 text-left">المديونية الحالية</th>
                      <th className="p-3 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredDebts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-500">
                          {searchQuery
                            ? 'لا توجد نتائج بحث مطابقة'
                            : 'لا توجد ديون مستحقة على أي عميل حالياً! (ممتاز 🎉)'}
                        </td>
                      </tr>
                    ) : (
                      filteredDebts.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-mono font-bold text-white">
                            <span className="px-2 py-1 rounded bg-slate-800 border border-white/10">
                              {c.plate_number}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-white">
                            {c.customer_name}
                            {c.corporate_name && (
                              <span className="block text-[10px] text-blue-400 font-normal">
                                شركة: {c.corporate_name}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                c.customer_type === 'corporate'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {c.customer_type === 'corporate' ? 'أسطول / شركة' : 'عميل فردي'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">{c.car_make_model || '-'}</td>
                          <td className="p-3 font-mono text-slate-300" dir="ltr">
                            {c.phone || '-'}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {c.last_service_date || '-'}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-amber-400 text-sm">
                            {Number(c.balance_due).toLocaleString()}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">ريال</span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* One-click Receipt Voucher Button */}
                              <button
                                onClick={() => handleOpenReceiptForCustomer(c)}
                                className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 border border-emerald-400/30 transition-all flex items-center gap-1"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>قبض دفعة 🧾</span>
                              </button>

                              {/* Statement of Account */}
                              {onOpenStatement && (
                                <button
                                  onClick={() => onOpenStatement('customer', c.id)}
                                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors text-xs flex items-center gap-1"
                                  title="عرض كشف حساب تفصيلي"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>كشف حساب</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: OPERATING EXPENSES (المصروفات التشغيلية)         */}
        {/* ======================================================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  إجمالي المصروفات المسجلة: <span className="font-bold text-white font-mono">{expenses.length}</span>
                </span>
                <span className="text-xs text-rose-400 font-mono font-bold mr-2">
                  (المجموع: {totalExpensesMonth.toLocaleString()} ريال)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExpenseCategoriesModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors"
                >
                  إدارة بنود المصروفات 🏷️
                </button>
                <button
                  onClick={() => handleOpenPayment('expense')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs border border-rose-400/30 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل مصروف جديد</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-white/10 font-medium">
                    <tr>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">بند المصروف</th>
                      <th className="p-3">البيان والتفاصيل</th>
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3">المسؤول</th>
                      <th className="p-3 text-left">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">
                          لا توجد مصروفات مسجلة
                        </td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {new Date(e.created_at || Date.now()).toLocaleString('ar-YE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="p-3 font-semibold text-white">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 text-[10px] border border-white/10">
                              {e.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">{e.description || '-'}</td>
                          <td className="p-3 text-slate-300">
                            {e.payment_method === 'cash' ? '💵 نقداً' : e.payment_method}
                          </td>
                          <td className="p-3 text-slate-400">{e.created_by || 'أمين الصندوق'}</td>
                          <td className="p-3 text-left font-mono font-black text-rose-400 text-sm">
                            -{Number(e.amount).toLocaleString()}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">ريال</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VOUCHER PREVIEW / PRINT MODAL                           */}
      {/* ======================================================== */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>
                  معاينة وطباعة {viewingVoucher.voucher_type === 'receipt' ? 'سند قبض' : 'سند صرف'}
                </span>
              </h3>
              <button
                onClick={() => setViewingVoucher(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white text-slate-950 rounded-b-2xl font-sans" dir="rtl">
              {/* Receipt Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <h2 className="text-base font-black text-slate-900">
                  {getShopSettings().shopName || 'مركز الصقر لخدمات السيارات'}
                </h2>
                <p className="text-[11px] text-slate-600">
                  {getShopSettings().address || 'صنعاء - اليمن'} • هاتف: {getShopSettings().shopPhone || '777000111'}
                </p>
                <div className="mt-2 inline-block px-4 py-1 rounded bg-slate-900 text-white font-bold text-sm">
                  {viewingVoucher.voucher_type === 'receipt' ? 'سند قبض نقدية' : 'سند صرف نقدية'}
                </div>
              </div>

              {/* Voucher Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-300 pb-2">
                <div>
                  <span className="text-slate-500">رقم السند: </span>
                  <span className="font-mono font-bold text-slate-900">{viewingVoucher.voucher_number}</span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-slate-500">التاريخ: </span>
                  <span className="font-bold text-slate-900">
                    {new Date(viewingVoucher.created_at).toLocaleDateString('ar-YE')}
                  </span>
                </div>
                {viewingVoucher.paper_bill_number && (
                  <div>
                    <span className="text-slate-500">رقم الدفتر اليدوي: </span>
                    <span className="font-mono font-bold text-amber-700">
                      {viewingVoucher.paper_bill_number}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">طريقة الدفع: </span>
                  <span className="font-semibold text-slate-900">
                    {viewingVoucher.payment_method === 'cash' ? 'نقداً (الصندوق)' : viewingVoucher.payment_method}
                  </span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 text-center">
                <div className="text-xs text-slate-600">المبلغ المدفوع:</div>
                <div className="text-2xl font-black font-mono text-slate-950">
                  {Number(viewingVoucher.amount).toLocaleString()} ريال يمني
                </div>
                <div className="text-xs text-slate-700 font-semibold mt-1">
                  فقط {tafqeet(Number(viewingVoucher.amount))} لا غير.
                </div>
              </div>

              {/* Party Details */}
              <div className="text-xs space-y-1.5 border-b border-slate-300 pb-3">
                <div className="flex">
                  <span className="text-slate-500 w-24">
                    {viewingVoucher.voucher_type === 'receipt' ? 'استلمنا من:' : 'صرفنا إلى:'}
                  </span>
                  <span className="font-bold text-slate-900">{viewingVoucher.party_name}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 w-24">وذلك عن:</span>
                  <span className="text-slate-800">{viewingVoucher.description}</span>
                </div>
                {viewingVoucher.notes && (
                  <div className="flex">
                    <span className="text-slate-500 w-24">ملاحظات:</span>
                    <span className="text-slate-600">{viewingVoucher.notes}</span>
                  </div>
                )}
              </div>

              {/* Balance Breakdown if customer debt */}
              {viewingVoucher.prev_balance > 0 && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs flex justify-between">
                  <span>الرصيد السابق: {Number(viewingVoucher.prev_balance).toLocaleString()}</span>
                  <span>الدفعة: {Number(viewingVoucher.amount).toLocaleString()}</span>
                  <span className="font-bold text-amber-900">
                    المتبقي: {Number(viewingVoucher.new_balance || 0).toLocaleString()} ريال
                  </span>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4">
                <div>
                  <div className="text-slate-500 mb-6">توقيع المستلم</div>
                  <div className="border-t border-slate-400 mx-4"></div>
                </div>
                <div>
                  <div className="text-slate-500 mb-6">أمين الصندوق / الإدارة</div>
                  <div className="border-t border-slate-400 mx-4"></div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                إغلاق
              </button>

              <div className="flex items-center gap-2">
                {viewingVoucher.voucher_type === 'receipt' && (
                  <a
                    href={formatYemeniWhatsAppLink(
                      customerDebts.find((c) => c.id === viewingVoucher.party_id)?.phone || '',
                      `*سند قبض مالي رسمي - ${getShopSettings().shopName || 'مركز الصقر'}* 🦅\nتحية طيبة أخي الكريم: *${viewingVoucher.party_name}*\nتم استلام دفعة من حسابكم بموجب:\n📄 *سند قبض رقم:* ${viewingVoucher.voucher_number}${viewingVoucher.paper_bill_number ? `\n📑 رقم السند الدفتري: ${viewingVoucher.paper_bill_number}` : ''}\n💵 *المبلغ المستلم:* ${Number(viewingVoucher.amount).toLocaleString()} ريال يمني (${tafqeet(Number(viewingVoucher.amount))})\n💳 *طريقة الدفع:* ${viewingVoucher.payment_method === 'cash' ? 'نقداً بالصندوق' : viewingVoucher.payment_method}${viewingVoucher.prev_balance > 0 ? `\n\n📊 *تفاصيل الحساب:*\n- الرصيد السابق: ${Number(viewingVoucher.prev_balance).toLocaleString()} ر.ي\n- الدفعة المقبوضة: ${Number(viewingVoucher.amount).toLocaleString()} ر.ي\n- الرصيد المتبقي عليكم: ${Number(viewingVoucher.new_balance).toLocaleString()} ر.ي` : ''}\n\nنسعد دائماً بخدمتكم وشكراً لتعاملكم معنا! 🤝`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>إشعار واتساب 📱</span>
                  </a>
                )}

                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECEIPT VOUCHER MODAL (سند قبض)                         */}
      {/* ======================================================== */}
      <ReceiptVoucherModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptInitialData(null);
        }}
        initialData={receiptInitialData}
        vehicles={customerDebts}
        onVoucherCreated={() => {
          handleRefresh();
        }}
      />

      {/* ======================================================== */}
      {/* GENERAL PAYMENT VOUCHER MODAL (سند صرف ومسحوبات مالك)   */}
      {/* ======================================================== */}
      <GeneralPaymentVoucherModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentInitialData(null);
        }}
        initialData={paymentInitialData}
        suppliers={suppliers}
        workers={workers}
        onVoucherCreated={() => {
          handleRefresh();
        }}
      />

      {/* ======================================================== */}
      {/* EXPENSE CATEGORIES MODAL (إدارة بنود المصروفات)          */}
      {/* ======================================================== */}
      <ExpenseCategoriesModal
        isOpen={showExpenseCategoriesModal}
        onClose={() => {
          setShowExpenseCategoriesModal(false);
          handleRefresh();
        }}
      />

      {/* ======================================================== */}
      {/* CASH DRAWER RECONCILIATION MODAL (جرد الصندوق ومطابقة الفوارق) */}
      {/* ======================================================== */}
      <CashDrawerReconciliationModal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
        onReconciliationSaved={() => {
          handleRefresh();
        }}
      />
    </div>
  );
}
