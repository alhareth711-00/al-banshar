/**
 * AL-BANSHAR PRO — Master Interactive Audit Runner
 * 
 * Sequentially executes the 6 Specialized Audit Phases with fast-check.
 * Implements the 4-part issue report template and interactive approval gating.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { runPhase1Audit } = require('./audits/phase1_mathAudit');
const { runPhase2Audit } = require('./audits/phase2_modelsDbAudit');
const { runPhase3Audit } = require('./audits/phase3_apiSafeguardsAudit');
const { runPhase4Audit } = require('./audits/phase4_uiFlowsAudit');
const { runPhase5Audit } = require('./audits/phase5_backupRecoveryAudit');
const { runPhase6Audit } = require('./audits/phase6_fiscalClosingAudit');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.clear();
  console.log('👑 =====================================================================');
  console.log('👑  AL-BANSHAR PRO — جناح الفحص التفاعلي السداسي (Property Testing)');
  console.log('👑  نظام إدارة غيار الزيوت والإطارات — صنعاء');
  console.log('👑 =====================================================================\n');

  console.log('📌 جاري تشغيل المرحلة 1 من 6: الدوال الرياضية والعمليات الحسابية (Math Engine)...\n');

  const result1 = await runPhase1Audit();

  if (result1.issues.length === 0) {
    console.log('\n🎉 =====================================================================');
    console.log('✅  تهانينا! اجتازت المرحلة الأولى جميع اختبارات الخصائص بنسبة 100%!');
    console.log('✅  الدوال الرياضية محصنة تماماً، والفاحص المرافق متزن.');
    console.log('=====================================================================\n');
  } else {
    console.log('\n⚠️ =====================================================================');
    console.log(`🚨  تقرير نتائج المرحلة 1: تم اكتشاف ${result1.issues.length} ثغرة تتطلب المراجعة!`);
    console.log('=====================================================================\n');

    for (let i = 0; i < result1.issues.length; i++) {
      const issue = result1.issues[i];
      console.log(`---------------------------------------------------------------------`);
      console.log(`📋 [الحالة رقم ${i + 1}/${result1.issues.length}]: ${issue.dimension}`);
      console.log(`---------------------------------------------------------------------`);
      console.log(`🔴 1. المشكلة المكتشفة:`);
      console.log(`   المدخلات الشاذة من fast-check: ${issue.counterExample}`);
      console.log(`   التفاصيل: ${issue.error}\n`);

      console.log(`⚠️ 2. الأثر الميداني في الورشة:`);
      console.log(`   ${issue.impact}\n`);

      console.log(`🔄 3. سيناريو قبل وبعد الحل:`);
      console.log(`   * قبل الحل: ${issue.beforeScenario}`);
      console.log(`   * بعد الحل: ${issue.afterScenario}\n`);

      console.log(`💡 4. الكود والحل المقترح للمراجعة:`);
      console.log(`--------------------------------------------------`);
      console.log(issue.fixCode);
      console.log(`--------------------------------------------------\n`);
    }

    console.log('⏸️ [توقف النظام بانتظار قرارك]:');
    const answer = await askQuestion('👉 هل توافق على اعتماد وتطبيق هذا الإصلاح البرمجي الآن؟ (Y/N): ');

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer === 'نعم') {
      console.log('\n🔧 جاري تطبيق الإصلاح البرمجي المعتمد على utils/mathPrecision.js...');
      
      applyMathPrecisionFix();

      console.log('🔄 جاري إعادة تشغيل فحص المرحلة الأولى للتحقق من اختفاء الثغرة تماماً...\n');
      const reCheck = await runPhase1Audit();
      
      if (reCheck.issues.length === 0) {
        console.log('\n🎉 =====================================================================');
        console.log('✅  تم التحقق بنجاح! اختفت كافة الثغرات وأصبحت الدوال محصنة بنسبة 100%!');
        console.log('=====================================================================\n');
      } else {
        console.log(`\n❌ ما زال هناك ${reCheck.issues.length} ثغرة بحاجة لمعالجة.`);
      }
    } else {
      console.log('\n⏸️ تم تعليق تطبيق الإصلاح بناءً على رغبتك.');
    }
  }

  const nextPhase = await askQuestion('\n👉 هل ترغب في بدء فحص المرحلة الثانية (طبقة النماذج وقواعد البيانات)؟ (Y/N): ');
  if (nextPhase.toLowerCase() === 'y' || nextPhase.toLowerCase() === 'yes' || nextPhase === 'نعم') {
    console.log('\n🚀 جاري تشغيل المرحلة 2 من 6: النماذج وقواعد البيانات (Models & DB Invariants)...\n');
    const result2 = await runPhase2Audit();

    if (result2.issues.length === 0) {
      console.log('\n🎉 =====================================================================');
      console.log('✅  تهانينا! اجتازت المرحلة الثانية جميع اختبارات النماذج وقواعد البيانات بنسبة 100%!');
      console.log('✅  صمامات العداد، ديون الزبائن، والورديات محصنة تماماً.');
      console.log('=====================================================================\n');

      const nextPhase3 = await askQuestion('\n👉 هل ترغب في بدء فحص المرحلة الثالثة (مسارات الـ API وصمامات الأمان)؟ (Y/N): ');
      if (nextPhase3.toLowerCase() === 'y' || nextPhase3.toLowerCase() === 'yes' || nextPhase3 === 'نعم') {
        console.log('\n🚀 جاري تشغيل المرحلة 3 من 6: مسارات الـ API وصمامات الأمان (API Routes & Safeguards)...\n');
        const result3 = await runPhase3Audit();

        if (result3.issues.length === 0) {
          console.log('\n🎉 =====================================================================');
          console.log('✅  تهانينا! اجتازت المرحلة الثالثة جميع اختبارات الـ API بنسبة 100% عبر HTTP!');
          console.log('✅  صمامات المدخلات المشوهة، الفواتير الكبيرة، وحصانة الـ SQL محققة بالكامل.');
          console.log('=====================================================================\n');

          const nextPhase4 = await askQuestion('\n👉 هل ترغب في بدء فحص المرحلة الرابعة (تدفقات الواجهة وسلوك المستخدم)؟ (Y/N): ');
          if (nextPhase4.toLowerCase() === 'y' || nextPhase4.toLowerCase() === 'yes' || nextPhase4 === 'نعم') {
            console.log('\n🚀 جاري تشغيل المرحلة 4 من 6: تدفقات الواجهة وسلوك المستخدم (UI Flows & Pricing Safeguards)...\n');
            const result4 = await runPhase4Audit();

            if (result4.passedCount === result4.totalTests) {
              console.log('\n🎉 =====================================================================');
              console.log('✅  تهانينا! اجتازت المرحلة الرابعة جميع اختبارات تدفقات الواجهة بنسبة 100%!');
              console.log('✅  صمامات النقرات المزدوجة، التزامن متعدد الأجهزة، والبيع بأقل من التكلفة محصنة.');
              console.log('=====================================================================\n');

              const nextPhase5 = await askQuestion('\n👉 هل ترغب في بدء فحص المرحلة الخامسة (النسخ الاحتياطي ومقاومة انقطاع التيار)؟ (Y/N): ');
              if (nextPhase5.toLowerCase() === 'y' || nextPhase5.toLowerCase() === 'yes' || nextPhase5 === 'نعم') {
                console.log('\n🚀 جاري تشغيل المرحلة 5 من 6: النسخ الاحتياطي ومقاومة انقطاع التيار (Backup & Crash Recovery)...\n');
                const result5 = await runPhase5Audit();

                if (result5.passedCount === result5.totalTests) {
                  console.log('\n🎉 =====================================================================');
                  console.log('✅  تهانينا! اجتازت المرحلة الخامسة اختبارات الصمود والتعافي الذاتي بنسبة 100%!');
                  console.log('✅  النسخ الذري، ترويسة SQLite، وسجل الـ WAL صامدة تماماً أمام صدمات الكهرباء.');
                  console.log('=====================================================================\n');

                  const nextPhase6 = await askQuestion('\n👉 هل ترغب في بدء فحص المرحلة السادسة (المرحلة الذهبية: الإغلاق السنوي وترحيل الأرباح)؟ (Y/N): ');
                  if (nextPhase6.toLowerCase() === 'y' || nextPhase6.toLowerCase() === 'yes' || nextPhase6 === 'نعم') {
                    console.log('\n👑 جاري تشغيل المرحلة 6 من 6: الإغلاق السنوي وترحيل الأرباح (Fiscal Year-End Closing)...\n');
                    const result6 = await runPhase6Audit();

                    if (result6.passedCount === result6.totalTests) {
                      console.log('\n🏆 =====================================================================');
                      console.log('🌟  إنجاز استثنائي! اجتاز النظام جميع المراحل الست (6/6) بنسبة نجاح 100%!');
                      console.log('🌟  نظام "البنشر Pro" محصن تماماً محاسبياً، تقنياً، وميدانياً لأقصى درجات الضغط!');
                      console.log('🌟  تصفير الحسابات، ترحيل الأرباح لحساب 3201، وشجرة الحسابات متزنة بالكامل.');
                      console.log('🏆 =====================================================================\n');
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } else {
    console.log('\n👋 تم إيقاف الفحص. يمكنك العودة والتشغيل في أي وقت بنقرة واحدة.');
  }
}

function applyMathPrecisionFix() {
  const filePath = path.join(__dirname, '../utils/mathPrecision.js');
  const code = fs.readFileSync(filePath, 'utf8');

  // Replace roundMoney and safeDiv with hardened versions
  const hardenedCode = `/**
 * Math & Financial Precision Utility
 * Handles floating point inaccuracies, safe divisions, currency formatting,
 * and Weighted Average Cost (WAC) calculations with strict defensive checks.
 */

