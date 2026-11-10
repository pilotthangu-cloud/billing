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
import DoctorMasterPage from './components/DoctorMasterPage';
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
import { 
  openPharmaDB,
  idbCacheMedicines, 
  idbClearMedicines, 
  idbUpdateMedicines, 
  idbAddMedicine,
  idbSaveBill, 
  idbCommitSaleTransaction,
  idbGetMedicinesCount,
  idbGetCachedMedicines,
  idbGetAllBills,
  idbSaveUnverifiedReturn,
  idbGetUnverifiedReturns,
  idbIsInitialized,
  idbSetInitialized,
  idbGetMaxBillNo,
  idbMarkPrintJob
} from './utils/indexedDb';
import UnverifiedReturnsReviewModal from './components/UnverifiedReturnsReviewModal';
import { autoRepairCorruptedMedicines } from './utils/dbfReader';
import { 
  pushSalesBillToSupabase, 
  getCloudStorageEstimate,
  uploadMedicinesCatalogToSupabase,
  fetchMedicinesCatalogFromSupabase,
  fetchLiveCloudSalesBills,
  fetchLiveMedicineDeltas
} from './utils/supabaseClient';
import { saveDailyBackupSnapshot } from './utils/backupEngine';
import { isBatchExpired, isExpiryValid, normalizeExpiry } from './utils/billUtils';
import { planBatchTransfer } from './utils/inventoryTransfer';
import { preserveOtherBranchRecord, replaceBranchBatches } from './utils/branchImport';

import initialMedicines from './data/medicines.json';

// Safe counter release: unfinished shift/admin/cloud workflows stay out of the
// pharmacy UI unless an explicitly audited build opts back in.
export const COUNTER_ONLY_MODE = import.meta.env.VITE_COUNTER_ONLY_MODE !== 'false';
const COUNTER_ONLY_ALLOWED_PAGES = new Set(['billing', 'product-master', 'expiry', 'batch-enquiry']);
const isCounterOnlyPageAllowed = page => !COUNTER_ONLY_MODE || COUNTER_ONLY_ALLOWED_PAGES.has(page);

