import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Star,
  Settings2,
  Zap,
  Edit,
  X,
  ExternalLink,
} from 'lucide-react';

import NewVehicleModal from './NewVehicleModal';
import QuickGridConfigModal from './QuickGridConfigModal';
import OilSelectorModal from './OilSelectorModal';
import ProductPickerModal from './ProductPickerModal';
import InvoiceReceiptModal from './InvoiceReceiptModal';
import VehicleHistoryDrawer from './VehicleHistoryDrawer';
import ReceiptVoucherModal from './ReceiptVoucherModal';
import {
  isDemoMode,
  setDemoMode,
  recordBackupDownloaded,
  getQuickGridItemIds,
  getShopSettings,
} from '../utils/settings';

const getInitialNextServiceDate = () => {
  try {
    const settings = getShopSettings();
    const months = Number(settings.defaultServiceIntervalMonths) || 2;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  } catch (e) {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().split('T')[0];
  }
};

const GENERAL_QUICK_CUSTOMER = {
  id: 'quick',
  plate_number: 'فاتورة سريعة',
  plate_type: 'مؤقت',
  car_make_model: 'مشتريات وخدمات سريعة',
  customer_name: 'عميل عام (نقدي)',
  phone: '---',
  balance_due: 0,
  credit_limit: 0,
  customer_type: 'individual',
};

