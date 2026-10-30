import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Edit2,
  Trash2,
  Power,
  Lock,
  Unlock,
  ArrowUpDown,
  Check,
  X,
} from 'lucide-react';
import PurchaseInvoiceModal from './PurchaseInvoiceModal';
import PurchaseReturnModal from './PurchaseReturnModal';
import SupplierPaymentVoucherModal from './SupplierPaymentVoucherModal';

// Helper: Normalize Arabic characters for robust search (الهمزات والتاء المربوطة والتشكيل)
export function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

export default function PurchasesView({
  inventory = [],
  onRefreshData,
  onOpenSupplierStatement,
  isOwnerMode = false,
  onRequireOwnerAuth,
}) {
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [expandedReturnId, setExpandedReturnId] = useState(null);

  // Sorting state per tab
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedPurchaseForReturn, setSelectedPurchaseForReturn] = useState(null);

  // Pay Supplier Modal & Voucher Modal
  const [showPaySupplierModal, setShowPaySupplierModal] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState(null);
  const [selectedBillForPay, setSelectedBillForPay] = useState(null);
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
  const [addSupplierError, setAddSupplierError] = useState('');

  // Edit Supplier Modal
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editSupplierError, setEditSupplierError] = useState('');

  // Toast / Status Message
  const [actionNotice, setActionNotice] = useState('');
  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 5000);
  };

  // Debounce search term to prevent UI freeze during rapid typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [purRes, retRes, suppRes, overdueRes, vouchersRes, calRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/purchase-returns'),
        fetch('/api/suppliers?is_active=all'),
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

  // 1. KPIs Mathematical calculations (with strict zero/NaN safety)
  const totalPurchasesValue = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  }, [purchases]);

  const totalReturnsValue = useMemo(() => {
    return purchaseReturns.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
  }, [purchaseReturns]);

  const netPurchasesValue = useMemo(() => {
    return Math.max(0, totalPurchasesValue - totalReturnsValue);
  }, [totalPurchasesValue, totalReturnsValue]);

  // True Cash Outflow from drawer for purchases, shipping, and supplier vouchers
  const totalPaidCashFromDrawer = useMemo(() => {
    const cashPurchases = purchases
      .filter((p) => p.payment_method === 'cash' && p.paid_from_cash_drawer === 1)
      .reduce((acc, p) => acc + (Number(p.paid_amount) || 0), 0);

    const cashShipping = purchases
      .reduce((acc, p) => acc + (Number(p.shipping_cost) || 0), 0);

    const cashVouchers = paymentVouchers
      .filter((v) => v.payment_method === 'cash')
      .reduce((acc, v) => acc + (Number(v.amount) || 0), 0);

    const cashReturnsIn = purchaseReturns
      .filter((r) => r.refund_method === 'cash' && r.refund_to_cash_drawer === 1)
      .reduce((acc, r) => acc + (Number(r.refund_amount) || 0), 0);

    return Math.max(0, cashPurchases + cashShipping + cashVouchers - cashReturnsIn);
  }, [purchases, paymentVouchers, purchaseReturns]);

  const totalSupplierDebts = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (Number(s.balance_due) || 0), 0);
  }, [suppliers]);

  // 2. Sorting handler
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortItems = (list, key, direction) => {
    if (!key) return list;
    return [...list].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return direction === 'asc' ? aStr.localeCompare(bStr, 'ar') : bStr.localeCompare(aStr, 'ar');
    });
  };

  // 3. Normalized Search & Filtering
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const next7dStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-CA');
  }, []);
  const next30dStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-CA');
  }, []);

  const filteredPurchases = useMemo(() => {
    const norm = normalizeArabic(debouncedSearchTerm);
    const filtered = purchases.filter((p) => {
      const matchesSearch = !norm || (
        normalizeArabic(p.purchase_number).includes(norm) ||
        normalizeArabic(p.supplier_name).includes(norm) ||
        (p.invoice_ref && normalizeArabic(p.invoice_ref).includes(norm)) ||
        (p.paper_bill_number && normalizeArabic(p.paper_bill_number).includes(norm)) ||
        (p.supplier_company && normalizeArabic(p.supplier_company).includes(norm)) ||
        (p.supplier_phone && String(p.supplier_phone).includes(norm)) ||
        (p.notes && normalizeArabic(p.notes).includes(norm))
      );
      if (!matchesSearch) return false;

      // Due Date schedule filter
      if (dueDateFilter === 'overdue') {
        return Number(p.remaining_debt) > 0 && p.due_date && p.due_date < todayStr;
      }
      if (dueDateFilter === 'due_7d') {
        return Number(p.remaining_debt) > 0 && p.due_date && p.due_date >= todayStr && p.due_date <= next7dStr;
      }
      if (dueDateFilter === 'due_30d') {
        return Number(p.remaining_debt) > 0 && p.due_date && p.due_date >= todayStr && p.due_date <= next30dStr;
      }

      return true;
    });

    return sortItems(filtered, sortConfig.key, sortConfig.direction);
  }, [purchases, debouncedSearchTerm, dueDateFilter, todayStr, next7dStr, next30dStr, sortConfig]);

  const filteredReturns = useMemo(() => {
    const norm = normalizeArabic(debouncedSearchTerm);
    const filtered = purchaseReturns.filter((r) => {
      if (!norm) return true;
      return (
        normalizeArabic(r.return_number).includes(norm) ||
        normalizeArabic(r.supplier_name).includes(norm) ||
        (r.reason && normalizeArabic(r.reason).includes(norm)) ||
        (r.notes && normalizeArabic(r.notes).includes(norm)) ||
        (r.original_purchase_number && normalizeArabic(r.original_purchase_number).includes(norm))
      );
    });

    return sortItems(filtered, sortConfig.key, sortConfig.direction);
  }, [purchaseReturns, debouncedSearchTerm, sortConfig]);

  const filteredVouchers = useMemo(() => {
    const norm = normalizeArabic(debouncedSearchTerm);
    const filtered = paymentVouchers.filter((v) => {
      if (!norm) return true;
      return (
        normalizeArabic(v.voucher_number).includes(norm) ||
        normalizeArabic(v.supplier_name).includes(norm) ||
        (v.supplier_company && normalizeArabic(v.supplier_company).includes(norm)) ||
        (v.notes && normalizeArabic(v.notes).includes(norm)) ||
        (v.payment_method && normalizeArabic(v.payment_method).includes(norm))
      );
    });

    return sortItems(filtered, sortConfig.key, sortConfig.direction);
  }, [paymentVouchers, debouncedSearchTerm, sortConfig]);

  const filteredSuppliers = useMemo(() => {
    const norm = normalizeArabic(debouncedSearchTerm);
    const filtered = suppliers.filter((s) => {
      if (!norm) return true;
      return (
        normalizeArabic(s.name).includes(norm) ||
        (s.company_name && normalizeArabic(s.company_name).includes(norm)) ||
        (s.phone && String(s.phone).includes(norm)) ||
        (s.agency_brand && normalizeArabic(s.agency_brand).includes(norm)) ||
        (s.commercial_reg && normalizeArabic(s.commercial_reg).includes(norm)) ||
        (s.notes && normalizeArabic(s.notes).includes(norm))
      );
    });

    return sortItems(filtered, sortConfig.key, sortConfig.direction);
  }, [suppliers, debouncedSearchTerm, sortConfig]);

  // Handlers
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setAddSupplierError('');
    const trimmed = newSupplierName.trim();
    if (!trimmed) {
      setAddSupplierError('يرجى إدخال اسم المورد أو المسؤول');
      return;
    }

    // Check duplicate name
    const exists = suppliers.some((s) => normalizeArabic(s.name) === normalizeArabic(trimmed));
    if (exists) {
      setAddSupplierError('يوجد مورد مسجل مسبقاً بنفس هذا الاسم');
      return;
    }

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          company_name: newSupplierCompany.trim() || null,
          phone: newSupplierPhone.trim() || null,
          agency_brand: newAgencyBrand.trim() || null,
          commercial_reg: newCommercialReg.trim() || null,
          credit_days: Math.max(0, Number(newCreditDays) || 30),
          is_active: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddSupplierError(data.message || 'فشل في حفظ المورد');
        return;
      }

      setShowAddSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierCompany('');
      setNewSupplierPhone('');
      setNewAgencyBrand('');
      setNewCommercialReg('');
      setNewCreditDays('30');
      showNotice('تم إضافة المورد الجديد بنجاح ✅');
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (e) {
      setAddSupplierError('حدث خطأ بالاتصال: ' + e.message);
    }
  };

  const handleOpenEditSupplier = (supplier) => {
    setEditingSupplier({
      ...supplier,
      credit_days: supplier.credit_days || 30,
    });
    setEditSupplierError('');
    setShowEditSupplierModal(true);
  };

  const handleSaveEditSupplier = async (e) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) {
      setEditSupplierError('اسم المورد مطلوب');
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingSupplier.name.trim(),
          company_name: editingSupplier.company_name?.trim() || null,
          phone: editingSupplier.phone?.trim() || null,
          agency_brand: editingSupplier.agency_brand?.trim() || null,
          commercial_reg: editingSupplier.commercial_reg?.trim() || null,
          credit_days: Math.max(0, Number(editingSupplier.credit_days) || 30),
          notes: editingSupplier.notes?.trim() || null,
          is_active: editingSupplier.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditSupplierError(data.message || 'فشل في تحديث بيانات المورد');
        return;
      }

      // Optimistic update
      setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...data.data } : s)));
      setShowEditSupplierModal(false);
      showNotice('تم تحديث بيانات المورد بنجاح ✅');
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setEditSupplierError('حدث خطأ أثناء التحديث: ' + err.message);
    }
  };

  const handleToggleSupplierActive = async (supplier) => {
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/toggle-active`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === supplier.id ? { ...s, is_active: data.data.is_active } : s))
        );
        showNotice(data.message || 'تم تحديث حالة المورد');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    if (Number(supplier.balance_due) > 0) {
      alert(`لا يمكن حذف المورد لوجود رصيد دين مستحق له بقيمة (${Number(supplier.balance_due).toLocaleString()} ر.ي). يرجى تصفية الحساب أولاً أو تعطيل المورد.`);
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المورد "${supplier.name}" نهائياً من النظام؟`)) {
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'فشل في حذف المورد');
        return;
      }

      showNotice('تم حذف المورد بنجاح 🗑️');
      fetchAllData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
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
          purchase_id: selectedBillForPay ? selectedBillForPay.id : null,
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
        setSelectedBillForPay(null);
        setPayAmount('');
        setPayNotes('');
        showNotice('تم تسجيل سند الصرف وتحديث الصندوق والذمم بنجاح ✅');
        fetchAllData();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.message || 'فشل في تسجيل السداد');
      }
    } catch (e) {
      alert('خطأ أثناء تسجيل السداد: ' + e.message);
    }
  };

  const handlePurchaseCompleted = () => {
    showNotice('تم تسجيل فاتورة المشتريات وتوريد المخزون بنجاح 📦');
    fetchAllData();
    if (onRefreshData) onRefreshData();
  };

  const handleReturnCompleted = () => {
    showNotice('تم تسجيل مرتجع المشتريات وخصم المخزون بنجاح ↩️');
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
    setSelectedBillForPay(bill);
    setPayAmount(String(bill.remaining_debt));
    setPayNotes(`سداد فاتورة مشتريات رقم (${bill.purchase_number})`);
    setShowPaySupplierModal(true);
  };

  return (
    <div className="min-h-full flex flex-col gap-4 select-none pb-8">
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-slate-950 font-black text-sm shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="apple-glass rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <ShoppingBag className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">إدارة المشتريات والموردين والتوريد المخزني</h2>
              {!isOwnerMode && (
                <button
                  type="button"
                  onClick={() => onRequireOwnerAuth && onRequireOwnerAuth(null, 'وضع المدير المالي')}
                  className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition"
                  title="وضع الكاشير الآمن: انقر لفتح صلاحيات المالك"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>وضع الكاشير (محمي)</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              توزيع أجور الشحن (Landed Cost) &bull; تفكيك الكراتين للعلب &bull; أرشيف سندات الصرف &bull; جدولة الديون وتتبع أعمار الذمم
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedPurchaseForReturn(null);
              setShowReturnModal(true);
            }}
            className="min-h-[50px] px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-2 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تسجيل مرتجع مشتريات ↩️</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPurchaseModal(true)}
            className="min-h-[52px] px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition active:scale-95 ring-1 ring-emerald-400/40"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>تسجيل فاتورة مشتريات وتوريد 📥</span>
          </button>
        </div>
      </div>

      {/* Overdue Payables Alert Banner (if any) */}
      {overdueSummary.total_overdue_count > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-3 text-sm text-rose-200 flex-shrink-0 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <BadgeAlert className="w-6 h-6" />
            </span>
            <div>
              <span className="font-black text-white text-sm">⚠️ تنبيه مستحقات آجلة متأخرة: </span>
              يوجد <span className="font-black underline text-amber-300">{overdueSummary.total_overdue_count}</span> فواتير مشتريات تجاوزت موعد الاستحقاق بمبلغ إجمالي{' '}
              <span className="font-mono font-black text-rose-300 text-base">
                {!isOwnerMode ? '•••••• ر.ي' : `${Number(overdueSummary.total_overdue_debt || 0).toLocaleString()} ر.ي`}
              </span>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('bills');
              setDueDateFilter('overdue');
            }}
            className="min-h-[38px] px-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs whitespace-nowrap transition active:scale-95 shadow-md shadow-rose-500/20"
          >
            عرض الفواتير وسدادها &larr;
          </button>
        </div>
      )}

      {/* 2. Top Stats Bar (KPIs with permissions & NaN safety) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 flex-shrink-0">
        <div className="apple-glass-card rounded-3xl p-4 border border-emerald-500/30">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
            <span>إجمالي المشتريات المسجلة:</span>
            {!isOwnerMode && <Lock className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
            {!isOwnerMode ? (
              <span className="tracking-widest">••••••</span>
            ) : (
              <>
                {totalPurchasesValue.toLocaleString()} <span className="text-xs font-sans text-slate-300 font-bold">ر.ي</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-semibold flex justify-between items-center">
            <span>فواتير التوريد: <span className="font-black text-white font-mono">{purchases.length}</span></span>
            {isOwnerMode && totalReturnsValue > 0 && (
              <span className="text-emerald-300/80 font-mono text-[11px]">
                الصافي: {netPurchasesValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-rose-500/30">
          <div className="text-xs font-bold text-slate-300">مرتجعات المشتريات:</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-400 mt-1">
            {!isOwnerMode ? (
              <span className="tracking-widest">••••••</span>
            ) : (
              <>
                {totalReturnsValue.toLocaleString()} <span className="text-xs font-sans text-slate-300 font-bold">ر.ي</span>
              </>
            )}
          </div>
          <div className="text-xs text-rose-300 mt-1 font-semibold">
            سندات الإرجاع: <span className="font-black font-mono">{purchaseReturns.length}</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-blue-500/30">
          <div className="text-xs font-bold text-slate-300">مسدد كاش من الصندوق:</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-blue-400 mt-1">
            {!isOwnerMode ? (
              <span className="tracking-widest">••••••</span>
            ) : (
              <>
                {totalPaidCashFromDrawer.toLocaleString()} <span className="text-xs font-sans text-slate-300 font-bold">ر.ي</span>
              </>
            )}
          </div>
          <div className="text-xs text-blue-300 mt-1 font-semibold">
            مشتريات وشحن وسندات صرف كاش
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-4 border border-amber-500/30">
          <div className="text-xs font-bold text-slate-300">ديون الموردين الآجلة:</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
            {!isOwnerMode ? (
              <span className="tracking-widest">••••••</span>
            ) : (
              <>
                {totalSupplierDebts.toLocaleString()} <span className="text-xs font-sans text-slate-300 font-bold">ر.ي</span>
              </>
            )}
          </div>
          <div className="text-xs text-amber-300 mt-1 font-semibold">
            موردين دائنين: <span className="font-black font-mono">{suppliers.filter((s) => Number(s.balance_due) > 0).length}</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs & Search */}
      <div className="apple-glass rounded-3xl p-3 border border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`min-h-[46px] px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === 'bills'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>فواتير المشتريات والتوريد ({purchases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`min-h-[46px] px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === 'returns'
                ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/25 ring-1 ring-rose-400'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>مرتجعات المشتريات ({purchaseReturns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`min-h-[46px] px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === 'vouchers'
                ? 'bg-blue-500 text-white font-black shadow-lg shadow-blue-500/25 ring-1 ring-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>أرشيف سندات الصرف ({paymentVouchers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`min-h-[46px] px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap active:scale-95 ${
              activeTab === 'suppliers'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/25 ring-1 ring-amber-300'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
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
            className="min-h-[46px] px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ إضافة مورد جديد 🏢</span>
          </button>
        )}

        <div className="relative min-w-[260px] flex-1 sm:flex-initial">
          <input
            type="text"
            placeholder={
              activeTab === 'bills'
                ? 'ابحث برقم الفاتورة أو المورد أو الدفتر...'
                : activeTab === 'returns'
                ? 'ابحث برقم المرتجع أو السبب أو المورد...'
                : activeTab === 'vouchers'
                ? 'ابحث برقم السند أو المورد أو البيان...'
                : 'ابحث باسم المورد أو الشركة أو الهاتف أو الماركة...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[46px] pr-10 pl-3 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-amber-400 shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* 4. Tab 1: Purchases Bills List (with Due Date Calendar Scheduling Filter & Sorting) */}
      {activeTab === 'bills' && (
        <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          {/* Due Date Calendar Filter Sub-Bar */}
          <div className="px-5 py-3 bg-slate-900/70 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-amber-400" />
                <span>جدولة سداد الديون:</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDueDateFilter('all')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg font-bold text-xs transition active:scale-95 ${
                    dueDateFilter === 'all' ? 'bg-white/20 text-white font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({purchases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDueDateFilter('overdue')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg font-bold text-xs transition active:scale-95 ${
                    dueDateFilter === 'overdue'
                      ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/20'
                      : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  🔴 متأخرة ({dueCalendar.summary?.overdue_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDueDateFilter('due_7d')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg font-bold text-xs transition active:scale-95 ${
                    dueDateFilter === 'due_7d'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                      : 'text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  🟡 مستحقة خلال 7 أيام ({dueCalendar.summary?.due_7d_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDueDateFilter('due_30d')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg font-bold text-xs transition active:scale-95 ${
                    dueDateFilter === 'due_30d'
                      ? 'bg-blue-500 text-white font-black shadow-md shadow-blue-500/20'
                      : 'text-blue-400 hover:bg-blue-500/10'
                  }`}
                >
                  🔵 مستحقة هذا الشهر ({dueCalendar.summary?.due_30d_count || 0})
                </button>
              </div>
            </div>

            {dueCalendar.summary?.due_7d_amount > 0 && (
              <div className="text-xs font-mono text-amber-300 font-bold bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                السيولة المطلوبة للـ 7 أيام القادمة:{' '}
                <span className="font-black text-amber-400 underline">
                  {!isOwnerMode ? '••••••' : `${Number(dueCalendar.summary.due_7d_amount || 0).toLocaleString()} ر.ي`}
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-900/90 border-b border-white/10 text-slate-300 font-black text-xs sticky top-0 backdrop-blur z-10">
                <tr>
                  <th onClick={() => handleSort('purchase_number')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>رقم الفاتورة</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('supplier_name')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>المورد والشركة</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5">فاتورة المورد</th>
                  <th className="p-3.5">طريقة السداد</th>
                  <th onClick={() => handleSort('total_amount')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>إجمالي الفاتورة</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('shipping_cost')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>أجور الشحن</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('paid_amount')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>المدفوع</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('remaining_debt')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>المتبقي آجل</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('due_date')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>تاريخ الاستحقاق</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('created_at')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>التاريخ والوقت</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-slate-400 font-bold text-sm">
                      لا توجد فواتير مشتريات مسجلة تطابق التصفية.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => {
                    const isExpanded = expandedBillId === p.id;
                    const isOverdue = Number(p.remaining_debt) > 0 && p.due_date && p.due_date < todayStr;

                    return (
                      <React.Fragment key={p.id}>
                        <tr className={`hover:bg-white/5 transition ${isOverdue ? 'bg-rose-500/10' : ''}`}>
                          <td className="p-3.5 font-mono font-black text-amber-300">
                            <div className="flex items-center gap-1.5">
                              <span>{p.purchase_number}</span>
                              {p.is_returned === 1 && (
                                <span className="px-2 py-0.5 rounded-md text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                                  مرتجع
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-black text-white text-base">{p.supplier_name}</div>
                            <div className="text-xs text-slate-300 mt-0.5">{p.supplier_company || '---'}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 text-xs">
                            <div className="font-bold">{p.invoice_ref || '---'}</div>
                            {p.paper_bill_number && (
                              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 block w-fit mt-1 font-bold">
                                دفتر: {p.paper_bill_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {p.payment_method === 'cash' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
                                💵 كاش {p.paid_from_cash_drawer ? '(الدرج)' : ''}
                              </span>
                            ) : p.payment_method === 'credit' ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/30">
                                📝 آجل للمورد
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/30">
                                🏦 {p.payment_method}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-black text-base text-emerald-400">
                            {!isOwnerMode ? '••••••' : `${Number(p.total_amount || 0).toLocaleString()} ر.ي`}
                          </td>
                          <td className="p-3.5 font-mono text-xs">
                            {Number(p.shipping_cost) > 0 ? (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                🚚 +{Number(p.shipping_cost).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-500">---</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-200">
                            {!isOwnerMode ? '••••••' : `${Number(p.paid_amount || 0).toLocaleString()} ر.ي`}
                          </td>
                          <td className="p-3.5 font-mono font-black text-base">
                            {!isOwnerMode ? (
                              '••••••'
                            ) : Number(p.remaining_debt) > 0 ? (
                              <span className="text-amber-400">
                                {Number(p.remaining_debt).toLocaleString()} ر.ي
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-normal text-xs">خالص 0</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-xs">
                            {p.due_date ? (
                              <span
                                className={`px-2.5 py-1 rounded-lg font-bold ${
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
                          <td className="p-3.5 font-mono text-slate-400 text-xs">
                            {p.created_at}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {Number(p.remaining_debt) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickPayBill(p)}
                                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 font-black text-xs transition active:scale-95 shadow-sm"
                                  title="سداد دين هذه الفاتورة فورياً"
                                >
                                  سداد 💵
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openReturnModalForBill(p)}
                                className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs transition active:scale-95"
                                title="إرجاع بضاعة من هذه الفاتورة"
                              >
                                مرتجع ↩️
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleExpand(p.id)}
                                className="min-h-[36px] w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center transition active:scale-95"
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
                                  {Number(p.shipping_cost) > 0
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
                                        تكلفة الشراء: {Number(it.unit_cost || 0).toLocaleString()} ر.ي
                                        {Number(it.allocated_shipping) > 0 && (
                                          <span className="text-blue-300 font-bold block">
                                            + {Number(it.allocated_shipping).toLocaleString()} ر.ي شحن (واصلة:{' '}
                                            {Number(it.effective_unit_cost || it.unit_cost).toLocaleString()} ر.ي)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-left font-mono">
                                      <div className="font-black text-amber-400 text-sm">
                                        {(Number(it.qty || 0) * Number(it.unit_cost || 0)).toLocaleString()} ر.ي
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
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-900/90 border-b border-white/10 text-slate-300 font-black text-xs sticky top-0 backdrop-blur z-10">
                <tr>
                  <th onClick={() => handleSort('return_number')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>رقم المرتجع</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('supplier_name')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>المورد والشركة</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5">الفاتورة المرجوع منها</th>
                  <th className="p-3.5">طريقة تسوية المرتجع</th>
                  <th onClick={() => handleSort('total_amount')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>إجمالي قيمة المرتجع</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5">سبب الإرجاع</th>
                  <th onClick={() => handleSort('created_at')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>التاريخ والوقت</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5 text-center">الأصناف المرجوعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-bold text-sm">
                      لا توجد سندات مرتجع مشتريات مسجلة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((r) => {
                    const isExpanded = expandedReturnId === r.id;

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-white/5 transition">
                          <td className="p-3.5 font-mono font-black text-rose-300">
                            {r.return_number}
                          </td>
                          <td className="p-3.5">
                            <div className="font-black text-white text-base">{r.supplier_name || 'مورد عام'}</div>
                            <div className="text-xs text-slate-300 mt-0.5">{r.supplier_company || '---'}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 text-xs font-bold">
                            {r.original_purchase_number || 'مرتجع مباشر'}
                          </td>
                          <td className="p-3.5">
                            {r.refund_method === 'cash' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
                                💵 استرداد كاش للصندوق
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/30">
                                📝 خصم من دين المورد
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-black text-base text-rose-400">
                            {!isOwnerMode ? '••••••' : `${Number(r.total_amount || 0).toLocaleString()} ر.ي`}
                          </td>
                          <td className="p-3.5 text-slate-200 text-xs">
                            {r.reason || 'بضاعة تالفة / تاريخ انتهاء / غير مطابقة'}
                          </td>
                          <td className="p-3.5 font-mono text-slate-400 text-xs">
                            {r.created_at}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandReturn(r.id)}
                              className="min-h-[36px] w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 inline-flex items-center justify-center transition active:scale-95"
                              title="عرض الأصناف المرجوعة"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Return Items */}
                        {isExpanded && r.items && (
                          <tr className="bg-slate-900/90">
                            <td colSpan={8} className="p-4 border-y border-white/10">
                              <div className="text-xs font-black text-rose-300 mb-2">
                                تفاصيل الأصناف المرتجعة للمورد:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {r.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-2xl bg-slate-950 border border-white/10 flex justify-between items-center text-xs"
                                  >
                                    <div>
                                      <div className="font-black text-white text-sm">{it.product_name}</div>
                                      <div className="text-xs text-slate-300 font-mono mt-0.5">
                                        كمية الإرجاع: <span className="text-rose-400 font-bold">{it.qty}</span> عبوة
                                      </div>
                                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                                        سعر الوحدة: {Number(it.unit_cost || 0).toLocaleString()} ر.ي
                                      </div>
                                    </div>
                                    <div className="font-mono font-black text-rose-400 text-base">
                                      {(Number(it.qty || 0) * Number(it.unit_cost || 0)).toLocaleString()} ر.ي
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

      {/* 6. Tab 3: Payment Vouchers Archive */}
      {activeTab === 'vouchers' && (
        <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-900/90 border-b border-white/10 text-slate-300 font-black text-xs sticky top-0 backdrop-blur z-10">
                <tr>
                  <th onClick={() => handleSort('voucher_number')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>رقم سند الصرف</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('supplier_name')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>المورد / المستلم</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('amount')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>المبلغ المصروف</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5">طريقة الصرف</th>
                  <th className="p-3.5">الرصيد السابق</th>
                  <th className="p-3.5">الرصيد المتبقي</th>
                  <th className="p-3.5">البيان والملاحظات</th>
                  <th onClick={() => handleSort('created_at')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>تاريخ ووقت السند</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5 text-center">طباعة السند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400 font-bold text-sm">
                      لا توجد سندات صرف محفوظة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-white/5 transition">
                      <td className="p-3.5 font-mono font-black text-blue-300">
                        {v.voucher_number}
                      </td>
                      <td className="p-3.5">
                        <div className="font-black text-white text-base">{v.supplier_name}</div>
                        <div className="text-xs text-slate-300 mt-0.5">{v.supplier_company || '---'}</div>
                      </td>
                      <td className="p-3.5 font-mono font-black text-base text-emerald-400">
                        {!isOwnerMode ? '••••••' : `${Number(v.amount || 0).toLocaleString()} ر.ي`}
                      </td>
                      <td className="p-3.5">
                        {v.payment_method === 'cash' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
                            💵 كاش
                          </span>
                        ) : v.payment_method === 'kuraimi' ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-black text-xs border border-blue-500/30">
                            🏦 بنك الكريمي
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/30">
                            📱 {v.payment_method}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {!isOwnerMode ? '••••••' : `${Number(v.prev_balance || 0).toLocaleString()} ر.ي`}
                      </td>
                      <td className="p-3.5 font-mono font-black text-amber-300">
                        {!isOwnerMode ? '••••••' : `${Number(v.new_balance || 0).toLocaleString()} ر.ي`}
                      </td>
                      <td className="p-3.5 text-slate-300 text-xs">
                        {v.notes || 'سداد دفعة من الحساب الآجل للمورد'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 text-xs">
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
                          className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/30 font-black text-xs flex items-center gap-1.5 mx-auto transition active:scale-95 shadow-sm"
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

      {/* 7. Tab 4: Suppliers Directory & Aging (Full CRUD: Add, Edit, Toggle Active, Safe Delete, Pay, Statement) */}
      {activeTab === 'suppliers' && (
        <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-900/90 border-b border-white/10 text-slate-300 font-black text-xs sticky top-0 backdrop-blur z-10">
                <tr>
                  <th onClick={() => handleSort('name')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>اسم المورد والمسؤول</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5">الشركة والتخصص</th>
                  <th className="p-3.5">الوكالة / السجل</th>
                  <th onClick={() => handleSort('credit_days')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>فترة الائتمان</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th onClick={() => handleSort('total_bills')} className="p-3.5 text-center cursor-pointer hover:text-white transition">
                    <div className="flex items-center justify-center gap-1">
                      <span>الفواتير</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('total_purchased')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>إجمالي التوريدات</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('balance_due')} className="p-3.5 cursor-pointer hover:text-white transition">
                    <div className="flex items-center gap-1">
                      <span>رصيد الدين المستحق له</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-400 font-bold text-sm">
                      لا يوجد موردين مطابقين للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const isActive = s.is_active !== 0;

                    return (
                      <tr key={s.id} className={`hover:bg-white/5 transition ${!isActive ? 'opacity-50 bg-slate-950/40' : ''}`}>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500 border-white/10'
                            }`}>
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-black text-white text-base block">{s.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300 text-xs font-semibold">{s.company_name || '---'}</td>
                        <td className="p-3.5 text-slate-300 text-xs">
                          <div className="font-bold">{s.agency_brand || '---'}</div>
                          {s.commercial_reg && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5">س.ت: {s.commercial_reg}</div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300 text-xs">
                          {s.credit_days ? `${s.credit_days} يوم` : '30 يوم'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300 text-xs font-bold">{s.phone || '---'}</td>
                        <td className="p-3.5 text-center font-mono font-black text-amber-300 text-sm">
                          {s.total_bills || 0}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-200 text-sm">
                          {!isOwnerMode ? '••••••' : `${Number(s.total_purchased || 0).toLocaleString()} ر.ي`}
                        </td>
                        <td className="p-3.5 font-mono font-black text-base">
                          {!isOwnerMode ? (
                            '••••••'
                          ) : Number(s.balance_due) > 0 ? (
                            <span className="text-rose-400 bg-rose-500/15 px-3 py-1 rounded-full border border-rose-500/30 inline-block">
                              {Number(s.balance_due).toLocaleString()} ر.ي
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-xs font-normal">خالي من الديون</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSupplierActive(s)}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'
                            }`}
                            title="انقر لتعطيل أو تفعيل المورد"
                          >
                            {isActive ? 'نشط ✅' : 'معطل ⏸️'}
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {onOpenSupplierStatement && (
                              <button
                                type="button"
                                onClick={() => onOpenSupplierStatement(s.id)}
                                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-blue-500/15 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/30 font-bold text-xs transition active:scale-95 shadow-sm"
                                title="عرض كشف حساب المورد التفصيلي"
                              >
                                كشف حساب 🧾
                              </button>
                            )}

                            {Number(s.balance_due) > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSupplierForPay(s);
                                  setSelectedBillForPay(null);
                                  setPayAmount(String(s.balance_due));
                                  setPayNotes('سداد دفعة من الحساب الآجل');
                                  setShowPaySupplierModal(true);
                                }}
                                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 font-black text-xs transition active:scale-95 shadow-sm"
                                title="سداد دفعة مالية للمورد"
                              >
                                سداد 💵
                              </button>
                            )}

                            {/* Edit Supplier Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditSupplier(s)}
                              className="min-h-[34px] w-8 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 flex items-center justify-center transition active:scale-95"
                              title="تعديل بيانات المورد"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Safe Delete Supplier Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(s)}
                              className="min-h-[34px] w-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 flex items-center justify-center transition active:scale-95"
                              title="حذف المورد (محمي بالنزاهة المحاسبية)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
        suppliers={suppliers.filter((s) => s.is_active !== 0)}
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
        suppliers={suppliers.filter((s) => s.is_active !== 0)}
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

      {/* Pay Supplier Modal with Quick Touch Amount Chips */}
      {showPaySupplierModal && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>سداد دفعة حساب للمورد</span>
                <span>💵</span>
              </h3>
              <button
                onClick={() => {
                  setShowPaySupplierModal(false);
                  setSelectedBillForPay(null);
                }}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaySupplier} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <div className="font-black text-white text-base">{selectedSupplierForPay.name}</div>
                {selectedBillForPay && (
                  <div className="text-amber-300 font-mono text-xs mt-0.5">
                    فاتورة رقم: {selectedBillForPay.purchase_number} (المتبقي عليها: {Number(selectedBillForPay.remaining_debt).toLocaleString()} ر.ي)
                  </div>
                )}
                <div className="text-rose-400 font-mono font-black text-sm mt-1">
                  إجمالي الدين المستحق له: {Number(selectedSupplierForPay.balance_due).toLocaleString()} ر.ي
                </div>
              </div>

              <div>
                <label className="block text-slate-200 font-bold mb-1.5 text-xs">مبلغ السداد (ريال يمني):</label>
                <input
                  type="number"
                  placeholder="مثال: 50000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full min-h-[50px] px-3.5 rounded-xl bg-slate-900 border border-white/20 text-emerald-400 font-mono text-xl font-black focus:outline-none focus:border-amber-400"
                  autoFocus
                  required
                  min="1"
                  step="any"
                />

                {/* Quick Touch Amount Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(selectedBillForPay ? selectedBillForPay.remaining_debt : selectedSupplierForPay.balance_due))}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 font-mono font-bold text-xs border border-rose-500/30 active:scale-95 transition"
                  >
                    كامل المبلغ ({Number(selectedBillForPay ? selectedBillForPay.remaining_debt : selectedSupplierForPay.balance_due).toLocaleString()})
                  </button>
                  {Number(selectedSupplierForPay.balance_due) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.round(Number(selectedSupplierForPay.balance_due) / 2)))}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-mono font-bold text-xs border border-amber-500/30 active:scale-95 transition"
                    >
                      النصف ({Math.round(Number(selectedSupplierForPay.balance_due) / 2).toLocaleString()})
                    </button>
                  )}
                  {[10000, 25000, 50000].map((amt) => {
                    if (amt >= Number(selectedSupplierForPay.balance_due)) return null;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPayAmount(String(amt))}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 font-mono font-bold text-xs border border-white/10 active:scale-95 transition"
                      >
                        {amt.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-200 font-bold mb-1.5 text-xs">طريقة الدفع:</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-bold cursor-pointer focus:border-amber-400 focus:outline-none"
                >
                  <option value="cash">💵 كاش (يخصم من درج الكاشير فورياً)</option>
                  <option value="kuraimi">🏦 حساب الكريمي</option>
                  <option value="jeeb">📱 محفظة جيب</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-200 font-bold mb-1.5 text-xs">ملاحظات / رقم السند أو الحوالة:</label>
                <input
                  type="text"
                  placeholder="سند قبض المورد أو رقم الإشعار"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaySupplierModal(false);
                    setSelectedBillForPay(null);
                  }}
                  className="flex-1 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>إضافة مورد جديد</span>
                <span>🏢</span>
              </h3>
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4 text-xs">
              {addSupplierError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{addSupplierError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-200 font-bold mb-1.5 text-xs">اسم المورد / المسؤول: <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="مثال: شركة بازرعة، وكيل كاسترول..."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/20 text-white text-sm font-bold focus:border-amber-400 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-slate-200 font-bold mb-1.5 text-xs">اسم الشركة أو التخصص:</label>
                <input
                  type="text"
                  placeholder="مثال: وكيل تويوتا المعتمد، موزع بطاريات باقر..."
                  value={newSupplierCompany}
                  onChange={(e) => setNewSupplierCompany(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold focus:border-amber-400 focus:outline-none"
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
                    min="0"
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
                  className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditSupplierModal && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>تعديل بيانات المورد</span>
                <span>✏️</span>
              </h3>
              <button
                onClick={() => setShowEditSupplierModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSupplier} className="p-6 space-y-4 text-xs">
              {editSupplierError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editSupplierError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-200 font-bold mb-1.5 text-xs">اسم المورد / المسؤول: <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/20 text-white text-sm font-bold focus:border-amber-400 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-slate-200 font-bold mb-1.5 text-xs">اسم الشركة أو التخصص:</label>
                <input
                  type="text"
                  value={editingSupplier.company_name || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, company_name: e.target.value })}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-semibold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">الماركة / الوكالة:</label>
                  <input
                    type="text"
                    value={editingSupplier.agency_brand || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, agency_brand: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">فترة الائتمان (أيام):</label>
                  <input
                    type="number"
                    min="0"
                    value={editingSupplier.credit_days}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, credit_days: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">رقم الهاتف:</label>
                  <input
                    type="tel"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">السجل التجاري:</label>
                  <input
                    type="text"
                    value={editingSupplier.commercial_reg || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, commercial_reg: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">حالة المورد في النظام:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSupplier({ ...editingSupplier, is_active: 1 })}
                    className={`p-2.5 rounded-xl text-center font-bold text-xs border transition ${
                      editingSupplier.is_active === 1
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-black'
                        : 'bg-slate-900 text-slate-400 border-white/10'
                    }`}
                  >
                    نشط ومعتمد ✅
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSupplier({ ...editingSupplier, is_active: 0 })}
                    className={`p-2.5 rounded-xl text-center font-bold text-xs border transition ${
                      editingSupplier.is_active === 0
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black'
                        : 'bg-slate-900 text-slate-400 border-white/10'
                    }`}
                  >
                    معطل مؤقتاً ⏸️
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">ملاحظات إضافية:</label>
                <textarea
                  value={editingSupplier.notes || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
                  className="w-full min-h-[60px] p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                  placeholder="أي ملاحظات تخص شروط التوريد أو الدفع..."
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditSupplierModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl bg-white/5 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  حفظ التعديلات ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
