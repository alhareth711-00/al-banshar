import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Car, User, Phone, Gauge, Check, AlertCircle, Building2, 
  Percent, FileText, Hash, ShieldCheck, Zap, Sparkles, Sliders,
  HelpCircle, Wrench
} from 'lucide-react';

export default function NewVehicleModal({ isOpen, onClose, onVehicleCreated, initialVehicle = null }) {
  // Active design style: 1 = Tactical Workshop, 2 = Yemeni Plate Capsule, 3 = Dual-Pane Console (Default)
  const [activeStyle, setActiveStyle] = useState(() => {
    return localStorage.getItem('al_banshar_new_vehicle_style') || '3';
  });

  const [formData, setFormData] = useState({
    plate_number: '',
    plate_divider: '1',
    plate_type: 'خصوصي',
    vehicle_category: 'سيارة',
    car_make_model: '',
    customer_name: '',
    phone: '',
    preferred_oil_brand: 'تويوتا',
    preferred_viscosity: '20W-50',
    last_odometer: '',
    service_interval_km: 3000,
    customer_type: 'individual', // 'individual' | 'fleet' | 'vip'
    corporate_name: '',
    discount_percent: 0,
    credit_limit: 0,
    opening_balance: 0,
    customer_notes: '',
    corporate_tax_no: '',
    billing_cycle: 'instant', // 'instant' | 'monthly'
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef(null);

  // Switch style & persist
  const handleStyleChange = (styleId) => {
    setActiveStyle(styleId);
    localStorage.setItem('al_banshar_new_vehicle_style', styleId);
  };

  useEffect(() => {
    if (initialVehicle) {
      const isAutoPlate = initialVehicle.plate_number && initialVehicle.plate_number.startsWith('بدون');
      setFormData({
        plate_number: isAutoPlate ? '' : (initialVehicle.plate_number || ''),
        plate_divider: initialVehicle.plate_divider ? String(initialVehicle.plate_divider) : '1',
        plate_type: initialVehicle.plate_type || 'خصوصي',
        vehicle_category: initialVehicle.vehicle_category || 'سيارة',
        car_make_model: initialVehicle.car_make_model || '',
        customer_name: initialVehicle.customer_name || '',
        phone: initialVehicle.phone || '',
        preferred_oil_brand: initialVehicle.preferred_oil_brand || 'تويوتا',
        preferred_viscosity: initialVehicle.preferred_viscosity || '20W-50',
        last_odometer: initialVehicle.last_odometer ? String(initialVehicle.last_odometer) : '',
        service_interval_km: initialVehicle.service_interval_km ? Number(initialVehicle.service_interval_km) : 3000,
        customer_type: initialVehicle.customer_type || 'individual',
        corporate_name: initialVehicle.corporate_name || '',
        discount_percent: initialVehicle.discount_percent || 0,
        credit_limit: initialVehicle.credit_limit || (initialVehicle.customer_type === 'fleet' ? 50000 : initialVehicle.customer_type === 'vip' ? 10000 : 0),
        opening_balance: initialVehicle.balance_due || 0,
        customer_notes: initialVehicle.customer_notes || '',
        corporate_tax_no: initialVehicle.corporate_tax_no || '',
        billing_cycle: initialVehicle.billing_cycle || 'instant',
      });
    } else {
      setFormData({
        plate_number: '',
        plate_divider: '1',
        plate_type: 'خصوصي',
        vehicle_category: 'سيارة',
        car_make_model: '',
        customer_name: '',
        phone: '',
        preferred_oil_brand: 'تويوتا',
        preferred_viscosity: '20W-50',
        last_odometer: '',
        service_interval_km: 3000,
        customer_type: 'individual',
        corporate_name: '',
        discount_percent: 0,
        credit_limit: 0,
        opening_balance: 0,
        customer_notes: '',
        corporate_tax_no: '',
        billing_cycle: 'instant',
      });
    }
    setError('');
  }, [initialVehicle, isOpen]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, activeStyle]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_name.trim()) {
      setError('يرجى إدخال اسم العميل');
      return;
    }
    if (!formData.phone.trim()) {
      setError('يرجى إدخال رقم هاتف العميل');
      return;
    }

    if (formData.customer_type === 'fleet' && !formData.corporate_name.trim()) {
      setError('يرجى إدخال اسم الشركة أو الجهة أو الأسطول');
      return;
    }

    try {
      setSubmitting(true);
      const isEdit = initialVehicle && initialVehicle.id;
      const url = isEdit ? `/api/vehicles/${initialVehicle.id}` : '/api/vehicles';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        car_make_model: formData.car_make_model.trim() || `${formData.vehicle_category} بدون تحديد`,
        last_odometer: Number(formData.last_odometer) || 0,
        service_interval_km: Number(formData.service_interval_km) || 3000,
        discount_percent: Number(formData.discount_percent) || 0,
        credit_limit: Number(formData.credit_limit) || 0,
        balance_due: Number(formData.opening_balance) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'فشل في حفظ بيانات العميل');
      }

      onVehicleCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Official Yemeni Plate Types - ALL WITH BLACK TEXT
  const plateTypes = [
    { id: 'خصوصي', label: 'خصوصي', bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-slate-950 font-black' },
    { id: 'نقل', label: 'نقل', bg: 'bg-red-500', border: 'border-red-700', text: 'text-slate-950 font-black' },
    { id: 'أجرة', label: 'أجرة', bg: 'bg-amber-400', border: 'border-amber-600', text: 'text-slate-950 font-black' },
    { id: 'مؤقت', label: 'مؤقت', bg: 'bg-white', border: 'border-slate-400', text: 'text-slate-950 font-black' },
  ];

  // Vehicle Categories
  const vehicleCategories = [
    'سيارة',
    'هايلوكس',
    'باص',
    'دراجة نارية',
    'قلاب',
    'دينة',
    'وايت ماء',
    'قاطرة',
    'صالون/شاص',
    'شاحنة كبيرة',
    'أخرى',
  ];

  // Customer Account Types (Taxi & Gov removed per request)
  const customerTypes = [
    { id: 'individual', label: '🚗 فردي (شخصي)', defaultLimit: 0, defaultDiscount: 0 },
    { id: 'fleet', label: '🏢 أسطول شركات', defaultLimit: 50000, defaultDiscount: 10 },
    { id: 'vip', label: '⭐ عميل مميز VIP', defaultLimit: 10000, defaultDiscount: 0 },
  ];

  const handleCustomerTypeSelect = (typeId) => {
    const target = customerTypes.find(c => c.id === typeId);
    setFormData(prev => ({
      ...prev,
      customer_type: typeId,
      credit_limit: target ? target.defaultLimit : 0,
      discount_percent: target ? target.defaultDiscount : 0,
    }));
  };

  const currentPlateMeta = plateTypes.find(p => p.id === formData.plate_type) || plateTypes[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl transition-all duration-200 ${
        activeStyle === '3' 
          ? 'max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl' 
          : activeStyle === '2' 
            ? 'max-w-2xl apple-glass border border-white/20 rounded-3xl' 
            : 'max-w-2xl bg-slate-900 border-2 border-slate-700 rounded-2xl'
      }`}>

        {/* ─── MODAL HEADER WITH 3-STYLE LIVE SWITCHER ─── */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              {activeStyle === '1' ? '⚡' : activeStyle === '2' ? '💎' : '📑'}
            </div>
            <div>
              <h3 className="font-black text-white text-base leading-tight">
                {initialVehicle ? 'تعديل بيانات المركبة والعميل' : 'إضافة مركبة وعميل جديد'}
              </h3>
              <p className="text-[11px] text-slate-400">
                تسجيل متكامل وسريع بلوحة المفاتيح والـ Numpad
              </p>
            </div>
          </div>

          {/* Style Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleStyleChange('1')}
              title="النمط التكتيكي السريع لورشة العمل"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeStyle === '1'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⚡</span> تكتيكي
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange('2')}
              title="نمط رخصة اللوحة الزجاجية الفاخرة"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeStyle === '2'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>💎</span> زجاجي
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange('3')}
              title="كونسول الاستقبال المزدوج (العميل يميناً والمركبة يساراً)"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeStyle === '3'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📑</span> كونسول مزدوج
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* ─── VARIANT 3: DUAL-PANE CONSOLE (DEFAULT & RECOMMENDED) ─── */}
        {activeStyle === '3' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-800 flex-1 overflow-y-auto">
              
              {/* RIGHT COLUMN: CUSTOMER & FINANCIAL (الجهة اليمنى: بيانات العميل والمالية) */}
              <div className="p-5 space-y-3.5 bg-slate-900/60">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <User className="w-4 h-4" /> الجهة اليمنى: بيانات العميل والمالية
                  </span>
                  <span className="text-[10px] text-slate-400">إدخال سريع بالكيبورد [TAB]</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسم العميل بالكامل <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={firstInputRef}
                      type="text"
                      tabIndex={1}
                      placeholder="مثال: صالح محمد اليافعي"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                    <User className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      رقم الجوال <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        tabIndex={2}
                        placeholder="77XXXXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                        required
                      />
                      <Phone className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">فئة العميل</label>
                    <div className="flex gap-1 h-10">
                      {customerTypes.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCustomerTypeSelect(c.id)}
                          className={`flex-1 rounded-lg text-[10px] font-bold border transition leading-tight ${
                            formData.customer_type === c.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {c.id === 'individual' ? 'فردي' : c.id === 'fleet' ? 'شركات' : 'VIP'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fleet Company Name (shown if fleet) */}
                {formData.customer_type === 'fleet' && (
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-amber-300">اسم الشركة أو الأسطول *</label>
                    <input
                      type="text"
                      tabIndex={3}
                      placeholder="مثال: شركة الجزيرة للتجارة والنقل"
                      value={formData.corporate_name}
                      onChange={(e) => setFormData({ ...formData, corporate_name: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                {/* Financial: Opening balance, Credit limit, Discount */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-black text-slate-400 block">المعاملات المالية والائتمان</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-400 mb-1">رصيد افتتاحي (ر.ي)</label>
                      <input
                        type="number"
                        tabIndex={4}
                        placeholder="0"
                        value={formData.opening_balance}
                        onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                        className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-400 font-mono font-black text-xs text-center focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">سقف الائتمان (ر.ي)</label>
                      <input
                        type="number"
                        tabIndex={5}
                        placeholder="0"
                        value={formData.credit_limit}
                        onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                        className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs text-center focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">نسبة الخصم %</label>
                      <input
                        type="number"
                        tabIndex={6}
                        min="0"
                        max="100"
                        placeholder="0"
                        value={formData.discount_percent}
                        onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                        className="w-full h-9 px-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs text-center focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Notes */}
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">
                    ملاحظات خاصة بالعميل
                  </label>
                  <textarea
                    rows={2}
                    tabIndex={7}
                    placeholder="مثال: متعود على التشحيم عند تغيير الزيت، يفضل فحص الهواء دائماً..."
                    value={formData.customer_notes}
                    onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-200 placeholder-slate-600 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none resize-none font-medium"
                  />
                </div>
              </div>

              {/* LEFT COLUMN: VEHICLE & ENGINE (الجهة اليسرى: بيانات المركبة والمحرك) */}
              <div className="p-5 space-y-3.5 bg-slate-950/40">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                    <Car className="w-4 h-4" /> الجهة اليسرى: بيانات المركبة والتشغيل
                  </span>
                  <span className="text-[10px] text-slate-400">اللوحة والفاصل ومسافة الزيت</span>
                </div>

                {/* Yemeni Plate Selector & Colors */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">نوع اللوحة (كتابة سوداء معتمدة):</label>
                    <div className="flex items-center gap-1">
                      {plateTypes.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, plate_type: p.id })}
                          className={`px-2 py-0.5 rounded text-[10px] font-black border transition ${
                            p.bg
                          } ${p.text} ${p.border} ${
                            formData.plate_type === p.id ? 'ring-2 ring-white shadow' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Divider, Plate Number, and Category */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">الفاصل (1 أو 2)</label>
                      <input
                        type="text"
                        tabIndex={8}
                        value={formData.plate_divider}
                        onChange={(e) => setFormData({ ...formData, plate_divider: e.target.value })}
                        className="w-full h-10 bg-slate-950 border border-slate-700 text-center text-amber-400 font-mono font-black text-sm rounded-lg focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم اللوحة</label>
                      <input
                        type="text"
                        tabIndex={9}
                        placeholder="مثال: 45892"
                        value={formData.plate_number}
                        onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                        className="w-full h-10 bg-slate-950 border border-slate-700 text-center text-white font-mono font-black text-base rounded-lg focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">تصنيف المركبة</label>
                      <select
                        tabIndex={10}
                        value={formData.vehicle_category}
                        onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                        className="w-full h-10 bg-slate-950 border border-slate-700 text-white font-bold text-xs rounded-lg px-2 focus:border-amber-400 focus:outline-none cursor-pointer"
                      >
                        {vehicleCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Car Make & Model Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    تفاصيل وموديل السيارة
                  </label>
                  <input
                    type="text"
                    tabIndex={11}
                    placeholder="مثال: تويوتا لاندكروزر V8 2022"
                    value={formData.car_make_model}
                    onChange={(e) => setFormData({ ...formData, car_make_model: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Odometer & Oil Change Interval (Default 3000 km) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      العداد الحالي (كم)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        tabIndex={12}
                        placeholder="0"
                        value={formData.last_odometer}
                        onChange={(e) => setFormData({ ...formData, last_odometer: e.target.value })}
                        className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-xs focus:border-cyan-400 focus:outline-none"
                      />
                      <Gauge className="w-4 h-4 text-slate-500 absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-1">
                      مسافة غيار الزيت (كم)
                    </label>
                    <input
                      type="number"
                      tabIndex={13}
                      placeholder="3000"
                      value={formData.service_interval_km}
                      onChange={(e) => setFormData({ ...formData, service_interval_km: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-400 font-mono font-black text-xs text-center focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Preferred Oil & Viscosity */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الزيت المعتاد:</label>
                    <select
                      tabIndex={14}
                      value={formData.preferred_oil_brand}
                      onChange={(e) => setFormData({ ...formData, preferred_oil_brand: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="تويوتا">تويوتا أصلي</option>
                      <option value="كاسترول">كاسترول</option>
                      <option value="شل">شل هيلكس</option>
                      <option value="توتال">توتال كوارتز</option>
                      <option value="صقر">صقر الوطني</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اللزوجة المعتادة:</label>
                    <select
                      tabIndex={15}
                      value={formData.preferred_viscosity}
                      onChange={(e) => setFormData({ ...formData, preferred_viscosity: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="20W-50">20W-50 (معدني)</option>
                      <option value="10W-40">10W-40 (نصف تخليقي)</option>
                      <option value="5W-30">5W-30 (تخليقي بالكامل)</option>
                      <option value="5W-40">5W-40</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إلغاء [ESC]
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  الحفظ المباشر بـ [Enter]
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  tabIndex={16}
                  className="px-8 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  {submitting ? 'جاري الحفظ...' : initialVehicle ? 'حفظ التعديلات' : 'حفظ واعتماد المركبة والعميل'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ─── VARIANT 2: YEMENI PLATE CAPSULE (EXECUTIVE GLASS) ─── */}
        {activeStyle === '2' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-5 space-y-4">
            {/* Visual Yemeni License Plate Simulation (All Black Text) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest block">
                  الرخصة الرقمية الذكية
                </span>
                <h4 className="text-sm font-black text-white">لوحة المرور اليمنية المعتمدة</h4>
                <p className="text-[11px] text-slate-400">تحديث فوري للأرقام والفاصل واللون</p>
              </div>

              {/* Plate Simulation Badge */}
              <div className={`border-2 rounded-xl px-4 py-2 flex items-center gap-3 shadow-xl ${
                currentPlateMeta.bg
              } ${currentPlateMeta.text} ${currentPlateMeta.border}`}>
                <div className="text-center border-l-2 border-slate-950/40 pl-2.5">
                  <span className="text-[9px] block font-black leading-tight text-slate-950">اليَمَن</span>
                  <span className="text-[9px] font-mono font-black leading-tight uppercase text-slate-950">YEMEN</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-black text-lg tracking-wider text-slate-950">
                  <span className="bg-black/15 px-1.5 py-0.5 rounded text-slate-950">
                    {formData.plate_divider || '1'}
                  </span>
                  <span>-</span>
                  <span>{formData.plate_number || 'بدون'}</span>
                </div>
                <div className="border-r-2 border-slate-950/40 pr-2.5 text-xs font-black tracking-wider text-slate-950">
                  {formData.plate_type}
                </div>
              </div>
            </div>

            {/* Plate Type Radio Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع ترخيص اللوحة (كتابة سوداء):</label>
              <div className="grid grid-cols-4 gap-2">
                {plateTypes.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, plate_type: p.id })}
                    className={`py-2 px-2 rounded-xl text-xs font-black border transition flex items-center justify-center gap-1 ${
                      p.bg
                    } ${p.text} ${p.border} ${
                      formData.plate_type === p.id ? 'ring-2 ring-white shadow-lg scale-[1.02]' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plate Divider & Number & Category */}
            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-3">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">الفاصل</label>
                <input
                  type="text"
                  tabIndex={1}
                  value={formData.plate_divider}
                  onChange={(e) => setFormData({ ...formData, plate_divider: e.target.value })}
                  className="w-full h-10 bg-slate-950/80 border border-white/10 rounded-xl text-center text-amber-400 font-mono font-black text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="col-span-5">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم اللوحة</label>
                <input
                  type="text"
                  tabIndex={2}
                  placeholder="مثال: 45892"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  className="w-full h-10 bg-slate-950/80 border border-white/10 rounded-xl text-center text-white font-mono font-black text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">تصنيف المركبة</label>
                <select
                  tabIndex={3}
                  value={formData.vehicle_category}
                  onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                  className="w-full h-10 bg-slate-950/80 border border-white/10 rounded-xl text-white font-bold text-xs px-2 focus:border-amber-400 focus:outline-none"
                >
                  {vehicleCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer & Vehicle Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم العميل *</label>
                <input
                  ref={firstInputRef}
                  type="text"
                  tabIndex={4}
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950/80 border border-white/10 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  tabIndex={5}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950/80 border border-white/10 text-white font-mono font-bold text-xs focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Account Type & Financial */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">نوع الحساب</label>
                <select
                  tabIndex={6}
                  value={formData.customer_type}
                  onChange={(e) => handleCustomerTypeSelect(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-950/80 border border-white/10 text-white font-bold text-xs"
                >
                  <option value="individual">🚗 فردي (شخصي)</option>
                  <option value="fleet">🏢 أسطول شركات (50k)</option>
                  <option value="vip">⭐ عميل مميز VIP (10k)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1">رصيد افتتاحي</label>
                <input
                  type="number"
                  tabIndex={7}
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  className="w-full h-10 px-2 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-400 mb-1">مسافة الزيت (كم)</label>
                <input
                  type="number"
                  tabIndex={8}
                  value={formData.service_interval_km}
                  onChange={(e) => setFormData({ ...formData, service_interval_km: e.target.value })}
                  className="w-full h-10 px-2 rounded-xl bg-slate-950/80 border border-amber-500/40 text-amber-400 font-mono font-black text-xs text-center"
                />
              </div>
            </div>

            {/* Customer Notes */}
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">ملاحظات العميل الخاصة</label>
              <input
                type="text"
                tabIndex={9}
                placeholder="مثال: متعود على التشحيم عند تغيير الزيت"
                value={formData.customer_notes}
                onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-950/80 border border-white/10 text-amber-200 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
              >
                إلغاء [ESC]
              </button>
              <button
                type="submit"
                disabled={submitting}
                tabIndex={10}
                className="px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ واعتماد المركبة والعميل'}
              </button>
            </div>
          </form>
        )}

        {/* ─── VARIANT 1: TACTICAL WORKSHOP COMPACT PAD ─── */}
        {activeStyle === '1' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-4 space-y-3">
            {/* Plate and Category Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" /> اللوحة اليمنية (كتابة سوداء):
                </span>
                <div className="flex items-center gap-1">
                  {plateTypes.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, plate_type: p.id })}
                      className={`px-2 py-0.5 rounded text-[10px] font-black border transition ${
                        p.bg
                      } ${p.text} ${p.border} ${
                        formData.plate_type === p.id ? 'ring-2 ring-white shadow' : 'opacity-60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">الفاصل</label>
                  <input
                    type="text"
                    tabIndex={1}
                    value={formData.plate_divider}
                    onChange={(e) => setFormData({ ...formData, plate_divider: e.target.value })}
                    className="w-full h-9 bg-slate-900 border border-slate-700 text-center text-amber-400 font-mono font-black text-sm rounded-lg"
                  />
                </div>
                <div className="col-span-5">
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">رقم اللوحة</label>
                  <input
                    type="text"
                    tabIndex={2}
                    placeholder="مثال: 45892"
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    className="w-full h-9 bg-slate-900 border border-slate-700 text-center text-white font-mono font-black text-sm rounded-lg"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">تصنيف المركبة</label>
                  <select
                    tabIndex={3}
                    value={formData.vehicle_category}
                    onChange={(e) => setFormData({ ...formData, vehicle_category: e.target.value })}
                    className="w-full h-9 bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-lg px-2"
                  >
                    {vehicleCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Two Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Box */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-black text-emerald-400 block">👤 بيانات العميل والحساب</span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">الاسم *</label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    tabIndex={4}
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">الجوال *</label>
                    <input
                      type="tel"
                      tabIndex={5}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">الفئة</label>
                    <select
                      tabIndex={6}
                      value={formData.customer_type}
                      onChange={(e) => handleCustomerTypeSelect(e.target.value)}
                      className="w-full h-8 px-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-[11px]"
                    >
                      <option value="individual">🚗 فردي</option>
                      <option value="fleet">🏢 شركات (50k)</option>
                      <option value="vip">⭐ VIP (10k)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 mb-0.5">رصيد افتتاحي</label>
                    <input
                      type="number"
                      tabIndex={7}
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-900 border border-emerald-500/40 rounded-lg text-emerald-400 font-mono font-bold text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">سقف الائتمان</label>
                    <input
                      type="number"
                      tabIndex={8}
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-300 mb-0.5">ملاحظات العميل</label>
                  <input
                    type="text"
                    tabIndex={9}
                    placeholder="متعود على التشحيم عند تغيير الزيت..."
                    value={formData.customer_notes}
                    onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-200 text-xs"
                  />
                </div>
              </div>

              {/* Vehicle Specs Box */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-black text-cyan-400 block">⚙️ مواصفات المحرك والزيت</span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">موديل السيارة</label>
                  <input
                    type="text"
                    tabIndex={10}
                    placeholder="مثال: تويوتا هايلوكس 2022"
                    value={formData.car_make_model}
                    onChange={(e) => setFormData({ ...formData, car_make_model: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">العداد الحالي</label>
                    <input
                      type="number"
                      tabIndex={11}
                      value={formData.last_odometer}
                      onChange={(e) => setFormData({ ...formData, last_odometer: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg text-cyan-300 font-mono font-bold text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-400 mb-0.5">مسافة الزيت (كم)</label>
                    <input
                      type="number"
                      tabIndex={12}
                      placeholder="3000"
                      value={formData.service_interval_km}
                      onChange={(e) => setFormData({ ...formData, service_interval_km: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-900 border border-amber-500/40 rounded-lg text-amber-400 font-mono font-black text-xs text-center"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">الزيت المفضل</label>
                    <select
                      tabIndex={13}
                      value={formData.preferred_oil_brand}
                      onChange={(e) => setFormData({ ...formData, preferred_oil_brand: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs"
                    >
                      <option value="تويوتا">تويوتا</option>
                      <option value="كاسترول">كاسترول</option>
                      <option value="شل">شل</option>
                      <option value="توتال">توتال</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">اللزوجة</label>
                    <select
                      tabIndex={14}
                      value={formData.preferred_viscosity}
                      onChange={(e) => setFormData({ ...formData, preferred_viscosity: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                    >
                      <option value="20W-50">20W-50</option>
                      <option value="10W-40">10W-40</option>
                      <option value="5W-30">5W-30</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                إلغاء [ESC]
              </button>
              <button
                type="submit"
                disabled={submitting}
                tabIndex={15}
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ واعتماد [Enter]'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
