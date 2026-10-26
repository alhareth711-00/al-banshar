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
  Layers,
  Sparkles,
  Clock,
} from 'lucide-react';
import { getShopSettings, saveShopSettings, recordBackupDownloaded } from '../utils/settings';

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [formData, setFormData] = useState(getShopSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [settingsStyle, setSettingsStyle] = useState('tactical'); // 'tactical' (1), 'glass' (2), 'tabs' (3)
  const [activeTab, setActiveTab] = useState('identity'); // 'identity', 'operations', 'security'

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
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none">
      <div
        className={`apple-glass border border-white/20 rounded-3xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col transition-all ${
          settingsStyle === 'tabs' ? 'max-w-2xl' : 'max-w-xl'
        }`}
      >
        {/* Header Bar with Live 3-Style Switcher */}
        <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">إعدادات وهوية المركز</h3>
              <p className="text-xs text-slate-400">تخصيص الهوية وأرقام الواتساب وساعات العمل</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live 3-Variant Style Switcher */}
            <div className="flex items-center bg-slate-950 border border-amber-500/40 rounded-2xl p-1 gap-1 shadow-md">
              <button
                type="button"
                onClick={() => setSettingsStyle('tactical')}
                className={`px-2.5 py-1 rounded-xl font-black text-[11px] transition ${
                  settingsStyle === 'tactical'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="النمط التكتيكي السريع لورشة العمل"
              >
                1. تكتيكي ⚡
              </button>
              <button
                type="button"
                onClick={() => setSettingsStyle('glass')}
                className={`px-2.5 py-1 rounded-xl font-black text-[11px] transition ${
                  settingsStyle === 'glass'
                    ? 'bg-blue-500 text-white shadow-md ring-1 ring-blue-300'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="قمرة الإعدادات الزجاجية الفاخرة"
              >
                2. زجاجي 💎
              </button>
              <button
                type="button"
                onClick={() => setSettingsStyle('tabs')}
                className={`px-2.5 py-1 rounded-xl font-black text-[11px] transition ${
                  settingsStyle === 'tabs'
                    ? 'bg-purple-500 text-white shadow-md ring-1 ring-purple-300'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="كونسول الإدارة المبوب"
              >
                3. مبوب 📑
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>تم حفظ وتطبيق الإعدادات بنجاح!</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ============================================================== */}
            {/* STYLE 1: TACTICAL WORKSHOP CONTROL HUB (النمط التكتيكي) */}
            {/* ============================================================== */}
            {settingsStyle === 'tactical' && (
              <div className="space-y-3.5">
                {/* Shop Identity Card */}
                <div className="p-4 rounded-2xl bg-slate-900 border-2 border-amber-500/40 space-y-2.5 shadow-lg">
                  <div className="font-extrabold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>بيانات وهوية المركز في الفاتورة والتقارير:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">اسم المركز / المحل:</label>
                      <input
                        type="text"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">رقم هاتف المركز / خدمة العملاء:</label>
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
                    <label className="block text-slate-400 text-[11px] mb-1">العنوان والموقع الجغرافي:</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-amber-400 font-bold"
                    />
                  </div>
                </div>

                {/* WhatsApp Dispatch Numbers */}
                <div className="p-4 rounded-2xl bg-slate-900 border-2 border-emerald-500/40 space-y-2.5 shadow-lg font-mono">
                  <div className="font-extrabold text-emerald-300 font-sans flex items-center gap-1.5 text-xs">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>أرقام استلام تقارير الواتساب الفورية (Daily Dispatch):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-400 text-[11px] font-sans mb-1">واتساب مالك المركز (أساسي):</label>
                      <input
                        type="tel"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-400 font-bold focus:outline-none focus:border-emerald-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] font-sans mb-1">واتساب المشرف / الشريك (اختياري):</label>
                      <input
                        type="tel"
                        placeholder="770987654"
                        value={formData.supervisorPhone || ''}
                        onChange={(e) => setFormData({ ...formData, supervisorPhone: e.target.value })}
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-white/15 text-indigo-300 font-bold focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Hours & Modes */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-2.5 shadow-lg">
                  <div className="font-extrabold text-purple-300 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span>ساعات العمل والخدمة والورديات:</span>
                    </span>
                    <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                      {formData.enableShiftsMode ? 'نظام الورديات مفعل' : 'إغلاق يومي مباشر'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">ساعة الافتتاح:</label>
                      <select
                        value={formData.openingHour !== undefined ? formData.openingHour : 7}
                        onChange={(e) => setFormData({ ...formData, openingHour: Number(e.target.value) })}
                        className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-bold text-xs"
                      >
                        {[5, 6, 7, 8, 9, 10].map((h) => (
                          <option key={h} value={h}>{String(h).padStart(2, '0')}:00 صباحاً</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">ساعة الإغلاق:</label>
                      <select
                        value={formData.closingHour !== undefined ? formData.closingHour : 24}
                        onChange={(e) => setFormData({ ...formData, closingHour: Number(e.target.value) })}
                        className="w-full min-h-[42px] px-3 rounded-xl bg-slate-950 border border-white/15 text-white font-bold text-xs"
                      >
                        <option value={22}>10:00 مساءً</option>
                        <option value={23}>11:00 مساءً</option>
                        <option value={24}>12:00 منتصف الليل</option>
                        <option value={25}>01:00 فجراً</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-white/10 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={!!formData.enableShiftsMode}
                      onChange={(e) => setFormData({ ...formData, enableShiftsMode: e.target.checked })}
                      className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-200">
                      تفعيل نظام الورديات وتسليم العهدة النقدية بين الكاشيرات (Shift Mode)
                    </span>
                  </label>
                </div>

                {/* PIN Code & Security */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/15 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>رمز المالك السري (PIN Lock):</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">افتراضي: 1234</span>
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    value={formData.ownerPin || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setFormData({ ...formData, ownerPin: val });
                    }}
                    placeholder="1234"
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-400 font-mono text-center text-xl font-black tracking-widest focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STYLE 2: EXECUTIVE APPLE GLASS SETTINGS DECK (النمط الزجاجي) */}
            {/* ============================================================== */}
            {settingsStyle === 'glass' && (
              <div className="space-y-4">
                {/* Hero Header Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/15 via-slate-900 to-slate-950 border border-blue-500/30 flex justify-between items-center shadow-xl">
                  <div>
                    <div className="text-xs text-blue-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>الهوية البصرية والتشغيلية المعتمدة</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1">{formData.shopName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{formData.address}</div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center text-xl font-bold">
                    🏛️
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-bold">اسم المركز التجاري:</label>
                    <input
                      type="text"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                      className="w-full min-h-[46px] px-4 rounded-xl bg-slate-950/80 border border-white/10 text-white font-bold focus:outline-none focus:border-blue-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold">واتساب المالك:</label>
                      <input
                        type="tel"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                        className="w-full min-h-[46px] px-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-emerald-400 font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold">رمز الـ PIN السري:</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={formData.ownerPin || ''}
                        onChange={(e) => setFormData({ ...formData, ownerPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        className="w-full min-h-[46px] px-4 rounded-xl bg-slate-950/80 border border-amber-500/30 text-amber-400 font-mono text-center text-lg font-black tracking-widest"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STYLE 3: DUAL-TAB ENTERPRISE CONSOLE (الكونسول المبوب) */}
            {/* ============================================================== */}
            {settingsStyle === 'tabs' && (
              <div className="space-y-4">
                {/* Segmented Sub-Tabs Bar */}
                <div className="grid grid-cols-3 bg-slate-950 p-1.5 rounded-2xl border border-white/10 gap-1 text-center font-bold text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('identity')}
                    className={`py-2 rounded-xl transition ${
                      activeTab === 'identity'
                        ? 'bg-purple-500 text-white shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🏪 هوية المركز والواتساب
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('operations')}
                    className={`py-2 rounded-xl transition ${
                      activeTab === 'operations'
                        ? 'bg-purple-500 text-white shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⏱️ ساعات العمل والورديات
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('security')}
                    className={`py-2 rounded-xl transition ${
                      activeTab === 'security'
                        ? 'bg-purple-500 text-white shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🛡️ الأمان والنسخ الاحتياطي
                  </button>
                </div>

                {/* Sub-Tab 1: Identity */}
                {activeTab === 'identity' && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">اسم المركز في الفاتورة:</label>
                        <input
                          type="text"
                          value={formData.shopName}
                          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">رقم هاتف المحل:</label>
                        <input
                          type="tel"
                          value={formData.shopPhone}
                          onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                      <div>
                        <label className="block text-slate-400 font-sans mb-1">رقم واتساب المالك:</label>
                        <input
                          type="tel"
                          value={formData.ownerPhone}
                          onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-sans mb-1">واتساب المشرف (اختياري):</label>
                        <input
                          type="tel"
                          value={formData.supervisorPhone || ''}
                          onChange={(e) => setFormData({ ...formData, supervisorPhone: e.target.value })}
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-indigo-300 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Operations */}
                {activeTab === 'operations' && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">ساعة الافتتاح:</label>
                        <select
                          value={formData.openingHour !== undefined ? formData.openingHour : 7}
                          onChange={(e) => setFormData({ ...formData, openingHour: Number(e.target.value) })}
                          className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-bold"
                        >
                          {[5, 6, 7, 8, 9, 10].map((h) => (
                            <option key={h} value={h}>{String(h).padStart(2, '0')}:00 صباحاً</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">ساعة الإغلاق:</label>
                        <select
                          value={formData.closingHour !== undefined ? formData.closingHour : 24}
                          onChange={(e) => setFormData({ ...formData, closingHour: Number(e.target.value) })}
                          className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-bold"
                        >
                          <option value={22}>10:00 مساءً</option>
                          <option value={23}>11:00 مساءً</option>
                          <option value={24}>12:00 منتصف الليل</option>
                          <option value={25}>01:00 فجراً</option>
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.enableShiftsMode}
                        onChange={(e) => setFormData({ ...formData, enableShiftsMode: e.target.checked })}
                        className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white">تفعيل نظام الورديات وتسليم العهدة</span>
                    </label>
                  </div>
                )}

                {/* Sub-Tab 3: Security & Backup */}
                {activeTab === 'security' && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                    <div>
                      <label className="block text-slate-400 mb-1">رمز المالك السري (PIN Lock):</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={formData.ownerPin || ''}
                        onChange={(e) => setFormData({ ...formData, ownerPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="1234"
                        className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-amber-400 font-mono text-center text-xl font-black tracking-widest"
                        required
                      />
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">لقطة فورية لقاعدة البيانات:</div>
                        <div className="text-[10px] text-slate-400">حفظ نسخة احتياطية محلية آمنة</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateSnapshotNow}
                        disabled={isCreatingSnapshot}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                      >
                        {isCreatingSnapshot ? 'جاري الحفظ...' : 'أخذ نسخة الآن 💾'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Submit Action */}
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
                className={`flex-1 min-h-[48px] rounded-2xl font-black text-xs shadow-xl transition active:scale-95 flex items-center justify-center gap-2 ${
                  settingsStyle === 'tactical'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                    : settingsStyle === 'glass'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-blue-500/25'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/25'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>حفظ وتطبيق الإعدادات فوراً</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
