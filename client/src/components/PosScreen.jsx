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
  Printer,
} from 'lucide-react';

import NewVehicleModal from './NewVehicleModal';
import QuickGridConfigModal from './QuickGridConfigModal';
import OilSelectorModal from './OilSelectorModal';
import ProductPickerModal from './ProductPickerModal';
import InvoiceReceiptModal from './InvoiceReceiptModal';
import PendingServicesModal from './PendingServicesModal';
import VehicleHistoryDrawer from './VehicleHistoryDrawer';
import ReceiptVoucherModal from './ReceiptVoucherModal';
import PlateSearchFlyout from './PlateSearchFlyout';
import {
  isDemoMode,
  setDemoMode,
  recordBackupDownloaded,
  getQuickGridItemIds,
  getShopSettings,
  shouldPreventNegativeStock,
  getOilVolumePresets,
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
  const [showPlateSearchFlyout, setShowPlateSearchFlyout] = useState(false);
  const searchContainerRef = useRef(null);
  const customerSearchInputRef = useRef(null);

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
  const [selectedOilPresetQty, setSelectedOilPresetQty] = useState(null);
  const [oilVolumePresets, setOilVolumePresets] = useState(getOilVolumePresets());
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
  const [specialDiscount, setSpecialDiscount] = useState('');
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' (ر.ي) | 'percent' (%)
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'jeeb' | 'jawali' | 'kuraimi' | 'credit' | 'split'
  const [walletRefNumber, setWalletRefNumber] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitElectronicMethod, setSplitElectronicMethod] = useState('kuraimi');
  const [splitElectronicAmount, setSplitElectronicAmount] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isVoidingInvoice, setIsVoidingInvoice] = useState(false);
  const [cartNoticeMessage, setCartNoticeMessage] = useState('');
  const [clearCartConfirmPending, setClearCartConfirmPending] = useState(false);

  // Active Bay Services State
  const [showPendingServicesModal, setShowPendingServicesModal] = useState(false);
  const [pendingServicesCount, setPendingServicesCount] = useState(0);
  const [pendingBayDialog, setPendingBayDialog] = useState(null);
  const [focusPendingInvoiceId, setFocusPendingInvoiceId] = useState(null);

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

  const submitInvoiceRef = useRef(null);
  submitInvoiceRef.current = () => {
    if (cartItems.length > 0 && !isSubmittingInvoice) {
      handleSubmitInvoice();
    }
  };

  // Click Outside to Dismiss Autocomplete Dropdown & Keyboard Shortcuts
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSearchResults([]);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowPlateSearchFlyout((prev) => !prev);
      } else if (e.key === 'F3') {
        e.preventDefault();
        customerSearchInputRef.current?.focus();
      } else if (e.key === 'Enter') {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        // If not typing in input, textarea, or button
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          e.preventDefault();
          submitInvoiceRef.current?.();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitInvoiceRef.current?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    };
  }, []);

  // Fetch pending services count in the bay
  const fetchPendingServicesCount = async () => {
    try {
      const res = await fetch('/api/invoices/pending-services');
      const data = await res.json();
      if (data.success) {
        setPendingServicesCount(data.count || (data.data ? data.data.length : 0));
      }
    } catch {
      // background error ignore
    }
  };

  useEffect(() => {
    fetchPendingServicesCount();
    const interval = setInterval(fetchPendingServicesCount, 15000);
    return () => clearInterval(interval);
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
    const handleVolumePresetsUpdate = () => {
      setOilVolumePresets(getOilVolumePresets());
    };
    window.addEventListener('quick_lube_settings_updated', handleSettingsUpdate);
    window.addEventListener('quick_lube_pinned_items_updated', handlePinnedUpdate);
    window.addEventListener('quick_lube_volume_presets_updated', handleVolumePresetsUpdate);
    return () => {
      window.removeEventListener('quick_lube_settings_updated', handleSettingsUpdate);
      window.removeEventListener('quick_lube_pinned_items_updated', handlePinnedUpdate);
      window.removeEventListener('quick_lube_volume_presets_updated', handleVolumePresetsUpdate);
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
    if (!vehicle) return;
    const normalized = {
      ...vehicle,
      id: vehicle.id || vehicle.vehicle_id,
    };
    setSelectedVehicle(normalized);
    setQuickCustomerOverride(normalized);
    setPosMode('oil');
    fetchVehicleLastService(normalized.id);
    if (normalized.last_odometer) {
      setCurrentOdometer(String(normalized.last_odometer));
    } else {
      setCurrentOdometer('');
    }
    setKmInterval(3000);
    setManualNextOdometer('');
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
    const itemQty = Number(item.qty) || 1;
    // 1. Negative stock check if item is a product and setting is active
    if (item.inventory_id && item.item_type !== 'service' && shouldPreventNegativeStock()) {
      const invMatch = inventory.find((i) => i.id === item.inventory_id);
      if (invMatch) {
        const inCart = (cartItems.find((i) => i.inventory_id === item.inventory_id)?.qty || 0);
        const requestedTotal = inCart + itemQty;
        if (invMatch.stock_qty <= 0) {
          setCartNoticeMessage(`⚠️ نفدت الكمية من المخزن! الصنف "${invMatch.name}" رصيده (${invMatch.stock_qty}). تم منع البيع بالسالب.`);
          setTimeout(() => setCartNoticeMessage(''), 5000);
          return;
        }
        if (requestedTotal > invMatch.stock_qty) {
          setCartNoticeMessage(`⚠️ الكمية المطلوبة تتجاوز الرصيد المتاح بالمخزن (${invMatch.stock_qty} عبوة)!`);
          setTimeout(() => setCartNoticeMessage(''), 5000);
          return;
        }
      }
    }

    const isOilProduct = (item.category === 'oil' || (item.description || '').includes('زيت'));
    if (isOilProduct && posMode === 'quick') {
      setPosMode('oil');
      setCartNoticeMessage('تم تفعيل وضع غيار الزيت لإدخال قراءة العداد وتتبع السيارة في الحفرة 🛢️');
      setTimeout(() => setCartNoticeMessage(''), 4500);
    }

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.inventory_id && i.inventory_id === item.inventory_id
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.round((Number(updated[existingIdx].qty || 0) + itemQty) * 100) / 100;
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: newQty,
          subtotal: Math.round(newQty * Number(updated[existingIdx].unit_price || 0) * 100) / 100,
        };
        return updated;
      }
      return [...prev, {
        ...item,
        qty: itemQty,
        unit_price: Number(item.unit_price) || 0,
        labor_fee: 0,
        subtotal: Math.round(itemQty * Number(item.unit_price || 0) * 100) / 100,
      }];
    });
  };

  const handleAddMultipleToCart = (items) => {
    for (const item of items) {
      handleAddToCart(item);
    }
  };

  const handleSetItemQty = (index, rawValue) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const targetItem = updated[index];
      if (!targetItem) return prev;

      const parsed = parseFloat(rawValue);
      if (isNaN(parsed) || parsed <= 0) {
        updated[index] = {
          ...targetItem,
          qty: rawValue,
        };
        return updated;
      }

      if (targetItem.inventory_id && targetItem.item_type !== 'service' && shouldPreventNegativeStock()) {
        const invMatch = inventory.find((i) => i.id === targetItem.inventory_id);
        if (invMatch && parsed > invMatch.stock_qty) {
          setCartNoticeMessage(`⚠️ الرصيد المتاح من "${invMatch.name}" هو (${invMatch.stock_qty}) فقط! تم منع البيع بالسالب.`);
          setTimeout(() => setCartNoticeMessage(''), 4000);
          return prev;
        }
      }

      const cleanQty = Math.round(parsed * 100) / 100;
      updated[index] = {
        ...targetItem,
        qty: cleanQty,
        subtotal: Math.round(cleanQty * Number(targetItem.unit_price || 0) * 100) / 100,
      };
      return updated;
    });
  };

  const handleUpdateItemQty = (index, delta) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const targetItem = updated[index];
      if (!targetItem) return prev;
      const currentQty = Number(targetItem.qty) || 1;
      let step = delta;
      if (Math.abs(delta) === 1 && currentQty < 2 && currentQty > 0) {
        step = delta > 0 ? 0.5 : -0.5;
      }
      const newQty = Math.max(0.1, Math.round((currentQty + step) * 100) / 100);
      if (delta > 0 && targetItem.inventory_id && targetItem.item_type !== 'service' && shouldPreventNegativeStock()) {
        const invMatch = inventory.find((i) => i.id === targetItem.inventory_id);
        if (invMatch && newQty > invMatch.stock_qty) {
          setCartNoticeMessage(`⚠️ الرصيد المتاح من "${invMatch.name}" هو (${invMatch.stock_qty}) فقط! تم منع البيع بالسالب.`);
          setTimeout(() => setCartNoticeMessage(''), 4000);
          return prev;
        }
      }
      updated[index] = {
        ...targetItem,
        qty: newQty,
        subtotal: Math.round(newQty * Number(targetItem.unit_price || 0) * 100) / 100,
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
    const sum = cartItems
      .filter((item) => item.item_type !== 'service')
      .reduce((acc, item) => acc + ((Number(item.unit_price) || 0) * (Number(item.qty) || 0)), 0);
    return Math.round(sum * 100) / 100;
  }, [cartItems]);

  const servicesTotal = useMemo(() => {
    const sum = cartItems
      .filter((item) => item.item_type === 'service')
      .reduce((acc, item) => acc + ((Number(item.unit_price) || 0) * (Number(item.qty) || 0)), 0);
    return Math.round(sum * 100) / 100;
  }, [cartItems]);

  const grossTotal = Math.round((goodsTotal + servicesTotal) * 100) / 100;

  // Fleet discount auto-calculation
  useEffect(() => {
    if (activeCustomer && Number(activeCustomer.discount_percent) > 0 && grossTotal > 0) {
      const fleetDiscount = Math.round(grossTotal * (Number(activeCustomer.discount_percent) / 100));
      setSpecialDiscount(fleetDiscount);
      setDiscountType('fixed');
    }
  }, [activeCustomer, grossTotal]);

  const calculatedDiscount = useMemo(() => {
    const val = Number(specialDiscount) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percent') {
      return Math.round(grossTotal * (Math.min(100, val) / 100));
    }
    return Math.min(grossTotal, val);
  }, [grossTotal, specialDiscount, discountType]);

  const netTotal = useMemo(() => {
    return Math.max(0, grossTotal - calculatedDiscount);
  }, [grossTotal, calculatedDiscount]);

  const effectivePaidAmount = useMemo(() => {
    if (paymentMethod === 'credit') {
      const p = parseFloat(paidAmountInput);
      return isNaN(p) ? 0 : Math.min(netTotal, Math.max(0, p));
    }
    if (paymentMethod === 'split') {
      const cash = parseFloat(splitCashAmount) || 0;
      const elec = parseFloat(splitElectronicAmount) || 0;
      return Math.min(netTotal, Math.max(0, cash + elec));
    }
    return netTotal;
  }, [paymentMethod, paidAmountInput, splitCashAmount, splitElectronicAmount, netTotal]);

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

    // Split payment validation
    if (paymentMethod === 'split') {
      const cash = Number(splitCashAmount) || 0;
      const elec = Number(splitElectronicAmount) || 0;
      if (Math.round((cash + elec) * 100) !== Math.round(netTotal * 100)) {
        setTouchAlert({
          isOpen: true,
          title: '⚠️ مبالغ الدفع المجزأ غير متطابقة',
          message: `إجمالي المبلغ المقسم (${(cash + elec).toLocaleString()} ر.ي) لا يساوي الصافي المطلوب (${netTotal.toLocaleString()} ر.ي)!\n\nيرجى تعديل المبالغ لتتطابق تماماً مع إجمالي الفاتورة.`,
          type: 'warning',
          cancelBtnText: 'تصحيح المبالغ',
        });
        return;
      }
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
      let vehicleIdToSubmit = activeCustomer?.id || activeCustomer?.vehicle_id;
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

      // Auto-detect oil service that belongs in the pit bay
      const hasOilOrLube = cartItems.some((item) => {
        const desc = (item.description || '').toLowerCase();
        const cat = (item.category || item.product_category || '').toLowerCase();
        return desc.includes('زيت') || desc.includes('oil') || desc.includes('سيفون') || cat.includes('oil');
      });
      const effectiveVehicleId = selectedVehicle?.id || selectedVehicle?.vehicle_id;
      const hasVehicleAttached = selectedVehicle && effectiveVehicleId && effectiveVehicleId !== 'quick';
      const hasOdo = Number(currentOdometer) > 0;

      const isOilService = posMode === 'oil' || (hasVehicleAttached && (hasOilOrLube || hasOdo)) || hasOilOrLube;
      const statusToSave = isOilService ? 'pending_service' : 'completed';

      const payload = {
        vehicle_id: vehicleIdToSubmit,
        worker_id: null, // إلغاء إرفاق الفني نهائياً بناءً على طلب المالك
        service_status: statusToSave,
        current_odometer: isOilService ? (Number(currentOdometer) || 0) : 0,
        next_odometer: isOilService ? (Number(nextOdometer) || 0) : 0,
        next_service_date: isOilService ? (serviceDateInput || nextServiceDate) : nextServiceDate,
        items_total: goodsTotal,
        labor_total: servicesTotal,
        scrap_battery_deduction: 0,
        discount: calculatedDiscount,
        payment_method: paymentMethod,
        wallet_ref_number: walletRefNumber || null,
        paid_amount: effectivePaidAmount,
        split_payments: paymentMethod === 'split' ? {
          cash: Number(splitCashAmount) || 0,
          [splitElectronicMethod]: Number(splitElectronicAmount) || 0,
        } : null,
        prevent_negative_stock: shouldPreventNegativeStock(),
        notes: noteToSave,
        items: cartItems.map((item) => ({
          inventory_id: item.inventory_id || null,
          item_type: item.item_type || 'product',
          description: item.description,
          qty: Number(item.qty) || 1,
          unit_price: Number(item.unit_price) || 0,
          labor_fee: 0,
          warranty_serial: item.warranty_serial || null,
          subtotal: Math.round((Number(item.qty) || 1) * (Number(item.unit_price) || 0) * 100) / 100,
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

      fetchPendingServicesCount();

      const completedData = {
        ...data.data,
        safetyPoints: isOilService ? safetyPoints : null,
      };

      setLastSubmittedInvoice(completedData);

      if (statusToSave === 'pending_service') {
        const plateStr = selectedVehicle?.plate_number && !selectedVehicle?.plate_number.startsWith('بدون')
          ? selectedVehicle.plate_number
          : (selectedVehicle?.customer_name || 'سيارة العميل');
        setPendingBayDialog({
          isOpen: true,
          invoice: completedData,
          plateNumber: plateStr,
          carModel: selectedVehicle?.car_make_model || '',
        });
      } else {
        setCompletedInvoice(completedData);
      }

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
    setSpecialDiscount('');
    setDiscountType('fixed');
    setInvoiceNotes('');
    setPaymentMethod('cash');
    setPaidAmountInput('');
    setWalletRefNumber('');
    setSplitCashAmount('');
    setSplitElectronicAmount('');
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
              className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 active:scale-95 ${
                posMode === 'quick'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>⚡ فاتورة سريعة</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/20 font-bold hidden sm:inline">
                رقع ومبيعات مباشرة
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPosMode('oil')}
              className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 active:scale-95 ${
                posMode === 'oil'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 shadow-md shadow-teal-500/25 ring-1 ring-teal-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Droplets className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>🛢️ فاتورة غيار زيت</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/20 font-bold hidden sm:inline">
                العداد والخدمة
              </span>
            </button>

            {/* 3. ACTIVE SERVICES IN BAY (سيارات قيد الخدمة حالياً) */}
            <button
              type="button"
              onClick={() => setShowPendingServicesModal(true)}
              className={`min-h-[42px] px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 active:scale-95 border ${
                pendingServicesCount > 0
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/60 shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/50'
                  : 'text-slate-300 border-white/5 hover:text-white hover:bg-white/5'
              }`}
              title="متابعة وإتمام فحص السيارات التي لا تزال تحت الخدمة في الحفرة وإرسال الواتساب"
            >
              <div className="relative">
                <Car className="w-3.5 h-3.5 stroke-[2.2]" />
                {pendingServicesCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </div>
              <span>🚗 سيارات قيد الخدمة حالياً</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold ${
                  pendingServicesCount > 0
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {pendingServicesCount}
              </span>
            </button>
          </div>

          {/* 2. DYNAMIC LIVE PLATE PILL (بحث برقم اللوحة - F2) */}
          <button
            type="button"
            onClick={() => setShowPlateSearchFlyout(true)}
            className={`min-h-[42px] px-3.5 sm:px-4 rounded-2xl border transition flex items-center gap-2 active:scale-95 flex-shrink-0 select-none shadow-md ${
              selectedVehicle && selectedVehicle.plate_number && !selectedVehicle.plate_number.startsWith('بدون')
                ? 'bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-sky-500/20 border-sky-400/60 text-white ring-2 ring-sky-400/30'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-white/15 hover:border-amber-400/60'
            }`}
            title="فتح لوحة البحث برقم اللوحة المباشر (F2)"
          >
            {selectedVehicle && selectedVehicle.plate_number && !selectedVehicle.plate_number.startsWith('بدون') ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[11px] font-black text-sky-300">لوحة السيارة:</span>
                <span className="font-mono font-black text-xs sm:text-sm text-white px-2 py-0.5 rounded-lg bg-black/50 border border-white/10">
                  {selectedVehicle.plate_number}
                </span>
                <span className="text-[10px] text-amber-300 font-mono hidden sm:inline">(F2)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-500/20 text-[11px] text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                  🚗
                </div>
                <span className="font-extrabold text-xs sm:text-sm">بحث برقم اللوحة</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/40 text-amber-300 font-mono font-bold border border-white/10">
                  F2
                </span>
              </div>
            )}
          </button>

          {/* 3. CUSTOMER NAME & PHONE SEARCH INPUT (سحب للشمال ومقصر هندسياً) */}
          <div className="relative flex-1 max-w-xs sm:max-w-sm lg:max-w-md" ref={searchContainerRef}>
            <div className="relative">
              <input
                type="text"
                ref={customerSearchInputRef}
                placeholder="ابحث بالاسم أو رقم الهاتف... (F3)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[42px] pr-10 pl-9 rounded-2xl bg-slate-900 border border-white/15 text-white placeholder-slate-400 font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400 shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-4 pointer-events-none" />

              {/* Instant Clear Button ✕ */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    customerSearchInputRef.current?.focus();
                  }}
                  className="absolute left-3 top-3.5 w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown (100% Solid & Opaque — No Background Clashing) */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl z-[999] max-h-80 overflow-y-auto custom-scrollbar">
                {searchResults.map((v) => {
                  const isNoPlate = !v.plate_number || v.plate_number.startsWith('بدون');
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVehicle(v)}
                      className="w-full p-3 text-right hover:bg-slate-800/80 border-b border-white/5 flex items-center justify-between transition group"
                    >
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold group-hover:text-amber-300 transition">
                            {v.customer_name}
                          </span>
                          <span className="font-mono text-xs text-slate-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                            {v.phone}
                          </span>
                          {/* Multi-vehicle badge */}
                          {v.customer_vehicles_count > 1 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                              🚗 لديه {v.customer_vehicles_count} سيارات
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                          <span className="text-amber-400 font-mono font-bold">
                            {isNoPlate ? '🚗 (بدون لوحة)' : v.plate_number}
                          </span>
                          {!isNoPlate && (
                            <span className="text-[11px] text-slate-400">({v.plate_type})</span>
                          )}
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-slate-300 text-xs">{v.car_make_model}</span>
                        </div>
                      </div>
                      <div className="text-left font-mono text-xs shrink-0 mr-2">
                        {v.balance_due > 0 ? (
                          <span className="text-rose-400 font-bold bg-rose-500/15 px-2.5 py-1 rounded-full border border-rose-500/30 block">
                            دين: {Number(v.balance_due).toLocaleString()} ر.ي
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            خالي من الديون
                          </span>
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
            className="min-h-[42px] px-3.5 sm:px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 flex-shrink-0"
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
            <div className="p-3.5 rounded-2xl bg-slate-900/95 border-2 border-teal-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-mono font-extrabold shadow-sm shrink-0">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  {/* Top Row: Customer Name FIRST in top right, then phone, then plate & model */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Customer Name placed FIRST at the top right */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/25 border border-teal-400/50 text-teal-200 font-black text-lg shadow-sm">
                      <span className="text-xs text-teal-400 font-bold">العميل:</span>
                      <span>{selectedVehicle.customer_name}</span>
                    </span>
                    <span className="font-mono text-xs font-black text-white bg-slate-800 px-2 py-1 rounded-lg border border-white/10">
                      {selectedVehicle.phone}
                    </span>

                    {/* Plate & Car Model */}
                    <span className="font-black text-xl text-amber-300 font-mono tracking-wider bg-slate-950 px-3 py-0.5 rounded-xl border border-amber-400/40 shadow-inner">
                      {selectedVehicle.plate_number && !selectedVehicle.plate_number.startsWith('بدون')
                        ? selectedVehicle.plate_number
                        : '🚗 بدون لوحة'}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-800 text-white border border-white/15 font-black">
                      {selectedVehicle.car_make_model}
                    </span>
                  </div>

                  {/* Bottom Row: Oil & Odometer */}
                  <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5">
                      <span>🛢️ الزيت:</span>
                      <strong className="text-white font-black text-sm">
                        {selectedVehicle.preferred_oil_brand || 'تويوتا'} ({selectedVehicle.preferred_viscosity || '20W-50'})
                      </strong>
                    </span>

                    <span className="px-3 py-1 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono font-black text-xs flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-teal-400" />
                      <span>
                        العداد السابق:{' '}
                        {lastServiceInfo?.current_odometer
                          ? `${Number(lastServiceInfo.current_odometer).toLocaleString()} كم`
                          : selectedVehicle.last_odometer
                          ? `${Number(selectedVehicle.last_odometer).toLocaleString()} كم`
                          : 'لا يوجد قراءة'}
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
                  className="min-h-[42px] px-3.5 rounded-xl bg-teal-500/25 hover:bg-teal-500/35 text-teal-200 border border-teal-400/50 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  title="تكرار بنود آخر خدمة غيار زيت للسلة لتعديلها"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>🔄 تكرار آخر غيار</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-white/20 font-black text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <History className="w-4 h-4 text-amber-400" />
                  <span>السجل</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicle(selectedVehicle);
                    setShowNewVehicleModal(true);
                  }}
                  className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-white/20 font-black text-xs flex items-center gap-1 transition active:scale-95"
                  title="تعديل بيانات العميل أو إضافة اللوحة"
                >
                  <Edit className="w-4 h-4 text-slate-300" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicle(null);
                    setLastServiceInfo(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-rose-500/25 hover:text-rose-300 text-slate-300 flex items-center justify-center transition font-black text-lg border border-white/10"
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
              <div className="apple-glass rounded-2xl px-3.5 py-2 border border-white/10 flex items-center justify-between text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-amber-400/40 text-amber-400" />
                  <span className="font-bold text-amber-300">الخدمات والأصناف السريعة الأكثر طلباً:</span>
                  <span className="text-[11px] text-slate-400 font-mono">({pinnedItems.length} صنف مثبت)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickGridConfigModal(true)}
                  className="text-[11px] text-slate-400 hover:text-amber-300 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 transition active:scale-95"
                  title="تخصيص الخدمات والأصناف السريعة وتثبيتها من المخزون"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>⚙️ تخصيص</span>
                </button>
              </div>

              {/* Instant 1-Touch Pinned Grid */}
              {pinnedItems.length > 0 && (
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
                      className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-white/15 hover:border-amber-400 text-right transition active:scale-95 shadow-sm flex flex-col justify-between min-h-[72px] group"
                    >
                      <div className="font-black text-xs text-white group-hover:text-amber-300 transition truncate">{item.name}</div>
                      <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                        <span className="text-amber-400 font-bold">{Number(item.sell_price).toLocaleString()} ر.ي</span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {item.item_type === 'service' ? 'خدمة' : `متاح: ${item.stock_qty}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Categorical Drilldown Tiles (رقع، زيوت، سوائل، بطاريات) */}
              <div className="apple-glass rounded-3xl p-3.5 border border-white/10 space-y-3">
                <div className="text-[15px] font-black text-amber-300 flex items-center justify-between">
                  <span>🏷️ أقسام المنتجات والخدمات الرئيسية:</span>
                  <span className="text-xs font-mono text-slate-400 font-normal">اختر القسم للتصفح الفوري</span>
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
                        className={`min-h-[66px] p-3 rounded-2xl border-2 text-right transition flex flex-col justify-between active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black shadow-lg shadow-amber-500/20'
                            : 'bg-slate-900/90 border-white/10 text-white hover:border-amber-400/50'
                        }`}
                      >
                        <div className="text-[15px] font-black truncate">{cat.label}</div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-400/15 text-amber-300 text-xs font-black font-mono">
                            {cat.count} أصناف
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {isSelected ? '▲ إخفاء' : '▼ تصفح'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded Category Products Grid */}
                {quickActiveCategory !== 'all' && (
                  <div className="pt-2.5 border-t border-white/10 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-black text-amber-300">
                        قائمة أصناف القسم ({quickCategoryProducts.length} صنف):
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickActiveCategory('all')}
                        className="text-xs font-bold text-slate-300 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800"
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
                          className={`p-3 rounded-2xl text-right transition active:scale-[0.98] flex items-center justify-between gap-2 border-2 ${
                            prod.item_type !== 'service' && prod.stock_qty <= 0
                              ? 'bg-rose-950/20 border-rose-500/30 opacity-80 hover:border-rose-400'
                              : 'bg-slate-900/90 hover:bg-amber-500/15 border-white/10 hover:border-amber-400/60'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-[15px] text-white truncate flex items-center gap-1.5">
                              <span>{prod.name}</span>
                              {prod.viscosity && (
                                <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black">
                                  {prod.viscosity}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 font-mono flex items-center gap-2 mt-1">
                              <span className="text-amber-400 font-black text-sm">{Number(prod.sell_price).toLocaleString()} ر.ي</span>
                              <span>&bull;</span>
                              <span className={`font-bold ${prod.item_type !== 'service' && prod.stock_qty <= 0 ? 'text-rose-400' : ''}`}>
                                {prod.item_type === 'service' ? 'خدمة ورشة' : `متبقي: ${prod.stock_qty}`}
                              </span>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex-shrink-0 ${
                            prod.item_type !== 'service' && prod.stock_qty <= 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-400 text-slate-950'
                          }`}>
                            {prod.item_type !== 'service' && prod.stock_qty <= 0 ? 'نفد المخزون' : '+ إضافة'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

                  {/* Single Default Interval Badge - Editable on click (Keyboard only, no arrows) */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-teal-500/40 px-3 py-1.5 rounded-xl">
                    <span className="text-[13px] text-teal-200 font-black">مسافة الغيار:</span>
                    <div className="flex items-center bg-slate-950 border border-teal-500/50 rounded-lg px-2 py-0.5">
                      <span className="text-teal-400 font-bold text-xs ml-1">+</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={kmInterval}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setKmInterval(val ? Number(val) : '');
                          setManualNextOdometer('');
                        }}
                        className="w-14 text-amber-300 font-mono font-black text-center text-sm bg-transparent focus:outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono">كم</span>
                    </div>
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

                {/* Inputs for Laptop Keyboard (Arrow-free / Keyboard Only) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-bold mb-1">
                      العداد الحالي للسيارة (كم):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="مثال: 125000"
                      value={currentOdometer}
                      onChange={(e) => setCurrentOdometer(e.target.value.replace(/\D/g, ''))}
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
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={nextOdometer ? String(nextOdometer) : 'يُحسب بعد إدخال الحالي'}
                      value={manualNextOdometer || nextOdometer || ''}
                      onChange={(e) => setManualNextOdometer(e.target.value.replace(/\D/g, ''))}
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

              {/* General Oil Volume Presets Bar */}
              <div className="apple-glass rounded-3xl p-3.5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-black text-amber-300">
                    <Droplets className="w-4 h-4 text-amber-400" />
                    <span>اختصارات كميات الزيوت العامة (نقرة واحدة):</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">تطبق الكمية مباشرة على الزيت المختار</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {oilVolumePresets.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => {
                        setSelectedOilPresetQty(qty);
                        setShowOilModal(true);
                      }}
                      className="h-10 min-w-[54px] px-3.5 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20 text-white font-mono font-black text-xs flex items-center justify-center gap-1 transition active:scale-95 shadow-sm"
                      title={`فتح محدد الزيت بـ ${qty} لتر`}
                    >
                      <span className="text-amber-300 text-sm">{qty}</span>
                      <span className="text-[10px] text-slate-300 font-sans">لتر</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOilPresetQty(null);
                      setShowOilModal(true);
                    }}
                    className="h-10 px-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 font-bold text-xs flex items-center gap-1 transition active:scale-95"
                  >
                    <span>🛢️ تخصيص كامل</span>
                  </button>
                </div>
              </div>

              {/* Oil Change Action Cards: Oil Selector + 1-INVOICE ADD EXTRA ITEM BUTTON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Main Oil Selector */}
                <button
                  type="button"
                  onClick={() => setShowOilModal(true)}
                  className="min-h-[110px] p-4 rounded-3xl apple-glass-interactive border border-amber-500/35 hover:border-amber-400 bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-amber-950/20 flex flex-col justify-between group shadow-xl hover:shadow-amber-500/15 active:scale-[0.98] text-right transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 border border-amber-300/40 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                      <Droplets className="w-6 h-6 stroke-[2.4]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>عبوات 1L وجالونات</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-black text-white group-hover:text-amber-300 transition flex items-center gap-2">
                      <span>🛢️ محدد غيار الزيت الذكي</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                      {selectedVehicle && (selectedVehicle.preferred_oil_brand || selectedVehicle.preferred_viscosity) ? (
                        <span className="text-amber-300 font-bold">
                          الموصى للسيارة: {selectedVehicle.preferred_oil_brand || 'تويوتا'} ({selectedVehicle.preferred_viscosity || '20W-50'})
                        </span>
                      ) : (
                        <span>الأكثر مبيعاً: عبوات 1 لتر بنقرة واحدة + الفلاتر</span>
                      )}
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

                    {/* Quantity Stepper (Supports typing decimals like 0.5, 3.5 & steps) */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-xs border border-white/10 active:scale-90 transition"
                        title="إنقاص الكمية"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0.1"
                        value={item.qty}
                        onChange={(e) => handleSetItemQty(idx, e.target.value)}
                        onBlur={() => {
                          const num = parseFloat(item.qty);
                          if (isNaN(num) || num <= 0) {
                            handleSetItemQty(idx, 1);
                          }
                        }}
                        className="w-12 h-7 text-center font-mono font-extrabold text-xs text-white bg-slate-950 border border-white/20 rounded-md focus:border-amber-400 focus:outline-none"
                        title="انقر لتعديل الكمية مباشرة (يقبل الكسور مثل 0.5 أو 3.5)"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30 active:scale-90 transition"
                        title="زيادة الكمية"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(idx)}
                        className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center mr-1 border border-rose-500/20 active:scale-90 transition"
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

              {/* Extra Discount Input (Fixed amount or Percentage) */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-bold">الخصم:</span>
                  <div className="flex items-center rounded-lg bg-slate-950 border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition ${
                        discountType === 'fixed' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ر.ي
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition ${
                        discountType === 'percent' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-rose-400">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={specialDiscount}
                    onChange={(e) => setSpecialDiscount(e.target.value)}
                    className="w-16 px-1.5 py-0.5 rounded-lg bg-slate-900 border border-rose-500/30 font-mono text-xs font-bold text-center text-rose-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {discountType === 'percent' ? `% (${calculatedDiscount.toLocaleString()} ر.ي)` : 'ر.ي'}
                  </span>
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
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {[
                  { id: 'cash', label: '💵 كاش' },
                  { id: 'jeeb', label: '📱 جيب' },
                  { id: 'jawali', label: '📱 جوالي' },
                  { id: 'kuraimi', label: '🏦 كريمي' },
                  { id: 'split', label: '🔀 مجزأ' },
                  { id: 'credit', label: '📝 آجل' },
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
                      onClick={() => {
                        setPaymentMethod(m.id);
                        if (m.id === 'split' && !splitCashAmount && !splitElectronicAmount) {
                          const half = Math.round(netTotal / 2);
                          setSplitCashAmount(String(half));
                          setSplitElectronicAmount(String(netTotal - half));
                        }
                      }}
                      className={`min-h-[40px] py-1 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center border active:scale-95 ${
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

              {/* Split Payment Breakdown */}
              {paymentMethod === 'split' && (
                <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2 animate-in fade-in text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-300 text-[11px]">
                    <span>سداد مجزأ:</span>
                    <span className="font-mono text-white">الصافي: {netTotal.toLocaleString()} ر.ي</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-300 font-bold mb-1">💵 نقد كاش (الدرج):</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={splitCashAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSplitCashAmount(val);
                          if (val && Number(val) <= netTotal) {
                            setSplitElectronicAmount(String(Math.max(0, netTotal - Number(val))));
                          }
                        }}
                        className="w-full min-h-[34px] px-2.5 rounded-xl bg-slate-950 border border-white/15 font-mono text-xs font-bold text-white text-center focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-300 font-bold">💳 إلكتروني:</label>
                        <select
                          value={splitElectronicMethod}
                          onChange={(e) => setSplitElectronicMethod(e.target.value)}
                          className="bg-slate-950 border border-white/15 text-[10px] text-teal-300 rounded px-1 py-0.5 focus:outline-none"
                        >
                          <option value="kuraimi">الكريمي</option>
                          <option value="jeeb">جيب</option>
                          <option value="jawali">جوالي</option>
                        </select>
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={splitElectronicAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setSplitElectronicAmount(val);
                          if (val && Number(val) <= netTotal) {
                            setSplitCashAmount(String(Math.max(0, netTotal - Number(val))));
                          }
                        }}
                        className="w-full min-h-[34px] px-2.5 rounded-xl bg-slate-950 border border-teal-500/30 font-mono text-xs font-bold text-teal-300 text-center focus:border-teal-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="رقم مرجع/إشعار الحوالة الإلكترونية..."
                      value={walletRefNumber}
                      onChange={(e) => setWalletRefNumber(e.target.value)}
                      className="w-full min-h-[32px] px-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-[11px] focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Partial / Credit Payment breakdown */}
              {paymentMethod === 'credit' && (
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5 animate-in fade-in text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold">المبلغ المدفوع كاش/محفظة:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value.replace(/\D/g, ''))}
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
        onClose={() => {
          setShowOilModal(false);
          setSelectedOilPresetQty(null);
        }}
        inventory={inventory}
        selectedVehicle={selectedVehicle}
        initialQty1L={selectedOilPresetQty}
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

      <PendingServicesModal
        isOpen={showPendingServicesModal}
        onClose={() => {
          setShowPendingServicesModal(false);
          setFocusPendingInvoiceId(null);
        }}
        initialInvoiceId={focusPendingInvoiceId}
        workers={workers}
        onServiceCompleted={() => {
          fetchPendingServicesCount();
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Pit Bay Transition Confirmation Dialog */}
      {pendingBayDialog?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-950 border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 animate-pulse">
              <Car className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white">السيارة دخلت الحفرة بنجاح 🚗</h3>
              <p className="text-xs text-blue-300 font-bold">
                تم نقل ({pendingBayDialog.plateNumber} {pendingBayDialog.carModel}) إلى قسم [سيارات قيد الخدمة حالياً]
              </p>
              <p className="text-[11px] text-slate-400">
                الفاتورة رقم: <span className="font-mono text-amber-400 font-bold">{pendingBayDialog.invoice?.invoice_number}</span> &bull; الحفرة جاهزة للفحص والخدمة
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const invId = pendingBayDialog.invoice?.id;
                  setPendingBayDialog(null);
                  setFocusPendingInvoiceId(invId);
                  setShowPendingServicesModal(true);
                }}
                className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Wrench className="w-4 h-4" />
                <span>متابعة فحص الحفرة والـ 8 نقاط فوراً 🛠️</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const inv = pendingBayDialog.invoice;
                    setPendingBayDialog(null);
                    setCompletedInvoice(inv);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>إيصال استلام</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingBayDialog(null)}
                  className="flex-1 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>فاتورة جديدة ⚡</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* 8. ADAPTIVE YEMENI PLATE SEARCH FLYOUT */}
      <PlateSearchFlyout
        isOpen={showPlateSearchFlyout}
        onClose={() => setShowPlateSearchFlyout(false)}
        onSelectVehicle={(vehicle) => {
          handleSelectVehicle(vehicle);
        }}
        onOpenNewVehicleModal={(prefilledPlate) => {
          setEditingVehicle({
            plate_number: prefilledPlate.plate_number,
            plate_divider: prefilledPlate.plate_divider,
            plate_type: prefilledPlate.plate_type,
          });
          setShowNewVehicleModal(true);
        }}
      />

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
