/**
 * Offline-First IndexedDB Client Storage Engine for Beta Pharmacy POS
 * Provides robust client-side storage for:
 * - Sales Bills
 * - Medicines Master Catalog (25,000+ items without localStorage 5MB quota limits)
 * - Due / Credit Ledger Bills
 * - Inter-Store Stock Transfers
 * - Offline Sync Mutation Queue for Supabase
 */

const DB_NAME = 'BetaPharmaDB';
// Keep this above every previously shipped browser schema. Opening an older
// version against a database created by a newer deployment throws VersionError
// and was incorrectly surfaced to the operator as "IndexedDB unavailable".
// IndexedDB upgrades in place; existing records are preserved.
const DB_VERSION = 20;

let dbInstance = null;

/**
 * Open and initialize IndexedDB stores
 * @returns {Promise<IDBDatabase>}
 */
export function openPharmaDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not supported in this environment');
      return resolve(null);
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Sales Bills Store
      if (!db.objectStoreNames.contains('bills')) {
        const billsStore = db.createObjectStore('bills', { keyPath: 'billNo' });
        billsStore.createIndex('date', 'date', { unique: false });
        billsStore.createIndex('patientName', 'patientName', { unique: false });
      }

      // 2. Medicines Catalog Store
      if (!db.objectStoreNames.contains('medicines')) {
        const medsStore = db.createObjectStore('medicines', { keyPath: 'code' });
        medsStore.createIndex('name', 'name', { unique: false });
        medsStore.createIndex('rack', 'rack', { unique: false });
      }

      // 3. Due / Khata Bills Store
      if (!db.objectStoreNames.contains('due_bills')) {
        const duesStore = db.createObjectStore('due_bills', { keyPath: 'id' });
        duesStore.createIndex('billNo', 'billNo', { unique: false });
        duesStore.createIndex('status', 'status', { unique: false });
      }

      // 4. Inter-Store Stock Transfers Store
      if (!db.objectStoreNames.contains('stock_transfers')) {
        const transfersStore = db.createObjectStore('stock_transfers', { keyPath: 'id' });
        transfersStore.createIndex('date', 'date', { unique: false });
      }

      // 5. Offline Delta Sync Queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 6. 2+ Years Daily Snapshots Store (730+ Days Retention)
      if (!db.objectStoreNames.contains('backups')) {
        const backupsStore = db.createObjectStore('backups', { keyPath: 'date' });
        backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 7. Durable Quarantine Queue for Unverified Sales Returns
      if (!db.objectStoreNames.contains('unverified_returns')) {
        const unverifiedStore = db.createObjectStore('unverified_returns', { keyPath: 'creditNoteNo' });
        unverifiedStore.createIndex('date', 'date', { unique: false });
        unverifiedStore.createIndex('status', 'status', { unique: false });
      }

      // 8. Application Metadata and Persistent Initialization Markers
      if (!db.objectStoreNames.contains('app_meta')) {
        db.createObjectStore('app_meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', event.target.error);
      resolve(null);
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade is blocked by another open POS tab. Close other POS tabs and retry.');
      resolve(null);
    };
  });
}

/**
 * Generic helper to run a transaction
 */
async function runTransaction(storeName, mode, callback) {
  const db = await openPharmaDB();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => {
        console.warn(`IndexedDB transaction error on ${storeName}:`, tx.error);
        resolve(null);
      };
    } catch (e) {
      console.warn(`IndexedDB execution error on ${storeName}:`, e);
      resolve(null);
    }
  });
}

// ================= BILLS REPOSITORY =================

