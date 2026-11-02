const os = require('os');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const ip = getLocalIp();
const port = process.env.PORT || 5000;
const url = `http://${ip}:${port}`;

console.log('======================================================================');
console.log('   📱 رابط فتح نظام سريع وبنشر من أجهزة الجوال والتابلت (الشبكة المحلية)');
console.log('======================================================================');
console.log('');
console.log('  🌐 الرابط المباشر للمتصفح:');
console.log(`     👉  ${url}`);
console.log('');
console.log('  📌 خطوات الاستخدام من الجوال أو تابلت الحفرة:');
console.log('     1. تأكد أن الهاتف متصل بنفس شبكة الواي فاي (Wi-Fi) الخاصة بالمركز.');
console.log(`     2. افتح متصفح كروم أو سفاري واكتب الرابط: ${url}`);
console.log('     3. (اختياري) اختر "إضافة إلى الشاشة الرئيسية" ليصبح كأنه تطبيق جوال.');
console.log('');
console.log('======================================================================');
