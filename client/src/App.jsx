import React, { useState, useEffect, useCallback } from 'react';
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
        setActiveTab={setActiveTab}
        radarCount={radarCount}
        lowStockCount={lowStockCount}
        onOpenSettings={() => setShowSettingsModal(false) || setShowSettingsModal(true)}
        onOpenUserGuide={() => setShowUserGuideModal(true)}
      />

      {/* Main App Workspace with Global Smooth Scrollability */}
      <main className="flex-1 flex flex-col p-3 lg:p-5 overflow-y-auto overflow-x-hidden min-w-0 min-h-0 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950">
        {/* Real-time Financial Pulse Bar (Upgrade 2 & Action Center) */}
        <FinancialPulseBar
          onOpenStatement={() => handleOpenStatement('customer', null)}
          onOpenBayProfitability={() => setShowBayModal(true)}
          refreshTrigger={pulseRefreshTrigger}
        />

        {activeTab === 'pos' && (
          <PosScreen
            inventory={inventory}
            workers={workers}
            onRefreshData={handleDataRefreshed}
            initialVehicle={posPreselectedVehicle}
            onOpenStatement={(vehId) => handleOpenStatement('customer', vehId)}
          />
        )}

        {activeTab === 'radar' && (
          <RetentionRadar onSelectVehicleForPos={handleSelectVehicleForPos} />
        )}

        {activeTab === 'inventory' && (
          <InventoryView inventory={inventory} onRefreshData={handleDataRefreshed} />
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
    </div>
  );
}