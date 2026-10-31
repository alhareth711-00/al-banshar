import React from 'react';
import { getShopSettings } from '../utils/settings';
import { tafqeet } from '../utils/tafqeet';

export default function VoucherPrintTemplate({ voucher, mode = 'thermal' }) {
  if (!voucher) return null;

  const settings = getShopSettings();
  const isReceipt = voucher.voucher_type === 'receipt';
  const isVoided = voucher.status === 'voided';
  const amount = Number(voucher.amount || 0);
  const tafqeetText = tafqeet(amount);

  const getPaymentMethodName = (method) => {
    switch (method) {
      case 'kuraimi':
        return 'حساب بنك الكريمي (1102)';
      case 'jeeb':
        return 'محفظة جيب الإلكترونية (1103)';
      case 'jawali':
        return 'محفظة جوالي الإلكترونية (1104)';
      case 'onecash':
        return 'محفظة ون كاش (1105)';
      case 'bank':
        return 'تحويل بنكي رسمي';
      case 'cash':
      default:
        return 'نقداً من الصندوق الرئيسي (1101)';
    }
  };

  const getPartyLabel = () => {
    if (isReceipt) {
      return voucher.party_type === 'customer' ? 'المستلم منه (العميل)' : 'المستلم منه';
    }
    switch (voucher.party_type) {
      case 'supplier':
        return 'يصرف للمورد';
      case 'worker':
        return 'يصرف للفني / العامل';
      case 'owner':
        return 'مسحوبات جاري المالك';
      case 'expense':
        return 'المصروف في جهة';
      default:
        return 'يصرف إلى';
    }
  };

  if (mode === 'thermal') {
    return (
      <div className="w-[80mm] max-w-[80mm] mx-auto p-4 bg-white text-black font-sans text-xs leading-relaxed print:p-0 print:m-0 print:w-full">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
          <h2 className="text-base font-black tracking-wide">{settings.shopName}</h2>
          <p className="text-[10px] text-gray-600 mt-0.5">{settings.address}</p>
          <p className="text-[10px] font-mono font-bold text-gray-700 mt-0.5">
            هاتف المركز: {settings.shopPhone}
          </p>
          <div className="mt-2 inline-block px-3 py-1 bg-black text-white font-black text-xs rounded">
            {isReceipt ? 'سند قبض نقدية (رسمي)' : 'سند صرف نقدية (رسمي)'}
          </div>
          {isVoided && (
            <div className="mt-1 text-red-600 font-black text-sm border-2 border-red-600 py-0.5 px-2 uppercase tracking-widest">
              *** سند ملغي (VOIDED) ***
            </div>
          )}
        </div>

        {/* Voucher Metadata */}
        <div className="space-y-1.5 text-[11px] border-b border-dashed border-gray-300 pb-2 mb-2 font-mono">
          <div className="flex justify-between">
            <span className="text-gray-600">رقم السند:</span>
            <span className="font-bold">{voucher.voucher_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">التاريخ:</span>
            <span>
              {new Date(voucher.created_at).toLocaleString('ar-YE', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          </div>
          {voucher.paper_bill_number && (
            <div className="flex justify-between">
              <span className="text-gray-600">المرجع / رقم الدفتر:</span>
              <span className="font-bold">{voucher.paper_bill_number}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">طريقة الدفع:</span>
            <span className="font-bold">{getPaymentMethodName(voucher.payment_method)}</span>
          </div>
        </div>

        {/* Party and Amount */}
        <div className="space-y-2 border-b-2 border-dashed border-gray-400 pb-3 mb-3">
          <div>
            <span className="text-[10px] text-gray-500 block">{getPartyLabel()}:</span>
            <span className="font-black text-xs block text-gray-900">{voucher.party_name}</span>
          </div>

          <div className="bg-gray-100 p-2 rounded text-center border border-gray-200">
            <span className="text-[10px] text-gray-600 block">المبلغ المدفوع / المستلم:</span>
            <span className="text-base font-black font-mono text-black">
              {amount.toLocaleString()} ريال يمني
            </span>
            <span className="text-[10px] text-gray-700 block mt-1 font-bold">
              فقط {tafqeetText}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-gray-500 block">البيان:</span>
            <p className="text-[11px] text-gray-800 leading-snug">{voucher.description}</p>
          </div>

          {/* Multiline Breakdown if present */}
          {voucher.items && voucher.items.length > 0 && (
            <div className="mt-2 border-t border-gray-200 pt-1">
              <span className="text-[10px] font-bold text-gray-600 block mb-1">تفاصيل البنود:</span>
              <table className="w-full text-[10px] text-right">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-0.5">البند</th>
                    <th className="py-0.5 text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-0.5">{it.category_name || it.description}</td>
                      <td className="py-0.5 text-left font-mono">
                        {Number(it.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Customer / Supplier Balances */}
          {(Number(voucher.prev_balance) > 0 || Number(voucher.new_balance) > 0) && (
            <div className="bg-gray-50 p-1.5 rounded text-[10px] font-mono flex justify-between border border-gray-200">
              <span>الرصيد السابق: {Number(voucher.prev_balance || 0).toLocaleString()}</span>
              <span className="font-bold">المتبقي: {Number(voucher.new_balance || 0).toLocaleString()} ر.ي</span>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-2 mb-4 border-t border-gray-200">
          <div>
            <span className="text-gray-500 block">أمين الصندوق</span>
            <span className="font-bold block mt-3">{voucher.created_by || 'الكاشير'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">توقيع المستلم / الطرف</span>
            <div className="h-6 border-b border-gray-300 mt-1"></div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-gray-500 border-t border-dashed border-gray-300 pt-2 font-mono">
          <p>شكراً لتعاملكم مع {settings.shopName}</p>
          <p className="mt-0.5">نظام سريع وبنشر PRO — إصدار سحابي محلي</p>
        </div>
      </div>
    );
  }

  // Formal A4 / Half-A4 (A5 Landscape) Official Voucher
  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white text-black font-sans leading-relaxed border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0">
      {/* Official Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
        <div>
          <h1 className="text-lg font-black text-gray-900">{settings.shopName}</h1>
          <p className="text-xs text-gray-600 mt-1">{settings.address}</p>
          <p className="text-xs font-mono font-bold text-gray-700">هاتف: {settings.shopPhone}</p>
        </div>

        <div className="text-center">
          <div className="inline-block px-5 py-2 bg-slate-900 text-white font-black text-sm rounded-lg shadow-sm">
            {isReceipt ? 'سند قـبـض رسمي' : 'سند صـرف رسمي'}
          </div>
          <div className="mt-1 font-mono text-xs font-bold text-gray-700">
            RECEIPT / DISBURSEMENT VOUCHER
          </div>
          {isVoided && (
            <div className="mt-1 text-red-600 font-black text-xs border border-red-600 px-2 py-0.5 rounded">
              سند ملغي / لا يعتد به
            </div>
          )}
        </div>

        <div className="text-left font-mono text-xs space-y-1">
          <div>
            <span className="text-gray-500">رقم السند: </span>
            <span className="font-bold text-gray-900">{voucher.voucher_number}</span>
          </div>
          <div>
            <span className="text-gray-500">التاريخ: </span>
            <span>
              {new Date(voucher.created_at).toLocaleDateString('ar-YE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          {voucher.paper_bill_number && (
            <div>
              <span className="text-gray-500">الدفتر اليدوي: </span>
              <span className="font-bold">{voucher.paper_bill_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Form Box */}
      <div className="border border-gray-300 rounded-lg p-4 space-y-4 mb-4">
        <div className="grid grid-cols-3 gap-4 pb-3 border-b border-gray-200">
          <div className="col-span-2">
            <span className="text-xs text-gray-500 block mb-0.5">{getPartyLabel()}:</span>
            <span className="text-sm font-black text-gray-900">{voucher.party_name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">طريقة القبض / الصرف:</span>
            <span className="text-xs font-bold text-gray-800">
              {getPaymentMethodName(voucher.payment_method)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pb-3 border-b border-gray-200 items-center">
          <div>
            <span className="text-xs text-gray-500 block mb-0.5">المبلغ رقماً:</span>
            <span className="text-lg font-black font-mono text-gray-900">
              {amount.toLocaleString()} <span className="text-xs font-normal">ريال يمني</span>
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-gray-500 block mb-0.5">المبلغ كتابةً (تفقيط):</span>
            <span className="text-xs font-bold text-gray-900 bg-gray-50 p-2 rounded block border border-gray-200">
              فقط {tafqeetText}
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs text-gray-500 block mb-0.5">وذلك مقابل (البيان):</span>
          <p className="text-xs text-gray-800 leading-relaxed font-medium bg-gray-50 p-2.5 rounded border border-gray-200">
            {voucher.description}
          </p>
        </div>

        {/* Multiline Items if any */}
        {voucher.items && voucher.items.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-bold text-gray-700 block mb-1">تفاصيل البنود والمصاريف:</span>
            <table className="w-full text-xs text-right border border-gray-200">
              <thead className="bg-gray-100 text-gray-600 font-bold">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">فئة المصروف / البند</th>
                  <th className="p-2 border">التفاصيل</th>
                  <th className="p-2 border text-left">المبلغ (ر.ي)</th>
                </tr>
              </thead>
              <tbody>
                {voucher.items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 border text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border font-bold">{it.category_name || '-'}</td>
                    <td className="p-2 border text-gray-700">{it.description || '-'}</td>
                    <td className="p-2 border text-left font-mono font-bold">
                      {Number(it.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Balances Notice */}
        {(Number(voucher.prev_balance) > 0 || Number(voucher.new_balance) > 0) && (
          <div className="flex justify-between items-center text-xs p-2 bg-amber-50 text-amber-900 rounded border border-amber-200 font-mono">
            <span>الرصيد الدفتري قبل السند: {Number(voucher.prev_balance || 0).toLocaleString()} ر.ي</span>
            <span className="font-black">
              الرصيد المستحق بعد السند: {Number(voucher.new_balance || 0).toLocaleString()} ر.ي
            </span>
          </div>
        )}
      </div>

      {/* Official Signatures Grid */}
      <div className="grid grid-cols-3 gap-6 text-center text-xs pt-4 border-t-2 border-gray-800">
        <div className="space-y-12">
          <span className="font-bold text-gray-700 block">المستلم / المسلّم</span>
          <div className="border-b border-gray-400"></div>
        </div>
        <div className="space-y-12">
          <span className="font-bold text-gray-700 block">أمين الصندوق (الكاشير)</span>
          <div className="border-b border-gray-400 font-mono font-bold text-gray-900">
            {voucher.created_by || 'أمين الصندوق'}
          </div>
        </div>
        <div className="space-y-12">
          <span className="font-bold text-gray-700 block">اعتماد الإدارة العامة</span>
          <div className="border-b border-gray-400"></div>
        </div>
      </div>
    </div>
  );
}
