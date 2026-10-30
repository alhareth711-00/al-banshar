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
} from 'lucide-react';
import ExpenseCategoriesModal from './ExpenseCategoriesModal';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

export default function WorkersView({ workers = [], onRefreshData, onOpenCustomerStatement, onOpenWorkerStatement }) {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'expenses' | 'debts' | 'transactions'
  const [workerStats, setWorkerStats] = useState([]);
  const [expensesCategories, setExpensesCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debtVehicles, setDebtVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedWorkerForAdvance, setSelectedWorkerForAdvance] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('cash');

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

  // 2. Fetch Expense Categories
  const fetchExpenseCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
      const data = await res.json();
      if (data.success) {
        setExpensesCategories(data.data || []);
        if (data.data && data.data.length > 0 && !expenseCategory) {
          setExpenseCategory(data.data[0].name);
        }
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  // 3. Fetch Transactions
  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  // 4. Fetch Debt Vehicles
  const fetchDebtVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (data.success) {
        const debtors = (data.data || []).filter((v) => Number(v.balance_due) > 0);
        setDebtVehicles(debtors);
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

  // Summary Metrics
  const totalAdvancesToday = useMemo(() => {
    return workerStats.reduce((acc, w) => acc + (Number(w.advances_taken_today) || 0), 0);
  }, [workerStats]);

  const totalDailyWages = useMemo(() => {
    return workerStats.reduce((acc, w) => acc + (Number(w.daily_base_wage) || 0), 0);
  }, [workerStats]);

  const totalNetDueWorkers = useMemo(() => {
    return workerStats.reduce((acc, w) => acc + (Number(w.net_due_today) || 0), 0);
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

  // Handle Record Worker Advance
  const handleRecordAdvance = async (e) => {
    e.preventDefault();
    if (!selectedWorkerForAdvance || !advanceAmount || Number(advanceAmount) <= 0) {
      alert('يرجى تحديد المبلغ بشكل صحيح');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_type: 'worker_advance',
          amount: Number(advanceAmount),
          description: advanceNotes.trim() || `سلفة يومية للفني: ${selectedWorkerForAdvance.name}`,
          worker_id: selectedWorkerForAdvance.worker_id,
          payment_method: 'cash',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'حدث خطأ أثناء حفظ السلفة');

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

  // Handle Record Daily Expense
  const handleRecordExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!expenseDescription.trim()) {
      alert('يرجى كتابة تفاصيل أو بيان المصروف');
      return;
    }

    try {
      setIsSubmitting(true);
      const categoryTag = expenseCategory ? `[${expenseCategory}] ` : '';
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_type: 'expense',
          amount: Number(expenseAmount),
          description: `${categoryTag}${expenseDescription.trim()}`,
          payment_method: expensePaymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'حدث خطأ أثناء تسجيل المصروف');

      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseDescription('');
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
            <h2 className="text-xl font-extrabold text-white tracking-tight">إدارة الفنيين والمصاريف والديون</h2>
            <p className="text-xs text-slate-400">
              مستحقات العمال اليومية، ضبط المصاريف التشغيلية، ومتابعة الديون الآجلة وسندات القبض
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="min-h-[46px] px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition active:scale-95"
            title="تعديل وإضافة تصنيفات المصاريف"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span>تصنيفات المصاريف ⚙️</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="min-h-[46px] px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-extrabold text-xs border border-rose-500/30 flex items-center gap-2 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل مصروف تشغيلي 💸</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 flex-shrink-0">
        <div className="apple-glass-card rounded-3xl p-4 border border-purple-500/25">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>الصافي المستحق للعمال اليوم:</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black font-mono text-purple-400 mt-1">
            {totalNetDueWorkers.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            الرواتب الأساسية: {totalDailyWages.toLocaleString()} ر.ي
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
        </div>
      </div>

      {/* 4. Tab 1: Technicians and Daily Wages - الشريط التكتيكي السريع (الخيار 1 المعتمد) */}
      {activeTab === 'workers' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {workerStats.map((w) => {
            const isFullyPaid = w.net_due_today <= 0;

            return (
              <div
                key={w.worker_id}
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
                  <div className="px-3 py-1 rounded-xl bg-slate-950/70 border border-white/5 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400">إنجاز اليوم:</span>
                    <span className="font-mono font-black text-emerald-400">{w.cars_served_today} سيارة</span>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-slate-950/70 border border-white/5 flex items-center gap-1.5">
                    <span className="text-slate-400">الراتب الأساسي:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Number(w.daily_base_wage).toLocaleString()} ر.ي
                    </span>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-slate-950/70 border border-white/5 flex items-center gap-1.5">
                    <span className="text-slate-400">السلف:</span>
                    <span className="font-mono font-bold text-amber-400">
                      -{Number(w.advances_taken_today).toLocaleString()} ر.ي
                    </span>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-purple-950/50 border border-purple-500/30 flex items-center gap-1.5 shadow-sm">
                    <span className="text-purple-300 font-bold">الصافي المستحق:</span>
                    <span className="font-mono font-black text-white text-sm">
                      {Number(w.net_due_today).toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  {onOpenWorkerStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenWorkerStatement(w.worker_id)}
                      className="px-3.5 min-h-[42px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95"
                      title="كشف حساب وسلف الفني"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>كشف حساب</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWorkerForAdvance(w);
                      setShowAdvanceModal(true);
                    }}
                    className="px-4 min-h-[42px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/20"
                  >
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>تسجيل سلفة 💸</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Tab 2: Daily Expenses - النمط التكتيكي عالي التباين */}
      {activeTab === 'expenses' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col flex-1">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
              <span className="font-extrabold text-sm text-white">المصاريف التشغيلية المسجلة اليوم:</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
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
                  الصافي المتبقي له اليوم قبل السلفة: <span className="text-emerald-400 font-mono font-bold">{selectedWorkerForAdvance.net_due_today.toLocaleString()} ر.ي</span>
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
                          ? 'bg-purple-500 text-white border-purple-400'
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
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-extrabold"
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
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                يتم خصم المبلغ تلقائياً من صندوق الكاشير ومن مستحقات العامل في إغلاق اليوم.
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
                  className="flex-1 min-h-[44px] rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold shadow-lg shadow-purple-500/20"
                >
                  {isSubmitting ? 'جاري التسجيل...' : 'تأكيد وصرف السلفة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record Operating Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-extrabold text-white text-base">تسجيل مصروف تشغيلي جديد</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="p-6 space-y-4 text-xs">
              {/* Category selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold">بند / تصنيف المصروف:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpenseModal(false);
                      setShowCategoryModal(true);
                    }}
                    className="text-purple-400 hover:underline text-[11px] font-bold"
                  >
                    + إضافة أو تعديل تصنيف
                  </button>
                </div>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs cursor-pointer"
                >
                  {expensesCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">المبلغ (ريال يمني):</label>
                <input
                  type="number"
                  placeholder="مثال: 4000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-extrabold"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">البيان / تفاصيل المصروف:</label>
                <input
                  type="text"
                  placeholder="مثال: فاتورة كهرباء، صابون ومنظفات مغسلة، تصليح ماطور..."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">طريقة الدفع:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpensePaymentMethod('cash')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                      expensePaymentMethod === 'cash'
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    💵 كاش من الصندوق
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpensePaymentMethod('bank')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                      expensePaymentMethod === 'bank'
                        ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/20'
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    🏦 تحويل بنكي / حساب خاص
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-white/5 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold shadow-lg shadow-rose-500/20"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'تأكيد تسجيل المصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Debt Payment Modal + Instant WhatsApp Receipt Generator */}
      {showDebtPayModal && selectedVehicleForDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
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

      {/* Modal 4: Expense Categories Management */}
      <ExpenseCategoriesModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoriesUpdated={() => fetchExpenseCategories()}
      />
    </div>
  );
}