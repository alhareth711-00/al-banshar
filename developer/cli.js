#!/usr/bin/env node

/**
 * Al-Banshar PRO - Developer Client & License CLI
 * Usage:
 *   node developer/cli.js           (Lists all clients with status)
 *   node developer/cli.js alerts     (Shows expiring soon or expired workshops)
 *   node developer/cli.js renew <id> (Renews client for 1 year and prints WhatsApp text)
 */

const clientRegistry = require('./clientRegistry');
const readline = require('readline');

const args = process.argv.slice(2);
const command = args[0] || 'list';

function printHeader(title) {
  console.log('\n======================================================================');
  console.log(`   🛠️  ${title}`);
  console.log('======================================================================\n');
}

function displayTable(clients) {
  if (clients.length === 0) {
    console.log('لا يوجد عملاء مسجلين حالياً.');
    return;
  }

  console.log(
    'الورشة'.padEnd(30) +
    'المدينة'.padEnd(20) +
    'كود الجهاز (MID)'.padEnd(25) +
    'الحالة'.padEnd(25) +
    'تاريخ الانتهاء'
  );
  console.log('-'.repeat(110));

  clients.forEach((c) => {
    const shop = c.shop_name.length > 28 ? c.shop_name.substring(0, 25) + '...' : c.shop_name;
    const city = (c.city || 'اليمن').substring(0, 18);
    const mid = c.machine_id;
    const status = c.status_label;
    const exp = c.expires_at;

    console.log(
      shop.padEnd(30) +
      city.padEnd(20) +
      mid.padEnd(25) +
      status.padEnd(25) +
      exp
    );
  });
  console.log('='.repeat(110) + '\n');
}

if (command === 'list') {
  printHeader('سجل عملاء وتراخيص نظام سريع وبنشر PRO');
  const clients = clientRegistry.loadClients();
  const stats = clientRegistry.getStats();
  displayTable(clients);
  console.log(`📊 إجمالي الورش: ${stats.total} | 🟢 نشطة: ${stats.active} | 🔔 تنتهي قريباً: ${stats.expiringSoon} | 🛑 منتهية: ${stats.expired}`);
  console.log(`💰 إجمالي رسوم الاشتراكات: ${stats.totalAnnualFees.toLocaleString()} ريال يمني\n`);
} else if (command === 'alerts') {
  printHeader('رادار التجديد: ورش تنتهي اشتراكاتها قريباً أو منتهية');
  const clients = clientRegistry.loadClients().filter(
    (c) => c.status === 'expiring_soon' || c.status === 'grace' || c.status === 'expired'
  );
  displayTable(clients);
  if (clients.length > 0) {
    console.log('💡 قم بالتواصل مع هذه الورش على الواتساب لتحصيل رسوم التجديد السنوي.');
  } else {
    console.log('✅ جميع الورش الحالية اشتراكاتها سارية لأكثر من 15 يوماً!');
  }
} else if (command === 'renew' && args[1]) {
  const targetId = args[1];
  try {
    const updated = clientRegistry.renewClient(targetId, { days: 365, payment_status: 'paid' });
    printHeader(`تم تجديد اشتراك: ${updated.shop_name} بنجاح!`);
    console.log(`🔑 المفتاح الجديد: ${updated.license_key}`);
    console.log(`⏳ صالح حتى: ${updated.expires_at}\n`);
    console.log('📲 رسالة الواتساب الجاهزة للإرسال:');
    console.log('-'.repeat(70));
    console.log(updated.whatsapp_text);
    console.log('-'.repeat(70) + '\n');
  } catch (err) {
    console.error('❌ خطأ في التجديد:', err.message);
  }
} else {
  console.log('أوامر لوحة المطور المتاحة:');
  console.log('  node developer/cli.js list         (عرض قائمة كل الورش)');
  console.log('  node developer/cli.js alerts       (عرض الورش التي قاربت على الانتهاء)');
  console.log('  node developer/cli.js renew <id>   (تجديد اشتراك ورشة لسنة كاملة)');
}
