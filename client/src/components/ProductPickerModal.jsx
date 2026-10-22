import React, { useState, useMemo } from 'react';
import { X, Search, Check, Disc, Battery, Sparkles, Plus, Wrench, Droplets, Save, Loader2, Layers } from 'lucide-react';

export default function ProductPickerModal({
  isOpen,
  onClose,
  type = 'all', // 'services' | 'tire_patch' | 'tire_battery' | 'accessories' | 'all'
  inventory = [],
  onAddItemToCart,
  onAddItemsToCart,
  onRefreshData,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [serviceCreateError, setServiceCreateError] = useState('');

  if (!isOpen) return null;

  // Preset quick services with smart breakdown for tire patches
  const defaultServices = [
    {
      id: null,
      name: 'خدمة غيار زيت وفلتر (الزيت من العميل)',
      price: 1500,
      type: 'service',
      desc: 'خدمة يد خالص (الزيوت والفلاتر أحضرها العميل)',
    },
    {
      id: null,
      name: 'رقعة بنشر تيوبلس (شامل الرقعة والتركيب)',
      price: 1000,
      type: 'bundle',
      bundle: [
        { description: 'رقعة تيوبلس (مواد استهلاكية)', qty: 1, unit_price: 200, item_type: 'product' },
        { description: 'خدمة فك وتركيب ورقعة بنشر', qty: 1, unit_price: 800, item_type: 'service' },
      ],
      desc: '200 ر.ي قيمة الرقعة (بضاعة) + 800 ر.ي خدمة بنشر (إيراد خدمات)',
    },
    {
      id: null,
      name: 'رقعة بنشر فطر ممتازة (شامل الفطر والتركيب)',
      price: 2500,
      type: 'bundle',
      bundle: [
        { description: 'رقعة فطر ممتازة ألماني (مواد)', qty: 1, unit_price: 500, item_type: 'product' },
        { description: 'خدمة بنشر ورقعة فطر حراري', qty: 1, unit_price: 2000, item_type: 'service' },
      ],
      desc: '500 ر.ي مواد + 2,000 ر.ي خدمة بنشر',
    },
    {
      id: null,
      name: 'خدمة رقعة بنشر فقط (الرقعة من العميل)',
      price: 800,
      type: 'service',
      desc: 'أتعاب خدمة رقعة وتركيب فقط بدون مواد',
    },
    {
      id: null,
      name: 'ترصيص أرضي ليزر (للكفر الواحد)',
      price: 2000,
      type: 'service',
      desc: 'ترصيص وضبط اتزان كفر فردي',
    },
    {
      id: null,
      name: 'ترصيص كمبيوتر متكامل (4 كفرات)',
      price: 7500,
      type: 'service',
      desc: 'ترصيص الأربعة إطارات كاملة',
    },
    {
      id: null,
      name: 'تشحيم شاسيه ومفاصل وعمود كردان كامل',
      price: 3500,
      type: 'service',
      desc: 'تشحيم شحم أصلي ثقيل لجميع نقاط الشاسيه',
    },
    {
      id: null,
      name: 'فحص كمبيوتر سيارات شامل OBD2 وكشف أعطال',
      price: 5000,
      type: 'service',
      desc: 'فحص كمبيوتر وحساسات ومسح أكواد الأعطال',
    },
    {
      id: null,
      name: 'فك وتركيب وتدوير كفرات',
      price: 2000,
      type: 'service',
      desc: 'تدوير أماكن الإطارات الأربعة لانتظام التآكل',
    },
    {
      id: null,
      name: 'فحص ضغط وتعبئة نيتروجين للسيارة',
      price: 1500,
      type: 'service',
      desc: 'تفريغ هواء وتعبئة غاز نيتروجين عالي النقاوة',
    },
  ];

  // Services from database inventory catalog
  const catalogServices = useMemo(() => {
    return inventory
      .filter((i) => i.is_active === 1 && (i.category === 'service' || i.item_type === 'service'))
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.sell_price) || 0,
        type: 'service',
        brand: s.brand,
        desc: s.notes || 'خدمة مسجلة في الكتالوج',
      }));
  }, [inventory]);

  // Combined services list
  const combinedServices = useMemo(() => {
    const list = [...catalogServices];
    for (const def of defaultServices) {
      if (!list.some((c) => c.name.includes(def.name) || def.name.includes(c.name))) {
        list.push(def);
      }
    }
    return list;
  }, [catalogServices]);

  // Filter products based on active tab/type
  const filteredProducts = inventory.filter((item) => {
    if (type === 'tire_battery') {
      if (item.category !== 'tire' && item.category !== 'battery') return false;
    } else if (type === 'accessories') {
      if (item.category !== 'accessory' && item.category !== 'filter') return false;
    }

    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(s) ||
      (item.brand && item.brand.toLowerCase().includes(s)) ||
      (item.sku && item.sku.toLowerCase().includes(s))
    );
  });

  const filteredServices = combinedServices.filter((srv) => {
    if (!searchTerm) return true;
    return srv.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectService = (srv) => {
    if (srv.type === 'bundle' && srv.bundle && onAddItemsToCart) {
      // Add split bundle items to cart
      onAddItemsToCart(srv.bundle);
    } else {
      onAddItemToCart({
        inventory_id: srv.id || null,
        item_type: 'service',
        description: srv.name,
        qty: 1,
        unit_price: srv.price,
        labor_fee: 0,
        subtotal: srv.price,
      });
    }
    onClose();
  };

  const handleSelectProduct = (prod) => {
    onAddItemToCart({
      inventory_id: prod.id,
      item_type: 'product',
      description: prod.name,
      qty: 1,
      unit_price: prod.sell_price,
      labor_fee: 0,
      warranty_serial: prod.warranty_months > 0 ? `ضمان ${prod.warranty_months} شهر` : null,
      subtotal: prod.sell_price,
    });
    onClose();
  };

  // Quick Inline Creation of New Custom Service
  const handleCreateNewService = async (e) => {
    e.preventDefault();
    const name = newServiceName.trim();
    const price = Number(newServicePrice);

    if (!name) {
      setServiceCreateError('يرجى إدخال اسم الخدمة');
      return;
    }
    if (isNaN(price) || price < 0) {
      setServiceCreateError('يرجى إدخال سعر صحيح للخدمة');
      return;
    }

    try {
      setIsCreatingService(true);
      setServiceCreateError('');

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          category: 'service',
          item_type: 'service',
          brand: 'خدمات الورشة',
          cost_price: 0,
          sell_price: price,
          min_stock_alert: 0,
          notes: 'خدمة مضافة سريعاً من شاشة الكاشير',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'فشل حفظ الخدمة الجديدة');
      }

      // Add directly to cart
      onAddItemToCart({
        inventory_id: json.data?.id || null,
        item_type: 'service',
        description: name,
        qty: 1,
        unit_price: price,
        labor_fee: 0,
        subtotal: price,
      });

      if (onRefreshData) onRefreshData();
      onClose();
    } catch (err) {
      setServiceCreateError(err.message);
    } finally {
      setIsCreatingService(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md">
      <div className="apple-glass border border-white/20 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              {type === 'tire_patch' || type === 'services' ? (
                <Wrench className="w-5 h-5 stroke-[2.2]" />
              ) : type === 'tire_battery' ? (
                <Battery className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Disc className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {type === 'tire_patch' || type === 'services'
                  ? 'خدمات الورشة والبنشر الفورية'
                  : type === 'tire_battery'
                  ? 'الكفرات والبطاريات'
                  : 'قائمة الأصناف والمنتجات'}
              </h3>
              <p className="text-xs text-slate-400">اختر الخدمة أو الصنف بنقرة واحدة لإضافته للسلة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Top Search + Add Service Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="ابحث بالاسم أو المواصفة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[44px] px-3.5 pr-9 rounded-2xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
            </div>

            {(type === 'tire_patch' || type === 'services') && (
              <button
                type="button"
                onClick={() => setShowAddServiceForm(!showAddServiceForm)}
                className="px-3.5 min-h-[44px] rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>إضافة خدمة جديدة</span>
              </button>
            )}
          </div>

          {/* Quick Add Custom Service Form */}
          {showAddServiceForm && (
            <form
              onSubmit={handleCreateNewService}
              className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-teal-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>تسجيل خدمة فورية جديدة في الكتالوج:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddServiceForm(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  إلغاء
                </button>
              </div>

              {serviceCreateError && (
                <div className="text-[11px] text-rose-300 bg-rose-500/20 p-2 rounded-xl">
                  {serviceCreateError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">اسم الخدمة:</label>
                  <input
                    type="text"
                    placeholder="مثال: غسيل بستم بالديزل"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">سعر الخدمة (ر.ي):</label>
                  <input
                    type="number"
                    placeholder="مثال: 2500"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingService}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                {isCreatingService ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>حفظ الخدمة في الكتالوج وإضافتها للسلة فوراً</span>
              </button>
            </form>
          )}

          {/* List of Services or Products */}
          {type === 'tire_patch' || type === 'services' ? (
            /* Services List */
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>الخدمات المتاحة:</span>
                <span className="text-teal-400 text-[11px]">إيراد خدمات خالص (ربح صافٍ)</span>
              </div>
              {filteredServices.map((srv, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectService(srv)}
                  className="w-full min-h-[58px] p-3.5 rounded-2xl bg-slate-900/80 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 flex items-center justify-between transition text-right group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold flex-shrink-0">
                      {srv.type === 'bundle' ? <Layers className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-amber-300 transition">
                        {srv.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{srv.desc}</div>
                    </div>
                  </div>
                  <div className="font-mono font-extrabold text-base text-amber-400 flex-shrink-0">
                    {srv.price.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Products and Batteries */
            <div className="space-y-2">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleSelectProduct(prod)}
                  className="w-full min-h-[56px] p-3.5 rounded-2xl bg-slate-900/80 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 flex items-center justify-between transition text-right group active:scale-[0.98]"
                >
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-amber-300 transition">
                      {prod.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                        {prod.brand}
                      </span>
                      {prod.warranty_months > 0 && (
                        <span className="text-emerald-400 text-[11px] font-semibold">
                          ضمان {prod.warranty_months} شهر
                        </span>
                      )}
                      <span>(المخزن: {prod.stock_qty})</span>
                    </div>
                  </div>
                  <div className="font-mono font-extrabold text-base text-amber-400">
                    {prod.sell_price.toLocaleString()} <span className="text-xs font-sans text-slate-400">ر.ي</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
