import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Car,
  Droplets,
  Disc,
  Battery,
  Package,
  RotateCcw,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  Gauge,
  Calendar,
  Wallet,
  CreditCard,
  UserCheck,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Info,
  History,
  Wrench,
  Loader2,
  Building2,
  ChevronDown,
  ChevronUp,
  Coins,
  GraduationCap,
} from 'lucide-react';

import NewVehicleModal from './NewVehicleModal';
import OilSelectorModal from './OilSelectorModal';
import ProductPickerModal from './ProductPickerModal';
import InvoiceReceiptModal from './InvoiceReceiptModal';
import VehicleHistoryDrawer from './VehicleHistoryDrawer';
import ReceiptVoucherModal from './ReceiptVoucherModal';
import { isDemoMode, setDemoMode, recordBackupDownloaded } from '../utils/settings';

export default function PosScreen({
  inventory = [],
  workers = [],
  onRefreshData,
  initialVehicle = null,
  onOpenStatement,
  isOwnerMode = false,
  onRequireOwnerAuth,
}) {
  // Vehicle Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicle);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Training Mode State (الجزء الثالث)
  const [demoMode, setDemoModeState] = useState(isDemoMode());

  // Backup Sentinel State (الجزء الرابع: تنبيه 7 أيام)
  const [backupStatus, setBackupStatus] = useState(null);
  const [dismissedBackupAlert, setDismissedBackupAlert] = useState(false);

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch('/api/backup/status');
      const data = await res.json();
      if (data.success) {
        setBackupStatus(data.data);
      }
    } catch (e) {
      // Ignore background network error
    }
  };

  useEffect(() => {
    fetchBackupStatus();
    const handleBackupUpdate = () => fetchBackupStatus();
    window.addEventListener('quick_lube_backup_updated', handleBackupUpdate);
    return () => window.removeEventListener('quick_lube_backup_updated', handleBackupUpdate);
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setDemoModeState(isDemoMode());
    };
    window.addEventListener('quick_lube_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('quick_lube_settings_updated', handleSettingsUpdate);
  }, []);

  const DEMO_CARS = [
    {
      id: 'demo-1',
      plate_number: '1-45892',
      plate_type: 'خصوصي',
      car_make_model: 'تويوتا هايلوكس 2021',
      customer_name: 'أحمد صالح اليافعي (تجريبي)',
      phone: '777123456',
      preferred_oil_brand: 'تويوتا',
      preferred_viscosity: '20W-50',
      last_odometer: 62000,
    },
    {
      id: 'demo-2',
      plate_number: '2-98711',
      plate_type: 'أجرة',
      car_make_model: 'هيونداي توسان 2019',
      customer_name: 'محمد قائد العديني (تجريبي)',
      phone: '771234567',
      preferred_oil_brand: 'بترومين',
      preferred_viscosity: '10W-40',
      last_odometer: 114000,
    },
    {
      id: 'demo-3',
      plate_number: '1-12093',
      plate_type: 'خصوصي',
      car_make_model: 'تويوتا لاندكروزر V8',
      customer_name: 'عبدالله السنيدار (تجريبي)',
      phone: '733456789',
      preferred_oil_brand: 'كاسترول إيدج',
      preferred_viscosity: '5W-30',
      last_odometer: 85000,
    },
    {
      id: 'demo-4',
      plate_number: '3-55410',
      plate_type: 'نقل',
      car_make_model: 'هيونداي إلنترا 2018',
      customer_name: 'عصام الحيمي (تجريبي)',
      phone: '775678901',
      preferred_oil_brand: 'فوكس تيتان',
      preferred_viscosity: '20W-50',
      last_odometer: 98000,
    },
  ];

  const handleSelectDemoVehicle = (demoCar) => {
    setSelectedVehicle({
      id: demoCar.id,
      plate_number: demoCar.plate_number,
      plate_type: demoCar.plate_type || 'خصوصي',
      car_make_model: demoCar.car_make_model,
      customer_name: demoCar.customer_name,
      phone: demoCar.phone,
      preferred_oil_brand: demoCar.preferred_oil_brand || 'تويوتا',
      preferred_viscosity: demoCar.preferred_viscosity || '20W-50',
      last_odometer: demoCar.last_odometer || 45000,
      next_due_odometer: (demoCar.last_odometer || 45000) + 3000,
      balance_due: 0,
      customer_type: 'individual',
    });
    setCurrentOdometer(String(demoCar.last_odometer || 45000));
    setNextOdometer(String((demoCar.last_odometer || 45000) + 3000));
  };

  // Touch Alert & Confirm Modals State (بدون نوافذ المتصفح الافتراضية)
  const [touchAlert, setTouchAlert] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning', // 'warning' | 'error' | 'info'
    actionBtnText: '',
    onAction: null,
    cancelBtnText: 'حسناً، فهمت',
    onCancel: null,
  });

  const [touchConfirm, setTouchConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'نعم، تأكيد',
    onConfirm: null,
    onCancel: null,
  });

  // Free 8-Point Safety Inspection State
  const [safetyPoints, setSafetyPoints] = useState({
    radiator: true,     // ماء الرديتر والتبريد
    brake: true,        // زيت الفرامل
    washer: true,       // ماء المساحات
    tires: true,        // ضغط الإطارات
    air_filter: true,   // فلتر هواء المحرك
    cabin_filter: true, // فلتر المكيف
    leaks: true,        // فحص التهريب السفلي
    battery: true,      // فحص أقطاب وشحن البطارية
  });

  // نمط الإفصاح التدريجي لفحص السلامة (الكبسولة المدمجة)
  const [isSafetyExpanded, setIsSafetyExpanded] = useState(false);
  const passedSafetyCount = useMemo(() => {
    return Object.values(safetyPoints).filter(Boolean).length;
  }, [safetyPoints]);

  useEffect(() => {
    if (initialVehicle) {
      handleSelectVehicle(initialVehicle);
    }
  }, [initialVehicle]);

  // Odometer State: strictly 3000 km default interval
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [kmInterval, setKmInterval] = useState(3000);
  const [manualNextOdometer, setManualNextOdometer] = useState('');

  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [specialDiscount, setSpecialDiscount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'jeeb' | 'jawali' | 'kuraimi' | 'credit'
  const [walletRefNumber, setWalletRefNumber] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [cartNoticeMessage, setCartNoticeMessage] = useState('');
  const [clearCartConfirmPending, setClearCartConfirmPending] = useState(false); // Double-Tap Clear Cart Guard (المقترح 2)

  // Handle double-tap clear cart
  const handleClearCartClick = () => {
    if (!clearCartConfirmPending) {
      setClearCartConfirmPending(true);
      setTimeout(() => {
        setClearCartConfirmPending(false);
      }, 4000);
    } else {
      setCartItems([]);
      setClearCartConfirmPending(false);
      setCartNoticeMessage('تم تفريغ بنود السلة بالكامل.');
      setTimeout(() => setCartNoticeMessage(''), 3500);
    }
  };

  // Modals
  const [showOilModal, setShowOilModal] = useState(false);
  const [pickerModalType, setPickerModalType] = useState(null); // 'tire_patch' | 'tire_battery' | 'accessories' | 'services'
  const [completedInvoice, setCompletedInvoice] = useState(null);

  // Set default technician
  useEffect(() => {
    if (workers.length > 0 && !selectedWorkerId) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [workers, selectedWorkerId]);

  // Handle vehicle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data || []);
        }
      } catch (err) {
        console.error('Error searching vehicles:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When vehicle is chosen, set up odometer and default 3000 km interval
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setSearchQuery('');
    setSearchResults([]);
    
    // Suggest current odometer based on last visit
    if (vehicle.last_odometer) {
      setCurrentOdometer(String(vehicle.last_odometer));
    }
    // Default 3000 km for all categories as requested
    setKmInterval(3000);
    setManualNextOdometer('');
  };

  // Dynamic Odometer Calculation
  const nextOdometer = useMemo(() => {
    if (manualNextOdometer && Number(manualNextOdometer) > 0) {
      return Number(manualNextOdometer);
    }
    const cur = Number(currentOdometer) || 0;
    return cur + Number(kmInterval || 3000);
  }, [currentOdometer, kmInterval, manualNextOdometer]);

  const nextServiceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  }, []);

  // Odometer Poka-Yoke: flag if entered reading is less than previous recorded reading
  const isOdometerSuspicious = useMemo(() => {
    if (!selectedVehicle || !selectedVehicle.last_odometer || !currentOdometer) return false;
    const cur = Number(currentOdometer);
    const prev = Number(selectedVehicle.last_odometer);
    return cur > 0 && prev > 0 && cur < prev;
  }, [selectedVehicle, currentOdometer]);

  // One-Click Repeat Last Service (into cart, fully editable)
  const handleRepeatItemsIntoCart = (items) => {
    if (!items || items.length === 0) return;
    const repeated = items.map((i) => ({
      inventory_id: i.inventory_id || null,
      item_type: i.item_type || (i.description.includes('خدمة') || i.description.includes('رقعة') ? 'service' : 'product'),
      description: i.description,
      qty: i.qty || 1,
      unit_price: Number(i.unit_price) || 0,
      labor_fee: 0,
      subtotal: (Number(i.qty) || 1) * (Number(i.unit_price) || 0),
    }));
    setCartItems(repeated);
    setCartNoticeMessage('تم نسخ بنود الخدمة السابقة إلى السلة بنجاح. يمكنك تعديل الكميات أو إضافة أصناف بحرية قبل الاعتماد.');
    setTimeout(() => setCartNoticeMessage(''), 5000);
  };

  const handleRepeatLastService = async () => {
    if (!selectedVehicle) return;
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const data = await res.json();
      if (data.success && data.data.history && data.data.history.length > 0) {
        const lastInvoice = data.data.history[0];
        handleRepeatItemsIntoCart(lastInvoice.items);
      } else {
        setTouchAlert({
          isOpen: true,
          title: 'سجل الخدمات السابقة',
          message: 'لا يوجد سجل خدمات سابق مسجل لهذه السيارة لتكراره في السلة.',
          type: 'info',
          cancelBtnText: 'حسناً، فهمت',
        });
      }
    } catch (err) {
      console.error('Error repeating last service:', err);
    }
  };

  // Cart operations
  const handleAddToCart = (item) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.inventory_id && i.inventory_id === item.inventory_id
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].qty + (item.qty || 1);
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: newQty,
          subtotal: newQty * updated[existingIdx].unit_price,
        };
        return updated;
      }
      return [...prev, { ...item, labor_fee: 0 }];
    });
  };

  const handleAddMultipleToCart = (items) => {
    for (const item of items) {
      handleAddToCart(item);
    }
  };

  const handleUpdateItemQty = (index, delta) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = Math.max(1, updated[index].qty + delta);
      updated[index] = {
        ...updated[index],
        qty: newQty,
        subtotal: newQty * updated[index].unit_price,
      };
      return updated;
    });
  };

  const handleRemoveCartItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Separation: Goods Sales vs Pure Services Revenue
  const goodsTotal = useMemo(() => {
    return cartItems
      .filter((item) => item.item_type !== 'service')
      .reduce((acc, item) => acc + (item.unit_price * item.qty), 0);
  }, [cartItems]);

  const servicesTotal = useMemo(() => {
    return cartItems
      .filter((item) => item.item_type === 'service')
      .reduce((acc, item) => acc + (item.unit_price * item.qty), 0);
  }, [cartItems]);

  const grossTotal = goodsTotal + servicesTotal;

  // Upgrade 3: Automatically apply fleet/corporate discount percentage to gross total
  useEffect(() => {
    if (selectedVehicle && Number(selectedVehicle.discount_percent) > 0 && grossTotal > 0) {
      const fleetDiscount = Math.round(grossTotal * (Number(selectedVehicle.discount_percent) / 100));
      setSpecialDiscount(fleetDiscount);
    }
  }, [selectedVehicle, grossTotal]);

  const netTotal = useMemo(() => {
    return Math.max(0, grossTotal - Number(specialDiscount));
  }, [grossTotal, specialDiscount]);

  // Paid amount calculation
  const effectivePaidAmount = useMemo(() => {
    if (paymentMethod === 'credit') {
      const p = parseFloat(paidAmountInput);
      return isNaN(p) ? 0 : Math.min(netTotal, Math.max(0, p));
    }
    return netTotal;
  }, [paymentMethod, paidAmountInput, netTotal]);

  const remainingDebt = useMemo(() => {
    return Math.max(0, netTotal - effectivePaidAmount);
  }, [netTotal, effectivePaidAmount]);

  // Poka-Yoke Validated Invoice Submission (الجزء الأول: مانع الأخطاء وحماية المالك)
  const handleSubmitInvoice = async () => {
    if (!selectedVehicle) {
      setTouchAlert({
        isOpen: true,
        title: 'يرجى اختيار السيارة أولاً',
        message: 'يجب اختيار سيارة مسجلة بالبحث أو الضغط على "+ سيارة جديدة" لإصدار الفاتورة.',
        type: 'warning',
        cancelBtnText: 'حسناً',
      });
      return;
    }

    if (cartItems.length === 0) {
      setTouchAlert({
        isOpen: true,
        title: 'سلة الفاتورة فارغة',
        message: 'يرجى إضافة خدمة غيار زيت أو أصناف وخدمات إلى السلة قبل الحفظ.',
        type: 'warning',
        cancelBtnText: 'حسناً',
      });
      return;
    }

    if (!selectedWorkerId) {
      setTouchAlert({
        isOpen: true,
        title: 'تحديد الفني المنفذ',
        message: 'يرجى اختيار الفني المسؤول عن تنفيذ الخدمة من قائمة العمال بالأعلى.',
        type: 'warning',
        cancelBtnText: 'حسناً',
      });
      return;
    }

    // Poka-Yoke 1: Credit Sale Protection (حماية البيع الآجل)
    if (paymentMethod === 'credit') {
      const hasCustomerName =
        selectedVehicle.customer_name &&
        selectedVehicle.customer_name.trim() !== '' &&
        selectedVehicle.customer_name !== 'عميل نقدي';
      const hasPhone =
        selectedVehicle.phone &&
        selectedVehicle.phone.trim().length >= 7;

      if (!hasCustomerName || !hasPhone) {
        setTouchAlert({
          isOpen: true,
          title: '⚠️ مانع الأخطاء: لا يمكن البيع بالآجل لعميل غير مسجل!',
          message:
            'لحفظ أموال المركز وضمان حق الاسترداد، يُمنع تسجيل مديونية آجلة بدون اسم عميل حقيقي ورقم هاتف فعال. يرجى إكمال بيانات العميل والسيارة أولاً.',
          type: 'error',
          actionBtnText: 'إكمال بيانات العميل ورقم الهاتف 📝',
          onAction: () => {
            setTouchAlert((prev) => ({ ...prev, isOpen: false }));
            setShowNewVehicleModal(true);
          },
          cancelBtnText: 'تغيير السداد إلى كاش 💵',
          onCancel: () => {
            setPaymentMethod('cash');
          },
        });
        return;
      }
    }

    // Poka-Yoke 2: Odometer Safety Check (تأكيد القراءة السفلية)
    if (isOdometerSuspicious) {
      setTouchConfirm({
        isOpen: true,
        title: '⚠️ تنبيه عداد الكيلومترات (Odometer Guard)',
        message: `قراءة العداد المدخلة (${Number(currentOdometer).toLocaleString()} كم) أقل من القراءة السابقة المسجلة لهذه السيارة (${Number(selectedVehicle.last_odometer).toLocaleString()} كم)!\n\nهل تؤكد صحة القراءة الحالية واستمرار حفظ الفاتورة بهذا العداد؟`,
        confirmText: 'نعم، القراءة صحيحة واستمرار',
        onConfirm: () => {
          checkPriceAndCreditLimitThenSubmit();
        },
      });
      return;
    }

    checkPriceAndCreditLimitThenSubmit();
  };

  const checkPriceAndCreditLimitThenSubmit = () => {
    // Poka-Yoke 3: Below Cost Guard (حماية سعر البيع)
    const belowCostItem = cartItems.find((ci) => {
      if (!ci.inventory_id || ci.item_type === 'service') return false;
      const inv = inventory.find((i) => i.id === ci.inventory_id);
      return inv && inv.cost_price && Number(ci.unit_price) < Number(inv.cost_price);
    });

    if (belowCostItem) {
      const inv = inventory.find((i) => i.id === belowCostItem.inventory_id);
      if (!isOwnerMode) {
        // Strictly blocked in Cashier Mode
        setTouchAlert({
          isOpen: true,
          title: '⚠️ حماية أرباح المركز (مانع الخسارة)',
          message: `الصنف "${belowCostItem.description}" مسعر للبيع بـ (${Number(belowCostItem.unit_price).toLocaleString()} ر.ي) وهو أقل من سعر التكلفة (${Number(inv.cost_price).toLocaleString()} ر.ي)!\n\nفي وضع الكاشير، يمنع النظام تماماً البيع بالخسارة لحماية أرباح المركز. يُسمح بهذا الإجراء فقط لصاحب المركز بعد إدخال رمز PIN.`,
          type: 'error',
          actionBtnText: 'فتح صلاحية المالك بالرمز السري 🔓',
          onAction: () => {
            setTouchAlert((prev) => ({ ...prev, isOpen: false }));
            if (onRequireOwnerAuth) {
              onRequireOwnerAuth(
                () => checkPriceAndCreditLimitThenSubmit(),
                'تفويض البيع بأقل من التكلفة',
                'أدخل رمز المالك للسماح ببيع الصنف بأقل من التكلفة استثنائياً'
              );
            }
          },
          cancelBtnText: 'تعديل السعر',
        });
        return;
      } else {
        // In Owner Mode, ask touch confirmation
        setTouchConfirm({
          isOpen: true,
          title: '⚠️ تأكيد بيع بأقل من التكلفة (Owner Override)',
          message: `الصنف "${belowCostItem.description}" يباع بـ (${Number(belowCostItem.unit_price).toLocaleString()} ر.ي) وهو أقل من سعر التكلفة (${Number(inv.cost_price).toLocaleString()} ر.ي).\n\nهل تؤكد موافقتك كمدير على اعتماد هذا البيع الاستثنائي؟`,
          confirmText: 'تأكيد البيع الاستثنائي',
          onConfirm: () => {
            checkCreditLimitThenSubmit();
          },
        });
        return;
      }
    }

    checkCreditLimitThenSubmit();
  };

  const checkCreditLimitThenSubmit = () => {
    // Safeguard check 2: Customer Credit Ceiling (Upgrade 4)
    if (paymentMethod === 'credit' && selectedVehicle) {
      const currentDebt = Number(selectedVehicle.balance_due) || 0;
      const creditLimit = Number(selectedVehicle.credit_limit) || 50000;
      const projected = currentDebt + remainingDebt;
      if (projected > creditLimit) {
        setTouchConfirm({
          isOpen: true,
          title: '⚠️ تنبيه سقف المديونية (Credit Ceiling Guard)',
          message: `إجمالي دين العميل المتوقع (${projected.toLocaleString()} ر.ي) سيتجاوز سقف الائتمان (${creditLimit.toLocaleString()} ر.ي) بمقدار (${(projected - creditLimit).toLocaleString()} ر.ي).\n\nهل تؤكد منح هذا الائتمان الاستثنائي؟`,
          confirmText: 'تأكيد منح الائتمان والاستمرار',
          onConfirm: () => {
            executeSubmitInvoice();
          },
        });
        return;
      }
    }

    executeSubmitInvoice();
  };

  const executeSubmitInvoice = async () => {
    try {
      setIsSubmittingInvoice(true);

      const payload = {
        vehicle_id: selectedVehicle.id,
        worker_id: selectedWorkerId,
        current_odometer: Number(currentOdometer) || selectedVehicle.last_odometer || 0,
        next_odometer: nextOdometer,
        next_service_date: nextServiceDate,
        items_total: goodsTotal,
        labor_total: servicesTotal,
        scrap_battery_deduction: 0,
        discount: Number(specialDiscount) || 0,
        payment_method: paymentMethod,
        wallet_ref_number: walletRefNumber || null,
        paid_amount: effectivePaidAmount,
        notes: invoiceNotes || null,
        items: cartItems.map((item) => ({
          inventory_id: item.inventory_id || null,
          item_type: item.item_type || 'product',
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price,
          labor_fee: 0,
          warranty_serial: item.warranty_serial || null,
          subtotal: item.qty * item.unit_price,
        })),
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'حدث خطأ أثناء إصدار الفاتورة');
      }

      // Show receipt modal
      setCompletedInvoice({
        ...data.data,
        safetyPoints,
        worker_name: workers.find((w) => w.id === selectedWorkerId)?.name || 'فني المركز',
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setTouchAlert({
        isOpen: true,
        title: 'خطأ في حفظ الفاتورة',
        message: err.message || 'تعذر حفظ الفاتورة وتحديث القيود',
        type: 'error',
        cancelBtnText: 'إغلاق',
      });
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Check which cart items are low on stock
  const lowStockItemsInCart = useMemo(() => {
    return cartItems
      .map((ci) => {
        if (!ci.inventory_id || ci.item_type === 'service') return null;
        const invItem = inventory.find((i) => i.id === ci.inventory_id);
        if (invItem && invItem.stock_qty <= invItem.min_stock_alert) {
          return {
            name: ci.description,
            stock: invItem.stock_qty,
            alertLevel: invItem.min_stock_alert,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [cartItems, inventory]);

  const handleResetPos = () => {
    setCartItems([]);
    setSelectedVehicle(null);
    setCurrentOdometer('');
    setKmInterval(3000);
    setManualNextOdometer('');
    setSpecialDiscount(0);
    setInvoiceNotes('');
    setPaymentMethod('cash');
    setPaidAmountInput('');
    setWalletRefNumber('');
  };

  return (
    <div className="min-h-full flex flex-col gap-3.5 select-none pb-8">
      {/* 0. TRAINING / DEMO MODE ALERT BANNER (الجزء الثالث) */}
      {demoMode && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-500/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
              🎓
            </div>
            <div>
              <div className="text-amber-300 font-extrabold text-sm flex items-center gap-2">
                <span>وضع التدريب مفعل (Demo Mode)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-500/40">بيئة تجريبية آمنة</span>
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                يمكنك تجربة البيع وتدريب العمال الجدد بحرية دون التأثير على أرقام المحل الحقيقية.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDemoMode(false);
              setDemoModeState(false);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-amber-300 border border-amber-500/40 font-bold text-xs transition active:scale-95"
          >
            إيقاف وضع التدريب ✕
          </button>
        </div>
      )}

      {/* 0.1 BACKUP SENTINEL ALERT (الجزء الرابع: تنبيه مرور أكثر من 7 أيام دون نسخ احتياطي) */}
      {backupStatus?.isStale && !dismissedBackupAlert && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/40 border border-rose-500/40 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center text-base shadow">
              🛡️
            </div>
            <div>
              <div className="text-rose-300 font-extrabold text-xs flex items-center gap-2">
                <span>درع الأمان: تنبيه حفظ نسخة احتياطية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold">
                  {backupStatus.daysAgo !== null && backupStatus.daysAgo !== undefined
                    ? `مضى ${backupStatus.daysAgo} أيام`
                    : 'لم يتم الحفظ بعد'}
                </span>
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                مرّ أكثر من 7 أيام دون تنزيل نسخة احتياطية محلية لحفظ فواتير وسجلات المركز من أي طارئ.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/backup"
              download
              onClick={() => {
                recordBackupDownloaded();
                setDismissedBackupAlert(true);
              }}
              className="min-h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-slate-950 font-black text-xs transition active:scale-95 shadow flex items-center gap-1.5"
            >
              <span>تحميل نسخة احتياطية فوراً 💾</span>
            </a>
            <button
              type="button"
              onClick={() => setDismissedBackupAlert(true)}
              className="text-slate-400 hover:text-white px-2.5 py-1 text-xs font-bold transition"
            >
              تخطي ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP BAR: VEHICLE SEARCH & CONTEXT */}
      <div className="apple-glass rounded-3xl p-4 border border-white/10 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث برقم اللوحة (مثلاً: 1-45892) أو رقم الهاتف أو اسم العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[52px] pr-12 pl-4 rounded-2xl bg-slate-900 border border-white/15 text-white placeholder-slate-400 font-semibold text-sm focus:outline-none focus:border-amber-400 shadow-inner"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-4 pointer-events-none" />
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 apple-glass-dropdown rounded-2xl border border-white/20 overflow-hidden shadow-2xl z-50 max-h-72 overflow-y-auto">
                {searchResults.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVehicle(v)}
                    className="w-full p-3.5 text-right hover:bg-white/10 border-b border-white/5 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>{v.plate_number}</span>
                        <span className="text-xs text-amber-400 font-normal">({v.plate_type})</span>
                        <span className="text-xs text-slate-400 font-normal">| {v.car_make_model}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        العميل: <span className="text-slate-200 font-bold">{v.customer_name}</span> &bull; {v.phone}
                      </div>
                    </div>
                    <div className="text-left font-mono text-xs">
                      {v.balance_due > 0 ? (
                        <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          دين: {Number(v.balance_due).toLocaleString()} ر.ي
                        </span>
                      ) : (
                        <span className="text-emerald-400">خالي من الديون</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action: New Vehicle Button */}
          <button
            type="button"
            onClick={() => setShowNewVehicleModal(true)}
            className="min-h-[52px] px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 flex-shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>تسجيل سيارة جديدة 🚗</span>
          </button>
        </div>

        {/* Quick Demo Vehicle Chips (Only displayed when demoMode === true) */}
        {!selectedVehicle && demoMode && (
          <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <span>⚡ نماذج سيارات تجريبية (اختر للتجربة والتدريب بلمسة واحدة):</span>
              </span>
              <span className="text-[10px] text-slate-400">تختفي تلقائياً عند إيقاف وضع التدريب</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEMO_CARS.map((car) => (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => handleSelectDemoVehicle(car)}
                  className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400 text-right transition active:scale-95 group"
                >
                  <div className="font-extrabold text-white text-xs flex items-center justify-between">
                    <span className="group-hover:text-amber-300">{car.plate_number}</span>
                    <span className="text-[10px] text-amber-400 font-mono">({car.plate_type})</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-bold mt-0.5 truncate">{car.car_make_model}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {car.customer_name} &bull; <span className="font-mono">{car.preferred_viscosity}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Vehicle Card */}
        {selectedVehicle && (
          <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-800/60 to-slate-800/80 border border-amber-500/30 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-extrabold shadow-sm">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-white">{selectedVehicle.plate_number}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-semibold">
                      {selectedVehicle.car_make_model}
                    </span>
                    <span className="text-[11px] text-amber-400 font-bold">({selectedVehicle.plate_type})</span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="text-slate-300 font-semibold">{selectedVehicle.customer_name}</span>
                    <span>&bull;</span>
                    <span className="font-mono">{selectedVehicle.phone}</span>
                    <span>&bull;</span>
                    <span className="text-amber-300 font-bold">
                      الزيت المعتمد: {selectedVehicle.preferred_oil_brand || 'تويوتا'} ({selectedVehicle.preferred_viscosity || '20W-50'})
                    </span>
                  </div>

                  {/* Corporate Fleet Badge (Upgrade 3) */}
                  {selectedVehicle.customer_type && selectedVehicle.customer_type !== 'individual' && (
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-[11px] flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{selectedVehicle.corporate_name || 'حساب أسطول معتمد'}</span>
                      </span>
                      {Number(selectedVehicle.discount_percent) > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold text-[11px]">
                          خصم أسطول {selectedVehicle.discount_percent}% تلقائي
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 font-mono text-[11px]">
                        سقف الائتمان: {Number(selectedVehicle.credit_limit || 50000).toLocaleString()} ر.ي
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Instant Vehicle Service History Drawer Button */}
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  className="min-h-[40px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  title="استعراض سجل زيارات وفواتير السيارة السابقة"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>سجل الزيارات والخدمات 📜</span>
                </button>

                {/* 1-Click Repeat Service into cart (editable) */}
                <button
                  type="button"
                  onClick={handleRepeatLastService}
                  className="min-h-[40px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  title="تكرار آخر خدمة ونسخها للسلة لتعديلها"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تكرار آخر خدمة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition text-xs"
                  title="إلغاء اختيار السيارة"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Smart Context Alert: Outstanding Debt & Credit Limit */}
            {selectedVehicle.balance_due > 0 && (
              <div className="w-full p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
                  <span>
                    ⚠️ رصيد الدين السابق: <span className="font-mono text-white text-sm font-black">{Number(selectedVehicle.balance_due).toLocaleString()} ر.ي</span>
                    {selectedVehicle.credit_limit && Number(selectedVehicle.balance_due) > Number(selectedVehicle.credit_limit) && (
                      <span className="text-amber-300 mr-2 underline decoration-amber-500">
                        (تجاوز سقف الائتمان: {Number(selectedVehicle.credit_limit).toLocaleString()} ر.ي)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 transition active:scale-95 shadow-sm"
                    title="تحصيل دفعة نقدية وإصدار سند قبض رسمي فوري"
                  >
                    <span>قبض دفعة 📥</span>
                  </button>
                  {onOpenStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenStatement(selectedVehicle.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-extrabold flex items-center gap-1 transition active:scale-95"
                    >
                      <span>كشف الحساب 🧾</span>
                    </button>
                  )}
                  <span className="text-[10px] bg-rose-950 px-2 py-0.5 rounded border border-rose-500/30 text-rose-200">
                    مستحق السداد
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notice Banner if repeated service */}
      {cartNoticeMessage && (
        <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{cartNoticeMessage}</span>
        </div>
      )}

      {/* 2. TWO-COLUMN POS TOUCH INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 items-start">
        {/* LEFT COLUMN: SERVICE BUTTONS & ODOMETER (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-3 pr-0.5">
          {/* Odometer Tracker Bar (Strictly 3000 km default with full manual freedom) */}
          <div className="apple-glass rounded-3xl p-4 border border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span>قراءة العداد وموعد الغيار القادم:</span>
              </span>
              <div className="flex items-center gap-1">
                {[3000, 5000, 7000, 10000].map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => {
                      setKmInterval(interval);
                      setManualNextOdometer('');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition border ${
                      kmInterval === interval && !manualNextOdometer
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    +{interval.toLocaleString()} كم {interval === 3000 ? '(افتراضي)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Poka-Yoke Visual Alert Banner: Odometer lower than previous */}
            {isOdometerSuspicious && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-amber-300 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    تنبيه: قراءة العداد المدخلة ({Number(currentOdometer).toLocaleString()} كم) أقل من القراءة السابقة لهذه السيارة ({Number(selectedVehicle?.last_odometer).toLocaleString()} كم)!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentOdometer(String(selectedVehicle?.last_odometer || ''))}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shrink-0 transition active:scale-95 shadow-sm"
                >
                  تصحيح لآخر قراءة ({selectedVehicle?.last_odometer?.toLocaleString()} كم)
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">العداد الحالي للسيارة (كم):</label>
                <input
                  type="number"
                  placeholder="مثال: 125000"
                  value={currentOdometer}
                  onChange={(e) => setCurrentOdometer(e.target.value)}
                  className={`w-full min-h-[46px] px-3 rounded-xl bg-slate-900 border font-mono text-base font-extrabold text-white focus:outline-none text-center ${
                    isOdometerSuspicious ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-white/10 focus:border-amber-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  عداد الغيار القادم (تلقائي / يدوي):
                </label>
                <input
                  type="number"
                  placeholder={nextOdometer ? String(nextOdometer) : '---'}
                  value={manualNextOdometer}
                  onChange={(e) => setManualNextOdometer(e.target.value)}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-slate-900 border border-amber-500/30 font-mono text-base font-extrabold text-amber-400 focus:outline-none focus:border-amber-400 text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">تاريخ الغيار القادم المقترح:</label>
                <div className="w-full min-h-[46px] px-3 rounded-xl bg-slate-900/60 border border-white/10 font-mono text-sm font-bold text-slate-300 flex items-center justify-center">
                  {nextServiceDate}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Service Tiles */}
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Oil & Filter Service Tile */}
            <button
              type="button"
              onClick={() => setShowOilModal(true)}
              className="min-h-[105px] p-4 rounded-3xl apple-glass-interactive border border-amber-500/30 hover:border-amber-400 flex flex-col justify-between group shadow-xl active:scale-[0.98] text-right"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform">
                  <Droplets className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  شائع جداً
                </span>
              </div>
              <div>
                <div className="text-base font-extrabold text-white group-hover:text-amber-300 transition">
                  🛢️ غيار زيت + فلتر
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  اختيار الماركة، اللزوجة، والعبوات (1L/4L/5L)
                </div>
              </div>
            </button>

            {/* 2. Tire Patch, Balancing & Workshop Services */}
            <button
              type="button"
              onClick={() => setPickerModalType('services')}
              className="min-h-[105px] p-4 rounded-3xl apple-glass-interactive border border-blue-500/30 hover:border-blue-400 flex flex-col justify-between group shadow-xl active:scale-[0.98] text-right"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform">
                  <Wrench className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  خدمات فورية
                </span>
              </div>
              <div>
                <div className="text-base font-extrabold text-white group-hover:text-blue-300 transition">
                  🔧 خدمات الورشة والبنشر
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  غيار زيت خارجي، رقع تيوبلس، ترصيص، تشحيم
                </div>
              </div>
            </button>

            {/* 3. Tires & Batteries Tile */}
            <button
              type="button"
              onClick={() => setPickerModalType('tire_battery')}
              className="min-h-[105px] p-4 rounded-3xl apple-glass-interactive border border-emerald-500/30 hover:border-emerald-400 flex flex-col justify-between group shadow-xl active:scale-[0.98] text-right"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 group-hover:scale-110 transition-transform">
                  <Battery className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  قطع وبطاريات
                </span>
              </div>
              <div>
                <div className="text-base font-extrabold text-white group-hover:text-emerald-300 transition">
                  🔋 بيع كفر / بطارية
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  كفرات يابانية وكورية، بطاريات جافة مع الضمان
                </div>
              </div>
            </button>

            {/* 4. Other Products & Catalog Tile */}
            <button
              type="button"
              onClick={() => setPickerModalType('accessories')}
              className="min-h-[105px] p-4 rounded-3xl apple-glass-interactive border border-purple-500/30 hover:border-purple-400 flex flex-col justify-between group shadow-xl active:scale-[0.98] text-right"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10 group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  إكسسوار وسوائل
                </span>
              </div>
              <div>
                <div className="text-base font-extrabold text-white group-hover:text-purple-300 transition">
                  📦 قائمة المنتجات الأخرى
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  ماء رديتر، زيت فرامل، فلاتر مكيف
                </div>
              </div>
            </button>
          </div>

          {/* Technician Assignment Strip (Salaried Workers - No Individual Labor Fees) */}
          <div className="apple-glass rounded-3xl p-3 border border-white/10">
            <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>الفني المسؤول عن تنفيذ الخدمة:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">طاقم الورشة المعتمد</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {workers.map((w) => {
                const isSelected = selectedWorkerId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWorkerId(w.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-2xl border text-right transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white font-bold shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="truncate">
                      <div className="text-xs font-extrabold truncate">{w.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-400 truncate">{w.role.split(' ')[1] || w.role}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 stroke-[3] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8-Point Free Touch Safety Inspection Capsule (Progressive Disclosure) */}
          <div className="apple-glass rounded-2xl p-3 border border-white/10 transition-all duration-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-white">فحص السلامة المجاني (8 نقاط):</span>
                  <div className="text-[11px] font-mono font-bold flex items-center gap-1.5 mt-0.5">
                    {passedSafetyCount === 8 ? (
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        8 / 8 نقاط مجتازة وسليمة بالكامل 🛡️
                      </span>
                    ) : (
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        ⚠️ {passedSafetyCount} من 8 نقاط سليمة (تم تسجيل ملاحظة)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSafetyExpanded(!isSafetyExpanded)}
                  className="min-h-[38px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <span>{isSafetyExpanded ? 'إخفاء القائمة' : 'تخصيص الفحص'}</span>
                  {isSafetyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Expandable Grid */}
            {isSafetyExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10 animate-in fade-in duration-150 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'radiator', label: '💧 ماء الرديتر' },
                    { id: 'brake', label: '🛑 زيت الفرامل' },
                    { id: 'washer', label: '🚿 ماء المساحات' },
                    { id: 'tires', label: '🛞 ضغط الإطارات' },
                    { id: 'air_filter', label: '💨 فلتر الهواء' },
                    { id: 'cabin_filter', label: '❄️ فلتر المكيف' },
                    { id: 'leaks', label: '🔍 فحص التهريب' },
                    { id: 'battery', label: '🔋 فحص البطارية' },
                  ].map((pt) => {
                    const isChecked = safetyPoints[pt.id];
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => setSafetyPoints((prev) => ({ ...prev, [pt.id]: !prev[pt.id] }))}
                        className={`min-h-[40px] px-2 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-between border active:scale-95 ${
                          isChecked
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-500 border-white/10 line-through'
                        }`}
                      >
                        <span className="truncate">{pt.label}</span>
                        {isChecked ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3] flex-shrink-0" />
                        ) : (
                          <span className="text-[10px] text-rose-400 font-black">✕ خلل</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSafetyPoints({
                        radiator: true,
                        brake: true,
                        washer: true,
                        tires: true,
                        air_filter: true,
                        cabin_filter: true,
                        leaks: true,
                        battery: true,
                      });
                    }}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 font-bold transition underline underline-offset-4"
                  >
                    إعادة ضبط جميع النقاط إلى سليم (8/8)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS CART, TOTALS & PAYMENT GATEWAY (5 COLS) */}
        <div className="lg:col-span-5 apple-glass rounded-3xl p-4 border border-white/10 flex flex-col justify-between overflow-visible lg:sticky lg:top-2">
          {/* Cart Header */}
          <div className="border-b border-white/10 pb-2.5 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-extrabold text-white text-base">سلة الفاتورة الحالية</h3>
              <p className="text-xs text-slate-400">
                {cartItems.length > 0 ? `${cartItems.length} بنود في الفاتورة` : 'السلة فارغة حالياً'}
              </p>
            </div>
            {cartItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                {clearCartConfirmPending ? (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={handleClearCartClick}
                      className="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition active:scale-95 shadow-md shadow-rose-500/30 animate-pulse flex items-center gap-1"
                      title="انقر لتأكيد مسح كافة بنود الفاتورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تأكيد المسح؟ (اضغط ثانية)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearCartConfirmPending(false)}
                      className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                      title="إلغاء التراجع"
                    >
                      تراجع
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleClearCartClick}
                    className="text-xs text-rose-400/90 hover:text-rose-300 font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition flex items-center gap-1 border border-transparent hover:border-rose-500/20"
                    title="تفريغ جميع محتويات السلة الحالية"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تفريغ السلة</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Smart Cart Alert: Low Stock Warning in Cart */}
          {lowStockItemsInCart.length > 0 && (
            <div className="mt-2 p-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="leading-snug">
                <span className="text-white font-extrabold">تنبيه مخزون: </span>
                {lowStockItemsInCart.map((i) => `${i.name} (المتبقي: ${i.stock})`).join('، ')} أوشك على النفاد!
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="max-h-72 overflow-y-auto my-2.5 space-y-2 pr-1 custom-scrollbar">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Package className="w-12 h-12 stroke-[1.2] mb-2 opacity-50" />
                <p className="text-sm font-semibold">لم يتم إضافة أي أصناف حتى الآن</p>
                <p className="text-xs text-slate-500 mt-1">
                  اختر [غيار زيت + فلتر] أو [خدمات الورشة والبنشر] للبدء
                </p>
              </div>
            ) : (
              cartItems.map((item, idx) => {
                const isService = item.item_type === 'service';
                const invMatch = item.inventory_id ? inventory.find((i) => i.id === item.inventory_id) : null;
                const isBelowCost = !isService && invMatch && invMatch.cost_price && Number(item.unit_price) < Number(invMatch.cost_price);

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition ${
                      isBelowCost
                        ? 'bg-rose-950/40 border-rose-500/40'
                        : isService
                        ? 'bg-slate-900/90 border-teal-500/30'
                        : 'bg-slate-900/80 border-white/10'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                        {isService && <Wrench className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                        <span className="truncate">{item.description}</span>
                        {isBelowCost && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-black animate-pulse flex-shrink-0">
                            ⚠️ أقل من التكلفة!
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400 font-bold">{Number(item.unit_price).toLocaleString()} ر.ي</span>
                        {isService ? (
                          <span className="text-teal-400 text-[10px] bg-teal-500/10 px-1.5 rounded">خدمة ورشة</span>
                        ) : isBelowCost ? (
                          <span className="text-rose-400 text-[11px] font-bold">
                            (التكلفة: {Number(invMatch.cost_price).toLocaleString()} ر.ي)
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, -1)}
                        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm border border-white/10 active:scale-90 transition"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono font-extrabold text-sm text-white">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, 1)}
                        className="w-8 h-8 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-sm border border-amber-500/30 active:scale-90 transition"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(idx)}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center mr-1 border border-rose-500/20 active:scale-90 transition"
                        title="حذف البند من السلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Financial Breakdown (Clear separation of goods and services) */}
          <div className="pt-2.5 border-t border-white/10 space-y-1.5 flex-shrink-0 text-xs">
            {goodsTotal > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>إجمالي مبيعات الزيوت والقطع:</span>
                <span className="font-mono font-bold text-white">{goodsTotal.toLocaleString()} ر.ي</span>
              </div>
            )}

            {servicesTotal > 0 && (
              <div className="flex justify-between text-teal-300">
                <span>إجمالي إيراد خدمات الورشة:</span>
                <span className="font-mono font-bold">{servicesTotal.toLocaleString()} ر.ي</span>
              </div>
            )}

            {/* Corporate Fleet Discount Indicator (Upgrade 3) */}
            {selectedVehicle && Number(selectedVehicle.discount_percent) > 0 && (
              <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-between">
                <span>🏢 خصم تسعير الأسطول ({selectedVehicle.discount_percent}%):</span>
                <span className="font-mono text-amber-300 tabular-nums">-{specialDiscount.toLocaleString()} ر.ي</span>
              </div>
            )}

            {/* Special Discount Input with Quick Touch Pills */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-white/5">
              <span className="text-xs font-bold text-slate-300">خصم إضافي:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  {[500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSpecialDiscount(amt)}
                      className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono font-bold tap-bounce border ${
                        specialDiscount === amt
                          ? 'bg-rose-500 text-white border-rose-400'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                      }`}
                    >
                      -{amt}
                    </button>
                  ))}
                  {specialDiscount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSpecialDiscount(0)}
                      className="min-h-[32px] px-2 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-rose-400 border border-white/10 tap-bounce"
                      title="تصفير الخصم"
                    >
                      ✕ تصفير
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-rose-400">
                  <input
                    type="number"
                    placeholder="0"
                    value={specialDiscount || ''}
                    onChange={(e) => setSpecialDiscount(Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-rose-500/30 font-mono text-xs font-bold text-center text-rose-400 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">ر.ي</span>
                </div>
              </div>
            </div>

            {/* Net Total Display */}
            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="font-black text-sm text-white">الصافي المطلوب دفعه:</span>
              <span className="font-mono font-black text-2xl text-amber-400 tabular-nums">
                {netTotal.toLocaleString()} <span className="text-xs font-sans text-slate-300 font-bold">ر.ي</span>
              </span>
            </div>
          </div>

          {/* 4. YEMENI PAYMENT GATEWAY UI */}
          <div className="pt-2.5 border-t border-white/10 space-y-2 flex-shrink-0">
            <div className="text-xs font-bold text-slate-300">طريقة الدفع في السوق اليمني:</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'cash', label: '💵 كاش' },
                { id: 'jeeb', label: '📱 جيب' },
                { id: 'jawali', label: '📱 جوالي' },
                { id: 'kuraimi', label: '🏦 كريمي' },
                { id: 'credit', label: '📝 آجل/جزئي' },
              ].map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`min-h-[48px] py-1.5 px-2 rounded-xl text-xs font-bold tap-bounce flex items-center justify-center border ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-400/20'
                        : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Wallet Reference Input */}
            {['jeeb', 'jawali', 'kuraimi'].includes(paymentMethod) && (
              <div className="p-2.5 rounded-2xl bg-slate-900 border border-white/10 animate-in fade-in space-y-1">
                <label className="block text-[11px] text-slate-400">
                  رقم إشعار الحوالة للمحفظة:
                </label>
                <input
                  type="text"
                  placeholder="مثال: KUR-9988112"
                  value={walletRefNumber}
                  onChange={(e) => setWalletRefNumber(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            {/* Partial / Debt Amount Input with Touch Amount Chips */}
            {paymentMethod === 'credit' && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 animate-in fade-in text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-slate-200 font-bold">المبلغ المدفوع فعلياً (كاش/محفظة):</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="0"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-28 min-h-[40px] px-2.5 rounded-xl bg-slate-900 border border-white/20 font-mono text-sm font-black text-white text-center focus:border-amber-400 focus:outline-none"
                    />
                    <span className="font-mono text-slate-400">ر.ي</span>
                  </div>
                </div>

                {/* Quick Touch Amount Chips */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="text-[11px] text-slate-400">خيارات سريعة:</span>
                  <button
                    type="button"
                    onClick={() => setPaidAmountInput('0')}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono border border-white/10 active:scale-95"
                  >
                    آجل كامل (0)
                  </button>
                  {netTotal > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaidAmountInput(String(Math.round(netTotal / 2)))}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-[11px] font-mono font-bold border border-white/10 active:scale-95"
                      >
                        نصف ({Math.round(netTotal / 2).toLocaleString()})
                      </button>
                      {[1000, 2000, 5000].map((step) => {
                        if (step >= netTotal) return null;
                        return (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setPaidAmountInput(String(step))}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 text-[11px] font-mono border border-white/10 active:scale-95"
                          >
                            +{step.toLocaleString()}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                <div className="flex justify-between font-bold text-rose-300 pt-1.5 border-t border-rose-500/20 text-xs">
                  <span>المبلغ المتبقي كدين على العميل:</span>
                  <span className="font-mono text-sm font-black text-rose-400">{remainingDebt.toLocaleString()} ر.ي</span>
                </div>
              </div>
            )}

            {/* PRIMARY GREEN SUBMIT BUTTON: Double-Submit Guard */}
            <button
              type="button"
              disabled={isSubmittingInvoice || cartItems.length === 0 || !selectedVehicle}
              onClick={handleSubmitInvoice}
              className={`w-full min-h-[56px] rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                !selectedVehicle || cartItems.length === 0 || isSubmittingInvoice
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-emerald-500/25 ring-1 ring-emerald-400/40'
              }`}
            >
              {isSubmittingInvoice ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>جاري ترحيل الفاتورة والقيود المحاسبية...</span>
                </>
              ) : (
                <span>حفظ الفاتورة وإرسال كرت الخدمة واتساب 📲</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      <NewVehicleModal
        isOpen={showNewVehicleModal}
        onClose={() => setShowNewVehicleModal(false)}
        onVehicleCreated={(v) => handleSelectVehicle(v)}
      />

      <OilSelectorModal
        isOpen={showOilModal}
        onClose={() => setShowOilModal(false)}
        inventory={inventory}
        preferredBrand={selectedVehicle ? selectedVehicle.preferred_oil_brand : 'تويوتا'}
        preferredViscosity={selectedVehicle ? selectedVehicle.preferred_viscosity : '20W-50'}
        onAddItemsToCart={(items) => handleAddMultipleToCart(items)}
      />

      <ProductPickerModal
        isOpen={pickerModalType !== null}
        onClose={() => setPickerModalType(null)}
        type={pickerModalType}
        inventory={inventory}
        onAddItemToCart={(item) => handleAddToCart(item)}
        onAddItemsToCart={(items) => handleAddMultipleToCart(items)}
        onRefreshData={onRefreshData}
      />

      <InvoiceReceiptModal
        isOpen={completedInvoice !== null}
        onClose={() => setCompletedInvoice(null)}
        invoice={completedInvoice}
        onNewInvoice={handleResetPos}
      />

      {/* Vehicle Service History Drawer */}
      <VehicleHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        vehicleId={selectedVehicle?.id}
        onRepeatService={(items) => handleRepeatItemsIntoCart(items)}
      />

      {/* Official Receipt Voucher Modal */}
      <ReceiptVoucherModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        initialData={selectedVehicle ? {
          party_type: 'customer',
          vehicle_id: selectedVehicle.id,
          customer_name: selectedVehicle.customer_name,
          plate_number: selectedVehicle.plate_number,
          balance_due: selectedVehicle.balance_due,
          description: `تحصيل دفعة نقدية من حساب العميل (${selectedVehicle.plate_number})`,
        } : null}
        vehicles={selectedVehicle ? [selectedVehicle] : []}
        onVoucherCreated={(v) => {
          if (selectedVehicle && v) {
            setSelectedVehicle((prev) => prev ? {
              ...prev,
              balance_due: Math.max(0, (Number(prev.balance_due) || 0) - (Number(v.amount) || 0)),
            } : null);
          }
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* In-App Touch Alert Dialog (بدون نوافذ المتصفح الافتراضية) */}
      {touchAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div
              className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border shadow-lg ${
                touchAlert.type === 'error'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/10'
                  : touchAlert.type === 'info'
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-sky-500/10'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/10'
              }`}
            >
              {touchAlert.type === 'error' ? (
                <AlertCircle className="w-9 h-9" />
              ) : touchAlert.type === 'info' ? (
                <Info className="w-9 h-9" />
              ) : (
                <AlertTriangle className="w-9 h-9" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{touchAlert.title}</h3>
              <p className="text-sm text-slate-300 mt-2 whitespace-pre-line leading-relaxed font-medium">
                {touchAlert.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {touchAlert.actionBtnText && touchAlert.onAction && (
                <button
                  type="button"
                  onClick={touchAlert.onAction}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition active:scale-95 shadow-lg shadow-amber-500/20"
                >
                  {touchAlert.actionBtnText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (touchAlert.onCancel) touchAlert.onCancel();
                  setTouchAlert((prev) => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-95 border border-white/10"
              >
                {touchAlert.cancelBtnText || 'حسناً، فهمت'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Touch Confirm Dialog (بدون نوافذ المتصفح الافتراضية) */}
      {touchConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{touchConfirm.title}</h3>
              <p className="text-sm text-slate-300 mt-2 whitespace-pre-line leading-relaxed font-medium">
                {touchConfirm.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const cb = touchConfirm.onConfirm;
                  setTouchConfirm((prev) => ({ ...prev, isOpen: false }));
                  if (cb) cb();
                }}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition active:scale-95 shadow-lg shadow-amber-500/20"
              >
                {touchConfirm.confirmText || 'نعم، تأكيد'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (touchConfirm.onCancel) touchConfirm.onCancel();
                  setTouchConfirm((prev) => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-white/10"
              >
                إلغاء وتراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
