import React, { useState, useEffect } from 'react';
import { X, Car, Calendar, Gauge, History, Droplets, Wrench, CheckCircle, RotateCcw, AlertTriangle, User, Phone, DollarSign, MessageSquare } from 'lucide-react';
import { generateOilReminderUrl } from '../utils/settings';

export default function VehicleHistoryDrawer({
  isOpen,
  onClose,
  vehicleId,
  onRepeatService,
}) {
  const [vehicleData, setVehicleData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && vehicleId) {
      fetchVehicleHistory();
    }
  }, [isOpen, vehicleId]);

  const fetchVehicleHistory = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/vehicles/${vehicleId}`);
      const json = await res.json();
      if (json.success) {
        setVehicleData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch vehicle history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const history = vehicleData?.history || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="apple-glass border-r border-white/20 w-full max-w-lg h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 bg-slate-950/95">
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">سجل زيارات وخدمات المركبة</h3>
              <p className="text-xs text-slate-400">تتبع الزيارات السابقة، والعدادات، والأصناف المستخدمة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle Quick Summary Card */}
        {vehicleData && (
          <div className="p-4 border-b border-white/10 bg-slate-900/60 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm">{vehicleData.car_make_model}</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono px-2 py-0.5 rounded-lg font-bold">
                  {vehicleData.plate_number} ({vehicleData.plate_type})
                </span>
              </div>
              <div className="text-left font-mono">
                <span className="text-[11px] text-slate-400">الزيارات: </span>
                <span className="text-emerald-400 font-bold">{history.length} زيارة</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{vehicleData.customer_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{vehicleData.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>آخر عداد: {Number(vehicleData.last_odometer).toLocaleString()} كم</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>الدين: {Number(vehicleData.balance_due).toLocaleString()} ر.ي</span>
              </div>
            </div>

            {/* Direct WhatsApp Oil Reminder Action (الجزء الرابع: رادار استعادة الزبائن) */}
            {vehicleData.phone && (
              <div className="mt-3 pt-2.5 border-t border-white/10">
                <a
                  href={generateOilReminderUrl({
                    phone: vehicleData.phone,
                    customerName: vehicleData.customer_name,
                    carModel: vehicleData.car_make_model,
                    plateNumber: vehicleData.plate_number,
                    nextOdometer: Number(vehicleData.last_odometer || 0) + 3000,
                    preferredOil: vehicleData.preferred_oil_brand ? `${vehicleData.preferred_oil_brand} (${vehicleData.preferred_viscosity || ''})` : '',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>إرسال تذكير واتساب لموعد الزيت القادم 📲</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Invoices History List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs">
              جاري تحميل سجل الفواتير السابقة...
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Car className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-sm">هذه أول زيارة للمركبة في المركز</p>
              <p className="text-xs text-slate-500 mt-1">لا توجد أي فواتير سابقة مسجلة عليها بعد</p>
            </div>
          ) : (
            history.map((inv, idx) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-2.5 hover:border-amber-500/30 transition"
              >
                {/* Header: Date, Invoice#, Odo */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
                  <div>
                    <span className="font-bold text-white font-mono">{inv.invoice_number}</span>
                    <span className="text-slate-400 text-[11px] mr-2">
                      {inv.created_at ? inv.created_at.split(' ')[0] : ''}
                    </span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[11px] text-amber-400 font-bold">
                      {Number(inv.current_odometer).toLocaleString()} كم
                    </span>
                    {inv.next_odometer > 0 && (
                      <span className="text-slate-500 text-[10px] block">
                        (القادم: {Number(inv.next_odometer).toLocaleString()} كم)
                      </span>
                    )}
                  </div>
                </div>

                {/* Items in this invoice */}
                <div className="space-y-1">
                  {(inv.items || []).map((it, itemIdx) => (
                    <div key={itemIdx} className="text-xs flex items-center justify-between font-mono">
                      <span className="text-slate-300 truncate max-w-[240px]">
                        • {it.description} <span className="text-slate-500 text-[11px]">(×{it.qty})</span>
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {Number(it.subtotal || it.unit_price * it.qty).toLocaleString()} ر.ي
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Footer & Repeat Service Button */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="font-mono">
                    <span className="text-slate-400 text-[11px]">الإجمالي: </span>
                    <span className="font-bold text-white">{Number(inv.net_total).toLocaleString()} ر.ي</span>
                    <span className="text-[10px] text-slate-500 mr-2">({inv.payment_method})</span>
                  </div>

                  {/* One-Click Copy / Repeat Service into Cart (Editable & Extendable) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onRepeatService && inv.items && inv.items.length > 0) {
                        onRepeatService(inv.items);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                    title="نسخ هذه الأصناف للسلة الحالية مع إمكانية التعديل والإضافة عليها بحرية"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>تكرار هذه الخدمة في السلة 🔄</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
