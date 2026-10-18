import React, { useState, useEffect, useRef } from 'react';
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
import ErrorBoundary from './components/ErrorBoundary';
import BatchEnquiryPage from './components/BatchEnquiryPage';
import TaxMasterPage from './components/TaxMasterPage';
import CompanyMasterPage from './components/CompanyMasterPage';
import ShiftReconciliationModal from './components/ShiftReconciliationModal';
import FirstTimeSetupWizardModal from './components/FirstTimeSetupWizardModal';
import DatabaseImportModal from './components/DatabaseImportModal';
import PrintableReceipt from './components/PrintableReceipt';
import CustomerHistoryModal from './components/CustomerHistoryModal';
import SalesReturnModal from './components/SalesReturnModal';
import DistributorInvoiceImportModal from './components/DistributorInvoiceImportModal';
import CommandPaletteModal from './components/CommandPaletteModal';
import TerminalLockScreen from './components/TerminalLockScreen';
import CloudStoragePurgeModal from './components/CloudStoragePurgeModal';
import BackupManagerModal from './components/BackupManagerModal';
import { syncEngine } from './utils/syncEngine';
import { idbCacheMedicines, idbClearMedicines } from './utils/indexedDb';
import { autoRepairCorruptedMedicines } from './utils/dbfReader';
import { pushSalesBillToSupabase, getCloudStorageEstimate } from './utils/supabaseClient';
import { saveDailyBackupSnapshot } from './utils/backupEngine';

import initialMedicines from './data/medicines.json';

// Protected modules requiring Administrator PIN authentication
export const PROTECTED_PAGES = {
  'admin': { title: 'Owner Admin HQ', description: 'Enter Admin PIN to view executive financial telemetry & margins.' },
  'sales-register': { title: 'Daily Sales & Margin Register', description: 'Enter Admin PIN to view store revenue, COGS, and gross margins.' },
  'distributor-payments': { title: 'Distributor Payments & Cheque Register', description: 'Enter Admin PIN to access payables ledger & bank cheques.' },
  'product-master': { title: 'Product Catalog Master', description: 'Enter Admin PIN to access master catalog pricing & PTR rates.' },
  'tax-master': { title: 'Tax & GST Master', description: 'Enter Admin PIN to modify statutory GST tax slabs.' }
};

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
// Automatically heals any corrupted "UNKNOWN MEDICINE" names from bad imports while preserving live stock!
function getInitialMedicines() {
  try {
    const overridesRaw = localStorage.getItem('beta_pharma_med_overrides');
    const addedRaw = localStorage.getItem('beta_pharma_added_meds');
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    const added = addedRaw ? JSON.parse(addedRaw) : [];

    // Authoritative master code map for instant self-healing
    const masterByCode = new Map(initialMedicines.map(m => [String(m.code || '').trim().toUpperCase(), m]));

    // 1. Sanitize overrides: never allow an override to turn a real medicine name into 'UNKNOWN'
    const cleanOverrides = {};
    for (const [key, val] of Object.entries(overrides)) {
      if (val) {
        const valName = String(val.name || '').toUpperCase();
        if (valName.includes('UNKNOWN')) {
          const master = masterByCode.get(String(val.code || key).trim().toUpperCase());
          if (master) {
            cleanOverrides[key] = {
              ...val,
              name: master.name,
              rack: (val.rack && val.rack !== 'A-01' && val.rack !== 'R-A-01') ? val.rack : master.rack,
              mrp: (val.mrp && val.mrp > 10) ? val.mrp : master.mrp
            };
          }
        } else {
          cleanOverrides[key] = val;
        }
      }
    }

    // 2. Sanitize added meds & recover imported shop stock from any corrupted records
    const cleanAdded = [];
    const stockTransfers = {};

    for (const item of added) {
      if (!item) continue;
      const codeUpper = String(item.code || '').trim().toUpperCase();
      const master = masterByCode.get(codeUpper);

      if (master) {
        // This is a known catalog medicine that was trapped in 'added' during DBF stock import!
        // Extract its imported stock so live shop quantities are preserved!
        const qty = item.stock !== undefined ? item.stock : (item.stock_shop1 !== undefined ? item.stock_shop1 : 0);
        stockTransfers[master.code] = qty;
      } else {
        const itemName = String(item.name || '').toUpperCase();
        if (itemName && !itemName.includes('UNKNOWN')) {
          cleanAdded.push(item);
        }
      }
    }

    // 3. Build base catalog with clean overrides & recovered stock
    let base = initialMedicines.map(m => {
      const key = m.code || m.name.toLowerCase();
      let item = { ...m };
      if (cleanOverrides[key]) {
        item = { ...item, ...cleanOverrides[key] };
      }
      if (stockTransfers[m.code] !== undefined) {
        item.stock_shop1 = stockTransfers[m.code];
        item.stock = stockTransfers[m.code];
      }
      return item;
    });

    // 4. Save cleaned state back to localStorage to cure browser permanently
    try {
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(cleanOverrides));
      localStorage.setItem('beta_pharma_added_meds', JSON.stringify(cleanAdded));
    } catch (_) {}

    return [...cleanAdded, ...base];
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
  return [];
}

