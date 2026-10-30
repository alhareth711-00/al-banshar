import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Package,
  Check,
  AlertCircle,
  Plus,
  Wrench,
  Barcode,
  ShieldCheck,
  MapPin,
  Calculator,
  Calendar,
  AlertTriangle,
  ChevronDown,
  Info,
} from 'lucide-react';

export function calculateDotAge(dotCode) {
  if (!dotCode || String(dotCode).trim().length < 4) return null;
  const clean = String(dotCode).trim().replace(/\D/g, '');
  if (clean.length !== 4) return null;
  const week = parseInt(clean.substring(0, 2), 10);
  const year = 2000 + parseInt(clean.substring(2, 4), 10);
  if (week < 1 || week > 53 || year < 2010 || year > 2035) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = Math.ceil(((now - new Date(currentYear, 0, 1)) / 86400000) / 7);

  const ageInWeeks = (currentYear - year) * 52 + (currentWeek - week);
  const ageInMonths = Math.max(0, Math.round(ageInWeeks / 4.33));
  const ageInYears = Math.round((ageInMonths / 12) * 10) / 10;

  let status = 'fresh';
  let label = `حديث الصنع (${ageInMonths} شهر)`;
  let color = 'emerald';

  if (ageInMonths <= 12) {
    status = 'fresh';
    label = `حديث الصنع (${ageInMonths} شهر)`;
    color = 'emerald';
  } else if (ageInMonths <= 24) {
    status = 'acceptable';
    label = `عمر تشغيلي مناسب (${ageInYears} سنة)`;
    color = 'teal';
  } else if (ageInMonths <= 36) {
    status = 'aging';
    label = `متقادم يوصى بتصريفه (${ageInYears} سنة)`;
    color = 'amber';
  } else {
    status = 'expired';
    label = `إطار قديم عالي الخطورة (${ageInYears} سنة)`;
    color = 'rose';
  }

  return { week, year, ageInMonths, ageInYears, status, label, color };
}

// Single-letter prefix SKU generator (Z=زيت, F=فلتر, T=إطار, B=بطارية, S=خدمة, P=منتج عام)
export const generateSingleLetterSku = (category) => {
  const prefixMap = {
    oil: 'Z',
    filter: 'F',
    tire: 'T',
    battery: 'B',
    service: 'S',
    accessory: 'P',
  };
  const prefix = prefixMap[category] || 'P';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
};

