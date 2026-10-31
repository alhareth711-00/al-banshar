import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Droplets,
  Check,
  Plus,
  Minus,
  Filter,
  Sparkles,
  AlertCircle,
  Package,
  Car,
  ShoppingCart,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import {
  getCustomOilBrands,
  getCustomViscosities,
  getOilVolumePresets,
  saveOilVolumePresets,
} from '../utils/settings';

export default function OilSelectorModal({
  isOpen,
  onClose,
  inventory = [],
  onAddItemsToCart,
  preferredBrand = 'تويوتا',
  preferredViscosity = '20W-50',
  selectedVehicle = null,
  initialQty1L = null,
}) {
  const [selectedBrand, setSelectedBrand] = useState(preferredBrand || 'تويوتا');
  const [selectedViscosity, setSelectedViscosity] = useState(preferredViscosity || '20W-50');

  // Pack selections state - NOTE: 1L is the hero pack (most sales are 1-liter cans!)
  // Defaulting to initialQty1L or 4 cans of 1L for standard car oil change
  const [qty1L, setQty1L] = useState(initialQty1L !== null && initialQty1L !== undefined ? initialQty1L : 4);
  const [qty4L, setQty4L] = useState(0);
  const [qty5L, setQty5L] = useState(0);

  // Volume presets from settings
  const [volumePresets, setVolumePresets] = useState(getOilVolumePresets());
  const [showAddPresetInput, setShowAddPresetInput] = useState(false);
  const [newPresetValue, setNewPresetValue] = useState('');

  // Filters state
  const [addOilFilter, setAddOilFilter] = useState(true);
  const [addAirFilter, setAddAirFilter] = useState(false);
  const [addCabinFilter, setAddCabinFilter] = useState(false);

  // Synchronize when modal opens or vehicle preferences change
  useEffect(() => {
    if (isOpen) {
      if (preferredBrand) setSelectedBrand(preferredBrand);
      if (preferredViscosity) setSelectedViscosity(preferredViscosity);

      setVolumePresets(getOilVolumePresets());
      setShowAddPresetInput(false);
      setNewPresetValue('');

      // Clean state for fresh open: initialQty1L or 4 cans of 1L
      setQty1L(initialQty1L !== null && initialQty1L !== undefined ? initialQty1L : 4);
      setQty4L(0);
      setQty5L(0);
      setAddOilFilter(true);
      setAddAirFilter(false);
      setAddCabinFilter(false);
    }
  }, [isOpen, preferredBrand, preferredViscosity, initialQty1L]);

  // Keyboard shortcuts (Escape to close, Enter to submit)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, qty1L, qty4L, qty5L, addOilFilter, addAirFilter, addCabinFilter]);

  // Dynamic brands list from settings + database catalog
  const brands = useMemo(() => {
    const customBrands = getCustomOilBrands();
    const catalogBrands = Array.from(
      new Set(
        (inventory || [])
          .filter((item) => item.category === 'oil' && item.brand)
          .map((item) => item.brand.trim())
      )
    ).map((b) => ({ id: b, name: b, color: '#f59e0b' }));

    const map = new Map();
    customBrands.forEach((b) => map.set(b.id, b));
    catalogBrands.forEach((b) => {
      if (!map.has(b.id)) {
        map.set(b.id, b);
      }
    });
    return Array.from(map.values());
  }, [inventory, isOpen]);

  // Dynamic viscosities (including Aseel's oils: سي 50 ديزل، سي 50 بترول، 20/50 ديزل)
  const viscosities = useMemo(() => {
    const customViscs = getCustomViscosities();
    const catalogViscs = Array.from(
      new Set(
        (inventory || [])
          .filter((item) => item.category === 'oil' && item.viscosity)
          .map((item) => item.viscosity.trim())
      )
    );
    const set = new Set([...customViscs, ...catalogViscs]);
    return Array.from(set);
  }, [inventory, isOpen]);

  // All oils & filters from inventory
  const oils = useMemo(() => (inventory || []).filter((item) => item.category === 'oil'), [inventory]);
  const filters = useMemo(() => (inventory || []).filter((item) => item.category === 'filter'), [inventory]);

  // Check if selected brand has any in-stock item for a given viscosity
  const checkViscosityStock = (viscCode) => {
    return oils.some(
      (o) =>
        o.brand === selectedBrand &&
        (o.viscosity === viscCode || (o.name || '').includes(viscCode)) &&
        Number(o.stock_qty) > 0
    );
  };

  // STRICT INVENTORY MATCHERS: Never fall back to other brands!
  const item1L = useMemo(() => {
    if (!selectedBrand || !selectedViscosity) return null;

    // 1. Exact match: brand + viscosity + 1L pack
    const exact = oils.find(
      (o) =>
        o.brand === selectedBrand &&
        o.viscosity === selectedViscosity &&
        (o.pack_size === '1L' || o.pack_size === '1l' || (o.name || '').includes('1 لتر') || (o.name || '').includes('1L'))
    );
    if (exact) return exact;

    // 2. Brand match where item name contains the viscosity and 1L
    const byName = oils.find(
      (o) =>
        o.brand === selectedBrand &&
        (o.name || '').includes(selectedViscosity) &&
        (o.pack_size === '1L' || o.pack_size === '1l' || (o.name || '').includes('1 لتر') || (o.name || '').includes('1L'))
    );
    if (byName) return byName;

    // Strictly null: Do NOT sell another brand under this name!
    return null;
  }, [oils, selectedBrand, selectedViscosity]);

  const item4L = useMemo(() => {
    if (!selectedBrand || !selectedViscosity) return null;

    // 1. Exact match: brand + viscosity + 4L pack
    const exact = oils.find(
      (o) =>
        o.brand === selectedBrand &&
        o.viscosity === selectedViscosity &&
        (o.pack_size === '4L' || o.pack_size === '4l' || (o.name || '').includes('4 لتر') || (o.name || '').includes('4L'))
    );
    if (exact) return exact;

    // 2. Brand match where item name contains the viscosity and 4L
    const byName = oils.find(
      (o) =>
        o.brand === selectedBrand &&
        (o.name || '').includes(selectedViscosity) &&
        (o.pack_size === '4L' || o.pack_size === '4l' || (o.name || '').includes('4 لتر') || (o.name || '').includes('4L'))
    );
    if (byName) return byName;

    return null;
  }, [oils, selectedBrand, selectedViscosity]);

  const item5L = useMemo(() => {
    return (
      oils.find(
        (o) =>
          o.brand === selectedBrand &&
          (o.pack_size === '5L' || o.pack_size === '5l' || (o.name || '').includes('5 لتر') || (o.name || '').includes('5L'))
      ) || null
    );
  }, [oils, selectedBrand]);

  // Filter items matching with vehicle & brand awareness
  const oilFilterItem = useMemo(() => {
    const vMake = (selectedVehicle?.make || '').trim().toLowerCase();
    if (vMake) {
      const matchVehicleMake = filters.find(
        (f) =>
          f.name &&
          f.name.includes('فلتر زيت') &&
          ((f.brand && f.brand.toLowerCase().includes(vMake)) || f.name.toLowerCase().includes(vMake))
      );
      if (matchVehicleMake) return matchVehicleMake;
    }

    return (
      filters.find(
        (f) =>
          f.name &&
          f.name.includes('فلتر زيت') &&
          ((f.brand && f.brand === selectedBrand) || f.name.includes(selectedBrand))
      ) ||
      filters.find((f) => f.name && f.name.includes('فلتر زيت') && (f.brand === 'تويوتا' || f.name.includes('تويوتا'))) ||
      filters.find((f) => f.name && f.name.includes('فلتر زيت'))
    );
  }, [filters, selectedBrand, selectedVehicle]);

  const airFilterItem = useMemo(() => {
    const vMake = (selectedVehicle?.make || '').trim().toLowerCase();
    if (vMake) {
      const matchVehicleMake = filters.find(
        (f) =>
          f.name &&
          f.name.includes('فلتر هواء') &&
          ((f.brand && f.brand.toLowerCase().includes(vMake)) || f.name.toLowerCase().includes(vMake))
      );
      if (matchVehicleMake) return matchVehicleMake;
    }
    return filters.find((f) => f.name && f.name.includes('فلتر هواء'));
  }, [filters, selectedVehicle]);

  const cabinFilterItem = useMemo(() => {
    return filters.find((f) => f.name && f.name.includes('فلتر مكيف'));
  }, [filters]);

  // Step quantity helpers (handling 0.5 fractions smoothly)
  const adjustQty1L = (delta) => {
    setQty1L((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.max(0, next);
    });
  };

  // Quick preset helper
  const handleAddNewVolumePreset = () => {
    const val = parseFloat(newPresetValue);
    if (!isNaN(val) && val > 0 && !volumePresets.includes(val)) {
      const updated = [...volumePresets, val].sort((a, b) => a - b);
      setVolumePresets(updated);
      saveOilVolumePresets(updated);
      setQty1L(val);
      setNewPresetValue('');
      setShowAddPresetInput(false);
    }
  };

  // Calculate total price preview
  const totalPrice = useMemo(() => {
    let sum = 0;
    if (item1L && qty1L > 0) sum += Math.round((Number(item1L.sell_price) || 0) * qty1L);
    if (item4L && qty4L > 0) sum += Math.round((Number(item4L.sell_price) || 0) * qty4L);
    if (item5L && qty5L > 0) sum += Math.round((Number(item5L.sell_price) || 0) * qty5L);

    if (addOilFilter && oilFilterItem) sum += Number(oilFilterItem.sell_price) || 0;
    if (addAirFilter && airFilterItem) sum += Number(airFilterItem.sell_price) || 0;
    if (addCabinFilter && cabinFilterItem) sum += Number(cabinFilterItem.sell_price) || 0;
    return sum;
  }, [
    qty1L,
    qty4L,
    qty5L,
    addOilFilter,
    addAirFilter,
    addCabinFilter,
    item1L,
    item4L,
    item5L,
    oilFilterItem,
    airFilterItem,
    cabinFilterItem,
  ]);

  const totalLiters = Math.round((qty4L * 4 + qty1L * 1 + qty5L * 5) * 10) / 10;
  const totalItemCount =
    (qty1L > 0 ? 1 : 0) +
    (qty4L > 0 ? 1 : 0) +
    (qty5L > 0 ? 1 : 0) +
    (addOilFilter ? 1 : 0) +
    (addAirFilter ? 1 : 0) +
    (addCabinFilter ? 1 : 0);

  const handleConfirm = () => {
    const itemsToAdd = [];

    // 1L can items (hero product with fractional support)
    if (item1L && qty1L > 0) {
      itemsToAdd.push({
        inventory_id: item1L.id,
        item_type: 'product',
        category: 'oil',
        description: `${item1L.name}${qty1L % 1 !== 0 ? ` (${qty1L} علبة)` : ''}`,
        qty: qty1L,
        unit_price: Number(item1L.sell_price) || 0,
        labor_fee: 0,
        subtotal: Math.round((Number(item1L.sell_price) || 0) * qty1L),
      });
    }

    // 4L Gallon items
    if (item4L && qty4L > 0) {
      itemsToAdd.push({
        inventory_id: item4L.id,
        item_type: 'product',
        category: 'oil',
        description: item4L.name,
        qty: qty4L,
        unit_price: Number(item4L.sell_price) || 0,
        labor_fee: 0,
        subtotal: Math.round((Number(item4L.sell_price) || 0) * qty4L),
      });
    }

    // 5L Gallon items
    if (item5L && qty5L > 0) {
      itemsToAdd.push({
        inventory_id: item5L.id,
        item_type: 'product',
        category: 'oil',
        description: item5L.name,
        qty: qty5L,
        unit_price: Number(item5L.sell_price) || 0,
        labor_fee: 0,
        subtotal: Math.round((Number(item5L.sell_price) || 0) * qty5L),
      });
    }

    // Oil Filter
    if (addOilFilter && oilFilterItem) {
      itemsToAdd.push({
        inventory_id: oilFilterItem.id,
        item_type: 'product',
        category: 'filter',
        description: oilFilterItem.name,
        qty: 1,
        unit_price: Number(oilFilterItem.sell_price) || 0,
        labor_fee: 0,
        subtotal: Number(oilFilterItem.sell_price) || 0,
      });
    }

    // Air Filter
    if (addAirFilter && airFilterItem) {
      itemsToAdd.push({
        inventory_id: airFilterItem.id,
        item_type: 'product',
        category: 'filter',
        description: airFilterItem.name,
        qty: 1,
        unit_price: Number(airFilterItem.sell_price) || 0,
        labor_fee: 0,
        subtotal: Number(airFilterItem.sell_price) || 0,
      });
    }

    // Cabin Filter
    if (addCabinFilter && cabinFilterItem) {
      itemsToAdd.push({
        inventory_id: cabinFilterItem.id,
        item_type: 'product',
        category: 'filter',
        description: cabinFilterItem.name,
        qty: 1,
        unit_price: Number(cabinFilterItem.sell_price) || 0,
        labor_fee: 0,
        subtotal: Number(cabinFilterItem.sell_price) || 0,
      });
    }

    if (itemsToAdd.length === 0) {
      return;
    }

    onAddItemsToCart(itemsToAdd);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="bg-slate-950 border border-amber-500/30 rounded-3xl w-full max-w-5xl flex flex-col overflow-hidden shadow-2xl shadow-black/90 text-right ring-1 ring-white/10 my-auto">
        {/* Compact Header */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-500/15 via-slate-900/60 to-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
              <Droplets className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base">محدد غيار الزيت السريع</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  عبوات 1 لتر (الأكثر طلباً) ⭐
                </span>
              </div>
              <p className="text-xs text-slate-400">
                اختيار فوري لماركة الزيت واللزوجة والعبوات والفلتر بدون أي تمرير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedVehicle && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">
                  {selectedVehicle.make || ''} {selectedVehicle.model || ''}
                </span>
                {selectedVehicle.plate_number && (
                  <span className="text-amber-400 font-mono text-[11px]">
                    ({selectedVehicle.plate_number})
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
              title="إغلاق (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Split Body: Zero-Scroll POS Layout */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* RIGHT COLUMN (5 cols): Brand & Viscosity Selector */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3 lg:border-l lg:border-white/10 lg:pl-3.5">
            {/* 1. Brands Picker */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>ماركة الزيت:</span>
                </span>
                <span className="text-amber-400 font-black text-xs bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {selectedBrand}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {brands.map((b) => {
                  const isSelected = selectedBrand === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBrand(b.id)}
                      className={`h-9 px-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/25 scale-[1.02]'
                          : 'bg-slate-900/90 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color || '#f59e0b' }}
                      />
                      <span className="truncate">{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Viscosity Picker (Pure Codes Only) */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>درجة اللزوجة:</span>
                </span>
                <span className="text-amber-400 font-mono font-bold text-xs bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {selectedViscosity}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar p-0.5">
                {viscosities.map((v) => {
                  const isSelected = selectedViscosity === v;
                  const isAvailable = checkViscosityStock(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedViscosity(v)}
                      className={`h-11 rounded-xl border text-center transition-all flex flex-col items-center justify-center active:scale-95 ${
                        isSelected
                          ? 'bg-white text-slate-950 border-white shadow-lg ring-2 ring-white/50 scale-[1.02]'
                          : isAvailable
                          ? 'bg-slate-900/90 border-amber-500/20 text-slate-200 hover:text-white hover:bg-white/10'
                          : 'bg-slate-950/70 border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-mono font-black text-xs">{v}</span>
                      <span
                        className={`text-[9px] font-bold ${
                          isSelected
                            ? 'text-emerald-700'
                            : isAvailable
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {isAvailable ? '● متوفر' : '○ غير متاح'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Real-Time Stock Status Card (Strict Isolation) */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>مخزون ({selectedBrand} - {selectedViscosity}):</span>
                </span>
              </div>

              {/* 1L Status */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>علبة 1 لتر:</span>
                </span>
                {item1L ? (
                  <span className="text-emerald-400 font-mono font-black">
                    {(Number(item1L.sell_price) || 0).toLocaleString()} ر.ي
                    <span className="text-slate-400 font-normal mr-1.5">
                      (متوفر: {item1L.stock_qty} علبة)
                    </span>
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> غير متوفرة لـ {selectedBrand}
                  </span>
                )}
              </div>

              {/* 4L Status */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>دبة 4 لتر (جالون):</span>
                </span>
                {item4L ? (
                  <span className="text-emerald-400 font-mono font-black">
                    {(Number(item4L.sell_price) || 0).toLocaleString()} ر.ي
                    <span className="text-slate-400 font-normal mr-1.5">
                      (متوفر: {item4L.stock_qty} دبة)
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">غير متوفرة</span>
                )}
              </div>
            </div>
          </div>

          {/* LEFT COLUMN (7 cols): Quantities, Hero 1L, Filters & Action Footer */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
            {/* HERO CARD: 1-Liter Can (Primary Sale with Fractional Support) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-950 border-2 border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-400/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white">🧴 عبوة 1 لتر</span>
                    <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-amber-500 text-slate-950">
                      ⭐ الأكثر مبيعاً
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item1L ? (
                      <span className="text-emerald-400 font-mono font-bold">
                        {(Number(item1L.sell_price) || 0).toLocaleString()} ر.ي / علبة
                        <span className="text-slate-400 mr-2 font-normal">
                          (المتاح بالمخزن: <strong className="text-white font-mono">{item1L.stock_qty}</strong>)
                        </span>
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold text-[11px]">
                        غير متوفرة بالمخزن بهذه اللزوجة لماركة {selectedBrand}
                      </span>
                    )}
                  </div>
                </div>

                {/* Precision Stepper with +0.5 support */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustQty1L(qty1L % 1 === 0.5 ? -0.5 : -1)}
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition border border-white/10"
                    title="إنقاص"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="w-14 text-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={qty1L}
                      onChange={(e) => setQty1L(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-14 h-9 text-center font-mono font-black text-lg text-amber-300 bg-slate-950/80 rounded-xl border border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustQty1L(1)}
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center justify-center font-black active:scale-95 transition shadow-md shadow-amber-500/25"
                    title="زيادة علبة كاملة"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => adjustQty1L(0.5)}
                    className="h-9 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono font-bold text-xs active:scale-95 transition"
                    title="إضافة نصف لتر (0.5L)"
                  >
                    +0.5
                  </button>
                </div>
              </div>

              {/* Instant 1-Touch Quantity Chips (General Volume Presets) */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>اختصارات كميات الزيوت العامة (نقرة واحدة):</span>
                    <button
                      type="button"
                      onClick={() => setShowAddPresetInput(!showAddPresetInput)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-500/20 text-amber-300 font-bold transition flex items-center gap-0.5"
                      title="إضافة كمية جديدة باللتر"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>كمية مخصصة</span>
                    </button>
                  </div>
                  {qty1L > 0 && item1L && (
                    <span className="text-amber-300 font-mono font-bold text-xs">
                      إجمالي العلب: {Math.round((Number(item1L.sell_price) || 0) * qty1L).toLocaleString()} ر.ي
                    </span>
                  )}
                </div>

                {showAddPresetInput && (
                  <div className="mb-2 p-2 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center gap-2 animate-in fade-in">
                    <span className="text-xs text-slate-300 font-bold">كمية جديدة باللتر:</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="مثال: 7 أو 2.5"
                      value={newPresetValue}
                      onChange={(e) => setNewPresetValue(e.target.value)}
                      className="w-24 h-7 px-2 rounded-lg bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewVolumePreset}
                      className="h-7 px-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 active:scale-95"
                    >
                      حفظ
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddPresetInput(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setQty1L(0)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-mono font-black transition-all active:scale-95 border ${
                      qty1L === 0
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.03]'
                        : 'bg-slate-900/90 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    تصفير
                  </button>
                  {volumePresets.map((num) => {
                    const isActive = qty1L === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQty1L(num)}
                        className={`h-8 min-w-[42px] px-2 rounded-lg text-xs font-mono font-black transition-all active:scale-95 border ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 ring-1 ring-amber-400/50 scale-[1.03]'
                            : 'bg-slate-900/90 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {num}L
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Other Packaging Options (4L & 5L Gallons only - Zero Barrels) */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Boxes className="w-3 h-3 text-slate-400" />
                <span>جوالين بديلة (دباب 4L و 5L):</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* 4L Gallon Pack */}
                <div
                  className={`p-2 rounded-xl border transition-all ${
                    qty4L > 0 ? 'bg-slate-900 border-amber-500/50 ring-1 ring-amber-400/30' : 'bg-slate-900/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-[11px] text-white">دبة 4 لتر</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-slate-300 font-mono">4L</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1.5 truncate">
                    {item4L ? (
                      <span className="text-emerald-400 font-bold font-mono">
                        {(Number(item4L.sell_price) || 0).toLocaleString()} ر.ي
                        <span className="text-slate-400 mr-1">({item4L.stock_qty})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">غير متوفر</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQty4L(Math.max(0, qty4L - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs text-white">{qty4L}</span>
                      <button
                        type="button"
                        onClick={() => setQty4L(qty4L + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center font-bold active:scale-95 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty4L(qty4L === 1 ? 0 : 1)}
                      className={`px-1.5 py-1 rounded-lg text-[9px] font-bold border transition ${
                        qty4L === 1 ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {qty4L === 1 ? 'محدد' : 'دبة 1'}
                    </button>
                  </div>
                </div>

                {/* 5L Gallon Pack */}
                <div
                  className={`p-2 rounded-xl border transition-all ${
                    qty5L > 0 ? 'bg-slate-900 border-amber-500/50 ring-1 ring-amber-400/30' : 'bg-slate-900/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-[11px] text-white">دبة 5 لتر</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-slate-300 font-mono">5L</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mb-1.5 truncate">
                    {item5L ? (
                      <span className="text-emerald-400 font-bold font-mono">
                        {(Number(item5L.sell_price) || 0).toLocaleString()} ر.ي
                        <span className="text-slate-400 mr-1">({item5L.stock_qty})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">غير متوفر</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQty5L(Math.max(0, qty5L - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs text-white">{qty5L}</span>
                      <button
                        type="button"
                        onClick={() => setQty5L(qty5L + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center font-bold active:scale-95 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty5L(qty5L === 1 ? 0 : 1)}
                      className={`px-1.5 py-1 rounded-lg text-[9px] font-bold border transition ${
                        qty5L === 1 ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {qty5L === 1 ? 'محدد' : 'دبة 1'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Accompanying Filters */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>الفلاتر المرافقة بنقرة واحدة:</span>
                <span className="text-[10px] text-slate-500">تضاف تلقائياً مع الفاتورة</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAddOilFilter(!addOilFilter)}
                  className={`h-11 px-2 rounded-xl border text-right transition flex items-center justify-between active:scale-95 ${
                    addOilFilter
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-white truncate">فلتر زيت أصلي</div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      {oilFilterItem ? `+${(Number(oilFilterItem.sell_price) || 0).toLocaleString()} ر.ي` : '+4,500 ر.ي'}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      addOilFilter ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {addOilFilter ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3 h-3" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAddAirFilter(!addAirFilter)}
                  className={`h-11 px-2 rounded-xl border text-right transition flex items-center justify-between active:scale-95 ${
                    addAirFilter
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-white truncate">فلتر هواء محرك</div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      {airFilterItem ? `+${(Number(airFilterItem.sell_price) || 0).toLocaleString()} ر.ي` : '+6,500 ر.ي'}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      addAirFilter ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {addAirFilter ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3 h-3" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAddCabinFilter(!addCabinFilter)}
                  className={`h-11 px-2 rounded-xl border text-right transition flex items-center justify-between active:scale-95 ${
                    addCabinFilter
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-white truncate">فلتر مكيف</div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      {cabinFilterItem ? `+${(Number(cabinFilterItem.sell_price) || 0).toLocaleString()} ر.ي` : '+5,000 ر.ي'}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      addCabinFilter ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {addCabinFilter ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3 h-3" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Instant Summary & Confirm Footer */}
            <div className="p-3 rounded-2xl bg-slate-900/95 border border-white/10 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>الإجمالي:</span>
                  <span className="px-2 py-0.2 rounded-full bg-white/10 text-amber-300 font-mono font-bold">
                    {totalLiters} لتر
                  </span>
                  {qty1L > 0 && <span className="text-slate-300 font-bold">({qty1L} علبة 1L)</span>}
                </div>
                <div className="text-xl font-black text-amber-400 font-mono flex items-baseline gap-1 mt-0.5">
                  <span>{totalPrice.toLocaleString()}</span>
                  <span className="text-[11px] font-sans text-slate-300">ريال يمني</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition active:scale-95"
                >
                  إلغاء (Esc)
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={totalLiters === 0 && !addOilFilter && !addAirFilter && !addCabinFilter}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                  <span>إضافة للفاتورة</span>
                  {totalItemCount > 0 && (
                    <span className="bg-slate-950 text-amber-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {totalItemCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
