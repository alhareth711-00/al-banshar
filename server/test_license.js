const assert = require('assert');
const licenseEngine = require('./utils/licenseEngine');
const db = require('./db/database');

console.log('🧪 Starting Al-Banshar License Engine Comprehensive Tests...\n');

// 1. Test Machine ID Generation
const mid = licenseEngine.getMachineId();
console.log('✅ Test 1: Machine ID Generated:', mid);
assert(mid.startsWith('ALB-'), 'Machine ID must start with ALB-');
assert.strictEqual(mid.split('-').length, 4, 'Machine ID must have 4 segments');

// 2. Test License Key Creation
const futureDate = new Date(Date.now() + 365 * 86400000);
const annualKey = licenseEngine.createLicenseKey({
  machineId: mid,
  type: 'annual',
  expiresAt: futureDate,
});
console.log('✅ Test 2: Annual Key Created:', annualKey);
assert(annualKey.startsWith('ALB-'), 'Key must start with ALB-');
assert.strictEqual(annualKey.split('-').length, 6, 'Key must have 6 segments');

// 3. Test Verification of Valid Key
const verified = licenseEngine.verifyLicenseKey(annualKey, mid);
console.log('✅ Test 3: Valid Key Verification:', verified);
assert.strictEqual(verified.valid, true, 'Key must be valid');
assert.strictEqual(verified.type, 'annual', 'Type must be annual');

// 4. Test Verification of Wrong Machine Key
const wrongMid = 'ALB-9999-8888-7777';
const wrongMidResult = licenseEngine.verifyLicenseKey(annualKey, wrongMid);
console.log('✅ Test 4: Wrong Machine Verification:', wrongMidResult.error);
assert.strictEqual(wrongMidResult.valid, false, 'Must reject wrong machine ID');

// 5. Test Verification of Tampered Key
const tamperedKey = annualKey.slice(0, -4) + 'ZZZZ';
const tamperedResult = licenseEngine.verifyLicenseKey(tamperedKey, mid);
console.log('✅ Test 5: Tampered Key Verification:', tamperedResult.error);
assert.strictEqual(tamperedResult.valid, false, 'Must reject tampered key signature');

// 6. Test Active Status
const status = licenseEngine.getLicenseStatus(db);
console.log('✅ Test 6: Current License Status in DB:', status.status, '| Days:', status.daysRemaining);
assert(status.valid, 'Status must be valid');
assert(['active', 'trial', 'grace_period'].includes(status.status), 'Status must be recognized');

// 7. Test Anti-Clock Tampering Function
const futureSeen = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const tamperCheck = licenseEngine.checkClockTampering(db, futureSeen);
console.log('✅ Test 7: Clock Tamper Detection (Future vs Current):', tamperCheck.tampered, '| Reason:', tamperCheck.reason);
assert.strictEqual(tamperCheck.tampered, true, 'Must detect clock rollback');

console.log('\n🎉 ALL 7 LICENSING TESTS PASSED PERFECTLY!\n');
