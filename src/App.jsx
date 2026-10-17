import React, { useState, useEffect } from 'react';
import TopNavigationMenu from './components/TopNavigationMenu';
import FastBillingTerminal from './components/FastBillingTerminal';
import ProductCatalogPage from './components/ProductCatalogPage';
import SupplierMasterPage from './components/SupplierMasterPage';
import PurchaseEntryPage from './components/PurchaseEntryPage';
import ExpiryReportPage from './components/ExpiryReportPage';
import ShortagesPage from './components/ShortagesPage';
import MultiStoreRadarPage from './components/MultiStoreRadarPage';
import DailySalesRegisterPage from './components/DailySalesRegisterPage';
import CustomerCreditLedgerPage from './components/CustomerCreditLedgerPage';
import DistributorPaymentsPage from './components/DistributorPaymentsPage';
import DotMatrixReceiptModal from './components/DotMatrixReceiptModal';
import NewMedicineModal from './components/NewMedicineModal';
import PasswordAuthModal from './components/PasswordAuthModal';
import AdminDashboardApp from './components/AdminDashboardApp';
import BatchEnquiryPage from './components/BatchEnquiryPage';
import TaxMasterPage from './components/TaxMasterPage';
import CompanyMasterPage from './components/CompanyMasterPage';
import DoctorMasterPage from './components/DoctorMasterPage';
import ShiftReconciliationModal from './components/ShiftReconciliationModal';
import FirstTimeSetupWizardModal from './components/FirstTimeSetupWizardModal';
import DatabaseImportModal from './components/DatabaseImportModal';
import { pushSalesBillToSupabase } from './utils/supabaseClient';

import initialMedicines from './data/medicines.json';

// URL-based direct routing (e.g. /admin or #admin directly opens the Admin Dashboard!)
function getInitialPage() {
  try {
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    if (path.includes('admin') || hash.includes('admin') || search.includes('admin')) {
      return 'admin';
    }
    if (hash) {
      const clean = hash.replace('#', '').trim();
      if (clean) return clean;
    }
  } catch (e) {}
  return 'billing';
}

// Persistent storage loader for medicines (initial base + modifications + newly added items)
function getInitialMedicines() {
  try {
    const overridesRaw = localStorage.getItem('beta_pharma_med_overrides');
    const addedRaw = localStorage.getItem('beta_pharma_added_meds');
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    const added = addedRaw ? JSON.parse(addedRaw) : [];

    let base = initialMedicines.map(m => {
      const key = m.code || m.name.toLowerCase();
      if (overrides[key]) {
        return { ...m, ...overrides[key] };
      }
      return m;
    });

    return [...added, ...base];
  } catch (e) {
    console.error('Error loading persistent medicines', e);
    return initialMedicines;
  }
}

