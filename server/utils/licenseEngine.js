const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getMachineId, CHARS } = require('./machineId');

// Internal Master Secret Key for Al-Banshar POS (Protected Server Salt)
const MASTER_SECRET = process.env.LICENSE_MASTER_SECRET || 'AL_BANSHAR_PRO_SECRET_MASTER_SIGNING_KEY_YE_2026_SECURE';

// Base Epoch: 2026-01-01 00:00:00 UTC
const EPOCH_START = Date.UTC(2026, 0, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Path to persistent license signature backup on disk (isolated from db snapshots)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SIG_FILE = path.join(DATA_DIR, 'license.sig');

function getDayNumber(date) {
  const d = new Date(date);
  return Math.floor((d.getTime() - EPOCH_START) / MS_PER_DAY);
}

function getDateFromDayNumber(dayNum) {
  return new Date(EPOCH_START + dayNum * MS_PER_DAY);
}

function generateSignature(machineId, typeCode, dayNum) {
  const payload = `${machineId.toUpperCase()}|${typeCode.toUpperCase()}|${dayNum}`;
  const hmac = crypto.createHmac('sha256', MASTER_SECRET).update(payload).digest();
  let sig = '';
  for (let i = 0; i < 8; i++) {
    sig += CHARS[hmac[i] % CHARS.length];
  }
  return sig; // 8 chars base32
}

/**
 * Format of License Key:
 * ALB-[MID_CHUNK1]-[MID_CHUNK2]-[TYPE + DAY_NUM]-[SIG1]-[SIG2]
 * Example: ALB-PT75-Z9MW-A673-K98B-77CD
 */
function createLicenseKey({ machineId, type = 'annual', expiresAt }) {
  const mid = machineId.trim().toUpperCase();
  const midParts = mid.split('-');
  const chunk1 = midParts[1] || '0000';
  const chunk2 = midParts[2] || '0000';

  let typeChar = 'A';
  if (type === 'trial') typeChar = 'T';
  if (type === 'lifetime') typeChar = 'L';

  const dayNum = getDayNumber(expiresAt);
  const dayStr = String(dayNum).padStart(4, '0');
  const typeDayChunk = `${typeChar}${dayStr}`;

  const sig = generateSignature(mid, typeChar, dayNum);
  const sig1 = sig.substring(0, 4);
  const sig2 = sig.substring(4, 8);

  return `ALB-${chunk1}-${chunk2}-${typeDayChunk}-${sig1}-${sig2}`;
}

/**
 * Validates a License Key string against a target machine ID
 */
function verifyLicenseKey(keyStr, expectedMachineId) {
  if (!keyStr || typeof keyStr !== 'string') {
    return { valid: false, error: 'مفتاح الترخيص غير صالح أو فارغ' };
  }

  const cleanKey = keyStr.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const parts = cleanKey.split('-');

  if (parts.length !== 6 || parts[0] !== 'ALB') {
    return { valid: false, error: 'صيغة مفتاح الترخيص غير مطابقة (يجب أن يبدأ بـ ALB ويتكون من 6 مقاطع)' };
  }

  const [_, keyChunk1, keyChunk2, typeDayChunk, sig1, sig2] = parts;

  const mid = expectedMachineId.trim().toUpperCase();
  const midParts = mid.split('-');
  const expectedChunk1 = midParts[1];
  const expectedChunk2 = midParts[2];

  if (keyChunk1 !== expectedChunk1 || keyChunk2 !== expectedChunk2) {
    return { valid: false, error: 'هذا المفتاح مخصص لجهاز كمبيوتر آخر ولا يطابق كود هذا الجهاز' };
  }

  const typeChar = typeDayChunk[0];
  const dayNum = parseInt(typeDayChunk.substring(1), 10);

  if (isNaN(dayNum)) {
    return { valid: false, error: 'تاريخ الصلاحية داخل المفتاح غير سليم' };
  }

  let type = 'annual';
  if (typeChar === 'T') type = 'trial';
  if (typeChar === 'L') type = 'lifetime';

  const expectedSig = generateSignature(mid, typeChar, dayNum);
  const actualSig = `${sig1}${sig2}`;

  if (actualSig !== expectedSig) {
    return { valid: false, error: 'رمز الحماية والتوقيع الرقمي للمفتاح غير صحيح' };
  }

  const expiresAt = getDateFromDayNumber(dayNum);

  return {
    valid: true,
    machineId: mid,
    type,
    expiresAt: expiresAt.toISOString().split('T')[0],
  };
}

/**
 * Anti-Clock Rollback Checker:
 * Compares current system clock with:
 * 1. The maximum recorded timestamp in past business transactions (invoices, vouchers, etc.)
 * 2. The last known runtime timestamp in the license table
 */
function checkClockTampering(db, lastSeenAt) {
  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // 1. Check against last seen timestamp
  if (lastSeenAt) {
    const lastSeenTime = new Date(lastSeenAt).getTime();
    if (now < lastSeenTime - ONE_HOUR_MS) {
      return {
        tampered: true,
        reason: 'تراجع ساعة الجهاز مقارنة بآخر وقت تشغيل مسجل',
        current: new Date(now).toISOString(),
        recorded: lastSeenAt,
      };
    }
  }

  // 2. Check against maximum transaction timestamp in database
  try {
    const query = `
      SELECT MAX(latest_ts) AS max_ts FROM (
        SELECT MAX(created_at) AS latest_ts FROM invoices
        UNION ALL
        SELECT MAX(created_at) AS latest_ts FROM official_vouchers
        UNION ALL
        SELECT MAX(created_at) AS latest_ts FROM daily_transactions
        UNION ALL
        SELECT MAX(created_at) AS latest_ts FROM cash_drawer_reconciliations
      )
    `;
    const row = db.prepare(query).get();
    if (row && row.max_ts) {
      const maxTxTime = new Date(row.max_ts).getTime();
      if (!isNaN(maxTxTime) && now < maxTxTime - ONE_HOUR_MS) {
        return {
          tampered: true,
          reason: 'تراجع ساعة الجهاز مقارنة بتاريخ آخر فاتورة أو حركة مالية مسجلة',
          current: new Date(now).toISOString(),
          recorded: row.max_ts,
        };
      }
    }
  } catch (e) {
    // If tables don't exist yet, ignore
  }

  return { tampered: false };
}

/**
 * Ensures system_license table exists and returns DB license row
 */
function ensureLicenseTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_license (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT NOT NULL,
      shop_name TEXT NOT NULL DEFAULT 'المركز الذهبي',
      license_key TEXT NOT NULL,
      license_type TEXT NOT NULL DEFAULT 'trial',
      issued_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      signature TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

/**
 * Reads local license.sig disk file if available
 */
function readDiskSig() {
  try {
    if (fs.existsSync(SIG_FILE)) {
      const raw = fs.readFileSync(SIG_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[License] Could not read license.sig:', e.message);
  }
  return null;
}

/**
 * Writes local license.sig disk file
 */
function writeDiskSig(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SIG_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[License] Could not write license.sig:', e.message);
  }
}

/**
 * Initializes or fetches current License Status
 */
function getLicenseStatus(db) {
  ensureLicenseTable(db);
  const mid = getMachineId();
  const nowIso = new Date().toISOString();
  const nowTime = Date.now();

  let license = db.prepare('SELECT * FROM system_license ORDER BY id DESC LIMIT 1').get();
  const diskSig = readDiskSig();

  // If disk signature has a valid paid license matching this machine, sync it into DB
  if (diskSig && diskSig.machineId === mid && diskSig.licenseKey) {
    const verified = verifyLicenseKey(diskSig.licenseKey, mid);
    if (verified.valid && (!license || license.license_type === 'trial')) {
      db.prepare(`
        INSERT INTO system_license (
          machine_id, shop_name, license_key, license_type, issued_at, expires_at, last_seen_at, signature, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        mid,
        diskSig.shopName || 'المركز الذهبي',
        diskSig.licenseKey,
        verified.type,
        diskSig.issuedAt || nowIso,
        verified.expiresAt,
        nowIso,
        diskSig.signature || '',
        'active'
      );
      license = db.prepare('SELECT * FROM system_license ORDER BY id DESC LIMIT 1').get();
    }
  }

  // First-run experience: Auto-issue 14-day trial if no license exists
  if (!license) {
    const trialDays = 14;
    const trialExpiresDate = new Date(nowTime + trialDays * MS_PER_DAY);
    const trialExpiresStr = trialExpiresDate.toISOString().split('T')[0];
    const trialKey = createLicenseKey({ machineId: mid, type: 'trial', expiresAt: trialExpiresDate });

    db.prepare(`
      INSERT INTO system_license (
        machine_id, shop_name, license_key, license_type, issued_at, expires_at, last_seen_at, signature, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mid,
      'مركز الصيانة والزيوت',
      trialKey,
      'trial',
      nowIso,
      trialExpiresStr,
      nowIso,
      'AUTO_TRIAL_14D',
      'trial'
    );

    writeDiskSig({
      machineId: mid,
      shopName: 'مركز الصيانة والزيوت',
      licenseKey: trialKey,
      type: 'trial',
      issuedAt: nowIso,
      expiresAt: trialExpiresStr,
      signature: 'AUTO_TRIAL_14D',
    });

    license = db.prepare('SELECT * FROM system_license ORDER BY id DESC LIMIT 1').get();
  }

  // Anti-Clock Tampering Check
  const clockCheck = checkClockTampering(db, license.last_seen_at);
  if (clockCheck.tampered) {
    return {
      valid: false,
      status: 'locked_tampered',
      machineId: mid,
      shopName: license.shop_name,
      licenseType: license.license_type,
      expiresAt: license.expires_at,
      daysRemaining: 0,
      graceDaysRemaining: 0,
      isTrial: license.license_type === 'trial',
      clockTampered: true,
      tamperDetails: clockCheck,
      message: 'تم رصد تراجع في ساعة وتاريخ النظام! يرجى تصحيح توقيت الكمبيوتر لمتابعة العمل.',
    };
  }

  // Update last seen timestamp
  db.prepare('UPDATE system_license SET last_seen_at = ?, updated_at = ? WHERE id = ?').run(
    nowIso,
    nowIso,
    license.id
  );

  // Expiry & Grace Period Calculation
  const expiresDate = new Date(license.expires_at + 'T23:59:59Z');
  const diffMs = expiresDate.getTime() - nowTime;
  const daysRemaining = Math.ceil(diffMs / MS_PER_DAY);

  const GRACE_PERIOD_DAYS = 7;
  const graceLimitTime = expiresDate.getTime() + GRACE_PERIOD_DAYS * MS_PER_DAY;

  let computedStatus = 'active';
  let graceDaysRemaining = 0;

  if (license.license_type === 'trial') {
    computedStatus = 'trial';
  }

  if (nowTime > expiresDate.getTime()) {
    if (nowTime <= graceLimitTime) {
      computedStatus = 'grace_period';
      graceDaysRemaining = Math.max(1, Math.ceil((graceLimitTime - nowTime) / MS_PER_DAY));
    } else {
      computedStatus = 'locked_expired';
      graceDaysRemaining = 0;
    }
  }

  // Sync status back to DB if changed
  if (license.status !== computedStatus) {
    db.prepare('UPDATE system_license SET status = ? WHERE id = ?').run(computedStatus, license.id);
  }

  return {
    valid: computedStatus !== 'locked_expired' && computedStatus !== 'locked_tampered',
    status: computedStatus,
    machineId: mid,
    shopName: license.shop_name,
    licenseType: license.license_type,
    expiresAt: license.expires_at,
    daysRemaining,
    graceDaysRemaining,
    isTrial: license.license_type === 'trial',
    clockTampered: false,
    supportPhone: '770834754',
  };
}

/**
 * Activates a new license key entered by the user
 */
function activateLicense(db, { licenseKey, shopName }) {
  ensureLicenseTable(db);
  const mid = getMachineId();
  const verified = verifyLicenseKey(licenseKey, mid);

  if (!verified.valid) {
    throw new Error(verified.error);
  }

  const nowIso = new Date().toISOString();
  const targetShopName = shopName && shopName.trim() ? shopName.trim() : 'المركز الذهبي';

  db.prepare(`
    INSERT INTO system_license (
      machine_id, shop_name, license_key, license_type, issued_at, expires_at, last_seen_at, signature, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    mid,
    targetShopName,
    licenseKey.trim().toUpperCase(),
    verified.type,
    nowIso,
    verified.expiresAt,
    nowIso,
    'USER_ACTIVATED',
    'active'
  );

  writeDiskSig({
    machineId: mid,
    shopName: targetShopName,
    licenseKey: licenseKey.trim().toUpperCase(),
    type: verified.type,
    issuedAt: nowIso,
    expiresAt: verified.expiresAt,
    signature: 'USER_ACTIVATED',
  });

  return getLicenseStatus(db);
}

module.exports = {
  getMachineId,
  createLicenseKey,
  verifyLicenseKey,
  getLicenseStatus,
  activateLicense,
  checkClockTampering,
  ensureLicenseTable,
  SIG_FILE,
};
