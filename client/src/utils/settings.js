/**
 * Helper to manage Shop Settings and WhatsApp formatting
 */

const DEFAULT_SETTINGS = {
  shopName: 'مركز الصقر لخدمات الإطارات وتغيير الزيوت والبطاريات',
  shopPhone: '777000111',
  ownerPhone: '776309771', // المالك المعتمد للمركز
  supervisorPhone: '', // Optional: Second WhatsApp recipient (e.g. general supervisor/partner)
  address: 'اليمن - صنعاء - جولة عمران',
  enableShiftsMode: false, // Default is disabled (Direct daily closing without cashier shifts friction)
  openingHour: 7, // Daily operating start hour (7 AM)
  closingHour: 24, // Daily operating close hour (12 AM midnight)
  ownerPin: '1234', // Default Manager / Owner PIN for Kiosk Protection
  autoLockMinutes: 3, // Auto-lock inactivity timeout in minutes (0 = disabled)
  demoMode: false, // Training Mode (الجزء الثالث: وضع التدريب وتجربة البيع)
  defaultServiceIntervalMonths: 2, // المدة الافتراضية لموعد غيار الزيت القادم (شهران)
  preventNegativeStock: true, // منع البيع بالسالب في الكاشير عند نفاد رصيد المخزن
};

export function shouldPreventNegativeStock() {
  const settings = getShopSettings();
  return settings.preventNegativeStock !== false;
}