/**
 * Commit both medicine stock updates and bill record in a single atomic IndexedDB readwrite transaction.
 * If either fails or if the bill already exists, the entire transaction is rolled back by the browser.
 * 
 * @param {Array<Object>} modifiedMeds - Array of medicine records with updated stock & batch quantities
 * @param {Object} billPayload - Complete finalized bill object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function idbCommitSaleTransaction(modifiedMeds, billPayload) {
  if (!billPayload || !billPayload.billNo) {
    return { success: false, error: 'Cannot commit transaction: Missing bill payload or bill number' };
  }
  const db = await openPharmaDB();
  if (!db) {
    return { success: false, error: 'Database storage (IndexedDB) is unavailable on this device.' };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (res) => {
      if (!resolved) {
        resolved = true;
        resolve(res);
      }
    };

    try {
      const tx = db.transaction(['medicines', 'bills'], 'readwrite');
      const medStore = tx.objectStore('medicines');
      const billStore = tx.objectStore('bills');

      const billKey = String(billPayload.billNo);
      billPayload.billNo = billKey;

      // Check if bill already exists to prevent duplicate commit
      const checkBillReq = billStore.get(billKey);
      checkBillReq.onsuccess = () => {
        if (checkBillReq.result) {
          // Bill already recorded in DB! Abort transaction to prevent duplicate stock deduction.
          try { tx.abort(); } catch (e) {}
          safeResolve({ 
            success: false, 
            alreadyCommitted: true, 
            billRecord: checkBillReq.result,
            error: `Bill ${billKey} has already been recorded in the database. Duplicate stock deduction blocked.` 
          });
          return;
        }

        // Put updated medicines
        if (Array.isArray(modifiedMeds)) {
          for (const med of modifiedMeds) {
            if (med && med.code) {
              medStore.put(med);
            }
          }
        }

        // Put bill
        billStore.put(billPayload);
      };

      checkBillReq.onerror = () => {
        try { tx.abort(); } catch (e) {}
        safeResolve({ success: false, error: 'Failed to verify existing bill records in database.' });
      };

      tx.oncomplete = () => {
        safeResolve({ success: true });
      };

      tx.onerror = () => {
        const errMsg = tx.error ? tx.error.message : 'Database transaction failed';
        console.error('IndexedDB atomic transaction error:', errMsg);
        safeResolve({ success: false, error: errMsg });
      };

      tx.onabort = () => {
        safeResolve({ success: false, error: 'Database transaction aborted. No changes were committed.' });
      };
    } catch (e) {
      console.error('Exception starting multi-store transaction:', e);
      safeResolve({ success: false, error: e.message });
    }
  });
}

export async function idbSaveBill(bill) {
  if (!bill || !bill.billNo) return { success: false, error: 'Missing bill payload or billNo' };
  const db = await openPharmaDB();
  if (!db) return { success: false, error: 'IndexedDB is unavailable' };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('bills', 'readwrite');
      const store = tx.objectStore('bills');
      store.put(bill);
      tx.oncomplete = () => resolve({ success: true });
      tx.onerror = () => resolve({ success: false, error: tx.error ? tx.error.message : 'Failed to save bill in IndexedDB' });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

export async function idbGetAllBills() {
  const db = await openPharmaDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('bills', 'readonly');
      const store = tx.objectStore('bills');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

// ================= MEDICINES REPOSITORY =================

/**
 * Surgically update one or more modified medicines in IndexedDB (Zero unnecessary rewrites)
 * @param {Array<Object>|Object} modifiedMeds - Single medicine or small array of modified medicines
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function idbUpdateMedicines(modifiedMeds) {
  const items = Array.isArray(modifiedMeds) ? modifiedMeds : [modifiedMeds];
  if (items.length === 0) return { success: true, count: 0 };
  const db = await openPharmaDB();
  if (!db) {
    return { success: false, error: 'IndexedDB is not available or failed to open on this device' };
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('medicines', 'readwrite');
      const store = tx.objectStore('medicines');
      items.forEach((med) => {
        if (med && med.code) {
          store.put(med);
        }
      });
      tx.oncomplete = () => resolve({ success: true, count: items.length });
      tx.onerror = () => {
        const errMsg = tx.error ? tx.error.message : 'IndexedDB transaction failed';
        console.error('IndexedDB update error:', errMsg);
        resolve({ success: false, error: errMsg });
      };
    } catch (e) {
      console.error('IndexedDB execution exception:', e);
      resolve({ success: false, error: e.message });
    }
  });
}

export async function idbCacheMedicines(medicinesList) {
  if (!Array.isArray(medicinesList) || medicinesList.length === 0) return { success: true, count: 0 };
  const db = await openPharmaDB();
  if (!db) return { success: false, error: 'IndexedDB is unavailable' };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('medicines', 'readwrite');
      const store = tx.objectStore('medicines');
      medicinesList.forEach((med) => {
        if (med && med.code) {
          store.put(med);
        }
      });
      tx.oncomplete = () => resolve({ success: true, count: medicinesList.length });
      tx.onerror = () => resolve({ success: false, error: tx.error ? tx.error.message : 'Failed to cache medicines' });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

export async function idbGetCachedMedicines() {
  const db = await openPharmaDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('medicines', 'readonly');
      const store = tx.objectStore('medicines');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

export async function idbClearMedicines() {
  const db = await openPharmaDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('medicines', 'readwrite');
      const store = tx.objectStore('medicines');
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

// ================= DUE BILLS REPOSITORY =================

export async function idbSaveDueBill(dueBill) {
  if (!dueBill || !dueBill.id) return { success: false, error: 'Missing due bill payload or ID' };
  const db = await openPharmaDB();
  if (!db) return { success: false, error: 'IndexedDB is unavailable' };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('due_bills', 'readwrite');
      const store = tx.objectStore('due_bills');
      store.put(dueBill);
      tx.oncomplete = () => resolve({ success: true });
      tx.onerror = () => resolve({ success: false, error: tx.error ? tx.error.message : 'Failed to save due bill' });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

export async function idbGetAllDueBills() {
  const db = await openPharmaDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('due_bills', 'readonly');
      const store = tx.objectStore('due_bills');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

// ================= STOCK TRANSFERS REPOSITORY =================

export async function idbSaveStockTransfer(transfer) {
  if (!transfer || !transfer.id) return { success: false, error: 'Missing stock transfer payload or ID' };
  const db = await openPharmaDB();
  if (!db) return { success: false, error: 'IndexedDB is unavailable' };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('stock_transfers', 'readwrite');
      const store = tx.objectStore('stock_transfers');
      store.put(transfer);
      tx.oncomplete = () => resolve({ success: true });
      tx.onerror = () => resolve({ success: false, error: tx.error ? tx.error.message : 'Failed to save stock transfer' });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

export async function idbGetAllStockTransfers() {
  const db = await openPharmaDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('stock_transfers', 'readonly');
      const store = tx.objectStore('stock_transfers');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

// ================= SYNC DELTA QUEUE REPOSITORY =================

export async function idbEnqueueDelta(actionType, payload) {
  const record = {
    actionType,
    payload,
    timestamp: Date.now(),
    status: 'PENDING',
    retryCount: 0
  };

  const db = await openPharmaDB();
  if (!db) {
    // Fallback queue in localStorage
    try {
      const localQ = JSON.parse(localStorage.getItem('beta_pharma_offline_sync_q') || '[]');
      localQ.push(record);
      localStorage.setItem('beta_pharma_offline_sync_q', JSON.stringify(localQ));
      return record.timestamp;
    } catch (e) {
      return null;
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function idbGetPendingDeltas() {
  const db = await openPharmaDB();
  let localItems = [];
  try {
    const raw = localStorage.getItem('beta_pharma_offline_sync_q');
    if (raw) {
      localItems = JSON.parse(raw);
      if (!Array.isArray(localItems)) localItems = [];
    }
  } catch (e) {}

  if (!db) {
    return localItems;
  }

  // Self-healing migration: if items exist in localStorage fallback, migrate them into IndexedDB sync_queue
  if (localItems.length > 0) {
    try {
      const txMigrate = db.transaction('sync_queue', 'readwrite');
      const storeMigrate = txMigrate.objectStore('sync_queue');
      for (const item of localItems) {
        storeMigrate.add(item);
      }
      localStorage.removeItem('beta_pharma_offline_sync_q');
    } catch (e) {}
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

export async function idbRemoveDelta(idOrTimestamp) {
  const db = await openPharmaDB();
  if (!db) {
    try {
      const localQ = JSON.parse(localStorage.getItem('beta_pharma_offline_sync_q') || '[]');
      const filtered = localQ.filter(item => item.timestamp !== idOrTimestamp && item.id !== idOrTimestamp);
      localStorage.setItem('beta_pharma_offline_sync_q', JSON.stringify(filtered));
    } catch (e) {}
    return true;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.delete(idOrTimestamp);
      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        // Fallback: if idOrTimestamp is a timestamp string/number, search by index
        try {
          const index = store.index('timestamp');
          const getReq = index.getKey(idOrTimestamp);
          getReq.onsuccess = () => {
            if (getReq.result) {
              store.delete(getReq.result);
              resolve(true);
            } else {
              resolve(false);
            }
          };
          getReq.onerror = () => resolve(false);
        } catch (idxErr) {
          resolve(false);
        }
      };
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Storage metrics report
 */
