import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Car,
  Receipt,
  Share2,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Tag,
  Wallet,
  Clock,
  Send,
  Building,
  Edit3,
  X,
} from 'lucide-react';
import ExpenseCategoriesModal from './ExpenseCategoriesModal';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';
import { getLocalTodayDate } from '../utils/dateUtils';

export default function WorkersView({ workers = [], onRefreshData, onOpenCustomerStatement, onOpenWorkerStatement }) {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'expenses' | 'debts' | 'transactions'
  const [workerStats, setWorkerStats] = useState([]);
  const [expensesCategories, setExpensesCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debtVehicles, setDebtVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('فني غيار زيوت وبنشر');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerWage, setNewWorkerWage] = useState('');
  const [addWorkerError, setAddWorkerError] = useState('');

  // Edit Worker Modal state
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerRole, setEditWorkerRole] = useState('');
  const [editWorkerPhone, setEditWorkerPhone] = useState('');
  const [editWorkerWage, setEditWorkerWage] = useState('');
  const [editWorkerError, setEditWorkerError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedWorkerForAdvance, setSelectedWorkerForAdvance] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');

  // Wage Payout / Settlement Modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedWorkerForPayout, setSelectedWorkerForPayout] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('cash');
  const [payoutPaperBill, setPayoutPaperBill] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [attendanceTogglingId, setAttendanceTogglingId] = useState(null);

  const [showDebtPayModal, setShowDebtPayModal] = useState(false);
  const [selectedVehicleForDebt, setSelectedVehicleForDebt] = useState(null);
  const [debtPayAmount, setDebtPayAmount] = useState('');
  const [debtPayMethod, setDebtPayMethod] = useState('cash');
  const [debtPayNotes, setDebtPayNotes] = useState('');
  const [completedDebtReceipt, setCompletedDebtReceipt] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch All Workers Daily Stats
  const fetchWorkerStats = async () => {
    try {
      const res = await fetch('/api/workers/daily-stats');
      const data = await res.json();
      if (data.success) {
        setWorkerStats(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching worker daily stats:', e);
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName.trim()) {
      setAddWorkerError('يرجى كتابة اسم الفني أو العامل');
      return;
    }
    setIsSubmitting(true);
    setAddWorkerError('');
    try {
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkerName.trim(),
          role: newWorkerRole || 'فني غيار زيوت وبنشر',
          phone: newWorkerPhone.trim(),
          daily_base_wage: Number(newWorkerWage) || 0,
          commission_rate: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'فشل في حفظ بيانات العامل');
      setShowAddWorkerModal(false);
      setNewWorkerName('');
      setNewWorkerPhone('');
      setNewWorkerWage('');
      fetchWorkerStats();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setAddWorkerError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditWorker = (w) => {
    setEditingWorkerId(w.id);
    setEditWorkerName(w.name || '');
    setEditWorkerRole(w.role || '');
    setEditWorkerPhone(w.phone || '');
    setEditWorkerWage(w.daily_base_wage !== undefined ? String(w.daily_base_wage) : '0');
    setEditWorkerError('');
    setShowEditWorkerModal(true);
  };

  const handleUpdateWorker = async (e) => {
    e.preventDefault();
    if (!editWorkerName.trim()) {
      setEditWorkerError('يرجى كتابة اسم الفني');
      return;
    }
    if (!editWorkerRole.trim()) {
      setEditWorkerError('يرجى تحديد أو كتابة المسمى الوظيفي');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditWorkerError('');
      const res = await fetch(`/api/workers/${editingWorkerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editWorkerName.trim(),
          role: editWorkerRole.trim(),
          phone: editWorkerPhone.trim() || null,
          daily_base_wage: parseFloat(editWorkerWage) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل تحديث بيانات الفني');
      }

      setShowEditWorkerModal(false);
      await fetchWorkerStats();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error updating worker:', err);
      setEditWorkerError(err.message || 'حدث خطأ أثناء تعديل بيانات الفني');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 2. Fetch Expense Categories
  const fetchExpenseCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
      const data = await res.json();
      if (data.success) {
        setExpensesCategories(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  // 3. Fetch Transactions (حصرها بحركات اليوم الفعلي لضبط كروت اليومية)
  const fetchTransactions = async () => {
    try {
      const todayStr = getLocalTodayDate();
      const res = await fetch(`/api/transactions?date=${todayStr}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  // 4. Fetch Debt Vehicles (استعلام شامل لجميع ديون الزبائن دون تقييد LIMIT 25)
  const fetchDebtVehicles = async () => {
    try {
      const res = await fetch('/api/vouchers/customer-debts');
      const data = await res.json();
      if (data.success) {
        setDebtVehicles(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching debt vehicles:', e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchWorkerStats(),
      fetchExpenseCategories(),
      fetchTransactions(),
      fetchDebtVehicles(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Close open modals on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAddWorkerModal(false);
        setShowEditWorkerModal(false);
        setShowAdvanceModal(false);
        setShowPayoutModal(false);
        setShowDebtPayModal(false);
        setCompletedDebtReceipt(null);
        setShowCategoryModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Summary Metrics
  const totalAdvancesToday = useMemo(() => {
    return workerStats.reduce((acc, w) => {
      const adv = Number(w.advances_today ?? w.advances_taken_today ?? 0);
      return acc + (isNaN(adv) ? 0 : adv);
    }, 0);
  }, [workerStats]);

  const totalDailyWages = useMemo(() => {
    return workerStats.reduce((acc, w) => acc + (Number(w.today_wage ?? w.daily_base_wage) || 0), 0);
  }, [workerStats]);

  const totalCumulativeDueWorkers = useMemo(() => {
    return workerStats.reduce((acc, w) => acc + (Number(w.cumulative_balance) || 0), 0);
  }, [workerStats]);

  const totalOutstandingCustomerDebts = useMemo(() => {
    return debtVehicles.reduce((acc, v) => acc + (Number(v.balance_due) || 0), 0);
  }, [debtVehicles]);

  const todayExpensesList = useMemo(() => {
    return transactions.filter((t) => t.tx_type === 'expense');
  }, [transactions]);

  const totalExpensesToday = useMemo(() => {
    return todayExpensesList.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [todayExpensesList]);

  // Handle Toggle Attendance (حاضر / غائب)
  const handleToggleAttendance = async (workerId) => {
    try {
      setAttendanceTogglingId(workerId);
      const todayStr = getLocalTodayDate();
      const res = await fetch(`/api/workers/${workerId}/toggle-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'فشل تحديث حالة الحضور');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAttendanceTogglingId(null);
    }
  };

  // Handle Record Worker Advance (توليد سند صرف رسمي PV وربطه بالخزينة والوردية)
  const handleRecordAdvance = async (e) => {
    e.preventDefault();
    if (!selectedWorkerForAdvance || !advanceAmount || Number(advanceAmount) <= 0) {
      alert('يرجى تحديد المبلغ بشكل صحيح');
      return;
    }

    const advVal = Number(advanceAmount);
    const workerId = selectedWorkerForAdvance.id;
    const currentBalance = Number(selectedWorkerForAdvance.cumulative_balance || 0);

    // تنبيه رقابي إذا كانت السلفة أكبر من إجمالي مستحقات الفني التراكمية
    if (advVal > currentBalance) {
      const confirmExceed = window.confirm(
        `⚠️ تنبيه رقابي مالي:\nمبلغ السلفة المطلوب (${advVal.toLocaleString()} ر.ي) أكبر من إجمالي مستحقات الفني التراكمية المتبقية له (${currentBalance.toLocaleString()} ر.ي).\n\nهل ترغب في صرف السلفة واعتماد الفارق كذمة مدينة على الفني؟`
      );
      if (!confirmExceed) return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/vouchers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_type: 'payment',
          party_type: 'worker',
          party_id: workerId,
          party_name: selectedWorkerForAdvance.name,
          amount: advVal,
          payment_method: 'cash',
          offset_account_code: '1202', // سلف فنيين
          description: advanceNotes.trim() || `سلفة نقدية للفني: ${selectedWorkerForAdvance.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'حدث خطأ أثناء حفظ السلفة');

      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceNotes('');
      setSelectedWorkerForAdvance(null);
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Record Worker Wage Payout / Settlement (صرف وتصفية مستحقات أجور)
  const handleRecordWagePayout = async (e) => {
    e.preventDefault();
    if (!selectedWorkerForPayout || !payoutAmount || Number(payoutAmount) <= 0) {
      alert('يرجى تحديد مبلغ الصرف بشكل صحيح');
      return;
    }

    const payVal = Number(payoutAmount);
    const workerId = selectedWorkerForPayout.id;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/vouchers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_type: 'payment',
          party_type: 'worker',
          party_id: workerId,
          party_name: selectedWorkerForPayout.name,
          amount: payVal,
          payment_method: payoutMethod,
          offset_account_code: '6108', // أجور ورواتب الفنيين الأساسية
          paper_bill_number: payoutPaperBill.trim() || null,
          description: payoutNotes.trim() || `صرف وتصفية مستحقات أجور للفني: ${selectedWorkerForPayout.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'حدث خطأ أثناء صرف مستحقات الفني');

      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutNotes('');
      setPayoutPaperBill('');
      setSelectedWorkerForPayout(null);
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Record Customer Debt Collection
  const handleRecordDebtPayment = async (e) => {
    e.preventDefault();
    if (!selectedVehicleForDebt || !debtPayAmount || Number(debtPayAmount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }

    const payVal = Number(debtPayAmount);
    const oldBalance = Number(selectedVehicleForDebt.balance_due) || 0;
    const newBalance = Math.max(0, oldBalance - payVal);

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_type: 'debt_collection',
          amount: payVal,
          description: debtPayNotes.trim() || `سداد دفعة دين للعميل ${selectedVehicleForDebt.customer_name}`,
          vehicle_id: selectedVehicleForDebt.id,
          payment_method: debtPayMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'حدث خطأ أثناء تسجيل سند القبض');

      // Store receipt info for instant WhatsApp sharing
      setCompletedDebtReceipt({
        customerName: selectedVehicleForDebt.customer_name,
        customerPhone: selectedVehicleForDebt.customer_phone,
        plateNumber: selectedVehicleForDebt.plate_number,
        vehicleModel: `${selectedVehicleForDebt.make} ${selectedVehicleForDebt.model}`,
        paidAmount: payVal,
        previousDebt: oldBalance,
        newDebt: newBalance,
        paymentMethod: debtPayMethod === 'cash' ? 'كاش نقداً' : debtPayMethod === 'kuraimi' ? 'حساب الكريمي' : debtPayMethod === 'jeeb' ? 'محفظة جيب' : 'حوالة إلكترونية',
        date: new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });

      setDebtPayAmount('');
      setDebtPayNotes('');
      await loadAllData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col gap-4 select-none pb-8">
      {/* 1. Header Bar */}
      <div className="apple-glass rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">إدارة الفنيين والعمال والديون</h2>
            <p className="text-xs text-slate-400">
              مستحقات العمال اليومية، السلف والمسحوبات، ومتابعة الديون الآجلة وسندات القبض
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAddWorkerError('');
              setShowAddWorkerModal(true);
            }}
            className="min-h-[42px] px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ إضافة فني / عامل جديد 👷</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 flex-shrink-0">
        <div className="apple-glass-card rounded-3xl p-4 border border-purple-500/25">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>الصافي التراكمي المستحق للعمال:</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black font-mono text-purple-400 mt-1">
            {totalCumulativeDueWorkers.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            يوميات اليوم المكتسبة: {totalDailyWages.toLocaleString()} ر.ي
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>سلف ومسحوبات العمال اليوم:</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-400 mt-1">
            {totalAdvancesToday.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-amber-300 mt-0.5">
            تخصم من صافي أجر العامل
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-rose-500/25">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>المصاريف التشغيلية اليوم:</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black font-mono text-rose-400 mt-1">
            {totalExpensesToday.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-rose-300 mt-0.5">
            عدد البنود: {todayExpensesList.length} بنود
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-amber-500/25">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>إجمالي الديون الآجلة على الزبائن:</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-400 mt-1">
            {totalOutstandingCustomerDebts.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-amber-300 mt-0.5">
            عدد العملاء المدينين: {debtVehicles.length} عميل
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs - Redesigned High-Contrast Tactical Bar */}
      <div className="flex-shrink-0 overflow-x-auto pb-1">
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('workers')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 ${
              activeTab === 'workers'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4 stroke-[2.3]" />
            <span>1. الفنيين والعمال والمسحوبات</span>
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                activeTab === 'workers'
                  ? 'bg-slate-950 text-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {workerStats.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 ${
              activeTab === 'expenses'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-950/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-4 h-4 stroke-[2.3]" />
            <span>2. المصاريف اليومية</span>
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                activeTab === 'expenses'
                  ? 'bg-rose-950 text-rose-200 font-bold border border-rose-400/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {todayExpensesList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debts')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 ${
              activeTab === 'debts'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4 stroke-[2.3]" />
            <span>3. دفتر الديون وسندات القبض</span>
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                activeTab === 'debts'
                  ? 'bg-slate-950 text-emerald-400 font-bold'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {debtVehicles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4 stroke-[2.3]" />
            <span>4. سجل عمليات اليوم</span>
            <span
              className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                activeTab === 'transactions'
                  ? 'bg-blue-950 text-blue-200 font-bold border border-blue-400/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {transactions.length}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Tab 1: Technicians and Daily Wages - الشريط التكتيكي السريع (الخيار 1 المعتمد) */}
      {activeTab === 'workers' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {workerStats.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-white/10">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-bold text-sm text-slate-200">لا يوجد فنيون أو عمال مسجلون حالياً</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                يمكنك إضافة فنيي وغسالي المركز وتحديد مسمياتهم ورواتبهم أو نسب عمولاتهم لبدء تتبع أدائهم الميداني.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAddWorkerError('');
                  setShowAddWorkerModal(true);
                }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg transition active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>إضافة أول فني الآن</span>
              </button>
            </div>
          ) : (
            workerStats.map((w) => {
            const isFullyPaid = w.net_due_today <= 0;

            return (
              <div
                key={w.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-lg"
              >
                {/* Worker Identity */}
                <div className="flex items-center gap-3 min-w-[240px]">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 font-black text-sm flex items-center justify-center border border-amber-400/30 flex-shrink-0">
                    {w.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">{w.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                        {w.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{w.phone}</div>
                  </div>
                </div>

                {/* Stats Badges */}
                <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-center text-xs">
                  {/* Attendance Status Toggle */}
                  <button
                    type="button"
                    disabled={attendanceTogglingId === w.id}
                    onClick={() => handleToggleAttendance(w.id)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold transition active:scale-95 ${
                      w.today_status === 'present'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                    }`}
                    title="اضغط للتبديل بين حاضر وغائب لليوم"
                  >
                    <span className={`w-2 h-2 rounded-full ${w.today_status === 'present' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{w.today_status === 'present' ? 'حاضر اليوم 🟢' : 'غائب اليوم 🔴'}</span>
                  </button>

                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center gap-1.5">
                    <span className="text-slate-400">اليومية:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Number(w.daily_base_wage).toLocaleString()} ر.ي
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center gap-1.5">
                    <span className="text-slate-400">سلف اليوم:</span>
                    <span className="font-mono font-bold text-amber-400">
                      -{Number(w.advances_today ?? 0).toLocaleString()} ر.ي
                    </span>
                  </div>

                  <div className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 shadow-sm ${
                    (w.cumulative_balance || 0) >= 0
                      ? 'bg-purple-950/60 border-purple-500/40 text-white'
                      : 'bg-rose-950/60 border-rose-500/40 text-white'
                  }`}>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] text-purple-300 font-bold">
                        {(w.cumulative_balance || 0) >= 0 ? 'الرصيد التراكمي (له):' : 'سلف متجاوزة (عليه):'}
                      </span>
                      <span className="font-mono font-black text-sm">
                        {Math.abs(w.cumulative_balance || 0).toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  {onOpenWorkerStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenWorkerStatement(w.id)}
                      className="px-3 min-h-[42px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95"
                      title="كشف حساب وسلف الفني"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>كشف حساب</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditWorker(w)}
                    className="px-2.5 min-h-[42px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95"
                    title="تعديل بيانات ومسمى وراتب الفني"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>تعديل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWorkerForAdvance(w);
                      setShowAdvanceModal(true);
                    }}
                    className="px-3.5 min-h-[42px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/20"
                  >
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>تسجيل سلفة 💸</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWorkerForPayout(w);
                      setPayoutAmount(Math.max(0, w.cumulative_balance || 0).toString());
                      setShowPayoutModal(true);
                    }}
                    className="px-3.5 min-h-[42px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/20"
                  >
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>صرف مستحق 💵</span>
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      )}

      {/* 5. Tab 2: Daily Expenses - النمط التكتيكي عالي التباين */}
      {activeTab === 'expenses' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col flex-1">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
              <span className="font-extrabold text-sm text-white">المصاريف التشغيلية المسجلة اليوم:</span>
              <span className="text-[11px] text-slate-400 mr-2 font-normal hidden sm:inline">
                (💡 يتم تسجيل واعتماد سندات الصرف والمصروفات رسمياً من شاشة الخزينة)
              </span>
            </div>
            <span className="text-xs px-3 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono font-black">
              إجمالي اليوم: {totalExpensesToday.toLocaleString()} ر.ي
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-300 font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="p-3.5">البيان والتفاصيل</th>
                  <th className="p-3.5">طريقة الخصم</th>
                  <th className="p-3.5">المبلغ</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {todayExpensesList.map((tx) => (
                  <tr key={tx.id} className="even:bg-slate-900/40 odd:bg-slate-950/40 hover:bg-white/5 transition">
                    <td className="p-3.5">
                      <div className="font-extrabold text-white text-sm">{tx.description}</div>
                    </td>
                    <td className="p-3.5">
                      {tx.payment_method === 'cash' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          💵 كاش من الصندوق
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          🏦 حوالة / {tx.payment_method}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-black text-rose-400 text-sm">
                      -{Number(tx.amount).toLocaleString()} ر.ي
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">{tx.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {todayExpensesList.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="font-bold text-sm">لم يتم تسجيل أي مصاريف تشغيلية اليوم حتى الآن</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab 3: Debt Ledger & Receipts - النمط التكتيكي لسندات القبض ومتابعة الديون */}
      {activeTab === 'debts' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col flex-1">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-extrabold text-sm text-white">دفتر حسابات الزبائن الآجلة (الديون المستحقة للمحل):</span>
            </div>
            <span className="text-xs px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-black">
              إجمالي الديون: {totalOutstandingCustomerDebts.toLocaleString()} ر.ي
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-300 font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="p-3.5">رقم لوحة السيارة</th>
                  <th className="p-3.5">اسم العميل والسيارة</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">رصيد الدين الحالي</th>
                  <th className="p-3.5 text-center">إجراء السداد والمطالبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {debtVehicles.map((v) => (
                  <tr key={v.id} className="even:bg-slate-900/40 odd:bg-slate-950/40 hover:bg-white/5 transition">
                    <td className="p-3.5">
                      <span className="px-3 py-1 rounded-xl bg-slate-950 border border-white/20 text-amber-300 font-mono font-black text-sm tracking-wider">
                        {v.plate_number}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-white text-sm">{v.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{v.make} {v.model} ({v.year})</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{v.customer_phone}</td>
                    <td className="p-3.5 font-mono font-black text-rose-400 text-sm">
                      {Number(v.balance_due).toLocaleString()} ر.ي
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {v.customer_phone && (
                          <a
                            href={formatYemeniWhatsAppLink(
                              v.customer_phone,
                              `السلام عليكم يا ${v.customer_name}، نود تذكيركم بلطف بأن لديكم حساب آجل متبقي بمبلغ ${Number(v.balance_due).toLocaleString()} ر.ي لسيارتكم رقم (${v.plate_number}). شاكرين تعاونكم معنا.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 transition active:scale-95"
                            title="إرسال تذكير سداد واتساب"
                          >
                            <span>واتساب 📲</span>
                          </a>
                        )}

                        {onOpenCustomerStatement && (
                          <button
                            type="button"
                            onClick={() => onOpenCustomerStatement(v.id)}
                            className="px-3 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-bold text-xs transition active:scale-95"
                            title="عرض كشف حساب العميل التفصيلي"
                          >
                            <FileText className="w-3.5 h-3.5 inline ml-1" />
                            <span>كشف حساب</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVehicleForDebt(v);
                            setShowDebtPayModal(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>سند قبض 🧾</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {debtVehicles.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="font-bold text-sm">ممتاز! لا توجد ديون آجلة متأخرة على أي عميل حالياً</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Tab 4: All Transactions Audit Log - سجل العمليات المحاسبي */}
      {activeTab === 'transactions' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col flex-1">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="font-extrabold text-sm text-white">سجل العمليات المالية والمعاملات اليومية:</span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-bold">
              {transactions.length} عملية مسجلة
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-300 font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">البيان / الوصف</th>
                  <th className="p-3.5">الطرف المرتبط</th>
                  <th className="p-3.5">طريقة الدفع</th>
                  <th className="p-3.5">المبلغ</th>
                  <th className="p-3.5">الوقت والتاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {transactions.map((tx) => {
                  const isExpense = tx.tx_type === 'expense';
                  const isAdvance = tx.tx_type === 'worker_advance';
                  const isCollection = tx.tx_type === 'debt_collection';

                  return (
                    <tr key={tx.id} className="even:bg-slate-900/40 odd:bg-slate-950/40 hover:bg-white/5 transition">
                      <td className="p-3.5">
                        {isExpense && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            مصروف تشغيلي
                          </span>
                        )}
                        {isAdvance && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            سلفة عامل
                          </span>
                        )}
                        {isCollection && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            تحصيل دين عميل
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-white">{tx.description}</td>
                      <td className="p-3.5 text-slate-300 font-bold">
                        {tx.worker_name || tx.customer_name || 'المركز'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{tx.payment_method}</td>
                      <td className="p-3.5 font-mono font-extrabold text-sm">
                        <span className={isCollection ? 'text-emerald-400' : 'text-rose-400'}>
                          {isCollection ? '+' : '-'}{tx.amount.toLocaleString()} ر.ي
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">{tx.created_at}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Worker Advance */}
      {showAdvanceModal && selectedWorkerForAdvance && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdvanceModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 cursor-default">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-extrabold text-white text-base">تسجيل سلفة / مسحوب لعامل</h3>
              <button onClick={() => setShowAdvanceModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleRecordAdvance} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900 border border-white/10">
                <div className="text-white font-extrabold text-sm">{selectedWorkerForAdvance.name}</div>
                <div className="text-xs text-purple-400 mt-0.5">{selectedWorkerForAdvance.role}</div>
                <div className="text-xs text-slate-400 mt-1">
                  الرصيد التراكمي المتبقي له قبل السلفة: <span className="text-emerald-400 font-mono font-bold">{(selectedWorkerForAdvance.cumulative_balance || 0).toLocaleString()} ر.ي</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">مبالغ سريعة:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 2000, 3000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdvanceAmount(amt.toString())}
                      className={`py-2 rounded-xl font-mono font-bold transition text-xs border ${
                        advanceAmount === amt.toString()
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">مبلغ السلفة (ريال يمني):</label>
                <input
                  type="number"
                  placeholder="مثال: 2000"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-extrabold focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">ملاحظات / سبب السلفة:</label>
                <input
                  type="text"
                  placeholder="مثال: حق غداء، مصروف عائلي، سلفة بنزين..."
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                💡 سيتم إنشاء سند صرف رسمي (PV) وخصم المبلغ من نقدية وردية الدرج تلقائياً لمنع أي عجز وهمي في الصندوق.
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-white/5 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-lg shadow-amber-950/20"
                >
                  {isSubmitting ? 'جاري التسجيل...' : 'تأكيد وصرف السلفة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1.5: Worker Wage Payout / Settlement (صرف وتصفية مستحقات أجور) */}
      {showPayoutModal && selectedWorkerForPayout && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPayoutModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 cursor-default">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="font-extrabold text-white text-base">صرف وتصفية مستحقات أجور</h3>
              </div>
              <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleRecordWagePayout} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-extrabold text-sm">{selectedWorkerForPayout.name}</div>
                    <div className="text-xs text-purple-400 mt-0.5">{selectedWorkerForPayout.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">الرصيد التراكمي المتبقي له:</div>
                    <div className="text-base font-black font-mono text-emerald-400">
                      {(selectedWorkerForPayout.cumulative_balance || 0).toLocaleString()} ر.ي
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">اختيار سريع لمبلغ الصرف:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(Math.max(0, selectedWorkerForPayout.cumulative_balance || 0).toString())}
                    className="py-2 px-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold hover:bg-emerald-500/30 transition text-xs"
                  >
                    كامل المستحق
                  </button>
                  {[3000, 6000, 10000].slice(0, 2).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPayoutAmount(amt.toString())}
                      className={`py-2 rounded-xl font-mono font-bold transition text-xs border ${
                        payoutAmount === amt.toString()
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">المبلغ المراد صرفه (ر.ي): <span className="text-rose-400">*</span></label>
                <input
                  type="number"
                  min="1"
                  placeholder="مثال: 3000"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-extrabold focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">وسيلة وطريقة الصرف:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('cash')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                      payoutMethod === 'cash'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <span>💵 كاش (الدرج 1101)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('kuraimi')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                      payoutMethod === 'kuraimi'
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <span>🏦 بنك / الكريمي (1102)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">رقم السند الورقي / الدفتر (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: 1245"
                  value={payoutPaperBill}
                  onChange={(e) => setPayoutPaperBill(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">البيان / ملاحظات الصرف:</label>
                <input
                  type="text"
                  placeholder="مثال: تصفية أجور للفني"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                💡 سيتم إصدار سند صرف رسمي (PV) فورياً، وخصم المبلغ من رصيد الصندوق، وإدراجه كمصروف رواتب رسمي (6108) في القوائم المالية.
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-white/5 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  {isSubmitting ? 'جاري الصرف...' : 'تأكيد صرف المستحق'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Debt Payment Modal + Instant WhatsApp Receipt Generator */}
      {showDebtPayModal && selectedVehicleForDebt && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDebtPayModal(false);
              setCompletedDebtReceipt(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 cursor-default">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-extrabold text-white text-base">سند قبض دفعة دين للعميل</h3>
              <button
                onClick={() => {
                  setShowDebtPayModal(false);
                  setCompletedDebtReceipt(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {!completedDebtReceipt ? (
              <form onSubmit={handleRecordDebtPayment} className="p-6 space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-sm">{selectedVehicleForDebt.customer_name}</span>
                    <span className="font-mono text-amber-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-white/10">
                      {selectedVehicleForDebt.plate_number}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    هاتف: {selectedVehicleForDebt.customer_phone}
                  </div>
                  <div className="text-rose-400 font-mono font-bold mt-1.5 text-sm">
                    إجمالي الدين الحالي: {Number(selectedVehicleForDebt.balance_due).toLocaleString()} ر.ي
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">المبلغ المدفوع (ريال يمني):</label>
                  <input
                    type="number"
                    placeholder="مثال: 15000"
                    value={debtPayAmount}
                    onChange={(e) => setDebtPayAmount(e.target.value)}
                    max={Number(selectedVehicleForDebt.balance_due)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-extrabold"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">طريقة الاستلام:</label>
                  <select
                    value={debtPayMethod}
                    onChange={(e) => setDebtPayMethod(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs cursor-pointer"
                  >
                    <option value="cash">💵 كاش (يضاف لصندوق الكاشير)</option>
                    <option value="kuraimi">🏦 حساب الكريمي</option>
                    <option value="jeeb">📱 محفظة جيب</option>
                    <option value="jawali">📱 محفظة جوالي</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">ملاحظات أو رقم الإشعار:</label>
                  <input
                    type="text"
                    placeholder="رقم الحوالة أو سند القبض الورقي"
                    value={debtPayNotes}
                    onChange={(e) => setDebtPayNotes(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDebtPayModal(false)}
                    className="flex-1 min-h-[44px] rounded-xl bg-white/5 text-slate-300 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20"
                  >
                    {isSubmitting ? 'جاري الحفظ...' : 'تأكيد سند القبض'}
                  </button>
                </div>
              </form>
            ) : (
              /* Success & Instant WhatsApp Receipt */
              <div className="p-6 space-y-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">تم تسجيل سند القبض بنجاح!</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    تم استلام مبلغ <span className="text-emerald-400 font-mono font-bold">{completedDebtReceipt.paidAmount.toLocaleString()} ر.ي</span> وتحديث رصيد الزبون.
                  </p>
                </div>

                {/* Receipt Card Summary */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 text-right text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">العميل:</span>
                    <span className="font-bold text-white">{completedDebtReceipt.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">السيارة:</span>
                    <span className="font-mono text-amber-300">{completedDebtReceipt.plateNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الرصيد المتبقي بذمته:</span>
                    <span className="font-mono font-bold text-rose-400">{completedDebtReceipt.newDebt.toLocaleString()} ر.ي</span>
                  </div>
                </div>

                {/* Instant WhatsApp Share Button */}
                {(() => {
                  const shop = getShopSettings();
                  const message = `سند قبض إلكتروني 🧾
مركز: ${shop.shopName}
أخي الكريم: ${completedDebtReceipt.customerName} 🌹
تم بنجاح استلام دفعة من حسابكم:
🔹 المبلغ المدفوع: ${completedDebtReceipt.paidAmount.toLocaleString()} ر.ي
🔹 طريقة السداد: ${completedDebtReceipt.paymentMethod}
🔹 الرصيد السابق: ${completedDebtReceipt.previousDebt.toLocaleString()} ر.ي
🔹 الرصيد المتبقي بذمتكم: ${completedDebtReceipt.newDebt.toLocaleString()} ر.ي
🔹 التاريخ: ${completedDebtReceipt.date}

شكراً لوفائكم ويسعدنا خدمتكم دائماً 🚗`;

                  const waLink = formatYemeniWhatsAppLink(completedDebtReceipt.customerPhone, message);

                  return (
                    <div className="pt-2 flex flex-col gap-2">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>إرسال سند القبض عبر واتساب للزبون 📱</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setShowDebtPayModal(false);
                          setCompletedDebtReceipt(null);
                        }}
                        className="w-full min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
                      >
                        تم / إغلاق النافذة
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Worker */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Users className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">إضافة فني / عامل جديد</h3>
                  <p className="text-xs text-slate-400">تسجيل بيانات الفني وأجره اليومي الثابت (بدون عمولات)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWorkerModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="p-5 space-y-4 text-xs">
              {addWorkerError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{addWorkerError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اسم الفني / العامل: <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يحيى الريمي"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold">المسمى والوظيفة: <span className="text-rose-400">*</span></label>
                  <span className="text-[10px] text-purple-300">اكتب بحرية أو اختر من المقترحات</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="مثال: فني غيار زيوت وبنشر، معلم ميكانيك..."
                  value={newWorkerRole}
                  onChange={(e) => setNewWorkerRole(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-purple-400"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'فني غيار زيوت وبنشر',
                    'فني بنشر وترصيص كفرات',
                    'معلم ميكانيك',
                    'كهربائي بطاريات وفحص كمبيوتر',
                    'عامل غسيل وتشحيم',
                    'كاشير ومسؤول صندوق',
                    'مشرف عام وخدمات',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewWorkerRole(preset)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition active:scale-95 ${
                        newWorkerRole === preset
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-600/40'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">رقم الهاتف (اختياري):</label>
                <input
                  type="tel"
                  placeholder="مثال: 771234567"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono font-bold focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">الأجر اليومي الأساسي (ريال يمني):</label>
                <input
                  type="number"
                  min="0"
                  placeholder="مثال: 3000"
                  value={newWorkerWage}
                  onChange={(e) => setNewWorkerWage(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono font-bold focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-950/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفني'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Worker */}
      {showEditWorkerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">تعديل بيانات ومسمى الفني</h3>
                  <p className="text-xs text-slate-400">تحديث المسمى الوظيفي والأجر اليومي الأساسي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditWorkerModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateWorker} className="p-5 space-y-4 text-xs">
              {editWorkerError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editWorkerError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اسم الفني / العامل: <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يحيى الريمي"
                  value={editWorkerName}
                  onChange={(e) => setEditWorkerName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold">المسمى والوظيفة: <span className="text-rose-400">*</span></label>
                  <span className="text-[10px] text-purple-300">اكتب بحرية أو اختر من المقترحات</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="مثال: فني غيار زيوت وبنشر، معلم ميكانيك..."
                  value={editWorkerRole}
                  onChange={(e) => setEditWorkerRole(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-purple-400"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'فني غيار زيوت وبنشر',
                    'فني بنشر وترصيص كفرات',
                    'معلم ميكانيك',
                    'كهربائي بطاريات وفحص كمبيوتر',
                    'عامل غسيل وتشحيم',
                    'كاشير ومسؤول صندوق',
                    'مشرف عام وخدمات',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditWorkerRole(preset)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition active:scale-95 ${
                        editWorkerRole === preset
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-600/40'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">رقم الهاتف (اختياري):</label>
                <input
                  type="tel"
                  placeholder="مثال: 771234567"
                  value={editWorkerPhone}
                  onChange={(e) => setEditWorkerPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono font-bold focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">الأجر اليومي الأساسي (ريال يمني):</label>
                <input
                  type="number"
                  min="0"
                  placeholder="مثال: 3000"
                  value={editWorkerWage}
                  onChange={(e) => setEditWorkerWage(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono font-bold focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditWorkerModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-950/30 disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Expense Categories Management */}
      <ExpenseCategoriesModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoriesUpdated={() => fetchExpenseCategories()}
      />
    </div>
  );
}