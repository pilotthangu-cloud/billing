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
const DB_VERSION = 1;

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
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', event.target.error);
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

export async function idbSaveBill(bill) {
  if (!bill || !bill.billNo) return;
  return runTransaction('bills', 'readwrite', (store) => {
    store.put(bill);
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

export async function idbCacheMedicines(medicinesList) {
  if (!Array.isArray(medicinesList) || medicinesList.length === 0) return;
  const db = await openPharmaDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('medicines', 'readwrite');
      const store = tx.objectStore('medicines');
      medicinesList.forEach((med) => {
        if (med && med.code) {
          store.put(med);
        }
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
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

// ================= DUE BILLS REPOSITORY =================

export async function idbSaveDueBill(dueBill) {
  if (!dueBill || !dueBill.id) return;
  return runTransaction('due_bills', 'readwrite', (store) => {
    store.put(dueBill);
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
  if (!transfer || !transfer.id) return;
  return runTransaction('stock_transfers', 'readwrite', (store) => {
    store.put(transfer);
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
    } catch (e) {}
    return;
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
  if (!db) {
    try {
      return JSON.parse(localStorage.getItem('beta_pharma_offline_sync_q') || '[]');
    } catch (e) {
      return [];
    }
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

export async function idbRemoveDelta(id) {
  const db = await openPharmaDB();
  if (!db) {
    try {
      const localQ = JSON.parse(localStorage.getItem('beta_pharma_offline_sync_q') || '[]');
      const filtered = localQ.filter(item => item.timestamp !== id);
      localStorage.setItem('beta_pharma_offline_sync_q', JSON.stringify(filtered));
    } catch (e) {}
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
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
