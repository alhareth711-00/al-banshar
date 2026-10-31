import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Store,
  Phone,
  Smartphone,
  MapPin,
  Check,
  Lock,
  KeyRound,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  Database,
  ShieldCheck,
  Calendar,
  Clock,
  Layers,
  Droplets,
} from 'lucide-react';
import {
  getShopSettings,
  saveShopSettings,
  recordBackupDownloaded,
  getCustomOilBrands,
  saveCustomOilBrands,
  getOilVolumePresets,
  saveOilVolumePresets,
  getCustomViscosities,
  saveCustomViscosities,
} from '../utils/settings';

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [formData, setFormData] = useState(getShopSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Backup Sentinel State (الجزء الرابع: درع الأمان وتنبيه 7 أيام)
  const [backupStatus, setBackupStatus] = useState(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState('');

  // Factory Reset Confirmation State (الجزء الثالث)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState('preserve_catalog'); // 'preserve_catalog' | 'full_wipe'
  const [resetPin, setResetPin] = useState('');
  const [resetWord, setResetWord] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessNotice, setResetSuccessNotice] = useState('');

  // Dynamic Oil Brands, Viscosities, and Volume Presets State
  const [brandsList, setBrandsList] = useState(getCustomOilBrands());
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandColor, setNewBrandColor] = useState('#f59e0b');

  const [viscsList, setViscsList] = useState(getCustomViscosities());
  const [newViscName, setNewViscName] = useState('');

  const [volPresets, setVolPresets] = useState(getOilVolumePresets());
  const [newVolPreset, setNewVolPreset] = useState('');

  const handleAddBrand = () => {
    if (!newBrandName.trim()) return;
    const name = newBrandName.trim();
    if (brandsList.some((b) => b.id.toLowerCase() === name.toLowerCase())) return;
    const updated = [...brandsList, { id: name, name, color: newBrandColor || '#f59e0b' }];
    setBrandsList(updated);
    saveCustomOilBrands(updated);
    setNewBrandName('');
  };

  const handleRemoveBrand = (brandId) => {
    const updated = brandsList.filter((b) => b.id !== brandId);
    setBrandsList(updated);
    saveCustomOilBrands(updated);
  };

  const handleAddViscosity = () => {
    if (!newViscName.trim()) return;
    const v = newViscName.trim();
    if (viscsList.includes(v)) return;
    const updated = [...viscsList, v];
    setViscsList(updated);
    saveCustomViscosities(updated);
    setNewViscName('');
  };

  const handleRemoveViscosity = (v) => {
    const updated = viscsList.filter((item) => item !== v);
    setViscsList(updated);
    saveCustomViscosities(updated);
  };

  const handleAddVolPreset = () => {
    const val = parseFloat(newVolPreset);
    if (isNaN(val) || val <= 0 || volPresets.includes(val)) return;
    const updated = [...volPresets, val].sort((a, b) => a - b);
    setVolPresets(updated);
    saveOilVolumePresets(updated);
    setNewVolPreset('');
  };

  const handleRemoveVolPreset = (val) => {
    const updated = volPresets.filter((v) => v !== val);
    setVolPresets(updated);
    saveOilVolumePresets(updated);
  };

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch('/api/backup/status');
      const data = await res.json();
      if (data.success) {
        setBackupStatus(data.data);
      }
    } catch (e) {
      console.error('Error fetching backup status:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFormData(getShopSettings());
      setBrandsList(getCustomOilBrands());
      setViscsList(getCustomViscosities());
      setVolPresets(getOilVolumePresets());
      setSavedSuccess(false);
      fetchBackupStatus();
    }
  }, [isOpen]);

  const handleCreateSnapshotNow = async () => {
    try {
      setIsCreatingSnapshot(true);
      setSnapshotSuccess('');
      const res = await fetch('/api/backup/create-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'manual_user_snapshot' }),
      });
      const data = await res.json();
      if (data.success) {
        recordBackupDownloaded();
        fetchBackupStatus();
        setSnapshotSuccess('تم إنشاء لقطة فورية وحفظها بنجاح ✅');
        setTimeout(() => setSnapshotSuccess(''), 3000);
      }
    } catch (e) {
      console.error('Error creating snapshot:', e);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    saveShopSettings(formData);
    setSavedSuccess(true);
    if (onSettingsUpdated) onSettingsUpdated(formData);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="apple-glass border-2 border-amber-500/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header Bar - NATIVE TACTICAL WORKSHOP CONTROL HUB */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base">إعدادات وهوية المركز</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 font-mono">
                  تحكم تكتيكي شامل
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصيص الهوية الرسمية، أرقام الواتساب، ساعات العمل، والأمان والنسخ الاحتياطي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
              <Check className="w-5 h-5 stroke-[3] text-emerald-400" />
              <span>تم حفظ وتطبيق كافة إعدادات النظام وهوية المركز بنجاح!</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. SHOP IDENTITY & LOCATION CONTAINER */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-amber-500/40 space-y-3 shadow-lg">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5 text-xs border-b border-white/10 pb-2">
                <Store className="w-4 h-4 text-amber-400" />
                <span>1. هوية المركز والبيانات الرسمية (تظهر بالفاتورة والرسائل):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>اسم المركز / المحل:</span>
                  </label>
                  <input
                    type="text"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>رقم هاتف المركز / خدمة العملاء:</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.shopPhone}
                    onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  <span>العنوان والموقع الجغرافي (يظهر أسفل الفاتورة):</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: صنعاء - شارع الستين الجنوبي"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* 2. WHATSAPP REPORT DISPATCH NUMBERS CONTAINER */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 space-y-3 shadow-lg">
              <div className="font-extrabold text-emerald-300 flex items-center gap-1.5 text-xs border-b border-white/10 pb-2 font-sans">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>2. أرقام استلام تقارير الإغلاق اليومي الفورية (عبر الواتساب):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] font-sans mb-1 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>رقم واتساب المالك (أساسي):</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-400 font-bold focus:outline-none focus:border-emerald-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold text-[11px] font-sans mb-1 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>واتساب المشرف / الشريك (اختياري):</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="مثال: 770987654"
                    value={formData.supervisorPhone || ''}
                    onChange={(e) => setFormData({ ...formData, supervisorPhone: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-indigo-300 font-bold focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* 3. OPERATING HOURS & SERVICE TIMELINE CONTAINER */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-purple-500/40 space-y-3 shadow-lg">
              <div className="font-extrabold text-purple-300 flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>3. ساعات العمل وحساب خريطة الذروة وموعد الخدمة:</span>
                </span>
                <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                  {formData.enableShiftsMode ? 'الورديات مفعلة' : 'إغلاق يومي'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">ساعة بدء العمل اليومي:</label>
                  <select
                    value={formData.openingHour !== undefined ? formData.openingHour : 7}
                    onChange={(e) => setFormData({ ...formData, openingHour: Number(e.target.value) })}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-purple-400"
                  >
                    {[5, 6, 7, 8, 9, 10].map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00 صباحاً</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">ساعة إغلاق المركز اليومي:</label>
                  <select
                    value={formData.closingHour !== undefined ? formData.closingHour : 24}
                    onChange={(e) => setFormData({ ...formData, closingHour: Number(e.target.value) })}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value={22}>10:00 مساءً</option>
                    <option value={23}>11:00 مساءً</option>
                    <option value={24}>12:00 منتصف الليل (مساءً)</option>
                    <option value={25}>01:00 فجراً (بعد منتصف الليل)</option>
                    <option value={26}>02:00 فجراً</option>
                  </select>
                </div>
              </div>

              {/* Service Interval in Months */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>المدة الافتراضية لموعد غيار الزيت القادم:</span>
                  </label>
                  <span className="text-[10px] text-teal-300 font-mono bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-500/30">
                    افتراضي: 2 أشهر
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  المدة التلقائية المقترحة التي تظهر في شاشة البيع لزيارة العميل القادمة، ويمكن تعديل التاريخ في أي فاتورة بحرية.
                </p>
                <select
                  value={formData.defaultServiceIntervalMonths !== undefined ? formData.defaultServiceIntervalMonths : 2}
                  onChange={(e) => setFormData({ ...formData, defaultServiceIntervalMonths: Number(e.target.value) })}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-teal-400"
                >
                  <option value={1}>شهر واحد (30 يوماً)</option>
                  <option value={2}>شهران (60 يوماً - الموصى به لمعظم السيارات)</option>
                  <option value={3}>3 أشهر (90 يوماً)</option>
                  <option value={4}>4 أشهر (120 يوماً)</option>
                  <option value={6}>6 أشهر (180 يوماً)</option>
                </select>
              </div>
            </div>

            {/* 4. SECURITY & PIN LOCK CONTAINER */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-amber-500/30 space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>4. رمز المالك السري والحماية (Owner PIN Protection):</span>
                </span>
                <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  افتراضي: 1234
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                رمز أمان مكون من 4 أرقام لحماية الأرباح، شاشة الخزينة، وتعديل أسعار وكميات المخزون.
              </p>
              <input
                type="password"
                maxLength={4}
                value={formData.ownerPin || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setFormData({ ...formData, ownerPin: val });
                }}
                placeholder="1234"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-950 border border-white/20 text-amber-400 font-mono text-center text-xl font-black tracking-widest focus:outline-none focus:border-amber-400 shadow-inner"
                required
              />

              {/* Inactivity Auto-Lock Duration */}
              <div className="pt-2 border-t border-white/5 space-y-1">
                <label className="block text-slate-300 font-bold text-[11px] flex items-center justify-between">
                  <span>⏱️ مدة القفل التلقائي لوضع المدير عند عدم النشاط:</span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    {formData.autoLockMinutes === 0 ? 'معطل' : `${formData.autoLockMinutes || 3} دقائق`}
                  </span>
                </label>
                <select
                  value={formData.autoLockMinutes !== undefined ? formData.autoLockMinutes : 3}
                  onChange={(e) => setFormData({ ...formData, autoLockMinutes: Number(e.target.value) })}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value={1}>دقيقة واحدة (أعلى درجات الحماية)</option>
                  <option value={2}>دقيقتان</option>
                  <option value={3}>3 دقائق (موصى به لمحلات الخدمة السريعة)</option>
                  <option value={5}>5 دقائق</option>
                  <option value={10}>10 دقائق</option>
                  <option value={0}>تعطيل القفل التلقائي</option>
                </select>
              </div>
            </div>

            {/* 5. OPERATIONAL MODES (SHIFTS & TRAINING) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-white/15 space-y-3 shadow-lg">
              <div className="font-extrabold text-white flex items-center gap-1.5 text-xs border-b border-white/10 pb-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>5. أوضاع التشغيل الإضافية (الورديات والتدريب):</span>
              </div>

              {/* Shift Mode Toggle */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-white/10 hover:border-amber-500/30 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={!!formData.enableShiftsMode}
                  onChange={(e) => setFormData({ ...formData, enableShiftsMode: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded accent-amber-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>تفعيل نظام الورديات وتسليم الصندوق (Shift Mode)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">اختياري</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    معطل افتراضياً للعمل بالإغلاق المالي اليومي المباشر. عند التفعيل، يتيح فتح وإغلاق الورديات واحتساب العجز/الفائض ومحضر التسليم.
                  </div>
                </div>
              </label>

              {/* Demo / Training Mode Toggle */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-amber-500/30 hover:border-amber-400/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={!!formData.demoMode}
                  onChange={(e) => setFormData({ ...formData, demoMode: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded accent-amber-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <span>تفعيل وضع التدريب وتجربة البيع (Demo Mode)</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    عند تفعيله، يظهر شريط تدريبي في نقطة البيع POS مع 4 سيارات وهمية لتجربة البيع وتدريب العمال الجدد دون التأثير على الحسابات الحقيقية.
                  </div>
                </div>
              </label>
            </div>

            {/* 6. DYNAMIC OIL BRANDS, VISCOSITIES & VOLUME PRESETS */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-amber-500/40 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                  <Droplets className="w-4 h-4 text-amber-400" />
                  <span>6. إدارة ماركات الزيوت ودرجات اللزوجة وكميات البيع السريعة:</span>
                </div>
                <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                  تحديث لحظي
                </span>
              </div>

              {/* A. Oil Brands */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>🛢️ ماركات الزيوت المعتمدة في النظام ({brandsList.length} ماركة):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1.5 bg-slate-950 rounded-xl border border-white/5">
                  {brandsList.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-slate-200"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color || '#f59e0b' }} />
                      <span>{b.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBrand(b.id)}
                        className="text-slate-500 hover:text-rose-400 mr-1 text-xs"
                        title="حذف الماركة"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="اسم ماركة زيت جديدة (مثلاً: مانول، موبيل)..."
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="color"
                    value={newBrandColor}
                    onChange={(e) => setNewBrandColor(e.target.value)}
                    className="w-10 h-[38px] rounded-xl bg-slate-950 border border-white/15 cursor-pointer p-0.5"
                    title="لون شارة الماركة"
                  />
                  <button
                    type="button"
                    onClick={handleAddBrand}
                    className="min-h-[38px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95"
                  >
                    ➕ إضافة ماركة
                  </button>
                </div>
              </div>

              {/* B. Dynamic Viscosities */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>درجات اللزوجة المعتمدة في النظام ({viscsList.length} لزوجة):</span>
                  <span className="text-[10px] text-teal-400 font-mono">تتضمن زيوت الصباحة</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1.5 bg-slate-950 rounded-xl border border-white/5">
                  {viscsList.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-teal-500/30 text-xs font-mono font-bold text-teal-300"
                    >
                      <span>{v}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveViscosity(v)}
                        className="text-slate-500 hover:text-rose-400 mr-1 text-xs"
                        title="حذف اللزوجة"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="أدخل درجة لزوجة جديدة (مثلاً: 5W-40 أو 15W-50)..."
                    value={newViscName}
                    onChange={(e) => setNewViscName(e.target.value)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold focus:outline-none focus:border-teal-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddViscosity}
                    className="min-h-[38px] px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition active:scale-95"
                  >
                    ➕ إضافة لزوجة
                  </button>
                </div>
              </div>

              {/* C. General Volume Presets */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>اختصارات كميات الزيوت العامة بالكاشير (باللتر):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-950 rounded-xl border border-white/5">
                  {volPresets.map((qty) => (
                    <span
                      key={qty}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-xs font-mono font-black text-amber-300"
                    >
                      <span>{qty}L</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVolPreset(qty)}
                        className="text-slate-500 hover:text-rose-400 mr-1 text-xs"
                        title="حذف الاختصار"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="أدخل كمية باللتر (مثلاً: 7 أو 2.5)..."
                    value={newVolPreset}
                    onChange={(e) => setNewVolPreset(e.target.value)}
                    className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddVolPreset}
                    className="min-h-[38px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95"
                  >
                    ➕ إضافة كمية
                  </button>
                </div>
              </div>
            </div>

            {/* 7. DATABASE BACKUP SENTINEL (درع الأمان وتنبيه 7 أيام) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-blue-500/30 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-300">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span>6. درع الأمان والنسخ الاحتياطي التلقائي لقاعدة البيانات:</span>
                </div>
                {backupStatus && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                      backupStatus.isStale
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {backupStatus.isStale ? 'تنبيه: النسخة قديمة (>7 أيام)' : 'البيانات محمية ومحدثة ✓'}
                  </span>
                )}
              </div>

              {backupStatus && (
                <div className="p-3 bg-slate-950 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="text-slate-300 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>آخر لقطة محفوظة:</span>
                      <b className="text-white font-mono">{backupStatus.lastBackupAt ? new Date(backupStatus.lastBackupAt).toLocaleString('ar-YE') : 'لم تُؤخذ بعد'}</b>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      الملف: {backupStatus.backupFilePath || 'data/al_banshar.db'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateSnapshotNow}
                    disabled={isCreatingSnapshot}
                    className="min-h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    {isCreatingSnapshot ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>أخذ لقطة فورية لقاعدة البيانات 💾</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {snapshotSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{snapshotSuccess}</span>
                </div>
              )}
            </div>

            {/* 7. DANGER ZONE & FACTORY RESET */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <div className="font-extrabold text-rose-300 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>7. منطقة الخطر وإعادة تهيئة النظام (Factory Reset):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition"
                >
                  فتح معالج التصفير ⚠️
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                يتيح تصفير فواتير التجربة وتجهيز النظام للافتتاح الحقيقي، مع خيار الحفاظ على كتالوج وأصناف المخزن أو تصفير شامل. محمي بكلمة تأكيد صريحة ورمز PIN.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[48px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>حفظ وتطبيق كافة الإعدادات فوراً ⚡</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* FACTORY RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="apple-glass border-2 border-rose-500/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-black text-rose-400 text-base">إعادة تهيئة وتصفير النظام</h4>
                <p className="text-[11px] text-slate-400">حذف فواتير التجربة وتجهيز النظام للافتتاح</p>
              </div>
            </div>

            {resetSuccessNotice ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-extrabold text-sm">{resetSuccessNotice}</div>
                <div className="text-xs text-slate-300">جاري إعادة تشغيل النظام لتطبيق التهيئة...</div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                {/* Reset Mode Choice */}
                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold text-[11px]">اختر نمط التهيئة المطلوب:</label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      resetMode === 'preserve_catalog'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="resetMode"
                        checked={resetMode === 'preserve_catalog'}
                        onChange={() => setResetMode('preserve_catalog')}
                        className="mt-0.5 accent-amber-500"
                      />
                      <div>
                        <div className="font-bold text-white text-xs">الحفاظ على كتالوج وأسماء الأصناف (الموصى به)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          تصفير الفواتير، المصاريف، وسندات القبض، مع تصفير رصيد الكميات والاحتفاظ بأسماء وأسعار الزيوت والفلاتر.
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      resetMode === 'full_wipe'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="resetMode"
                        checked={resetMode === 'full_wipe'}
                        onChange={() => setResetMode('full_wipe')}
                        className="mt-0.5 accent-rose-500"
                      />
                      <div>
                        <div className="font-bold text-white text-xs">تصفير شامل للبيانات (Full Wipe)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          حذف كامل لجميع الفواتير والمخزون وحركات الصندوق والديون للبدء من نقطة الصفر المطلق.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Verification PIN & Word */}
                <div className="space-y-2.5 p-3.5 bg-slate-950 rounded-2xl border border-white/10">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-[11px]">1. أدخل رمز المالك السري (PIN):</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="أدخل رمز الـ PIN"
                      value={resetPin}
                      onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/20 text-amber-400 font-mono text-center text-base font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                      2. اكتب كلمة <span className="text-rose-400 underline font-black">"تصفير"</span> للتأكيد:
                    </label>
                    <input
                      type="text"
                      placeholder='اكتب: تصفير'
                      value={resetWord}
                      onChange={(e) => setResetWord(e.target.value.trim())}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-300 text-center text-sm font-black focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    disabled={isResetting}
                    className="flex-1 min-h-[46px] rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold"
                  >
                    تراجع وإلغاء
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setResetError('');
                      const targetPin = String(formData.ownerPin || '1234').trim();
                      if (resetPin.trim() !== targetPin) {
                        setResetError('رمز المالك السري (PIN) غير صحيح!');
                        return;
                      }
                      if (resetWord.trim() !== 'تصفير') {
                        setResetError('يرجى كتابة كلمة "تصفير" للتأكيد!');
                        return;
                      }

                      try {
                        setIsResetting(true);
                        const res = await fetch('/api/system/factory-reset', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mode: resetMode,
                            confirmation_word: 'تصفير',
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                          throw new Error(data.message || 'فشلت عملية تصفير البيانات');
                        }
                        setResetSuccessNotice(data.message);
                        setTimeout(() => {
                          window.location.reload();
                        }, 2500);
                      } catch (err) {
                        setResetError(err.message || 'حدث خطأ أثناء تصفير النظام');
                      } finally {
                        setIsResetting(false);
                      }
                    }}
                    disabled={isResetting || resetWord !== 'تصفير'}
                    className="flex-1 min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    {isResetting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري التصفير الآمن...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>تأكيد التصفير والتجهيز النهائي</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
