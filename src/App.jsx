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
import PrintableReceipt from './components/PrintableReceipt';
import CustomerHistoryModal from './components/CustomerHistoryModal';
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
  { id: 'MAIN', name: 'Beta Pharmacy', location: 'Main Pharmacy', short: 'Beta Pharmacy', prefix: 'BP', stockKey: 'stock_shop1' },
  { id: 'POLYCLINIC', name: 'Beta Polyclinic', location: 'Polyclinic Division', short: 'Beta Polyclinic', prefix: 'BPC', stockKey: 'stock_shop2' }
];

function getInitialBranch() {
  try {
    const saved = localStorage.getItem('beta_pharma_branch_id');
    if (saved) {
      const found = AVAILABLE_BRANCHES.find(b => b.id === saved || b.name.toLowerCase().includes(saved.toLowerCase()));
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
  const [targetIncomingStaff, setTargetIncomingStaff] = useState(null);
  const [handoverNotice, setHandoverNotice] = useState(null);

  const handleOpenShiftHandover = (preselectedIncomingStaff) => {
    if (preselectedIncomingStaff && typeof preselectedIncomingStaff === 'string' && preselectedIncomingStaff !== activeShift?.staffName && preselectedIncomingStaff !== '__add_new__') {
      setTargetIncomingStaff(preselectedIncomingStaff);
    } else {
      setTargetIncomingStaff(null);
    }
    setIsShiftModalOpen(true);
  };

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
    if (staffName !== activeShift?.staffName) {
      // Must perform full shift handover! Cannot bypass cashier custody!
      handleOpenShiftHandover(staffName);
    }
  };

  // Medicines Catalog (Dynamic state loaded with persistent localStorage deltas)
  const [medicines, setMedicines] = useState(getInitialMedicines);
  const [isNewMedModalOpen, setIsNewMedModalOpen] = useState(false);

  // Security & Password Authorization Subsystem (Password prompts removed per request)
  const [authenticatedRole, setAuthenticatedRole] = useState('MANAGER');
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
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerHistoryOpen, setIsCustomerHistoryOpen] = useState(false);
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

  // Navigation to pages (Password gates removed as requested)
  const handleNavigatePage = (page) => {
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

  // Complete and Print Bill (Zero redundant preview modal! Direct dot-matrix print & stock deduction)
  const handleCompleteBill = () => {
    if (items.length === 0) return;

    const gross = items.reduce((acc, it) => acc + it.totalValue, 0);
    const net = Math.round(gross);

    const billPayload = {
      billNo,
      date: billDate,
      time: currentTime,
      patientName: patientName || 'CUSTOMER',
      customerPhone: customerPhone ? customerPhone.trim() : '',
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

    // 3. Save to Customer Prescription History if phone number was entered
    if (customerPhone && customerPhone.trim().length >= 4) {
      try {
        const cleanPhone = customerPhone.trim();
        const stored = JSON.parse(localStorage.getItem('beta_pharma_customer_history') || '{}');
        const existing = stored[cleanPhone] || {
          phone: cleanPhone,
          name: patientName || 'CUSTOMER',
          preferredDoctor: doctorName || 'GENERAL OTC',
          totalVisits: 0,
          totalSpent: 0,
          bills: []
        };
        if (patientName) existing.name = patientName;
        if (doctorName) existing.preferredDoctor = doctorName;
        existing.totalVisits = (existing.totalVisits || 0) + 1;
        existing.totalSpent = (existing.totalSpent || 0) + net;
        existing.bills = [billPayload, ...(existing.bills || []).slice(0, 20)];
        stored[cleanPhone] = existing;
        localStorage.setItem('beta_pharma_customer_history', JSON.stringify(stored));
      } catch (e) {
        console.warn('Error saving customer history to localStorage', e);
      }
    }

    setIsReprintMode(false);
    // Background async sync to Supabase (does not block counter or dot-matrix printing!)
    pushSalesBillToSupabase(billPayload);

    // 4. DIRECT PRINT: Trigger native Windows printer immediately without any blocking preview popup
    setTimeout(() => {
      window.print();
    }, 50);

    // 5. Instantly advance bill counter & clear terminal ready for next patient
    handleNewBill();
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
    setCustomerPhone('');
  };

  // 1-Click Repeat Prescription Loader from Customer History
  const handleRepeatBill = (repeatItems, docName, patName) => {
    if (!repeatItems || repeatItems.length === 0) return;

    const formatted = repeatItems.map(it => {
      const found = medicines.find(m => m.code === it.code || m.name.toLowerCase() === it.name.toLowerCase());
      const batchObj = found?.batches?.[0] || {
        batch_no: it.batch || 'BN001',
        exp_date: it.exp || '12/28',
        mrp: it.mrp || 30,
        per: 10
      };
      return {
        medicine: found || { name: it.name, code: it.code || 'M9999', company: 'GEN', rack: 1 },
        batch: batchObj,
        qty: it.qty || 10,
        totalValue: it.totalValue || ((batchObj.mrp / (batchObj.per || 10)) * (it.qty || 10))
      };
    });

    setItems(formatted);
    if (docName) setDoctorName(docName);
    if (patName) setPatientName(patName);
    setActivePage('billing');
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

    // Ensure terminal returns immediately to billing with new cashier active and zero password prompts
    setHandoverNotice(`Shift Handover Complete! Register handed over to ${completedShiftRecord.nextStaffName}`);
    setTimeout(() => {
      setHandoverNotice(null);
    }, 8000);

    setActivePage('billing');
    setAuthenticatedRole('MANAGER');
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
          onOpenShiftModal={handleOpenShiftHandover}
          activeBranch={activeBranch}
          onSelectBranch={handleSelectBranch}
          availableBranches={AVAILABLE_BRANCHES}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
          onInstallApp={handleTriggerInstall}
          isAppInstalled={isAppInstalled}
          onOpenCustomerHistory={() => setIsCustomerHistoryOpen(true)}
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
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          onOpenCustomerHistory={() => setIsCustomerHistoryOpen(true)}
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
          activeShift={activeShift}
          staffList={staffList}
          onSelectActiveStaff={handleSelectActiveStaff}
          onAddStaff={handleAddStaff}
          onOpenShiftModal={handleOpenShiftHandover}
          handoverNotice={handoverNotice}
          setHandoverNotice={setHandoverNotice}
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
        onClose={() => {
          setIsShiftModalOpen(false);
          setTargetIncomingStaff(null);
        }}
        activeShift={activeShift}
        onSaveShiftHandover={handleSaveShiftHandover}
        recentBills={recentBills}
        theme={theme}
        staffList={staffList}
        onAddStaff={handleAddStaff}
        targetIncomingStaff={targetIncomingStaff}
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

      {/* Customer Prescription & Visit History Modal (F4 / Instant 1-Click Repeat) */}
      <CustomerHistoryModal
        isOpen={isCustomerHistoryOpen}
        onClose={() => setIsCustomerHistoryOpen(false)}
        customerPhone={customerPhone}
        customerName={patientName}
        onSelectRepeatBill={handleRepeatBill}
        theme={theme}
      />

      {/* Off-screen Direct Print Target (Ensures 1-Click Print Bill directly outputs 1:1 ESC/P dot-matrix receipt without opening popup) */}
      <div className="hidden print:block">
        <PrintableReceipt billData={completedBillData || recentBills[0]} isReprint={isReprintMode} />
      </div>
    </div>
  );
}
