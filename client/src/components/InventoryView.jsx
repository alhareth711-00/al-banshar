import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Lock,
  ChevronDown,
  Download,
  ClipboardList,
  Sparkles,
  FileSpreadsheet,
  Upload,
  PackagePlus,
  CreditCard,
} from 'lucide-react';
import PurchaseInvoiceModal from './PurchaseInvoiceModal';
import AddInventoryModal, { calculateDotAge } from './AddInventoryModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import PackagingConversionModal from './PackagingConversionModal';
import InventoryValuationModal from './InventoryValuationModal';
import BarcodeLabelModal from './BarcodeLabelModal';
import TurnoverAnalyticsModal from './TurnoverAnalyticsModal';
import ReorderOrderSheetModal from './ReorderOrderSheetModal';
import ImportInventoryModal from './ImportInventoryModal';
import ConsignmentInboundModal from './ConsignmentInboundModal';
import GeneralPaymentVoucherModal from './GeneralPaymentVoucherModal';
import { getLocalTodayDate } from '../utils/dateUtils';
import { printStocktakeSilently, printConsignmentAuditSilently } from '../utils/inventoryPrintTemplates';

// Helper: Normalize Arabic characters for robust search (الهمزات والتاء المربوطة)
export function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '') // remove diacritics / tashkeel
    .trim();
}

// Helper: Escape HTML strings for print templates to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: Format pack size into standard readable Arabic representation
export function formatPackSize(size) {
  if (!size) return 'حبة';
  if (size === '1L') return 'علبة 1 لتر';
  if (size === '4L') return 'دبة 4 لتر';
  if (size === '5L') return 'دبة 5 لتر';
  if (size === '20L') return 'دبة 20 لتر';
  if (size === '25L') return 'دبة 25 لتر';
  if (size === 'bulk_liter') return 'برميل الزيت (200 لتر)';
  if (size === 'carton') return 'كرتون';
  if (size === 'unit') return 'حبة/قطعة';
  return size;
}