// Protected modules requiring Administrator PIN authentication
// Protected modules requiring Administrator PIN authentication (Restricted strictly to Sales & Margins)
export const PROTECTED_PAGES = {
  'admin': { title: 'Owner Admin HQ', description: 'Enter Admin PIN to view executive financial telemetry & margins.' },
  'sales-register': { title: 'Daily Sales & Margin Register', description: 'Enter Admin PIN to view store revenue, COGS, and gross margins.' }
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
    if (localStorage.getItem('beta_pharma_prod_clean_zero_v5') !== 'true') {
      try {
        localStorage.removeItem('beta_pharma_med_overrides');
        localStorage.removeItem('beta_pharma_added_meds');
      } catch (_) {}
      return initialMedicines;
    }
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
              rack: val.rack ? val.rack : master.rack,
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

// Persistent storage loader for next bill number sequence (Branch-isolated)
function getInitialBillNo() {
  try {
    const branchId = localStorage.getItem('beta_pharma_branch_id') || 'MAIN';
    const branchKey = `beta_pharma_last_bill_no_${branchId}`;
    const saved = localStorage.getItem(branchKey) || localStorage.getItem('beta_pharma_next_bill_no');
    if (saved) return saved;
  } catch (e) {}
  return '000001';
}

// Multi-Shop Branch Machine Identifiers (Configured per physical shop counter)
export const AVAILABLE_BRANCHES = [
  { id: 'MAIN', name: 'Beta Pharmacy', location: 'Main Pharmacy', short: 'Beta Pharmacy', prefix: 'BP', stockKey: 'stock_shop1' },
  { id: 'POLYCLINIC', name: 'Beta Polyclinic Pharmacy', location: 'Polyclinic Division', short: 'Beta Polyclinic Pharmacy', prefix: 'BPC', stockKey: 'stock_shop2' }
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
    if (!isCounterOnlyPageAllowed(initialRoute)) return 'billing';
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

  // Persistent Store Profile & Receipt Header Configuration (Admin Managed)
  const [storeConfig, setStoreConfig] = useState(() => {
    try {
      const branchId = localStorage.getItem('beta_pharma_branch_id') || 'MAIN';
      const branchCfg = localStorage.getItem('beta_pharma_store_config_' + branchId);
      if (branchCfg) return JSON.parse(branchCfg);
      const saved = localStorage.getItem('beta_pharma_store_config');
      if (saved) return JSON.parse(saved);
      if (branchId === 'POLYCLINIC') {
        return {
          headerStyle: 'COMPACT_MEMO',
          name: 'BETA POLYCLINIC PHARMACY',
          address: 'Beta Polyclinic, Thalassery.',
          phone: 'Tel - 0490-2325049',
          mobile: 'Mob - 9497172662',
          dlNo: 'D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.',
          memoTitle: 'BETA POLYCLINIC PHARMACY',
          city: 'THALASSERY'
        };
      }
    } catch (e) {}
    return {
      headerStyle: 'FULL_PHARMACY', // 'FULL_PHARMACY' or 'COMPACT_MEMO'
      name: 'BETA PHARMACY',
      address: 'Sadanada Pai Road, Chirakkara, Thalassery.',
      phone: 'Tel - 0490-2325049',
      mobile: 'Mob - 9497172662',
      dlNo: 'D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.',
      memoTitle: 'CASH MEMO',
      city: 'THALASSERY'
    };
  });

  const handleSelectBranch = (branchId) => {
    const found = AVAILABLE_BRANCHES.find(b => b.id === branchId);
    if (!found) return;
    setActiveBranch(found);
    try {
      localStorage.setItem('beta_pharma_branch_id', found.id);
      // Load branch-specific store configuration
      const branchCfg = localStorage.getItem('beta_pharma_store_config_' + found.id);
      if (branchCfg) {
        setStoreConfig(JSON.parse(branchCfg));
      } else if (found.id === 'POLYCLINIC') {
        setStoreConfig({
          headerStyle: 'COMPACT_MEMO',
          name: 'BETA POLYCLINIC PHARMACY',
          address: 'Beta Polyclinic, Thalassery.',
          phone: 'Tel - 0490-2325049',
          mobile: 'Mob - 9497172662',
          dlNo: 'D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.',
          memoTitle: 'BETA POLYCLINIC PHARMACY',
          city: 'THALASSERY'
        });
      } else {
        setStoreConfig({
          headerStyle: 'FULL_PHARMACY',
          name: 'BETA PHARMACY',
          address: 'Sadanada Pai Road, Chirakkara, Thalassery.',
          phone: 'Tel - 0490-2325049',
          mobile: 'Mob - 9497172662',
          dlNo: 'D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.',
          memoTitle: 'CASH MEMO',
          city: 'THALASSERY'
        });
      }
      // Load branch-specific bill sequence
      // Load branch-specific held bills
      try {
        const branchHeld = JSON.parse(localStorage.getItem(`beta_pharma_held_bills_${found.id}`) || '[]');
        setHeldBills(branchHeld);
      } catch (e) {
        setHeldBills([]);
      }
      const branchSeqKey = `beta_pharma_last_bill_no_${found.id}`;
      const nextBillForBranch = localStorage.getItem(branchSeqKey) || '000001';
      setBillNo(nextBillForBranch);
    } catch (e) {}
  };

  // First-Time Setup & Onboarding Wizard State (Counter Billing only; never in Admin HQ)
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(() => {
    if (COUNTER_ONLY_MODE) return false;
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

  const handleCompleteSetup = async ({ branch, counter, cashier, catalogType, importedMeds, restoredMeds, restoredBills }) => {
    if (branch) {
      handleSelectBranch(branch.id);
    }

    if (cashier) {
      const newShift = {
        shiftId: 'SHIFT-' + Date.now().toString().slice(-6),
        staffName: cashier,
        counter: counter || 'Counter 01',
        startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        startTimestamp: Date.now(),
        openingFloat: 2000
      };
      setActiveShift(newShift);
      try {
        localStorage.setItem('beta_pharma_active_shift', JSON.stringify(newShift));
      } catch (e) {}
      setStaffList(prev => prev.includes(cashier) ? prev : [...prev, cashier]);
    }

    if (restoredMeds && restoredMeds.length > 0) {
      setMedicines(restoredMeds);
      if (restoredBills && restoredBills.length > 0) {
        setRecentBills(restoredBills);
      }
    } else if (importedMeds && importedMeds.length > 0) {
      const importResult = await handleImportMedicines(importedMeds, 'replace', branch?.stockKey || 'stock_shop1');
      if (!importResult?.success) return importResult;
    }
    try {
      localStorage.setItem('beta_pharma_setup_completed', 'true');
    } catch (e) {}
    return { success: true };
  };

  const handleImportMedicines = async (newRecords, mode = 'merge', requestedStockKey = null) => {
    if (!Array.isArray(newRecords) || newRecords.length === 0) {
      return { success: false, error: 'No medicine records were supplied.' };
    }

    const targetStockKey = requestedStockKey || activeBranch?.stockKey || 'stock_shop1';
    const importBranchId = targetStockKey === 'stock_shop2' ? 'POLYCLINIC' : 'MAIN';
    const masterMap = new Map(initialMedicines.map(m => [String(m.code || '').trim().toUpperCase(), m]));
    const currentMap = new Map(medicines.map(m => [String(m.code || '').trim().toUpperCase(), m]));

    const prepareRecord = (rec) => {
      const code = String(rec.code || '').trim().toUpperCase();
      if (!code) return null;
      const existing = currentMap.get(code);
      const master = masterMap.get(code);
      const importedStock = Number(rec.stock ?? rec[targetStockKey] ?? 0);
      const safeStock = Number.isFinite(importedStock) ? importedStock : 0;
      const descriptiveBase = existing || master || {};

      return {
        ...descriptiveBase,
        ...rec,
        code,
        name: rec.name || descriptiveBase.name || '',
        company: typeof rec.company === 'string' ? rec.company : (descriptiveBase.company || ''),
        rack: rec.rack || descriptiveBase.rack || '',
        mrp: Number.isFinite(Number(rec.mrp)) ? Number(rec.mrp) : Number(descriptiveBase.mrp || 0),
        // Imported stock belongs only to the branch selected for this machine.
        stock: safeStock,
        [targetStockKey]: safeStock,
        stock_shop1: targetStockKey === 'stock_shop1' ? safeStock : Number(existing?.stock_shop1 || 0),
        stock_shop2: targetStockKey === 'stock_shop2' ? safeStock : Number(existing?.stock_shop2 || 0),
        // Replace only this branch's batches. A Main-shop import must never erase
        // Polyclinic batches (and vice versa). If the snapshot has no batch
        // evidence, stale batches are removed only for the imported branch.
        batches: replaceBranchBatches(existing?.batches, rec.batches, importBranchId),
        isImported: true
      };
    };

    const prepared = newRecords.map(prepareRecord).filter(Boolean);
    const preparedMap = new Map(prepared.map(m => [m.code, m]));
    const updated = mode === 'replace'
      ? [
          ...prepared,
          ...medicines
            .filter(m => !preparedMap.has(String(m.code || '').trim().toUpperCase()))
            .map(m => preserveOtherBranchRecord(m, targetStockKey, importBranchId))
            .filter(Boolean)
        ]
      : [
          ...prepared.filter(m => !currentMap.has(m.code)),
          ...medicines.map(m => preparedMap.get(String(m.code || '').trim().toUpperCase()) || m)
        ];

    if (updated.length === 0) return { success: false, error: 'No valid coded medicines were found.' };

    // Commit to durable local storage first. The UI and cloud are updated only
    // after this succeeds, preventing a false success message and partial import.
    let idbResult;
    try {
      idbResult = await idbCacheMedicines(updated, { replace: true });
    } catch (err) {
      return { success: false, error: err.message || 'IndexedDB write failed.' };
    }
    if (!idbResult?.success) {
      return { success: false, error: idbResult?.error || 'IndexedDB write failed.' };
    }

    const trulyAdded = updated.filter(m => m.isImported && !masterMap.has(m.code));
    try {
      localStorage.setItem('beta_pharma_added_meds', JSON.stringify(trulyAdded));
    } catch (err) {
      console.warn('[STORAGE_WARNING] Could not cache added medicine index:', err);
    }
    medicinesRef.current = updated;
    setMedicines(updated);

    if (!COUNTER_ONLY_MODE && import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true') {
      uploadMedicinesCatalogToSupabase(updated)
        .then(result => {
          if (!result?.success) console.warn('Cloud catalog sync is incomplete; the verified local import remains authoritative.', result);
        })
        .catch(err => console.warn('Cloud catalog sync failed after the verified local import:', err));
    }

    return { success: true, count: updated.length, stockKey: targetStockKey };
  };

  // Instant 1-Click Master Catalog Restoration (Reverts to full 24,665 real items)
  const handleResetMasterCatalog = async () => {
    try {
      localStorage.removeItem('beta_pharma_added_meds');
      localStorage.removeItem('beta_pharma_med_overrides');
    } catch (_) {}
    await idbClearMedicines();
    const idbResult = await idbCacheMedicines(initialMedicines);
    setMedicines(initialMedicines);
    if (!idbResult || !idbResult.success) {
      console.error('[STORAGE_ERROR] Failed to persist restored master catalog to IndexedDB:', idbResult?.error);
      alert(`Master Catalog Restored in memory, but local database persistence failed: ${idbResult?.error || 'Write error'}.`);
    } else {
      alert('✓ Master Catalog Restored: All 24,665 real medicines loaded successfully!');
    }
  };

  // Auto-Repair corrupted names while keeping imported stock counts
  const handleAutoRepairMedicines = async () => {
    const repaired = autoRepairCorruptedMedicines(medicines);
    try {
      localStorage.removeItem('beta_pharma_added_meds');
      localStorage.removeItem('beta_pharma_med_overrides');
    } catch (_) {}
    setMedicines(repaired);
    const idbResult = await idbCacheMedicines(repaired);
    if (!idbResult || !idbResult.success) {
      console.error('[STORAGE_ERROR] Failed to persist repaired catalog to IndexedDB:', idbResult?.error);
      alert(`Auto-repair applied to memory, but local database persistence failed: ${idbResult?.error || 'Write error'}.`);
    } else {
      alert('✓ Catalog names repaired. Stock, batch numbers, and expiry dates were preserved exactly; unresolved inventory still requires review.');
    }
  };

  // Staff Shift Session & Reconciliation State
  const [staffList, setStaffList] = useState(getInitialStaffList);
  const [activeShift, setActiveShift] = useState(getInitialActiveShift);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [targetIncomingStaff, setTargetIncomingStaff] = useState(null);
  const [handoverNotice, setHandoverNotice] = useState(null);

  const handleOpenShiftHandover = (preselectedIncomingStaff) => {
    if (COUNTER_ONLY_MODE) return;
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
    if (COUNTER_ONLY_MODE) return false;
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
    if (COUNTER_ONLY_MODE) return;
    setIsTerminalLocked(true);
    try {
      localStorage.removeItem('beta_pharma_terminal_unlocked');
    } catch (e) {}
  };

  // Live Cloud Storage Metric Watchdog (Supabase 500 MB Free Tier)
  const [cloudMetrics, setCloudMetrics] = useState({ verified: false, usedMB: null, maxMB: null, pctUsed: null, isWarningThreshold: false });
  const [isCloudPurgeModalOpen, setIsCloudPurgeModalOpen] = useState(false);

  const refreshCloudMetrics = () => {
    getCloudStorageEstimate().then(m => {
      if (m) setCloudMetrics(m);
    }).catch(err => {
      console.warn('[STORAGE_NOTE] Failed to fetch cloud storage metrics:', err);
    });
  };

  // 2+ Years Local Disk Backup Hub (730+ Days Hard Drive Retention)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleRestoreBackupData = ({ restoredMeds, restoredBills, restoredOverrides, restoredBranch, restoredStoreConfig }) => {
    if (restoredMeds && restoredMeds.length > 0) {
      setMedicines(restoredMeds);
      idbCacheMedicines(restoredMeds, { replace: true }).then(res => {
        if (!res || !res.success) {
          console.error('[STORAGE_ERROR] Failed to persist restored medicines to IndexedDB:', res?.error);
        }
      }).catch(err => {
        console.error('[STORAGE_ERROR] IndexedDB write exception during restore:', err);
      });
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
        if (activeBranch?.id) {
          localStorage.setItem(`beta_pharma_med_overrides_${activeBranch.id}`, JSON.stringify(restoredOverrides));
        }
      } catch (e) {}
    }
    if (restoredStoreConfig && restoredStoreConfig.name) {
      setStoreConfig(restoredStoreConfig);
      try {
        localStorage.setItem('beta_pharma_store_config', JSON.stringify(restoredStoreConfig));
        if (activeBranch?.id) {
          localStorage.setItem(`beta_pharma_store_config_${activeBranch.id}`, JSON.stringify(restoredStoreConfig));
        }
      } catch (e) {}
    }
    if (restoredBranch && restoredBranch.id) {
      setActiveBranch(restoredBranch);
    }
  };

  // Medicines Catalog (Dynamic state loaded with persistent localStorage deltas)
  const [medicines, setMedicines] = useState(getInitialMedicines);
  const medicinesRef = useRef(medicines);
  useEffect(() => { medicinesRef.current = medicines; }, [medicines]);
  const [isCatalogHydrating, setIsCatalogHydrating] = useState(true);
  const [isUnverifiedReturnsOpen, setIsUnverifiedReturnsOpen] = useState(false);
  const [isNewMedModalOpen, setIsNewMedModalOpen] = useState(false);

  // Security & Password Authorization Subsystem
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
  const [heldBills, setHeldBills] = useState(() => {
    try {
      const bId = localStorage.getItem('beta_pharma_branch_id') || 'MAIN';
      const saved = localStorage.getItem(`beta_pharma_held_bills_${bId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      if (activeBranch?.id) {
        localStorage.setItem(`beta_pharma_held_bills_${activeBranch.id}`, JSON.stringify(heldBills));
      }
    } catch (e) {}
  }, [heldBills, activeBranch?.id]);

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

  const isCompletingBillRef = useRef(false);
  const isReprintingRef = useRef(false);

  // Direct TVS MSP 250 Native Spooler Print Engine (legacy 32-line ESC/P form)
  const executeTvsPrint = async (billData, isReprint = false) => {
    const currentBill = { ...billData, storeInfo: storeConfig };
    if (window.electronAPI?.isElectron) {
      try {
        const { generateTvsEscPosStream, formatTvsBillLines } = await import('./utils/tvsPrinterEngine');
        const escpBytes = Array.from(generateTvsEscPosStream(currentBill));
        const rawText = formatTvsBillLines(currentBill).join('\r\n') + '\r\n';
        const result = await window.electronAPI.printRawTvs({
          printerName: 'TVS MSP 250 Star',
          rawBytes: escpBytes,
          rawText: rawText
        });
        if (!result?.success) {
          throw new Error(result?.error || 'Windows spooler did not confirm the print job.');
        }
        if (currentBill.id) await idbMarkPrintJob(currentBill.id, { success: true });
        console.log(`[PRINT] Confirmed ${isReprint ? 'reprint' : 'bill'} #${currentBill.billNo} sent to TVS MSP 250`);
        return { success: true };
      } catch (e) {
        console.error('[PRINT] Instant raw TVS print failed:', e);
        if (currentBill.id) await idbMarkPrintJob(currentBill.id, { success: false, error: e.message || 'Printer error' });
        return { success: false, error: e.message || 'Printer error' };
      }
    } else {
      window.print();
      return { success: true, browserDialog: true };
    }
  };

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
    if (!isCounterOnlyPageAllowed(page)) {
      alert('This unfinished management workflow is disabled in the counter-only safety build.');
      return;
    }
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
      if (!isCounterOnlyPageAllowed(page)) {
        setActivePage('billing');
        return;
      }
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
  const handleReprintLastBill = async () => {
    if (isReprintingRef.current) return;
    isReprintingRef.current = true;

    try {
      let candidateBill = null;
      if (recentBills && recentBills.length > 0) {
        candidateBill = recentBills.find(b => (b.branchId || 'MAIN') === (activeBranch?.id || 'MAIN')) || null;
      } else {
        try {
          const stored = JSON.parse(localStorage.getItem('beta_pharma_recent_bills') || '[]');
          if (stored && stored.length > 0) {
            candidateBill = stored[0];
            setRecentBills(stored);
          }
        } catch (_) {}
      }

      if (!candidateBill) {
        alert('No recently completed bills available in recall memory to reprint.\nPlease complete a bill first.');
        return;
      }

      const reprintPayload = {
        ...candidateBill,
        isReprint: true,
        reprintTimestamp: Date.now()
      };

      // 1. Show the bill modal on screen so user SEES the previous bill!
      setCompletedBillData(reprintPayload);
      setIsReprintMode(true);
      setIsReceiptOpen(true);

      // 2. Automatically print it to TVS MSP 250 printer!
      await executeTvsPrint(reprintPayload, true);
    } finally {
      setTimeout(() => {
        isReprintingRef.current = false;
      }, 1500);
    }
  };

  // Step 5: Robust Startup Hydration from local IndexedDB (Durable Inventory Restoration)
  useEffect(() => {
    let isMounted = true;

    const hydrateFromStorage = async () => {
      let hydrationSuccess = false;
      try {
        const db = await openPharmaDB();
        if (!db) {
          console.error('[STORAGE] Local IndexedDB unavailable on this device.');
          alert('CRITICAL DATABASE ERROR: Local database storage (IndexedDB) is inaccessible. Billing has been locked to prevent unrecorded transactions and data loss.');
          if (isMounted) setIsCatalogHydrating(true);
          return;
        }

        const isInit = await idbIsInitialized();

        if (isInit) {
          // EXISTING INSTALLATION: Authoritative inventory must be loaded from IndexedDB
          const count = await idbGetMedicinesCount();
          if (count > 0) {
            const saved = await idbGetCachedMedicines();
            if (saved && saved.length > 0 && isMounted) {
              // Never mutate transactional batch/expiry data during startup.
              // Missing values remain visible for explicit reconciliation.
              setMedicines(saved);
              // Re-sync localStorage cache with authoritative IndexedDB state
              try {
                const overrides = {};
                for (const m of saved) {
                  if (m.code) overrides[m.code] = m;
                }
                localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
              } catch (_) {}
              console.log(`[STORAGE] Successfully hydrated ${saved.length} medicines from local IndexedDB.`);
              hydrationSuccess = true;
            }
          } else {
            // Live inventory store is 0 on an already initialized system! (Corruption or missing data)
            // FAIL CLOSED: NEVER silently seed bundled opening stock over potentially lost live inventory!
            console.error('[STORAGE] System is initialized but medicines catalog is empty.');
            alert('CRITICAL INVENTORY ALERT: Local database is marked initialized, but the medicine catalog is empty. Automatic baseline reseeding has been BLOCKED to protect historical inventory records. Please restore from daily backup or re-import catalog.');
            if (isMounted) setIsCatalogHydrating(true);
            return;
          }
        } else {
          // GENUINELY FRESH INSTALLATION: Seed baseline catalog once and mark initialized in IndexedDB
          console.log(`[STORAGE] Fresh installation detected. Initializing IndexedDB with ${initialMedicines.length} bundled catalogue items.`);
          await idbCacheMedicines(initialMedicines);
          await idbSetInitialized({ seededItems: initialMedicines.length });
          if (isMounted) {
            setMedicines(initialMedicines);
          }
          hydrationSuccess = true;
        }

        // Reconcile bill number sequence against authoritative stored bills in IndexedDB
        try {
          const canonicalBills = await idbGetAllBills();
          if (isMounted) {
            canonicalBills.sort((a, b) => String(b.createdAt || `${b.date} ${b.time}`).localeCompare(String(a.createdAt || `${a.date} ${a.time}`)));
            setRecentBills(canonicalBills);
          }
          const maxBill = await idbGetMaxBillNo(activeBranch?.id || 'MAIN');
          if (maxBill > 0) {
            const currentBillNum = parseInt(billNo, 10) || 0;
            if (maxBill >= currentBillNum) {
              const nextSeq = (maxBill + 1).toString().padStart(6, '0');
              setBillNo(nextSeq);
              localStorage.setItem('beta_pharma_next_bill_no', nextSeq);
              console.log(`[STORAGE] Reconciled bill sequence from IndexedDB: advanced to ${nextSeq}`);
            }
          }
        } catch (seqErr) {
          console.warn('[STORAGE] Bill sequence reconciliation note:', seqErr);
        }

      } catch (err) {
        console.error('[STORAGE] Error during startup database hydration:', err);
        alert(`CRITICAL STORAGE ERROR: Failed to load local database inventory (${err.message}). Billing has been locked to prevent unrecorded transactions.`);
        if (isMounted) setIsCatalogHydrating(true);
        return;
      } finally {
        if (isMounted && hydrationSuccess) {
          setIsCatalogHydrating(false);
        }
      }

      // Check if cloud catalog has medicines to auto-load on new device (ONLY for uninitialized devices!)
      try {
        const isInitCheck = await idbIsInitialized();
        if (!isInitCheck) {
          const res = await fetchMedicinesCatalogFromSupabase();
          if (res && res.success && res.medicines && res.medicines.length > 0) {
            console.log(`Auto-hydrating ${res.medicines.length} medicines from Supabase cloud catalog!`);
            handleImportMedicines(res.medicines, 'replace');
          }
        }
      } catch (err) {
        console.warn('Cloud catalog auto-hydration note:', err);
      }
    };

    hydrateFromStorage();
    refreshLiveCloudBills();

    return () => { isMounted = false; };
  }, []);

  // Step 6: Multi-Device Live Cloud Bills Synchronization
  const refreshLiveCloudBills = async () => {
    try {
      const res = await fetchLiveCloudSalesBills(300);
      if (res && res.success && res.bills && res.bills.length > 0) {
        setRecentBills(prev => {
          const existingMap = new Map(prev.map(b => [String(b.billNo).trim(), b]));
          for (const cb of res.bills) {
            if (!existingMap.has(String(cb.billNo).trim())) {
              existingMap.set(String(cb.billNo).trim(), cb);
            }
          }
          const merged = Array.from(existingMap.values()).sort((a, b) => {
            return (parseInt(b.billNo, 10) || 0) - (parseInt(a.billNo, 10) || 0);
          });
          return merged;
        });
      }
    } catch (err) {
      console.warn('Live cloud bills pull note:', err);
    }
  };

  // Step 6B: Pull recent medicine inventory deltas from Supabase (Bidirectional Admin ↔ POS Sync)
  const refreshLiveMedicineDeltas = async () => {
    try {
      const targetBranchId = activeBranch?.id || 'MAIN';
      const targetStockKey = activeBranch?.stockKey || 'stock_shop1';
      const res = await fetchLiveMedicineDeltas(targetBranchId, 100);
      if (res && res.success && res.deltas && res.deltas.length > 0) {
        setMedicines(prev => {
          const copy = [...prev];
          const map = new Map(copy.map((m, idx) => [String(m.code || '').trim().toUpperCase(), idx]));
          const nameMap = new Map(copy.map((m, idx) => [String(m.name || '').trim().toLowerCase(), idx]));
          let modified = false;

          for (const delta of res.deltas) {
            const codeKey = String(delta.code || '').trim().toUpperCase();
            const nameKey = String(delta.name || '').trim().toLowerCase();
            const existingIdx = map.has(codeKey) ? map.get(codeKey) : (nameMap.has(nameKey) ? nameMap.get(nameKey) : -1);

            if (existingIdx !== -1 && existingIdx !== undefined) {
              const current = copy[existingIdx];
              const currentTs = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
              const deltaTs = delta.updatedAt ? new Date(delta.updatedAt).getTime() : 0;
              if (deltaTs >= currentTs) {
                const incomingStock = delta.stock !== undefined ? delta.stock : (delta[targetStockKey] !== undefined ? delta[targetStockKey] : current.stock);
                copy[existingIdx] = {
                  ...current,
                  name: delta.name || current.name,
                  company: typeof delta.company === 'string' ? delta.company : current.company,
                  mrp: delta.mrp || current.mrp,
                  rack: delta.rack || current.rack,
                  schedule: delta.schedule || current.schedule,
                  [targetStockKey]: incomingStock,
                  stock: incomingStock,
                  stock_shop1: delta.stock_shop1 !== undefined ? delta.stock_shop1 : current.stock_shop1,
                  stock_shop2: delta.stock_shop2 !== undefined ? delta.stock_shop2 : current.stock_shop2,
                  branchId: delta.branchId || targetBranchId,
                  batches: (Array.isArray(delta.batches) && delta.batches.length > 0) ? delta.batches : (current.batches || []),
                  updatedAt: delta.updatedAt
                };
                modified = true;
              }
            } else if (delta.code && delta.name) {
              const incomingStock = delta.stock !== undefined ? delta.stock : (delta[targetStockKey] !== undefined ? delta[targetStockKey] : 0);
              copy.unshift({
                code: delta.code,
                name: delta.name,
                company: delta.company || '',
                mrp: Number(delta.mrp || 0),
                rack: delta.rack || '',
                schedule: delta.schedule || '',
                [targetStockKey]: incomingStock,
                stock: incomingStock,
                stock_shop1: delta.stock_shop1 || 0,
                stock_shop2: delta.stock_shop2 || 0,
                branchId: delta.branchId || targetBranchId,
                batches: delta.batches || [],
                updatedAt: delta.updatedAt
              });
              modified = true;
            }
          }

          if (modified) {
            idbCacheMedicines(copy).then(res => {
              if (!res || !res.success) {
                console.error('[STORAGE_ERROR] Failed to persist pulled medicine deltas to IndexedDB:', res?.error);
              }
            }).catch(err => {
              console.error('[STORAGE_ERROR] IndexedDB exception during deltas pull:', err);
            });
            return copy;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Live medicine deltas pull note:', err);
    }
  };

  // Re-fetch live cloud bills & medicine inventory deltas whenever entering Admin or Sales Register
  useEffect(() => {
    if (activePage === 'admin' || activePage === 'sales-register' || activePage === 'product-master') {
      refreshLiveCloudBills();
      refreshLiveMedicineDeltas();
    }
  }, [activePage]);

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
      if (!COUNTER_ONLY_MODE && (e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
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
    if (COUNTER_ONLY_MODE) return undefined;
    refreshCloudMetrics();
    const interval = setInterval(refreshCloudMetrics, 60000);
    return () => clearInterval(interval);
  }, [recentBills.length]);

  // Automated 2+ Years Daily Backup Snapshot Engine (Local Hard Drive)
  useEffect(() => {
    if (medicines && medicines.length > 0) {
      saveDailyBackupSnapshot(medicines, recentBills, activeBranch, activeShift).then(result => {
        if (!result?.success) console.error('[BACKUP] Daily snapshot was not committed:', result?.error || 'Unknown error');
      });
    }
  }, [activeShift, activeBranch, recentBills.length, medicines.length]);

  // Add new medicine to master catalog with IndexedDB & Supabase cloud sync
  const handleAddNewMedicine = async (newMed) => {
    const code = String(newMed.code || `NEW-${Date.now().toString(36).toUpperCase()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()}`);
    if (medicinesRef.current.some(m => m.code === code)) {
      return { success: false, error: `Medicine code ${code} already exists.` };
    }
    const targetStockKey = activeBranch?.stockKey || 'stock_shop1';
    const targetBranchId = activeBranch?.id || 'MAIN';
    const sourceStock = Number(newMed.stock ?? newMed[targetStockKey] ?? 0);
    const stampedMed = {
      ...newMed,
      code,
      stock: sourceStock,
      [targetStockKey]: sourceStock,
      batches: (newMed.batches || []).map(batch => ({ ...batch, branch_id: targetBranchId })),
      updatedAt: new Date().toISOString()
    };
    const idbResult = await idbAddMedicine(stampedMed);
    if (!idbResult?.success) {
      alert(`Medicine was not added: ${idbResult?.error || 'Database write failed.'}`);
      return { success: false, error: idbResult?.error || 'Database write failed.' };
    }
    medicinesRef.current = [stampedMed, ...medicinesRef.current];
    setMedicines(medicinesRef.current);
    try {
      const added = JSON.parse(localStorage.getItem('beta_pharma_added_meds') || '[]');
      added.unshift(stampedMed);
      localStorage.setItem('beta_pharma_added_meds', JSON.stringify(added));
    } catch (e) {
      console.error('Error saving added medicine to localStorage', e);
    }
    alert(`Success! "${newMed.name}" added to Product Master in RACK ${newMed.rack}.`);
    syncEngine.recordMedicineDelta(stampedMed);
    return { success: true, medicine: stampedMed };
  };

  // Update existing medicine in master catalog with IndexedDB & Supabase cloud sync
  const handleUpdateMedicine = async (updatedMed) => {
    const stampedMed = {
      ...updatedMed,
      updatedAt: new Date().toISOString()
    };
    const idbResult = await idbUpdateMedicines([stampedMed]);
    if (!idbResult?.success) {
      console.error('[STORAGE_ERROR] Failed to persist updated medicine to IndexedDB:', idbResult?.error);
      alert(`Update cancelled: ${idbResult?.error || 'Database write failed.'}`);
      return { success: false, error: idbResult?.error || 'Database write failed.' };
    }
    const committed = medicinesRef.current.map(m => (m.code === stampedMed.code ? stampedMed : m));
    medicinesRef.current = committed;
    setMedicines(committed);
    try {
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const key = stampedMed.code || stampedMed.name.toLowerCase();
      overrides[key] = stampedMed;
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.error('Error saving medicine override to localStorage', e);
    }
    syncEngine.recordMedicineDelta(stampedMed);
    return { success: true };
  };

  // Update stock when Purchase Invoice is saved with Batch increments, IndexedDB & Cloud Sync
  const handleUpdateCatalogStock = async (purchaseItems, purchaseVoucher) => {
    if (!purchaseItems || purchaseItems.length === 0) return { success: false, error: 'No purchase items.' };
    const targetBranchId = activeBranch?.id || 'MAIN';
    const targetStockKey = activeBranch?.stockKey || 'stock_shop1';

    const validationErrors = [];
    if (!String(purchaseVoucher?.invoiceNo || '').trim()) validationErrors.push('supplier invoice number');
    if (!String(purchaseVoucher?.supplierName || '').trim()) validationErrors.push('supplier name');
    purchaseItems.forEach((item, index) => {
      const label = `Item ${index + 1} (${item.name || item.medCode || 'unnamed'})`;
      const existing = medicines.find(m => m.code === item.medCode || (item.name && m.name.toLowerCase() === item.name.toLowerCase()));
      if (!existing && !String(item.medCode || '').trim()) validationErrors.push(`${label}: product code`);
      if (!String(item.name || existing?.name || '').trim()) validationErrors.push(`${label}: medicine name`);
      if (!String(item.batch || '').trim()) validationErrors.push(`${label}: batch number`);
      if (!isExpiryValid(normalizeExpiry(item.exp))) validationErrors.push(`${label}: valid expiry (MM/YY)`);
      if (!(Number(item.mrp) > 0)) validationErrors.push(`${label}: MRP`);
      if (!(Number(item.totalUnits || item.billedPacks || item.qty) > 0)) validationErrors.push(`${label}: quantity`);
    });
    if (validationErrors.length > 0) {
      alert(`Purchase was not saved. Required source data is missing:\n\n- ${validationErrors.join('\n- ')}\n\nCorrect the invoice fields; the POS will not invent regulated stock data.`);
      return { success: false, errors: validationErrors };
    }

    const updated = [...medicines];
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      const modifiedMeds = [];

      for (const item of purchaseItems) {
        const idx = updated.findIndex(m => m.code === item.medCode || m.name.toLowerCase() === item.name.toLowerCase());
        const unitsToAdd = Number(item.totalUnits || item.billedPacks || item.qty || 0);

        if (idx !== -1) {
          const med = { ...updated[idx] };
          const existingBatches = med.batches ? [...med.batches] : [];

          // Traceability check: Do not merge distinct batches or supplier purchase records merely because product code matches!
          // Only combine if it is the EXACT same batch from the same supplier and invoice!
          const bIdx = existingBatches.findIndex(b => {
            const batchMatch = String(b.batch_no || b.batch || '').trim().toUpperCase() === String(item.batch || '').trim().toUpperCase();
            const batchBranch = b.branch_id || 'MAIN';
            const branchMatch = batchBranch === targetBranchId;
            const invMatch = !purchaseVoucher?.invoiceNo || !b.invoice_no || String(b.invoice_no).trim() === String(purchaseVoucher.invoiceNo).trim();
            const suppMatch = !purchaseVoucher?.supplierName || !b.supplier_name || String(b.supplier_name).trim().toLowerCase() === String(purchaseVoucher.supplierName).trim().toLowerCase();
            return batchMatch && branchMatch && invMatch && suppMatch;
          });

          if (bIdx !== -1) {
            const b = existingBatches[bIdx];
            const oldQty = b.qty !== undefined ? b.qty : (b.stock !== undefined ? b.stock : 0);
            const newQty = oldQty + unitsToAdd;
            existingBatches[bIdx] = {
              ...b,
              branch_id: targetBranchId,
              exp_date: normalizeExpiry(item.exp),
              mrp: Number(item.mrp),
              purchase_price: item.ptr || item.rate || b.purchase_price || 0,
              qty: newQty,
              stock: newQty
            };
          } else {
            // Keep distinct batch record with full supplier, invoice, price, and branch traceability
            existingBatches.unshift({
              batch_no: String(item.batch).trim(),
              batch: String(item.batch).trim(),
              exp_date: normalizeExpiry(item.exp),
              mrp: Number(item.mrp),
              purchase_price: Number(item.ptr || item.rate || 0),
              supplier_name: String(purchaseVoucher.supplierName).trim(),
              supplier_id: String(purchaseVoucher?.supplierId || item.supplier_id || '').trim(),
              invoice_no: String(purchaseVoucher?.invoiceNo || item.invoice_no || '').trim(),
              invoice_date: String(purchaseVoucher?.invoiceDate || item.invoice_date || new Date().toISOString().slice(0, 10)),
              branch_id: targetBranchId,
              per: Number(item.packSize || med.per || 1),
              qty: unitsToAdd,
              initial_qty: unitsToAdd,
              stock: unitsToAdd
            });
          }

          med.batches = existingBatches;
          med.stock = existingBatches
            .filter(b => (b.branch_id || 'MAIN') === targetBranchId)
            .reduce((acc, b) => acc + (parseInt(b.qty !== undefined ? b.qty : b.stock, 10) || 0), 0);
          if (targetStockKey === 'stock_shop1' || targetBranchId === 'MAIN') {
            med.stock_shop1 = med.stock;
          }
          if (targetStockKey === 'stock_shop2' || targetBranchId === 'POLYCLINIC') {
            med.stock_shop2 = med.stock;
          }
          med.branchId = targetBranchId;
          med.updatedAt = new Date().toISOString();
          updated[idx] = med;

          const key = med.code || med.name.toLowerCase();
          overrides[key] = med;
          modifiedMeds.push(med);
        } else {
          // New medicine received for this branch
          const newMed = {
            code: String(item.medCode).trim(),
            name: item.name,
            company: typeof item.company === 'string' ? item.company : '', // Option B rule preserved!
            mrp: Number(item.mrp),
            rack: item.rack || '',
            schedule: item.schedule || '',
            branchId: targetBranchId,
            stock: unitsToAdd,
            [targetStockKey]: unitsToAdd,
            batches: [{
              batch_no: String(item.batch).trim(),
              batch: String(item.batch).trim(),
              exp_date: normalizeExpiry(item.exp),
              mrp: Number(item.mrp),
              purchase_price: Number(item.ptr || item.rate || 0),
              supplier_name: String(purchaseVoucher.supplierName).trim(),
              supplier_id: String(purchaseVoucher?.supplierId || item.supplier_id || '').trim(),
              invoice_no: String(purchaseVoucher?.invoiceNo || item.invoice_no || '').trim(),
              invoice_date: String(purchaseVoucher?.invoiceDate || item.invoice_date || new Date().toISOString().slice(0, 10)),
              branch_id: targetBranchId,
              qty: unitsToAdd,
              initial_qty: unitsToAdd,
              stock: unitsToAdd
            }],
            updatedAt: new Date().toISOString()
          };
          if (targetStockKey === 'stock_shop1' || targetBranchId === 'MAIN') {
            newMed.stock_shop1 = unitsToAdd;
          }
          if (targetStockKey === 'stock_shop2' || targetBranchId === 'POLYCLINIC') {
            newMed.stock_shop2 = unitsToAdd;
          }
          updated.unshift(newMed);
          modifiedMeds.push(newMed);
          overrides[newMed.code] = newMed;
        }
      }

    let persistenceResult;
    try {
      persistenceResult = await idbUpdateMedicines(modifiedMeds);
    } catch (err) {
      persistenceResult = { success: false, error: err.message };
    }
    if (!persistenceResult?.success) {
      const error = persistenceResult?.error || 'IndexedDB write failed';
      alert(`Purchase was not committed because local database persistence failed: ${error}`);
      return { success: false, error };
    }

    try {
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      localStorage.setItem(`beta_pharma_med_overrides_${targetBranchId}`, JSON.stringify(overrides));
      localStorage.setItem(`beta_pharma_last_operational_mutation_${targetBranchId}`, String(Date.now()));
    } catch (e) {
      console.warn('[STORAGE_WARNING] Purchase fallback cache was not updated:', e);
    }
    medicinesRef.current = updated;
    setMedicines(updated);

    await Promise.all(modifiedMeds.map(m => syncEngine.recordMedicineDelta(m)));

    if (purchaseVoucher) {
      await syncEngine.recordPurchaseInward({
        ...purchaseVoucher,
        branchId: targetBranchId
      });
    }
    return { success: true, modifiedCount: modifiedMeds.length };
  };

  // Delete individual batch from catalog and re-sum stock
  const handleDeleteBatch = async (medCodeOrName, batchNo) => {
    if (!confirm(`Are you sure you want to delete batch "${batchNo}"?`)) return;

    let modifiedMed = null;
    const targetBranchId = activeBranch?.id || 'MAIN';
    const targetStockKey = activeBranch?.stockKey || 'stock_shop1';
    const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');

    const updated = medicinesRef.current.map(m => {
      if (m.code === medCodeOrName || m.name.toLowerCase() === String(medCodeOrName).toLowerCase()) {
        const med = { ...m };
        const oldBatches = med.batches || [];
        const targetBatch = oldBatches.find(b => b.batch_no === batchNo && (b.branch_id || 'MAIN') === targetBranchId);
        if (!targetBatch) return m;
        const batchQty = targetBatch ? (targetBatch.qty !== undefined ? targetBatch.qty : (targetBatch.stock !== undefined ? targetBatch.stock : 0)) : 0;
        
        med.batches = oldBatches.filter(b => !(b.batch_no === batchNo && (b.branch_id || 'MAIN') === targetBranchId));
        med[targetStockKey] = Math.max(0, (med[targetStockKey] || 0) - batchQty);
        med.stock = med[targetStockKey];
        med.updatedAt = new Date().toISOString();
        
        modifiedMed = med;
        const key = med.code || med.name.toLowerCase();
        overrides[key] = med;
        return med;
      }
      return m;
    });

    if (modifiedMed) {
      const idbResult = await idbUpdateMedicines([modifiedMed]);
      if (!idbResult || !idbResult.success) {
        console.error('[STORAGE_ERROR] Failed to persist batch deletion to IndexedDB:', idbResult?.error);
        alert(`Batch was not deleted because local database persistence failed: ${idbResult?.error || 'Write error'}.`);
        return;
      }
      medicinesRef.current = updated;
      setMedicines(updated);
      try {
        localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
        localStorage.setItem(`beta_pharma_med_overrides_${targetBranchId}`, JSON.stringify(overrides));
        localStorage.setItem(`beta_pharma_last_operational_mutation_${targetBranchId}`, String(Date.now()));
      } catch (e) {}
      await syncEngine.recordMedicineDelta(modifiedMed);
    }
  };

  // Bulk purge historical dead batches (0 stock or expired > 180 days ago)
  const handlePurgeDeadBatches = async () => {
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

    const targetBranchId = activeBranch?.id || 'MAIN';
    const targetStockKey = activeBranch?.stockKey || 'stock_shop1';
    let totalPurged = 0;
    const modifiedMeds = [];
    const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');

    const updated = medicinesRef.current.map(med => {
      if (!med.batches || med.batches.length === 0) return med;
      const keptBatches = med.batches.filter(b => {
        if ((b.branch_id || 'MAIN') !== targetBranchId) return true;
        const bStock = b.qty !== undefined ? b.qty : (b.stock !== undefined ? b.stock : 0);
        const days = parseDays(b.exp_date);
        const isDead = (bStock <= 0) || (days < -180);
        if (isDead) totalPurged++;
        return !isDead;
      });

      if (keptBatches.length !== med.batches.length) {
        const newStock = keptBatches
          .filter(b => (b.branch_id || 'MAIN') === targetBranchId)
          .reduce((acc, b) => acc + (b.qty !== undefined ? b.qty : (b.stock || 0)), 0);
        const newMed = {
          ...med,
          batches: keptBatches,
          [targetStockKey]: newStock,
          stock: newStock,
          updatedAt: new Date().toISOString()
        };
        const key = newMed.code || newMed.name.toLowerCase();
        overrides[key] = newMed;
        modifiedMeds.push(newMed);
        return newMed;
      }
      return med;
    });

    // Persist to IndexedDB and check the actual result
    const idbResult = modifiedMeds.length > 0 ? await idbUpdateMedicines(modifiedMeds) : { success: true };
    if (!idbResult || !idbResult.success) {
      console.error('[STORAGE_ERROR] Failed to persist purged catalog to IndexedDB:', idbResult?.error);
      alert(`Purge was not committed because local database persistence failed: ${idbResult?.error || 'IndexedDB write error'}.`);
      return;
    }

    medicinesRef.current = updated;
    setMedicines(updated);
    try {
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      localStorage.setItem(`beta_pharma_med_overrides_${targetBranchId}`, JSON.stringify(overrides));
      localStorage.setItem(`beta_pharma_last_operational_mutation_${targetBranchId}`, String(Date.now()));
    } catch (e) {}

    // Queue sync deltas for all modified medicines
    for (const m of modifiedMeds) {
      await syncEngine.recordMedicineDelta(m);
    }

    alert(`Successfully purged ${totalPurged} dead/obsolete batches from counter inventory and persisted to local database.`);
  };

  // Sales Return / Credit Note Handler: Restocks medicines to current branch and issues Credit Note
  const handleConfirmSalesReturn = async (returnData) => {
    const itemsToReturn = returnData?.returnedItems || returnData?.items || [];
    if (!returnData || itemsToReturn.length === 0) return;

    // Idempotency check: prevent duplicate restocking if user or modal double-submits
    const creditNoteId = returnData.creditNoteNo 
      ? `${activeBranch?.id || 'MAIN'}_${returnData.creditNoteNo}`
      : `CN-${returnData.originalBill?.billNo || Date.now()}`;
    try {
      const processedReturns = JSON.parse(localStorage.getItem('beta_pharma_processed_returns') || '{}');
      if (processedReturns[creditNoteId]) {
        console.warn(`[GUARD] Return ${creditNoteId} already processed. Skipping duplicate restock.`);
        alert(`Notice: Return ${returnData.creditNoteNo} has already been processed.`);
        return;
      }
    } catch (e) {}

    const targetBranchId = activeBranch?.id || 'MAIN';
    const targetStockKey = activeBranch?.stockKey || 'stock_shop1';
    const modifiedMeds = [];
    const unverifiedItems = [];

    // 1. Stage returned quantities and verify exact branch batches before any state mutation.
    const updated = medicinesRef.current.map(m => ({
      ...m,
      batches: m.batches ? m.batches.map(b => ({ ...b })) : []
    }));
    const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');

    itemsToReturn.forEach(retItem => {
        const targetBatchNo = String(retItem.batch || retItem.batch_no || '').trim().toUpperCase();
        const returnQty = parseInt(retItem.returnQty, 10) || 0;

        const idx = updated.findIndex(m => m.code === retItem.code || m.name.toLowerCase() === (retItem.name || '').toLowerCase());
        if (idx !== -1 && returnQty > 0 && targetBatchNo) {
          const med = { ...updated[idx] };
          const batches = med.batches || [];
          const bIdx = batches.findIndex(b =>
            String(b.batch_no || '').trim().toUpperCase() === targetBatchNo &&
            (b.branch_id || 'MAIN') === targetBranchId
          );

          if (bIdx !== -1 && isExpiryValid(normalizeExpiry(batches[bIdx].exp_date)) && !isBatchExpired(batches[bIdx].exp_date)) {
            // Batch verified in existing inventory
            const curBatchQty = parseInt(batches[bIdx].qty !== undefined ? batches[bIdx].qty : (batches[bIdx].stock || 0), 10);
            batches[bIdx].qty = curBatchQty + returnQty;
            batches[bIdx].stock = batches[bIdx].qty;
            med[targetStockKey] = batches
              .filter(batch => (batch.branch_id || 'MAIN') === targetBranchId)
              .reduce((sum, batch) => sum + Number(batch.qty ?? batch.stock ?? 0), 0);
            med.stock = med[targetStockKey];
            med.updatedAt = new Date().toISOString();
            updated[idx] = med;
            modifiedMeds.push(med);
            const key = med.code || med.name.toLowerCase();
            overrides[key] = med;
          } else {
            // Original batch cannot be verified in active catalog!
            // Do NOT fabricate a batch number or invent expiry information!
            // Clearly flag the return for review rather than silently adding stock to an assumed batch.
            unverifiedItems.push({
              name: retItem.name,
              code: retItem.code,
              batch: retItem.batch || 'UNSPECIFIED',
              qty: returnQty
            });
            retItem.unverifiedBatch = true;
            retItem.requiresDispositionReview = true;
          }
        } else {
          unverifiedItems.push({
            name: retItem.name,
            code: retItem.code,
            batch: retItem.batch || 'UNSPECIFIED',
            qty: returnQty
          });
          retItem.unverifiedBatch = true;
          retItem.requiresDispositionReview = true;
        }
    });

    if (unverifiedItems.length > 0) {
      returnData.hasUnverifiedBatches = true;
      returnData.unverifiedDetails = unverifiedItems;
      alert(`Sales Return Notice:\nThe following returned item(s) have unverified batch numbers not currently in active inventory:\n${unverifiedItems.map(u => `• ${u.name} (Batch: ${u.batch}, Qty: ${u.qty})`).join('\n')}\n\nThese items have been quarantined in durable local database storage and were NOT added to active batches.`);

      // Persist to durable IndexedDB quarantine store so records survive refreshes and cleared localStorage
      const quarantineRecord = {
        creditNoteNo: returnData.creditNoteNo || `CN-${Date.now()}`,
        date: billDate,
        customerName: returnData.customerName || returnData.originalBill?.patientName || 'CUSTOMER',
        unverifiedItems: [...unverifiedItems],
        status: 'QUARANTINED',
        store: activeBranch?.name || 'Beta Pharmacy',
        createdAt: new Date().toISOString()
      };
      try {
        const qRes = await idbSaveUnverifiedReturn(quarantineRecord);
        if (!qRes || !qRes.success) {
          console.error('[QUARANTINE PERSISTENCE FAILURE]', qRes?.error);
          alert(`Sales Return Failed: Failed to record quarantined return in local database storage (${qRes?.error || 'Database error'}).\n\nThe return transaction was NOT recorded to prevent data loss.`);
          return;
        }
      } catch (qErr) {
        console.error('[QUARANTINE EXCEPTION]', qErr);
        alert(`Sales Return Failed: Exception persisting quarantined return (${qErr.message}).\n\nThe return transaction was NOT recorded.`);
        return;
      }
    }

    // Persist modified medicines surgically to IndexedDB (only modified items, report failures)
    if (modifiedMeds.length > 0) {
      try {
        const idbRes = await idbUpdateMedicines(modifiedMeds);
        if (!idbRes || !idbRes.success) {
          console.error('IndexedDB return persistence error:', idbRes?.error);
          alert(`Sales Return Failed: Local database storage error while saving returned stock: ${idbRes?.error || 'Unknown error'}`);
          return;
        }
      } catch (err) {
        console.error('IndexedDB return persistence exception:', err);
        alert(`Sales Return Failed: Local database storage error while saving returned stock: ${err.message}`);
        return;
      }
    }

    medicinesRef.current = updated;
    setMedicines(updated);
    try {
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      localStorage.setItem(`beta_pharma_med_overrides_${targetBranchId}`, JSON.stringify(overrides));
      localStorage.setItem(`beta_pharma_last_operational_mutation_${targetBranchId}`, String(Date.now()));
    } catch (e) {
      console.warn('[STORAGE_WARNING] Return fallback cache failed:', e);
    }

    // Mark as processed in registry ONLY after successful execution
    try {
      const processedReturns = JSON.parse(localStorage.getItem('beta_pharma_processed_returns') || '{}');
      processedReturns[creditNoteId] = Date.now();
      localStorage.setItem('beta_pharma_processed_returns', JSON.stringify(processedReturns));
    } catch (e) {}

    // 2. Record Credit Note in recent bills memory & persistent credit note log
    const creditNoteBill = {
      billNo: returnData.creditNoteNo,
      date: billDate,
      time: currentTime,
      patientName: returnData.originalBill?.patientName || 'CUSTOMER',
      customerPhone: returnData.originalBill?.customerPhone || '',
      doctorName: returnData.originalBill?.doctorName || 'Self / OTC',
      paymentMode: (returnData.action === 'credit_note' || returnData.refundMode === 'CREDIT_NOTE') ? 'CREDIT NOTE' : 'CASH REFUND',
      items: itemsToReturn.map(it => {
        const itemUnitPrice = Number(it.unitPrice || (it.mrp / (it.per || 10)) || 0);
        return {
          code: it.code,
          name: it.name,
          batch: it.batch,
          exp: it.exp,
          qty: -Number(it.returnQty || 0),
          mrp: it.mrp,
          unitPrice: itemUnitPrice,
          totalValue: -(itemUnitPrice * Number(it.returnQty || 0))
        };
      }),
      grossTotal: -returnData.refundAmount,
      netPayable: -returnData.refundAmount,
      store: activeBranch?.name || 'Beta Pharmacy',
      isCreditNote: true,
      originalBillNo: returnData.originalBill?.billNo,
      returnReason: returnData.reason
    };

    setRecentBills(prev => {
      const updated = [creditNoteBill, ...prev];
      try {
        localStorage.setItem('beta_pharma_recent_bills', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const cnHistory = JSON.parse(localStorage.getItem('beta_pharma_credit_notes') || '[]');
      cnHistory.unshift(returnData);
      localStorage.setItem('beta_pharma_credit_notes', JSON.stringify(cnHistory));
    } catch (e) {
      console.warn('[STORAGE_WARNING] Credit-note fallback history failed:', e);
    }

    // Offline-first durable outbox for sales return / credit note
    await syncEngine.recordCreditNote({
      creditNoteNo: returnData.creditNoteNo,
      customerName: returnData.customerName || returnData.originalBill?.patientName || 'CUSTOMER',
      refundAmount: returnData.refundAmount,
      items: returnData.returnedItems,
      unverifiedItems: returnData.unverifiedDetails || [],
      status: returnData.hasUnverifiedBatches ? 'QUARANTINED' : 'PROCESSED',
      branchId: activeBranch?.id || 'MAIN'
    });
    for (const m of modifiedMeds) {
      await syncEngine.recordMedicineDelta(m);
    }

    const restockedCount = itemsToReturn.length - unverifiedItems.length;
    alert(`${returnData.creditNoteNo} issued. ${restockedCount} item line(s) restocked; ${unverifiedItems.length} quarantined for review. Refund/Credit Amount: ₹${returnData.refundAmount.toFixed(2)}`);
  };

  // Distributor Purchase Invoice Inward Handler: Updates shelf stock, adds batches, and logs payables
  const handleInwardDistributorInvoice = async (importedData) => {
    if (!importedData?.items?.length) return { success: false, error: 'No invoice items.' };

    // CSV quantity is packs; convert it once to physical units before using the
    // same verified purchase commit path as manual purchase entry.
    const purchaseItems = importedData.items.map(item => ({
      medCode: item.code,
      name: item.name,
      batch: item.batch,
      exp: item.exp || item.exp_date,
      wQty: Number(item.qty),
      packSize: Number(item.per),
      totalUnits: Number(item.qty) * Number(item.per),
      mrp: Number(item.mrp),
      ptr: Number(item.ptr),
      rate: Number(item.ptr),
      taxPercent: item.gstPercent ?? item.taxPercent ?? null
    }));
    const invoiceTotal = purchaseItems.reduce((sum, item) => sum + (item.ptr * item.wQty), 0);
    const voucher = {
      billNo: String(importedData.invoiceNo || '').trim(),
      invoiceNo: String(importedData.invoiceNo || '').trim(),
      supplier: String(importedData.distributor || '').trim(),
      supplierName: String(importedData.distributor || '').trim(),
      date: importedData.invoiceDate || billDate,
      invoiceDate: importedData.invoiceDate || billDate,
      amount: invoiceTotal,
      totalAmount: invoiceTotal,
      items: purchaseItems,
      status: 'UNPAID',
      source: 'INVOICE_IMPORT'
    };

    const result = await handleUpdateCatalogStock(purchaseItems, voucher);
    if (!result?.success) return result;

    try {
      const payables = JSON.parse(localStorage.getItem('beta_pharma_purchase_bills') || '[]');
      localStorage.setItem('beta_pharma_purchase_bills', JSON.stringify([voucher, ...payables]));
    } catch (err) {
      console.warn('[STORAGE_WARNING] Purchase payable fallback cache failed:', err);
    }

    alert(`Purchase Invoice Inwarded: ${purchaseItems.length} items and ${purchaseItems.reduce((sum, item) => sum + item.totalUnits, 0)} units committed.`);
    return { success: true };
  };

  // Multi-Store Inter-Branch Stock Transfer Handler
  const handleTransferStock = async ({ medCode, medicineName, fromBranchId, toBranchId, qty }) => {
    const fromBranch = AVAILABLE_BRANCHES.find(b => b.id === fromBranchId) || { name: fromBranchId, stockKey: fromBranchId === 'POLYCLINIC' ? 'stock_shop2' : 'stock_shop1' };
    const toBranch = AVAILABLE_BRANCHES.find(b => b.id === toBranchId) || { name: toBranchId, stockKey: toBranchId === 'POLYCLINIC' ? 'stock_shop2' : 'stock_shop1' };
    const fromShopKey = fromBranch.stockKey || 'stock_shop1';
    const toShopKey = toBranch.stockKey || 'stock_shop2';
    const fromBranchName = fromBranch.name || fromBranchId;
    const toBranchName = toBranch.name || toBranchId;

    const requestedQty = Number(qty);
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId || !(requestedQty > 0)) {
      return { success: false, error: 'Invalid branch transfer request.' };
    }
    const catalog = medicinesRef.current;
    const medIndex = catalog.findIndex(m => m.code === medCode || m.name.toLowerCase() === (medicineName || '').toLowerCase());
    if (medIndex < 0) return { success: false, error: 'Medicine not found.' };

    const source = catalog[medIndex];
    const transferPlan = planBatchTransfer(source, fromBranchId, toBranchId, requestedQty);
    if (!transferPlan.success) {
      const error = `${transferPlan.error} Source: ${fromBranchName}.`;
      alert(`Transfer not committed. ${error}`);
      return { success: false, error };
    }
    const { batches, allocations, fromTotal: newFrom, toTotal: newTo } = transferPlan;
    const transferredMed = {
      ...source,
      batches,
      [fromShopKey]: newFrom,
      [toShopKey]: newTo,
      stock: activeBranch?.id === fromBranchId ? newFrom : (activeBranch?.id === toBranchId ? newTo : source.stock),
      updatedAt: new Date().toISOString()
    };

    const persisted = await idbUpdateMedicines([transferredMed]);
    if (!persisted?.success) {
      const error = persisted?.error || 'Local database write failed.';
      alert(`Transfer was not committed: ${error}`);
      return { success: false, error };
    }

    const updated = [...catalog];
    updated[medIndex] = transferredMed;
    medicinesRef.current = updated;
    setMedicines(updated);
    try {
      const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
      overrides[transferredMed.code || transferredMed.name.toLowerCase()] = transferredMed;
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('[STORAGE_WARNING] Transfer fallback cache failed:', e);
    }

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
      qty: requestedQty,
      batchAllocations: allocations,
      status: 'COMPLETED',
      branchId: fromBranchId
    };

    try {
      const existing = JSON.parse(localStorage.getItem('beta_pharma_transfer_notes') || '[]');
      localStorage.setItem('beta_pharma_transfer_notes', JSON.stringify([transferRecord, ...existing]));
    } catch (e) {}

    // 3. Record in Delta Sync Engine (IndexedDB + Supabase)
    await syncEngine.recordStockTransfer(transferRecord);
    await syncEngine.recordMedicineDelta(transferredMed);

    return { success: true, transfer: transferRecord };
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
  const handleCompleteBill = async () => {
    if (items.length === 0) return;
    if (isCatalogHydrating) {
      alert("Please wait: Database inventory is currently loading. Bill finalization is temporarily paused to ensure accurate stock.");
      return;
    }
    if (isCompletingBillRef.current) {
      console.warn('[GUARD] Bill finalization in progress. Ignoring duplicate trigger.');
      return;
    }
    isCompletingBillRef.current = true;

    const releaseGuard = () => {
      isCompletingBillRef.current = false;
    };

    const targetStockKey = activeBranch?.stockKey || 'stock_shop1';

    // Step 1: Strict Pre-flight stock & batch validation for EVERY line item
    for (const line of items) {
      const itemCode = line.medicine ? line.medicine.code : line.code;
      const itemName = line.medicine ? line.medicine.name : (line.name || 'Unknown Medicine');
      const qtySold = parseInt(line.qty, 10) || 0;
      const targetBatchNo = String(line.batch?.batch_no || line.batch_no || line.batch || '').trim();

      const med = medicines.find(m => m.code === itemCode || m.name.toLowerCase() === itemName.toLowerCase());
      if (!med) {
        alert(`Cannot complete bill: Medicine "${itemName}" (${itemCode}) not found in live catalog.`);
        releaseGuard();
        return;
      }

      if (!targetBatchNo) {
        alert(`Cannot complete bill: No batch specified for "${itemName}". Please select a batch before completing the bill.`);
        releaseGuard();
        return;
      }

      const batches = Array.isArray(med.batches) ? med.batches : [];
      const foundBatch = batches.find(b =>
        String(b.batch_no || '').trim().toUpperCase() === targetBatchNo.toUpperCase() &&
        (b.branch_id || 'MAIN') === (activeBranch?.id || 'MAIN')
      );

      // Never silently select another batch or deduct from a different batch!
      if (!foundBatch) {
        alert(`Cannot complete bill: Batch "${targetBatchNo}" for "${itemName}" could not be found in active inventory.\n\nPlease verify the medicine and batch details or explicitly select an available batch.`);
        releaseGuard();
        return;
      }

      const availableBatchQty = parseInt(foundBatch.qty !== undefined ? foundBatch.qty : (foundBatch.stock !== undefined ? foundBatch.stock : 0), 10);
      if (availableBatchQty <= 0) {
        alert(`Cannot complete bill: Zero stock in selected batch.\n\nMedicine: ${itemName}\nBatch: ${foundBatch.batch_no}\nAvailable Quantity: 0\nRequested Quantity: ${qtySold}\n\nPlease select a different batch with available stock.`);
        releaseGuard();
        return;
      }

      if (qtySold > availableBatchQty) {
        alert(`Cannot complete bill: Insufficient stock in selected batch.\n\nMedicine: ${itemName}\nBatch: ${foundBatch.batch_no}\nAvailable Quantity: ${availableBatchQty}\nRequested Quantity: ${qtySold}\n\nPlease adjust the requested quantity or explicitly select another batch.`);
        releaseGuard();
        return;
      }

      // Regulatory check: Expired batches cannot be dispensed (Section 18, Drugs and Cosmetics Act)
      if (!isExpiryValid(normalizeExpiry(foundBatch.exp_date)) || isBatchExpired(foundBatch.exp_date)) {
        alert(`Cannot complete bill: Regulatory Restriction.\n\nMedicine: ${itemName}\nBatch "${foundBatch.batch_no}" has expired (${foundBatch.exp_date}).\n\nDispensing expired medicines is strictly prohibited by pharmacy regulations. Please discard or select a valid unexpired batch.`);
        releaseGuard();
        return;
      }

      const aggregateStock = parseInt(med[targetStockKey] !== undefined ? med[targetStockKey] : (med.stock || 0), 10);
      if (qtySold > aggregateStock) {
        alert(`Cannot complete bill: Insufficient total branch stock for "${itemName}".\n\nBranch Stock: ${aggregateStock}\nRequested Quantity: ${qtySold}`);
        releaseGuard();
        return;
      }

      // Explicit discrepancy warning: Do not silently clamp quantities or force them to match!
      if (availableBatchQty > aggregateStock) {
        alert(`Cannot complete bill: Inventory Discrepancy Detected.\n\nMedicine: ${itemName}\nBatch "${foundBatch.batch_no}" stock: ${availableBatchQty}\nTotal branch stock: ${aggregateStock}\n\nBatch quantity exceeds verified branch stock. Please reconcile inventory before dispensing.`);
        releaseGuard();
        return;
      }
    }

    const billUniqueId = `${activeBranch?.id || 'MAIN'}_${billNo}_${billDate}`;
    try {
      const processedBills = JSON.parse(localStorage.getItem('beta_pharma_processed_bills') || '{}');
      if (processedBills[billUniqueId]) {
        console.warn(`[GUARD] Bill ${billUniqueId} was already finalized. Skipping duplicate stock deduction.`);
        alert(`Notice: Bill ${billNo} has already been finalized.`);
        releaseGuard();
        return;
      }
    } catch (e) {}

    const gross = items.reduce((acc, it) => acc + it.totalValue, 0);
    const net = Math.round(gross);

    let billPayload = {
      billNo,
      date: billDate,
      time: currentTime,
      createdAt: new Date().toISOString(),
      patientName: patientName || 'CUSTOMER',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      doctorName: doctorName || 'Self / OTC',
      paymentMode,
      items: [...items],
      grossTotal: gross,
      netPayable: net,
      store: activeBranch.name,
      branchId: activeBranch.id,
      location: activeBranch.location,
      staffName: activeShift?.staffName || 'Counter Staff',
      shiftId: activeShift?.shiftId || 'SHIFT-OPEN',
      storeInfo: storeConfig
    };

    // Step 2: Stage deductions in memory (Commit-Before-Apply: DO NOT mutate state or localStorage yet!)
    const stagedModifiedMeds = [];
    const stagedOverrides = { ...JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}') };

    // Build cloned map of current medicines to calculate stock changes in isolation
    const updatedCatalogMap = new Map(medicines.map(m => [m.code, {
      ...m,
      batches: m.batches ? m.batches.map(b => ({ ...b })) : []
    }]));

    for (const line of items) {
      const itemCode = line.medicine ? line.medicine.code : line.code;
      const itemName = line.medicine ? line.medicine.name : line.name;
      const qtySold = parseInt(line.qty, 10) || 1;
      const targetBatchNo = String(line.batch?.batch_no || line.batch_no || line.batch || '').trim().toUpperCase();

      const med = updatedCatalogMap.get(itemCode);
      if (med) {
        if (med.batches && med.batches.length > 0) {
          const batches = med.batches;
          const bIdx = batches.findIndex(b =>
            String(b.batch_no || '').trim().toUpperCase() === targetBatchNo &&
            (b.branch_id || 'MAIN') === (activeBranch?.id || 'MAIN')
          );
          if (bIdx !== -1) {
            const currentBatchQty = parseInt(batches[bIdx].qty !== undefined ? batches[bIdx].qty : (batches[bIdx].stock || 0), 10);
            const newBatchQty = Math.max(0, currentBatchQty - qtySold);
            batches[bIdx].qty = newBatchQty;
            batches[bIdx].stock = newBatchQty;
          }
        }

        med.stock = med.batches
          ? med.batches
              .filter(b => (b.branch_id || 'MAIN') === (activeBranch?.id || 'MAIN'))
              .reduce((sum, b) => sum + parseInt(b.qty !== undefined ? b.qty : (b.stock || 0), 10), 0)
          : Math.max(0, (med[targetStockKey] || 0) - qtySold);
        med[targetStockKey] = med.stock;
        med.branchId = activeBranch.id;
        med.updatedAt = new Date().toISOString();

        updatedCatalogMap.set(itemCode, med);
        stagedModifiedMeds.push(med);
        const key = med.code || med.name.toLowerCase();
        stagedOverrides[key] = med;
      }
    }

    // Step 3: Atomic Multi-Store Commit to IndexedDB (Medicines Stock + Bill Record in ONE transaction)
    let atomicDueRecord = null;
    try {
      const txRes = await idbCommitSaleTransaction(stagedModifiedMeds, billPayload);
      if (!txRes || !txRes.success) {
        if (txRes?.alreadyCommitted) {
          const stored = txRes.billRecord;
          // Reconcile stored bill against current cart to distinguish genuine retry from sequence collision
          const isSameItems = stored && Array.isArray(stored.items) && stored.items.length === billPayload.items.length &&
            stored.items.every((it, idx) => {
              const cur = billPayload.items[idx];
              return it && cur && (it.code === cur.code) && (it.qty === cur.qty) && 
                (String(it.batch_no || it.batch || '').trim().toUpperCase() === String(cur.batch_no || cur.batch || '').trim().toUpperCase());
            });
          const isSameTotal = stored && Math.abs((stored.netPayable || 0) - (billPayload.netPayable || 0)) < 0.01;

          if (isSameItems && isSameTotal) {
            // Genuine retry or post-commit recovery: Restore receipt, clear cart, advance bill sequence
            console.warn(`[RECOVERY] Bill ${billPayload.billNo} was already committed in database. Restoring state without duplicate stock deduction.`);
            alert(`Notice: Bill ${billPayload.billNo} was already committed in the database.\n\nRestoring receipt and advancing bill without duplicate stock deduction.`);
            const restoredBill = stored || billPayload;
            setCompletedBillData(restoredBill);
            setItems([]);
            handleNewBill();
            if (isInstantPrint) {
              await executeTvsPrint(restoredBill, false);
            } else {
              setIsReceiptOpen(true);
            }
            releaseGuard();
            return;
          } else {
            // Sequence collision: The billNo was used by a different transaction!
            // Do NOT clear cart, do NOT print false receipt, do NOT deduct stock!
            let nextAvailable = '';
            try {
              const maxNum = await idbGetMaxBillNo(activeBranch?.id || 'MAIN');
              nextAvailable = (maxNum + 1).toString().padStart(6, '0');
              setBillNo(nextAvailable);
              localStorage.setItem('beta_pharma_next_bill_no', nextAvailable);
            } catch (_) {}
            console.warn(`[COLLISION] Bill number ${billPayload.billNo} collision with existing bill. Advanced to ${nextAvailable}.`);
            alert(`Bill Sequence Conflict Detected:\nBill number ${billPayload.billNo} has already been used for a previous transaction (${stored?.patientName || 'Customer'} - Rs.${stored?.netPayable || 0}).\n\nYour bill number has been advanced to ${nextAvailable || 'the next number'}. Your cart items and stock have been preserved. Please review and click Complete Bill (F10) again.`);
            releaseGuard();
            return;
          }
        }

        console.error('[TRANSACTION FAILURE]', txRes?.error);
        alert(`Bill Finalization Failed:\n${txRes?.error || 'Database storage error.'}\n\nStock was NOT deducted and the bill was NOT saved. Your cart items have been preserved. Please try again.`);
        releaseGuard();
        return; // EXIT: Cart preserved, zero state mutation, zero printing triggered
      }
      billPayload = txRes.billRecord || billPayload;
      atomicDueRecord = txRes.dueRecord || null;
    } catch (err) {
      console.error('[TRANSACTION EXCEPTION]', err);
      alert(`Bill Finalization Failed:\n${err.message || 'Unexpected storage exception.'}\n\nStock was NOT deducted and the bill was NOT saved. Your cart items have been preserved.`);
      releaseGuard();
      return;
    }

    // Step 4: Transaction successfully committed to IndexedDB!
    // Now and ONLY now apply the new state to in-memory React state and secondary storage
    const committedCatalog = Array.from(updatedCatalogMap.values());
    medicinesRef.current = committedCatalog;
    setMedicines(committedCatalog);

    try {
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(stagedOverrides));
      if (activeBranch?.id) {
        localStorage.setItem(`beta_pharma_med_overrides_${activeBranch.id}`, JSON.stringify(stagedOverrides));
        localStorage.setItem(`beta_pharma_last_operational_mutation_${activeBranch.id}`, String(Date.now()));
      }
    } catch (e) {
      console.warn('LocalStorage override update note:', e);
    }

    // Mark as processed in registry ONLY after atomic database commit succeeds
    try {
      const processedBills = JSON.parse(localStorage.getItem('beta_pharma_processed_bills') || '{}');
      processedBills[billUniqueId] = Date.now();
      localStorage.setItem('beta_pharma_processed_bills', JSON.stringify(processedBills));
    } catch (e) {}

    releaseGuard();

    setCompletedBillData(billPayload);

    // 2. Persist recent bills for F7 recall / reprint (up to 500 per day — safe for localStorage)
    setRecentBills(prev => {
      const updatedBills = [billPayload, ...prev];
      try {
        localStorage.setItem('beta_pharma_recent_bills', JSON.stringify(updatedBills.slice(0, 500)));
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
          preferredDoctor: doctorName || 'Self / OTC',
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
        const dueRecord = atomicDueRecord;
        if (!dueRecord) throw new Error('Atomic due ledger record was not returned after credit sale commit.');
        const withoutDuplicate = dues.filter(existing => existing.id !== dueRecord.id);
        withoutDuplicate.unshift(dueRecord);
        localStorage.setItem('beta_pharma_due_bills', JSON.stringify(withoutDuplicate));
      } catch (e) {
        console.warn('Error recording customer due bill', e);
      }
    }

    setIsReprintMode(false);
    // Offline-first delta sync engine (IndexedDB local write + background delta push to Supabase)
    syncEngine.recordSalesBill(billPayload);
    if (Array.isArray(stagedModifiedMeds)) {
      for (const m of stagedModifiedMeds) {
        // Correlate line items in bill to determine exact units sold and affected batches
        const relatedItems = (billPayload.items || []).filter(it => 
          (it.medicine?.code || it.code) === m.code || 
          (it.medicine?.name || it.name || '').toLowerCase() === (m.name || '').toLowerCase()
        );
        const soldUnits = relatedItems.reduce((acc, it) => acc + (parseInt(it.qty, 10) || 1), 0);
        const affectedBatches = relatedItems.map(it => String(it.batch?.batch_no || it.batch_no || it.batch || '').trim());

        syncEngine.recordMedicineDelta({
          ...m,
          deltaQty: -soldUnits,
          billNo: billPayload.billNo,
          affectedBatches,
          transactionType: 'SALE'
        });
      }
    }

    if (isInstantPrint) {
      const printResult = await executeTvsPrint(billPayload, false);
      if (!printResult?.success) {
        alert(`Bill ${billPayload.billNo} was saved, but printing failed.\n\n${printResult?.error || 'Printer error'}\n\nUse Recall/Reprint after checking the TVS printer.`);
      }
      handleNewBill();
    } else {
      // 4. Open clean Dot-Matrix Receipt Modal: Cashier can preview voucher, press Enter to print, send WhatsApp, or press Esc
      setIsReceiptOpen(true);
    }
  };

  const handleNewBill = () => {
    isCompletingBillRef.current = false;
    const num = parseInt(billNo, 10) + 1;
    const nextBill = num.toString().padStart(6, '0');
    setBillNo(nextBill);
    try {
      localStorage.setItem('beta_pharma_next_bill_no', nextBill);
      const branchKey = `beta_pharma_last_bill_no_${activeBranch?.id || 'MAIN'}`;
      localStorage.setItem(branchKey, nextBill);
    } catch (e) {}
    setItems([]);
    setPatientName('');
    setCustomerPhone('');
    setTimeout(() => {
      const el = document.getElementById('fast-billing-search-input');
      if (el) {
        el.focus();
        el.select?.();
      }
    }, 60);
  };

  // 1-Click Repeat Prescription Loader from Customer History
  const handleRepeatBill = (repeatItems, docName, patName) => {
    if (!repeatItems || repeatItems.length === 0) return;

    const formatted = [];
    const repeatErrors = [];
    repeatItems.forEach(it => {
      const itName = it.name || it.medicine?.name || '';
      const itCode = it.code || it.medicine?.code || '';
      const found = medicines.find(m => (itCode && m.code === itCode) || (itName && (m.name || '').toLowerCase() === itName.toLowerCase()));
      if (!found) {
        repeatErrors.push(`${itName || itCode || 'Unknown item'} is no longer in the catalog`);
        return;
      }
      const requestedBatch = String(it.batch?.batch_no || it.batch || '').trim().toUpperCase();
      const saleableBatches = (found.batches || []).filter(b => {
        const qty = Number(b.qty ?? b.stock ?? 0);
        const expiry = normalizeExpiry(b.exp_date);
        return qty > 0 && b.batch_no && b.batch_no !== 'BN001' && isExpiryValid(expiry) && !isBatchExpired(expiry);
      });
      const batchObj = saleableBatches.find(b => String(b.batch_no).trim().toUpperCase() === requestedBatch) || saleableBatches[0];
      const qty = Number.parseInt(it.qty, 10);
      if (!batchObj) {
        repeatErrors.push(`${found.name} has no saleable in-stock batch`);
        return;
      }
      if (!(qty > 0) || qty > Number(batchObj.qty ?? batchObj.stock ?? 0)) {
        repeatErrors.push(`${found.name} requested ${it.qty || 0}, available ${Number(batchObj.qty ?? batchObj.stock ?? 0)} in batch ${batchObj.batch_no}`);
        return;
      }
      formatted.push({
        medicine: found,
        batch: batchObj,
        qty,
        totalValue: (Number(batchObj.mrp) / (Number(batchObj.per) || 1)) * qty
      });
    });

    if (repeatErrors.length > 0) {
      alert(`The prescription was not loaded because current inventory does not match the old bill:\n\n- ${repeatErrors.join('\n- ')}\n\nReview and add current batches manually.`);
      return;
    }

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

    // Offline-first delta sync push for shift handover record
    syncEngine.recordShift({
      shiftId: completedShiftRecord.shiftId,
      staffName: completedShiftRecord.staffName,
      closingCash: completedShiftRecord.closingCash,
      totalSales: completedShiftRecord.totalSales,
      startBill: completedShiftRecord.startBillNo,
      endBill: completedShiftRecord.endBillNo,
      notes: `Staff: ${completedShiftRecord.staffName}, Next: ${completedShiftRecord.nextStaffName}, Cash: Rs.${completedShiftRecord.closingCash}`,
      branchId: activeBranch?.id || 'shop1'
    });
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
    setIsShiftModalOpen(false);
  };

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* 1. Global Navigation Menu (Only shown on cashier counter POS; hidden in standalone Admin App!) */}
      {activePage !== 'admin' && (
        <>
          {/* Quarantined Returns Notification Pill */}
          {isCatalogHydrating && (
        <div className="bg-amber-500 text-slate-950 font-bold text-xs py-1 px-4 text-center tracking-wide">
          ⏳ Restoring active inventory from local database storage... Please wait.
        </div>
      )}
      <TopNavigationMenu
        onOpenUnverifiedReturns={() => setIsUnverifiedReturnsOpen(true)}
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
          counterOnlyMode={COUNTER_ONLY_MODE}
        />
        </>
      )}

      {/* 2. Full Page Router (All pages connected with high contrast) */}
      {activePage === 'billing' && (
        <FastBillingTerminal
          theme={theme}
          density={density}
          activeBranch={activeBranch}
          authenticatedRole={authenticatedRole}
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
          onOpenImportModal={() => setIsImportModalOpen(true)}
        />
      )}

      {activePage === 'product-master' && (
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

      {activePage === 'doctor-master' && (
        <DoctorMasterPage
          theme={theme}
          onBackToBilling={() => setActivePage('billing')}
          onSelectDoctorForBilling={(doc) => {
            setDoctorName(doc.name);
            setActivePage('billing');
          }}
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
          activeBranch={activeBranch}
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
              onRefreshCloudBills={refreshLiveCloudBills}
              storeConfig={storeConfig}
              onUpdateStoreConfig={(newCfg) => {
                setStoreConfig(newCfg);
                try {
                  localStorage.setItem('beta_pharma_store_config', JSON.stringify(newCfg));
                } catch (e) {}
              }}
            />
        </ErrorBoundary>
      )}

      {/* Password Authentication Modal (Clipper Security CC / DD) */}
      {!COUNTER_ONLY_MODE && <PasswordAuthModal
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
      />}

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
          setTimeout(() => {
            const el = document.getElementById('fast-billing-search-input');
            if (el) {
              el.focus();
              el.select?.();
            }
          }, 60);
        }}
        billData={{ ...(completedBillData || {}), storeInfo: storeConfig }}
        onNewBill={handleNewBill}
        isReprint={isReprintMode}
        recentBills={recentBills}
        onSelectBill={(selected) => setCompletedBillData(selected)}
      />

      {/* Quarantined Unverified Sales Returns Viewer Modal (Read-Only) */}
      <UnverifiedReturnsReviewModal
        isOpen={isUnverifiedReturnsOpen}
        onClose={() => setIsUnverifiedReturnsOpen(false)}
      />

      {/* Staff Shift Session Handover & Blind Cash Reconciliation Modal */}
      {!COUNTER_ONLY_MODE && <ShiftReconciliationModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setTargetIncomingStaff(null);
        }}
        activeBranch={activeBranch}
        activeShift={activeShift}
        onSaveShiftHandover={handleSaveShiftHandover}
        recentBills={recentBills}
        theme={theme}
        staffList={staffList}
        onAddStaff={handleAddStaff}
        targetIncomingStaff={targetIncomingStaff}
      />}

      {/* First-Time Guided Onboarding & Terminal Setup Wizard (Counter Billing only) */}
      {!COUNTER_ONLY_MODE && activePage !== 'admin' && (
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
        onAutoRepairMedicines={handleAutoRepairMedicines}
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
        <div id="single-print-target" className="hidden print:block">
          <PrintableReceipt billData={{ ...(completedBillData || recentBills[0] || {}), storeInfo: storeConfig }} isReprint={isReprintMode} />
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

      {/* Terminal Lock & Shift Sign-In Gate (Never blocks initial Onboarding/Setup Wizard) */}
      {!COUNTER_ONLY_MODE && isTerminalLocked && !isSetupWizardOpen && (
        <TerminalLockScreen
          theme={theme}
          activeBranch={activeBranch}
          staffList={staffList}
          onUnlockTerminal={handleUnlockTerminal}
          onAddStaff={handleAddStaff}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
        />
      )}

      {/* Live Cloud Storage Quota Health & 2-Step Safe Purge Modal */}
      {!COUNTER_ONLY_MODE && <CloudStoragePurgeModal
        isOpen={isCloudPurgeModalOpen}
        onClose={() => setIsCloudPurgeModalOpen(false)}
        theme={theme}
        cloudMetrics={cloudMetrics}
        onRefreshMetrics={refreshCloudMetrics}
        recentBills={recentBills}
        activeBranch={activeBranch}
      />}

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