export default function PosScreen({
  inventory = [],
  workers = [],
  onRefreshData,
  initialVehicle = null,
  onOpenStatement,
  isOwnerMode = false,
  onRequireOwnerAuth,
}) {
  // Dual-Mode State: 'quick' (فاتورة سريعة) | 'oil' (فاتورة غيار زيت)
  const [posMode, setPosMode] = useState('quick');

  // Vehicle / Customer Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef(null);

  // In Quick Mode: quickCustomerOverride can be null (meaning default general customer) or a registered customer
  const [quickCustomerOverride, setQuickCustomerOverride] = useState(null);
  const [customerNameNote, setCustomerNameNote] = useState('');

  // In Oil Mode: selectedVehicle is the car in the pit
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicle);
  const [lastServiceInfo, setLastServiceInfo] = useState(null);

  // Modals State
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showQuickGridConfigModal, setShowQuickGridConfigModal] = useState(false);
  const [showOilModal, setShowOilModal] = useState(false);
  const [pickerModalType, setPickerModalType] = useState(null);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [lastSubmittedInvoice, setLastSubmittedInvoice] = useState(null);

  // Quick Mode Active Category Filter
  const [quickActiveCategory, setQuickActiveCategory] = useState('all'); // 'all' | 'services' | 'oils' | 'fluids' | 'batteries'
  const [pinnedQuickIds, setPinnedQuickIds] = useState(getQuickGridItemIds() || []);

  // Training & Backup Sentinel State
  const [demoMode, setDemoModeState] = useState(isDemoMode());
  const [backupStatus, setBackupStatus] = useState(null);
  const [dismissedBackupAlert, setDismissedBackupAlert] = useState(false);

  // Odometer State (strictly 3000 km default interval for oil change mode)
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [kmInterval, setKmInterval] = useState(3000);
  const [manualNextOdometer, setManualNextOdometer] = useState('');
  const [serviceDateInput, setServiceDateInput] = useState(getInitialNextServiceDate());

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
  const [isVoidingInvoice, setIsVoidingInvoice] = useState(false);
  const [cartNoticeMessage, setCartNoticeMessage] = useState('');
  const [clearCartConfirmPending, setClearCartConfirmPending] = useState(false);

  // Safety Inspection Capsule State (8 points)
  const [safetyPoints, setSafetyPoints] = useState({
    radiator: true,
    brake: true,
    washer: true,
    tires: true,
    air_filter: true,
    cabin_filter: true,
    leaks: true,
    battery: true,
  });
  const [isSafetyExpanded, setIsSafetyExpanded] = useState(false);

  // Touch Alerts & Confirms State
  const [touchAlert, setTouchAlert] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
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

  // Effective Active Customer depending on posMode
  const activeCustomer = useMemo(() => {
    if (posMode === 'quick') {
      return quickCustomerOverride || GENERAL_QUICK_CUSTOMER;
    }
    return selectedVehicle;
  }, [posMode, quickCustomerOverride, selectedVehicle]);

  // Click Outside to Dismiss Autocomplete Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Backup status fetcher
  const fetchBackupStatus = async () => {
    try {
      const res = await fetch('/api/backup/status');
      const data = await res.json();
      if (data.success) {
        setBackupStatus(data.data);
      }
    } catch (e) {
      // background error ignore
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
      setServiceDateInput(getInitialNextServiceDate());
    };
    const handlePinnedUpdate = () => {
      setPinnedQuickIds(getQuickGridItemIds() || []);
    };
    window.addEventListener('quick_lube_settings_updated', handleSettingsUpdate);
    window.addEventListener('quick_lube_pinned_items_updated', handlePinnedUpdate);
    return () => {
      window.removeEventListener('quick_lube_settings_updated', handleSettingsUpdate);
      window.removeEventListener('quick_lube_pinned_items_updated', handlePinnedUpdate);
    };
  }, []);

  // Fetch last service details when selectedVehicle changes
  const fetchVehicleLastService = async (vehicleId) => {
    if (!vehicleId) {
      setLastServiceInfo(null);
      return;
    }
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/last-service`);
      const data = await res.json();
      if (data.success && data.data) {
        setLastServiceInfo(data.data);
      } else {
        setLastServiceInfo(null);
      }
    } catch (err) {
      setLastServiceInfo(null);
    }
  };

  useEffect(() => {
    if (initialVehicle) {
      handleSelectVehicle(initialVehicle);
      setPosMode('oil');
    }
  }, [initialVehicle]);

  // Set default technician
  useEffect(() => {
    if (workers.length > 0 && !selectedWorkerId) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [workers, selectedWorkerId]);

  // Search vehicles & customers (searches by Plate, Name, Phone)
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

  // Handle vehicle/customer selection
  const handleSelectVehicle = (vehicle) => {
    if (posMode === 'quick') {
      setQuickCustomerOverride(vehicle);
    } else {
      setSelectedVehicle(vehicle);
      fetchVehicleLastService(vehicle.id);
      if (vehicle.last_odometer) {
        setCurrentOdometer(String(vehicle.last_odometer));
      }
      setKmInterval(3000);
      setManualNextOdometer('');
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Dynamic Odometer Calculation
  const nextOdometer = useMemo(() => {
    if (manualNextOdometer && Number(manualNextOdometer) > 0) {
      return Number(manualNextOdometer);
    }
    if (!currentOdometer) return '';
    const cur = Number(currentOdometer) || 0;
    return cur + Number(kmInterval || 3000);
  }, [currentOdometer, kmInterval, manualNextOdometer]);

  const nextServiceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  }, []);

  const isOdometerSuspicious = useMemo(() => {
    if (posMode !== 'oil') return false;
    const prevOdo = lastServiceInfo?.current_odometer || selectedVehicle?.last_odometer;
    if (!prevOdo || !currentOdometer) return false;
    const cur = Number(currentOdometer);
    const prev = Number(prevOdo);
    return cur > 0 && prev > 0 && cur < prev;
  }, [posMode, selectedVehicle, currentOdometer, lastServiceInfo]);

  // Passed Safety Points count
  const passedSafetyCount = useMemo(() => {
    return Object.values(safetyPoints).filter(Boolean).length;
  }, [safetyPoints]);

  const failedSafetyPoints = useMemo(() => {
    const labels = {
      radiator: 'ماء الرديتر',
      brake: 'زيت الفرامل',
      washer: 'ماء المساحات',
      tires: 'ضغط الكفرات',
      air_filter: 'فلتر الهواء',
      cabin_filter: 'فلتر المكيف',
      leaks: 'فحص التهريب',
      battery: 'فحص البطارية',
    };
    return Object.entries(safetyPoints)
      .filter(([_, ok]) => !ok)
      .map(([k]) => labels[k] || k);
  }, [safetyPoints]);

  // Cart Operations
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

  const handleClearCartClick = () => {
    if (!clearCartConfirmPending) {
      setClearCartConfirmPending(true);
      setTimeout(() => setClearCartConfirmPending(false), 4000);
    } else {
      setCartItems([]);
      setClearCartConfirmPending(false);
      setCartNoticeMessage('تم تفريغ بنود السلة بالكامل.');
      setTimeout(() => setCartNoticeMessage(''), 3500);
    }
  };

  // Repeat items from last service into cart
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
    setCartNoticeMessage('تم نسخ بنود الخدمة السابقة إلى السلة بنجاح. يمكنك تعديل الكميات أو إضافة أصناف بحرية.');
    setTimeout(() => setCartNoticeMessage(''), 5000);
  };

  const handleRepeatLastService = async () => {
    if (!selectedVehicle) return;
    if (lastServiceInfo?.items && lastServiceInfo.items.length > 0) {
      handleRepeatItemsIntoCart(lastServiceInfo.items);
      return;
    }
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle.id}`);
      const data = await res.json();
      if (data.success && data.data.history && data.data.history.length > 0) {
        handleRepeatItemsIntoCart(data.data.history[0].items);
      } else {
        setTouchAlert({
          isOpen: true,
          title: 'سجل الخدمات السابقة',
          message: 'لا يوجد سجل خدمات سابق مسجل لهذه السيارة لتكراره.',
          type: 'info',
          cancelBtnText: 'حسناً، فهمت',
        });
      }
    } catch (err) {
      console.error('Error repeating last service:', err);
    }
  };

  // Financial Separation: Goods Sales vs Services Revenue
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

  // Fleet discount auto-calculation
  useEffect(() => {
    if (activeCustomer && Number(activeCustomer.discount_percent) > 0 && grossTotal > 0) {
      const fleetDiscount = Math.round(grossTotal * (Number(activeCustomer.discount_percent) / 100));
      setSpecialDiscount(fleetDiscount);
    }
  }, [activeCustomer, grossTotal]);

  const netTotal = useMemo(() => {
    return Math.max(0, grossTotal - Number(specialDiscount));
  }, [grossTotal, specialDiscount]);

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

  // Poka-Yoke Validated Invoice Submission
  const handleSubmitInvoice = async () => {
    if (cartItems.length === 0) {
      setTouchAlert({
        isOpen: true,
        title: 'سلة الفاتورة فارغة',
        message: 'يرجى إضافة صنف أو خدمة إلى السلة قبل حفظ الفاتورة.',
        type: 'warning',
        cancelBtnText: 'حسناً',
      });
      return;
    }

    if (posMode === 'oil' && !selectedVehicle) {
      setTouchAlert({
        isOpen: true,
        title: 'يرجى اختيار السيارة أولاً',
        message: 'في نمط فاتورة غيار الزيت، يجب اختيار سيارة بالبحث أو الضغط على "+ إضافة عميل جديد".',
        type: 'warning',
        cancelBtnText: 'حسناً',
      });
      return;
    }

    if (!selectedWorkerId) {
      setTouchAlert({
        isOpen: true,
        title: 'تحديد الفني المسؤول',
        message: 'يرجى اختيار الفني المسؤول عن تنفيذ الخدمة من قائمة العمال.',
        type: 'warning',
        cancelBtnText: 'حسناً',
      });
      return;
    }

    // Poka-Yoke: Prevent anonymous credit sales
    if (paymentMethod === 'credit') {
      const isGeneralAccount =
        !activeCustomer ||
        activeCustomer.id === 'quick' ||
        activeCustomer.customer_name === 'عميل عام (نقدي)' ||
        !activeCustomer.phone ||
        activeCustomer.phone === '---';

      if (isGeneralAccount) {
        setTouchAlert({
          isOpen: true,
          title: '⚠️ مانع الأخطاء: لا يمكن البيع بالآجل لحساب عام مجهول!',
          message:
            'لحفظ حقوق المركز وضمان استرداد المديونية، يُمنع تسجيل دين آجل لحساب عام بدون اسم عميل حقيقي ورقم هاتف.\n\nيرجى اختيار عميل مسجل بالبحث أو الضغط على "+ إضافة عميل جديد".',
          type: 'error',
          actionBtnText: 'تسجيل عميل جديد 📝',
          onAction: () => {
            setTouchAlert((prev) => ({ ...prev, isOpen: false }));
            setShowNewVehicleModal(true);
          },
          cancelBtnText: 'تغيير السداد إلى كاش 💵',
          onCancel: () => setPaymentMethod('cash'),
        });
        return;
      }
    }

    // Odometer warning in oil mode
    if (posMode === 'oil' && isOdometerSuspicious) {
      setTouchConfirm({
        isOpen: true,
        title: '⚠️ تنبيه عداد الكيلومترات',
        message: `قراءة العداد المدخلة (${Number(currentOdometer).toLocaleString()} كم) أقل من القراءة السابقة المسجلة (${Number(lastServiceInfo?.current_odometer || selectedVehicle?.last_odometer).toLocaleString()} كم)!\n\nهل تؤكد صحة القراءة الحالية واستمرار الحفظ؟`,
        confirmText: 'نعم، القراءة صحيحة واستمرار',
        onConfirm: () => checkPriceAndCreditLimitThenSubmit(),
      });
      return;
    }

    checkPriceAndCreditLimitThenSubmit();
  };

  const checkPriceAndCreditLimitThenSubmit = () => {
    // Below Cost Protection (Can be approved by owner or authorized cashier)
    const belowCostItem = cartItems.find((ci) => {
      if (!ci.inventory_id || ci.item_type === 'service') return false;
      const inv = inventory.find((i) => i.id === ci.inventory_id);
      return inv && inv.cost_price && Number(ci.unit_price) < Number(inv.cost_price);
    });

    if (belowCostItem) {
      const inv = inventory.find((i) => i.id === belowCostItem.inventory_id);
      setTouchConfirm({
        isOpen: true,
        title: '⚠️ تنبيه: البيع بأقل من التكلفة!',
        message: `الصنف "${belowCostItem.description}" يباع بـ (${Number(belowCostItem.unit_price).toLocaleString()} ر.ي) وهو أقل من سعر التكلفة (${Number(inv.cost_price).toLocaleString()} ر.ي).\n\nهل تؤكد اعتماد هذا البيع الاستثنائي؟`,
        confirmText: 'نعم، اعتماد البيع',
        onConfirm: () => checkCreditLimitThenSubmit(),
      });
      return;
    }

    checkCreditLimitThenSubmit();
  };

  const checkCreditLimitThenSubmit = () => {
    if (paymentMethod === 'credit' && activeCustomer && activeCustomer.id !== 'quick') {
      const currentDebt = Number(activeCustomer.balance_due) || 0;
      const creditLimit = Number(activeCustomer.credit_limit) || 50000;
      const projected = currentDebt + remainingDebt;
      if (projected > creditLimit) {
        setTouchConfirm({
          isOpen: true,
          title: '⚠️ تنبيه سقف المديونية',
          message: `إجمالي دين العميل المتوقع (${projected.toLocaleString()} ر.ي) سيتجاوز سقف الائتمان (${creditLimit.toLocaleString()} ر.ي).\n\nهل تؤكد منح هذا الائتمان الاستثنائي؟`,
          confirmText: 'تأكيد منح الائتمان',
          onConfirm: () => executeSubmitInvoice(),
        });
        return;
      }
    }
    executeSubmitInvoice();
  };

  const executeSubmitInvoice = async () => {
    try {
      setIsSubmittingInvoice(true);

      // Determine vehicle_id for backend
      let vehicleIdToSubmit = activeCustomer?.id;
      if (!vehicleIdToSubmit || vehicleIdToSubmit === 'quick') {
        // Find seeded 'فاتورة سريعة' vehicle_id
        const searchRes = await fetch('/api/vehicles/search?q=فاتورة+سريعة');
        const searchData = await searchRes.json();
        if (searchData.success && searchData.data.length > 0) {
          vehicleIdToSubmit = searchData.data[0].id;
        } else {
          // Fallback to first available vehicle if any
          vehicleIdToSubmit = 1;
        }
      }

      const noteToSave = customerNameNote.trim()
        ? `العميل: ${customerNameNote.trim()} ${invoiceNotes ? `| ${invoiceNotes}` : ''}`
        : invoiceNotes || null;

      const payload = {
        vehicle_id: vehicleIdToSubmit,
        worker_id: selectedWorkerId,
        current_odometer: posMode === 'oil' ? (Number(currentOdometer) || 0) : 0,
        next_odometer: posMode === 'oil' ? (Number(nextOdometer) || 0) : 0,
        next_service_date: posMode === 'oil' ? (serviceDateInput || nextServiceDate) : nextServiceDate,
        items_total: goodsTotal,
        labor_total: servicesTotal,
        scrap_battery_deduction: 0,
        discount: Number(specialDiscount) || 0,
        payment_method: paymentMethod,
        wallet_ref_number: walletRefNumber || null,
        paid_amount: effectivePaidAmount,
        notes: noteToSave,
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

      const completedData = {
        ...data.data,
        safetyPoints: posMode === 'oil' ? safetyPoints : null,
        worker_name: workers.find((w) => w.id === selectedWorkerId)?.name || 'فني المركز',
      };

      setCompletedInvoice(completedData);
      setLastSubmittedInvoice(completedData);

      // Reset form for next customer
      handleResetPos();

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

  // Cashier Void / Delete Mistaken Invoice
  const handleVoidLastInvoice = () => {
    if (!lastSubmittedInvoice) return;
    setTouchConfirm({
      isOpen: true,
      title: '⚠️ تأكيد إلغاء وتعديل الفاتورة الأخيرة',
      message: `هل تؤكد إلغاء الفاتورة رقم (${lastSubmittedInvoice.invoice_number}) بمبلغ (${Number(lastSubmittedInvoice.net_total).toLocaleString()} ر.ي)؟\n\nسيقوم النظام فوراً باسترجاع كميات المخزون وتصحيح الصندوق وتسوية الديون تلقائياً.`,
      confirmText: 'نعم، إلغاء الفاتورة واسترجاع المخزون',
      onConfirm: async () => {
        try {
          setIsVoidingInvoice(true);
          const res = await fetch(`/api/invoices/${lastSubmittedInvoice.id}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'فشل في إلغاء الفاتورة');

          setCartNoticeMessage(`تم إلغاء الفاتورة ${lastSubmittedInvoice.invoice_number} بنجاح واسترجاع المخزون.`);
          setLastSubmittedInvoice(null);
          if (completedInvoice?.id === lastSubmittedInvoice.id) {
            setCompletedInvoice(null);
          }
          if (onRefreshData) onRefreshData();
          setTimeout(() => setCartNoticeMessage(''), 5000);
        } catch (err) {
          setTouchAlert({
            isOpen: true,
            title: 'خطأ في الإلغاء',
            message: err.message,
            type: 'error',
            cancelBtnText: 'إغلاق',
          });
        } finally {
          setIsVoidingInvoice(false);
        }
      },
    });
  };

  const handleResetPos = () => {
    setCartItems([]);
    if (posMode === 'quick') {
      setQuickCustomerOverride(null);
      setCustomerNameNote('');
    } else {
      setSelectedVehicle(null);
      setLastServiceInfo(null);
      setCurrentOdometer('');
      setManualNextOdometer('');
      setServiceDateInput(getInitialNextServiceDate());
    }
    setSpecialDiscount(0);
    setInvoiceNotes('');
    setPaymentMethod('cash');
    setPaidAmountInput('');
    setWalletRefNumber('');
  };

  // Pinned Quick Items from Inventory
  const pinnedItems = useMemo(() => {
    if (pinnedQuickIds && pinnedQuickIds.length > 0) {
      return inventory.filter((i) => pinnedQuickIds.includes(i.id));
    }
    // Smart default pinned items: popular patches, coolants, common oils
    return inventory
      .filter((i) => {
        const n = (i.name || '').toLowerCase();
        return (
          n.includes('رقعة') ||
          n.includes('تيوبلس') ||
          n.includes('ماء رديتر') ||
          n.includes('زيت فرامل') ||
          n.includes('تويوتا')
        );
      })
      .slice(0, 8);
  }, [inventory, pinnedQuickIds]);

  // Quick Mode Products grouped by active category
  const quickCategoryProducts = useMemo(() => {
    if (quickActiveCategory === 'all') return [];

    return inventory.filter((item) => {
      if (quickActiveCategory === 'services') {
        return item.category === 'service' || item.item_type === 'service';
      }
      if (quickActiveCategory === 'oils') {
        return item.category === 'oil';
      }
      if (quickActiveCategory === 'fluids') {
        return item.category === 'filter' || item.category === 'accessory';
      }
      if (quickActiveCategory === 'batteries') {
        return item.category === 'battery' || item.category === 'tire';
      }
      return true;
    });
  }, [inventory, quickActiveCategory]);

  return (
    <div className="min-h-full flex flex-col gap-3 select-none pb-8">
      {/* 0. TRAINING / DEMO MODE ALERT BANNER */}
      {demoMode && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-500/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in flex-shrink-0">
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
                يمكنك تجربة البيع وتدريب العمال الجدد بحرية دون التأثير على حسابات المحل الحقيقية.
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

      {/* 0.1 BACKUP ALERT */}
      {backupStatus?.isStale && !dismissedBackupAlert && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/40 border border-rose-500/40 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center text-base shadow">
              🛡️
            </div>
            <div>
              <div className="text-rose-300 font-extrabold text-xs flex items-center gap-2">
                <span>درع الأمان: تنبيه حفظ نسخة احتياطية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold">
                  {backupStatus.daysAgo !== null && backupStatus.daysAgo !== undefined ? `مضى ${backupStatus.daysAgo} أيام` : 'لم يتم الحفظ'}
                </span>
              </div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                مرّ أكثر من 7 أيام دون تنزيل نسخة احتياطية محلية لحفظ بيانات المركز.
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
              className="min-h-[36px] px-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-slate-950 font-black text-xs transition active:scale-95 shadow flex items-center gap-1.5"
            >
              <span>تحميل نسخة احتياطية فوراً 💾</span>
            </a>
            <button
              type="button"
              onClick={() => setDismissedBackupAlert(true)}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs font-bold transition"
            >
              تخطي ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER: DUAL-MODE SWITCHER & SEARCH & ADD CUSTOMER */}
      <div className="apple-glass rounded-3xl p-3.5 border border-white/10 flex-shrink-0 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Dual-Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/90 border border-white/10 flex-shrink-0">
            <button
              type="button"
              onClick={() => setPosMode('quick')}
              className={`min-h-[48px] px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 active:scale-95 ${
                posMode === 'quick'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4 stroke-[2.5]" />
              <span>⚡ فاتورة سريعة</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/20 font-bold hidden sm:inline">
                رقع ومبيعات مباشرة
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPosMode('oil')}
              className={`min-h-[48px] px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 active:scale-95 ${
                posMode === 'oil'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 shadow-md shadow-teal-500/25 ring-1 ring-teal-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Droplets className="w-4 h-4 stroke-[2.5]" />
              <span>🛢️ فاتورة غيار زيت</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/20 font-bold hidden sm:inline">
                العداد والخدمة
              </span>
            </button>
          </div>

          {/* Unified Search Input (Click-Outside dismissible) */}
          <div className="relative flex-1" ref={searchContainerRef}>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  posMode === 'quick'
                    ? 'ابحث باسم العميل أو رقم هاتفه أو رقم اللوحة لربط الفاتورة بحسابه (اختياري)...'
                    : 'ابحث برقم اللوحة (مثلاً: 1-45892) أو اسم العميل أو الهاتف لاختيار السيارة...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[48px] pr-11 pl-4 rounded-2xl bg-slate-900 border border-white/15 text-white placeholder-slate-400 font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400 shadow-inner"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 apple-glass-dropdown rounded-2xl border border-white/20 overflow-hidden shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
                {searchResults.map((v) => {
                  const isNoPlate = !v.plate_number || v.plate_number.startsWith('بدون');
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVehicle(v)}
                      className="w-full p-3 text-right hover:bg-white/10 border-b border-white/5 flex items-center justify-between transition group"
                    >
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span className="group-hover:text-amber-300 transition">
                            {isNoPlate ? '🚗 (بدون لوحة)' : v.plate_number}
                          </span>
                          {!isNoPlate && (
                            <span className="text-xs text-amber-400 font-normal">({v.plate_type})</span>
                          )}
                          <span className="text-xs text-slate-300 font-normal">| {v.car_make_model}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          العميل: <span className="text-white font-bold">{v.customer_name}</span> &bull;{' '}
                          <span className="font-mono">{v.phone}</span>
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Golden Add New Customer Button (Plate is Optional) */}
          <button
            type="button"
            onClick={() => {
              setEditingVehicle(null);
              setShowNewVehicleModal(true);
            }}
            className="min-h-[48px] px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ إضافة عميل جديد 👤</span>
          </button>
        </div>

        {/* MODE 1 (QUICK): Customer context strip */}
        {posMode === 'quick' && (
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-bold">الحساب المالي للفاتورة:</span>
              {quickCustomerOverride ? (
                <div className="flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-xl text-indigo-300 font-bold animate-in fade-in">
                  <span>
                    العميل: <strong className="text-white">{quickCustomerOverride.customer_name}</strong>
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono">{quickCustomerOverride.phone}</span>
                  {quickCustomerOverride.balance_due > 0 && (
                    <span className="text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded font-mono">
                      دين: {Number(quickCustomerOverride.balance_due).toLocaleString()} ر.ي
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setQuickCustomerOverride(null)}
                    className="text-slate-400 hover:text-rose-400 font-black text-xs mr-1"
                    title="العودة للحساب العام"
                  >
                    ✕ العودة لعميل عام
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-3 py-1 rounded-xl text-emerald-400 font-bold">
                  <span>👤 عميل عام (نقدي)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (تلقائي — يمكنك البحث لربط الفاتورة بأي عميل)
                  </span>
                </div>
              )}
            </div>

            {/* Optional Customer Name override for receipt note */}
            {!quickCustomerOverride && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">اسم العميل بالإيصال (اختياري):</span>
                <input
                  type="text"
                  placeholder="مثال: أبو علي / كاشير"
                  value={customerNameNote}
                  onChange={(e) => setCustomerNameNote(e.target.value)}
                  className="w-40 min-h-[34px] px-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* MODE 2 (OIL): Selected Vehicle Card with PREVIOUS ODOMETER & Approved Oil */}
        {posMode === 'oil' && selectedVehicle && (
          <div className="pt-2 border-t border-teal-500/20 animate-in fade-in space-y-2">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-900 to-slate-900 border border-teal-500/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-mono font-extrabold shadow-sm">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base text-white">
                      {selectedVehicle.plate_number && !selectedVehicle.plate_number.startsWith('بدون')
                        ? selectedVehicle.plate_number
                        : '🚗 (بدون لوحة)'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-bold">
                      {selectedVehicle.car_make_model}
                    </span>
                    <span className="text-xs text-slate-300 font-bold">
                      العميل: <strong className="text-white">{selectedVehicle.customer_name}</strong> &bull;{' '}
                      <span className="font-mono">{selectedVehicle.phone}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs mt-1 flex-wrap">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <span>🛢️ الزيت المعتمد:</span>
                      <strong>
                        {selectedVehicle.preferred_oil_brand || 'تويوتا'} ({selectedVehicle.preferred_viscosity || '20W-50'})
                      </strong>
                    </span>

                    {/* Prominent Previous Odometer Tag */}
                    <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono font-black text-xs flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>
                        العداد السابق:{' '}
                        {lastServiceInfo?.current_odometer
                          ? `${Number(lastServiceInfo.current_odometer).toLocaleString()} كم`
                          : selectedVehicle.last_odometer
                          ? `${Number(selectedVehicle.last_odometer).toLocaleString()} كم`
                          : 'لا يوجد قراءة سابقة'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions for Selected Vehicle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRepeatLastService}
                  className="min-h-[38px] px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  title="تكرار بنود آخر خدمة غيار زيت للسلة لتعديلها"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>🔄 تكرار آخر غيار زيت</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  className="min-h-[38px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>السجل</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicle(selectedVehicle);
                    setShowNewVehicleModal(true);
                  }}
                  className="min-h-[38px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 font-bold text-xs flex items-center gap-1 transition active:scale-95"
                  title="تعديل بيانات العميل أو إضافة اللوحة"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicle(null);
                    setLastServiceInfo(null);
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition"
                  title="إلغاء اختيار السيارة"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Outstanding Debt Alert in Oil Mode */}
            {selectedVehicle.balance_due > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>
                    ⚠️ رصيد الدين السابق:{' '}
                    <span className="font-mono text-white text-sm font-black">
                      {Number(selectedVehicle.balance_due).toLocaleString()} ر.ي
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition active:scale-95 shadow-sm"
                  >
                    قبض دفعة 📥
                  </button>
                  {onOpenStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenStatement('customer', selectedVehicle.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-extrabold transition active:scale-95"
                    >
                      كشف الحساب 🧾
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notice Banner */}
      {cartNoticeMessage && (
        <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{cartNoticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setCartNoticeMessage('')}
            className="text-amber-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. TWO-COLUMN POS INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 items-start">
        {/* LEFT COLUMN: PRODUCTS / SERVICES / ODOMETER (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-3 pr-0.5">
          {/* ==================== A. QUICK MODE INTERFACE (فاتورة سريعة) ==================== */}
          {posMode === 'quick' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Pinned Quick Items Row */}
              <div className="apple-glass rounded-3xl p-3.5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400/40 text-amber-400" />
                    <span>الأصناف والخدمات السريعة الأكثر طلباً (نقرة واحدة للإضافة):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickGridConfigModal(true)}
                    className="text-[11px] text-slate-400 hover:text-amber-300 font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 transition active:scale-95"
                    title="تخصيص الأصناف السريعة وتثبيتها من المخزون"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>⚙️ تخصيص الأصناف السريعة</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {pinnedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handleAddToCart({
                          inventory_id: item.id,
                          item_type: item.item_type || (item.category === 'service' ? 'service' : 'product'),
                          description: item.name,
                          qty: 1,
                          unit_price: Number(item.sell_price) || 0,
                        })
                      }
                      className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400 text-right transition active:scale-95 group shadow-sm flex flex-col justify-between min-h-[64px]"
                    >
                      <div className="font-extrabold text-white text-xs group-hover:text-amber-300 transition truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                        <span className="text-amber-400 font-black">{Number(item.sell_price).toLocaleString()} ر.ي</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-amber-200">+ إضافة</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Categorical Drilldown Tiles (رقع، زيوت، سوائل، بطاريات) */}
              <div className="apple-glass rounded-3xl p-3.5 border border-white/10 space-y-3">
                <div className="text-xs font-black text-slate-300">
                  تصفح المنتجات والخدمات حسب القسم:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'services', label: '🛞 رقع وخدمات إطارات', count: inventory.filter((i) => i.category === 'service' || i.item_type === 'service').length },
                    { id: 'oils', label: '🛢️ زيوت المحركات', count: inventory.filter((i) => i.category === 'oil').length },
                    { id: 'fluids', label: '💧 سوائل وفلاتر', count: inventory.filter((i) => i.category === 'filter' || i.category === 'accessory').length },
                    { id: 'batteries', label: '🔋 كفرات وبطاريات', count: inventory.filter((i) => i.category === 'battery' || i.category === 'tire').length },
                  ].map((cat) => {
                    const isSelected = quickActiveCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setQuickActiveCategory(isSelected ? 'all' : cat.id)}
                        className={`min-h-[58px] p-2.5 rounded-2xl border text-right transition flex flex-col justify-between active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-white font-black shadow-md'
                            : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-xs font-extrabold truncate">{cat.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {cat.count} أصناف متاحة {isSelected ? '▲ إخفاء' : '▼ عرض'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded Category Products Grid */}
                {quickActiveCategory !== 'all' && (
                  <div className="pt-2 border-t border-white/10 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">
                        قائمة أصناف القسم ({quickCategoryProducts.length} صنف):
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickActiveCategory('all')}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        إغلاق القائمة ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {quickCategoryProducts.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() =>
                            handleAddToCart({
                              inventory_id: prod.id,
                              item_type: prod.item_type || (prod.category === 'service' ? 'service' : 'product'),
                              description: prod.name,
                              qty: 1,
                              unit_price: Number(prod.sell_price) || 0,
                            })
                          }
                          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-amber-500/15 border border-white/10 hover:border-amber-400/50 text-right transition active:scale-[0.98] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-xs text-white truncate flex items-center gap-1.5">
                              <span>{prod.name}</span>
                              {prod.viscosity && (
                                <span className="text-[10px] px-1.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                                  {prod.viscosity}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                              <span className="text-amber-400 font-bold">{Number(prod.sell_price).toLocaleString()} ر.ي</span>
                              <span>&bull;</span>
                              <span>{prod.item_type === 'service' ? 'خدمة ورشة' : `متبقي: ${prod.stock_qty}`}</span>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex-shrink-0">
                            + إضافة
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Technician Selector Strip (Salaried Workers - No Labor Commissions) */}
              <div className="apple-glass rounded-3xl p-3 border border-white/10">
                <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>الفني المسؤول عن تنفيذ الخدمة:</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">طاقم المركز المعتمد</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {workers.map((w) => {
                    const isSelected = selectedWorkerId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedWorkerId(w.id)}
                        className={`min-h-[44px] px-3 py-1.5 rounded-2xl border text-right transition flex items-center justify-between ${
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
            </div>
          )}

          {/* ==================== B. OIL CHANGE MODE INTERFACE (فاتورة غيار زيت) ==================== */}
          {posMode === 'oil' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Odometer Tracker Bar (Laptop Keyboard Friendly + strictly 3000 km default) */}
              <div className="apple-glass rounded-3xl p-4 border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-teal-300 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-teal-400" />
                    <span>قراءة عداد الكيلومترات وموعد الخدمة القادمة:</span>
                  </span>

                  {/* Single Default Interval Badge - Editable on click */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-teal-500/40 px-3 py-1.5 rounded-xl shadow-inner">
                    <span className="text-[11px] text-teal-300 font-bold">مسافة الغيار الافتراضية:</span>
                    <span className="text-teal-400 font-bold text-xs">+</span>
                    <input
                      type="number"
                      value={kmInterval}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setKmInterval(val >= 0 ? val : 0);
                        setManualNextOdometer('');
                      }}
                      className="w-16 min-h-[28px] px-1 bg-slate-950 border border-teal-500/40 rounded-lg text-teal-300 font-mono font-black text-center text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
                      title="انقر لتعديل مسافة الكيلومترات الافتراضية"
                    />
                    <span className="text-[11px] text-teal-300 font-bold">كم (افتراضي)</span>
                  </div>
                </div>

                {/* Suspicious Odometer Poka-Yoke Banner */}
                {isOdometerSuspicious && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-amber-300 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>
                        تنبيه: قراءة العداد المدخلة ({Number(currentOdometer).toLocaleString()} كم) أقل من القراءة السابقة (
                        {Number(lastServiceInfo?.current_odometer || selectedVehicle?.last_odometer).toLocaleString()} كم)!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentOdometer(String(lastServiceInfo?.current_odometer || selectedVehicle?.last_odometer || ''))
                      }
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shrink-0 transition active:scale-95 shadow-sm"
                    >
                      تصحيح
                    </button>
                  </div>
                )}

                {/* Inputs for Laptop Keyboard */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-bold mb-1">
                      العداد الحالي للسيارة (كم):
                    </label>
                    <input
                      type="number"
                      placeholder="مثال: 125000"
                      value={currentOdometer}
                      onChange={(e) => setCurrentOdometer(e.target.value)}
                      className={`w-full min-h-[46px] px-3 rounded-xl bg-slate-900 border font-mono text-base font-extrabold text-white focus:outline-none text-center ${
                        isOdometerSuspicious
                          ? 'border-amber-500 ring-1 ring-amber-500/50'
                          : 'border-white/10 focus:border-teal-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-bold mb-1">
                      عداد الغيار القادم (+{kmInterval || 3000} تلقائي):
                    </label>
                    <input
                      type="number"
                      placeholder={nextOdometer ? String(nextOdometer) : 'يُحسب بعد إدخال الحالي'}
                      value={manualNextOdometer || nextOdometer || ''}
                      onChange={(e) => setManualNextOdometer(e.target.value)}
                      className="w-full min-h-[46px] px-3 rounded-xl bg-slate-900 border border-teal-500/30 font-mono text-base font-extrabold text-teal-300 focus:outline-none focus:border-teal-400 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-bold mb-1">
                      تاريخ الغيار القادم المقترح:
                    </label>
                    <input
                      type="date"
                      value={serviceDateInput}
                      onChange={(e) => setServiceDateInput(e.target.value)}
                      className="w-full min-h-[46px] px-3 rounded-xl bg-slate-900 border border-white/15 font-mono text-sm font-bold text-slate-200 focus:outline-none focus:border-teal-400 text-center cursor-pointer"
                      title="انقر لتعديل موعد الخدمة باليوم أو الشهر أو السنة"
                    />
                  </div>
                </div>
              </div>

              {/* Oil Change Action Cards: Oil Selector + 1-INVOICE ADD EXTRA ITEM BUTTON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Main Oil Selector */}
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
                      غيار الزيت الرئيسي
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-black text-white group-hover:text-amber-300 transition">
                      🛢️ اختيار الزيت
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      الماركة، اللزوجة، والعبوات والفلتر الأصلي
                    </div>
                  </div>
                </button>

                {/* 2. ADD EXTRA PRODUCT OR SERVICE ON THE SAME INVOICE */}
                <button
                  type="button"
                  onClick={() => setPickerModalType('services')}
                  className="min-h-[105px] p-4 rounded-3xl apple-glass-interactive border border-teal-500/40 hover:border-teal-400 flex flex-col justify-between group shadow-xl active:scale-[0.98] text-right bg-gradient-to-br from-teal-500/10 to-transparent"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center shadow-lg shadow-teal-500/10 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6 stroke-[3]" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-black border border-teal-500/30">
                      فاتورة واحدة شاملة
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-black text-white group-hover:text-teal-300 transition flex items-center gap-1.5">
                      <span>➕ إضافة صنف / خدمة إضافية</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      ماء رديتر، رقعة، فلتر مكيف، بطارية لنفس الفاتورة
                    </div>
                  </div>
                </button>
              </div>

              {/* Technician Assignment Strip */}
              <div className="apple-glass rounded-3xl p-3 border border-white/10">
                <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-400" />
                    <span>الفني المسؤول عن تنفيذ غيار الزيت:</span>
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
                        className={`min-h-[44px] px-3 py-1.5 rounded-2xl border text-right transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-500/20 border-teal-400 text-white font-bold shadow-md shadow-teal-500/10'
                            : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs font-extrabold truncate">{w.name.split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-400 truncate">{w.role.split(' ')[1] || w.role}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-400 stroke-[3] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 8-Point Free Touch Safety Inspection Capsule */}
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
                          <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                            <span>⚠️ {passedSafetyCount}/8</span>
                            <span className="font-sans text-[10px] text-rose-300">
                              (ملاحظات: {failedSafetyPoints.join('، ')})
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSafetyExpanded(!isSafetyExpanded)}
                    className="min-h-[36px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  >
                    <span>{isSafetyExpanded ? 'إخفاء النقاط' : 'تخصيص الفحص'}</span>
                    {isSafetyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

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
                            className={`min-h-[38px] px-2 py-1 rounded-xl text-[11px] font-bold transition flex items-center justify-between border active:scale-95 ${
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
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PINNED CART & CHECKOUT (5 COLS) — FIXED VIEWPORT ERGONOMICS */}
        <div className="lg:col-span-5 apple-glass rounded-3xl p-4 border border-white/10 flex flex-col h-[calc(100vh-140px)] sticky top-2 shadow-2xl">
          {/* 1. Cart Header (Fixed) */}
          <div className="border-b border-white/10 pb-2.5 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-black text-white text-base">سلة الفاتورة</h3>
              <p className="text-xs text-slate-400">
                {cartItems.length > 0 ? `${cartItems.length} بنود في الفاتورة` : 'السلة فارغة'}
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
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تأكيد المسح؟</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearCartConfirmPending(false)}
                      className="px-2 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                    >
                      تراجع
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleClearCartClick}
                    className="text-xs text-rose-400/90 hover:text-rose-300 font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تفريغ السلة</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. Scrollable Cart Items List */}
          <div className="flex-1 min-h-0 overflow-y-auto my-2 space-y-2 pr-1 custom-scrollbar">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Package className="w-12 h-12 stroke-[1.2] mb-2 opacity-40" />
                <p className="text-sm font-semibold">لم يتم إضافة أي أصناف حتى الآن</p>
                <p className="text-xs text-slate-500 mt-1">
                  {posMode === 'quick'
                    ? 'اختر صنفاً أو خدمة من الشبكة السريعة للبدء'
                    : 'اختر الزيت أو اضغط [➕ إضافة صنف إضافي] للبدء'}
                </p>
              </div>
            ) : (
              cartItems.map((item, idx) => {
                const isService = item.item_type === 'service';
                const invMatch = item.inventory_id ? inventory.find((i) => i.id === item.inventory_id) : null;
                const isBelowCost =
                  !isService && invMatch && invMatch.cost_price && Number(item.unit_price) < Number(invMatch.cost_price);

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
                            ⚠️ أقل من التكلفة
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400 font-bold">{Number(item.unit_price).toLocaleString()} ر.ي</span>
                        {isService && (
                          <span className="text-teal-400 text-[10px] bg-teal-500/10 px-1.5 rounded">خدمة ورشة</span>
                        )}
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
                        title="حذف البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Fixed Bottom Area: Totals, Payment & Submit Button */}
          <div className="pt-2 border-t border-white/10 space-y-2 flex-shrink-0 text-xs">
            {/* Financial Breakdown */}
            <div className="space-y-1">
              {goodsTotal > 0 && servicesTotal > 0 && (
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>بضاعة: {goodsTotal.toLocaleString()} ر.ي</span>
                  <span className="text-teal-300">خدمات: {servicesTotal.toLocaleString()} ر.ي</span>
                </div>
              )}

              {/* Extra Discount Input */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                <span className="text-slate-300 font-bold">خصم إضافي:</span>
                <div className="flex items-center gap-1 text-rose-400">
                  <input
                    type="number"
                    placeholder="0"
                    value={specialDiscount || ''}
                    onChange={(e) => setSpecialDiscount(Number(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 rounded-lg bg-slate-900 border border-rose-500/30 font-mono text-xs font-bold text-center text-rose-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">ر.ي</span>
                </div>
              </div>

              {/* Net Total */}
              <div className="pt-1.5 border-t border-white/10 flex justify-between items-center">
                <span className="font-black text-sm text-white">الصافي المطلوب:</span>
                <span className="font-mono font-black text-2xl text-amber-400">
                  {netTotal.toLocaleString()}{' '}
                  <span className="text-xs font-sans text-slate-300 font-bold">ر.ي</span>
                </span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'cash', label: '💵 كاش' },
                  { id: 'jeeb', label: '📱 جيب' },
                  { id: 'jawali', label: '📱 جوالي' },
                  { id: 'kuraimi', label: '🏦 كريمي' },
                  { id: 'credit', label: '📝 آجل/جزئي' },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  const isCreditDisabled =
                    m.id === 'credit' &&
                    (!activeCustomer ||
                      activeCustomer.id === 'quick' ||
                      activeCustomer.customer_name === 'عميل عام (نقدي)');

                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isCreditDisabled}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`min-h-[42px] py-1 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center border active:scale-95 ${
                        isCreditDisabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-900 border-white/5 text-slate-500'
                          : isSelected
                          ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-400/20'
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                      }`}
                      title={isCreditDisabled ? 'الآجل متاح فقط للعملاء المسجلين' : m.label}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* Electronic Wallet Ref Number Input */}
              {['jeeb', 'jawali', 'kuraimi'].includes(paymentMethod) && (
                <div className="animate-in fade-in">
                  <input
                    type="text"
                    placeholder="رقم إشعار الحوالة للمحفظة..."
                    value={walletRefNumber}
                    onChange={(e) => setWalletRefNumber(e.target.value)}
                    className="w-full min-h-[36px] px-3 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Partial / Credit Payment breakdown */}
              {paymentMethod === 'credit' && (
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5 animate-in fade-in text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold">المبلغ المدفوع كاش/محفظة:</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-24 min-h-[34px] px-2 rounded-lg bg-slate-900 border border-white/20 font-mono text-xs font-black text-white text-center focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-rose-300 pt-1 border-t border-rose-500/20 text-[11px]">
                    <span>المتبقي كدين على العميل:</span>
                    <span className="font-mono text-xs font-black text-rose-400">
                      {remainingDebt.toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* PRIMARY GREEN SUBMIT BUTTON (Pinned in bottom) */}
            <button
              type="button"
              disabled={isSubmittingInvoice || cartItems.length === 0}
              onClick={handleSubmitInvoice}
              className={`w-full min-h-[52px] rounded-2xl font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                cartItems.length === 0 || isSubmittingInvoice
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-emerald-500/25 ring-1 ring-emerald-400/40'
              }`}
            >
              {isSubmittingInvoice ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>جاري ترحيل الفاتورة...</span>
                </>
              ) : (
                <span>حفظ الفاتورة وإصدار الإيصال 🖨️</span>
              )}
            </button>

            {/* Cashier Mistaken Invoice Void/Cancel Option */}
            {lastSubmittedInvoice && (
              <button
                type="button"
                disabled={isVoidingInvoice}
                onClick={handleVoidLastInvoice}
                className="w-full text-center text-[11px] text-rose-400/90 hover:text-rose-300 font-bold transition py-1 hover:underline"
                title="إلغاء الفاتورة الأخيرة واسترجاع المخزون تلقائياً"
              >
                {isVoidingInvoice ? 'جاري الإلغاء...' : `✕ إلغاء الفاتورة الأخيرة (#${lastSubmittedInvoice.invoice_number}) واسترجاع المخزون`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <NewVehicleModal
        isOpen={showNewVehicleModal}
        onClose={() => {
          setShowNewVehicleModal(false);
          setEditingVehicle(null);
        }}
        initialVehicle={editingVehicle}
        onVehicleCreated={(v) => handleSelectVehicle(v)}
      />

      <QuickGridConfigModal
        isOpen={showQuickGridConfigModal}
        onClose={() => setShowQuickGridConfigModal(false)}
        inventory={inventory}
        currentPinnedIds={pinnedQuickIds}
        onSave={(newIds) => setPinnedQuickIds(newIds || [])}
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

      <VehicleHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        vehicleId={selectedVehicle?.id}
        onRepeatService={(items) => handleRepeatItemsIntoCart(items)}
      />

      <ReceiptVoucherModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        initialData={
          selectedVehicle
            ? {
                party_type: 'customer',
                vehicle_id: selectedVehicle.id,
                customer_name: selectedVehicle.customer_name,
                plate_number: selectedVehicle.plate_number,
                balance_due: selectedVehicle.balance_due,
                description: `تحصيل دفعة نقدية من حساب العميل (${selectedVehicle.plate_number})`,
              }
            : null
        }
        vehicles={selectedVehicle ? [selectedVehicle] : []}
        onVoucherCreated={(v) => {
          if (selectedVehicle && v) {
            setSelectedVehicle((prev) =>
              prev
                ? {
                    ...prev,
                    balance_due: Math.max(0, (Number(prev.balance_due) || 0) - (Number(v.amount) || 0)),
                  }
                : null
            );
          }
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* In-App Touch Alert Dialog */}
      {touchAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div
              className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border shadow-lg ${
                touchAlert.type === 'error'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : touchAlert.type === 'info'
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
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
                  className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 transition active:scale-95"
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
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-95 border border-white/10"
              >
                {touchAlert.cancelBtnText || 'حسناً، فهمت'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Touch Confirm Dialog */}
      {touchConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg">
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
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 transition active:scale-95"
              >
                {touchConfirm.confirmText || 'نعم، تأكيد'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (touchConfirm.onCancel) touchConfirm.onCancel();
                  setTouchConfirm((prev) => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 border border-white/10"
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