/**
 * Rounds a number to a fixed number of decimal places defensively without floating-point artifacts.
 * Handles exponential notations (e.g., 1e-7) and ultra-tiny numbers gracefully.
 * @param {number|string} val
 * @param {number} decimals Default is 2 (for standard currency calculation)
 * @returns {number}
 */
function roundMoney(val, decimals = 2) {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  
  // Guard against scientific exponential representation (e.g. 5e-324, 1e-7)
  const str = num.toString();
  if (str.includes('e')) {
    const parts = str.split('e');
    const exp = Number(parts[1]);
    if (exp < -decimals) return 0; // The exponent is smaller than precision decimal places
    if (exp > 20) return num; // Huge number
  }

  const res = Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
  // Avoid negative zero (-0)
  return Object.is(res, -0) ? 0 : (isNaN(res) ? 0 : res);
}

/**
 * Ensures value is a valid finite number, returns fallback otherwise.
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
function safeNum(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return (!isNaN(num) && isFinite(num)) ? num : fallback;
}

/**
 * Safe division protecting against zero, null, undefined, NaN, or ultra-tiny denominators.
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} fallback
 * @returns {number}
 */
function safeDiv(numerator, denominator, fallback = 0) {
  const n = safeNum(numerator, 0);
  const d = safeNum(denominator, 0);
  if (Math.abs(d) < 1e-9) return fallback;
  const res = n / d;
  return (!isNaN(res) && isFinite(res)) ? roundMoney(res) : fallback;
}

