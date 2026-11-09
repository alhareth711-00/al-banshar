const fs = require('fs');
const path = require('path');
const { createLicenseKey } = require('../server/utils/licenseEngine');

const DATA_DIR = path.join(__dirname, 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadClients() {
  ensureDataDir();
  if (!fs.existsSync(CLIENTS_FILE)) {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify([], null, 2), 'utf8');
    return [];
  }
  try {
    const raw = fs.readFileSync(CLIENTS_FILE, 'utf8');
    const clients = JSON.parse(raw);
    return clients.map(enrichClient);
  } catch (err) {
    console.error('[ClientRegistry] Error parsing clients.json:', err.message);
    return [];
  }
}

function saveClients(clients) {
  ensureDataDir();
  // Strip calculated fields before saving to keep JSON clean
  const cleanClients = clients.map((c) => {
    const copy = { ...c };
    delete copy.days_remaining;
    delete copy.status;
    delete copy.status_label;
    delete copy.whatsapp_text;
    delete copy.whatsapp_link;
    return copy;
  });
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(cleanClients, null, 2), 'utf8');
}

function enrichClient(c) {
  const now = new Date();
  const expires = new Date(c.expires_at);
  const diffMs = expires.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  let status = 'active';
  let statusLabel = 'ساري ونشط';

  if (daysRemaining < -7) {
    status = 'expired';
    statusLabel = 'منتهي ومقفل 🛑';
  } else if (daysRemaining < 0) {
    status = 'grace';
    statusLabel = `مهلة سماح (${7 + daysRemaining} أيام متبقية ⚠️)`;
  } else if (daysRemaining <= 15) {
    status = 'expiring_soon';
    statusLabel = `ينتهي قريباً (${daysRemaining} يوماً 🔔)`;
  } else {
    status = 'active';
    statusLabel = `ساري (${daysRemaining} يوماً 🟢)`;
  }

  // Type label
  let typeLabel = 'اشتراك سنوي (سنة كاملة)';
  if (c.license_type === 'trial') typeLabel = 'فترة تجريبية (14 يوماً)';
  if (c.license_type === 'lifetime') typeLabel = 'اشتراك دائم (مدى الحياة)';

  // Build ready-to-send WhatsApp message
  const waText = `مرحباً بك أخي الكريم في *نظام سريع وبنشر PRO* 🚗⚡
يسعدنا تفعيل/تجديد اشتراككم في النظام لـ:
🏢 *${c.shop_name}*
👤 *المالك/المسؤول:* ${c.owner_name || 'الأخ الكريم'}

💻 *كود جهازكم:* \`${c.machine_id}\`
📅 *نوع الاشتراك:* ${typeLabel}
⏳ *تاريخ الانتهاء:* ${c.expires_at}

🔑 *مفتاح التفعيل والتشغيل الخاص بكم:*
\`${c.license_key}\`

📌 *طريقة التفعيل:*
1. افتح البرنامج على جهاز الكمبيوتر.
2. توجه إلى *الإعدادات ⚙️* > *الاشتراك والترخيص*.
3. انسخ المفتاح أعلاه والصقه في خانة التفعيل ثم اضغط *تأكيد وتفعيل الاشتراك*.

نتمنى لكم دوام التوفيق والبركة في أعمالكم 🌹
لأي استفسار أو دعم فني: 770834754`;

  // Clean phone for direct wa.me link (Yemen country code 967)
  let cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
  if (!cleanPhone.startsWith('967') && cleanPhone.length === 9) {
    cleanPhone = '967' + cleanPhone;
  }
  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

  return {
    ...c,
    days_remaining: daysRemaining,
    status,
    status_label: statusLabel,
    type_label: typeLabel,
    whatsapp_text: waText,
    whatsapp_link: waLink,
  };
}

function getStats() {
  const clients = loadClients();
  const total = clients.length;
  const active = clients.filter((c) => c.status === 'active').length;
  const expiringSoon = clients.filter((c) => c.status === 'expiring_soon' || c.status === 'grace').length;
  const expired = clients.filter((c) => c.status === 'expired').length;
  const totalAnnualFees = clients.reduce((acc, c) => acc + (Number(c.annual_fee) || 0), 0);

  return {
    total,
    active,
    expiringSoon,
    expired,
    totalAnnualFees,
  };
}

function addClient({
  shop_name,
  owner_name,
  phone,
  city,
  machine_id,
  license_type = 'annual',
  days = 365,
  annual_fee = 50000,
  payment_status = 'paid',
  notes = '',
}) {
  if (!shop_name || !shop_name.trim()) throw new Error('اسم المركز أو الورشة مطلوب');
  if (!machine_id || !machine_id.trim()) throw new Error('كود جهاز العميل (Machine ID) مطلوب');

  const cleanMid = machine_id.trim().toUpperCase();
  const now = new Date();
  const targetDays = parseInt(days, 10) || 365;
  const expiresAt = new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000);
  const expiresStr = expiresAt.toISOString().split('T')[0];
  const startStr = now.toISOString().split('T')[0];

  const license_key = createLicenseKey({
    machineId: cleanMid,
    type: license_type,
    expiresAt,
  });

  const clients = loadClients();
  const id = `cli_${Date.now()}`;

  const newClient = {
    id,
    shop_name: shop_name.trim(),
    owner_name: (owner_name || '').trim(),
    phone: (phone || '').trim(),
    city: (city || '').trim(),
    machine_id: cleanMid,
    license_type,
    license_key,
    start_date: startStr,
    expires_at: expiresStr,
    annual_fee: Number(annual_fee) || 0,
    payment_status: payment_status || 'paid',
    notes: (notes || '').trim(),
    created_at: now.toISOString(),
    renewals_count: 0,
  };

  clients.unshift(newClient);
  saveClients(clients);
  return enrichClient(newClient);
}

function renewClient(id, { days = 365, annual_fee, payment_status = 'paid', notes }) {
  const clients = loadClients();
  const client = clients.find((c) => c.id === id);
  if (!client) throw new Error('لم يتم العثور على سجل العميل المحدد');

  const now = new Date();
  const currentExpiry = new Date(client.expires_at);
  // If still valid, extend from current expiry; if expired, extend from today
  const baseDate = currentExpiry > now ? currentExpiry : now;

  const targetDays = parseInt(days, 10) || 365;
  const newExpiry = new Date(baseDate.getTime() + targetDays * 24 * 60 * 60 * 1000);
  const newExpiresStr = newExpiry.toISOString().split('T')[0];

  const newKey = createLicenseKey({
    machineId: client.machine_id,
    type: client.license_type || 'annual',
    expiresAt: newExpiry,
  });

  client.expires_at = newExpiresStr;
  client.license_key = newKey;
  client.renewals_count = (client.renewals_count || 0) + 1;
  client.payment_status = payment_status || client.payment_status;
  if (annual_fee !== undefined) client.annual_fee = Number(annual_fee);
  if (notes !== undefined) client.notes = notes;

  saveClients(clients);
  return enrichClient(client);
}

function deleteClient(id) {
  let clients = loadClients();
  const initialLength = clients.length;
  clients = clients.filter((c) => c.id !== id);
  if (clients.length === initialLength) {
    throw new Error('لم يتم العثور على العميل المراد حذفه');
  }
  saveClients(clients);
  return { success: true };
}

module.exports = {
  loadClients,
  saveClients,
  getStats,
  addClient,
  renewClient,
  deleteClient,
  enrichClient,
};
