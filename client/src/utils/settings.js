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
};

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
  } catch (e) {
    console.error('Error saving settings to localStorage', e);
  }
}

export function formatYemeniWhatsAppLink(phone, messageText) {
  if (!phone) return '#';
  const cleanPhone = phone.replace(/^0+/, '').replace(/[\s\-\+]/g, '');
  const internationalPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone}`;
  return `https://api.whatsapp.com/send?phone=${internationalPhone}&text=${encodeURIComponent(messageText)}`;
}