export default function AddInventoryModal({ isOpen, onClose, onCreated, itemToEdit = null }) {
  const isEditMode = Boolean(itemToEdit);

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'oil',
    item_type: 'product',
    brand: 'تويوتا',
    viscosity: '20W-50',
    oil_type: 'معدني تقليدي',
    api_grade: 'SP / CF',
    pack_size: '4L',
    carton_pack_qty: 24,
    tire_battery_spec: '',
    country_of_origin: 'اليابان',
    dot_code: '',
    battery_capacity_ah: '',
    warranty_months: 0,
    cost_price: '',
    sell_price: '',
    initial_stock_qty: '0',
    min_stock_alert: 5,
    location_shelf: '',
    is_consignment: false,
    consignment_supplier_name: '',
    notes: '',
  });

  const [customMarkup, setCustomMarkup] = useState('20');
  const [showAdvancedSection, setShowAdvancedSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const nameInputRef = useRef(null);

  // Close on Escape & Autofocus on open
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
      }
    }, 120);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Populate form if in edit mode
  useEffect(() => {
    if (itemToEdit) {
      const cost = Number(itemToEdit.cost_price) || 0;
      const sell = Number(itemToEdit.sell_price) || 0;
      const m = cost > 0 && sell > 0 ? Math.round(((sell - cost) / cost) * 100) : 20;

      setFormData({
        sku: itemToEdit.sku || '',
        barcode: itemToEdit.barcode || '',
        name: itemToEdit.name || '',
        category: itemToEdit.category || 'oil',
        item_type: itemToEdit.item_type || (itemToEdit.category === 'service' ? 'service' : 'product'),
        brand: itemToEdit.brand || 'عام',
        viscosity: itemToEdit.viscosity || '20W-50',
        oil_type: itemToEdit.oil_type || 'معدني تقليدي',
        api_grade: itemToEdit.api_grade || 'SP / CF',
        pack_size: itemToEdit.pack_size || '4L',
        carton_pack_qty: itemToEdit.carton_pack_qty || 24,
        tire_battery_spec: itemToEdit.tire_battery_spec || '',
        country_of_origin: itemToEdit.country_of_origin || 'اليابان',
        dot_code: itemToEdit.dot_code || '',
        battery_capacity_ah: itemToEdit.battery_capacity_ah || '',
        warranty_months: itemToEdit.warranty_months || 0,
        cost_price: itemToEdit.cost_price !== undefined ? String(itemToEdit.cost_price) : '',
        sell_price: itemToEdit.sell_price !== undefined ? String(itemToEdit.sell_price) : '',
        initial_stock_qty: itemToEdit.stock_qty !== undefined ? String(itemToEdit.stock_qty) : '0',
        min_stock_alert: itemToEdit.min_stock_alert !== undefined ? itemToEdit.min_stock_alert : 5,
        location_shelf: itemToEdit.location_shelf || '',
        is_consignment: Boolean(itemToEdit.is_consignment),
        consignment_supplier_name: itemToEdit.consignment_supplier_name || '',
        notes: itemToEdit.notes || '',
      });
      setCustomMarkup(String(m));
      setShowAdvancedSection(Boolean(itemToEdit.barcode || itemToEdit.location_shelf || itemToEdit.notes));
    } else {
      setFormData({
        sku: '',
        barcode: '',
        name: '',
        category: 'oil',
        item_type: 'product',
        brand: 'تويوتا',
        viscosity: '20W-50',
        oil_type: 'معدني تقليدي',
        api_grade: 'SP / CF',
        pack_size: '4L',
        carton_pack_qty: 24,
        tire_battery_spec: '',
        country_of_origin: 'اليابان',
        dot_code: '',
        battery_capacity_ah: '',
        warranty_months: 0,
        cost_price: '',
        sell_price: '',
        initial_stock_qty: '0',
        min_stock_alert: 5,
        location_shelf: '',
        is_consignment: false,
        consignment_supplier_name: '',
        notes: '',
      });
      setCustomMarkup('20');
      setShowAdvancedSection(false);
    }
  }, [itemToEdit, isOpen]);

  const applyMarkup = (markupPercent) => {
    setCustomMarkup(String(markupPercent));
    const cost = Number(formData.cost_price) || 0;
    if (cost > 0) {
      const rawSell = cost * (1 + markupPercent / 100);
      const roundedSell = Math.round(rawSell / 50) * 50;
      setFormData((prev) => ({ ...prev, sell_price: String(roundedSell) }));
    }
  };

  const handleSellPriceChange = (val) => {
    setFormData((prev) => ({ ...prev, sell_price: val }));
    const cost = Number(formData.cost_price) || 0;
    const sell = Number(val) || 0;
    if (cost > 0 && sell > 0) {
      const m = Math.round(((sell - cost) / cost) * 100);
      setCustomMarkup(String(m));
    }
  };

  const handleCostPriceChange = (val) => {
    setFormData((prev) => ({ ...prev, cost_price: val }));
    const cost = Number(val) || 0;
    const markup = Number(customMarkup) || 20;
    if (cost > 0 && markup > 0) {
      const rawSell = cost * (1 + markup / 100);
      const roundedSell = Math.round(rawSell / 50) * 50;
      setFormData((prev) => ({ ...prev, cost_price: val, sell_price: String(roundedSell) }));
    }
  };

  const dotAnalysis = useMemo(() => {
    if (formData.category !== 'tire') return null;
    return calculateDotAge(formData.dot_code);
  }, [formData.category, formData.dot_code]);

  if (!isOpen) return null;

  const isService = formData.category === 'service';

  const handleCategoryChange = (cat) => {
    const isSrv = cat === 'service';
    setFormData((prev) => ({
      ...prev,
      category: cat,
      item_type: isSrv ? 'service' : 'product',
      brand: isSrv ? 'خدمات المركز' : prev.brand === 'خدمات المركز' ? 'تويوتا' : prev.brand,
      pack_size: isSrv ? 'unit' : prev.pack_size,
      min_stock_alert: isSrv ? 0 : prev.min_stock_alert || 5,
      cost_price: isSrv && !prev.cost_price ? '0' : prev.cost_price,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم الصنف أو الخدمة');
      return;
    }
    if (!isService && (!formData.cost_price || Number(formData.cost_price) < 0)) {
      setError('يرجى إدخال سعر تكلفة صحيح للسلعة');
      return;
    }
    if (!formData.sell_price || Number(formData.sell_price) <= 0) {
      setError('يرجى إدخال سعر بيع / أجرة خدمة صحيحة');
      return;
    }
    if (!isService && formData.is_consignment && !formData.consignment_supplier_name.trim()) {
      setError('يرجى تحديد أو كتابة اسم المورد صاحب بضاعة الأمانة');
      return;
    }

    try {
      setIsSubmitting(true);
      // Auto-generate single-letter SKU if user left it blank
      const sku = formData.sku.trim() || generateSingleLetterSku(formData.category);

      const payload = {
        ...formData,
        sku,
        barcode: formData.barcode.trim() || null,
        cost_price: Number(formData.cost_price) || 0,
        sell_price: Number(formData.sell_price) || 0,
        warranty_months: Number(formData.warranty_months) || 0,
        carton_pack_qty: Number(formData.carton_pack_qty) || 24,
        min_stock_alert: isService ? 0 : Number(formData.min_stock_alert) || 5,
        is_consignment: formData.is_consignment ? 1 : 0,
        consignment_supplier_name: formData.is_consignment ? formData.consignment_supplier_name.trim() : null,
        stock_qty: isService
          ? 9999
          : (formData.initial_stock_qty !== '' && !isNaN(Number(formData.initial_stock_qty)))
          ? Number(formData.initial_stock_qty)
          : isEditMode
          ? itemToEdit.stock_qty
          : 0,
      };

      const url = isEditMode ? `/api/inventory/${itemToEdit.id}` : '/api/inventory';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'حدث خطأ أثناء حفظ الصنف');
      }

      if (onCreated) onCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const profitMargin = (Number(formData.sell_price) || 0) - (Number(formData.cost_price) || 0);
  const marginPercent =
    Number(formData.cost_price) > 0
      ? Math.round((profitMargin / Number(formData.cost_price)) * 100)
      : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header with Hint Banner */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isService
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isService ? <Wrench className="w-5 h-5 stroke-[2.2]" /> : <Package className="w-5 h-5 stroke-[2.2]" />}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {isEditMode ? `تعديل بيانات الصنف: ${itemToEdit.name}` : 'إضافة صنف أو خدمة جديدة'}
              </h3>
              <p className="text-xs text-amber-300 font-medium flex items-center gap-1 mt-0.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>أدخل البيانات الأساسية وسيتولد كود الصنف التلقائي (حرف واحد) وحساب الربح فوراً.</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto max-h-[82vh] custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Category Selector Tabs */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">اختر قسم الصنف أو نوع الخدمة:</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: 'oil', label: '🛢️ زيوت' },
                { id: 'filter', label: '🔘 فلاتر' },
                { id: 'tire', label: '🛞 إطارات' },
                { id: 'battery', label: '🔋 بطاريات' },
                { id: 'service', label: '🔧 خدمات' },
                { id: 'accessory', label: '⚙️ أخرى' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoryChange(c.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center ${
                    formData.category === c.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Direct Essential Field: Name */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">اسم الصنف أو الخدمة المباشر:</label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder={isService ? 'مثال: غيار زيت محرك وتشييك' : 'مثال: زيت تويوتا ذهبي 20W-50 علبة 1 لتر'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm font-bold focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Dynamic Category Specific Specifications (مباشرة بحسب التصنيف) */}
          {formData.category === 'oil' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-in fade-in">
              <div className="text-amber-300 font-extrabold text-xs flex items-center gap-1.5">
                <span>🛢️ مواصفات ولزوجة وسعة الزيت:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-bold">درجة اللزوجة:</label>
                  <select
                    value={formData.viscosity}
                    onChange={(e) => setFormData({ ...formData, viscosity: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
                  >
                    <option value="20W-50">20W-50</option>
                    <option value="10W-40">10W-40</option>
                    <option value="5W-30">5W-30</option>
                    <option value="5W-40">5W-40</option>
                    <option value="0W-20">0W-20</option>
                    <option value="15W-40">15W-40</option>
                    <option value="80W-90">80W-90 (تروس/دفرنش)</option>
                    <option value="ATF-WS">ATF-WS (قير)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-bold">نوع تركيبة الزيت:</label>
                  <select
                    value={formData.oil_type}
                    onChange={(e) => setFormData({ ...formData, oil_type: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold"
                  >
                    <option value="معدني تقليدي">معدني تقليدي</option>
                    <option value="نصف تخليقي">نصف تخليقي</option>
                    <option value="تخليقي بالكامل">تخليقي بالكامل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-bold">سعة العبوة:</label>
                  <select
                    value={formData.pack_size}
                    onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                    className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold"
                  >
                    <option value="1L">1 لتر (علبة)</option>
                    <option value="4L">4 لتر (دبة)</option>
                    <option value="5L">5 لتر</option>
                    <option value="bulk_liter">لتر فلت برميل</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {formData.category === 'tire' && (
            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-2.5 animate-in fade-in">
              <div className="text-teal-300 font-extrabold text-xs flex items-center justify-between">
                <span>🛞 مقاس الإطار وتاريخ الصنع (DOT):</span>
                {dotAnalysis && (
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                      dotAnalysis.color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : dotAnalysis.color === 'teal'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : dotAnalysis.color === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {dotAnalysis.label} (صنع سنة {dotAnalysis.year})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-bold">مقاس الإطار:</label>
                  <input
                    type="text"
                    placeholder="مثال: 205/65R15 أو 195/65R15"
                    value={formData.tire_battery_spec}
                    onChange={(e) => setFormData({ ...formData, tire_battery_spec: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-bold">رمز DOT (4 أرقام: أسبوع وسنة الصنع مثل 2423):</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="مثال: 2423"
                    value={formData.dot_code}
                    onChange={(e) => setFormData({ ...formData, dot_code: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-teal-300 font-mono text-xs font-extrabold focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.category === 'battery' && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2.5 animate-in fade-in">
              <div className="text-cyan-300 font-extrabold text-xs">
                <span>🔋 سعة البطارية (أمبير) والضمان:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-bold">سعة البطارية (Ah):</label>
                  <input
                    type="text"
                    placeholder="مثال: 55Ah، 70Ah، 100Ah"
                    value={formData.battery_capacity_ah}
                    onChange={(e) => setFormData({ ...formData, battery_capacity_ah: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-bold">فترة الضمان (أشهر):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 12 شهر"
                    value={formData.warranty_months}
                    onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-cyan-300 font-mono text-xs font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Direct Essential Fields: Pricing & Markup Calculator */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>التسعير وهامش الربح:</span>
              </span>
              <span className="text-[11px] text-slate-400">تقريب تلقائي لأقرب 50 ر.ي</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isService ? 'التكلفة المباشرة:' : 'سعر الشراء (التكلفة للعلبة/الحبة):'}
                </label>
                <input
                  type="number"
                  placeholder={isService ? '0' : '2200'}
                  value={formData.cost_price}
                  onChange={(e) => handleCostPriceChange(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
                  required={!isService}
                />
              </div>

              {!isService && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">نسبة الربح المستهدفة (%):</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="20"
                      value={customMarkup}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomMarkup(val);
                        if (val && Number(val) >= 0) {
                          applyMarkup(Number(val));
                        }
                      }}
                      className="w-full min-h-[44px] pr-3 pl-8 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isService ? 'سعر الخدمة للزبون:' : 'سعر البيع للزبون:'}
                </label>
                <input
                  type="number"
                  placeholder={isService ? '2000' : '2600'}
                  value={formData.sell_price}
                  onChange={(e) => handleSellPriceChange(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-amber-400 font-mono text-sm font-black focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            {/* Quick Markup Presets */}
            {!isService && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-bold ml-1">نسب ربح سريعة:</span>
                {[10, 15, 20, 25, 30, 40].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyMarkup(pct)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition border ${
                      Number(customMarkup) === pct
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-300 border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            )}

            {/* Profit margin summary */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold">صافي الربح المتوقع للوحدة:</span>
              <div className="flex items-center gap-2">
                <span className={`font-black text-sm ${profitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  +{profitMargin.toLocaleString()} ر.ي
                </span>
                <span className="text-slate-400">({marginPercent}%)</span>
              </div>
            </div>
          </div>

          {/* 4. Direct Essential Fields: Stock Quantities & Safety Alert */}
          {!isService && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">
                  {isEditMode ? 'الكمية الحالية بالرف (علبة/حبة):' : 'الرصيد الابتدائي المتوفر بالرف (علبة/حبة):'}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.initial_stock_qty}
                  onChange={(e) => setFormData({ ...formData, initial_stock_qty: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400 text-center"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-xs">
                  حد التنبيه لنقص المخزون (تنبيه النواقص):
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_stock_alert}
                  onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400 text-center"
                />
              </div>
            </div>
          )}

          {/* Consignment (بضاعة أمانات وتصريف) Section */}
          {!isService && (
            <div className={`p-3.5 rounded-2xl border transition ${formData.is_consignment ? 'bg-amber-500/10 border-amber-500/40 shadow-sm' : 'bg-slate-900/60 border-white/10'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base ${formData.is_consignment ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}>
                    🤝
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-white">بضاعة أمانة وتصريف (Consignment)</div>
                    <div className="text-[10px] text-slate-400">البضاعة مملوكة للمورد ويتم التحاسب معه بعد البيع والتصريف فقط</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_consignment}
                    onChange={(e) => setFormData({ ...formData, is_consignment: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {formData.is_consignment && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in">
                  <div>
                    <label className="block text-amber-300 font-bold mb-1 text-xs">
                      اسم المورد / الشركة صاحبة الأمانة:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: شركة النفط، بازرعة، شركة النور..."
                      value={formData.consignment_supplier_name}
                      onChange={(e) => setFormData({ ...formData, consignment_supplier_name: e.target.value })}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-amber-400/40 text-amber-200 text-xs font-bold focus:outline-none focus:border-amber-400"
                      required={formData.is_consignment}
                    />
                  </div>
                  <div className="flex items-center text-[11px] text-amber-200/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    💡 يظهر هذا الصنف تلقائياً في كشف جرد بضاعة الأمانات لسهولة محاسبة مندوب الشركة عند زيارته.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Progressive Disclosure: Collapsible Advanced Specs Accordion */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40">
            <button
              type="button"
              onClick={() => setShowAdvancedSection((prev) => !prev)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              <span className="flex items-center gap-2">
                <span>⚙️</span>
                <span>خيارات متقدمة للمواصفات والباركود والرفوف (اختياري)</span>
              </span>
              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                <span>{showAdvancedSection ? 'إخفاء' : 'عرض التفاصيل'}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showAdvancedSection ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {showAdvancedSection && (
              <div className="p-4 border-t border-white/10 space-y-3.5 bg-slate-950/60 animate-in fade-in duration-150">
                {/* SKU (single-letter prefix) & Barcode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      كود الصنف (SKU بحرف واحد):
                    </label>
                    <input
                      type="text"
                      placeholder={`توليد تلقائي: ${generateSingleLetterSku(formData.category)}`}
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">اتركه فارغاً للتوليد التلقائي بحرف واحد ({formData.category === 'oil' ? 'Z-' : formData.category === 'filter' ? 'F-' : formData.category === 'tire' ? 'T-' : formData.category === 'battery' ? 'B-' : 'S-'})</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-teal-400" />
                      <span>رقم الباركود الدولي (Barcode):</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مسح بقارئ الباركود أو إدخال يدوي"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Brand & Shelf Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الماركة / الشركة المصنعة:</label>
                    <input
                      type="text"
                      placeholder="تويوتا، شل، كاسترول، بترومين..."
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>موقع الرف في المحل:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: رف 2، الحفرة، قسم الزيوت..."
                      value={formData.location_shelf}
                      onChange={(e) => setFormData({ ...formData, location_shelf: e.target.value })}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                    />
                  </div>
                </div>

                {/* Carton pack qty for products */}
                {!isService && (
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">عدد العلب / اللترات في الكرتون أو الشدة (للتوريد):</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.carton_pack_qty}
                      onChange={(e) => setFormData({ ...formData, carton_pack_qty: e.target.value })}
                      className="w-full min-h-[40px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ملاحظات إضافية حول الصنف:</label>
                  <input
                    type="text"
                    placeholder="ملاحظات حول المورد أو الاستخدام أو تفاصيل أخرى..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full min-h-[40px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              {isSubmitting
                ? 'جاري الحفظ...'
                : isEditMode
                ? 'تحديث بيانات الصنف ✅'
                : 'حفظ الصنف في الكتالوج ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
