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
} from 'lucide-react';
import PurchaseInvoiceModal from './PurchaseInvoiceModal';
import AddInventoryModal, { calculateDotAge } from './AddInventoryModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import PackagingConversionModal from './PackagingConversionModal';
import InventoryValuationModal from './InventoryValuationModal';
import BarcodeLabelModal from './BarcodeLabelModal';
import TurnoverAnalyticsModal from './TurnoverAnalyticsModal';
import ReorderOrderSheetModal from './ReorderOrderSheetModal';

export default function InventoryView({
  inventory = [],
  onRefreshData,
  isOwnerMode = false,
  onRequireOwnerAuth,
}) {
  const [activeTab, setActiveTab] = useState('all');
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
  const [prefilledPurchaseItems, setPrefilledPurchaseItems] = useState(null);

  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [actionMessage, setActionMessage] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [showAdvancedToolsMenu, setShowAdvancedToolsMenu] = useState(false);
  const toolsMenuRef = useRef(null);

  // 3 Live Variants Switcher (1. Calm Table | 2. Tactile Cards | 3. Apple Glass)
  const [inventoryStyle, setInventoryStyle] = useState(() => {
    return localStorage.getItem('ql_inventory_style') || 'calm';
  });

  const handleSetStyle = (style) => {
    setInventoryStyle(style);
    localStorage.setItem('ql_inventory_style', style);
  };

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

  // Guarded actions for Cashier Mode (الجزء الأول)
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

  // Filter items based on activeTab, fast filters, and searchTerm
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
          if (selectedViscosity !== 'all') {
            if (selectedViscosity === '4L' || selectedViscosity === '1L' || selectedViscosity === 'bulk_liter') {
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
        (item.dot_code && item.dot_code.toLowerCase().includes(s)) ||
        (item.consignment_supplier_name && item.consignment_supplier_name.toLowerCase().includes(s))
      );
    });
  }, [inventory, activeTab, selectedViscosity, tireFilterAgingOnly, selectedConsignmentSupplier, searchTerm]);

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

  // [المقترح 3]: Dynamic Oil Viscosity & Pack Size Pills
  const oilViscosityPills = useMemo(() => {
    const oils = inventory.filter((i) => i.is_active === 1 && i.category === 'oil');
    return [
      { id: 'all', label: 'الكل', count: oils.length },
      { id: '20W-50', label: '20W-50', count: oils.filter((i) => i.viscosity === '20W-50').length },
      { id: '10W-40', label: '10W-40', count: oils.filter((i) => i.viscosity === '10W-40').length },
      { id: '5W-30', label: '5W-30', count: oils.filter((i) => i.viscosity === '5W-30').length },
      { id: '5W-40', label: '5W-40', count: oils.filter((i) => i.viscosity === '5W-40').length },
      { id: '0W-20', label: '0W-20', count: oils.filter((i) => i.viscosity === '0W-20').length },
      { id: '4L', label: 'دبة 4L', count: oils.filter((i) => i.pack_size === '4L').length },
      { id: '1L', label: 'علبة 1L', count: oils.filter((i) => i.pack_size === '1L').length },
      { id: 'bulk_liter', label: 'لتر فلت', count: oils.filter((i) => i.pack_size === 'bulk_liter').length },
    ];
  }, [inventory]);

  // [المقترح 2]: Tire Aging Analysis (> 24 months)
  const agingTiresCount = useMemo(() => {
    return inventory.filter((i) => {
      if (i.is_active === 0 || i.category !== 'tire' || !i.dot_code) return false;
      const dot = calculateDotAge(i.dot_code);
      return dot && (dot.status === 'aging' || dot.status === 'expired' || dot.ageInMonths > 24);
    }).length;
  }, [inventory]);

  // [المقترح 4]: Consignment Stock Analytics
  const consignmentItems = useMemo(() => {
    return inventory.filter((i) => i.is_active === 1 && i.is_consignment === 1);
  }, [inventory]);

  const consignmentCount = consignmentItems.length;

  const consignmentSuppliersList = useMemo(() => {
    const list = new Set();
    consignmentItems.forEach((i) => {
      if (i.consignment_supplier_name) list.add(i.consignment_supplier_name);
    });
    return Array.from(list);
  }, [consignmentItems]);

  const consignmentTotalStock = useMemo(() => {
    return consignmentItems.reduce((acc, i) => acc + (Number(i.stock_qty) || 0), 0);
  }, [consignmentItems]);

  const consignmentTotalCostValue = useMemo(() => {
    return consignmentItems.reduce((acc, i) => acc + (Number(i.cost_price) || 0) * (Number(i.stock_qty) || 0), 0);
  }, [consignmentItems]);

  // Print consignment audit settlement report
  const handlePrintConsignmentReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const supplierFilterText = selectedConsignmentSupplier !== 'all' ? ` - المورد: ${selectedConsignmentSupplier}` : '';
    const itemsToPrint = selectedConsignmentSupplier !== 'all'
      ? consignmentItems.filter((i) => i.consignment_supplier_name === selectedConsignmentSupplier)
      : consignmentItems;

    const totalStock = itemsToPrint.reduce((acc, i) => acc + (Number(i.stock_qty) || 0), 0);
    const totalCost = itemsToPrint.reduce((acc, i) => acc + (Number(i.cost_price) || 0) * (Number(i.stock_qty) || 0), 0);

    const rowsHtml = itemsToPrint.map((item, idx) => `
      <tr style="border-bottom: 1px solid #ddd; text-align: right;">
        <td style="padding: 8px;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: bold;">${item.name}</td>
        <td style="padding: 8px;">${item.consignment_supplier_name || 'عام'}</td>
        <td style="padding: 8px;">${item.sku}</td>
        <td style="padding: 8px; text-align: center; font-weight: bold;">${item.stock_qty}</td>
        <td style="padding: 8px; text-align: left;">${Number(item.cost_price).toLocaleString()} ر.ي</td>
        <td style="padding: 8px; text-align: left; font-weight: bold;">${((Number(item.cost_price) || 0) * (Number(item.stock_qty) || 0)).toLocaleString()} ر.ي</td>
        <td style="padding: 8px; text-align: left;">${Number(item.sell_price).toLocaleString()} ر.ي</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>كشف جرد بضاعة الأمانات والتصريف${supplierFilterText}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; direction: rtl; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .meta { font-size: 13px; color: #555; }
          .kpi-box { display: flex; justify-content: space-around; background: #f8f9fa; border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
          .kpi-item { text-align: center; }
          .kpi-val { font-size: 16px; font-weight: bold; color: #b45309; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; font-weight: bold; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">كشف جرد ومطابقة بضاعة الأمانات والتصريف (Consignment Audit)</div>
          <div class="meta">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${supplierFilterText}</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-item">
            <div>عدد أصناف الأمانات:</div>
            <div class="kpi-val">${itemsToPrint.length} صنف</div>
          </div>
          <div class="kpi-item">
            <div>إجمالي الرصيد المتبقي بالرف:</div>
            <div class="kpi-val">${totalStock} علبة/حبة</div>
          </div>
          <div class="kpi-item">
            <div>إجمالي القيمة المستحقة للمورد بالتكلفة:</div>
            <div class="kpi-val">${totalCost.toLocaleString()} ر.ي</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>الصنف والمواصفات</th>
              <th>المورد صاحب الأمانة</th>
              <th>كود SKU</th>
              <th style="text-align: center;">الرصيد المتبقي</th>
              <th style="text-align: left;">سعر التكلفة</th>
              <th style="text-align: left;">إجمالي قيمة الرصيد</th>
              <th style="text-align: left;">سعر البيع</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div>توقيع واستلام مندوب الشركة: ___________________</div>
          <div>توقيع وختم إدارة البنشر: ___________________</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
            <h2 className="text-xl font-extrabold text-white tracking-tight">إدارة المخزون والكتالوج المتخصص</h2>
            <p className="text-xs text-slate-400">
              كتالوج شامل للزيوت (اللزوجة/العبوة)، الفلاتر، الكفرات (DOT)، البطاريات، والخدمات
            </p>
          </div>
        </div>

        {/* Action Buttons Hub: 2 Prominent Daily Actions + 1 Advanced Tools Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Add Item (Primary Action) */}
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

          {/* 2. Purchase Invoice (Primary Action) */}
          <button
            type="button"
            onClick={handleOpenPurchaseModal}
            className="min-h-[46px] px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 flex items-center gap-2 transition active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>+ فاتورة مشتريات وتوريد 📥</span>
          </button>

          {/* 3. Advanced Tools & Reports Dropdown Menu */}
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
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Stock Adjustment */}
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
                    <div className="text-[10px] text-slate-400">تسوية الفوارق بين الرف والنظام</div>
                  </div>
                </button>

                {/* 2. Reorder PO Sheet */}
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
                    <div className="text-[10px] text-slate-400">إعداد طلبية توريد الزيوت الناقصة</div>
                  </div>
                </button>

                {/* 3. Inventory Valuation */}
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
                    <div className="text-[10px] text-slate-400">تقرير جرد وتقييم بالتكلفة والبيع</div>
                  </div>
                </button>

                {/* 4. Turnover ABC */}
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
                    <div className="text-[10px] text-slate-400">كشف الأصناف السريعة والنائمة في الرف</div>
                  </div>
                </button>

                {/* 5. Barcode Label Generator */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedToolsMenu(false);
                    setSelectedItemForBarcode(activeProducts[0] || null);
                    setShowBarcodeModal(true);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-right flex items-center gap-2.5 transition text-slate-200 hover:text-white border-t border-white/5 pt-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">طباعة لصقات وباركود الأصناف</div>
                    <div className="text-[10px] text-slate-400">لصقات الرفوف والأسعار الحرارية</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 4. Live Style Switcher Pills (3 Variations of the Table Model) */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-white/10 text-xs">
            <span className="text-slate-400 text-[11px] font-bold px-1.5">أسلوب الجدول:</span>
            <button
              type="button"
              onClick={() => handleSetStyle('calm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition tap-bounce ${
                inventoryStyle === 'calm'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title="الشكل 1: مسطح هادئ كلاسيكي بدون إجهاد للعين"
            >
              1. مسطح هادئ
            </button>
            <button
              type="button"
              onClick={() => handleSetStyle('zebra')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition tap-bounce ${
                inventoryStyle === 'zebra'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title="الشكل 2: مخطط متبادل فائق التباين لمنع خطأ العين"
            >
              2. مخطط عالي التباين
            </button>
            <button
              type="button"
              onClick={() => handleSetStyle('glass')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition tap-bounce ${
                inventoryStyle === 'glass'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title="الشكل 3: صفوف كبسولات زجاجية طافية فخمة"
            >
              3. صفوف زجاجية طافية
            </button>
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
            { id: 'consignment', label: `🤝 بضاعة الأمانات (${consignmentCount})` },
            { id: 'service', label: `🔧 أجور وخدمات (${servicesCount})` },
            { id: 'low', label: `⚠️ النواقص (${lowStockCount})`, isAlert: true },
            { id: 'archived', label: `📦 الأرشيف (${archivedCount})` },
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

      {/* [المقترح 3]: Fast Viscosity & Pack Size Filter Pills for Oil */}
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

      {/* [المقترح 2]: Tire DOT Age Tracker & Filter Banner */}
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

      {/* [المقترح 4]: Consignment Stock Analytical Banner & Settlement Action */}
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

            <button
              type="button"
              onClick={handlePrintConsignmentReport}
              disabled={consignmentCount === 0}
              className="min-h-[42px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف جرد الأمانات للتسوية مع المندوب 📄</span>
            </button>
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

          {/* Consignment Supplier Filter Pills if multiple suppliers */}
          {consignmentSuppliersList.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              <span className="text-[11px] text-slate-400 font-bold">تصفية حسب المورد:</span>
              <button
                type="button"
                onClick={() => setSelectedConsignmentSupplier('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${selectedConsignmentSupplier === 'all' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-900 text-slate-300 border border-white/10'}`}
              >
                الكل ({consignmentCount})
              </button>
              {consignmentSuppliersList.map((sup) => (
                <button
                  key={sup}
                  type="button"
                  onClick={() => setSelectedConsignmentSupplier(sup)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${selectedConsignmentSupplier === sup ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-900 text-slate-300 border border-white/10'}`}
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

      {/* 4. Inventory Table (Switchable between 3 distinct styles of the same Table model) */}
      <div
        className={`rounded-3xl border flex-1 overflow-hidden flex flex-col shadow-xl transition-all duration-200 ${
          inventoryStyle === 'glass'
            ? 'apple-glass border-white/10 p-2'
            : inventoryStyle === 'zebra'
            ? 'bg-slate-950 border-slate-700'
            : 'bg-[#090d16] border-slate-800'
        }`}
      >
        <div className="overflow-x-auto flex-1">
          <table
            className={`w-full text-right text-xs ${
              inventoryStyle === 'glass'
                ? 'border-separate border-spacing-y-2'
                : 'border-collapse'
            }`}
          >
            <thead
              className={`border-b font-extrabold sticky top-0 backdrop-blur z-10 ${
                inventoryStyle === 'glass'
                  ? 'bg-transparent text-slate-400 border-none'
                  : inventoryStyle === 'zebra'
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400'
              }`}
            >
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
            <tbody
              className={`${
                inventoryStyle === 'glass'
                  ? 'space-y-2'
                  : inventoryStyle === 'zebra'
                  ? 'divide-y divide-slate-800/60 font-mono'
                  : 'divide-y divide-slate-800/80 text-slate-200'
              }`}
            >
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

                // Dynamic styling per selected variant
                let trClass = '';
                if (inventoryStyle === 'glass') {
                  trClass = 'apple-glass rounded-2xl border border-white/10 hover:border-white/20 transition shadow-sm';
                } else if (inventoryStyle === 'zebra') {
                  trClass = 'even:bg-slate-900/90 odd:bg-slate-950/90 hover:bg-amber-400/10 border-b border-slate-800/80 transition text-white font-bold';
                } else {
                  trClass = 'hover:bg-slate-800/30 border-b border-slate-800/60 transition';
                }

                const cellPadding = inventoryStyle === 'glass' ? 'first:rounded-r-2xl last:rounded-l-2xl p-3.5' : 'p-3.5';

                return (
                  <tr key={item.id} className={`${trClass} ${item.is_active === 0 ? 'opacity-50 bg-slate-900/40' : ''}`}>
                    {/* Name & SKU & Specs */}
                    <td className={cellPadding}>
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
                        {/* Consignment Tag (المقترح 4) */}
                        {Boolean(item.is_consignment) && (
                          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <span>🤝 أمانة:</span>
                            <span className="font-extrabold">{item.consignment_supplier_name || 'مورد عام'}</span>
                          </span>
                        )}
                        {/* Tire DOT Age Indicator (المقترح 2) */}
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
                          خدمة بنشر
                        </span>
                      ) : item.pack_size ? (
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 text-white border border-white/10">
                          {item.pack_size === 'bulk_liter' ? 'لتر فلت' : item.pack_size}
                        </span>
                      ) : (
                        <span className="text-slate-500">قطعة</span>
                      )}
                    </td>

                    {/* Cost Price (محمي في وضع الكاشير) */}
                    <td className="p-3.5 font-mono font-bold text-slate-300">
                      {isService ? (
                        <span className="text-slate-500 font-normal">---</span>
                      ) : isOwnerMode ? (
                        <span>{Number(item.cost_price).toLocaleString()} ر.ي</span>
                      ) : (
                        <span className="text-slate-500 font-sans text-[11px] flex items-center gap-1" title="محمي برمز المالك">
                          <Lock className="w-3 h-3 text-amber-500/80 inline" />
                          <span>***</span>
                        </span>
                      )}
                    </td>

                    {/* Sell Price */}
                    <td className="p-3.5 font-mono font-extrabold text-amber-400 text-sm">
                      {Number(item.sell_price).toLocaleString()} ر.ي
                    </td>

                    {/* Margin (محمي في وضع الكاشير) */}
                    <td className="p-3.5 font-mono">
                      {isOwnerMode ? (
                        <>
                          <div className={`font-extrabold ${profit > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            +{profit.toLocaleString()} ر.ي
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

      {/* Touch Confirmation Modal for Delete/Archive (بدون نافذة المتصفح) */}
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