export default function InventoryView({
  inventory = [],
  onRefreshData,
  isOwnerMode = false,
  onRequireOwnerAuth,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViscosity, setSelectedViscosity] = useState('all');
  const [tireFilterAgingOnly, setTireFilterAgingOnly] = useState(false);
  const [selectedConsignmentSupplier, setSelectedConsignmentSupplier] = useState('all');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState(null);
  const [showTurnoverModal, setShowTurnoverModal] = useState(false);
  const [showReorderSheetModal, setShowReorderSheetModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [prefilledPurchaseItems, setPrefilledPurchaseItems] = useState(null);
  const [showConsignmentInboundModal, setShowConsignmentInboundModal] = useState(false);
  const [selectedConsignmentInboundItem, setSelectedConsignmentInboundItem] = useState(null);
  const [showConsignmentPayModal, setShowConsignmentPayModal] = useState(false);
  const [consignmentPayInitialData, setConsignmentPayInitialData] = useState(null);

  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [actionMessage, setActionMessage] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [showAdvancedToolsMenu, setShowAdvancedToolsMenu] = useState(false);
  const toolsMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Debounce search input (150ms) to maintain silky smooth UI during fast typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close advanced tools menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) {
        setShowAdvancedToolsMenu(false);
      }
    };
    if (showAdvancedToolsMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showAdvancedToolsMenu]);

  // Guarded actions for Cashier Mode
  const guardedAction = (callback, title = 'إجراء محمي برمز المالك', subtitle = 'يرجى إدخال رمز PIN للمتابعة') => {
    if (isOwnerMode) {
      callback();
    } else if (onRequireOwnerAuth) {
      onRequireOwnerAuth(callback, title, subtitle);
    } else {
      callback();
    }
  };

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
      setActionMessage('فشل تغيير حالة الصنف: ' + err.message);
      setTimeout(() => setActionMessage(''), 5000);
    }
  };

  const handleDeleteOrArchive = (item) => {
    guardedAction(() => {
      setDeleteConfirmItem(item);
    }, 'حذف أو أرشفة صنف (محمي)', 'حذف الصنف أو أرشفته محمي بصلاحية المالك');
  };

  const executeDeleteOrArchive = async (item) => {
    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(''), 5000);
        if (onRefreshData) onRefreshData();
      } else {
        setActionMessage('⚠️ فشل الإجراء: ' + (data.message || 'حدث خطأ'));
        setTimeout(() => setActionMessage(''), 5000);
      }
    } catch (err) {
      setActionMessage('⚠️ فشل إجراء الحذف/الأرشفة: ' + err.message);
      setTimeout(() => setActionMessage(''), 5000);
    } finally {
      setDeleteConfirmItem(null);
    }
  };

  // Export Inventory as Excel-compatible CSV with UTF-8 BOM
  const handleExportExcelCsv = () => {
    const activeItems = inventory.filter((i) => i.is_active === 1);
    let csv = '\uFEFF'; // UTF-8 BOM for Arabic support in Excel
    csv += 'كود الصنف (SKU),اسم الصنف,القسم,الماركة,اللزوجة / المقاس,الباركود,الرصيد بالمخزن,حد الأمان,سعر التكلفة,سعر البيع,إجمالي قيمة التكلفة,نوع الملكية,موقع الرف\n';

    activeItems.forEach((item) => {
      const isService = item.category === 'service' || item.item_type === 'service';
      const cost = Number(item.cost_price) || 0;
      const sell = Number(item.sell_price) || 0;
      const stock = isService ? 0 : Number(item.stock_qty) || 0;
      const totalCost = Math.round(cost * Math.max(0, stock));
      const ownership = item.is_consignment ? `أمانة (${item.consignment_supplier_name || 'مورد عام'})` : 'ملكية المحل';

      const row = [
        `"${item.sku || ''}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${item.category || ''}"`,
        `"${item.brand || ''}"`,
        `"${item.viscosity || item.tire_battery_spec || item.pack_size || ''}"`,
        `"${item.barcode || ''}"`,
        stock,
        item.min_stock_alert || 0,
        cost,
        sell,
        totalCost,
        `"${ownership}"`,
        `"${item.location_shelf || ''}"`,
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `جرد_مخزون_البنشر_${getLocalTodayDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowAdvancedToolsMenu(false);
  };

  // Print Comprehensive Physical Stocktake Count Sheet (كشف الجرد الفعلي للمستودع)
  const handlePrintStocktakeSheet = (layout = 'thermal') => {
    setShowAdvancedToolsMenu(false);
    printStocktakeSilently(inventory, null, layout);
  };

  const handleOpenConsignmentInbound = (item = null) => {
    setSelectedConsignmentInboundItem(item);
    setShowConsignmentInboundModal(true);
  };

  const handleOpenConsignmentPayment = (supplierName) => {
    const s = suppliers.find((sup) => sup.name === supplierName || sup.company_name === supplierName);
    setConsignmentPayInitialData({
      party_type: 'supplier',
      party_id: s ? s.id : '',
      party_name: supplierName,
      amount: s && Number(s.balance_due) > 0 ? Number(s.balance_due) : '',
      description: `سداد وتصفية مستحقات بضاعة أمانة وتصريف - المورد: ${supplierName}`,
    });
    setShowConsignmentPayModal(true);
  };

  // Print comprehensive consignment audit & settlement liquidation report
  const handlePrintConsignmentReport = async (layout = 'thermal') => {
    try {
      const url = selectedConsignmentSupplier !== 'all'
        ? `/api/inventory/consignment-settlements?supplier=${encodeURIComponent(selectedConsignmentSupplier)}`
        : '/api/inventory/consignment-settlements';
      const res = await fetch(url);
      const json = await res.json();
      const settlementData = json.success ? json.data : [];
      printConsignmentAuditSilently(settlementData, null, layout);
    } catch (err) {
      console.error('Error printing consignment report:', err);
      alert('فشل استخراج كشف تصفية بضاعة الأمانات: ' + err.message);
    }
  };

  // Active owned inventory items (excluding archived, services, and supplier consignment)
  const activeProducts = useMemo(() => {
    return inventory.filter((i) => i.is_active === 1 && i.item_type !== 'service' && (!i.is_consignment || i.is_consignment === 0));
  }, [inventory]);

  // Consignment items
  const consignmentItems = useMemo(() => {
    return inventory.filter((i) => i.is_active === 1 && i.is_consignment === 1);
  }, [inventory]);

  const consignmentCount = consignmentItems.length;

  const servicesCount = useMemo(() => {
    return inventory.filter((i) => i.is_active === 1 && (i.category === 'service' || i.item_type === 'service')).length;
  }, [inventory]);

  const archivedCount = useMemo(() => {
    return inventory.filter((i) => i.is_active === 0).length;
  }, [inventory]);

  const lowStockCount = useMemo(() => {
    return activeProducts.filter((i) => i.stock_qty <= i.min_stock_alert).length;
  }, [activeProducts]);

  const negativeStockItems = useMemo(() => {
    return activeProducts.filter((i) => i.stock_qty < 0);
  }, [activeProducts]);

  // Shop Owned Valuation calculations (Guarded against negative stock multiplying costs into negative)
  const totalCostValue = useMemo(() => {
    return Math.round(
      activeProducts.reduce(
        (acc, i) => acc + (Number(i.cost_price) > 0 ? Number(i.cost_price) : 0) * Math.max(0, Number(i.stock_qty) || 0),
        0
      )
    );
  }, [activeProducts]);

  const totalSalesValue = useMemo(() => {
    return Math.round(
      activeProducts.reduce(
        (acc, i) => acc + (Number(i.sell_price) > 0 ? Number(i.sell_price) : 0) * Math.max(0, Number(i.stock_qty) || 0),
        0
      )
    );
  }, [activeProducts]);

  const expectedProfit = totalSalesValue - totalCostValue;
  const marginPercent = totalCostValue > 0 && Number.isFinite(expectedProfit / totalCostValue)
    ? Math.round((expectedProfit / totalCostValue) * 100)
    : 0;

  // Dynamic Oil Viscosity & Pack Size Pills derived from actual items in inventory
  const oilViscosityPills = useMemo(() => {
    const oils = inventory.filter((i) => i.is_active === 1 && i.category === 'oil');
    const viscosities = new Set(['20W-50', '10W-40', '5W-30', '5W-40', '0W-20']);
    oils.forEach((o) => {
      if (o.viscosity && o.viscosity.trim()) viscosities.add(o.viscosity.trim());
    });

    const pills = [{ id: 'all', label: 'الكل', count: oils.length }];
    Array.from(viscosities).sort().forEach((v) => {
      const count = oils.filter((i) => i.viscosity === v).length;
      if (count > 0 || ['20W-50', '10W-40', '5W-30', '5W-40', '0W-20'].includes(v)) {
        pills.push({ id: v, label: v, count });
      }
    });

    pills.push(
      { id: '1L', label: 'علبة 1 لتر', count: oils.filter((i) => i.pack_size === '1L').length },
      { id: '4L', label: 'دبة 4 لتر', count: oils.filter((i) => i.pack_size === '4L').length },
      { id: '5L', label: 'دبة 5 لتر', count: oils.filter((i) => i.pack_size === '5L').length },
      { id: '20L', label: 'دبة 20 لتر', count: oils.filter((i) => i.pack_size === '20L').length },
      { id: '25L', label: 'دبة 25 لتر', count: oils.filter((i) => i.pack_size === '25L').length },
      { id: 'bulk_liter', label: 'لتر فلت', count: oils.filter((i) => i.pack_size === 'bulk_liter').length }
    );
    return pills;
  }, [inventory]);

  // Dynamic Consignment Suppliers List
  const consignmentSuppliersList = useMemo(() => {
    const list = new Set();
    consignmentItems.forEach((i) => {
      if (i.consignment_supplier_name) list.add(i.consignment_supplier_name);
    });
    return Array.from(list);
  }, [consignmentItems]);

  const consignmentTotalStock = useMemo(() => {
    return consignmentItems.reduce((acc, i) => acc + Math.max(0, Number(i.stock_qty) || 0), 0);
  }, [consignmentItems]);

  const consignmentTotalCostValue = useMemo(() => {
    return Math.round(
      consignmentItems.reduce(
        (acc, i) => acc + (Number(i.cost_price) || 0) * Math.max(0, Number(i.stock_qty) || 0),
        0
      )
    );
  }, [consignmentItems]);

  // Aging Tires Count
  const agingTiresCount = useMemo(() => {
    return inventory.filter((i) => {
      if (i.is_active === 0 || i.category !== 'tire' || !i.dot_code) return false;
      const dot = calculateDotAge(i.dot_code);
      return dot && (dot.status === 'aging' || dot.status === 'expired' || dot.ageInMonths > 24);
    }).length;
  }, [inventory]);

  // Dynamic filter tab counts
  const categoryCounts = useMemo(() => {
    const active = inventory.filter((i) => i.is_active === 1);
    return {
      all: active.length,
      oil: active.filter((i) => i.category === 'oil').length,
      filter: active.filter((i) => i.category === 'filter').length,
      tire: active.filter((i) => i.category === 'tire').length,
      battery: active.filter((i) => i.category === 'battery').length,
      consignment: consignmentCount,
      service: servicesCount,
      low: lowStockCount,
      archived: archivedCount,
    };
  }, [inventory, consignmentCount, servicesCount, lowStockCount, archivedCount]);

  // Filter items based on activeTab, fast filters, and normalized search query
  const filteredItems = useMemo(() => {
    const normSearch = normalizeArabic(searchTerm);

    return inventory.filter((item) => {
      // 1. Tab Filtering
      if (activeTab === 'archived') {
        if (item.is_active === 1) return false;
      } else {
        if (item.is_active === 0) return false;

        if (activeTab === 'oil') {
          if (item.category !== 'oil') return false;
          if (selectedViscosity !== 'all') {
            if (['4L', '1L', 'bulk_liter'].includes(selectedViscosity)) {
              if (item.pack_size !== selectedViscosity) return false;
            } else {
              if (item.viscosity !== selectedViscosity) return false;
            }
          }
        } else if (activeTab === 'filter') {
          if (item.category !== 'filter') return false;
        } else if (activeTab === 'tire') {
          if (item.category !== 'tire') return false;
          if (tireFilterAgingOnly) {
            const dot = item.dot_code ? calculateDotAge(item.dot_code) : null;
            if (!dot || (dot.status !== 'aging' && dot.status !== 'expired' && dot.ageInMonths <= 24)) {
              return false;
            }
          }
        } else if (activeTab === 'battery') {
          if (item.category !== 'battery') return false;
        } else if (activeTab === 'service') {
          if (item.category !== 'service' && item.item_type !== 'service') return false;
        } else if (activeTab === 'consignment') {
          if (item.is_consignment !== 1) return false;
          if (selectedConsignmentSupplier !== 'all' && item.consignment_supplier_name !== selectedConsignmentSupplier) {
            return false;
          }
        } else if (activeTab === 'low') {
          const isSrv = item.category === 'service' || item.item_type === 'service';
          if (isSrv || item.stock_qty > item.min_stock_alert) return false;
        }
      }

      // 2. Normalized Multi-parameter Search
      if (!normSearch) return true;

      const normName = normalizeArabic(item.name);
      const normBrand = normalizeArabic(item.brand);
      const normSku = normalizeArabic(item.sku);
      const normBarcode = normalizeArabic(item.barcode);
      const normVisc = normalizeArabic(item.viscosity);
      const normSpec = normalizeArabic(item.tire_battery_spec);
      const normDot = normalizeArabic(item.dot_code);
      const normConsignment = normalizeArabic(item.consignment_supplier_name);
      const normShelf = normalizeArabic(item.location_shelf);

      return (
        normName.includes(normSearch) ||
        normBrand.includes(normSearch) ||
        normSku.includes(normSearch) ||
        normBarcode.includes(normSearch) ||
        normVisc.includes(normSearch) ||
        normSpec.includes(normSearch) ||
        normDot.includes(normSearch) ||
        normConsignment.includes(normSearch) ||
        normShelf.includes(normSearch)
      );
    });
  }, [inventory, activeTab, selectedViscosity, tireFilterAgingOnly, selectedConsignmentSupplier, searchTerm]);

  // Helper: Get item unit badge
  const getItemUnitLabel = (item) => {
    if (item.category === 'service' || item.item_type === 'service') return 'خدمة';
    if (item.retail_unit) return item.retail_unit;
    if (item.pack_size === 'bulk_liter') return 'لتر';
    if (item.category === 'tire') return 'إطار';
    if (item.category === 'battery') return 'حبة';
    if (item.category === 'filter') return 'حبة';
    if (item.category === 'accessory') return 'قطعة';
    if (['4L', '5L', '20L', '25L'].includes(item.pack_size)) return 'دبة';
    if (item.pack_size === '1L') return 'علبة';
    if (item.pack_size === 'carton') return 'كرتون';
    return 'عبوة';
  };

  return (
    <div className="min-h-full flex flex-col gap-3.5 select-none pb-8">
      {/* 1. Top Header Bar */}
      <div className="apple-glass rounded-3xl p-4 lg:p-5 border border-white/10 flex flex-wrap items-center justify-between gap-3.5 flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">إدارة المخزون والكتالوج المتخصص</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                دقيق 100%
              </span>
            </div>
            <p className="text-xs text-slate-400">
              كتالوج شامل للزيوت (اللزوجة/العبوة)، الفلاتر، الكفرات (DOT)، البطاريات، والخدمات
            </p>
          </div>
        </div>

        {/* Action Buttons Hub */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Item */}
          <button
            type="button"
            onClick={() => {
              guardedAction(
                () => {
                  setItemToEdit(null);
                  setShowAddModal(true);
                },
                'إضافة صنف أو خدمة جديدة (محمي)',
                'تسجيل أصناف وخدمات جديدة محمي برمز المالك'
              );
            }}
            className="min-h-[46px] px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition active:scale-95 border border-blue-400/30"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ إضافة صنف جديد</span>
          </button>

          {/* Purchase Invoice */}
          <button
            type="button"
            onClick={handleOpenPurchaseModal}
            className="min-h-[46px] px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>+ فاتورة مشتريات وتوريد 📥</span>
          </button>

          {/* Advanced Tools & Reports Dropdown Menu */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              type="button"
              onClick={() => setShowAdvancedToolsMenu((prev) => !prev)}
              className="min-h-[46px] px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-white/15 flex items-center gap-2 transition active:scale-95 shadow-sm"
              title="عرض الأدوات والتقارير المتقدمة للمخزون"
            >
              <span>🛠️ أدوات وتقارير المخزون المتقدمة</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showAdvancedToolsMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showAdvancedToolsMenu && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Physical Stock Count Sheet */}
                <button
                  type="button"
                  onClick={() => handlePrintStocktakeSheet('thermal')}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">طباعة كشف الجرد الفعلي (كاشير 80mm) 📋</div>
                    <div className="text-[10px] text-slate-400">استمارة رول لمطابقة وعد الرفوف يدوياً بالقلم</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintStocktakeSheet('a4')}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">طباعة كشف الجرد الفعلي (A4 رسمي) 📄</div>
                    <div className="text-[10px] text-slate-400">جدول A4 واسع ومعتمد لمطابقة وعد المستودع</div>
                  </div>
                </button>

                {/* 2. Stock Adjustment */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    guardedAction(
                      () => {
                        setSelectedItemForAdjust(activeProducts[0] || null);
                        setShowAdjustModal(true);
                      },
                      'تسوية وتعديل الجرد (محمي)',
                      'تعديل كميات المخزون محمي برمز المالك'
                    );
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">تعديل كميات الجرد الفعلي</div>
                    <div className="text-[10px] text-slate-400">تسوية الفوارق بين الرف والنظام وترحيل القيد</div>
                  </div>
                </button>

                {/* 3. Carton / Drum Unpacking */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    setShowConvertModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">فك وتحويل الكراتين والبراميل 📦</div>
                    <div className="text-[10px] text-slate-400">تحويل كرتون أو برميل إلى علب أو لترات للبيع</div>
                  </div>
                </button>

                {/* 4. Reorder PO Sheet */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    setShowReorderSheetModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">كشف النواقص لطلب البضاعة</div>
                    <div className="text-[10px] text-slate-400">إعداد طلبية توريد الزيوت الناقصة للواتساب</div>
                  </div>
                </button>

                {/* 5. Inventory Valuation */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    guardedAction(
                      () => setShowValuationModal(true),
                      'كشف تقييم المخزون (محمي)',
                      'معاينة رأس مال البضاعة محمي بصلاحية المالك'
                    );
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">إجمالي قيمة البضاعة (رأس المال)</div>
                    <div className="text-[10px] text-slate-400">تقرير جرد وتقييم بالتكلفة والبيع للأصول</div>
                  </div>
                </button>

                {/* 6. Turnover ABC */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    setShowTurnoverModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">حركة الأصناف (الأكثر طلباً والراكد)</div>
                    <div className="text-[10px] text-slate-400">كشف الأصناف السريعة والنائمة في الرفوف</div>
                  </div>
                </button>

                {/* 7. Barcode Label Generator */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    setSelectedItemForBarcode(activeProducts[0] || null);
                    setShowBarcodeModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">طباعة لصقات وباركود الأصناف</div>
                    <div className="text-[10px] text-slate-400">ملصقات الرفوف والأسعار الحرارية 50x25</div>
                  </div>
                </button>

                {/* 7.5 Import from Excel / CSV */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    setShowImportModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-emerald-500/20 text-right flex items-center gap-2.5 transition text-emerald-300 hover:text-emerald-200 border-t border-white/5 pt-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">استيراد الأصناف من ملف Excel / CSV 📥</div>
                    <div className="text-[10px] text-emerald-400/80">رفع ملف الأصناف ومعاينة الأسعار والمخزون</div>
                  </div>
                </button>

                {/* 8. Export to Excel / CSV */}
                <button
                  type="button"
                  onClick={handleExportExcelCsv}
                  className="w-full p-2.5 rounded-xl hover:bg-emerald-500/20 text-right flex items-center gap-2.5 transition text-emerald-300 hover:text-emerald-200 border-t border-white/5 pt-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">تصدير المخزون إلى ملف Excel / CSV 📊</div>
                    <div className="text-[10px] text-emerald-400/80">تنزيل كامل بيانات الكتالوج متوافقة مع Excel</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Banner Toast if message */}
      {actionMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Critical Negative Stock Banner if items have negative stock */}
      {negativeStockItems.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-300 text-xs font-bold flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />
            <div>
              <div className="text-sm font-black text-rose-200">
                ⚠️ تنبيه مالي: يوجد ({negativeStockItems.length}) أصناف برصيد سالب نتيجة بيع بدون فاتورة شراء مسبقة!
              </div>
              <div className="text-[11px] text-rose-300/80 mt-0.5">
                الأرصدة السالبة: {negativeStockItems.map((i) => `${i.name} (${i.stock_qty})`).join(' • ')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPurchaseModal}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition active:scale-95"
            >
              تسجيل فاتورة توريد عاجلة 📥
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Analytics / KPI Bar with Role-Based Privacy Masking */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        {/* Cost Value Card (Protected in Cashier Mode) */}
        <div
          onClick={() => {
            if (!isOwnerMode) {
              guardedAction(() => {}, 'عرض رأس المال (محمي)', 'أدخل رمز PIN لعرض تكلفة المخزون');
            }
          }}
          className={`apple-glass-card rounded-3xl p-3.5 border border-white/10 ${
            !isOwnerMode ? 'cursor-pointer hover:border-amber-500/40' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>قيمة المخزون (بالتكلفة):</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black font-mono text-white mt-1 flex items-center gap-1.5 min-w-0">
            {isOwnerMode ? (
              <>
                <span className="truncate">{totalCostValue.toLocaleString()}</span>
                <span className="text-xs font-sans text-slate-400 shrink-0">ر.ي</span>
              </>
            ) : (
              <span className="text-amber-400 font-sans text-base flex items-center gap-1 font-bold">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>*** (محمي بالرمز)</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>السلع المتاحة: <span className="font-bold text-white">{activeProducts.length} صنف</span></span>
            <span className="text-[10px] text-slate-500 font-mono">(ملكية المحل)</span>
          </div>
        </div>

        {/* Expected Sales Value Card (Publicly verifiable) */}
        <div className="apple-glass-card rounded-3xl p-3.5 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>قيمة المبيعات المتوقعة:</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-400 mt-1 flex items-center gap-1.5 min-w-0">
            <span className="truncate">{totalSalesValue.toLocaleString()}</span>
            <span className="text-xs font-sans text-slate-400 shrink-0">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            عند بيع كامل البضاعة المصرحة
          </div>
        </div>

        {/* Expected Profit & Return (Protected in Cashier Mode) */}
        <div
          onClick={() => {
            if (!isOwnerMode) {
              guardedAction(() => {}, 'عرض هوامش الأرباح (محمي)', 'أدخل رمز PIN لعرض الأرباح المتوقعة');
            }
          }}
          className={`apple-glass-card rounded-3xl p-3.5 border border-emerald-500/20 ${
            !isOwnerMode ? 'cursor-pointer hover:border-amber-500/40' : ''
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>هامش الربح المتوقع:</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1 flex items-center gap-1.5 min-w-0">
            {isOwnerMode ? (
              <>
                <span className="truncate">+{expectedProfit.toLocaleString()}</span>
                <span className="text-xs font-sans text-slate-400 shrink-0">ر.ي</span>
              </>
            ) : (
              <span className="text-amber-400 font-sans text-base flex items-center gap-1 font-bold">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>*** (محمي بالرمز)</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-emerald-300 mt-0.5">
            {isOwnerMode ? `متوسط العائد: ${marginPercent}%` : 'اضغط لإدخال رمز PIN'}
          </div>
        </div>

        {/* Critical Low Stock Card */}
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

      {/* 3. Fast Filter Tabs & Search with Arabic Normalization & Debouncing */}
      <div className="apple-glass rounded-2xl p-2.5 border border-white/10 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث بالاسم، الماركة، اللزوجة (20W-50)، مقاس الكفر، الباركود، أو كود DOT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[42px] pr-10 pl-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-emerald-400"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        {/* Tab Buttons with Accurate Live Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: `الكل (${categoryCounts.all})` },
            { id: 'oil', label: `🛢️ الزيوت (${categoryCounts.oil})` },
            { id: 'filter', label: `⚙️ الفلاتر (${categoryCounts.filter})` },
            { id: 'tire', label: `🛞 الإطارات (${categoryCounts.tire})` },
            { id: 'battery', label: `🔋 البطاريات (${categoryCounts.battery})` },
            { id: 'consignment', label: `🤝 بضاعة الأمانات (${categoryCounts.consignment})` },
            { id: 'service', label: `🔧 أجور وخدمات (${categoryCounts.service})` },
            { id: 'low', label: `⚠️ النواقص (${categoryCounts.low})`, isAlert: true },
            { id: 'archived', label: `📦 الأرشيف (${categoryCounts.archived})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'oil') setSelectedViscosity('all');
                  if (tab.id !== 'tire') setTireFilterAgingOnly(false);
                  if (tab.id !== 'consignment') setSelectedConsignmentSupplier('all');
                }}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? tab.isAlert
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                      : tab.id === 'consignment'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                      : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                    : tab.isAlert && lowStockCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : tab.id === 'consignment' && consignmentCount > 0
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:text-white'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Viscosity & Pack Size Filter Pills for Oil */}
      {activeTab === 'oil' && (
        <div className="apple-glass rounded-2xl p-2.5 border border-amber-500/20 bg-amber-500/5 flex flex-wrap items-center gap-1.5 animate-in fade-in">
          <span className="text-amber-300 font-extrabold text-xs px-2 flex items-center gap-1">
            <span>🛢️ فرز لزوجة وسعة الزيت:</span>
          </span>
          {oilViscosityPills.map((pill) => {
            const isSel = selectedViscosity === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedViscosity(pill.id)}
                className={`min-h-[34px] px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white border border-white/10 hover:border-amber-400/40'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isSel ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-white/10 text-slate-400'}`}>
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tire DOT Age Tracker & Filter Banner */}
      {activeTab === 'tire' && (
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-teal-500/20 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-base">
              🛞
            </div>
            <div>
              <div className="text-slate-200 font-bold">متابعة أعمار وتواريخ الإطارات (DOT Age Tracker):</div>
              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> جديد (&le; سنة)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span> مناسب (1-2 سنة)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> متقادم (2-3 سنوات)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> قديم عالي الخطورة (&gt; 3 سنوات)</span>
              </div>
            </div>
          </div>

          {agingTiresCount > 0 ? (
            <button
              type="button"
              onClick={() => setTireFilterAgingOnly((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                tireFilterAgingOnly
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{tireFilterAgingOnly ? 'عرض جميع الإطارات' : `⚠️ عرض الإطارات المتقادمة فقط (${agingTiresCount})`}</span>
            </button>
          ) : (
            <div className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>جميع الإطارات بحالة تشغيلية ممتازة وحديثة</span>
            </div>
          )}
        </div>
      )}

      {/* Consignment Stock Analytical Banner & Settlement Action */}
      {activeTab === 'consignment' && (
        <div className="apple-glass rounded-3xl p-4 border border-amber-500/25 bg-amber-500/5 flex flex-col gap-3.5 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-lg shadow-amber-500/20">
                🤝
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">إدارة وجرد بضاعة الأمانات والتصريف (Consignment Stock)</h3>
                <p className="text-xs text-amber-200/80">
                  بضائع مودعة من الموردين يتم التحاسب عليها وتوريد مبالغها بعد البيع الفعلي فقط.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenConsignmentInbound()}
                disabled={consignmentCount === 0}
                className="min-h-[42px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
              >
                <PackagePlus className="w-4 h-4 stroke-[2.5]" />
                <span>استلام دفعة أمانة 📥</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintConsignmentReport('thermal')}
                disabled={consignmentCount === 0}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition disabled:opacity-50"
                title="طباعة إيصال كاشير 80mm حراري"
              >
                <Printer className="w-4 h-4" />
                <span>كشف تصفية الأمانة (كاشير 80mm) 🧾</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintConsignmentReport('a4')}
                disabled={consignmentCount === 0}
                className="min-h-[42px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition disabled:opacity-50"
                title="طباعة تقرير رسمي A4 عريض"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>A4 رسمي 📄</span>
              </button>

              {selectedConsignmentSupplier !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleOpenConsignmentPayment(selectedConsignmentSupplier)}
                  className="min-h-[42px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>سداد مستحقات ({selectedConsignmentSupplier}) 💳</span>
                </button>
              )}
            </div>
          </div>

          {/* Consignment KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5">
              <div className="text-[11px] text-slate-400 font-bold">أصناف الأمانات المودعة:</div>
              <div className="text-xl font-black font-mono text-white mt-0.5">{consignmentCount} صنف</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5">
              <div className="text-[11px] text-slate-400 font-bold">إجمالي الرصيد المتبقي بالرفوف:</div>
              <div className="text-xl font-black font-mono text-amber-300 mt-0.5">{consignmentTotalStock} علبة/حبة</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5">
              <div className="text-[11px] text-slate-400 font-bold">إجمالي القيمة المستحقة للمورد بالتكلفة:</div>
              <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                {consignmentTotalCostValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
              </div>
            </div>
          </div>

          {/* Consignment Supplier Filter Pills */}
          {consignmentSuppliersList.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              <span className="text-[11px] text-slate-400 font-bold">تصفية حسب المورد:</span>
              <button
                type="button"
                onClick={() => setSelectedConsignmentSupplier('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedConsignmentSupplier === 'all'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-300 border border-white/10'
                }`}
              >
                الكل ({consignmentCount})
              </button>
              {consignmentSuppliersList.map((sup) => (
                <button
                  key={sup}
                  type="button"
                  onClick={() => setSelectedConsignmentSupplier(sup)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    selectedConsignmentSupplier === sup
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-300 border border-white/10'
                  }`}
                >
                  {sup} ({consignmentItems.filter((i) => i.consignment_supplier_name === sup).length})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* 4. Inventory Table - Zebra High-Contrast Standard */}
      <div className="rounded-3xl border border-slate-700/80 bg-slate-950 flex-1 overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-900 border-b-2 border-slate-700 text-slate-200 font-black sticky top-0 backdrop-blur z-10 text-xs">
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
            <tbody className="divide-y divide-slate-800/70 font-mono">
              {filteredItems.map((item) => {
                const isService = item.category === 'service' || item.item_type === 'service';
                const isCritical = !isService && item.stock_qty <= item.min_stock_alert;
                const isNearAlert = !isService && !isCritical && item.stock_qty <= item.min_stock_alert * 1.5;
                const isNegative = !isService && item.stock_qty < 0;
                const profit = (Number(item.sell_price) || 0) - (Number(item.cost_price) || 0);
                const profitMarginPercent = Number(item.cost_price) > 0
                  ? Math.round((profit / Number(item.cost_price)) * 100)
                  : 100;

                const maxBar = Math.max(item.min_stock_alert * 3, 20);
                const barPercent = Math.min(100, Math.max(4, Math.round((Math.max(0, item.stock_qty) / maxBar) * 100)));

                const dotInfo = item.category === 'tire' && item.dot_code ? calculateDotAge(item.dot_code) : null;
                const unitLabel = getItemUnitLabel(item);

                return (
                  <tr
                    key={item.id}
                    className={`even:bg-slate-900/85 odd:bg-slate-950 hover:bg-amber-400/10 border-b border-slate-800/80 transition text-white ${
                      item.is_active === 0 ? 'opacity-50 bg-slate-900/40' : ''
                    }`}
                  >
                    {/* Name & SKU & Specs */}
                    <td className="p-3.5 font-sans font-bold">
                      <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                        {isService && <Wrench className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                        <span>{item.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-300">{item.sku}</span>
                        {item.barcode && (
                          <span className="bg-slate-800/80 text-teal-300 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            {item.barcode}
                          </span>
                        )}
                        {item.tire_battery_spec && (
                          <span className="text-teal-400 font-semibold">{item.tire_battery_spec}</span>
                        )}
                        {Boolean(item.is_consignment) && (
                          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <span>🤝 أمانة:</span>
                            <span className="font-extrabold">{item.consignment_supplier_name || 'مورد عام'}</span>
                          </span>
                        )}
                        {dotInfo && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                              dotInfo.color === 'emerald'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : dotInfo.color === 'teal'
                                ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                                : dotInfo.color === 'amber'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
                            }`}
                            title={`عمر الإطار الفعلي: ${dotInfo.ageInMonths} شهر (${dotInfo.ageInYears} سنة) - سنة الصنع ${dotInfo.year}`}
                          >
                            <span>🛞 DOT {item.dot_code}:</span>
                            <span>{dotInfo.label}</span>
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
                      <span className="font-bold text-slate-300">
                        {item.brand && item.brand.trim() && item.brand !== 'عام' ? (
                          item.brand
                        ) : (
                          <span className="text-slate-600 font-normal select-none">—</span>
                        )}
                      </span>
                      {item.category === 'oil' && item.viscosity && (
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/20">
                            {item.viscosity}
                          </span>
                        </div>
                      )}
                      {item.category === 'oil' && item.oil_type && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.oil_type}</div>
                      )}
                    </td>

                    {/* Pack Size & Specs (العبوة / المقاس) */}
                    <td className="p-3.5 font-mono font-bold text-slate-300">
                      {isService ? (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-sans">
                          أجر وخدمة
                        </span>
                      ) : item.category === 'oil' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white border border-white/10 text-xs font-sans">
                          {formatPackSize(item.pack_size)}
                        </span>
                      ) : item.category === 'tire' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-sans">
                          {item.tire_battery_spec ? `مقاس ${item.tire_battery_spec}` : 'إطار مفرد'}
                        </span>
                      ) : item.category === 'battery' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-sans">
                          {item.battery_capacity_ah ? item.battery_capacity_ah : 'حبة بطارية'}
                        </span>
                      ) : item.category === 'filter' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 border border-white/10 text-xs font-sans">
                          {item.bulk_unit && item.bulk_unit !== 'حبة' ? `${item.retail_unit || 'حبة'} (${item.bulk_unit} ${item.carton_pack_qty || 10})` : (item.retail_unit || 'حبة')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 border border-white/10 text-xs font-sans">
                          {item.bulk_unit && item.bulk_unit !== 'قطعة' && item.bulk_unit !== 'حبة' ? `${item.retail_unit || 'قطعة'} (${item.bulk_unit} ${item.carton_pack_qty || 10})` : (item.retail_unit || 'قطعة')}
                        </span>
                      )}
                    </td>

                    {/* Cost Price (Protected in Cashier Mode) */}
                    <td className="p-3.5 font-mono font-bold text-slate-300">
                      {isService ? (
                        <span className="text-slate-500 font-normal">---</span>
                      ) : isOwnerMode ? (
                        <span>{Math.round(Number(item.cost_price)).toLocaleString()} ر.ي</span>
                      ) : (
                        <span
                          onClick={() => guardedAction(() => {}, 'عرض سعر التكلفة (محمي)', 'أدخل رمز PIN لعرض الأسعار')}
                          className="text-slate-500 font-sans text-[11px] flex items-center gap-1 cursor-pointer hover:text-amber-400"
                          title="محمي برمز المالك - انقر لفتحه"
                        >
                          <Lock className="w-3 h-3 text-amber-500/80 inline" />
                          <span>***</span>
                        </span>
                      )}
                    </td>

                    {/* Sell Price */}
                    <td className="p-3.5 font-mono font-extrabold text-amber-400 text-sm">
                      {Math.round(Number(item.sell_price)).toLocaleString()} ر.ي
                    </td>

                    {/* Margin (Protected in Cashier Mode) */}
                    <td className="p-3.5 font-mono">
                      {isService ? (
                        <span className="text-teal-400 font-bold text-xs font-sans">100% مصنعية</span>
                      ) : isOwnerMode ? (
                        <>
                          <div className={`font-extrabold ${profit > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            +{Math.round(profit).toLocaleString()} ر.ي
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            ({profitMarginPercent}%)
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-500 font-sans text-[11px]">***</span>
                      )}
                    </td>

                    {/* Stock Qty & Progress Bar */}
                    <td className="p-3.5">
                      {isService ? (
                        <div className="text-center font-bold text-teal-400 text-xs font-sans">
                          خدمة مستمرة ♾️
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between font-mono font-black text-sm mb-1">
                            <span
                              className={
                                isNegative
                                  ? 'text-rose-400 font-black animate-pulse'
                                  : isCritical
                                  ? 'text-rose-400'
                                  : isNearAlert
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {item.stock_qty}
                            </span>
                            <span className="text-[10px] font-sans text-slate-400">{unitLabel}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden border border-white/5">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isNegative
                                  ? 'bg-rose-600 shadow-sm shadow-rose-500/50'
                                  : isCritical
                                  ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                                  : isNearAlert
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 text-center">
                      {item.is_active === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5 font-sans">
                          <Archive className="w-3 h-3" />
                          <span>معطل/أرشيف</span>
                        </span>
                      ) : isService ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 font-sans">
                          <span>نشط بالكاشير</span>
                        </span>
                      ) : isNegative ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-600/30 text-rose-300 border border-rose-500/50 font-sans animate-pulse" title="تم البيع بدون توريد - يلزم تسجيل فاتورة شراء">
                          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                          <span>رصيد سالب!</span>
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-sans">
                          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                          <span>ناقص حرج</span>
                        </span>
                      ) : isNearAlert ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                          <span>قارب النفاذ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>متوفر</span>
                        </span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Print Barcode Label */}
                        <button
                          type="button"
                          onClick={() => handleOpenBarcode(item)}
                          title="طباعة ستيكر الباركود والرف الحراري"
                          className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition active:scale-95"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>

                        {/* Adjust Stock (Products only) */}
                        {!isService && item.is_active === 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              guardedAction(
                                () => handleOpenAdjust(item),
                                'تسوية جردية (محمية)',
                                'تعديل أرصدة الجرد الفعلي محمي برمز المالك'
                              )
                            }
                            title="تسوية جردية"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition active:scale-95"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Direct Consignment Inbound Button for Consignment Items */}
                        {Boolean(item.is_consignment) && item.is_active === 1 && (
                          <button
                            type="button"
                            onClick={() => handleOpenConsignmentInbound(item)}
                            title="استلام وتوريد دفعة إضافية من بضاعة الأمانة"
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition active:scale-95"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Item */}
                        <button
                          type="button"
                          onClick={() =>
                            guardedAction(
                              () => handleOpenEdit(item),
                              'تعديل بيانات الصنف (محمي)',
                              'تعديل أسعار وبيانات الصنف محمي برمز المالك'
                            )
                          }
                          title="تعديل بيانات الصنف"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition active:scale-95"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Active / Archive */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          title={item.is_active ? 'تعطيل وأرشفة' : 'إعادة تفعيل واسترجاع الصنف'}
                          className={`p-1.5 rounded-lg border transition active:scale-95 ${
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
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition active:scale-95"
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
              {activeTab === 'archived' && (
                <p className="text-xs text-slate-500 mt-1">الأرشيف فارغ حالياً، لا توجد أي أصناف معطلة أو محذوفة مؤقتاً.</p>
              )}
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

      {/* Inbound Purchase Invoice Modal */}
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

      {/* Add / Edit Inventory Modal */}
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

      {/* Barcode Label Modal */}
      <BarcodeLabelModal
        isOpen={showBarcodeModal}
        onClose={() => {
          setShowBarcodeModal(false);
          setSelectedItemForBarcode(null);
        }}
        item={selectedItemForBarcode}
      />

      {/* Turnover Analytics Modal */}
      <TurnoverAnalyticsModal
        isOpen={showTurnoverModal}
        onClose={() => setShowTurnoverModal(false)}
        onEditItem={(item) => handleOpenEdit(item)}
      />

      {/* Reorder Suggestions PO Sheet Modal */}
      <ReorderOrderSheetModal
        isOpen={showReorderSheetModal}
        onClose={() => setShowReorderSheetModal(false)}
        onConvertToPurchaseInvoice={handleConvertToPurchaseInvoice}
      />

      {/* Excel / CSV Catalog Import Modal */}
      <ImportInventoryModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(res) => {
          setShowImportModal(false);
          if (onRefreshData) onRefreshData();
          setActionMessage(
            `تم استيراد (${res.importedCount}) صنف جديد بنجاح، وتوليد (${res.openingEntriesCount}) قيد محاسبي لرصيد أول المدة بقيمة (${(res.totalCommittedCost || 0).toLocaleString()} ر.ي) 🚀`
          );
          setTimeout(() => setActionMessage(''), 8000);
        }}
      />

      {/* Consignment Stock Inbound Modal */}
      <ConsignmentInboundModal
        isOpen={showConsignmentInboundModal}
        onClose={() => {
          setShowConsignmentInboundModal(false);
          setSelectedConsignmentInboundItem(null);
        }}
        consignmentItems={consignmentItems}
        selectedItem={selectedConsignmentInboundItem}
        onInboundSuccess={(updatedItem, qty, itemName) => {
          if (onRefreshData) onRefreshData();
          setActionMessage(`تم بنجاح توريد واستلام (${qty}) عبوة إضافية لصنف "${itemName || updatedItem.name}" برسم البيع 🤝`);
          setTimeout(() => setActionMessage(''), 7000);
        }}
      />

      {/* Consignment Supplier Settlement Payment Voucher Modal */}
      <GeneralPaymentVoucherModal
        isOpen={showConsignmentPayModal}
        onClose={() => {
          setShowConsignmentPayModal(false);
          setConsignmentPayInitialData(null);
        }}
        initialData={consignmentPayInitialData}
        suppliers={suppliers}
        onVoucherCreated={() => {
          if (onRefreshData) onRefreshData();
          fetchSuppliers();
          setActionMessage('تم ترحيل سند صرف وسداد مستحقات مورد الأمانة وتحديث الرصيد بنجاح 🧾');
          setTimeout(() => setActionMessage(''), 7000);
        }}
      />

      {/* Touch Confirmation Modal for Delete/Archive */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">تأكيد حذف أو أرشفة الصنف</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                هل أنت متأكد من حذف أو أرشفة الصنف:{' '}
                <span className="font-extrabold text-amber-300">"{deleteConfirmItem.name}"</span>؟
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                (إذا كان للصنف حركات أو فواتير سابقة فسيتم أرشفته بأمان لحماية القيود المحاسبية)
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 min-h-[48px] rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs transition active:scale-95"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => executeDeleteOrArchive(deleteConfirmItem)}
                className="flex-1 min-h-[48px] rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>نعم، حذف / أرشفة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