/**
 * Calculates Weighted Average Cost (WAC) for inventory restocking.
 * Formula: ((CurrentQty * CurrentCost) + (IncomingQty * IncomingCost)) / (CurrentQty + IncomingQty)
 * Defensive rules:
 * - If current stock is <= 0 (e.g. was out of stock or negative), the new cost is incomingCost.
 * - If incoming qty is <= 0, preserves currentCost.
 * 
 * @param {number} currentQty
 * @param {number} currentCost
 * @param {number} incomingQty
 * @param {number} incomingCost
 * @returns {number} new WAC unit cost
 */
function calcWAC(currentQty, currentCost, incomingQty, incomingCost) {
  const cQty = Math.max(0, safeNum(currentQty, 0));
  const cCost = Math.max(0, safeNum(currentCost, 0));
  const inQty = Math.max(0, safeNum(incomingQty, 0));
  const inCost = Math.max(0, safeNum(incomingCost, 0));

  if (inQty <= 0) return cCost;
  if (cQty <= 0) return roundMoney(inCost);

  const totalCost = (cQty * cCost) + (inQty * inCost);
  const totalQty = cQty + inQty;

  return roundMoney(totalCost / totalQty);
}

/**
 * Calculates line subtotal: (qty * unitPrice) + laborFee
 */
function calcLineSubtotal(qty, unitPrice, laborFee = 0) {
  const q = Math.max(0, safeNum(qty, 1));
  const p = Math.max(0, safeNum(unitPrice, 0));
  const l = Math.max(0, safeNum(laborFee, 0));
  return roundMoney((q * p) + l);
}

/**
 * Calculates net invoice total defensively.
 */
function calcNetTotal(itemsTotal, laborTotal = 0, scrapDeduction = 0, discount = 0) {
  const iTot = Math.max(0, safeNum(itemsTotal, 0));
  const lTot = Math.max(0, safeNum(laborTotal, 0));
  const sDed = Math.max(0, safeNum(scrapDeduction, 0));
  const disc = Math.max(0, safeNum(discount, 0));

  const gross = iTot + lTot;
  const deductions = sDed + disc;
  return roundMoney(Math.max(0, gross - deductions));
}

/**
 * Formats a monetary number with thousands separators.
 * e.g., 25000 -> "25,000 ر.ي"
 */
function formatMoney(amount, currency = 'ر.ي') {
  const num = roundMoney(amount);
  return \`\${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} \${currency}\`;
}

module.exports = {
  roundMoney,
  safeNum,
  safeDiv,
  calcWAC,
  calcLineSubtotal,
  calcNetTotal,
  formatMoney,
};
`;

  fs.writeFileSync(filePath, hardenedCode, 'utf8');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Audit Error:', err);
  });
}

module.exports = { main };