// Persistent storage loader for next bill number sequence
function getInitialBillNo() {
  try {
    const saved = localStorage.getItem('beta_pharma_next_bill_no');
    if (saved) return saved;
  } catch (e) {}
  return '000001';
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

// Persistent storage loader for staff roster (Starts clean with zero dummy employees)
function getInitialStaffList() {
  try {
    const saved = localStorage.getItem('beta_pharma_staff_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
}

// Persistent storage loader for active cashier shift session (Requires operator login)
function getInitialActiveShift() {
  try {
    const saved = localStorage.getItem('beta_pharma_active_shift');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export default function App() {
  const initialRoute = getInitialPage();
  const [theme, setTheme] = useState('light');
  const [activePage, setActivePage] = useState(() => {
    if (PROTECTED_PAGES[initialRoute]) return 'billing';
    return initialRoute;
  });
  const [isOffline, setIsOffline] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Table Density Switching: 'compact' (Speed Counter) vs 'comfortable' (Executive HQ)
  const [density, setDensity] = useState(() => {
    try {
      return localStorage.getItem('beta_pharma_density') || 'compact';
    } catch (e) {
      return 'compact';
    }
  });

  const handleToggleDensity = () => {
    setDensity(prev => {
      const next = prev === 'compact' ? 'comfortable' : 'compact';
      try {
        localStorage.setItem('beta_pharma_density', next);
      } catch (e) {}
      return next;
    });
  };

  // Universal Command Palette Spotlight (Ctrl+K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Background Delta Sync Engine Status
  const [syncStatus, setSyncStatus] = useState(() => syncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
      setIsOffline(!status.isOnline);
    });
    return unsubscribe;
  }, []);

  // Multi-Shop Branch Machine Identity
  const [activeBranch, setActiveBranch] = useState(getInitialBranch);

  const handleSelectBranch = (branchId) => {
    if (authenticatedRole !== 'MANAGER') {
      setPasswordModalInfo({
        title: 'Switch Branch Machine Identity',
        description: 'Enter Admin PIN (1536) to change physical shop configuration for this counter.'
      });
      setIsPasswordModalOpen(true);
      return;
    }
    const found = AVAILABLE_BRANCHES.find(b => b.id === branchId);
    if (!found) return;
    setActiveBranch(found);
    try {
      localStorage.setItem('beta_pharma_branch_id', found.id);
    } catch (e) {}
  };

  // First-Time Setup & Onboarding Wizard State (Counter Billing only; never in Admin HQ)
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(() => {
    try {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      if (path.includes('admin') || hash.includes('admin')) {
        return false;
      }
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
      const masterMap = new Map(initialMedicines.map(m => [String(m.code || '').trim().toUpperCase(), m]));
      const prevMap = new Map(prev.map(m => [String(m.code || '').trim().toUpperCase(), m]));

      let updated;
      if (mode === 'replace') {
        // Replace catalog but protect against missing names by looking up master catalog
        updated = newRecords.map(rec => {
          const codeUpper = String(rec.code || '').trim().toUpperCase();
          const master = masterMap.get(codeUpper);
          const prevItem = prevMap.get(codeUpper);
          
          let safeName = rec.name;
          if (!safeName || safeName.includes('UNKNOWN')) {
            safeName = prevItem?.name || master?.name || (rec.code ? `MEDICINE ${rec.code}` : 'MEDICINE');
          }
          let safeRack = rec.rack;
          if (!safeRack || safeRack === 'A-01' || safeRack === 'R-A-01') {
            safeRack = prevItem?.rack || master?.rack || 'GN';
          }
          let safeMrp = rec.mrp;
          if (!safeMrp || safeMrp <= 0 || (safeMrp === 10 && master?.mrp && master.mrp !== 10)) {
            safeMrp = prevItem?.mrp || master?.mrp || 10;
          }

          return {
            ...(master || {}),
            ...(prevItem || {}),
            ...rec,
            name: safeName,
            rack: safeRack,
            mrp: safeMrp,
            stock: rec.stock !== undefined ? rec.stock : (prevItem?.stock_shop1 || 0),
            stock_shop1: rec.stock !== undefined ? rec.stock : (prevItem?.stock_shop1 || 0)
          };
        });
      } else {
        // Merge mode: update matching items with live stock, add genuinely new items
        const toAdd = [];
        const overrides = {};

        newRecords.forEach(rec => {
          const codeUpper = String(rec.code || '').trim().toUpperCase();
          if (prevMap.has(codeUpper)) {
            const existing = prevMap.get(codeUpper);
            const master = masterMap.get(codeUpper);

            const safeName = (rec.name && !rec.name.includes('UNKNOWN')) ? rec.name : (existing.name || master?.name);
            const safeRack = (rec.rack && rec.rack !== 'A-01' && rec.rack !== 'R-A-01') ? rec.rack : (existing.rack || master?.rack || 'GN');
            const safeMrp = (rec.mrp && rec.mrp > 10) ? rec.mrp : (existing.mrp || master?.mrp || 10);
            const safeStock = rec.stock !== undefined ? rec.stock : existing.stock_shop1;

            overrides[existing.code] = {
              ...existing,
              ...rec,
              name: safeName,
              rack: safeRack,
              mrp: safeMrp,
              stock: safeStock,
              stock_shop1: safeStock
            };
          } else {
            // New item not in current catalog
            if (rec.name && !rec.name.includes('UNKNOWN')) {
              toAdd.push(rec);
            }
          }
        });

        const baseUpdated = prev.map(m => overrides[m.code] ? overrides[m.code] : m);
        updated = [...toAdd, ...baseUpdated];
      }

      // Filter out any UNKNOWN MEDICINE items before persisting
      const safeForStorage = updated.filter(m => m.name && !m.name.includes('UNKNOWN'));
      const trulyAdded = safeForStorage.filter(m => m.isImported && !masterMap.has(String(m.code || '').trim().toUpperCase()));

      try {
        localStorage.setItem('beta_pharma_added_meds', JSON.stringify(trulyAdded));
      } catch (e) {}

      // Cache to IndexedDB for offline resilience
      idbCacheMedicines(updated).catch(() => {});

      return updated;
    });
  };

  // Instant 1-Click Master Catalog Restoration (Reverts to full 24,665 real items)
  const handleResetMasterCatalog = () => {
    try {
      localStorage.removeItem('beta_pharma_added_meds');
      localStorage.removeItem('beta_pharma_med_overrides');
    } catch (_) {}
    idbClearMedicines().catch(() => {});
    idbCacheMedicines(initialMedicines).catch(() => {});
    setMedicines(initialMedicines);
    alert('✓ Master Catalog Restored: All 24,665 real medicines loaded successfully!');
  };

  // Auto-Repair corrupted names while keeping imported stock counts
  const handleAutoRepairMedicines = () => {
    setMedicines(prev => {
      const repaired = autoRepairCorruptedMedicines(prev);
      try {
        localStorage.removeItem('beta_pharma_added_meds');
        localStorage.removeItem('beta_pharma_med_overrides');
      } catch (_) {}
      idbCacheMedicines(repaired).catch(() => {});
      return repaired;
    });
    alert('✓ Auto-Repair Complete: Medicine names repaired while preserving all your live shop stock!');
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

  // Terminal Lock & Shift Sign-In Gate (Zero-Trust Counter Protection)
  const [isTerminalLocked, setIsTerminalLocked] = useState(() => {
    try {
      const unlocked = localStorage.getItem('beta_pharma_terminal_unlocked');
      const activeShiftSaved = localStorage.getItem('beta_pharma_active_shift');
      return unlocked !== 'true' || !activeShiftSaved;
    } catch (e) {
      return true;
    }
  });

  const handleUnlockTerminal = (shiftPayload, role = 'CASHIER') => {
    setActiveShift(shiftPayload);
    setIsTerminalLocked(false);
    setAuthenticatedRole(role);
    try {
      localStorage.setItem('beta_pharma_active_shift', JSON.stringify(shiftPayload));
      localStorage.setItem('beta_pharma_terminal_unlocked', 'true');
    } catch (e) {}
  };

  const handleLockTerminal = () => {
    setIsTerminalLocked(true);
    try {
      localStorage.removeItem('beta_pharma_terminal_unlocked');
    } catch (e) {}
  };

  // Live Cloud Storage Metric Watchdog (Supabase 500 MB Free Tier)
  const [cloudMetrics, setCloudMetrics] = useState({ usedMB: 18.5, maxMB: 500, pctUsed: 3.7, estRunwayYears: 8.0, isWarningThreshold: false });
  const [isCloudPurgeModalOpen, setIsCloudPurgeModalOpen] = useState(false);

  const refreshCloudMetrics = () => {
    getCloudStorageEstimate().then(m => {
      if (m) setCloudMetrics(m);
    }).catch(() => {});
  };

  // 2+ Years Local Disk Backup Hub (730+ Days Hard Drive Retention)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleRestoreBackupData = ({ restoredMeds, restoredBills, restoredOverrides }) => {
    if (restoredMeds && restoredMeds.length > 0) {
      setMedicines(restoredMeds);
      idbCacheMedicines(restoredMeds).catch(() => {});
    }
    if (restoredBills && restoredBills.length > 0) {
      setRecentBills(restoredBills);
      try {
        localStorage.setItem('beta_pharma_recent_bills', JSON.stringify(restoredBills));
      } catch (e) {}
    }
    if (restoredOverrides) {
      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(restoredOverrides));
      } catch (e) {}
    }
  };

  // Medicines Catalog (Dynamic state loaded with persistent localStorage deltas)
  const [medicines, setMedicines] = useState(getInitialMedicines);
  const [isNewMedModalOpen, setIsNewMedModalOpen] = useState(false);

  // Security & Password Authorization Subsystem (Admin PIN: 1536)
  const [authenticatedRole, setAuthenticatedRole] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(() => {
    return !!PROTECTED_PAGES[initialRoute];
  });
  const [passwordModalInfo, setPasswordModalInfo] = useState(() => {
    return PROTECTED_PAGES[initialRoute] || {
      title: 'Manager Authorization',
      description: 'Enter security PIN to access protected operations.'
    };
  });
  const [pendingPage, setPendingPage] = useState(() => {
    return PROTECTED_PAGES[initialRoute] ? initialRoute : null;
  });

  // Active Bill States (Starts clean & empty)
  const [billNo, setBillNo] = useState(getInitialBillNo);
  const [billDate, setBillDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  });
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

  // Instant 1-Click Print setting (Default: true for TVS MSP 250 Star Clipper POS speed)
  const [isInstantPrint, setIsInstantPrint] = useState(() => {
    try {
      const saved = localStorage.getItem('beta_pharma_instant_print');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const handleToggleInstantPrint = () => {
    setIsInstantPrint(prev => {
      const next = !prev;
      try {
        localStorage.setItem('beta_pharma_instant_print', String(next));
      } catch (e) {}
      return next;
    });
  };

  const pendingInstantPrintRef = useRef(false);

  // Deterministic 1-click print: triggers window.print once the exact bill is committed to DOM
  useEffect(() => {
    if (pendingInstantPrintRef.current && completedBillData) {
      pendingInstantPrintRef.current = false;
      // Micro-task delay to ensure CSS continuous media print styles are applied
      setTimeout(() => {
        window.print();
        if (!isReprintMode) {
          handleNewBill();
        }
      }, 50);
    }
  }, [completedBillData, isReprintMode]);

  // Sales Return (F8) & Distributor Invoice Import Modals
  const [isSalesReturnOpen, setIsSalesReturnOpen] = useState(false);
  const [isInvoiceImportOpen, setIsInvoiceImportOpen] = useState(false);

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

  // Navigation to pages (Admin PIN check on protected modules)
  const handleNavigatePage = (page) => {
    if (PROTECTED_PAGES[page] && authenticatedRole !== 'MANAGER') {
      setPendingPage(page);
      setPasswordModalInfo(PROTECTED_PAGES[page]);
      setIsPasswordModalOpen(true);
      return;
    }

    setActivePage(page);
    if (page === 'admin') {
      setIsSetupWizardOpen(false);
    }
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
      if (PROTECTED_PAGES[page] && authenticatedRole !== 'MANAGER') {
        setPendingPage(page);
        setPasswordModalInfo(PROTECTED_PAGES[page]);
        setIsPasswordModalOpen(true);
        setActivePage('billing');
        return;
      }
      setActivePage(page);
      if (page === 'admin') {
        setIsSetupWizardOpen(false);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [authenticatedRole]);

  // Zero-Trust Security Enforcement: Never allow protected pages without MANAGER role
  useEffect(() => {
    if (PROTECTED_PAGES[activePage] && authenticatedRole !== 'MANAGER') {
      const pageToProtect = activePage;
      setActivePage('billing');
      setPendingPage(pageToProtect);
      setPasswordModalInfo(PROTECTED_PAGES[pageToProtect]);
      setIsPasswordModalOpen(true);
    }
  }, [activePage, authenticatedRole]);

  const handlePasswordSuccess = (role) => {
    setAuthenticatedRole(role);
    if (pendingPage) {
      setActivePage(pendingPage);
      if (pendingPage === 'admin') {
        setIsSetupWizardOpen(false);
      }
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
    if (PROTECTED_PAGES[activePage]) {
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
    if (isInstantPrint) {
      pendingInstantPrintRef.current = true;
    } else {
      setIsReceiptOpen(true);
    }
  };

  // Initialize IndexedDB with medicines catalog on startup (offline-first storage)
  useEffect(() => {
    if (medicines && medicines.length > 0) {
      idbCacheMedicines(medicines).catch(err => console.warn('IndexedDB medicine caching note:', err));
    }
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K / Cmd+K triggers Universal Command Palette Spotlight
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Escape returns to billing from any page
      if (e.key === 'Escape' && activePage !== 'billing') {
        setActivePage('billing');
      }
      // F7 triggers reprint of last completed bill (torn bill / reprint recall)
      if (e.key === 'F7') {
        e.preventDefault();
        handleReprintLastBill();
      }
      // Ctrl+L / Cmd+L locks the counter terminal
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleLockTerminal();
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

  // Live Cloud Metrics Polling (500 MB Free Tier Watchdog)
  useEffect(() => {
    refreshCloudMetrics();
    const interval = setInterval(refreshCloudMetrics, 60000);
    return () => clearInterval(interval);
  }, [recentBills.length]);

  // Automated 2+ Years Daily Backup Snapshot Engine (Local Hard Drive)
  useEffect(() => {
    if (medicines && medicines.length > 0 && activeShift) {
      saveDailyBackupSnapshot(medicines, recentBills, activeBranch, activeShift);
    }
  }, [activeShift, recentBills.length]);

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

  // Delete individual batch from catalog and re-sum stock
  const handleDeleteBatch = (medCodeOrName, batchNo) => {
    if (!confirm(`Are you sure you want to delete batch "${batchNo}"?`)) return;

    setMedicines(prev => {
      const updated = [...prev];
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const targetStockKey = activeBranch?.stockKey || 'stock_shop1';

      const idx = updated.findIndex(m => m.code === medCodeOrName || m.name.toLowerCase() === String(medCodeOrName).toLowerCase());
      if (idx !== -1) {
        const med = { ...updated[idx] };
        const oldBatches = med.batches || [];
        const targetBatch = oldBatches.find(b => b.batch_no === batchNo);
        const batchQty = targetBatch ? (targetBatch.qty !== undefined ? targetBatch.qty : (targetBatch.stock !== undefined ? targetBatch.stock : 0)) : 0;
        
        med.batches = oldBatches.filter(b => b.batch_no !== batchNo);
        med[targetStockKey] = Math.max(0, (med[targetStockKey] || 0) - batchQty);
        med.stock = med[targetStockKey];
        
        updated[idx] = med;
        const key = med.code || med.name.toLowerCase();
        overrides[key] = med;
      }

      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      } catch (e) {}
      return updated;
    });
  };

  // Bulk purge historical dead batches (0 stock or expired > 180 days ago)
  const handlePurgeDeadBatches = () => {
    if (!confirm("Are you sure you want to purge dead batches? This will permanently clean zero-stock batches and historical batches expired over 180 days ago.")) return;

    const parseDays = (expStr) => {
      if (!expStr) return 999;
      try {
        const parts = expStr.trim().split(/[\/-]/);
        let month = 1, year = 2026;
        if (parts.length === 2) {
          month = parseInt(parts[0], 10);
          let yr = parseInt(parts[1], 10);
          year = yr < 100 ? 2000 + yr : yr;
        } else if (parts.length === 3) {
          month = parseInt(parts[1], 10);
          let yr = parseInt(parts[2], 10);
          year = yr < 100 ? 2000 + yr : yr;
        }
        const expDate = new Date(year, month, 0);
        return Math.round((expDate - new Date()) / (1000 * 60 * 60 * 24));
      } catch (e) {
        return 180;
      }
    };

    let totalPurged = 0;
    setMedicines(prev => {
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const targetStockKey = activeBranch?.stockKey || 'stock_shop1';

      const updated = prev.map(med => {
        if (!med.batches || med.batches.length === 0) return med;
        const keptBatches = med.batches.filter(b => {
          const bStock = b.qty !== undefined ? b.qty : (b.stock !== undefined ? b.stock : 0);
          const days = parseDays(b.exp_date);
          const isDead = (bStock <= 0) || (days < -180);
          if (isDead) totalPurged++;
          return !isDead;
        });

        if (keptBatches.length !== med.batches.length) {
          const newMed = {
            ...med,
            batches: keptBatches,
            [targetStockKey]: keptBatches.reduce((acc, b) => acc + (b.qty !== undefined ? b.qty : (b.stock || 0)), 0),
            stock: keptBatches.reduce((acc, b) => acc + (b.qty !== undefined ? b.qty : (b.stock || 0)), 0)
          };
          const key = newMed.code || newMed.name.toLowerCase();
          overrides[key] = newMed;
          return newMed;
        }
        return med;
      });

      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      } catch (e) {}
      return updated;
    });

    alert(`Successfully purged ${totalPurged} dead/obsolete batches from counter inventory.`);
  };

  // Sales Return / Credit Note Handler: Restocks medicines to current branch and issues Credit Note
  const handleConfirmSalesReturn = (returnData) => {
    if (!returnData || !returnData.returnedItems || returnData.returnedItems.length === 0) return;

    // 1. Restock returned quantities to shelf inventory
    setMedicines(prev => {
      const updated = [...prev];
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const targetStockKey = activeBranch?.stockKey || 'stock_shop1';

      returnData.returnedItems.forEach(retItem => {
        const idx = updated.findIndex(m => m.code === retItem.code || m.name.toLowerCase() === (retItem.name || '').toLowerCase());
        if (idx !== -1) {
          const med = { ...updated[idx] };
          med[targetStockKey] = (med[targetStockKey] || 0) + (retItem.returnQty || 0);
          updated[idx] = med;
          const key = med.code || med.name.toLowerCase();
          overrides[key] = med;
        }
      });

      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      } catch (e) {}

      return updated;
    });

    // 2. Record Credit Note in recent bills memory & persistent credit note log
    const creditNoteBill = {
      billNo: returnData.creditNoteNo,
      date: billDate,
      time: currentTime,
      patientName: returnData.originalBill?.patientName || 'CUSTOMER',
      customerPhone: returnData.originalBill?.customerPhone || '',
      doctorName: returnData.originalBill?.doctorName || 'GENERAL OTC',
      paymentMode: returnData.action === 'credit_note' ? 'CREDIT NOTE' : 'CASH REFUND',
      items: returnData.returnedItems.map(it => ({
        code: it.code,
        name: it.name,
        batch: it.batch,
        exp: it.exp,
        qty: -it.returnQty,
        mrp: it.mrp,
        totalValue: -(it.unitPrice * it.returnQty)
      })),
      grossTotal: -returnData.refundAmount,
      netPayable: -returnData.refundAmount,
      store: activeBranch?.name || 'Beta Pharmacy',
      isCreditNote: true,
      originalBillNo: returnData.originalBill?.billNo,
      returnReason: returnData.reason
    };

    setRecentBills(prev => {
      const updated = [creditNoteBill, ...prev.slice(0, 499)];
      try {
        localStorage.setItem('beta_pharma_recent_bills', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const cnHistory = JSON.parse(localStorage.getItem('beta_pharma_credit_notes') || '[]');
      cnHistory.unshift(returnData);
      localStorage.setItem('beta_pharma_credit_notes', JSON.stringify(cnHistory));
    } catch (e) {}

    alert(`✅ ${returnData.creditNoteNo} issued! ${returnData.returnedItems.length} item(s) restocked to ${activeBranch?.short || 'shelf'}. Refund/Credit Amount: ₹${returnData.refundAmount.toFixed(2)}`);
  };

  // Distributor Purchase Invoice Inward Handler: Updates shelf stock, adds batches, and logs payables
  const handleInwardDistributorInvoice = (importedData) => {
    if (!importedData || !importedData.items || importedData.items.length === 0) return;

    // 1. Inward items into catalog
    setMedicines(prev => {
      const updated = [...prev];
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const targetStockKey = activeBranch?.stockKey || 'stock_shop1';

      importedData.items.forEach(item => {
        const idx = updated.findIndex(m => m.code === item.code || m.name.toLowerCase() === item.name.toLowerCase());
        if (idx !== -1) {
          const med = { ...updated[idx] };
          med[targetStockKey] = (med[targetStockKey] || 0) + (item.qty || 0);
          const batches = med.batches ? [...med.batches] : [];
          const bIdx = batches.findIndex(b => b.batch_no === item.batch);
          if (bIdx !== -1) {
            batches[bIdx] = {
              ...batches[bIdx],
              exp_date: item.exp || batches[bIdx].exp_date,
              mrp: item.mrp || batches[bIdx].mrp,
              stock: (batches[bIdx].stock || 0) + item.qty
            };
          } else {
            batches.unshift({
              batch_no: item.batch || 'BN-' + Date.now().toString().slice(-4),
              exp_date: item.exp || '12/28',
              mrp: item.mrp || med.mrp,
              per: item.per || med.per || 10,
              stock: item.qty
            });
          }
          med.batches = batches;
          if (item.ptr) med.ptr = item.ptr;
          if (item.mrp) med.mrp = item.mrp;
          updated[idx] = med;
          const key = med.code || med.name.toLowerCase();
          overrides[key] = med;
        } else {
          // New Medicine
          const newMedObj = {
            code: item.code || 'M' + Math.floor(10000 + Math.random() * 90000),
            name: item.name,
            generic: item.generic || '',
            mrp: item.mrp || 100,
            ptr: item.ptr || 78,
            per: item.per || 10,
            rack: item.rack || 'GN',
            tax_percent: item.gstPercent || 12,
            stock_shop1: targetStockKey === 'stock_shop1' ? item.qty : 0,
            stock_shop2: targetStockKey === 'stock_shop2' ? item.qty : 0,
            batches: [{
              batch_no: item.batch || 'BN001',
              exp_date: item.exp || '12/28',
              mrp: item.mrp || 100,
              per: item.per || 10,
              stock: item.qty
            }]
          };
          updated.unshift(newMedObj);
          overrides[newMedObj.code] = newMedObj;
        }
      });

      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      } catch (e) {}

      return updated;
    });

    // 2. Record purchase bill in payables
    try {
      const payables = JSON.parse(localStorage.getItem('beta_pharma_purchase_bills') || '[]');
      const newPayable = {
        billNo: importedData.invoiceNo || `INV-${Date.now().toString().slice(-5)}`,
        name: importedData.distributor || 'General Pharma Distributor',
        date: importedData.invoiceDate || billDate,
        amount: importedData.items.reduce((acc, it) => acc + ((it.ptr || it.mrp * 0.78) * it.qty), 0),
        itemsCount: importedData.items.length,
        status: 'UNPAID',
        source: 'INVOICE_IMPORT'
      };
      payables.unshift(newPayable);
      localStorage.setItem('beta_pharma_purchase_bills', JSON.stringify(payables));
    } catch (e) {}

    alert(`🎉 Purchase Invoice Inwarded! ${importedData.items.length} items successfully updated into live inventory.`);
  };

  // Multi-Store Inter-Branch Stock Transfer Handler
  const handleTransferStock = ({ medCode, medicineName, fromBranchId, toBranchId, qty }) => {
    const fromShopKey = fromBranchId === 'POLYCLINIC' ? 'stock_shop2' : 'stock_shop1';
    const toShopKey = toBranchId === 'POLYCLINIC' ? 'stock_shop2' : 'stock_shop1';
    const fromBranchName = fromBranchId === 'POLYCLINIC' ? 'Beta Polyclinic' : 'Beta Pharmacy';
    const toBranchName = toBranchId === 'POLYCLINIC' ? 'Beta Polyclinic' : 'Beta Pharmacy';

    // 1. Update live medicines catalog state and persist in localStorage
    setMedicines(prev => {
      const updated = prev.map(m => {
        if (m.code === medCode || m.name.toLowerCase() === (medicineName || '').toLowerCase()) {
          const currentFrom = m[fromShopKey] || 0;
          const currentTo = m[toShopKey] || 0;
          const actualQty = Math.min(currentFrom, qty);
          return {
            ...m,
            [fromShopKey]: Math.max(0, currentFrom - actualQty),
            [toShopKey]: currentTo + actualQty
          };
        }
        return m;
      });

      try {
        const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
        const target = updated.find(m => m.code === medCode || m.name.toLowerCase() === (medicineName || '').toLowerCase());
        if (target) {
          overrides[target.code || target.name.toLowerCase()] = target;
          localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
        }
      } catch (e) {}

      return updated;
    });

    // 2. Create transfer note in audit trail
    const trNumber = `TR-${Date.now().toString().slice(-6)}`;
    const transferRecord = {
      id: trNumber,
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      medicine: medicineName,
      medCode,
      from: fromBranchName,
      to: toBranchName,
      qty,
      status: 'DISPATCHED'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('beta_pharma_transfer_notes') || '[]');
      localStorage.setItem('beta_pharma_transfer_notes', JSON.stringify([transferRecord, ...existing]));
    } catch (e) {}

    // 3. Record in Delta Sync Engine (IndexedDB + Supabase)
    syncEngine.recordStockTransfer(transferRecord);

    return transferRecord;
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
      staffName: activeShift?.staffName || 'Counter Staff',
      shiftId: activeShift?.shiftId || 'SHIFT-OPEN'
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

    // 2. Persist recent bills for F7 recall / reprint (up to 500 per day — safe for localStorage)
    setRecentBills(prev => {
      const updatedBills = [billPayload, ...prev.slice(0, 499)];
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

    // 4. Save to Customer Credit Ledger (Khata / Udhaar) if paymentMode === 'credit'
    if (paymentMode === 'credit') {
      try {
        const dues = JSON.parse(localStorage.getItem('beta_pharma_due_bills') || '[]');
        const dueRecord = {
          id: `DUE-${Date.now()}`,
          billNo,
          date: billDate,
          customerName: patientName || 'CUSTOMER',
          customerPhone: customerPhone ? customerPhone.trim() : '',
          doctorName: doctorName || 'GENERAL OTC',
          amount: net,
          balance: net,
          dueDate: '30 days',
          status: 'UNPAID',
          store: activeBranch?.name || 'Beta Pharmacy'
        };
        dues.unshift(dueRecord);
        localStorage.setItem('beta_pharma_due_bills', JSON.stringify(dues));
      } catch (e) {
        console.warn('Error recording customer due bill', e);
      }
    }

    setIsReprintMode(false);
    // Offline-first delta sync engine (IndexedDB local write + background delta push to Supabase)
    syncEngine.recordSalesBill(billPayload);

    if (isInstantPrint) {
      pendingInstantPrintRef.current = true;
    } else {
      // 4. Open clean Dot-Matrix Receipt Modal: Cashier can preview voucher, press Enter to print, send WhatsApp, or press Esc
      setIsReceiptOpen(true);
    }
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
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          density={density}
          onToggleDensity={handleToggleDensity}
          syncStatus={syncStatus}
          onTriggerSync={() => syncEngine.triggerManualSync()}
          isInstantPrint={isInstantPrint}
          onToggleInstantPrint={handleToggleInstantPrint}
          onLockTerminal={handleLockTerminal}
          onOpenCloudStorageModal={() => setIsCloudPurgeModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          cloudMetrics={cloudMetrics}
        />
      )}

      {/* 2. Full Page Router (All pages connected with high contrast) */}
      {activePage === 'billing' && (
        <FastBillingTerminal
          theme={theme}
          density={density}
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
          onOpenSalesReturn={() => setIsSalesReturnOpen(true)}
        />
      )}

      {activePage === 'product-master' && authenticatedRole === 'MANAGER' && (
        <ProductCatalogPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
          onOpenNewMedModal={() => setIsNewMedModalOpen(true)}
          onUpdateMedicine={handleUpdateMedicine}
          onResetMasterCatalog={handleResetMasterCatalog}
          onAutoRepairMedicines={handleAutoRepairMedicines}
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

      {activePage === 'tax-master' && authenticatedRole === 'MANAGER' && (
        <TaxMasterPage
          theme={theme}
          medicines={medicines}
          onBackToBilling={() => setActivePage('billing')}
          onUpdateMedicine={handleUpdateMedicine}
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
          onDeleteBatch={handleDeleteBatch}
          onPurgeDeadBatches={handlePurgeDeadBatches}
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
          onTransferStock={handleTransferStock}
        />
      )}

      {activePage === 'sales-register' && authenticatedRole === 'MANAGER' && (
        <DailySalesRegisterPage
          theme={theme}
          onBackToBilling={() => setActivePage('billing')}
          authenticatedRole={authenticatedRole}
          recentBills={recentBills}
          medicines={medicines}
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

      {activePage === 'distributor-payments' && authenticatedRole === 'MANAGER' && (
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

      {activePage === 'admin' && authenticatedRole === 'MANAGER' && (
        <ErrorBoundary fallbackTitle="Beta Pharmacy HQ Admin" theme={theme}>
          <AdminDashboardApp
            theme={theme}
            onBackToCounter={() => setActivePage('billing')}
            onSwitchTheme={setTheme}
            medicines={medicines}
            recentBills={recentBills}
            availableBranches={AVAILABLE_BRANCHES}
            activeShift={activeShift}
            billDate={billDate}
            onOpenInvoiceImport={() => setIsInvoiceImportOpen(true)}
            onTransferStock={handleTransferStock}
          />
        </ErrorBoundary>
      )}

      {/* Password Authentication Modal (Clipper Security CC / DD) */}
      <PasswordAuthModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingPage(null);
          if (PROTECTED_PAGES[activePage] && authenticatedRole !== 'MANAGER') {
            setActivePage('billing');
            try {
              window.history.replaceState(null, '', '/');
            } catch (e) {}
          }
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

      {/* First-Time Guided Onboarding & Terminal Setup Wizard (Counter Billing only) */}
      {activePage !== 'admin' && (
        <FirstTimeSetupWizardModal
          isOpen={isSetupWizardOpen && activePage !== 'admin'}
          onClose={() => setIsSetupWizardOpen(false)}
          theme={theme}
          availableBranches={AVAILABLE_BRANCHES}
          onCompleteSetup={handleCompleteSetup}
          installPrompt={deferredInstallPrompt}
          isAppInstalled={isAppInstalled}
        />
      )}

      {/* Standalone Database Migration / Legacy Import Modal */}
      <DatabaseImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        theme={theme}
        onImportMedicines={handleImportMedicines}
        onResetMasterCatalog={handleResetMasterCatalog}
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

      {/* Sales Return & Credit Note Modal (F8) */}
      <SalesReturnModal
        isOpen={isSalesReturnOpen}
        onClose={() => setIsSalesReturnOpen(false)}
        recentBills={recentBills}
        onConfirmReturn={handleConfirmSalesReturn}
        theme={theme}
        activeBranch={activeBranch}
      />

      {/* Distributor Purchase Invoice Excel/CSV Inward Import Modal */}
      <DistributorInvoiceImportModal
        isOpen={isInvoiceImportOpen}
        onClose={() => setIsInvoiceImportOpen(false)}
        onImportSuccess={handleInwardDistributorInvoice}
        catalogMedicines={medicines}
        theme={theme}
        activeBranch={activeBranch}
      />

      {/* Off-screen Direct Print Target (Ensures 1-Click Print Bill directly outputs 1:1 ESC/P dot-matrix receipt without opening popup) */}
      {!isSalesReturnOpen && (
        <div className="hidden print:block">
          <PrintableReceipt billData={completedBillData || recentBills[0]} isReprint={isReprintMode} />
        </div>
      )}

      {/* Universal Command Palette Spotlight (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigatePage}
        medicines={medicines}
        onDirectAddMedicine={(med) => {
          setActivePage('billing');
        }}
        onReprintLastBill={handleReprintLastBill}
        onOpenNewMedModal={() => setIsNewMedModalOpen(true)}
        onOpenSalesReturn={() => setIsSalesReturnOpen(true)}
        onOpenShiftModal={handleOpenShiftHandover}
        onOpenInvoiceImport={() => setIsInvoiceImportOpen(true)}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        theme={theme}
        density={density}
        onToggleDensity={handleToggleDensity}
        onTriggerSync={() => syncEngine.triggerManualSync()}
      />

      {/* Terminal Lock & Shift Sign-In Gate (Blocks unauthorized visitors & secures cash counter) */}
      {isTerminalLocked && (
        <TerminalLockScreen
          theme={theme}
          activeBranch={activeBranch}
          staffList={staffList}
          onUnlockTerminal={handleUnlockTerminal}
          onAddStaff={handleAddStaff}
        />
      )}

      {/* Live Cloud Storage Quota Health & 2-Step Safe Purge Modal */}
      <CloudStoragePurgeModal
        isOpen={isCloudPurgeModalOpen}
        onClose={() => setIsCloudPurgeModalOpen(false)}
        theme={theme}
        cloudMetrics={cloudMetrics}
        onRefreshMetrics={refreshCloudMetrics}
        recentBills={recentBills}
        activeBranch={activeBranch}
      />

      {/* 2+ Years Local Disk Backup Hub (730+ Days Retention & USB Export) */}
      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        theme={theme}
        medicines={medicines}
        recentBills={recentBills}
        activeBranch={activeBranch}
        onRestoreBackup={handleRestoreBackupData}
      />
    </div>
  );
}
