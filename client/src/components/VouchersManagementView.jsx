import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
  Search,
  Filter,
  Printer,
  Calendar,
  Share2,
  DollarSign,
  Landmark,
  Wallet,
  Building,
  User,
  Users,
  Eye,
  Edit3,
  Ban,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import ReceiptVoucherModal from './ReceiptVoucherModal';
import GeneralPaymentVoucherModal from './GeneralPaymentVoucherModal';
import EditVoucherModal from './EditVoucherModal';
import VoidVoucherModal from './VoidVoucherModal';
import VoucherDetailsModal from './VoucherDetailsModal';
import OwnerPinModal from './OwnerPinModal';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';
import { tafqeet } from '../utils/tafqeet';

export default function VouchersManagementView({
  onRefreshData,
  isOwnerMode = false,
  onRequireOwnerAuth,
}) {
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Data states
  const [vouchers, setVouchers] = useState([]);
  const [metrics, setMetrics] = useState({
    today_receipts: 0,
    today_receipts_count: 0,
    today_payments: 0,
    today_payments_count: 0,
    net_today_flow: 0,
    cash_drawer_balance: 0,
    kuraimi_balance: 0,
    wallets_balance: 0,
    total_bank_and_wallets: 0,
    total_liquidity: 0,
    total_voided_count: 0,
    total_vouchers_count: 0,
  });

  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [workers, setWorkers] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'receipt' | 'payment' | 'voided'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'cash' | 'kuraimi' | 'jeeb'
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Modals state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receiptInitialData, setReceiptInitialData] = useState(null);
  const [paymentInitialData, setPaymentInitialData] = useState(null);

  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [editingVoucher, setEditingVoucher] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [voidingVoucher, setVoidingVoucher] = useState(null);
  const [showVoidModal, setShowVoidModal] = useState(false);

  // Local PIN guard modal
  const [pinModal, setPinModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    onSuccess: null,
  });

  // Guard action requiring Owner Mode / PIN
  const guardAction = (actionCallback, title, subtitle) => {
    if (isOwnerMode) {
      actionCallback();
    } else if (onRequireOwnerAuth) {
      onRequireOwnerAuth(actionCallback, title, subtitle);
    } else {
      setPinModal({
        isOpen: true,
        title: title || 'رمز المالك السري',
        subtitle: subtitle || 'أدخل رمز PIN لتأكيد هذه العملية المحاسبية',
        onSuccess: actionCallback,
      });
    }
  };

  // Fetch all vouchers & metrics
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Metrics
      const mRes = await fetch('/api/vouchers/summary/metrics');
      const mData = await mRes.json();
      if (mData.success) {
        setMetrics(mData.data);
      }

      // 2. Vouchers list
      const vRes = await fetch('/api/vouchers');
      const vData = await vRes.json();
      if (vData.success) {
        setVouchers(vData.data || []);
      }

      // 3. Vehicles
      const vehRes = await fetch('/api/vehicles');
      const vehData = await vehRes.json();
      if (vehData.success) {
        setVehicles(vehData.data || []);
      }

      // 4. Suppliers
      const suppRes = await fetch('/api/suppliers');
      const suppData = await suppRes.json();
      if (suppData.success) {
        setSuppliers(suppData.data || []);
      }

      // 5. Workers
      const wRes = await fetch('/api/workers');
      const wData = await wRes.json();
      if (wData.success) {
        setWorkers(wData.data || []);
      }
    } catch (err) {
      console.error('Error loading vouchers data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleDataChanged = () => {
    setRefreshTrigger((prev) => prev + 1);
    if (onRefreshData) onRefreshData();
  };

  // Date filtering logic
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      // Type & Status filter
      if (typeFilter === 'receipt' && (v.voucher_type !== 'receipt' || v.status === 'voided')) {
        return false;
      }
      if (typeFilter === 'payment' && (v.voucher_type !== 'payment' || v.status === 'voided')) {
        return false;
      }
      if (typeFilter === 'voided' && v.status !== 'voided') {
        return false;
      }

      // Payment method filter
      if (paymentFilter !== 'all' && v.payment_method !== paymentFilter) {
        return false;
      }

      // Date Presets
      if (datePreset !== 'all') {
        const vDate = new Date(v.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (datePreset === 'today') {
          const checkDate = new Date(vDate);
          checkDate.setHours(0, 0, 0, 0);
          if (checkDate.getTime() !== today.getTime()) return false;
        } else if (datePreset === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const checkDate = new Date(vDate);
          checkDate.setHours(0, 0, 0, 0);
          if (checkDate.getTime() !== yesterday.getTime()) return false;
        } else if (datePreset === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (vDate < weekAgo) return false;
        } else if (datePreset === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          if (vDate < monthAgo) return false;
        } else if (datePreset === 'custom') {
          if (customDateFrom) {
            const from = new Date(customDateFrom);
            from.setHours(0, 0, 0, 0);
            if (vDate < from) return false;
          }
          if (customDateTo) {
            const to = new Date(customDateTo);
            to.setHours(23, 59, 59, 999);
            if (vDate > to) return false;
          }
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = (v.voucher_number || '').toLowerCase().includes(q);
        const partyMatch = (v.party_name || '').toLowerCase().includes(q);
        const descMatch = (v.description || '').toLowerCase().includes(q);
        const billMatch = (v.paper_bill_number || '').toLowerCase().includes(q);
        if (!numMatch && !partyMatch && !descMatch && !billMatch) {
          return false;
        }
      }

      return true;
    });
  }, [vouchers, typeFilter, paymentFilter, datePreset, customDateFrom, customDateTo, searchQuery]);

  // Quick WhatsApp share link
  const handleDirectWhatsApp = (v) => {
    const settings = getShopSettings();
    const isReceipt = v.voucher_type === 'receipt';
    const msg = `🧾 *${isReceipt ? 'سند قبض نقدية رسمي' : 'سند صرف نقدية رسمي'}*
🏛️ *${settings.shopName}*
--------------------------------
🔢 *رقم السند:* ${v.voucher_number}
📅 *التاريخ:* ${new Date(v.created_at).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })}
👤 *${isReceipt ? 'المستلم منه' : 'المصروف له'}:* ${v.party_name}
💰 *المبلغ:* ${Number(v.amount).toLocaleString()} ريال يمني
📝 *تفقيطاً:* فقط ${tafqeet(v.amount)}
📌 *البيان:* ${v.description}
${v.new_balance > 0 ? `⚖️ *الرصيد المتبقي:* ${Number(v.new_balance).toLocaleString()} ر.ي\n` : ''}--------------------------------
📞 هاتف المركز: ${settings.shopPhone}`;

    const link = formatYemeniWhatsAppLink(v.phone || '', msg);
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-4 select-none pb-12">
      {/* 1. Header Pulse Metrics Bar (Glassmorphism Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Today Receipts */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-emerald-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
              <span>مقبوضات اليوم</span>
            </span>
            <span className="font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
              {metrics.today_receipts_count} سند
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl lg:text-2xl font-black font-mono text-emerald-400 tracking-tight">
              +{Number(metrics.today_receipts).toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              إيرادات وتحصيل ديون
            </span>
          </div>
        </div>

        {/* Today Payments */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-rose-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
              <span>مدفوعات اليوم</span>
            </span>
            <span className="font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] font-bold">
              {metrics.today_payments_count} سند
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl lg:text-2xl font-black font-mono text-rose-400 tracking-tight">
              -{Number(metrics.today_payments).toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              موردين ومصروفات وسلف
            </span>
          </div>
        </div>

        {/* Net Flow Today */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-amber-300">
              <ArrowRightLeft className="w-4 h-4" />
              <span>صافي حركة اليوم</span>
            </span>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl lg:text-2xl font-black font-mono tracking-tight ${
                metrics.net_today_flow >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.net_today_flow >= 0 ? '+' : ''}
              {Number(metrics.net_today_flow).toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              الفائض / العجز اليومي
            </span>
          </div>
        </div>

        {/* Cash Drawer Balance */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-amber-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-amber-400">
              <DollarSign className="w-4 h-4" />
              <span>الصندوق (الدرج 1101)</span>
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl lg:text-2xl font-black font-mono text-amber-400 tracking-tight">
              {Number(metrics.cash_drawer_balance).toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              نقدية حاضرة متاحة للصرف
            </span>
          </div>
        </div>

        {/* Banks and Wallets */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-cyan-500/20 shadow-xl relative overflow-hidden col-span-2 md:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-cyan-400">
              <Landmark className="w-4 h-4" />
              <span>البنوك والمحافظ</span>
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl lg:text-2xl font-black font-mono text-cyan-400 tracking-tight">
              {Number(metrics.total_bank_and_wallets).toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">ر.ي</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              الكريمي {Number(metrics.kuraimi_balance).toLocaleString()} | محافظ {Number(metrics.wallets_balance).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tactical Action Bar & Search / Filter Controls */}
      <div className="p-4 rounded-3xl bg-slate-900/70 border border-white/10 shadow-2xl space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Permanent Action CTAs (min-h-[48px]) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setReceiptInitialData(null);
                setShowReceiptModal(true);
              }}
              className="flex-1 lg:flex-none min-h-[48px] px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.97]"
            >
              <Plus className="w-5 h-5 text-emerald-200" />
              <span>+ سند قبض جديد</span>
            </button>

            <button
              onClick={() => {
                setPaymentInitialData(null);
                setShowPaymentModal(true);
              }}
              className="flex-1 lg:flex-none min-h-[48px] px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all active:scale-[0.97]"
            >
              <Minus className="w-5 h-5 text-rose-200" />
              <span>- سند صرف جديد</span>
            </button>
          </div>

          {/* Quick Real-Time Search Input */}
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم السند، لوحة السيارة، المورد، الدفتر، أو البيان..."
              className="w-full h-11 pr-10 pl-4 rounded-2xl bg-slate-950/90 border border-white/10 text-white text-xs font-medium placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
          {/* Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: `الكل (${vouchers.length})` },
              { id: 'receipt', label: `سندات القبض 🟢 (${vouchers.filter((v) => v.voucher_type === 'receipt' && v.status !== 'voided').length})` },
              { id: 'payment', label: `سندات الصرف 🔴 (${vouchers.filter((v) => v.voucher_type === 'payment' && v.status !== 'voided').length})` },
              { id: 'voided', label: `الملغاة 🚫 (${metrics.total_voided_count || vouchers.filter((v) => v.status === 'voided').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  typeFilter === tab.id
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>الفترة:</span>
            </span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: 'week', label: '7 أيام' },
              { id: 'month', label: 'شهر' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  datePreset === p.id
                    ? 'bg-slate-700 text-white border border-white/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}

            <button
              onClick={() => handleDataChanged()}
              className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Vouchers List Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-white/10 font-bold">
              <tr>
                <th className="p-3.5">رقم السند</th>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5">الجهة / الطرف</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">الدفتر</th>
                <th className="p-3.5">البيان والشرح</th>
                <th className="p-3.5 text-left">المبلغ (ر.ي)</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && vouchers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs">جاري تحميل سندات القبض والصرف...</p>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-16 text-center text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="text-sm font-bold text-slate-400">لا توجد سندات مطابقة للبحث أو الفلتر</p>
                    <p className="text-xs text-slate-600 mt-1">
                      يمكنك إنشاء سند جديد بالضغط على أزرار السندات بالأعلى
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isReceipt = v.voucher_type === 'receipt';
                  const isVoided = v.status === 'voided';
                  const isModified = v.status === 'modified';

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isVoided ? 'opacity-50 line-through bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Voucher Number & Badges */}
                      <td className="p-3.5 font-mono font-black">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              isVoided
                                ? 'text-slate-500 line-through'
                                : isReceipt
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {v.voucher_number}
                          </span>
                          {isVoided && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 font-sans border border-rose-500/30 font-bold no-underline">
                              ملغي
                            </span>
                          )}
                          {isModified && !isVoided && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-sans border border-amber-500/30 font-bold">
                              معدل
                            </span>
                          )}
                          {v.is_multiline === 1 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-sans border border-cyan-500/30 font-bold" title="سند مجزأ البنود">
                              مجزأ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(v.created_at).toLocaleString('ar-YE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>

                      {/* Party Name */}
                      <td className="p-3.5 font-bold text-white max-w-[180px]">
                        <div className="truncate" title={v.party_name}>
                          {v.party_name}
                        </div>
                        {Number(v.prev_balance) > 0 && (
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            الرصيد السابق: {Number(v.prev_balance).toLocaleString()} | المتبقي:{' '}
                            {Number(v.new_balance || 0).toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 text-[10px] border border-white/10 inline-flex items-center gap-1 font-medium whitespace-nowrap">
                          {v.payment_method === 'cash'
                            ? '💵 نقداً (الصندوق)'
                            : v.payment_method === 'kuraimi'
                            ? '🏦 بنك الكريمي'
                            : v.payment_method === 'jeeb'
                            ? '📱 محفظة جيب'
                            : v.payment_method === 'jawali'
                            ? '📲 جوالي'
                            : '💳 ون كاش'}
                        </span>
                      </td>

                      {/* Paper Bill Reference */}
                      <td className="p-3.5 font-mono text-amber-300 text-[11px]">
                        {v.paper_bill_number || '-'}
                      </td>

                      {/* Description */}
                      <td className="p-3.5 text-slate-300 max-w-[220px]">
                        <p className="truncate" title={v.description}>
                          {v.description}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 text-left font-mono font-black text-sm whitespace-nowrap">
                        <span
                          className={
                            isVoided
                              ? 'text-slate-500 line-through'
                              : isReceipt
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {isReceipt ? '+' : '-'}
                          {Number(v.amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal mr-1">ر.ي</span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Print */}
                          <button
                            onClick={() => {
                              setSelectedVoucherId(v.id);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors"
                            title="عرض السند والطباعة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick WhatsApp Share */}
                          <button
                            onClick={() => handleDirectWhatsApp(v)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                            title="إرسال عبر الواتساب"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {!isVoided && (
                            <>
                              {/* Edit Voucher (Owner Guarded) */}
                              <button
                                onClick={() =>
                                  guardAction(
                                    () => {
                                      setEditingVoucher(v);
                                      setShowEditModal(true);
                                    },
                                    'تعديل السند المحاسبي (محمي)',
                                    'يتطلب تعديل السند إدخال رمز PIN المالك لضمان صحة القيود'
                                  )
                                }
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                                title="تعديل السند وإعادة تسوية القيود"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Void Voucher (Owner Guarded) */}
                              <button
                                onClick={() =>
                                  guardAction(
                                    () => {
                                      setVoidingVoucher(v);
                                      setShowVoidModal(true);
                                    },
                                    'إلغاء السند وعكس القيد (محمي)',
                                    'إلغاء السند يولد قيداً عكسياً رسمياً ويعيد الرصيد للجهة'
                                  )
                                }
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                                title="إلغاء السند بقيد عكسي"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* 4. Modals Ecosystem */}

      {/* New Receipt Voucher Modal */}
      <ReceiptVoucherModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        initialData={receiptInitialData}
        vehicles={vehicles}
        onVoucherCreated={handleDataChanged}
      />

      {/* New Payment Voucher Modal */}
      <GeneralPaymentVoucherModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        initialData={paymentInitialData}
        suppliers={suppliers}
        workers={workers}
        onVoucherCreated={handleDataChanged}
      />

      {/* View Details & Ledger Modal */}
      <VoucherDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedVoucherId(null);
        }}
        voucherId={selectedVoucherId}
        onEditVoucher={(v) => {
          guardAction(
            () => {
              setEditingVoucher(v);
              setShowEditModal(true);
            },
            'تعديل السند المحاسبي',
            'أدخل رمز PIN لتعديل السند'
          );
        }}
        onVoidVoucher={(v) => {
          guardAction(
            () => {
              setVoidingVoucher(v);
              setShowVoidModal(true);
            },
            'إلغاء السند وعكس القيد',
            'أدخل رمز PIN لإلغاء السند'
          );
        }}
      />

      {/* Safe Edit Voucher Modal */}
      <EditVoucherModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingVoucher(null);
        }}
        voucher={editingVoucher}
        onVoucherUpdated={handleDataChanged}
      />

      {/* Safe Void / Cancellation Modal */}
      <VoidVoucherModal
        isOpen={showVoidModal}
        onClose={() => {
          setShowVoidModal(false);
          setVoidingVoucher(null);
        }}
        voucher={voidingVoucher}
        onVoucherVoided={handleDataChanged}
      />

      {/* Local Owner PIN Modal */}
      <OwnerPinModal
        isOpen={pinModal.isOpen}
        onClose={() => setPinModal((prev) => ({ ...prev, isOpen: false }))}
        title={pinModal.title}
        subtitle={pinModal.subtitle}
        onSuccess={() => {
          if (pinModal.onSuccess) pinModal.onSuccess();
        }}
      />
    </div>
  );
}
