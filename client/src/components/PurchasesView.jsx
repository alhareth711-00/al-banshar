import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Building2,
  Plus,
  Search,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CheckCircle,
  Truck,
  Phone,
  RotateCcw,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  BadgeAlert,
  Archive,
  CalendarDays,
} from 'lucide-react';
import PurchaseInvoiceModal from './PurchaseInvoiceModal';
import PurchaseReturnModal from './PurchaseReturnModal';
import SupplierPaymentVoucherModal from './SupplierPaymentVoucherModal';

export default function PurchasesView({ inventory = [], onRefreshData, onOpenSupplierStatement }) {
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'returns' | 'vouchers' | 'suppliers'
  const [purchases, setPurchases] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [paymentVouchers, setPaymentVouchers] = useState([]);
  const [overdueSummary, setOverdueSummary] = useState({ total_overdue_count: 0, total_overdue_debt: 0, overdue_bills: [] });
  const [dueCalendar, setDueCalendar] = useState({ summary: {}, buckets: {} });
  const [dueDateFilter, setDueDateFilter] = useState('all'); // 'all' | 'overdue' | 'due_7d' | 'due_30d'

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [expandedReturnId, setExpandedReturnId] = useState(null);

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedPurchaseForReturn, setSelectedPurchaseForReturn] = useState(null);

  // Pay Supplier Modal & Voucher Modal
  const [showPaySupplierModal, setShowPaySupplierModal] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherData, setVoucherData] = useState(null);

  // Add Supplier Modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newAgencyBrand, setNewAgencyBrand] = useState('');
  const [newCommercialReg, setNewCommercialReg] = useState('');
  const [newCreditDays, setNewCreditDays] = useState('30');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [purRes, retRes, suppRes, overdueRes, vouchersRes, calRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/purchase-returns'),
        fetch('/api/suppliers'),
        fetch('/api/purchases/overdue-payables'),
        fetch('/api/suppliers/vouchers'),
        fetch('/api/purchases/due-calendar'),
      ]);
      const purData = await purRes.json();
      const retData = await retRes.json();
      const suppData = await suppRes.json();
      const overdueData = await overdueRes.json();
      const vouchersData = await vouchersRes.json();
      const calData = await calRes.json();

      if (purData.success) setPurchases(purData.data || []);
      if (retData.success) setPurchaseReturns(retData.data || []);
      if (suppData.success) setSuppliers(suppData.data || []);
      if (overdueData.success) setOverdueSummary(overdueData.data || { total_overdue_count: 0, total_overdue_debt: 0, overdue_bills: [] });
      if (vouchersData.success) setPaymentVouchers(vouchersData.data || []);
      if (calData.success) setDueCalendar(calData.data || { summary: {}, buckets: {} });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const totalPurchasesValue = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  }, [purchases]);

  const totalReturnsValue = useMemo(() => {
    return purchaseReturns.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
  }, [purchaseReturns]);

  const totalPaidCashFromDrawer = useMemo(() => {
    return purchases
      .filter((p) => p.payment_method === 'cash' && p.paid_from_cash_drawer === 1)
      .reduce((acc, p) => acc + (Number(p.paid_amount) || 0), 0);
  }, [purchases]);

  const totalSupplierDebts = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (Number(s.balance_due) || 0), 0);
  }, [suppliers]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      // 1. Search filter
      const s = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        p.purchase_number.toLowerCase().includes(s) ||
        p.supplier_name.toLowerCase().includes(s) ||
        (p.invoice_ref && p.invoice_ref.toLowerCase().includes(s)) ||
        (p.paper_bill_number && p.paper_bill_number.toLowerCase().includes(s))
      );
      if (!matchesSearch) return false;

      // 2. Due Date schedule filter (Upgrade 5)
      if (dueDateFilter === 'overdue') {
        return p.remaining_debt > 0 && p.due_date && new Date(p.due_date) < new Date();
      }
      if (dueDateFilter === 'due_7d') {
        const today = new Date();
        const next7d = new Date();
        next7d.setDate(today.getDate() + 7);
        return p.remaining_debt > 0 && p.due_date && new Date(p.due_date) >= today && new Date(p.due_date) <= next7d;
      }
      if (dueDateFilter === 'due_30d') {
        const today = new Date();
        const next30d = new Date();
        next30d.setDate(today.getDate() + 30);
        return p.remaining_debt > 0 && p.due_date && new Date(p.due_date) >= today && new Date(p.due_date) <= next30d;
      }

      return true;
    });
  }, [purchases, searchTerm, dueDateFilter]);

  const filteredReturns = useMemo(() => {
    return purchaseReturns.filter((r) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        r.return_number.toLowerCase().includes(s) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(s)) ||
        (r.reason && r.reason.toLowerCase().includes(s))
      );
    });
  }, [purchaseReturns, searchTerm]);

  const filteredVouchers = useMemo(() => {
    return paymentVouchers.filter((v) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        v.voucher_number.toLowerCase().includes(s) ||
        (v.supplier_name && v.supplier_name.toLowerCase().includes(s)) ||
        (v.notes && v.notes.toLowerCase().includes(s))
      );
    });
  }, [paymentVouchers, searchTerm]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        (s.company_name && s.company_name.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term)) ||
        (s.agency_brand && s.agency_brand.toLowerCase().includes(term))
      );
    });
  }, [suppliers, searchTerm]);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          company_name: newSupplierCompany.trim() || null,
          phone: newSupplierPhone.trim() || null,
          agency_brand: newAgencyBrand.trim() || null,
          commercial_reg: newCommercialReg.trim() || null,
          credit_days: Number(newCreditDays) || 30,
        }),
      });
      if (res.ok) {
        setShowAddSupplierModal(false);
        setNewSupplierName('');
        setNewSupplierCompany('');
        setNewSupplierPhone('');
        setNewAgencyBrand('');
        setNewCommercialReg('');
        setNewCreditDays('30');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaySupplier = async (e) => {
    e.preventDefault();
    if (!selectedSupplierForPay || !payAmount || Number(payAmount) <= 0) return;

    try {
      const res = await fetch(`/api/suppliers/${selectedSupplierForPay.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(payAmount),
          payment_method: payMethod,
          notes: payNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowPaySupplierModal(false);
        const voucher = data.data?.voucher || {
          voucher_number: 'PV-AUTO',
          supplier_name: selectedSupplierForPay.name,
          supplier_company: selectedSupplierForPay.company_name,
          amount: Number(payAmount),
          payment_method: payMethod,
          notes: payNotes,
          previous_balance: selectedSupplierForPay.balance_due,
          remaining_balance: Math.max(0, selectedSupplierForPay.balance_due - Number(payAmount)),
        };

        setVoucherData(voucher);
        setShowVoucherModal(true);

        setSelectedSupplierForPay(null);
        setPayAmount('');
        setPayNotes('');
        fetchAllData();
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurchaseCompleted = () => {
    fetchAllData();
    if (onRefreshData) onRefreshData();
  };

  const handleReturnCompleted = () => {
    fetchAllData();
    if (onRefreshData) onRefreshData();
  };

  const toggleExpand = async (billId) => {
    if (expandedBillId === billId) {
      setExpandedBillId(null);
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${billId}`);
      const data = await res.json();
      if (data.success) {
        setPurchases((prev) =>
          prev.map((p) => (p.id === billId ? { ...p, items: data.data.items } : p))
        );
      }
    } catch (e) {
      console.error(e);
    }
    setExpandedBillId(billId);
  };

  const toggleExpandReturn = async (returnId) => {
    if (expandedReturnId === returnId) {
      setExpandedReturnId(null);
      return;
    }

    try {
      const res = await fetch(`/api/purchase-returns/${returnId}`);
      const data = await res.json();
      if (data.success) {
        setPurchaseReturns((prev) =>
          prev.map((r) => (r.id === returnId ? { ...r, items: data.data.items } : r))
        );
      }
    } catch (e) {
      console.error(e);
    }
    setExpandedReturnId(returnId);
  };

  const openReturnModalForBill = async (bill) => {
    try {
      const res = await fetch(`/api/purchases/${bill.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedPurchaseForReturn(data.data);
        setShowReturnModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickPayBill = (bill) => {
    const supp = suppliers.find((s) => s.id === bill.supplier_id) || {
      id: bill.supplier_id,
      name: bill.supplier_name,
      balance_due: bill.remaining_debt,
    };
    setSelectedSupplierForPay(supp);
    setPayAmount(String(bill.remaining_debt));
    setPayNotes(`سداد فاتورة رقم ${bill.purchase_number}`);
    setShowPaySupplierModal(true);
  };

  return (
    <div className="min-h-full flex flex-col gap-4 select-none pb-8">
      {/* 1. Header Bar */}
      <div className="apple-glass rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <ShoppingBag className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">إدارة المشتريات والموردين والتوريد المخزني</h2>
            <p className="text-xs text-slate-400">
              توزيع أجور الشحن (Landed Cost) &bull; أرشيف سندات الصرف &bull; جدولة الديون وتتبع أعمار الذمم
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedPurchaseForReturn(null);
              setShowReturnModal(true);
            }}
            className="min-h-[48px] px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-2 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تسجيل مرتجع مشتريات ↩️</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPurchaseModal(true)}
            className="min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>تسجيل فاتورة مشتريات وتوريد 📥</span>
          </button>
        </div>
      </div>

      {/* Overdue Payables Alert Banner (if any) */}
      {overdueSummary.total_overdue_count > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200 flex-shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <BadgeAlert className="w-5 h-5" />
            </span>
            <div>
              <span className="font-extrabold text-rose-300">تنبيه مستحقات آجلة متأخرة: </span>
              يوجد <span className="font-bold underline text-white">{overdueSummary.total_overdue_count}</span> فواتير مشتريات تجاوزت تاريخ الاستحقاق بمبلغ إجمالي{' '}
              <span className="font-mono font-black text-rose-300">{Number(overdueSummary.total_overdue_debt).toLocaleString()} ر.ي</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('bills');
              setDueDateFilter('overdue');
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 font-bold text-[11px] whitespace-nowrap transition"
          >
            عرض الفواتير المتأخرة وسدادها &larr;
          </button>
        </div>
      )}

      {/* 2. Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-shrink-0">
        <div className="apple-glass-card rounded-3xl p-4 border border-emerald-500/30">
          <div className="text-xs font-bold text-slate-400">إجمالي المشتريات المسجلة:</div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
            {totalPurchasesValue.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            عدد فواتير التوريد: <span className="font-bold text-white">{purchases.length}</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-rose-500/30">
          <div className="text-xs font-bold text-slate-400">مرتجعات المشتريات:</div>
          <div className="text-2xl font-black font-mono text-rose-400 mt-1">
            {totalReturnsValue.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-rose-300 mt-1">
            عدد سندات الإرجاع: <span className="font-bold">{purchaseReturns.length}</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-blue-500/30">
          <div className="text-xs font-bold text-slate-400">مسدد كاش من الدرج:</div>
          <div className="text-2xl font-black font-mono text-blue-400 mt-1">
            {totalPaidCashFromDrawer.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-blue-300 mt-1">
            مخصوم آلياً من صندوق الكاشير
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-amber-500/30">
          <div className="text-xs font-bold text-slate-400">ديون الموردين الآجلة:</div>
          <div className="text-2xl font-black font-mono text-amber-400 mt-1">
            {totalSupplierDebts.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
          </div>
          <div className="text-[11px] text-amber-300 mt-1">
            موردين دائنين: <span className="font-bold">{suppliers.filter((s) => s.balance_due > 0).length}</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs & Search */}
      <div className="apple-glass rounded-3xl p-3 border border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-white/10 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bills'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>فواتير المشتريات والتوريد ({purchases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>مرتجعات المشتريات ({purchaseReturns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'vouchers'
                ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>أرشيف سندات الصرف ({paymentVouchers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>دليل الموردين والذمم ({suppliers.length})</span>
          </button>
        </div>

        {activeTab === 'suppliers' && (
          <button
            type="button"
            onClick={() => setShowAddSupplierModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ إضافة مورد جديد</span>
          </button>
        )}

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder={
              activeTab === 'bills'
                ? 'ابحث برقم الفاتورة أو المورد...'
                : activeTab === 'returns'
                ? 'ابحث برقم المرتجع أو السبب...'
                : activeTab === 'vouchers'
                ? 'ابحث برقم السند أو المورد...'
                : 'ابحث باسم المورد أو الشركة أو الهاتف...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[42px] pr-9 pl-3 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-400"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* 4. Tab 1: Purchases Bills List (with Due Date Calendar Scheduling Filter) */}
      {activeTab === 'bills' && (
        <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          {/* Due Date Calendar Filter Sub-Bar (Upgrade 5) */}
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <CalendarDays className="w-4 h-4 text-amber-400" />
                <span>جدولة سداد الديون:</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setDueDateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    dueDateFilter === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({purchases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDueDateFilter('overdue')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    dueDateFilter === 'overdue'
                      ? 'bg-rose-500 text-slate-950 font-black'
                      : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  🔴 متأخرة ({dueCalendar.summary?.overdue_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDueDateFilter('due_7d')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    dueDateFilter === 'due_7d'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  🟡 مستحقة خلال 7 أيام ({dueCalendar.summary?.due_7d_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDueDateFilter('due_30d')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    dueDateFilter === 'due_30d'
                      ? 'bg-blue-500 text-slate-950 font-black'
                      : 'text-blue-400 hover:bg-blue-500/10'
                  }`}
                >
                  🔵 مستحقة هذا الشهر ({dueCalendar.summary?.due_30d_count || 0})
                </button>
              </div>
            </div>

            {dueCalendar.summary?.due_7d_amount > 0 && (
              <div className="text-[11px] font-mono text-amber-300 font-bold">
                السيولة المطلوبة للـ 7 أيام القادمة:{' '}
                <span className="underline">{Number(dueCalendar.summary.due_7d_amount).toLocaleString()} ر.ي</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-extrabold sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="p-3.5">رقم الفاتورة</th>
                  <th className="p-3.5">المورد والشركة</th>
                  <th className="p-3.5">فاتورة المورد</th>
                  <th className="p-3.5">طريقة السداد</th>
                  <th className="p-3.5">إجمالي الفاتورة</th>
                  <th className="p-3.5">أجور الشحن (Landed)</th>
                  <th className="p-3.5">المدفوع</th>
                  <th className="p-3.5">المتبقي آجل</th>
                  <th className="p-3.5">تاريخ الاستحقاق</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      لا توجد فواتير مشتريات مسجلة تطابق التصفية.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => {
                    const isExpanded = expandedBillId === p.id;
                    const isOverdue = p.remaining_debt > 0 && p.due_date && new Date(p.due_date) < new Date();

                    return (
                      <React.Fragment key={p.id}>
                        <tr className={`hover:bg-white/5 transition ${isOverdue ? 'bg-rose-500/5' : ''}`}>
                          <td className="p-3.5 font-mono font-bold text-amber-300">
                            <div className="flex items-center gap-1.5">
                              <span>{p.purchase_number}</span>
                              {p.is_returned === 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  مرتجع
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-extrabold text-white text-sm">{p.supplier_name}</div>
                            <div className="text-[11px] text-slate-400">{p.supplier_company || '---'}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            <div>{p.invoice_ref || '---'}</div>
                            {p.paper_bill_number && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 block w-fit mt-0.5">
                                دفتر: {p.paper_bill_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {p.payment_method === 'cash' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                💵 كاش {p.paid_from_cash_drawer ? '(الدرج)' : ''}
                              </span>
                            ) : p.payment_method === 'credit' ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                📝 آجل للمورد
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                🏦 {p.payment_method}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-black text-sm text-emerald-400">
                            {Number(p.total_amount).toLocaleString()} ر.ي
                          </td>
                          <td className="p-3.5 font-mono text-xs">
                            {p.shipping_cost > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                🚚 +{Number(p.shipping_cost).toLocaleString()} ر.ي
                              </span>
                            ) : (
                              <span className="text-slate-500">لا يوجد</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-300">
                            {Number(p.paid_amount).toLocaleString()} ر.ي
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            {p.remaining_debt > 0 ? (
                              <span className="text-amber-400 font-bold">
                                {Number(p.remaining_debt).toLocaleString()} ر.ي
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-[11px]">
                            {p.due_date ? (
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold ${
                                  isOverdue
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'text-slate-300'
                                }`}
                              >
                                {p.due_date} {isOverdue ? '⚠️ متأخر' : ''}
                              </span>
                            ) : (
                              <span className="text-slate-500">غير محدد</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                            {p.created_at}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {p.remaining_debt > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickPayBill(p)}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] transition active:scale-95"
                                  title="سداد دين هذه الفاتورة فورياً"
                                >
                                  سداد 💵
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openReturnModalForBill(p)}
                                className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition"
                                title="إرجاع بضاعة من هذه الفاتورة"
                              >
                                مرتجع ↩️
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleExpand(p.id)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                                title="عرض أصناف الفاتورة"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Line Items */}
                        {isExpanded && p.items && (
                          <tr className="bg-slate-900/90">
                            <td colSpan={11} className="p-4 border-y border-white/10">
                              <div className="text-xs font-bold text-amber-300 mb-2 flex items-center justify-between">
                                <span>الأصناف الموردة في هذه الفاتورة:</span>
                                <span className="text-[11px] text-slate-400">
                                  {p.shipping_cost > 0
                                    ? `شاملة أجور الشحن الموزعة (${Number(p.shipping_cost).toLocaleString()} ر.ي) على متوسط التكلفة`
                                    : 'تحديث متوسط التكلفة المرجح (WAC) تلقائياً'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {p.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-2xl bg-slate-950 border border-white/10 flex justify-between items-center text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-white text-sm">{it.product_name}</div>
                                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        {it.purchase_unit_type === 'carton' ? (
                                          <span className="text-amber-300 font-bold">
                                            📦 {it.carton_qty} كرتون &times; {it.units_per_carton} = {it.qty} عبوة
                                          </span>
                                        ) : (
                                          <span>{it.qty} عبوة فردية</span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        تكلفة الشراء: {Number(it.unit_cost).toLocaleString()} ر.ي
                                        {it.allocated_shipping > 0 && (
                                          <span className="text-blue-300 font-bold block">
                                            + {Number(it.allocated_shipping).toLocaleString()} ر.ي شحن (واصلة:{' '}
                                            {Number(it.effective_unit_cost || it.unit_cost).toLocaleString()} ر.ي)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-left font-mono">
                                      <div className="font-black text-amber-400 text-sm">
                                        {(it.qty * it.unit_cost).toLocaleString()} ر.ي
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Purchase Returns List */}
      {activeTab === 'returns' && (
        <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-extrabold sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="p-3.5">رقم المرتجع</th>
                  <th className="p-3.5">المورد والشركة</th>
                  <th className="p-3.5">الفاتورة المرجوع منها</th>
                  <th className="p-3.5">طريقة تسوية المرتجع</th>
                  <th className="p-3.5">إجمالي قيمة المرتجع</th>
                  <th className="p-3.5">سبب الإرجاع</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5 text-center">الأصناف المرجوعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد سندات مرتجع مشتريات مسجلة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((r) => {
                    const isExpanded = expandedReturnId === r.id;

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-white/5 transition">
                          <td className="p-3.5 font-mono font-bold text-rose-300">
                            {r.return_number}
                          </td>
                          <td className="p-3.5">
                            <div className="font-extrabold text-white text-sm">{r.supplier_name || 'مورد عام'}</div>
                            <div className="text-[11px] text-slate-400">{r.supplier_company || '---'}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {r.purchase_number || 'مرتجع مباشر'}
                          </td>
                          <td className="p-3.5">
                            {r.refund_method === 'cash' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                💵 استرداد كاش للصندوق
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                📝 خصم من دين المورد
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-black text-sm text-rose-400">
                            {Number(r.total_amount).toLocaleString()} ر.ي
                          </td>
                          <td className="p-3.5 text-slate-300">
                            {r.reason || 'بضاعة تالفة / تاريخ انتهاء / غير مطابقة'}
                          </td>
                          <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                            {r.created_at}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandReturn(r.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Return Items */}
                        {isExpanded && r.items && (
                          <tr className="bg-slate-900/90">
                            <td colSpan={8} className="p-4 border-y border-white/10">
                              <div className="text-xs font-bold text-rose-300 mb-2">
                                تفاصيل الأصناف المرتجعة للمورد:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {r.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-2xl bg-slate-950 border border-white/10 flex justify-between items-center text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-white">{it.product_name}</div>
                                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        كمية الإرجاع: <span className="text-rose-400 font-bold">{it.qty}</span> عبوة
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        سعر الوحدة المرتجعة: {Number(it.unit_cost).toLocaleString()} ر.ي
                                      </div>
                                    </div>
                                    <div className="font-mono font-black text-rose-400 text-sm">
                                      {(it.qty * it.unit_cost).toLocaleString()} ر.ي
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Payment Vouchers Archive (Upgrade 3) */}
      {activeTab === 'vouchers' && (
        <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-extrabold sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="p-3.5">رقم سند الصرف</th>
                  <th className="p-3.5">المورد / المستلم</th>
                  <th className="p-3.5">المبلغ المصروف</th>
                  <th className="p-3.5">طريقة الصرف</th>
                  <th className="p-3.5">الرصيد السابق</th>
                  <th className="p-3.5">الرصيد المتبقي</th>
                  <th className="p-3.5">البيان والملاحظات</th>
                  <th className="p-3.5">تاريخ ووقت السند</th>
                  <th className="p-3.5 text-center">طباعة السند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      لا توجد سندات صرف محفوظة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-white/5 transition">
                      <td className="p-3.5 font-mono font-bold text-blue-300">
                        {v.voucher_number}
                      </td>
                      <td className="p-3.5">
                        <div className="font-extrabold text-white text-sm">{v.supplier_name}</div>
                        <div className="text-[11px] text-slate-400">{v.supplier_company || '---'}</div>
                      </td>
                      <td className="p-3.5 font-mono font-black text-sm text-emerald-400">
                        {Number(v.amount).toLocaleString()} ر.ي
                      </td>
                      <td className="p-3.5">
                        {v.payment_method === 'cash' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            💵 كاش
                          </span>
                        ) : v.payment_method === 'kuraimi' ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                            🏦 بنك الكريمي
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                            📱 {v.payment_method}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {Number(v.prev_balance).toLocaleString()} ر.ي
                      </td>
                      <td className="p-3.5 font-mono font-bold text-amber-300">
                        {Number(v.new_balance).toLocaleString()} ر.ي
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {v.notes || 'سداد دفعة من الحساب الآجل للمورد'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {v.created_at}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setVoucherData({
                              voucher_number: v.voucher_number,
                              supplier_name: v.supplier_name,
                              supplier_company: v.supplier_company,
                              amount: v.amount,
                              payment_method: v.payment_method,
                              notes: v.notes,
                              previous_balance: v.prev_balance,
                              remaining_balance: v.new_balance,
                              date: v.created_at,
                            });
                            setShowVoucherModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 mx-auto transition active:scale-95"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة 🖨️</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Suppliers Directory & Aging */}
      {activeTab === 'suppliers' && (
        <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-extrabold sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="p-3.5">اسم المورد والمسؤول</th>
                  <th className="p-3.5">الشركة والتخصص</th>
                  <th className="p-3.5">الوكالة / السجل</th>
                  <th className="p-3.5">فترة الائتمان</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5 text-center">الفواتير</th>
                  <th className="p-3.5">إجمالي التوريدات</th>
                  <th className="p-3.5">رصيد الدين المستحق له</th>
                  <th className="p-3.5 text-center">الإجراءات المالية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      لا يوجد موردين مطابقين للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5 transition">
                      <td className="p-3.5 font-extrabold text-white text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300">{s.company_name || '---'}</td>
                      <td className="p-3.5 text-slate-300">
                        <div>{s.agency_brand || '---'}</div>
                        {s.commercial_reg && (
                          <div className="text-[10px] text-slate-500 font-mono">س.ت: {s.commercial_reg}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {s.credit_days ? `${s.credit_days} يوم` : '30 يوم'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{s.phone || '---'}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-300">
                        {s.total_bills || 0}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-200">
                        {Number(s.total_purchased || 0).toLocaleString()} ر.ي
                      </td>
                      <td className="p-3.5 font-mono font-black text-sm">
                        {s.balance_due > 0 ? (
                          <span className="text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                            {Number(s.balance_due).toLocaleString()} ر.ي
                          </span>
                        ) : (
                          <span className="text-emerald-400">خالي من الديون</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenSupplierStatement && (
                            <button
                              type="button"
                              onClick={() => onOpenSupplierStatement(s.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-bold text-xs transition active:scale-95"
                              title="عرض كشف حساب المورد التفصيلي"
                            >
                              كشف حساب 🧾
                            </button>
                          )}
                          {s.balance_due > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplierForPay(s);
                                setPayAmount(String(s.balance_due));
                                setShowPaySupplierModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition active:scale-95"
                            >
                              سداد دفعة 💵
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">مكتمل</span>
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
      )}

      {/* Purchase Invoice Modal */}
      <PurchaseInvoiceModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        inventory={inventory}
        suppliers={suppliers}
        onPurchaseCompleted={handlePurchaseCompleted}
      />

      {/* Purchase Return Modal */}
      <PurchaseReturnModal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setSelectedPurchaseForReturn(null);
        }}
        inventory={inventory}
        suppliers={suppliers}
        initialPurchase={selectedPurchaseForReturn}
        onReturnCompleted={handleReturnCompleted}
      />

      {/* Supplier Payment Voucher Modal (Printed/Previewed Official Voucher) */}
      <SupplierPaymentVoucherModal
        isOpen={showVoucherModal}
        onClose={() => {
          setShowVoucherModal(false);
          setVoucherData(null);
        }}
        voucherData={voucherData}
      />

      {/* Pay Supplier Modal */}
      {showPaySupplierModal && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-extrabold text-white text-base">سداد دفعة حساب للمورد</h3>
              <button onClick={() => setShowPaySupplierModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handlePaySupplier} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900 border border-white/10">
                <div className="font-bold text-white text-sm">{selectedSupplierForPay.name}</div>
                <div className="text-rose-400 font-mono font-bold mt-1">
                  إجمالي الدين المستحق له: {Number(selectedSupplierForPay.balance_due).toLocaleString()} ر.ي
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">مبلغ السداد (ريال يمني):</label>
                <input
                  type="number"
                  placeholder="مثال: 50000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-base font-extrabold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">طريقة الدفع:</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs cursor-pointer"
                >
                  <option value="cash">💵 كاش (يخصم من الدرج فورياً)</option>
                  <option value="kuraimi">🏦 حساب الكريمي</option>
                  <option value="jeeb">📱 محفظة جيب</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">ملاحظات / رقم السند أو الحوالة:</label>
                <input
                  type="text"
                  placeholder="سند قبض المورد أو رقم الإشعار"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaySupplierModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-white/5 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20"
                >
                  تأكيد وطباعة السند 🖨️
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-extrabold text-white text-base">إضافة مورد جديد</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اسم المورد / المسؤول:</label>
                <input
                  type="text"
                  placeholder="مثال: شركة بازرعة، وكيل كاسترول..."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اسم الشركة أو التخصص:</label>
                <input
                  type="text"
                  placeholder="مثال: وكيل تويوتا المعتمد، موزع بطاريات باقر..."
                  value={newSupplierCompany}
                  onChange={(e) => setNewSupplierCompany(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">الماركة / الوكالة:</label>
                  <input
                    type="text"
                    placeholder="كاسترول، بترومين..."
                    value={newAgencyBrand}
                    onChange={(e) => setNewAgencyBrand(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">فترة الائتمان (أيام):</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={newCreditDays}
                    onChange={(e) => setNewCreditDays(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">رقم الهاتف:</label>
                  <input
                    type="tel"
                    placeholder="77XXXXXXX"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">السجل التجاري:</label>
                  <input
                    type="text"
                    placeholder="CR-XXXXX"
                    value={newCommercialReg}
                    onChange={(e) => setNewCommercialReg(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-white/5 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