export async function idbGetStats() {
  const bills = await idbGetAllBills();
  const dues = await idbGetAllDueBills();
  const deltas = await idbGetPendingDeltas();
  const transfers = await idbGetAllStockTransfers();

  let quota = null;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      quota = await navigator.storage.estimate();
    } catch (e) {}
  }

  return {
    billsCount: bills.length,
    duesCount: dues.length,
    pendingDeltasCount: deltas.length,
    transfersCount: transfers.length,
    storageUsageBytes: quota?.usage || 0,
    storageQuotaBytes: quota?.quota || 0
  };
}

/**
 * Query total count of medicines currently in the medicines store
 * @returns {Promise<number>}
 */
export async function idbGetMedicinesCount() {
  const db = await openPharmaDB();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('medicines', 'readonly');
      const store = tx.objectStore('medicines');
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    } catch (e) {
      resolve(0);
    }
  });
}

/**
 * Persist an unverified sales return record durably to IndexedDB quarantine
 * @param {Object} record - Unverified return details with flagged lots
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function idbSaveUnverifiedReturn(record) {
  if (!record || !record.creditNoteNo) return { success: false, error: 'Missing credit note number' };
  const db = await openPharmaDB();
  if (!db) return { success: false, error: 'IndexedDB is unavailable' };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('unverified_returns', 'readwrite');
      const store = tx.objectStore('unverified_returns');
      store.put(record);
      tx.oncomplete = () => resolve({ success: true });
      tx.onerror = () => resolve({ success: false, error: tx.error ? tx.error.message : 'Failed to save unverified return' });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

/**
 * Retrieve all unverified sales returns currently quarantined in IndexedDB
 * @returns {Promise<Array<Object>>}
 */
