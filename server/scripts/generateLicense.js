#!/usr/bin/env node

/**
 * Al-Banshar PRO - Master License Key Generator (مولد تراخيص نظام سريع وبنشر)
 * Used by the developer to generate offline activation keys for client workshops.
 *
 * Usage:
 *   Interactive: node server/scripts/generateLicense.js
 *   CLI Flags:   node server/scripts/generateLicense.js --mid ALB-XXXX-XXXX-XXXX --shop "مركز الصقر" --days 365
 */

const readline = require('readline');
const { createLicenseKey } = require('../utils/licenseEngine');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mid' && args[i + 1]) options.mid = args[++i];
    if (args[i] === '--shop' && args[i + 1]) options.shop = args[++i];
    if (args[i] === '--days' && args[i + 1]) options.days = parseInt(args[++i], 10);
    if (args[i] === '--type' && args[i + 1]) options.type = args[++i];
  }
  return options;
}

function generateAndPrint({ mid, shop, days, type }) {
  const targetDays = days || 365;
  const targetType = type || (targetDays <= 30 ? 'trial' : targetDays >= 3650 ? 'lifetime' : 'annual');
  const targetShop = shop && shop.trim() ? shop.trim() : 'مركز غيار الزيوت والبناشر';
  const cleanMid = mid.trim().toUpperCase();

  const now = new Date();
  const expiresDate = new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000);
  const expiresStr = expiresDate.toISOString().split('T')[0];

  const key = createLicenseKey({
    machineId: cleanMid,
    type: targetType,
    expiresAt: expiresDate,
  });

  const typeLabelAr =
    targetType === 'lifetime'
      ? 'اشتراك دائم (مدى الحياة 🛡️)'
      : targetType === 'trial'
      ? `فترة تجريبية (${targetDays} يوماً ⏱️)`
      : `اشتراك سنوي (${targetDays} يوماً 📅)`;

  console.log('\n======================================================================');
  console.log('   🔑 تم توليد مفتاح ترخيص نظام سريع وبنشر PRO بنجاح');
  console.log('======================================================================\n');
  console.log(`🏢 المركز / الورشة : ${targetShop}`);
  console.log(`💻 كود جهاز العميل : ${cleanMid}`);
  console.log(`📦 نوع الاشتراك    : ${typeLabelAr}`);
  console.log(`⏳ صالح حتى تاريخ  : ${expiresStr}`);
  console.log(`\n🔑 كود التفعيل:`);
  console.log(`   ${key}`);
  console.log('\n----------------------------------------------------------------------');
  console.log('📲 رسالة الواتساب الجاهزة للإرسال للعميل (انسخ النص أدناه):');
  console.log('----------------------------------------------------------------------');

  const waMessage = `مرحباً بك أخي الكريم في *نظام سريع وبنشر PRO* 🚗⚡
يسعدنا تفعيل اشتراككم في النظام لـ:
🏢 *${targetShop}*

💻 *كود جهازكم:* \`${cleanMid}\`
📅 *مدة الاشتراك:* ${typeLabelAr}
⏳ *تاريخ الانتهاء:* ${expiresStr}

🔑 *مفتاح التفعيل الخاص بكم:*
\`${key}\`

📌 *طريقة التفعيل:*
1. افتح النظام على جهاز الكمبيوتر.
2. توجه إلى *الإعدادات ⚙️* ثم اضغط على *الاشتراك والترخيص*.
3. انسخ المفتاح أعلاه والصقه في خانة التفعيل ثم اضغط *تأكيد وتفعيل الاشتراك*.

نتمنى لكم دوام التوفيق والبركة في أعمالكم 🌹
لأي استفسار أو دعم فني: 770834754`;

  console.log(waMessage);
  console.log('======================================================================\n');
}

async function runInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n======================================================================');
  console.log('   🛠️  مولد مفاتيح وتراخيص نظام سريع وبنشر PRO (Yemen)');
  console.log('======================================================================\n');

  try {
    let mid = await ask('1. أدخل كود جهاز العميل (Machine ID مثل ALB-PT75-Z9MW-F76G): ');
    while (!mid || mid.trim().length < 8) {
      console.log('⚠️ كود الجهاز مطلوب ومكون من مقاطع تبدأ بـ ALB');
      mid = await ask('أدخل كود جهاز العميل: ');
    }

    const shop = await ask('2. أدخل اسم ورشة/مركز العميل (افتراضي: المركز الذهبي): ');
    const daysStr = await ask('3. عدد أيام الاشتراك (اضغط Enter للاشتراك السنوي 365 يوماً): ');
    const days = parseInt(daysStr, 10) || 365;

    rl.close();

    generateAndPrint({
      mid,
      shop: shop.trim() || 'المركز الذهبي لغيار الزيوت',
      days,
    });
  } catch (e) {
    console.error('خطأ أثناء التوليد:', e);
    rl.close();
  }
}

const cliOpts = parseArgs();
if (cliOpts.mid) {
  generateAndPrint(cliOpts);
} else {
  runInteractive();
}
