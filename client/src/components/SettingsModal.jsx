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
  Upload,
  Download,
  FileUp,
  FileCheck,
  History,
  Copy,
  ExternalLink,
  Printer,
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

  // Backup Restore State (استيراد واستعادة قاعدة البيانات)
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreValidation, setRestoreValidation] = useState(null);
  const [isValidatingRestore, setIsValidatingRestore] = useState(false);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [restoreConfirmWord, setRestoreConfirmWord] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccessNotice, setRestoreSuccessNotice] = useState('');
  const [localBackupsList, setLocalBackupsList] = useState([]);
  const [selectedLocalBackup, setSelectedLocalBackup] = useState('');
  const [restoreSourceTab, setRestoreSourceTab] = useState('upload'); // 'upload' | 'local'

  // Factory Reset Confirmation State (الجزء الثالث)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState('preserve_catalog'); // 'preserve_catalog' | 'full_wipe'
  const [resetPin, setResetPin] = useState('');
  const [resetWord, setResetWord] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessNotice, setResetSuccessNotice] = useState('');

  // License & Subscription State (نظام التراخيص والاشتراك السنوي)
  const [licenseData, setLicenseData] = useState(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);
  const [licenseFeedback, setLicenseFeedback] = useState({ text: '', type: '' });
  const [copiedMidSettings, setCopiedMidSettings] = useState(false);

  // Software Hot-Patch Updater State (تحديث وترقية النظام)
  const [systemVersion, setSystemVersion] = useState({ version: '1.0.0', releaseDate: '', channel: 'stable' });
  const [updateFile, setUpdateFile] = useState(null);
  const [updateConfirmWord, setUpdateConfirmWord] = useState('');
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState({ text: '', type: '' });

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

  const fetchLocalBackupsList = async () => {
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (data.success) {
        setLocalBackupsList(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching backups list:', e);
    }
  };

  const fetchLicenseData = async () => {
    try {
      const res = await fetch('/api/system/license/status');
      const data = await res.json();
      if (data.success) {
        setLicenseData(data.data);
      }
    } catch (e) {
      console.error('Error fetching license status:', e);
    }
  };

  const fetchSystemVersion = async () => {
    try {
      const res = await fetch('/api/system/version');
      const data = await res.json();
      if (data.success && data.data) {
        setSystemVersion(data.data);
      }
    } catch (e) {
      console.error('Error fetching system version:', e);
    }
  };

  const handleApplySoftwareUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!updateFile) {
      setUpdateFeedback({ text: 'يرجى اختيار ملف التحديث (.zip) أولاً', type: 'error' });
      return;
    }
    if (updateConfirmWord.trim() !== 'تحديث') {
      setUpdateFeedback({ text: 'يرجى كتابة كلمة "تحديث" بدقة لتأكيد العملية', type: 'error' });
      return;
    }

    setIsApplyingUpdate(true);
    setUpdateFeedback({ text: 'جاري قراءة حزمة التحديث...', type: 'info' });

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          setUpdateFeedback({ text: 'جاري أخذ لقطة أمان لقاعدة البيانات وتطبيق التحديث...', type: 'info' });

          const res = await fetch('/api/system/apply-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              confirmation_word: 'تحديث',
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || 'فشل تطبيق التحديث البرمجي');
          }

          const newVer = data.data?.new_version || data.data?.version || 'الجديد';
          setUpdateFeedback({
            text: `تم تطبيق التحديث بنجاح إلى الإصدار (v${newVer})! جاري إعادة تشغيل النظام لتطبيق التحديثات... 🎉`,
            type: 'success',
          });

          setTimeout(() => {
            if (window.electronAPI && typeof window.electronAPI.relaunch === 'function') {
              window.electronAPI.relaunch();
            } else {
              window.location.reload();
            }
          }, 2200);
        } catch (err) {
          setUpdateFeedback({ text: err.message || 'فشل تطبيق التحديث', type: 'error' });
          setIsApplyingUpdate(false);
        }
      };
      reader.readAsDataURL(updateFile);
    } catch (err) {
      setUpdateFeedback({ text: 'تعذر قراءة ملف التحديث: ' + err.message, type: 'error' });
      setIsApplyingUpdate(false);
    }
  };

  const handleActivateLicenseInSettings = async (e) => {
    if (e) e.preventDefault();
    if (!licenseKeyInput.trim()) return;

    setIsActivatingLicense(true);
    setLicenseFeedback({ text: '', type: '' });

    try {
      const res = await fetch('/api/system/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKeyInput.trim().toUpperCase(),
          shopName: formData.shopName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل تفعيل المفتاح');
      }

      setLicenseData(data.data);
      setLicenseKeyInput('');
      setLicenseFeedback({ text: 'تم تفعيل وتجديد الترخيص بنجاح تام 🛡️🎉', type: 'success' });
      window.dispatchEvent(new Event('al_banshar_license_updated'));
    } catch (err) {
      setLicenseFeedback({ text: err.message || 'كود غير صحيح أو لا يطابق هذا الجهاز', type: 'error' });
    } finally {
      setIsActivatingLicense(false);
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
      fetchLocalBackupsList();
      fetchLicenseData();
      fetchSystemVersion();
      setUpdateFile(null);
      setUpdateConfirmWord('');
      setUpdateFeedback({ text: '', type: '' });
      setLicenseKeyInput('');
      setLicenseFeedback({ text: '', type: '' });
      setRestoreFile(null);
      setRestoreValidation(null);
      setRestoreError('');
      setRestoreSuccessNotice('');
    }
  }, [isOpen]);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setSelectedLocalBackup('');
    setRestoreError('');
    setIsValidatingRestore(true);
    setRestoreValidation(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await fetch('/api/backup/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, fileName: file.name }),
          });
          const data = await res.json();
          if (data.success) {
            setRestoreValidation(data.data);
          } else {
            setRestoreError(data.message || 'الملف غير صالح للاستعادة');
          }
        } catch (err) {
          setRestoreError('فشل فحص الملف: ' + err.message);
        } finally {
          setIsValidatingRestore(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setRestoreError('فشل قراءة الملف: ' + err.message);
      setIsValidatingRestore(false);
    }
  };

  const handleSelectLocalBackup = async (fileName) => {
    setSelectedLocalBackup(fileName);
    setRestoreFile(null);
    setRestoreError('');
    setIsValidatingRestore(true);
    setRestoreValidation(null);

    try {
      const res = await fetch('/api/backup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localFileName: fileName }),
      });
      const data = await res.json();
      if (data.success) {
        setRestoreValidation(data.data);
      } else {
        setRestoreError(data.message || 'الملف غير صالح');
      }
    } catch (err) {
      setRestoreError('فشل فحص النسخة: ' + err.message);
    } finally {
      setIsValidatingRestore(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (restoreConfirmWord.trim() !== 'استعادة') {
      setRestoreError('يرجى كتابة كلمة "استعادة" بدقة لتأكيد الاسترجاع');
      return;
    }
    setIsRestoring(true);
    setRestoreError('');

    try {
      let res;
      if (restoreFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(restoreFile);
        });

        res = await fetch('/api/backup/restore-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: restoreFile.name,
            confirmation_word: 'استعادة',
          }),
        });
      } else if (selectedLocalBackup) {
        res = await fetch('/api/backup/restore-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedLocalBackup,
            confirmation_word: 'استعادة',
          }),
        });
      } else {
        setRestoreError('لم يتم تحديد أي ملف للاستعادة');
        setIsRestoring(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setShowRestoreConfirmModal(false);
        setRestoreSuccessNotice(data.message || 'تمت استعادة وتنشيط قاعدة البيانات بنجاح!');
        setTimeout(() => {
          window.location.reload();
        }, 1600);
      } else {
        setRestoreError(data.message || 'فشلت عملية الاستعادة');
      }
    } catch (err) {
      setRestoreError('خطأ أثناء الاستعادة: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

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

            {/* PRINTER & RECEIPT SETTINGS (مقاس ورق الفاتورة الحرارية) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-sky-500/40 space-y-3 shadow-lg">
              <div className="font-extrabold text-sky-300 flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>طابعة الإيصالات الحرارية ومقاس الورق (Receipt Paper Size):</span>
                </span>
                <span className="text-[10px] text-sky-300 bg-sky-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold border border-sky-500/30">
                  {formData.receiptPaperSize === '58mm' ? 'ورق 58mm مدمج' : 'ورق 80mm عريض'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                حدد مقاس رول الورق الحراري لطابعة الكاشير لضبط أبعاد الفاتورة تلقائياً بدون اقتصاص النصوص:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    (formData.receiptPaperSize || '80mm') === '80mm'
                      ? 'bg-sky-500/15 border-sky-400/80 text-white shadow-sm ring-1 ring-sky-400/30'
                      : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/25'
                  }`}
                >
                  <input
                    type="radio"
                    name="receiptPaperSize"
                    value="80mm"
                    checked={(formData.receiptPaperSize || '80mm') === '80mm'}
                    onChange={() => setFormData({ ...formData, receiptPaperSize: '80mm' })}
                    className="w-4 h-4 mt-0.5 accent-sky-400 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>مقاس 80mm (القياسي العريض)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-normal">الأكثر استخداماً</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      مناسب لطابعات الكاشير القياسية الثابتة (EPSON, Xprinter 80, Bixolon, وغيرها).
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    formData.receiptPaperSize === '58mm'
                      ? 'bg-sky-500/15 border-sky-400/80 text-white shadow-sm ring-1 ring-sky-400/30'
                      : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/25'
                  }`}
                >
                  <input
                    type="radio"
                    name="receiptPaperSize"
                    value="58mm"
                    checked={formData.receiptPaperSize === '58mm'}
                    onChange={() => setFormData({ ...formData, receiptPaperSize: '58mm' })}
                    className="w-4 h-4 mt-0.5 accent-sky-400 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>مقاس 58mm (مدمج صغير)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">صغيرة / محمولة</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      مناسب للطابعات الحرارية المدمجة والصغيرة وبلوتوث / USB ذات الورق الرفيع.
                    </div>
                  </div>
                </label>
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

            {/* 6. ADVANCED DATABASE BACKUP & RESTORE HUB (إدارة النسخ الاحتياطي والاستعادة) */}
            <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-cyan-500/30 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>6. درع الأمان والنسخ الاحتياطي والاستعادة المباشرة:</span>
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

              {/* Status and Fast Export Bar */}
              <div className="p-3 bg-slate-950 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div>
                  <div className="text-slate-300 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>آخر لقطة محفوظة:</span>
                    <b className="text-white font-mono">
                      {backupStatus?.lastBackupDate ? `${backupStatus.lastBackupDate} (${backupStatus.sizeFormatted || ''})` : 'لم تُؤخذ بعد'}
                    </b>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    إجمالي النسخ المحفوظة محلياً: {backupStatus?.totalBackups || 0} نسخة في <span className="text-slate-300">server/backups</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="/api/backup"
                    download
                    onClick={recordBackupDownloaded}
                    className="min-h-[38px] px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md shadow-cyan-600/20 flex items-center gap-1.5 transition active:scale-95"
                    title="تنزيل نسخة من قاعدة البيانات الآن كملف .sqlite"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير وتنزيل النسخة 💾</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCreateSnapshotNow}
                    disabled={isCreatingSnapshot}
                    className="min-h-[38px] px-3.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    {isCreatingSnapshot ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>أخذ لقطة سريعة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {snapshotSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{snapshotSuccess}</span>
                </div>
              )}

              {/* RESTORE DATABASE SUB-SECTION */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-cyan-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-amber-400" />
                    <span>استيراد واستعادة قاعدة البيانات (Restore Database):</span>
                  </div>

                  {/* Toggle source tab */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreSourceTab('upload');
                        setRestoreError('');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        restoreSourceTab === 'upload' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      رفع ملف من جهازك
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreSourceTab('local');
                        setRestoreError('');
                        fetchLocalBackupsList();
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        restoreSourceTab === 'local' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      من النسخ المحلية ({localBackupsList.length})
                    </button>
                  </div>
                </div>

                {restoreSourceTab === 'upload' ? (
                  <div>
                    <label className="block border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl p-3.5 text-center cursor-pointer bg-cyan-950/20 hover:bg-cyan-950/30 transition">
                      <input
                        type="file"
                        accept=".sqlite,.db"
                        onChange={handleFileSelected}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
                      <div className="text-xs font-bold text-slate-200">
                        {restoreFile ? (
                          <span className="text-emerald-300 font-mono">الملف المختار: {restoreFile.name} ({(restoreFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                        ) : (
                          'انقر هنا لاختيار ملف النسخة الاحتياطية (.sqlite أو .db) من جهازك'
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">يتم فحص وتأكيد سلامة الملف تلقائياً قبل تطبيقه</div>
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">اختر لقطة من النسخ المحفوظة محلياً على السيرفر:</label>
                    <select
                      value={selectedLocalBackup}
                      onChange={(e) => handleSelectLocalBackup(e.target.value)}
                      className="w-full min-h-[38px] px-3 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs font-bold focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">-- اضغط لاختيار لقطة سابقة --</option>
                      {localBackupsList.map((b) => (
                        <option key={b.fileName} value={b.fileName}>
                          {b.fileName} — {b.sizeFormatted} ({new Date(b.modifiedAt || b.createdAt).toLocaleDateString('ar-YE')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Validation Loading Spinner */}
                {isValidatingRestore && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري فحص سلامة النسخة الاحتياطية والجداول...</span>
                  </div>
                )}

                {/* Validation Success Card */}
                {restoreValidation && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-black text-emerald-300">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تم فحص النسخة: {restoreValidation.message}</span>
                      </div>
                      <span className="font-mono text-[11px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                        {restoreValidation.sizeFormatted}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-slate-200 pt-1">
                      <div className="p-1.5 rounded-lg bg-slate-900/80 border border-white/5 text-center">
                        <div className="text-slate-400 text-[10px]">السيارات والعملاء</div>
                        <div className="text-amber-300 font-mono text-sm">{restoreValidation.counts.vehicles}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900/80 border border-white/5 text-center">
                        <div className="text-slate-400 text-[10px]">فواتير المبيعات</div>
                        <div className="text-cyan-300 font-mono text-sm">{restoreValidation.counts.invoices}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900/80 border border-white/5 text-center">
                        <div className="text-slate-400 text-[10px]">أصناف المخزون</div>
                        <div className="text-emerald-300 font-mono text-sm">{restoreValidation.counts.inventory}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900/80 border border-white/5 text-center">
                        <div className="text-slate-400 text-[10px]">السندات والقيود</div>
                        <div className="text-purple-300 font-mono text-sm">
                          {(restoreValidation.counts.vouchers || 0) + (restoreValidation.counts.journal_entries || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setRestoreConfirmWord('');
                          setRestoreError('');
                          setShowRestoreConfirmModal(true);
                        }}
                        className="w-full sm:w-auto min-h-[40px] px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>بدء استعادة وتنشيط هذه النسخة الآن 🛡️</span>
                      </button>
                    </div>
                  </div>
                )}

                {restoreError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}

                {restoreSuccessNotice && (
                  <div className="p-3 rounded-xl bg-emerald-500/25 border border-emerald-500/50 text-emerald-200 text-xs font-black flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{restoreSuccessNotice} (جاري تحديث النظام...)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 7. LICENSE & SUBSCRIPTION SENTINEL */}
            <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-500/30 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                  <KeyRound className="w-4 h-4" />
                  <span>7. إدارة الاشتراك وتراخيص النظام (License & Subscription):</span>
                </div>

                {licenseData && (
                  <span
                    className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                      licenseData.status === 'active'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : licenseData.status === 'trial'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                        : 'bg-rose-950 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {licenseData.status === 'active'
                      ? 'اشتراك سنوي ساري 🛡️'
                      : licenseData.status === 'trial'
                      ? `نسخة تجريبية (${licenseData.daysRemaining} يوم متبقي) ⏱️`
                      : `مهلة سماح (${licenseData.graceDaysRemaining} يوم متبقي) ⚠️`}
                  </span>
                )}
              </div>

              {/* Machine Fingerprint & WhatsApp */}
              {licenseData && (
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold">كود جهاز الورشة المعتمد (Machine ID):</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(licenseData.machineId || '');
                        setCopiedMidSettings(true);
                        setTimeout(() => setCopiedMidSettings(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1"
                    >
                      {copiedMidSettings ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الكود</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="font-mono text-sm sm:text-base font-black text-cyan-300 text-center bg-slate-900 border border-white/10 py-2 rounded-xl tracking-wider select-all">
                    {licenseData.machineId}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">تاريخ الانتهاء:</span>
                      <strong className="text-white font-mono">{licenseData.expiresAt}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block">الأيام المتبقية:</span>
                      <strong className="text-amber-300 font-mono">
                        {licenseData.daysRemaining} يوماً
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                    <span className="text-slate-400">للتجديد السريع، تواصل عبر الواتساب:</span>
                    <a
                      href={`https://wa.me/967${licenseData.supportPhone || '770834754'}?text=${encodeURIComponent(
                        `طلب تجديد اشتراك نظام سريع وبنشر PRO\nكود جهازي: ${licenseData.machineId}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 underline"
                    >
                      <span>واتساب الدعم ({licenseData.supportPhone || '770834754'})</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Renewal / Activation Input */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-300">
                  تفعيل أو تجديد الاشتراك بمفتاح جديد:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                    placeholder="ALB-XXXX-XXXX-XXXX-XXXX-XXXX"
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/20 text-amber-300 font-mono text-xs font-bold placeholder:text-slate-600 focus:outline-none focus:border-amber-400 text-center tracking-widest"
                  />
                  <button
                    type="button"
                    disabled={isActivatingLicense || !licenseKeyInput.trim()}
                    onClick={handleActivateLicenseInSettings}
                    className="min-h-[40px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isActivatingLicense ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>تأكيد وتفعيل المفتاح ⚡</span>
                  </button>
                </div>

                {licenseFeedback.text && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      licenseFeedback.type === 'success'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {licenseFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{licenseFeedback.text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 8. SOFTWARE UPDATE ENGINE (ترقية وتحديث النظام عبر الواتساب) */}
            <div id="section-software-update" className="p-4 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/40 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/30">
                    <RefreshCw className="w-5 h-5 animate-[spin_6s_linear_infinite]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-indigo-300 text-sm">
                        8. تحديث وترقية النظام البرمجي (Software Update)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                        📲 عبر الواتساب
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      تطبيق التحديثات والتحسينات البرمجية من ملف Zip دون الحاجة للإنترنت
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-400/50 text-indigo-200 text-xs font-mono font-black flex items-center gap-2 shadow-inner">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>الإصدار الحالي: v{systemVersion.version}</span>
                </div>
              </div>

              {/* Version & Safety Badge */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-emerald-200">
                    أمان تام: يتم أخذ لقطة احتياطية فورية لقاعدة البيانات قبل الترقية تلقائياً دون المساس ببياناتك.
                  </span>
                </div>
                {systemVersion.releaseDate && (
                  <span className="text-[10px] text-slate-400 font-mono">تاريخ البناء: {systemVersion.releaseDate}</span>
                )}
              </div>

              {/* Upload Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  اختر ملف حزمة التحديث المستلمة عبر الواتساب (.zip):
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUpdateFile(file);
                        setUpdateFeedback({ text: '', type: '' });
                      }
                    }}
                    className="w-full text-xs text-slate-400 file:mr-0 file:ml-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600/30 file:text-indigo-300 hover:file:bg-indigo-600/50 file:cursor-pointer bg-slate-950/80 p-1.5 rounded-xl border border-white/10"
                  />
                </div>
                {updateFile && (
                  <div className="text-[11px] text-indigo-300 font-bold flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>الملف المحدد: {updateFile.name} ({(updateFile.size / 1024 / 1024).toFixed(2)} ميجابايت)</span>
                  </div>
                )}
              </div>

              {/* Confirmation and Action Button */}
              {updateFile && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-500/30 space-y-2.5">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                      اكتب كلمة <span className="text-indigo-400 underline font-black">"تحديث"</span> لتأكيد التثبيت:
                    </label>
                    <input
                      type="text"
                      placeholder='اكتب: تحديث'
                      value={updateConfirmWord}
                      onChange={(e) => setUpdateConfirmWord(e.target.value.trim())}
                      className="w-full min-h-[38px] px-3 rounded-xl bg-slate-900 border border-indigo-500/40 text-indigo-300 text-center text-xs font-black focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isApplyingUpdate || updateConfirmWord.trim() !== 'تحديث'}
                    onClick={handleApplySoftwareUpdate}
                    className="w-full min-h-[42px] rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    {isApplyingUpdate ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري التحقق وتطبيق التحديث...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>تثبيت وتطبيق التحديث الآن ⚡</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Feedback messages */}
              {updateFeedback.text && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    updateFeedback.type === 'success'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : updateFeedback.type === 'info'
                      ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {updateFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : updateFeedback.type === 'info' ? (
                    <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{updateFeedback.text}</span>
                </div>
              )}
            </div>

            {/* 9. DANGER ZONE & FACTORY RESET */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <div className="font-extrabold text-rose-300 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>9. منطقة الخطر وإعادة تهيئة النظام (Factory Reset):</span>
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

      {/* RESTORE DATABASE CONFIRMATION MODAL */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="apple-glass border-2 border-emerald-500/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-black text-emerald-300 text-base">تأكيد استعادة قاعدة البيانات</h4>
                <p className="text-[11px] text-slate-400">تنشيط واسترجاع البيانات من النسخة الاحتياطية</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs leading-relaxed space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>حماية البيانات الحالية (لقطة أمان تلقائية):</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  سيقوم النظام بأخذ لقطة أمان احتياطية تلقائياً للوضع الحالي قبل البدء، لتتمكن من التراجع في أي وقت.
                </p>
              </div>

              {restoreValidation && (
                <div className="p-3 bg-slate-950 rounded-xl border border-white/10 text-[11px] space-y-1">
                  <div className="text-slate-400 font-bold">البيانات التي سيتم تنشيطها فوراً:</div>
                  <div className="text-white font-mono flex items-center justify-between">
                    <span>السيارات: <b className="text-amber-300">{restoreValidation.counts.vehicles}</b></span>
                    <span>الفواتير: <b className="text-cyan-300">{restoreValidation.counts.invoices}</b></span>
                    <span>الأصناف: <b className="text-emerald-300">{restoreValidation.counts.inventory}</b></span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                  اكتب كلمة <span className="text-emerald-400 underline font-black">"استعادة"</span> للتأكيد:
                </label>
                <input
                  type="text"
                  placeholder='اكتب: استعادة'
                  value={restoreConfirmWord}
                  onChange={(e) => setRestoreConfirmWord(e.target.value.trim())}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 text-center text-sm font-black focus:outline-none focus:border-emerald-400"
                />
              </div>

              {restoreError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreConfirmModal(false)}
                  disabled={isRestoring}
                  className="flex-1 min-h-[46px] rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring || restoreConfirmWord !== 'استعادة'}
                  className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الاستعادة والتنشيط...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>تأكيد الاستعادة الفورية</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