export async function idbGetUnverifiedReturns() {
  const db = await openPharmaDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('unverified_returns', 'readonly');
      const store = tx.objectStore('unverified_returns');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Check whether the database has been officially initialized.
 * Genuinely distinguishes fresh installations from empty/corrupted existing ones.
 * @returns {Promise<boolean>}
 */
export async function idbIsInitialized() {
  const db = await openPharmaDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const stores = Array.from(db.objectStoreNames);
      if (!stores.includes('app_meta')) {
        // If app_meta store doesn't exist yet, check other core stores for existing data
        const checkStores = ['medicines', 'bills', 'unverified_returns'].filter(s => stores.includes(s));
        if (checkStores.length === 0) return resolve(false);

        const tx = db.transaction(checkStores, 'readonly');
        let totalCount = 0;
        let pending = checkStores.length;
        checkStores.forEach(s => {
          const req = tx.objectStore(s).count();
          req.onsuccess = () => {
            totalCount += req.result || 0;
            if (--pending === 0) resolve(totalCount > 0);
          };
          req.onerror = () => {
            if (--pending === 0) resolve(totalCount > 0);
          };
        });
        return;
      }

      const tx = db.transaction(['app_meta'], 'readonly');
      const store = tx.objectStore('app_meta');
      const req = store.get('system_initialized');
      req.onsuccess = () => {
        if (req.result && req.result.initialized) {
          return resolve(true);
        }
        // If no explicit marker in app_meta, verify if existing stores have records (legacy installation)
        const checkStores = ['medicines', 'bills', 'unverified_returns'].filter(s => stores.includes(s));
        if (checkStores.length === 0) return resolve(false);

        const txCheck = db.transaction(checkStores, 'readonly');
        let totalCount = 0;
        let pending = checkStores.length;
        checkStores.forEach(s => {
          const cReq = txCheck.objectStore(s).count();
          cReq.onsuccess = () => {
            totalCount += cReq.result || 0;
            if (--pending === 0) {
              if (totalCount > 0) {
                // Record legacy initialization so future checks are instant
                idbSetInitialized({ legacyDetected: true, count: totalCount }).catch(err => {
                  console.warn('[STORAGE_NOTE] Failed to persist legacy init marker to IndexedDB:', err);
                });
                resolve(true);
              } else {
                resolve(false);
              }
            }
          };
          cReq.onerror = () => {
            if (--pending === 0) resolve(totalCount > 0);
          };
        });
      };
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Persist the initialization marker in app_meta object store.
 * @param {Object} meta 
 * @returns {Promise<boolean>}
 */
export async function idbSetInitialized(meta = {}) {
  const db = await openPharmaDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('app_meta')) return resolve(false);
      const tx = db.transaction('app_meta', 'readwrite');
      const store = tx.objectStore('app_meta');
      store.put({
        key: 'system_initialized',
        initialized: true,
        timestamp: new Date().toISOString(),
        ...meta
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Retrieve maximum bill number stored in IndexedDB bills store to ensure sequence integrity.
 * @returns {Promise<number>}
 */
export async function idbGetMaxBillNo() {
  const db = await openPharmaDB();
  if (!db) return 0;

  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('bills')) return resolve(0);
      const tx = db.transaction('bills', 'readonly');
      const store = tx.objectStore('bills');
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result || [];
        let max = 0;
        for (const k of keys) {
          const num = parseInt(k, 10);
          if (!isNaN(num) && num > max) {
            max = num;
          }
        }
        resolve(max);
      };
      req.onerror = () => resolve(0);
    } catch (e) {
      resolve(0);
    }
  });
}
