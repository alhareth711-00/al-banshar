import React, { useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Search,
  Plus,
  ShoppingBag,
  Check,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Boxes,
  Scale,
  Layers,
  Printer,
  Edit2,
  Power,
  Trash2,
  Wrench,
  Archive,
  Barcode,
  MapPin,
  CheckCircle2,
  Tag,
  Flame,
  FileText,
} from 'lucide-react';
import PurchaseInvoiceModal from './PurchaseInvoiceModal';
import AddInventoryModal, { calculateDotAge } from './AddInventoryModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import PackagingConversionModal from './PackagingConversionModal';
import InventoryValuationModal from './InventoryValuationModal';
import BarcodeLabelModal from './BarcodeLabelModal';
import TurnoverAnalyticsModal from './TurnoverAnalyticsModal';
import ReorderOrderSheetModal from './ReorderOrderSheetModal';

export default function InventoryView({ inventory = [], onRefreshData }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState(null);
  const [showTurnoverModal, setShowTurnoverModal] = useState(false);
  const [showReorderSheetModal, setShowReorderSheetModal] = useState(false);
  const [prefilledPurchaseItems, setPrefilledPurchaseItems] = useState(null);

  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [actionMessage, setActionMessage] = useState('');

  // Fetch suppliers for the purchase modal
  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) setSuppliers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenPurchaseModal = () => {
    setPrefilledPurchaseItems(null);
    fetchSuppliers();
    setShowPurchaseModal(true);
  };

  const handleOpenEdit = (item) => {
    setItemToEdit(item);
    setShowAddModal(true);
  };

  const handleOpenAdjust = (item) => {
    setSelectedItemForAdjust(item);
    setShowAdjustModal(true);
  };

  const handleOpenBarcode = (item) => {
    setSelectedItemForBarcode(item);
    setShowBarcodeModal(true);
  };

  const handleConvertToPurchaseInvoice = (reorderItems) => {
    fetchSuppliers();
    setPrefilledPurchaseItems(reorderItems);
    setShowPurchaseModal(true);
  };

  const handleToggleActive = async (item) => {
    try {
      const res = await fetch(`/api/inventory/${item.id}/toggle-active`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(''), 4000);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert('فشل تغيير حالة الصنف: ' + err.message);
    }
  };

  const handleDeleteOrArchive = async (item) => {
    const isService = item.category === 'service' || item.item_type === 'service';
    const confirmMsg = isService
      ? `هل أنت متأكد من حذف/أرشفة خدمة (${item.name})؟`
      : `هل أنت متأكد من حذف أو أرشفة الصنف (${item.name})؟\n(إذا كان للصنف مبيعات سابقة فسيتم أرشفته لحماية القيود المحاسبية)`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(''), 5000);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      alert('فشل إجراء الحذف/الأرشفة: ' + err.message);
    }
  };

  // Filter items based on activeTab and searchTerm
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      // Tab Filtering
      if (activeTab === 'archived') {
        if (item.is_active === 1) return false;
      } else {
        // In other tabs, hide archived by default
        if (item.is_active === 0) return false;

        if (activeTab === 'oil') {
          if (item.category !== 'oil') return false;
        } else if (activeTab === 'filter') {
          if (item.category !== 'filter') return false;
        } else if (activeTab === 'tire') {
          if (item.category !== 'tire') return false;
        } else if (activeTab === 'battery') {
          if (item.category !== 'battery') return false;
        } else if (activeTab === 'service') {
          if (item.category !== 'service' && item.item_type !== 'service') return false;
        } else if (activeTab === 'low') {
          if (item.item_type === 'service' || item.stock_qty > item.min_stock_alert) return false;
        }
      }

      // Search Filtering
      if (!searchTerm.trim()) return true;
      const s = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(s) ||
        (item.brand && item.brand.toLowerCase().includes(s)) ||
        (item.sku && item.sku.toLowerCase().includes(s)) ||
        (item.barcode && item.barcode.toLowerCase().includes(s)) ||
        (item.viscosity && item.viscosity.toLowerCase().includes(s)) ||
        (item.tire_battery_spec && item.tire_battery_spec.toLowerCase().includes(s)) ||
        (item.dot_code && item.dot_code.toLowerCase().includes(s))
      );
    });
  }, [inventory, activeTab, searchTerm]);

  // Inventory KPI Aggregates (Products only, excluding services and inactive)
  const activeProducts = useMemo(() => {
    return inventory.filter((i) => i.is_active === 1 && i.item_type !== 'service');
  }, [inventory]);

  const totalCostValue = useMemo(() => {
    return activeProducts.reduce((acc, i) => acc + (Number(i.cost_price) || 0) * (Number(i.stock_qty) || 0), 0);
  }, [activeProducts]);

  const totalSalesValue = useMemo(() => {
    return activeProducts.reduce((acc, i) => acc + (Number(i.sell_price) || 0) * (Number(i.stock_qty) || 0), 0);
  }, [activeProducts]);

  const expectedProfit = totalSalesValue - totalCostValue;

  const lowStockCount = useMemo(() => {
    return activeProducts.filter((i) => i.stock_qty <= i.min_stock_alert).length;
  }, [activeProducts]);

  const servicesCount = useMemo(() => {
    return inventory.filter((i) => i.is_active === 1 && (i.category === 'service' || i.item_type === 'service')).length;
  }, [inventory]);

  const archivedCount = useMemo(() => {
    return inventory.filter((i) => i.is_active === 0).length;
  }, [inventory]);

  return (
    <div className="min-h-full flex flex-col gap-3.5 select-none pb-8">
      {/* 1. Top Header Bar */}
      <div className="apple-glass rounded-3xl p-4 lg:p-5 border border-white/10 flex flex-wrap items-center justify-between gap-3.5 flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">إدارة المخزون والكتالوج المتخصص</h2>
            <p className="text-xs text-slate-400">
              كتالوج شامل للزيوت (اللزوجة/العبوة)، الفلاتر، الكفرات (DOT)، البطاريات، والخدمات
            </p>
          </div>
        </div>

        {/* Action Buttons Hub with 5 Upgrades */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reorder Suggestions PO Sheet (المقترح 5) */}
          <button
            type="button"
            onClick={() => setShowReorderSheetModal(true)}
            className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 transition active:scale-95"
            title="استخراج أمر شراء ومطالبة توريد للنواقص لمراسلة المورد"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>كشف أمر الشراء للنواقص 📋</span>
          </button>

          {/* ABC Turnover Analytics (المقترح 4) */}
          <button
            type="button"
            onClick={() => setShowTurnoverModal(true)}
            className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5 transition active:scale-95"
            title="تحليل مبيعات الأصناف وكشف رأس المال المجمد في البضاعة الراكدة"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>تحليل دوران ABC 📊</span>
          </button>

          {/* Barcode Label Generator (المقترح 3) */}
          <button
            type="button"
            onClick={() => {
              setSelectedItemForBarcode(activeProducts[0] || null);
              setShowBarcodeModal(true);
            }}
            className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold text-xs border border-teal-500/30 flex items-center gap-1.5 transition active:scale-95"
            title="طباعة ستيكرات الباركود والرفوف الحرارية"
          >
            <Tag className="w-4 h-4 text-teal-400" />
            <span>طباعة الباركود 🏷️</span>
          </button>

          {/* Packaging Conversion */}
          <button
            type="button"
            onClick={() => setShowConvertModal(true)}
            className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-white/10 flex items-center gap-1.5 transition active:scale-95"
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>فك كراتين</span>
          </button>

          {/* Stock Adjustment */}
          <button
            type="button"
            onClick={() => {
              setSelectedItemForAdjust(activeProducts[0] || null);
              setShowAdjustModal(true);
            }}
            className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 transition active:scale-95"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>تسوية جردية</span>
          </button>

          {/* Inventory Valuation Print Sheet */}
          <button
            type="button"
            onClick={() => setShowValuationModal(true)}
            className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-white/15 flex items-center gap-1.5 transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>كشف الجرد والتقييم 🖨️</span>
          </button>

          {/* Add Item / Service */}
          <button
            type="button"
            onClick={() => {
              setItemToEdit(null);
              setShowAddModal(true);
            }}
            className="min-h-[44px] px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
            <span>+ صنف / خدمة</span>
          </button>

          {/* Purchase Invoice */}
          <button
            type="button"
            onClick={handleOpenPurchaseModal}
            className="min-h-[44px] px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 flex items-center gap-1.5 transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>فاتورة مشتريات وتوريد 📥</span>
          </button>
        </div>
      </div>

      {/* Action Banner Toast if message */}
      {actionMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 2. Top Analytics / KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <div className="apple-glass-card rounded-3xl p-3.5 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>قيمة المخزون (بالتكلفة):</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black font-mono text-white mt-1">
            {totalCostValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            السلع المتاحة: <span className="font-bold text-white">{activeProducts.length} صنف</span>
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-3.5 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>قيمة المبيعات المتوقعة:</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-400 mt-1">
            {totalSalesValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            عند بيع كامل البضاعة المخزنة
          </div>
        </div>

        <div className="apple-glass-card rounded-3xl p-3.5 border border-emerald-500/20">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>هامش الربح المتوقع:</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            +{expectedProfit.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
          </div>
          <div className="text-[11px] text-emerald-300 mt-0.5">
            متوسط العائد: {totalCostValue > 0 ? Math.round((expectedProfit / totalCostValue) * 100) : 0}%
          </div>
        </div>

        <div className={`apple-glass-card rounded-3xl p-3.5 border ${lowStockCount > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/10'}`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={lowStockCount > 0 ? 'text-rose-400' : 'text-slate-400'}>النواقص الحرجة:</span>
            <ShieldAlert className={`w-4 h-4 ${lowStockCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-xl font-black font-mono mt-1 ${lowStockCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {lowStockCount} <span className="text-xs font-sans">أصناف تحت الأمان</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>{lowStockCount > 0 ? 'تحتاج طلب توريد' : 'المخزون بوضع مستقر'}</span>
            {lowStockCount > 0 && (
              <button
                type="button"
                onClick={() => setShowReorderSheetModal(true)}
                className="text-[10px] text-amber-400 font-bold hover:underline"
              >
                عرض أمر الشراء 📋
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Fast Filter Tabs & Search */}
      <div className="apple-glass rounded-2xl p-2.5 border border-white/10 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="ابحث بالاسم، الماركة، اللزوجة (20W-50)، مقاس الكفر، الباركود، أو كود DOT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[42px] pr-10 pl-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-emerald-400"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'oil', label: '🛢️ الزيوت' },
            { id: 'filter', label: '⚙️ الفلاتر' },
            { id: 'tire', label: '🛞 الإطارات' },
            { id: 'battery', label: '🔋 البطاريات' },
            { id: 'service', label: `🔧 أجور وخدمات (${servicesCount})` },
            { id: 'low', label: `⚠️ النواقص (${lowStockCount})`, isAlert: true },
            { id: 'archived', label: `📦 الأرشيف (${archivedCount})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? tab.isAlert
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                      : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : tab.isAlert && lowStockCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Low Stock Banner if activeTab === 'low' */}
      {activeTab === 'low' && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              قائمة الأصناف التي انخفض رصيدها عن حد الأمان الأدنى ({lowStockCount} صنف) وتحتاج توريداً عاجلاً.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowReorderSheetModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>استخراج وطباعة كشف أمر الشراء 📋</span>
          </button>
        </div>
      )}

      {/* 4. Inventory Table with Apple-style Glassmorphism */}
      <div className="apple-glass rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col shadow-xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-right text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-extrabold sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="p-3.5">الصنف والمواصفات</th>
                <th className="p-3.5">الفئة والماركة</th>
                <th className="p-3.5">العبوة / المقاس</th>
                <th className="p-3.5">سعر التكلفة</th>
                <th className="p-3.5">سعر البيع للزبون</th>
                <th className="p-3.5">هامش الربح</th>
                <th className="p-3.5 text-center min-w-[130px]">الرصيد بالمخزن</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {filteredItems.map((item) => {
                const isService = item.category === 'service' || item.item_type === 'service';
                const isCritical = !isService && item.stock_qty <= item.min_stock_alert;
                const isNearAlert = !isService && !isCritical && item.stock_qty <= item.min_stock_alert * 1.5;
                const profit = (Number(item.sell_price) || 0) - (Number(item.cost_price) || 0);
                const profitMarginPercent = Number(item.cost_price) > 0
                  ? Math.round((profit / Number(item.cost_price)) * 100)
                  : 100;

                const maxBar = Math.max(item.min_stock_alert * 3, 20);
                const barPercent = Math.min(100, Math.round((item.stock_qty / maxBar) * 100));

                const dotInfo = item.category === 'tire' && item.dot_code ? calculateDotAge(item.dot_code) : null;

                return (
                  <tr key={item.id} className={`hover:bg-white/5 transition ${item.is_active === 0 ? 'opacity-50 bg-slate-900/40' : ''}`}>
                    {/* Name & SKU & Specs */}
                    <td className="p-3.5">
                      <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                        {isService && <Wrench className="w-3.5 h-3.5 text-teal-400" />}
                        <span>{item.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{item.sku}</span>
                        {item.barcode && (
                          <span className="bg-slate-800/80 text-teal-300 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            {item.barcode}
                          </span>
                        )}
                        {item.tire_battery_spec && (
                          <span className="text-teal-400 font-semibold">{item.tire_battery_spec}</span>
                        )}
                        {/* Tire DOT Age Indicator (المقترح 2) */}
                        {dotInfo && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            dotInfo.color === 'emerald'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : dotInfo.color === 'teal'
                              ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                              : dotInfo.color === 'amber'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          }`} title={`عمر الإطار الفعلي: ${dotInfo.ageInMonths} شهر (${dotInfo.ageInYears} سنة)`}>
                            DOT {item.dot_code} ({dotInfo.label})
                          </span>
                        )}
                        {item.battery_capacity_ah && (
                          <span className="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
                            {item.battery_capacity_ah}
                          </span>
                        )}
                        {item.location_shelf && (
                          <span className="text-slate-400 text-[10px] flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-500" />
                            {item.location_shelf}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Brand & Viscosity */}
                    <td className="p-3.5">
                      <span className="font-bold text-slate-300">{item.brand}</span>
                      {item.viscosity && (
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/20">
                            {item.viscosity}
                          </span>
                        </div>
                      )}
                      {item.oil_type && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.oil_type}</div>
                      )}
                    </td>

                    {/* Pack Size */}
                    <td className="p-3.5 font-mono font-bold text-slate-300">
                      {isService ? (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          أجرة يد
                        </span>
                      ) : item.pack_size ? (
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white border border-white/10">
                          {item.pack_size === 'bulk_liter' ? 'لتر فلت' : item.pack_size}
                        </span>
                      ) : (
                        <span className="text-slate-500">قطعة</span>
                      )}
                    </td>

                    {/* Cost Price */}
                    <td className="p-3.5 font-mono font-bold text-slate-300">
                      {Number(item.cost_price).toLocaleString()} ر.ي
                    </td>

                    {/* Sell Price */}
                    <td className="p-3.5 font-mono font-extrabold text-amber-400 text-sm">
                      {Number(item.sell_price).toLocaleString()} ر.ي
                    </td>

                    {/* Margin */}
                    <td className="p-3.5 font-mono">
                      <div className={`font-extrabold ${profit > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        +{profit.toLocaleString()} ر.ي
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        ({profitMarginPercent}%)
                      </div>
                    </td>

                    {/* Stock Qty & Progress Bar */}
                    <td className="p-3.5">
                      {isService ? (
                        <div className="text-center font-bold text-teal-400 text-xs">
                          خدمة مستمرة ♾️
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between font-mono font-black text-sm mb-1">
                            <span className={isCritical ? 'text-rose-400' : isNearAlert ? 'text-amber-400' : 'text-emerald-400'}>
                              {item.stock_qty}
                            </span>
                            <span className="text-[10px] font-sans text-slate-400">عبوة</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden border border-white/5">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCritical
                                  ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                                  : isNearAlert
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.max(barPercent, 4)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 text-center">
                      {item.is_active === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5">
                          <Archive className="w-3 h-3" />
                          <span>معطل/أرشيف</span>
                        </span>
                      ) : isService ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          <span>نشط بالكاشير</span>
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                          <span>ناقص حرج</span>
                        </span>
                      ) : isNearAlert ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <span>قارب النفاذ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>متوفر</span>
                        </span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Print Barcode Label (المقترح 3) */}
                        <button
                          type="button"
                          onClick={() => handleOpenBarcode(item)}
                          title="طباعة ستيكر الباركود والرف الحراري"
                          className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>

                        {/* Adjust Stock (Products only) */}
                        {!isService && item.is_active === 1 && (
                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(item)}
                            title="تسوية جردية"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Item */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="تعديل بيانات الصنف"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Active / Archive */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          title={item.is_active ? 'تعطيل وأرشفة' : 'إعادة تفعيل'}
                          className={`p-1.5 rounded-lg border transition ${
                            item.is_active
                              ? 'bg-slate-800 text-slate-400 hover:text-amber-400 border-white/5'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete / Safe Archive */}
                        <button
                          type="button"
                          onClick={() => handleDeleteOrArchive(item)}
                          title="حذف الصنف أو أرشفته نهائياً"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-sm">لا توجد أصناف مطابقة لخيارات البحث أو التصفية الحالية</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-5 py-2.5 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              نظام المخزون المحاسبي: التسويات الجردية ترحل قيود اليومية آلياً، والتوريد محمي بفواتير الشراء الرسمية.
            </span>
          </div>
          <span className="font-mono">معروض: {filteredItems.length} صنف</span>
        </div>
      </div>

      {/* Inbound Purchase Invoice Modal (accepts prefilled items from reorder sheet) */}
      <PurchaseInvoiceModal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setPrefilledPurchaseItems(null);
        }}
        inventory={inventory}
        suppliers={suppliers}
        initialItems={prefilledPurchaseItems}
        onPurchaseCompleted={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Add / Edit Inventory Modal with Markup Calculator & DOT Parser */}
      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
        onCreated={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedItemForAdjust(null);
        }}
        item={selectedItemForAdjust}
        onAdjustCompleted={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Packaging Conversion Modal */}
      <PackagingConversionModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        inventory={inventory}
        onConversionCompleted={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Inventory Valuation Printable Modal */}
      <InventoryValuationModal
        isOpen={showValuationModal}
        onClose={() => setShowValuationModal(false)}
        inventory={inventory}
      />

      {/* Barcode Label Modal (المقترح 3) */}
      <BarcodeLabelModal
        isOpen={showBarcodeModal}
        onClose={() => {
          setShowBarcodeModal(false);
          setSelectedItemForBarcode(null);
        }}
        item={selectedItemForBarcode}
      />

      {/* Turnover Analytics Modal (المقترح 4) */}
      <TurnoverAnalyticsModal
        isOpen={showTurnoverModal}
        onClose={() => setShowTurnoverModal(false)}
        onEditItem={(item) => handleOpenEdit(item)}
      />

      {/* Reorder Suggestions PO Sheet Modal (المقترح 5) */}
      <ReorderOrderSheetModal
        isOpen={showReorderSheetModal}
        onClose={() => setShowReorderSheetModal(false)}
        onConvertToPurchaseInvoice={handleConvertToPurchaseInvoice}
      />
    </div>
  );
}
