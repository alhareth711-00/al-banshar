import React, { useState, useEffect, useCallback } from 'react';
import { Lock } from 'lucide-react';
import Sidebar from './components/Sidebar';
import PosScreen from './components/PosScreen';
import RetentionRadar from './components/RetentionRadar';
import InventoryView from './components/InventoryView';
import PurchasesView from './components/PurchasesView';
import WorkersView from './components/WorkersView';
import ClosingReport from './components/ClosingReport';
import SettingsModal from './components/SettingsModal';
import FinancialPulseBar from './components/FinancialPulseBar';
import StatementOfAccountModal from './components/StatementOfAccountModal';
import BayProfitabilityModal from './components/BayProfitabilityModal';
import FinancialVaultHub from './components/FinancialVaultHub';
import UserGuideModal from './components/UserGuideModal';
import OwnerPinModal from './components/OwnerPinModal';
import { getAutoLockMinutes } from './utils/settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [inventory, setInventory] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [radarCount, setRadarCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [posPreselectedVehicle, setPosPreselectedVehicle] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementInitialParty, setStatementInitialParty] = useState({ type: 'customer', id: null });
  const [showBayModal, setShowBayModal] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [pulseRefreshTrigger, setPulseRefreshTrigger] = useState(0);

  // Smart Authority State (الجزء الأول: وضع الكاشير الآمن افتراضياً)
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [autoLockNotice, setAutoLockNotice] = useState('');
  const [ownerPinModal, setOwnerPinModal] = useState({
    isOpen: false,
    title: 'رمز المالك السري',
    subtitle: 'يرجى إدخال رمز PIN المكون من 4 أرقام للمتابعة',
    onSuccess: null,
  });

  // Smart Inactivity Auto-Lock (المقترح 1: حماية بيانات المالك عند عدم النشاط)
  useEffect(() => {
    if (!isOwnerMode) return;

    const timeoutMinutes = getAutoLockMinutes();
    if (!timeoutMinutes || timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer = null;

    const handleInactivity = () => {
      setIsOwnerMode(false);
      setAutoLockNotice('تم قفل وضع المدير تلقائياً لعدم النشاط لحماية بيانات وأرباح المركز 🔒');
      setTimeout(() => setAutoLockNotice(''), 6000);
      setActiveTab((currentTab) => (currentTab === 'vault' ? 'pos' : currentTab));
    };

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(handleInactivity, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isOwnerMode]);

  // Guard action requiring Owner PIN
  const requireOwnerAuth = (
    actionCallback,
    title = 'رمز المالك السري (محمي)',
    subtitle = 'يرجى إدخال رمز PIN المكون من 4 أرقام لفتح الصلاحية'
  ) => {
    if (isOwnerMode) {
      if (actionCallback) actionCallback();
    } else {
      setOwnerPinModal({
        isOpen: true,
        title,
        subtitle,
        onSuccess: () => {
          setIsOwnerMode(true);
          if (actionCallback) actionCallback();
        },
      });
    }
  };

  const handleToggleOwnerMode = () => {
    if (isOwnerMode) {
      setIsOwnerMode(false);
    } else {
      requireOwnerAuth(null, 'التبديل إلى وضع المدير المالي', 'أدخل رمز PIN للمالك لعرض الأرباح والتقارير الحساسة');
    }
  };

  const handleTabSelect = (tabId) => {
    if (tabId === 'vault' && !isOwnerMode) {
      requireOwnerAuth(
        () => setActiveTab('vault'),
        'شاشة الخزينة والمحاسبة (محمية)',
        'تتضمن هذه الشاشة حركة النقدية وسندات الصرف والقيود المحاسبية'
      );
    } else {
      setActiveTab(tabId);
    }
  };

  const handleOpenSettingsGuarded = () => {
    if (!isOwnerMode) {
      requireOwnerAuth(
        () => setShowSettingsModal(true),
        'إعدادات وهوية المركز (محمية)',
        'تعديل أسماء وهوية المركز والرمز السري للوردية'
      );
    } else {
      setShowSettingsModal(true);
    }
  };

  const handleOpenStatementGuarded = (type = 'customer', id = null) => {
    if (!isOwnerMode) {
      requireOwnerAuth(
        () => {
          setStatementInitialParty({ type, id });
          setShowStatementModal(true);
        },
        'كشف الحساب والديون (محمي)',
        'استعراض تفاصيل الديون والمسحوبات وسندات الحسابات'
      );
    } else {
      setStatementInitialParty({ type, id });
      setShowStatementModal(true);
    }
  };

  const handleOpenBayProfitabilityGuarded = () => {
    if (!isOwnerMode) {
      requireOwnerAuth(
        () => setShowBayModal(true),
        'ربحية الحفر والخدمات (محمية)',
        'تحليل هوامش أرباح أجور اليد وتغطية تكاليف التشغيل'
      );
    } else {
      setShowBayModal(true);
    }
  };

  // Fetch initial master data
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Inventory
      const invRes = await fetch('/api/inventory');
      const invData = await invRes.json();
      if (invData.success) {
        setInventory(invData.data || []);
        const low = (invData.data || []).filter((i) => i.stock_qty <= i.min_stock_alert).length;
        setLowStockCount(low);
      }

      // 2. Fetch Workers
      const workRes = await fetch('/api/workers');
      const workData = await workRes.json();
      if (workData.success) {
        setWorkers(workData.data || []);
      }

      // 3. Fetch Radar Count
      const radRes = await fetch('/api/retention-radar');
      const radData = await radRes.json();
      if (radData.success) {
        setRadarCount((radData.data || []).length);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Press F1 anywhere to toggle User Guide
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowUserGuideModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle vehicle hand-off from Retention Radar to POS
  const handleSelectVehicleForPos = (vehicle) => {
    setPosPreselectedVehicle(vehicle);
    setActiveTab('pos');
  };

  const handleOpenStatement = (type = 'customer', id = null) => {
    setStatementInitialParty({ type, id });
    setShowStatementModal(true);
  };

  const handleDataRefreshed = () => {
    fetchData();
    setPulseRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* Apple-style Dock / Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        radarCount={radarCount}
        lowStockCount={lowStockCount}
        onOpenSettings={handleOpenSettingsGuarded}
        onOpenUserGuide={() => setShowUserGuideModal(true)}
        isOwnerMode={isOwnerMode}
      />

      {/* Main App Workspace with Global Smooth Scrollability */}
      <main className="flex-1 flex flex-col p-3 lg:px-6 lg:py-4 overflow-y-auto overflow-x-hidden min-w-0 min-h-0 bg-[#070b14] space-y-3">
        {/* Real-time Financial Pulse Bar (Upgrade 2 & Action Center) */}
        <FinancialPulseBar
          onOpenStatement={() => handleOpenStatementGuarded('customer', null)}
          onOpenBayProfitability={handleOpenBayProfitabilityGuarded}
          refreshTrigger={pulseRefreshTrigger}
          isOwnerMode={isOwnerMode}
          onToggleOwnerMode={handleToggleOwnerMode}
        />

        {activeTab === 'pos' && (
          <PosScreen
            inventory={inventory}
            workers={workers}
            onRefreshData={handleDataRefreshed}
            initialVehicle={posPreselectedVehicle}
            onOpenStatement={(vehId) => handleOpenStatementGuarded('customer', vehId)}
            isOwnerMode={isOwnerMode}
            onRequireOwnerAuth={requireOwnerAuth}
          />
        )}

        {activeTab === 'radar' && (
          <RetentionRadar onSelectVehicleForPos={handleSelectVehicleForPos} />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            inventory={inventory}
            onRefreshData={handleDataRefreshed}
            isOwnerMode={isOwnerMode}
            onRequireOwnerAuth={requireOwnerAuth}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesView
            inventory={inventory}
            onRefreshData={handleDataRefreshed}
            onOpenSupplierStatement={(suppId) => handleOpenStatement('supplier', suppId)}
          />
        )}

        {activeTab === 'vault' && (
          <FinancialVaultHub
            onRefreshData={handleDataRefreshed}
            onOpenStatement={handleOpenStatement}
          />
        )}

        {activeTab === 'workers' && (
          <WorkersView
            workers={workers}
            onRefreshData={handleDataRefreshed}
            onOpenCustomerStatement={(vehId) => handleOpenStatement('customer', vehId)}
            onOpenWorkerStatement={(wId) => handleOpenStatement('worker', wId)}
          />
        )}

        {activeTab === 'report' && (
          <ClosingReport
            onOpenBayProfitability={() => setShowBayModal(true)}
          />
        )}
      </main>

      {/* Shop Identity & WhatsApp Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSettingsUpdated={handleDataRefreshed}
      />

      {/* Statement of Account Modal (Upgrade 3) */}
      <StatementOfAccountModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        initialPartyType={statementInitialParty.type}
        initialPartyId={statementInitialParty.id}
      />

      {/* Bay Profitability & Labor Margin Modal (Upgrade 5) */}
      <BayProfitabilityModal
        isOpen={showBayModal}
        onClose={() => setShowBayModal(false)}
      />

      {/* Interactive In-App User & Manager Guide (Delivery Pro) */}
      <UserGuideModal
        isOpen={showUserGuideModal}
        onClose={() => setShowUserGuideModal(false)}
      />

      {/* Owner PIN Verification Modal (حماية صلاحيات المالك) */}
      <OwnerPinModal
        isOpen={ownerPinModal.isOpen}
        onClose={() => setOwnerPinModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          if (ownerPinModal.onSuccess) ownerPinModal.onSuccess();
        }}
        title={ownerPinModal.title}
        subtitle={ownerPinModal.subtitle}
      />

      {/* Auto-Lock Inactivity Toast Notice */}
      {autoLockNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/95 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom duration-300">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{autoLockNotice}</span>
        </div>
      )}
    </div>
  );
}