// Persistent storage loader for recent completed bills (for F7 recall / reprint)
function getInitialRecentBills() {
  try {
    const raw = localStorage.getItem('beta_pharma_recent_bills');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [
    {
      billNo: '025315',
      date: '16/10/2026',
      time: '20:15:22',
      patientName: 'K. RAGHAVAN',
      doctorName: 'DR. SUKUMARAN MBBS',
      paymentMode: 'cash',
      items: [
        { code: 'M10001', name: 'AUGMENTIN 625MG TAB', batch: 'AUG9901', exp: '04/28', qty: 10, mrp: 22.34, totalValue: 223.40, gstPercent: 12 },
        { code: 'M10002', name: 'PAN 40MG TAB', batch: 'PAN2041', exp: '11/27', qty: 15, mrp: 15.50, totalValue: 232.50, gstPercent: 12 }
      ],
      grossTotal: 455.90,
      netPayable: 456,
      store: 'Beta Pharmacy (Thalassery)'
    }
  ];
}

// Persistent storage loader for next bill number sequence
function getInitialBillNo() {
  try {
    const saved = localStorage.getItem('beta_pharma_next_bill_no');
    if (saved) return saved;
  } catch (e) {}
  return '025316';
}

// Multi-Shop Branch Machine Identifiers (Configured per physical shop counter)
export const AVAILABLE_BRANCHES = [
  { id: 'MAIN', name: 'Beta Pharmacy (Main Branch)', location: 'Chirakkara, Thalassery', short: 'Main Chirakkara', prefix: 'CHI', stockKey: 'stock_shop1' },
  { id: 'TOWN', name: 'Beta Pharmacy (Town Branch)', location: 'Near Old Bus Stand, Thalassery', short: 'Town Branch', prefix: 'TWN', stockKey: 'stock_shop2' },
  { id: 'KANNUR', name: 'Beta Pharmacy (Kannur Clinic)', location: 'Fort Road, Kannur', short: 'Kannur Clinic', prefix: 'KNR', stockKey: 'stock_shop3' }
];

function getInitialBranch() {
  try {
    const saved = localStorage.getItem('beta_pharma_branch_id');
    if (saved) {
      const found = AVAILABLE_BRANCHES.find(b => b.id === saved);
      if (found) return found;
    }
  } catch (e) {}
  return AVAILABLE_BRANCHES[0];
}

// Persistent storage loader for staff roster
function getInitialStaffList() {
  try {
    const saved = localStorage.getItem('beta_pharma_staff_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return ['Rahul C', 'Suresh Kumar', 'Deepa M', 'Arun K', 'Pooja Nair'];
}

// Persistent storage loader for active cashier shift session
function getInitialActiveShift() {
  try {
    const saved = localStorage.getItem('beta_pharma_active_shift');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    shiftId: 'SHIFT-001',
    staffName: 'Rahul C',
    counter: 'Counter 01',
    startTime: '08:00 AM',
    startTimestamp: Date.now() - 4 * 60 * 60 * 1000,
    openingFloat: 2000
  };
}

export default function App() {
  const initialRoute = getInitialPage();
  const [theme, setTheme] = useState('light');
  const [activePage, setActivePage] = useState(initialRoute);
  const [isOffline, setIsOffline] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Multi-Shop Branch Machine Identity
  const [activeBranch, setActiveBranch] = useState(getInitialBranch);

  const handleSelectBranch = (branchId) => {
    const found = AVAILABLE_BRANCHES.find(b => b.id === branchId);
    if (!found) return;
    setActiveBranch(found);
    try {
      localStorage.setItem('beta_pharma_branch_id', found.id);
    } catch (e) {}
  };

  // First-Time Setup & Onboarding Wizard State (Triggers on Day 1 on any new shop PC)
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(() => {
    try {
      return !localStorage.getItem('beta_pharma_setup_completed');
    } catch (e) {
      return false;
    }
  });

  // Standalone Database Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Progressive Web App (PWA) 1-Click Desktop App Installation
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsAppInstalled(true);
        }
      } catch (e) {
        console.warn('PWA install error', e);
      }
    } else {
      alert("To install as a Windows Desktop App:\n1. Click the 'Install' icon (⤓) in the right side of your Chrome/Edge address bar.\n2. Or click Browser Menu (⋮) -> 'Save and share' -> 'Install Beta Pharmacy'.");
    }
  };

  const handleCompleteSetup = ({ branch, counter, cashier, catalogType, importedMeds }) => {
    try {
      localStorage.setItem('beta_pharma_setup_completed', 'true');
    } catch (e) {}

    if (branch) {
      handleSelectBranch(branch.id);
    }

    if (cashier) {
      handleSelectActiveStaff(cashier);
    }

    if (importedMeds && importedMeds.length > 0) {
      handleImportMedicines(importedMeds, 'replace');
    }
  };

  const handleImportMedicines = (newRecords, mode = 'merge') => {
    if (!newRecords || newRecords.length === 0) return;

    setMedicines(prev => {
      let updated;
      if (mode === 'replace') {
        updated = newRecords;
      } else {
        const existingCodes = new Set(prev.map(m => m.code));
        const toAdd = [];
        const overrides = {};

        newRecords.forEach(rec => {
          if (existingCodes.has(rec.code)) {
            overrides[rec.code] = rec;
          } else {
            toAdd.push(rec);
          }
        });

        const baseUpdated = prev.map(m => overrides[m.code] ? { ...m, ...overrides[m.code] } : m);
        updated = [...toAdd, ...baseUpdated];
      }

      try {
        localStorage.setItem('beta_pharma_added_meds', JSON.stringify(updated.slice(0, 5000)));
      } catch (e) {}

      return updated;
    });
  };

  // Staff Shift Session & Reconciliation State
  const [staffList, setStaffList] = useState(getInitialStaffList);
  const [activeShift, setActiveShift] = useState(getInitialActiveShift);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const handleAddStaff = (newStaffName) => {
    const clean = (newStaffName || '').trim();
    if (!clean) return;
    if (staffList.includes(clean)) return;
    const updated = [...staffList, clean];
    setStaffList(updated);
    try {
      localStorage.setItem('beta_pharma_staff_list', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSelectActiveStaff = (staffName) => {
    if (!staffName) return;
    setActiveShift(prev => {
      const updated = {
        ...prev,
        staffName
      };
      try {
        localStorage.setItem('beta_pharma_active_shift', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Medicines Catalog (Dynamic state loaded with persistent localStorage deltas)
  const [medicines, setMedicines] = useState(getInitialMedicines);
  const [isNewMedModalOpen, setIsNewMedModalOpen] = useState(false);

  // Security & Password Authorization Subsystem (Clipper USER.DBF)
  // MANAGER: CC, STAFF: DD. If owner opens direct /admin URL, auto-authorize as MANAGER!
  const [authenticatedRole, setAuthenticatedRole] = useState(initialRoute === 'admin' ? 'MANAGER' : null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalInfo, setPasswordModalInfo] = useState({
    title: 'Manager Authorization',
    description: 'Enter security PIN to access protected operations.'
  });
  const [pendingPage, setPendingPage] = useState(null);

  // Active Bill States (Starts clean & empty)
  const [billNo, setBillNo] = useState(getInitialBillNo);
  const [billDate, setBillDate] = useState('16/10/2026');
  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState(''); // Optional by default
  const [paymentMode, setPaymentMode] = useState('cash');

  // Starts with 0 items (clean slate, no auto-attached dummy medicines!)
  const [items, setItems] = useState([]);
  const [heldBills, setHeldBills] = useState([]);

  // Dot Matrix Print Modal & F7 Recall/Reprint System
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedBillData, setCompletedBillData] = useState(null);
  const [isReprintMode, setIsReprintMode] = useState(false);
  const [recentBills, setRecentBills] = useState(getInitialRecentBills);

  // Sync theme with HTML class for tailwind darkMode: 'class'
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Guard navigation to password-protected operations
  const handleNavigatePage = (page) => {
    // Sales & Margins is restricted to Admin
    if (page === 'sales-register' && authenticatedRole !== 'MANAGER') {
      setPendingPage(page);
      setPasswordModalInfo({
        title: 'Admin Authorization: Sales & Margins',
        description: 'Sales totals, gross margins, and cash drawer tallies are restricted to Administrator.'
      });
      setIsPasswordModalOpen(true);
      return;
    }

    // Owner Admin HQ Portal is strictly Admin only
    if (page === 'admin' && authenticatedRole !== 'MANAGER') {
      setPendingPage(page);
      setPasswordModalInfo({
        title: 'Owner Admin HQ Authorization',
        description: 'Multi-Store Consolidated Analytics, profit margins, and system settings are restricted to Administrator.'
      });
      setIsPasswordModalOpen(true);
      return;
    }

    setActivePage(page);
    try {
      if (page === 'admin') {
        window.history.replaceState(null, '', '/admin');
      } else if (page === 'billing') {
        window.history.replaceState(null, '', '/');
      } else {
        window.history.replaceState(null, '', `/#${page}`);
      }
    } catch (e) {}
  };

  // Sync with browser back/forward and direct hash/URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const page = getInitialPage();
      setActivePage(page);
      if (page === 'admin') {
        setAuthenticatedRole('MANAGER');
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handlePasswordSuccess = (role) => {
    setAuthenticatedRole(role);
    if (pendingPage) {
      setActivePage(pendingPage);
      try {
        if (pendingPage === 'admin') {
          window.history.replaceState(null, '', '/admin');
        } else {
          window.history.replaceState(null, '', `/#${pendingPage}`);
        }
      } catch (e) {}
      setPendingPage(null);
    }
  };

  const handleLogoutRole = () => {
    setAuthenticatedRole(null);
    if (activePage === 'purchases' || activePage === 'sales-register' || activePage === 'admin') {
      setActivePage('billing');
      try {
        window.history.replaceState(null, '', '/');
      } catch (e) {}
    }
    alert('Security session locked. Returning to Sale Billing.');
  };

  // F7 Recall & Reprint Most Recent Completed Bill (e.g. paper tear / jam reprint)
  const handleReprintLastBill = () => {
    if (recentBills.length === 0) {
      alert('No recently completed bills available in recall memory to reprint.');
      return;
    }
    setCompletedBillData(recentBills[0]);
    setIsReprintMode(true);
    setIsReceiptOpen(true);
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape returns to billing from any page
      if (e.key === 'Escape' && activePage !== 'billing') {
        setActivePage('billing');
      }
      // F7 triggers reprint of last completed bill (torn bill / reprint recall)
      if (e.key === 'F7') {
        e.preventDefault();
        handleReprintLastBill();
      }
      // F12 holds bill if on billing page
      if (e.key === 'F12' && activePage === 'billing') {
        e.preventDefault();
        if (items.length > 0) {
          handleHoldBill();
        } else if (heldBills.length > 0) {
          handleRestoreHeldBill();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage, items, heldBills, recentBills]);

  // Add new medicine to master catalog with localStorage persistence
  const handleAddNewMedicine = (newMed) => {
    setMedicines(prev => [newMed, ...prev]);
    try {
      const added = JSON.parse(localStorage.getItem('beta_pharma_added_meds') || '[]');
      added.unshift(newMed);
      localStorage.setItem('beta_pharma_added_meds', JSON.stringify(added));
    } catch (e) {
      console.error('Error saving added medicine to localStorage', e);
    }
    alert(`Success! "${newMed.name}" added to Product Master in RACK ${newMed.rack}. You can now search and bill it immediately.`);
  };

  // Update existing medicine in master catalog with localStorage persistence
  const handleUpdateMedicine = (updatedMed) => {
    setMedicines(prev => prev.map(m => (m.code === updatedMed.code || m.name.toLowerCase() === updatedMed.name.toLowerCase()) ? updatedMed : m));
    try {
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const key = updatedMed.code || updatedMed.name.toLowerCase();
      overrides[key] = updatedMed;
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.error('Error saving medicine override to localStorage', e);
    }
  };

  // Update stock when Purchase Invoice is saved
  const handleUpdateCatalogStock = (purchaseItems) => {
    setMedicines(prev => {
      const updated = [...prev];
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');

      for (const item of purchaseItems) {
        const idx = updated.findIndex(m => m.code === item.medCode || m.name.toLowerCase() === item.name.toLowerCase());
        if (idx !== -1) {
          const med = { ...updated[idx] };
          med.stock_shop1 = (med.stock_shop1 || 0) + item.totalUnits;
          const existingBatches = med.batches ? [...med.batches] : [];
          const bIdx = existingBatches.findIndex(b => b.batch_no === item.batch);
          if (bIdx !== -1) {
            existingBatches[bIdx] = {
              ...existingBatches[bIdx],
              exp_date: item.exp,
              mrp: item.mrp
            };
          } else {
            existingBatches.unshift({
              batch_no: item.batch,
              exp_date: item.exp,
              mrp: item.mrp,
              per: item.packSize
            });
          }
          med.batches = existingBatches;
          updated[idx] = med;
          const key = med.code || med.name.toLowerCase();
          overrides[key] = med;
        }
      }
      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      } catch (e) {}
      return updated;
    });
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (items.length === 0) return;
    const parked = { billNo, patientName, doctorName, paymentMode, items };
    setHeldBills(prev => [...prev, parked]);
    setItems([]);
    setPatientName('');
    alert(`Bill ${billNo} parked in Hold Queue (F12).`);
  };

  // Restore Parked Bill
  const handleRestoreHeldBill = () => {
    if (heldBills.length === 0) return;
    const [restored, ...remaining] = heldBills;
    setHeldBills(remaining);
    setBillNo(restored.billNo);
    setPatientName(restored.patientName);
    setDoctorName(restored.doctorName);
    setPaymentMode(restored.paymentMode);
    setItems(restored.items);
    setActivePage('billing');
  };

  // Complete and Open Dot Matrix Preview (Deducts stock & persists bill)
  const handleCompleteBill = () => {
    if (items.length === 0) return;

    const gross = items.reduce((acc, it) => acc + it.totalValue, 0);
    const net = Math.round(gross);

    const billPayload = {
      billNo,
      date: billDate,
      time: currentTime,
      patientName: patientName || 'CUSTOMER',
      doctorName: doctorName || 'GENERAL OTC',
      paymentMode,
      items: [...items],
      grossTotal: gross,
      netPayable: net,
      store: activeBranch.name,
      branchId: activeBranch.id,
      location: activeBranch.location,
      staffName: activeShift?.staffName || 'Rahul C',
      shiftId: activeShift?.shiftId || 'SHIFT-001'
    };

    setCompletedBillData(billPayload);

    // 1. Deduct sold medicine stock from live inventory for THIS specific shop branch
    setMedicines(prev => {
      const updated = [...prev];
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const targetStockKey = activeBranch.stockKey || 'stock_shop1';

      for (const line of items) {
        const itemCode = line.medicine ? line.medicine.code : line.code;
        const itemName = line.medicine ? line.medicine.name : line.name;
        const qtySold = parseInt(line.qty, 10) || 1;

        const idx = updated.findIndex(m => m.code === itemCode || m.name.toLowerCase() === (itemName || '').toLowerCase());
        if (idx !== -1) {
          const med = { ...updated[idx] };
          med[targetStockKey] = Math.max(0, (med[targetStockKey] || 0) - qtySold);
          updated[idx] = med;
          const key = med.code || med.name.toLowerCase();
          overrides[key] = med;
        }
      }

      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      } catch (e) {}

      return updated;
    });

    // 2. Persist recent bills for F7 recall / reprint
    setRecentBills(prev => {
      const updatedBills = [billPayload, ...prev.slice(0, 24)];
      try {
        localStorage.setItem('beta_pharma_recent_bills', JSON.stringify(updatedBills));
      } catch (e) {}
      return updatedBills;
    });

    setIsReprintMode(false);
    // Background async sync to Supabase (does not block counter or dot-matrix printing!)
    pushSalesBillToSupabase(billPayload);

    setIsReceiptOpen(true);
  };

  const handleNewBill = () => {
    const num = parseInt(billNo, 10) + 1;
    const nextBill = num.toString().padStart(6, '0');
    setBillNo(nextBill);
    try {
      localStorage.setItem('beta_pharma_next_bill_no', nextBill);
    } catch (e) {}
    setItems([]);
    setPatientName('');
  };

  // Staff Shift Handover Reconciliation Handler
  const handleSaveShiftHandover = (completedShiftRecord) => {
    try {
      const history = JSON.parse(localStorage.getItem('beta_pharma_shift_history') || '[]');
      history.unshift(completedShiftRecord);
      localStorage.setItem('beta_pharma_shift_history', JSON.stringify(history));
    } catch (e) {
      console.error('Error saving shift handover history', e);
    }

    const nextShift = {
      shiftId: `SHIFT-${Date.now().toString().slice(-6)}`,
      staffName: completedShiftRecord.nextStaffName,
      counter: completedShiftRecord.counter || 'Counter 01',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startTimestamp: Date.now(),
      openingFloat: completedShiftRecord.nextOpeningFloat || 2000
    };

    setActiveShift(nextShift);
    try {
      localStorage.setItem('beta_pharma_active_shift', JSON.stringify(nextShift));
    } catch (e) {}
  };

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* 1. Global Navigation Menu (Only shown on cashier counter POS; hidden in standalone Admin App!) */}
      {activePage !== 'admin' && (
        <TopNavigationMenu
          activePage={activePage}
          setActivePage={handleNavigatePage}
          theme={theme}
          setTheme={setTheme}
          isOffline={isOffline}
          setIsOffline={setIsOffline}
          currentTime={currentTime}
          onOpenNewMedModal={() => setIsNewMedModalOpen(true)}
          authenticatedRole={authenticatedRole}
          onOpenPasswordModal={(title, desc) => {
            setPasswordModalInfo({ title, description: desc });
            setIsPasswordModalOpen(true);
          }}
          onLogoutRole={handleLogoutRole}
          activeShift={activeShift}
          staffList={staffList}
          onSelectActiveStaff={handleSelectActiveStaff}
          onOpenShiftModal={() => setIsShiftModalOpen(true)}
          activeBranch={activeBranch}
          onSelectBranch={handleSelectBranch}
          availableBranches={AVAILABLE_BRANCHES}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
          onInstallApp={handleTriggerInstall}
          isAppInstalled={isAppInstalled}
        />
      )}

      {/* 2. Full Page Router (All pages connected with high contrast) */}
      {activePage === 'billing' && (
        <FastBillingTerminal
          theme={theme}
          activeBranch={activeBranch}
          items={items}
          setItems={setItems}
          medicines={medicines}
          billNo={billNo}
          billDate={billDate}
          patientName={patientName}
          setPatientName={setPatientName}
          doctorName={doctorName}
          setDoctorName={setDoctorName}
          paymentMode={paymentMode}
          setPaymentMode={setPaymentMode}
          heldBillsCount={heldBills.length}
          onCompleteBill={handleCompleteBill}
          onHoldBill={handleHoldBill}
          onRestoreHeldBill={handleRestoreHeldBill}
          onOpenNewMedModal={() => setIsNewMedModalOpen(true)}
          onReprintLastBill={handleReprintLastBill}
        />
      )}

      {activePage === 'product-master' && (
        <ProductCatalogPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
          onOpenNewMedModal={() => setIsNewMedModalOpen(true)}
          onUpdateMedicine={handleUpdateMedicine}
        />
      )}

      {activePage === 'supplier-master' && (
        <SupplierMasterPage
          theme={theme}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'company-master' && (
        <CompanyMasterPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'tax-master' && (
        <TaxMasterPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
          onUpdateMedicine={handleUpdateMedicine}
        />
      )}

      {activePage === 'doctor-master' && (
        <DoctorMasterPage
          theme={theme}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'purchases' && (
        <PurchaseEntryPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
          onUpdateCatalogStock={handleUpdateCatalogStock}
        />
      )}

      {activePage === 'expiry' && (
        <ExpiryReportPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'shortages' && (
        <ShortagesPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'radar' && (
        <MultiStoreRadarPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'sales-register' && (
        <DailySalesRegisterPage
          theme={theme}
          onBackToBilling={() => setActivePage('billing')}
          authenticatedRole={authenticatedRole}
          onOpenPasswordModal={(title, desc) => {
            setPasswordModalInfo({ title, description: desc });
            setIsPasswordModalOpen(true);
          }}
        />
      )}

      {activePage === 'due-bills' && (
        <CustomerCreditLedgerPage
          theme={theme}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'distributor-payments' && (
        <DistributorPaymentsPage
          theme={theme}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'batch-enquiry' && (
        <BatchEnquiryPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
        />
      )}

      {activePage === 'admin' && (
        <AdminDashboardApp
          theme={theme}
          onBackToCounter={() => setActivePage('billing')}
          onSwitchTheme={setTheme}
        />
      )}

      {/* Password Authentication Modal (Clipper Security CC / DD) */}
      <PasswordAuthModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingPage(null);
        }}
        onSuccess={handlePasswordSuccess}
        actionTitle={passwordModalInfo.title}
        actionDescription={passwordModalInfo.description}
        theme={theme}
      />

      {/* New Medicine Master Modal */}
      <NewMedicineModal
        isOpen={isNewMedModalOpen}
        onClose={() => setIsNewMedModalOpen(false)}
        onAddMedicine={handleAddNewMedicine}
        theme={theme}
      />

      {/* Dot Matrix Tractor-Feed Receipt Preview Modal */}
      <DotMatrixReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setIsReprintMode(false);
        }}
        billData={completedBillData}
        onNewBill={handleNewBill}
        isReprint={isReprintMode}
        recentBills={recentBills}
        onSelectBill={(selected) => setCompletedBillData(selected)}
      />

      {/* Staff Shift Session Handover & Blind Cash Reconciliation Modal */}
      <ShiftReconciliationModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        activeShift={activeShift}
        onSaveShiftHandover={handleSaveShiftHandover}
        recentBills={recentBills}
        theme={theme}
        staffList={staffList}
        onAddStaff={handleAddStaff}
      />

      {/* First-Time Guided Onboarding & Terminal Setup Wizard */}
      <FirstTimeSetupWizardModal
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        theme={theme}
        availableBranches={AVAILABLE_BRANCHES}
        onCompleteSetup={handleCompleteSetup}
        installPrompt={deferredInstallPrompt}
        isAppInstalled={isAppInstalled}
      />

      {/* Standalone Database Migration / Legacy Import Modal */}
      <DatabaseImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        theme={theme}
        onImportMedicines={handleImportMedicines}
      />
    </div>
  );
}
