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
} from 'lucide-react';
import { getShopSettings, saveShopSettings, recordBackupDownloaded } from '../utils/settings';

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
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">إعدادات وهوية المركز</h3>
              <p className="text-xs text-slate-400">تخصيص اسم المحل وأرقام الواتساب للرسائل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>تم حفظ الإعدادات بنجاح!</span>
            </div>
          )}

          {/* Shop Name */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>اسم المركز / المحل (يظهر بالرسائل والكرت):</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm font-bold focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Shop Phone */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>رقم هاتف المركز / خدمة العملاء:</span>
            </label>
            <input
              type="tel"
              value={formData.shopPhone}
              onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Owner WhatsApp Phone */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>رقم واتساب مالك المركز (لاستلام تقرير الإغلاق اليومي):</span>
            </label>
            <input
              type="tel"
              value={formData.ownerPhone}
              onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* Supervisor / Partner WhatsApp Phone (Upgrade 2) */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>رقم واتساب المشرف العام / الشريك (اختياري):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">استلام نسخة التقرير</span>
            </label>
            <input
              type="tel"
              placeholder="مثال: 777987654 (اختياري)"
              value={formData.supervisorPhone || ''}
              onChange={(e) => setFormData({ ...formData, supervisorPhone: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-sm font-bold focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Operating Hours for Peak Heatmap (Upgrade 5 Adjustment) */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10">
            <div>
              <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                ساعة بدء العمل اليومي:
              </label>
              <select
                value={formData.openingHour !== undefined ? formData.openingHour : 7}
                onChange={(e) => setFormData({ ...formData, openingHour: Number(e.target.value) })}
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              >
                {[5, 6, 7, 8, 9, 10].map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00 صباحاً
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                ساعة إغلاق المركز اليومي:
              </label>
              <select
                value={formData.closingHour !== undefined ? formData.closingHour : 24}
                onChange={(e) => setFormData({ ...formData, closingHour: Number(e.target.value) })}
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
              >
                <option value={22}>10:00 مساءً</option>
                <option value={23}>11:00 مساءً</option>
                <option value={24}>12:00 منتصف الليل (مساءً)</option>
                <option value={25}>01:00 فجراً (بعد منتصف الليل)</option>
                <option value={26}>02:00 فجراً</option>
              </select>
            </div>
          </div>

          {/* Default Next Service Duration in Months */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-extrabold flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span>المدة الافتراضية لموعد غيار الزيت القادم:</span>
              </label>
              <span className="text-[10px] text-teal-300 font-mono bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-500/30">
                افتراضي: 2 أشهر
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              المدة التلقائية المقترحة التي تظهر في شاشة البيع لزيارة العميل القادمة، ويمكن للكاشير تعديل تاريخ اليوم أو الشهر في أي فاتورة بحرية.
            </p>
            <select
              value={formData.defaultServiceIntervalMonths !== undefined ? formData.defaultServiceIntervalMonths : 2}
              onChange={(e) => setFormData({ ...formData, defaultServiceIntervalMonths: Number(e.target.value) })}
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              <option value={1}>شهر واحد (30 يوماً)</option>
              <option value={2}>شهران (60 يوماً - الموصى به لمعظم السيارات)</option>
              <option value={3}>3 أشهر (90 يوماً)</option>
              <option value={4}>4 أشهر (120 يوماً)</option>
              <option value={6}>6 أشهر (180 يوماً)</option>
            </select>
          </div>

          {/* Owner PIN Protection (الجزء الأول) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-extrabold flex items-center gap-1.5 text-xs">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>رمز المالك السري (PIN Lock):</span>
              </label>
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
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-950 border border-white/20 text-amber-400 font-mono text-center text-lg font-black tracking-widest focus:outline-none focus:border-amber-400 shadow-inner"
              required
            />

            {/* Auto-Lock Inactivity Setting (المقترح 1) */}
            <div className="pt-2 border-t border-amber-500/20">
              <label className="block text-slate-300 font-bold mb-1.5 text-[11px] flex items-center justify-between">
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

          {/* Shop Address */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>العنوان / المدينة:</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Shifts Mode Toggle */}
          <div className="pt-2 border-t border-white/10">
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/30 cursor-pointer transition">
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
          </div>

          {/* Training / Demo Mode Toggle (الجزء الثالث) */}
          <div className="pt-2 border-t border-white/10">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 hover:border-amber-400/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={!!formData.demoMode}
                onChange={(e) => setFormData({ ...formData, demoMode: e.target.checked })}
                className="w-4 h-4 mt-1 rounded accent-amber-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span>تفعيل وضع التدريب وتجربة البيع (Demo Mode)</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  عند تفعيله، يظهر شريط تدريبي برتقالي في نقطة البيع POS مع نماذج لـ 4 سيارات لتجربة البيع وتدريب العمال الجدد دون التأثير على حسابات المحل الحقيقية.
                </div>
              </div>
            </label>
          </div>

          {/* Database Backup & Security Section (الجزء الرابع: درع الأمان وتنبيه 7 أيام) */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Database className="w-4 h-4 text-amber-400" />
                <span>درع الأمان والنسخ الاحتياطي التلقائي:</span>
              </div>
              {backupStatus && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                  backupStatus.isStale
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {backupStatus.isStale ? '⚠️ يتطلب نسخة' : '✅ الدرع نشط'}
                </span>
              )}
            </div>

            {/* Backup Sentinel Status Card */}
            {backupStatus && (
              <div className={`p-3 rounded-2xl text-xs border ${
                backupStatus.isStale
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {backupStatus.isStale ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                    <span>
                      {backupStatus.isStale
                        ? 'تنبيه: لم يتم حفظ نسخة احتياطية منذ أكثر من 7 أيام!'
                        : 'النسخ الاحتياطي محمي ومحدث بانتظام'}
                    </span>
                  </span>
                  <span className="font-mono text-[11px]">
                    {backupStatus.hasBackup
                      ? `قبل ${backupStatus.daysAgo} أيام (${backupStatus.lastBackupDate})`
                      : 'لا توجد نسخة سابقة'}
                  </span>
                </div>
                {backupStatus.isStale && (
                  <p className="text-[11px] text-rose-300/80 mt-1 leading-relaxed">
                    لحماية بيانات وسجلات المحل من أي تلف مفاجئ، يُوصى بتنزيل نسخة خارجية على فلاش ديسك أو هاتف أسبوعياً على الأقل.
                  </p>
                )}
              </div>
            )}

            {snapshotSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                {snapshotSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="/api/backup"
                download
                onClick={() => {
                  recordBackupDownloaded();
                  setTimeout(() => fetchBackupStatus(), 1000);
                }}
                className="min-h-[46px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
                title="تنزيل ملف SQLite مباشرة إلى جهازك"
              >
                <span>💾 تنزيل نسخة للملفات</span>
              </a>

              <button
                type="button"
                onClick={handleCreateSnapshotNow}
                disabled={isCreatingSnapshot}
                className="min-h-[46px] px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                title="إنشاء لقطة فورية وحفظها في مجلد النسخ الاحتياطية"
              >
                {isCreatingSnapshot ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>⚡ لقطة فورية بالخادم</span>
                )}
              </button>
            </div>
          </div>

          {/* Factory Reset Section (الجزء الثالث - زر التصفير في الإعدادات) */}
          <div className="pt-3 border-t-2 border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-400 font-extrabold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>تجهيز وتسليم النظام لمحل جديد (تصفير البيانات):</span>
              </div>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/40 font-mono">
                محمي بـ PIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تفريغ فوري لكافة الفواتير، المشتريات، الديون، وسجل السيارات لتسليم النظام نظيفاً لأي عميل بنقرة واحدة، مع خيار الإبقاء على كتالوج الأصناف والأسعار.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowResetModal(true);
                setResetError('');
                setResetPin('');
                setResetWord('');
                setResetSuccessNotice('');
              }}
              className="w-full min-h-[46px] px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition active:scale-95 border border-rose-400/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>⚠️ تصفير البيانات وتجهيز النظام للتسليم...</span>
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[46px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>

      {/* FACTORY RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="apple-glass border-2 border-rose-500/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl bg-slate-950 text-right">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-950 border-b border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-500/30">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">تأكيد تصفير النظام وتجهيزه لمحل جديد</h4>
                  <p className="text-[11px] text-rose-300">إجراء أمني حساس محمي برمز المالك والنسخ التلقائي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              {resetSuccessNotice ? (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <div className="text-sm font-black">{resetSuccessNotice}</div>
                  <div className="text-[11px] text-slate-300">جاري إعادة تحميل النظام لبدء العمل النظيف...</div>
                </div>
              ) : (
                <>
                  {/* Safety Backup Guarantee */}
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-[11px]">
                    <span className="text-base">🛡️</span>
                    <span>
                      <strong>أمان مضمون:</strong> سيقوم النظام تلقائياً بأخذ لقطة احتياطية كاملة لقاعدة البيانات الحالية قبل تنفيذ المسح مباشرة لحمايتك من أي خطأ.
                    </span>
                  </div>

                  {/* Reset Mode Radio Selector */}
                  <div className="space-y-2">
                    <label className="block text-slate-200 font-bold text-xs">حدد نمط التصفير المطلوب:</label>
                    <div className="grid grid-cols-1 gap-2">
                      <label
                        className={`p-3 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                          resetMode === 'preserve_catalog'
                            ? 'bg-amber-500/15 border-amber-500/50 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resetMode"
                          checked={resetMode === 'preserve_catalog'}
                          onChange={() => setResetMode('preserve_catalog')}
                          className="mt-1 accent-amber-500"
                        />
                        <div>
                          <div className="font-extrabold text-xs text-amber-300 flex items-center gap-2">
                            <span>الخيار الأول: تصفير العمليات والاحتفاظ بكتالوج الأصناف والأسعار</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-500/30">موصى به عند التسليم</span>
                          </div>
                          <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            يمسح جميع الفواتير، الديون، المشتريات، الصندوق، وسجل السيارات، ويصفر كميات المخزون إلى 0، <strong>مع الإبقاء على قائمة الزيوت والفلاتر والأسعار جاهزة</strong> ليبدأ صاحب البنشر الجديد العمل فوراً دون تعب إدخال الأصناف.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                          resetMode === 'full_wipe'
                            ? 'bg-rose-500/15 border-rose-500/50 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resetMode"
                          checked={resetMode === 'full_wipe'}
                          onChange={() => setResetMode('full_wipe')}
                          className="mt-1 accent-rose-500"
                        />
                        <div>
                          <div className="font-extrabold text-xs text-rose-300">الخيار الثاني: مسح شامل وكامل (صفحة بيضاء فارغة)</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            مسح كامل وشامل لكل شيء بما في ذلك أصناف المخزون للبدء من الصفر المطلق.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Required PIN & Confirmation Word */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
                        1. رمز المالك السري (PIN):
                      </label>
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
                      <label className="block text-slate-300 font-bold mb-1 text-xs">
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

                  {/* Error Toast */}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