export function getShopSettings() {
  try {
    const saved = localStorage.getItem('quick_lube_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.ownerPhone === '777123456') {
        parsed.ownerPhone = '776309771';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error loading settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveShopSettings(settings) {
  try {
    localStorage.setItem('quick_lube_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('quick_lube_settings_updated'));
  } catch (e) {
    console.error('Error saving settings to localStorage', e);
  }
}

export function isDemoMode() {
  const settings = getShopSettings();
  return Boolean(settings.demoMode);
}

export function setDemoMode(enabled) {
  const settings = getShopSettings();
  saveShopSettings({ ...settings, demoMode: Boolean(enabled) });
}

export function getOwnerPin() {
  const settings = getShopSettings();
  return String(settings.ownerPin || '1234');
}

export function verifyOwnerPin(inputPin) {
  if (!inputPin) return false;
  const currentPin = getOwnerPin();
  return String(inputPin).trim() === currentPin.trim();
}

export function getAutoLockMinutes() {
  const settings = getShopSettings();
  if (settings.autoLockMinutes === undefined || settings.autoLockMinutes === null) {
    return 3;
  }
  return Number(settings.autoLockMinutes);
}

export function formatYemeniWhatsAppLink(phone, messageText) {
  if (!phone) return '#';
  const cleanPhone = String(phone).trim().replace(/^0+/, '').replace(/[\s\-\+]/g, '');
  const internationalPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone}`;
  return `https://api.whatsapp.com/send?phone=${internationalPhone}&text=${encodeURIComponent(messageText || '')}`;
}

// Backup Sentinel Helpers (الجزء الرابع: درع الأمان وتنبيه 7 أيام)
export function recordBackupDownloaded() {
  try {
    localStorage.setItem('quick_lube_last_backup_download', new Date().toISOString());
    window.dispatchEvent(new Event('quick_lube_backup_updated'));
  } catch (e) {
    console.error('Error saving backup timestamp', e);
  }
}

export function getLastBackupDownloaded() {
  try {
    return localStorage.getItem('quick_lube_last_backup_download') || null;
  } catch (e) {
    return null;
  }
}

export function getLocalBackupStatus() {
  const ts = getLastBackupDownloaded();
  if (!ts) {
    return { hasBackup: false, daysAgo: null, isStale: true };
  }
  const date = new Date(ts);
  const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  return {
    hasBackup: true,
    lastDate: date.toISOString().slice(0, 10),
    daysAgo: Math.max(0, diffDays),
    isStale: diffDays >= 7,
  };
}

// WhatsApp Oil Change Reminder Helper (الجزء الرابع: رادار استعادة الزبائن والتذكير)
export function generateOilReminderMessage({
  customerName = 'العميل العزيز',
  carModel = 'السيارة',
  plateNumber = '',
  nextOdometer = 0,
  preferredOil = '',
}) {
  const settings = getShopSettings();
  const shopName = settings.shopName || 'مركز خدمة السيارات السريعة';
  const shopPhone = settings.shopPhone || '';

  return `مرحباً بك عميلنا العزيز / *${customerName}* 🚗✨
تحية طيبة من *${shopName}*!

نود تذكيرك بموعد الفحص وغيار الزيت القادم لسيارتك:
🔹 نوع المركبة: *${carModel}*
🔹 رقم اللوحة: *${plateNumber}*
${nextOdometer ? `🔹 العداد الموصى عنده بالصيانة: *${Number(nextOdometer).toLocaleString()} كم*` : ''}
${preferredOil ? `🔹 نوع الزيت المعتمد لسيارتك: *${preferredOil}*` : ''}

صيانة سيارتك الدورية تحافظ على المحرك وتطيل عمره الافتراضي. 
يسعدنا استقبالك وخدمتك في أي وقت! 🌟
${shopPhone ? `📞 للتواصل والاستفسار: ${shopPhone}` : ''}`;
}

export function generateOilReminderUrl(params) {
  if (!params.phone) return '#';
  const text = generateOilReminderMessage(params);
  return formatYemeniWhatsAppLink(params.phone, text);
}

// Quick Grid Pinned Items Management (إدارة الأصناف السريعة المفضلة)
export function getQuickGridItemIds() {
  try {
    const saved = localStorage.getItem('quick_lube_pinned_item_ids');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }
  return null; // When null, use system smart defaults
}

export function saveQuickGridItemIds(itemIds) {
  try {
    localStorage.setItem('quick_lube_pinned_item_ids', JSON.stringify(itemIds));
    window.dispatchEvent(new Event('quick_lube_pinned_items_updated'));
  } catch (e) {
    console.error('Error saving quick grid items', e);
  }
}

// -------------------------------------------------------------
// 1. General Oil Volume Presets (اختصارات كميات الزيوت العامة باللتر/العلبة)
// -------------------------------------------------------------
const DEFAULT_VOLUME_PRESETS = [3, 3.5, 4, 4.5, 5, 5.5, 6];

export function getOilVolumePresets() {
  try {
    const saved = localStorage.getItem('quick_lube_oil_volume_presets');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading oil volume presets', e);
  }
  return DEFAULT_VOLUME_PRESETS;
}

export function saveOilVolumePresets(presets) {
  try {
    localStorage.setItem('quick_lube_oil_volume_presets', JSON.stringify(presets));
    window.dispatchEvent(new Event('quick_lube_volume_presets_updated'));
  } catch (e) {
    console.error('Error saving oil volume presets', e);
  }
}

// -------------------------------------------------------------
// 2. Dynamic Viscosities & Aseel Oils (نظام اللزوجات المتكامل + زيوت الصباحة)
// -------------------------------------------------------------
const DEFAULT_VISCOSITIES = [
  '20W-50',
  '10W-40',
  '5W-30',
  '0W-20',
  '15W-40',
  'سي 50 ديزل',
  'سي 50 بترول',
  '20/50 ديزل',
];

export function getCustomViscosities() {
  try {
    const saved = localStorage.getItem('quick_lube_custom_viscosities');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure Aseel oils are present
        const merged = [...parsed];
        ['سي 50 ديزل', 'سي 50 بترول', '20/50 ديزل'].forEach((oil) => {
          if (!merged.includes(oil)) merged.push(oil);
        });
        return merged;
      }
    }
  } catch (e) {
    console.error('Error loading custom viscosities', e);
  }
  return DEFAULT_VISCOSITIES;
}

export function saveCustomViscosities(viscosities) {
  try {
    localStorage.setItem('quick_lube_custom_viscosities', JSON.stringify(viscosities));
    window.dispatchEvent(new Event('quick_lube_viscosities_updated'));
  } catch (e) {
    console.error('Error saving custom viscosities', e);
  }
}

export function registerNewViscosity(viscName) {
  if (!viscName || !String(viscName).trim()) return;
  const clean = String(viscName).trim();
  const list = getCustomViscosities();
  if (!list.includes(clean)) {
    saveCustomViscosities([...list, clean]);
  }
}

// -------------------------------------------------------------
// 3. Dynamic Oil Brands & Auto-Sync (مدير ماركات الزيوت ومزامنتها التلقائية)
// -------------------------------------------------------------
const DEFAULT_OIL_BRANDS = [
  { id: 'تويوتا', name: 'تويوتا أصلي', color: '#e11d48' },
  { id: 'كاسترول', name: 'كاسترول', color: '#16a34a' },
  { id: 'شل', name: 'شل هيلكس', color: '#eab308' },
  { id: 'توتال', name: 'توتال كوارتز', color: '#0284c7' },
  { id: 'صقر', name: 'زيت صقر الوطني', color: '#f59e0b' },
  { id: 'بترومين', name: 'بترومين', color: '#dc2626' },
  { id: 'فوكس', name: 'فوكس تيتان', color: '#f97316' },
  { id: 'موبيل 1', name: 'موبيل 1', color: '#3b82f6' },
  { id: 'عترون', name: 'عترون', color: '#8b5cf6' },
  { id: 'المجموع', name: 'المجموع', color: '#10b981' },
];

export function getCustomOilBrands() {
  try {
    const saved = localStorage.getItem('quick_lube_custom_oil_brands');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading custom oil brands', e);
  }
  return DEFAULT_OIL_BRANDS;
}

export function saveCustomOilBrands(brands) {
  try {
    localStorage.setItem('quick_lube_custom_oil_brands', JSON.stringify(brands));
    window.dispatchEvent(new Event('quick_lube_oil_brands_updated'));
  } catch (e) {
    console.error('Error saving custom oil brands', e);
  }
}

export function registerNewOilBrand(brandName, color = '#f59e0b') {
  if (!brandName || !String(brandName).trim()) return;
  const clean = String(brandName).trim();
  const list = getCustomOilBrands();
  const existing = list.find(
    (b) => b.id.toLowerCase() === clean.toLowerCase() || b.name.toLowerCase() === clean.toLowerCase()
  );
  if (!existing) {
    const updated = [...list, { id: clean, name: clean, color: color || '#f59e0b' }];
    saveCustomOilBrands(updated);
  }
}

