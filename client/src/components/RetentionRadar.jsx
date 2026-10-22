import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  AlertTriangle,
  Clock,
  MessageSquare,
  Car,
  Check,
  Calendar,
  ArrowLeft,
  DollarSign,
  Search,
  History,
  TrendingUp,
  X,
  CreditCard,
  CheckCircle2,
  Building2,
  Printer,
  Sparkles,
  Phone,
  Gauge,
  Percent,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getShopSettings, formatYemeniWhatsAppLink } from '../utils/settings';

export default function RetentionRadar({ onSelectVehicleForPos }) {
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'fleets' | 'debts' | 'all_vehicles'
  const [radarItems, setRadarItems] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [corporateAccounts, setCorporateAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all'); // 'all' | 'critical' | 'due_now' | 'fleets' | 'reminded_today'
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState(null);
  const [remindedVehicles, setRemindedVehicles] = useState({}); // { [vehicleId]: timestamp }

  const settings = getShopSettings();

  // Load reminded vehicles log from localStorage as backup
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quick_lube_reminded_vehicles');
      if (saved) {
        setRemindedVehicles(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchRadarData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Radar
      const radRes = await fetch('/api/retention-radar');
      const radData = await radRes.json();
      if (radData.success) {
        setRadarItems(radData.data || []);
      }

      // 2. Fetch Corporate Accounts (Upgrade 3)
      const corpRes = await fetch('/api/vehicles/corporate-accounts');
      const corpData = await corpRes.json();
      if (corpData.success) {
        setCorporateAccounts(corpData.data || []);
      }

      // 3. Fetch All Vehicles
      const vehRes = await fetch('/api/vehicles');
      const vehData = await vehRes.json();
      if (vehData.success) {
        setAllVehicles(vehData.data || []);
      }
    } catch (err) {
      console.error('Error fetching retention radar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, []);

  // Mark vehicle as reminded and persist to database (Upgrade 4)
  const handleSendReminder = async (item) => {
    const timeStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
    const updated = { ...remindedVehicles, [item.vehicle_id]: timeStr };
    setRemindedVehicles(updated);
    try {
      localStorage.setItem('quick_lube_reminded_vehicles', JSON.stringify(updated));
      await fetch(`/api/vehicles/${item.vehicle_id}/log-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_type: 'whatsapp',
          odometer: item.estimated_current_odometer || item.last_odometer,
          notes: item.reason || 'تذكير خدمة 3,000 كم الدوري',
        }),
      });
    } catch (err) {
      console.warn('Logging reminder warning:', err);
    }
  };

  // Fetch full vehicle history
  const handleOpenHistory = async (vehicleId) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedVehicleHistory(data.data);
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  // Top KPIs calculations
  const criticalCount = radarItems.filter((i) => i.urgency_level === 'critical' || (i.days_diff !== null && i.days_diff < 0)).length;
  const dueNowCount = radarItems.filter((i) => i.status === 'due_soon').length;
  const corporateVehiclesCount = radarItems.filter((i) => i.customer_type !== 'individual').length;
  const expectedRecoverableRevenue = (criticalCount + dueNowCount) * 28000; // Average ticket ~28,000 YER

  // Filtered radar items with urgency and search
  const filteredRadar = useMemo(() => {
    return radarItems.filter((item) => {
      // Urgency filter
      if (urgencyFilter === 'critical' && item.urgency_level !== 'critical' && !(item.days_diff !== null && item.days_diff < 0)) return false;
      if (urgencyFilter === 'due_now' && item.status !== 'due_soon') return false;
      if (urgencyFilter === 'fleets' && item.customer_type === 'individual') return false;
      if (urgencyFilter === 'reminded_today' && !remindedVehicles[item.vehicle_id] && !item.last_reminded_at) return false;

      // Search term
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        item.customer_name.toLowerCase().includes(s) ||
        item.plate_number.toLowerCase().includes(s) ||
        item.phone.toLowerCase().includes(s) ||
        (item.corporate_name && item.corporate_name.toLowerCase().includes(s)) ||
        item.car_make_model.toLowerCase().includes(s)
      );
    });
  }, [radarItems, searchTerm, urgencyFilter, remindedVehicles]);

  // Filtered debts
  const debtVehicles = useMemo(() => {
    return allVehicles.filter(
      (v) =>
        Number(v.balance_due) > 0 &&
        (!searchTerm ||
          v.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (v.corporate_name && v.corporate_name.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [allVehicles, searchTerm]);

  // Filtered all vehicles
  const filteredAllVehicles = useMemo(() => {
    return allVehicles.filter((v) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        v.customer_name.toLowerCase().includes(s) ||
        v.plate_number.toLowerCase().includes(s) ||
        v.car_make_model.toLowerCase().includes(s) ||
        (v.corporate_name && v.corporate_name.toLowerCase().includes(s)) ||
        v.phone.includes(s)
      );
    });
  }, [allVehicles, searchTerm]);

  // Helper to generate WhatsApp URL from item custom message
  const getWhatsAppUrl = (item) => {
    const msg = item.custom_whatsapp_message || `السلام عليكم ورحمة الله أستاذ ${item.customer_name}، نود تذكيركم بموعد خدمة تغيير الزيت لسيارتكم (${item.plate_number}) عند العداد ${item.next_due_odometer || 3000} كم. يسعدنا تشريفكم في مركز ${settings.shopName}.`;
    return formatYemeniWhatsAppLink(item.phone, msg);
  };

  const getDebtWhatsAppUrl = (v) => {
    const msg = `مرحباً بك أستاذ ${v.customer_name} في مركز ${settings.shopName} 🚗\nنود إحاطتكم بوجود رصيد آجل مستحق لخدمة سيارتكم (${v.plate_number}) بمبلغ (${Number(v.balance_due).toLocaleString()} ر.ي).\nشاكرين ومقدرين تعاونكم الدائم معنا 🌹`;
    return formatYemeniWhatsAppLink(v.phone, msg);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 sm:p-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header & Pro Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>رادار المتابعة والتذكير التلقائي (3,000 كم)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 font-mono">
                  PRO DISPATCHER
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع استهلاك الكيلومترات، إرسال تذكيرات الواتساب الاستباقية، وإدارة أسعار أساطيل الشركات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الكشف</span>
          </button>

          <button
            type="button"
            onClick={fetchRadarData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>تحديث الرادار</span>
          </button>
        </div>
      </div>

      {/* 2. Top Diagnostic KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Critical Overdue */}
        <div className="apple-glass-card rounded-2xl p-4 border border-rose-500/30 bg-rose-950/20">
          <div className="flex items-center justify-between text-rose-300 text-xs font-bold mb-1">
            <span>متأخرة جداً (حرجة):</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">
            {criticalCount} <span className="text-xs font-sans text-rose-300/80">سيارة</span>
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1">تجاوزت موعد أو مسافة التغيير</div>
        </div>

        {/* Card 2: Due Soon (Within 7 Days / 3000 km) */}
        <div className="apple-glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-300 text-xs font-bold mb-1">
            <span>مستحقة هذا الأسبوع:</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {dueNowCount} <span className="text-xs font-sans text-amber-300/80">سيارة</span>
          </div>
          <div className="text-[11px] text-amber-300/80 mt-1">على وشك إتمام 3,000 كم</div>
        </div>

        {/* Card 3: Recoverable Revenue */}
        <div className="apple-glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-1">
            <span>عائد متوقع استرداده:</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {expectedRecoverableRevenue.toLocaleString()} <span className="text-xs font-sans text-emerald-300/80">ر.ي</span>
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">عند عودة السيارات للتغيير</div>
        </div>

        {/* Card 4: Corporate Fleets */}
        <div className="apple-glass-card rounded-2xl p-4 border border-indigo-500/30 bg-indigo-950/20">
          <div className="flex items-center justify-between text-indigo-300 text-xs font-bold mb-1">
            <span>أساطيل وشركات مسجلة:</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-400">
            {corporateAccounts.length} <span className="text-xs font-sans text-indigo-300/80">جهة</span>
          </div>
          <div className="text-[11px] text-indigo-300/80 mt-1">تضم {allVehicles.filter(v => v.customer_type !== 'individual').length} مركبة بتسعير أسطول</div>
        </div>
      </div>

      {/* 3. Navigation Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'radar'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>رادار التذكير التلقائي ({radarItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fleets')}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'fleets'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>أساطيل الشركات والتسعير ({corporateAccounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debts')}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'debts'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>ديون العملاء للتحصيل ({debtVehicles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_vehicles')}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all_vehicles'
                ? 'bg-white/20 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>دليل جميع المركبات ({allVehicles.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="ابحث بالاسم، اللوحة، الشركة، أو الجوال..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[40px] pr-9 pl-3 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-amber-400"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* 4. TAB 1: RADAR / PREDICTIVE REMINDER DISPATCHER */}
      {activeTab === 'radar' && (
        <div className="space-y-3">
          {/* Urgency Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold text-slate-400 pb-1">
            <span className="text-[11px] text-slate-500 ml-1">تصفية القائمة:</span>
            {[
              { id: 'all', label: `الكل (${radarItems.length})` },
              { id: 'critical', label: `🔴 حرجة جداً (${criticalCount})` },
              { id: 'due_now', label: `🟠 مستحقة الآن (${dueNowCount})` },
              { id: 'fleets', label: `🏢 أساطيل وشركات (${corporateVehiclesCount})` },
              { id: 'reminded_today', label: `✅ تم تذكيرها اليوم` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setUrgencyFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  urgencyFilter === f.id
                    ? 'bg-white/20 text-white border border-white/20 shadow-sm'
                    : 'bg-slate-900/60 hover:bg-white/10 text-slate-400 border border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredRadar.length === 0 ? (
            <div className="apple-glass rounded-3xl p-12 text-center text-slate-400 border border-white/10">
              <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-extrabold text-lg text-white">ممتاز! لا توجد سيارات مطابقة لهذه التصفية</h3>
              <p className="text-xs text-slate-400 mt-1">جميع المركبات في جدول منتظم وسليم</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRadar.map((item) => {
                const isOverdue = item.status === 'overdue' || item.urgency_level === 'critical';
                const wasRemindedToday = remindedVehicles[item.vehicle_id];

                return (
                  <div
                    key={item.vehicle_id}
                    className={`apple-glass-card rounded-3xl p-5 border flex flex-col justify-between transition-all hover:scale-[1.01] ${
                      isOverdue
                        ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/30 to-slate-900/90 shadow-lg shadow-rose-950/20'
                        : 'border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900/90 shadow-lg shadow-amber-950/20'
                    }`}
                  >
                    <div>
                      {/* Top Badges: Status & Plate */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isOverdue
                              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-rose-400 animate-pulse' : 'bg-amber-400'}`} />
                          {item.status_label}
                        </span>

                        <span className="font-mono font-extrabold text-sm text-white px-2.5 py-1 rounded-xl bg-slate-950/80 border border-white/15">
                          {item.plate_number}
                        </span>
                      </div>

                      {/* Customer Name & Corporate Badge */}
                      <div className="mb-2">
                        <h3 className="text-base font-extrabold text-white flex items-center justify-between">
                          <span>{item.customer_name}</span>
                          {item.corporate_name && (
                            <span className="text-[11px] px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>{item.corporate_name}</span>
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.car_make_model} &bull; <span className="font-mono">{item.phone}</span></span>
                        </p>
                      </div>

                      {/* Alert Reason & Predictive Pace */}
                      <div className={`p-3 rounded-2xl mb-3 text-xs ${
                        isOverdue
                          ? 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                      }`}>
                        <div className="font-extrabold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>سبب التنبيه:</span>
                        </div>
                        <div className="mt-1 font-semibold leading-relaxed">{item.reason}</div>
                      </div>

                      {/* Odometer Calculations & Recommended Oil */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-3">
                        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-0.5">
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Gauge className="w-3 h-3 text-blue-400" />
                            <span>العداد المقترح (+3,000):</span>
                          </div>
                          <div className="font-mono font-bold text-amber-300">
                            {Number(item.next_due_odometer).toLocaleString()} كم
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-0.5">
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>معدل الاستهلاك:</span>
                          </div>
                          <div className="font-mono font-bold text-white">
                            ~{item.daily_km_pace || 40} كم / يوم
                          </div>
                        </div>
                      </div>

                      {/* Preferred Oil & Viscosity */}
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 flex justify-between items-center mb-3">
                        <span className="text-slate-400">الزيت المعتمد:</span>
                        <span className="font-bold text-white">
                          {item.preferred_oil_brand} ({item.preferred_viscosity})
                        </span>
                      </div>

                      {/* Reminder Sent Badge */}
                      {(wasRemindedToday || item.last_reminded_at) && (
                        <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>تم إرسال تذكير {wasRemindedToday ? `اليوم (${wasRemindedToday})` : 'مسبقاً'}</span>
                          </div>
                          {item.reminder_sent_count > 0 && (
                            <span className="text-[10px] font-mono text-emerald-400 font-normal">
                              ({item.reminder_sent_count} مرات)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions: Direct WhatsApp Reminder & Open in POS */}
                    <div className="flex gap-2 pt-3 border-t border-white/10">
                      <a
                        href={getWhatsAppUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSendReminder(item)}
                        className="flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/20"
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                        <span>إرسال تذكير واتساب 📲</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onSelectVehicleForPos(item)}
                        className="min-h-[46px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20"
                        title="فتح فاتورة سريعة في الكاشير"
                      >
                        <span>POS</span>
                        <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: CORPORATE FLEETS & PRICING BOOKS (Upgrade 3) */}
      {activeTab === 'fleets' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">دليل أساطيل الشركات والتسعير التفضيلي</h3>
                <p className="text-xs text-slate-400">إدارة العقود المؤسسية، فئات الخصومات، والفوترة الشهرية للأساطيل</p>
              </div>
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-slate-400">إجمالي ديون الشركات: </span>
              <span className="font-bold text-amber-300 text-sm">
                {corporateAccounts.reduce((acc, c) => acc + (c.total_balance_due || 0), 0).toLocaleString()} ر.ي
              </span>
            </div>
          </div>

          {corporateAccounts.length === 0 ? (
            <div className="apple-glass rounded-3xl p-12 text-center text-slate-400 border border-white/10">
              <Building2 className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="font-extrabold text-lg text-white">لا توجد أساطيل شركات مسجلة حتى الآن</h3>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك تسجيل أي سيارة كحساب شركة أو تاكسي أو جهة حكومية مع نسبة خصم من نافذة "تسجيل سيارة جديدة"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {corporateAccounts.map((corp, idx) => (
                <div
                  key={idx}
                  className="apple-glass-card rounded-3xl p-5 border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 to-slate-900/90 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <h4 className="font-extrabold text-base text-white">{corp.corporate_name}</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30 font-mono">
                        {corp.total_vehicles} مركبات
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                        <span className="text-slate-400">نسبة خصم الأسطول:</span>
                        <div className="font-mono font-black text-amber-400 text-sm mt-0.5">
                          {corp.discount_percent || 0}% خصم
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                        <span className="text-slate-400">نظام الفوترة:</span>
                        <div className="font-bold text-white mt-0.5">
                          {corp.billing_cycle === 'monthly' ? 'تجميع شهري 📅' : 'دفع فوري 💵'}
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">الرصيد الآجل القائم:</span>
                        <span className={`font-mono font-bold ${corp.total_balance_due > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {Number(corp.total_balance_due || 0).toLocaleString()} ر.ي
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>سقف الائتمان الممنوح:</span>
                        <span className="font-mono">{Number(corp.credit_limit || 250000).toLocaleString()} ر.ي</span>
                      </div>
                    </div>

                    {corp.plates_list && (
                      <div className="text-[11px] text-slate-400">
                        <span className="font-bold text-slate-300">لوحات الأسطول:</span>
                        <div className="mt-1 font-mono text-indigo-200 bg-slate-950/40 p-2 rounded-xl border border-white/5 max-h-16 overflow-y-auto">
                          {corp.plates_list}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm(corp.corporate_name);
                        setActiveTab('all_vehicles');
                      }}
                      className="flex-1 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition"
                    >
                      استعراض سيارات الأسطول
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: CUSTOMER DEBTS & COLLECTION */}
      {activeTab === 'debts' && (
        <div className="apple-glass rounded-3xl border border-white/10 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-amber-500/10">
            <div>
              <div className="font-extrabold text-sm text-amber-300">متابعة وتحصيل الديون والذمم الآجلة</div>
              <div className="text-xs text-slate-400 mt-0.5">
                إجمالي الديون المعلقة في ذمة العملاء:{' '}
                <span className="font-mono font-bold text-rose-400">
                  {debtVehicles.reduce((acc, d) => acc + Number(d.balance_due), 0).toLocaleString()} ر.ي
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-extrabold sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="p-3.5">العميل والجوال</th>
                  <th className="p-3.5">السيارة واللوحة</th>
                  <th className="p-3.5">نوع الحساب / الأسطول</th>
                  <th className="p-3.5">مبلغ الدين الآجل</th>
                  <th className="p-3.5 text-center">إشعار الرصيد عبر واتساب</th>
                  <th className="p-3.5 text-center">إجراء الخدمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {debtVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-white/5 transition">
                    <td className="p-3.5">
                      <div className="font-extrabold text-white text-sm">{v.customer_name}</div>
                      <div className="font-mono text-slate-400">{v.phone}</div>
                    </td>
                    <td className="p-3.5">
                      <div>{v.car_make_model}</div>
                      <div className="font-mono text-amber-300">{v.plate_number}</div>
                    </td>
                    <td className="p-3.5">
                      {v.corporate_name ? (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-[11px]">
                          {v.corporate_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">فردي</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-black text-rose-400 text-base">
                      {Number(v.balance_due).toLocaleString()} ر.ي
                    </td>
                    <td className="p-3.5 text-center">
                      <a
                        href={getDebtWhatsAppUrl(v)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        <span>إرسال إشعار رصيد 📲</span>
                      </a>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectVehicleForPos(v)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition active:scale-95"
                      >
                        فتح POS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 4: ALL VEHICLES DIRECTORY */}
      {activeTab === 'all_vehicles' && (
        <div className="apple-glass rounded-3xl border border-white/10 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-extrabold sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="p-3.5">اللوحة ونوعها</th>
                  <th className="p-3.5">العميل والجوال</th>
                  <th className="p-3.5">نوع الحساب والخصم</th>
                  <th className="p-3.5">السيارة والزيت المعتاد</th>
                  <th className="p-3.5 text-center">آخر عداد مسجل</th>
                  <th className="p-3.5 text-center">رصيد الدين</th>
                  <th className="p-3.5 text-center">سجل الصيانة</th>
                  <th className="p-3.5 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredAllVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-white/5 transition">
                    <td className="p-3.5">
                      <div className="font-mono font-extrabold text-sm text-white">{v.plate_number}</div>
                      <div className="text-[11px] text-slate-400">{v.plate_type || 'خصوصي'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm">{v.customer_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{v.phone}</div>
                    </td>
                    <td className="p-3.5">
                      {v.corporate_name ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-[11px] block w-fit">
                            {v.corporate_name}
                          </span>
                          {Number(v.discount_percent) > 0 && (
                            <span className="text-[10px] text-amber-300 font-mono font-bold">
                              خصم {v.discount_percent}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">فردي</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div>{v.car_make_model}</div>
                      <div className="text-[11px] text-amber-300 font-semibold">
                        {v.preferred_oil_brand} ({v.preferred_viscosity})
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      {v.last_odometer ? `${Number(v.last_odometer).toLocaleString()} كم` : '---'}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      {Number(v.balance_due) > 0 ? (
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          {Number(v.balance_due).toLocaleString()} ر.ي
                        </span>
                      ) : (
                        <span className="text-emerald-400">0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(v.id)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1 mx-auto transition"
                      >
                        <History className="w-3.5 h-3.5 text-blue-400" />
                        <span>سجل الزيارات</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectVehicleForPos(v)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1 mx-auto transition active:scale-95"
                      >
                        <span>فتح POS</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. Vehicle Maintenance History Modal */}
      {selectedVehicleHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    سجل صيانة سيارة {selectedVehicleHistory.plate_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedVehicleHistory.customer_name} &bull; {selectedVehicleHistory.car_make_model}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVehicleHistory(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs flex-1">
              {(selectedVehicleHistory.history || []).length === 0 ? (
                <div className="text-center py-8 text-slate-500">لا توجد زيارات سابقة مسجلة</div>
              ) : (
                selectedVehicleHistory.history.map((inv) => (
                  <div key={inv.id} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="font-mono font-bold text-amber-300">{inv.invoice_number}</span>
                      <span className="text-slate-400 font-mono">{inv.created_at}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>العداد المسجل: <span className="font-mono font-bold">{Number(inv.current_odometer).toLocaleString()} كم</span></div>
                      <div>الفني المنفذ: <span className="font-bold text-white">{inv.worker_name || 'المركز'}</span></div>
                    </div>
                    <div className="space-y-1 pt-1">
                      {(inv.items || []).map((it, i) => (
                        <div key={i} className="flex justify-between text-slate-400 text-[11px]">
                          <span>• {it.description} (×{it.qty})</span>
                          <span className="font-mono">{(it.qty * it.unit_price).toLocaleString()} ر.ي</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-white/5 flex justify-between font-extrabold text-white text-xs">
                      <span>الصافي: {Number(inv.net_total).toLocaleString()} ر.ي</span>
                      <span className="text-emerald-400">{inv.payment_method}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
