const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Base32 Crockford-style alphabet (excludes 0, O, 1, I to prevent human typing errors)
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function encodeBase32Chunk(buffer, length = 4) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const byte = buffer[i % buffer.length];
    result += CHARS[byte % CHARS.length];
  }
  return result;
}

let cachedMachineId = null;

/**
 * Returns a deterministic, stable, hardware-bound machine fingerprint.
 * Formatted as: ALB-XXXX-XXXX-XXXX (e.g., ALB-7K4M-9B2Q-8N5V)
 */
function getMachineId() {
  if (cachedMachineId) return cachedMachineId;

  let rawHwId = '';

  // 1. Try Windows Hardware UUID via wmic / registry
  if (process.platform === 'win32') {
    try {
      const wmicOut = execSync('wmic csproduct get uuid', {
        encoding: 'utf8',
        timeout: 1500,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const lines = wmicOut.split('\n').map((l) => l.trim()).filter((l) => l && !l.toLowerCase().includes('uuid'));
      if (lines.length > 0 && lines[0].length > 10) {
        rawHwId += lines[0];
      }
    } catch (e) {
      // wmic might be deprecated or restricted in newer Win11 builds
    }

    if (!rawHwId) {
      try {
        const psOut = execSync('powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Cryptography\').MachineGuid"', {
          encoding: 'utf8',
          timeout: 2000,
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        if (psOut && psOut.length > 10) {
          rawHwId += psOut;
        }
      } catch (e) {
        // Fallback to general OS info
      }
    }
  }

  // 2. Add CPU Model and Hostname as secondary anchors
  try {
    const cpu = os.cpus()[0]?.model || 'UNKNOWN_CPU';
    const hostname = os.hostname() || 'LOCAL_HOST';
    rawHwId += `|${cpu}|${hostname}`;
  } catch (e) {}

  // 3. Fallback MAC Address if still sparse
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
          rawHwId += `|${net.mac}`;
          break;
        }
      }
    }
  } catch (e) {}

  if (!rawHwId || rawHwId.length < 5) {
    rawHwId = `FALLBACK_SALT_${os.hostname()}_ALBANSHAR_2026`;
  }

  // Hash into deterministic 12-char formatted ID: ALB-XXXX-XXXX-XXXX
  const hash = crypto.createHash('sha256').update(rawHwId.trim()).digest();
  const chunk1 = encodeBase32Chunk(hash.subarray(0, 4), 4);
  const chunk2 = encodeBase32Chunk(hash.subarray(4, 8), 4);
  const chunk3 = encodeBase32Chunk(hash.subarray(8, 12), 4);

  cachedMachineId = `ALB-${chunk1}-${chunk2}-${chunk3}`;
  return cachedMachineId;
}

module.exports = {
  getMachineId,
  CHARS,
};
