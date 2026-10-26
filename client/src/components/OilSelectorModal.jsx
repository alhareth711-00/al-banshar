import React, { useState, useEffect, useMemo } from 'react';
import { X, Droplets, Check, Plus, Minus, Filter, Sparkles, AlertCircle } from 'lucide-react';

export default function OilSelectorModal({
  isOpen,
  onClose,
  inventory = [],
  onAddItemsToCart,
  preferredBrand = 'تويوتا',
  preferredViscosity = '20W-50',
}) {
  const [selectedBrand, setSelectedBrand] = useState(preferredBrand || 'تويوتا');
  const [selectedViscosity, setSelectedViscosity] = useState(preferredViscosity || '20W-50');

  // Pack selections state
  const [qty1L, setQty1L] = useState(0);
  const [qty4L, setQty4L] = useState(1); // Default to 1 pack (4L) for fast 1-touch lube
  const [qty5L, setQty5L] = useState(0);
  const [qtyBulk, setQtyBulk] = useState(0);

  // Filters state
  const [addOilFilter, setAddOilFilter] = useState(true);
  const [addAirFilter, setAddAirFilter] = useState(false);
  const [addCabinFilter, setAddCabinFilter] = useState(false);

  // Synchronize when modal opens or vehicle preferences change
  useEffect(() => {
    if (isOpen) {
      if (preferredBrand) setSelectedBrand(preferredBrand);
      if (preferredViscosity) setSelectedViscosity(preferredViscosity);
      if (qty1L === 0 && qty4L === 0 && qty5L === 0 && qtyBulk === 0) {
        setQty4L(1);
      }
    }
  }, [isOpen, preferredBrand, preferredViscosity]);

  // Dynamic brands list from database catalog + common Yemeni defaults
  const brands = useMemo(() => {
    const defaultBrands = [
      { id: 'تويوتا', name: 'تويوتا أصلي' },
      { id: 'كاسترول', name: 'كاسترول' },
      { id: 'شل', name: 'شل هيلكس' },
      { id: 'توتال', name: 'توتال كوارتز' },
      { id: 'صقر', name: 'زيت صقر الوطني' },
      { id: 'بترومين', name: 'بترومين' },
    ];
    const catalogBrands = Array.from(
      new Set(
        (inventory || [])
          .filter((item) => item.category === 'oil' && item.brand)
          .map((item) => item.brand.trim())
      )
    ).map((b) => ({ id: b, name: b }));

    const map = new Map();
    defaultBrands.forEach((b) => map.set(b.id, b));
    catalogBrands.forEach((b) => map.set(b.id, b));
    return Array.from(map.values());
  }, [inventory]);

  const viscosities = ['20W-50', '10W-40', '5W-30', '15W-40', '0W-20'];

  // Find matching items in inventory
  const oils = useMemo(() => (inventory || []).filter((item) => item.category === 'oil'), [inventory]);
  const filters = useMemo(() => (inventory || []).filter((item) => item.category === 'filter'), [inventory]);

  const item1L = useMemo(() => {
    return oils.find(
      (o) => o.brand === selectedBrand && o.viscosity === selectedViscosity && o.pack_size === '1L'
    ) || oils.find((o) => o.pack_size === '1L' && o.brand === selectedBrand);
  }, [oils, selectedBrand, selectedViscosity]);

  const item4L = useMemo(() => {
    return oils.find(
      (o) => o.brand === selectedBrand && o.viscosity === selectedViscosity && o.pack_size === '4L'
    ) || oils.find((o) => o.pack_size === '4L' && o.brand === selectedBrand);
  }, [oils, selectedBrand, selectedViscosity]);

  const item5L = useMemo(() => {
    return oils.find(
      (o) => o.brand === selectedBrand && o.pack_size === '5L'
    ) || oils.find((o) => o.pack_size === '5L');
  }, [oils, selectedBrand]);

  const itemBulk = useMemo(() => {
    return oils.find((o) => o.pack_size === 'bulk_liter');
  }, [oils]);

  // Filter items
  const oilFilterItem = useMemo(() => {
    return filters.find((f) => f.name && f.name.includes('فلتر زيت') && (f.brand === selectedBrand || f.brand === 'تويوتا')) ||
      filters.find((f) => f.name && f.name.includes('فلتر زيت'));
  }, [filters, selectedBrand]);

  const airFilterItem = useMemo(() => {
    return filters.find((f) => f.name && f.name.includes('فلتر هواء'));
  }, [filters]);

  const cabinFilterItem = useMemo(() => {
    return filters.find((f) => f.name && f.name.includes('فلتر مكيف'));
  }, [filters]);

  // Quick preset shortcuts
  const handleSelectPreset = (type) => {
    if (type === '4L') {
      setQty4L(1);
      setQty1L(0);
      setQty5L(0);
      setQtyBulk(0);
    } else if (type === '5L_combo') {
      setQty4L(1);
      setQty1L(1);
      setQty5L(0);
      setQtyBulk(0);
    } else if (type === '5L_can') {
      setQty5L(1);
      setQty4L(0);
      setQty1L(0);
      setQtyBulk(0);
    } else if (type === '6L_combo') {
      setQty4L(1);
      setQty1L(2);
      setQty5L(0);
      setQtyBulk(0);
    }
  };

  // Calculate total price preview
  const totalPrice = useMemo(() => {
    let sum = 0;
    if (item1L && qty1L > 0) sum += (Number(item1L.sell_price) || 0) * qty1L;
    if (item4L && qty4L > 0) sum += (Number(item4L.sell_price) || 0) * qty4L;
    if (item5L && qty5L > 0) sum += (Number(item5L.sell_price) || 0) * qty5L;
    if (itemBulk && qtyBulk > 0) sum += (Number(itemBulk.sell_price) || 0) * qtyBulk;

    if (addOilFilter && oilFilterItem) sum += (Number(oilFilterItem.sell_price) || 0);
    if (addAirFilter && airFilterItem) sum += (Number(airFilterItem.sell_price) || 0);
    if (addCabinFilter && cabinFilterItem) sum += (Number(cabinFilterItem.sell_price) || 0);
    return sum;
  }, [qty1L, qty4L, qty5L, qtyBulk, addOilFilter, addAirFilter, addCabinFilter, item1L, item4L, item5L, itemBulk, oilFilterItem, airFilterItem, cabinFilterItem]);

  const totalLiters = (qty4L * 4) + (qty1L * 1) + (qty5L * 5) + (qtyBulk * 1);

  const handleConfirm = () => {
    const itemsToAdd = [];

    if (item4L && qty4L > 0) {
      itemsToAdd.push({
        inventory_id: item4L.id,
        item_type: 'product',
        description: item4L.name,
        qty: qty4L,
        unit_price: Number(item4L.sell_price) || 0,
        labor_fee: 0,
        subtotal: (Number(item4L.sell_price) || 0) * qty4L,
      });
    }

    if (item1L && qty1L > 0) {
      itemsToAdd.push({
        inventory_id: item1L.id,
        item_type: 'product',
        description: item1L.name,
        qty: qty1L,
        unit_price: Number(item1L.sell_price) || 0,
        labor_fee: 0,
        subtotal: (Number(item1L.sell_price) || 0) * qty1L,
      });
    }

    if (item5L && qty5L > 0) {
      itemsToAdd.push({
        inventory_id: item5L.id,
        item_type: 'product',
        description: item5L.name,
        qty: qty5L,
        unit_price: Number(item5L.sell_price) || 0,
        labor_fee: 0,
        subtotal: (Number(item5L.sell_price) || 0) * qty5L,
      });
    }

    if (itemBulk && qtyBulk > 0) {
      itemsToAdd.push({
        inventory_id: itemBulk.id,
        item_type: 'product',
        description: itemBulk.name,
        qty: qtyBulk,
        unit_price: Number(itemBulk.sell_price) || 0,
        labor_fee: 0,
        subtotal: (Number(itemBulk.sell_price) || 0) * qtyBulk,
      });
    }

    if (addOilFilter && oilFilterItem) {
      itemsToAdd.push({
        inventory_id: oilFilterItem.id,
        item_type: 'product',
        description: oilFilterItem.name,
        qty: 1,
        unit_price: Number(oilFilterItem.sell_price) || 0,
        labor_fee: 0,
        subtotal: Number(oilFilterItem.sell_price) || 0,
      });
    }

    if (addAirFilter && airFilterItem) {
      itemsToAdd.push({
        inventory_id: airFilterItem.id,
        item_type: 'product',
        description: airFilterItem.name,
        qty: 1,
        unit_price: Number(airFilterItem.sell_price) || 0,
        labor_fee: 0,
        subtotal: Number(airFilterItem.sell_price) || 0,
      });
    }

    if (addCabinFilter && cabinFilterItem) {
      itemsToAdd.push({
        inventory_id: cabinFilterItem.id,
        item_type: 'product',
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

  // Rule of Hooks: early return placed strictly after all hooks!
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-950 border border-white/20 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Droplets className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">محدد غيار الزيت والفلاتر السريع</h3>
              <p className="text-xs text-slate-400">اختر الماركة، اللزوجة، والعبوات بنقرة واحدة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Brands Picker */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>1. ماركة الزيت:</span>
              <span className="text-amber-400 font-semibold">{selectedBrand}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {brands.map((b) => {
                const isSelected = selectedBrand === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrand(b.id)}
                    className={`min-h-[52px] px-2.5 py-2 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25 scale-[1.02]'
                        : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate w-full text-center">{b.name}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Viscosity Picker */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>2. درجة اللزوجة:</span>
              <span className="text-amber-400 font-mono font-bold">{selectedViscosity}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {viscosities.map((v) => {
                const isSelected = selectedViscosity === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedViscosity(v)}
                    className={`min-h-[48px] rounded-2xl border text-sm font-extrabold font-mono transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      isSelected
                        ? 'bg-white text-slate-950 border-white shadow-lg scale-[1.02]'
                        : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{v}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Quick Combo Shortcuts */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <span>اختصارات سريعة للسيارات الشائعة:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('4L')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center active:scale-95 ${
                  qty4L === 1 && qty1L === 0 && qty5L === 0 && qtyBulk === 0
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                سيارة صغيرة (4L)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('5L_combo')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center active:scale-95 ${
                  qty4L === 1 && qty1L === 1
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                تويوتا / كيا (4L + 1L)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('6L_combo')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center active:scale-95 ${
                  qty4L === 1 && qty1L === 2
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                هايلوكس/برادو (4L + 2L)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('5L_can')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center active:scale-95 ${
                  qty5L === 1
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                دبة 5 لتر كاملة
              </button>
            </div>
          </div>

          {/* 4. Pack Sizes & Quantity Controls */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>3. تحديد كميات العبوات:</span>
              {totalLiters > 0 && (
                <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  الإجمالي: {totalLiters} لتر
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {/* 4L Pack */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">دبة 4 لتر</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item4L ? (
                      <span className="text-emerald-400 font-bold font-mono">
                        {(Number(item4L.sell_price) || 0).toLocaleString()} ر.ي
                        <span className="text-slate-400 font-normal mr-1.5">(متبقي بالمخزن: {item4L.stock_qty})</span>
                      </span>
                    ) : (
                      <span className="text-amber-400/80">غير متوفر بالمخزن بهذه اللزوجة</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty4L(Math.max(0, qty4L - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-base text-white">{qty4L}</span>
                  <button
                    type="button"
                    onClick={() => setQty4L(qty4L + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* 1L Pack */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">علبة 1 لتر (مفرد أو إضافي)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item1L ? (
                      <span className="text-emerald-400 font-bold font-mono">
                        {(Number(item1L.sell_price) || 0).toLocaleString()} ر.ي
                        <span className="text-slate-400 font-normal mr-1.5">(متبقي: {item1L.stock_qty})</span>
                      </span>
                    ) : (
                      <span className="text-amber-400/80">غير متوفر بالمخزن بهذه اللزوجة</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty1L(Math.max(0, qty1L - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-base text-white">{qty1L}</span>
                  <button
                    type="button"
                    onClick={() => setQty1L(qty1L + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* 5L Pack */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">دبة 5 لتر كاملة</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item5L ? (
                      <span className="text-emerald-400 font-bold font-mono">
                        {(Number(item5L.sell_price) || 0).toLocaleString()} ر.ي
                        <span className="text-slate-400 font-normal mr-1.5">(متبقي: {item5L.stock_qty})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">غير متوفر بهذه الماركة</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty5L(Math.max(0, qty5L - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-base text-white">{qty5L}</span>
                  <button
                    type="button"
                    onClick={() => setQty5L(qty5L + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Bulk Liter */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <div>
                  <div className="font-extrabold text-sm text-white">زيت فلت بالبرميل (باللتر)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {itemBulk ? (
                      <span className="text-emerald-400 font-bold font-mono">
                        {(Number(itemBulk.sell_price) || 0).toLocaleString()} ر.ي/لتر
                        <span className="text-slate-400 font-normal mr-1.5">(متبقي: {itemBulk.stock_qty} لتر)</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">غير متوفر برميل فلت</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQtyBulk(Math.max(0, qtyBulk - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-base text-white">{qtyBulk}</span>
                  <button
                    type="button"
                    onClick={() => setQtyBulk(qtyBulk + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Accompanying Filters */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <span>4. الفلاتر المرافقة بنقرة واحدة:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setAddOilFilter(!addOilFilter)}
                className={`min-h-[52px] p-3 rounded-2xl border text-right transition flex items-center justify-between active:scale-95 ${
                  addOilFilter
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">فلتر زيت أصلي</div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {oilFilterItem ? `+${(Number(oilFilterItem.sell_price) || 0).toLocaleString()} ر.ي` : '4,500 ر.ي'}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${addOilFilter ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>
                  {addOilFilter && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAddAirFilter(!addAirFilter)}
                className={`min-h-[52px] p-3 rounded-2xl border text-right transition flex items-center justify-between active:scale-95 ${
                  addAirFilter
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">فلتر هواء محرك</div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {airFilterItem ? `+${(Number(airFilterItem.sell_price) || 0).toLocaleString()} ر.ي` : '6,500 ر.ي'}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${addAirFilter ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>
                  {addAirFilter && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAddCabinFilter(!addCabinFilter)}
                className={`min-h-[52px] p-3 rounded-2xl border text-right transition flex items-center justify-between active:scale-95 ${
                  addCabinFilter
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">فلتر مكيف كربوني</div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {cabinFilterItem ? `+${(Number(cabinFilterItem.sell_price) || 0).toLocaleString()} ر.ي` : '5,000 ر.ي'}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${addCabinFilter ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>
                  {addCabinFilter && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-xs text-slate-400">المجموع التقديري:</div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {totalPrice.toLocaleString()} <span className="text-xs font-sans text-slate-300">ر.ي</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition active:scale-95"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-[48px] px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition flex items-center gap-2 active:scale-95"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>إضافة للخدمة والفاتورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
