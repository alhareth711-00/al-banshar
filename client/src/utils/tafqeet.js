/**
 * تفقيط الأرقام إلى نصوص باللغة العربية مع دعم الريال اليمني
 * Tafqeet Utility for Financial Vouchers and Invoices
 */

const ones = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const tens = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const hundreds = [
  '',
  'مائة',
  'مئتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertBelowThousand(n) {
  if (n === 0) return '';
  let str = '';

  const h = Math.floor(n / 100);
  const rem = n % 100;

  if (h > 0) {
    str += hundreds[h];
  }

  if (rem > 0) {
    if (str.length > 0) str += ' و';
    if (rem < 20) {
      str += ones[rem];
    } else {
      const o = rem % 10;
      const t = Math.floor(rem / 10);
      if (o > 0) {
        str += ones[o] + ' و' + tens[t];
      } else {
        str += tens[t];
      }
    }
  }

  return str;
}

export function tafqeet(amount, currency = 'ريال يمني') {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return `صفر ${currency} فقط لا غير`;
  if (num < 0) return `سالب ${tafqeet(Math.abs(num), currency)}`;

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  const parts = [];

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertBelowThousand(millions)} ملايين`);
    else parts.push(`${convertBelowThousand(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertBelowThousand(thousands)} آلاف`);
    else parts.push(`${convertBelowThousand(thousands)} ألف`);
  }

  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  return `فقط وقدره ${parts.join(' و')} ${currency} لا غير`;
}
