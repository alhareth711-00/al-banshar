/**
 * Helper to manage Shop Settings and WhatsApp formatting
 */

const DEFAULT_SETTINGS = {
  shopName: 'مركز الصقر لخدمات الإطارات وتغيير الزيوت والبطاريات',
  shopPhone: '777000111',
  ownerPhone: '777123456',
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
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
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
  const cleanPhone = phone.replace(/^0+/, '').replace(/[\s\-\+]/g, '');
  const internationalPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone}`;
  return `https://api.whatsapp.com/send?phone=${internationalPhone}&text=${encodeURIComponent(messageText)}`;
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
