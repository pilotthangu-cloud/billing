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
// Version 21 introduces a canonical branch-safe sales ledger. The legacy
// `bills` store is retained read-only for migration/rollback compatibility.
const DB_VERSION = 21;

let dbInstance = null;
let openingPromise = null;
let storageStatus = { available: false, code: 'NOT_OPENED', error: 'Local database has not opened yet.' };
const REQUIRED_STORES = ['bills', 'sales', 'medicines', 'due_bills', 'payments', 'customer_profiles', 'print_jobs', 'stock_transfers', 'sync_queue', 'backups', 'unverified_returns', 'app_meta'];

function normalizeBranchId(value) {
  return String(value || 'MAIN').trim().toUpperCase() || 'MAIN';
}

export function normalizeSaleIdentity(bill) {
  const branchId = normalizeBranchId(bill?.branchId || bill?.branch_id || bill?.storeId);
  const billNo = String(bill?.billNo || bill?.bill_no || '').trim();
  if (!billNo) throw new Error('Missing bill number');
  const id = String(bill?.id || `${branchId}:${billNo}`);
  return { ...bill, id, branchId, billNo, branchBillKey: `${branchId}:${billNo}` };
}

export function getPharmaStorageStatus() {
  return { ...storageStatus };
}

function storageFailure() {
  return { success: false, error: storageStatus.error, code: storageStatus.code };
}

/**
 * Open and initialize IndexedDB stores
 * @returns {Promise<IDBDatabase>}
 */
export function openPharmaDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openingPromise) return openingPromise;

  const attempt = new Promise((resolve) => {
    let finished = false;
    const finish = (db, code, message) => {
      if (finished) { if (db) db.close(); return; }
      finished = true;
      clearTimeout(timer);
      storageStatus = { available: Boolean(db), code, error: message || '' };
      resolve(db);
    };
    const timer = setTimeout(() => finish(null, 'OPEN_TIMEOUT', 'Local database did not open within 10 seconds. Close other POS windows, restart the app and retry. Existing data has not been deleted.'), 10000);
    let factory;
    try { factory = globalThis.indexedDB || globalThis.window?.indexedDB; }
    catch (error) { finish(null, error.name, `Local database access was denied: ${error.message}`); return; }
    if (!factory) { finish(null, 'UNSUPPORTED', 'This app session cannot access IndexedDB. Open the desktop app or a regular browser profile with local storage enabled.'); return; }

    let request;
    try { request = factory.open(DB_NAME, DB_VERSION); }
    catch (error) { finish(null, error.name, `Local database could not open: ${error.message}`); return; }

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Sales Bills Store
      if (!db.objectStoreNames.contains('bills')) {
        const billsStore = db.createObjectStore('bills', { keyPath: 'billNo' });
        billsStore.createIndex('date', 'date', { unique: false });
        billsStore.createIndex('patientName', 'patientName', { unique: false });
      }

      // Canonical sales ledger: unlike the legacy store, the primary key is
      // branch-qualified so MAIN:000001 and POLYCLINIC:000001 can coexist.
      let salesStore;
      if (!db.objectStoreNames.contains('sales')) {
        salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('branchBillKey', 'branchBillKey', { unique: true });
        salesStore.createIndex('branchId', 'branchId', { unique: false });
        salesStore.createIndex('date', 'date', { unique: false });
        salesStore.createIndex('patientName', 'patientName', { unique: false });

        // Migrate every legacy bill that survived the old billNo-only schema.
        if (db.objectStoreNames.contains('bills')) {
          const legacyStore = event.target.transaction.objectStore('bills');
          legacyStore.openCursor().onsuccess = cursorEvent => {
            const cursor = cursorEvent.target.result;
            if (!cursor) return;
            try { salesStore.put(normalizeSaleIdentity(cursor.value)); } catch (_) {}
            cursor.continue();
          };
        }
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


      if (!db.objectStoreNames.contains('payments')) {
        const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
        paymentStore.createIndex('saleId', 'saleId', { unique: true });
        paymentStore.createIndex('mode', 'mode', { unique: false });
        paymentStore.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('customer_profiles')) {
        const customerStore = db.createObjectStore('customer_profiles', { keyPath: 'phone' });
        customerStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('print_jobs')) {
        const printStore = db.createObjectStore('print_jobs', { keyPath: 'id' });
        printStore.createIndex('saleId', 'saleId', { unique: true });
        printStore.createIndex('status', 'status', { unique: false });
        printStore.createIndex('createdAt', 'createdAt', { unique: false });
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
      const opened = event.target.result;
      if (finished) { opened.close(); return; }
      const missing = REQUIRED_STORES.filter(name => !opened.objectStoreNames.contains(name));
      if (missing.length) {
        opened.close();
        finish(null, 'INCOMPATIBLE_SCHEMA', `Local database is missing stores: ${missing.join(', ')}. Existing data was preserved; database repair is required.`);
        return;
      }
      dbInstance = opened;
      dbInstance.onversionchange = () => {
        opened.close();
        if (dbInstance === opened) dbInstance = null;
      };
      dbInstance.onclose = () => { if (dbInstance === opened) dbInstance = null; };
      finish(dbInstance, 'READY', '');
    };

    request.onerror = (event) => {
      const error = event.target.error;
      if (error?.name === 'VersionError') {
        // A newer installed release may own this database. Read its existing
        // schema without forcing a downgrade; validate it before accepting it.
        const existing = factory.open(DB_NAME);
        existing.onsuccess = request.onsuccess;
        existing.onerror = () => finish(null, existing.error?.name || 'OPEN_FAILED', existing.error?.message || 'Unable to open the existing database.');
        existing.onblocked = () => finish(null, 'BLOCKED', 'Close other POS tabs/windows and retry. They are blocking access to the local database.');
        return;
      }
      finish(null, error?.name || 'OPEN_FAILED', `Local database open failed (${error?.name || 'unknown error'}): ${error?.message || 'No details returned'}. Existing data has not been deleted.`);
    };

    request.onblocked = () => {
      finish(null, 'BLOCKED', 'Close all other POS tabs/windows, then retry. Another window is blocking the local database upgrade. Existing data has not been deleted.');
    };
  });
  openingPromise = attempt;
  attempt.finally(() => { if (openingPromise === attempt) openingPromise = null; });
  return attempt;
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
    return storageFailure();
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
      const tx = db.transaction(['medicines', 'sales', 'due_bills', 'payments', 'customer_profiles', 'print_jobs', 'app_meta'], 'readwrite');
      const medStore = tx.objectStore('medicines');
      const billStore = tx.objectStore('sales');
      const dueStore = tx.objectStore('due_bills');
      const paymentStore = tx.objectStore('payments');
      const customerStore = tx.objectStore('customer_profiles');
      const printStore = tx.objectStore('print_jobs');
      const metaStore = tx.objectStore('app_meta');

      const canonicalBill = normalizeSaleIdentity(billPayload);
      const billKey = canonicalBill.id;
      const customerPhone = String(canonicalBill.customerPhone || '').trim();
      let dueRecord = null;

      const writeSale = (existingCustomer = null) => {
        // Put updated medicines
        if (Array.isArray(modifiedMeds)) {
          for (const med of modifiedMeds) {
            if (med && med.code) medStore.put(med);
          }
        }

        billStore.add(canonicalBill);

        const paymentRecord = {
          id: `PAY:${billKey}`,
          saleId: billKey,
          branchId: canonicalBill.branchId,
          billNo: canonicalBill.billNo,
          date: canonicalBill.date,
          mode: String(canonicalBill.paymentMode || 'cash').toLowerCase(),
          amount: Number(canonicalBill.netPayable || 0),
          createdAt: canonicalBill.createdAt || new Date().toISOString()
        };
        paymentStore.add(paymentRecord);

        if (paymentRecord.mode === 'credit') {
          dueRecord = {
            id: `DUE:${billKey}`,
            saleId: billKey,
            branchId: canonicalBill.branchId,
            billNo: canonicalBill.billNo,
            date: canonicalBill.date,
            customerName: canonicalBill.patientName || 'CUSTOMER',
            customerPhone,
            doctorName: canonicalBill.doctorName || 'Self / OTC',
            amount: paymentRecord.amount,
            balance: paymentRecord.amount,
            dueDate: '30 days',
            status: 'UNPAID',
            store: canonicalBill.store || 'Beta Pharmacy'
          };
          dueStore.add(dueRecord);
        }

        if (customerPhone.length >= 4) {
          const previous = existingCustomer || {};
          customerStore.put({
            phone: customerPhone,
            name: canonicalBill.patientName || previous.name || 'CUSTOMER',
            preferredDoctor: canonicalBill.doctorName || previous.preferredDoctor || 'Self / OTC',
            totalVisits: Number(previous.totalVisits || 0) + 1,
            totalSpent: Number(previous.totalSpent || 0) + paymentRecord.amount,
            lastSaleId: billKey,
            updatedAt: new Date().toISOString()
          });
        }

        const nextBillNo = (parseInt(canonicalBill.billNo, 10) + 1).toString().padStart(6, '0');
        metaStore.put({
          key: `next_bill_no:${canonicalBill.branchId}`,
          branchId: canonicalBill.branchId,
          nextBillNo,
          lastSaleId: billKey,
          updatedAt: new Date().toISOString()
        });

        printStore.add({
          id: `PRINT:${billKey}`,
          saleId: billKey,
          branchId: canonicalBill.branchId,
          billNo: canonicalBill.billNo,
          status: 'PENDING',
          attempts: 0,
          createdAt: new Date().toISOString(),
          lastError: ''
        });
      };

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

        if (customerPhone.length >= 4) {
          const customerReq = customerStore.get(customerPhone);
          customerReq.onsuccess = () => writeSale(customerReq.result || null);
          customerReq.onerror = () => {
            try { tx.abort(); } catch (_) {}
            safeResolve({ success: false, error: 'Failed to read the customer ledger before committing the sale.' });
          };
        } else {
          writeSale();
        }
      };

      checkBillReq.onerror = () => {
        try { tx.abort(); } catch (e) {}
        safeResolve({ success: false, error: 'Failed to verify existing bill records in database.' });
      };

      tx.oncomplete = () => {
        safeResolve({ success: true, billRecord: canonicalBill, dueRecord });
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
  if (!db) return storageFailure();

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('sales', 'readwrite');
      const store = tx.objectStore('sales');
      store.put(normalizeSaleIdentity(bill));
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
      const tx = db.transaction('sales', 'readonly');
      const store = tx.objectStore('sales');
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

export async function idbAddMedicine(medicine) {
  if (!medicine?.code) return { success: false, error: 'Medicine code is required.' };
  const db = await openPharmaDB();
  if (!db) return storageFailure();
  return new Promise(resolve => {
    try {
      const tx = db.transaction('medicines', 'readwrite');
      tx.objectStore('medicines').add(medicine);
      tx.oncomplete = () => resolve({ success: true });
      tx.onerror = () => resolve({ success: false, error: tx.error?.name === 'ConstraintError' ? `Medicine code ${medicine.code} already exists.` : (tx.error?.message || 'Failed to add medicine') });
      tx.onabort = () => resolve({ success: false, error: tx.error?.message || 'Medicine creation was aborted.' });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

export async function idbCacheMedicines(medicinesList, { replace = false } = {}) {
  if (!Array.isArray(medicinesList) || medicinesList.length === 0) return { success: true, count: 0 };
  if (medicinesList.some(med => !med || !String(med.code || '').trim())) return { success: false, error: 'Every medicine must have a source product code. Import was not committed.' };
  const db = await openPharmaDB();
  if (!db) return storageFailure();

  return new Promise((resolve) => {
    let tx;
    try {
      tx = db.transaction('medicines', 'readwrite');
      const store = tx.objectStore('medicines');
      if (replace) store.clear();
      medicinesList.forEach((med) => {
        if (med && med.code) {
          store.put(med);
        }
      });
      tx.oncomplete = () => resolve({ success: true, count: medicinesList.length });
      tx.onerror = () => resolve({ success: false, error: tx.error ? tx.error.message : 'Failed to cache medicines' });
      tx.onabort = () => resolve({ success: false, error: tx.error?.message || 'Medicine import aborted. Existing inventory was preserved.' });
    } catch (e) {
      try { tx?.abort(); } catch (_) {}
      resolve({ success: false, error: e.message });
    }
  });
}

export async function idbRestoreCoreSnapshotAtomic(snapshot = {}) {
  const medicines = Array.isArray(snapshot.medicines) ? snapshot.medicines : [];
  const bills = Array.isArray(snapshot.bills) ? snapshot.bills : [];
  const dueBills = Array.isArray(snapshot.dueBills) ? snapshot.dueBills : [];
  const stockTransfers = Array.isArray(snapshot.stockTransfers) ? snapshot.stockTransfers : [];
  const unverifiedReturns = Array.isArray(snapshot.unverifiedReturns) ? snapshot.unverifiedReturns : [];
  if (medicines.some(m => !m?.code)) return { success: false, error: 'Restore contains a medicine without a code.' };

  let normalizedBills;
  try { normalizedBills = bills.map(normalizeSaleIdentity); }
  catch (error) { return { success: false, error: `Restore contains an invalid bill: ${error.message}` }; }

  const db = await openPharmaDB();
  if (!db) return storageFailure();
  const stores = ['medicines', 'sales', 'due_bills', 'stock_transfers', 'unverified_returns'];
  return new Promise(resolve => {
    let tx;
    try {
      tx = db.transaction(stores, 'readwrite');
      const replace = (storeName, rows) => {
        const store = tx.objectStore(storeName);
        store.clear();
        rows.forEach(row => store.add(row));
      };
      replace('medicines', medicines);
      replace('sales', normalizedBills);
      replace('due_bills', dueBills);
      replace('stock_transfers', stockTransfers);
      replace('unverified_returns', unverifiedReturns);
      tx.oncomplete = () => resolve({
        success: true,
        counts: {
          medicines: medicines.length,
          bills: normalizedBills.length,
          dueBills: dueBills.length,
          stockTransfers: stockTransfers.length,
          unverifiedReturns: unverifiedReturns.length
        }
      });
      tx.onerror = () => resolve({ success: false, error: tx.error?.message || 'Atomic restore failed.' });
      tx.onabort = () => resolve({ success: false, error: tx.error?.message || 'Atomic restore was aborted; existing data was preserved.' });
    } catch (error) {
      try { tx?.abort(); } catch (_) {}
      resolve({ success: false, error: error.message });
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
  if (!db) return storageFailure();

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
  if (!db) return storageFailure();

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
  if (!db) return storageFailure();

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
export async function idbGetMaxBillNo(branchId = 'MAIN') {
  const db = await openPharmaDB();
  if (!db) return 0;

  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('sales')) return resolve(0);
      const tx = db.transaction('sales', 'readonly');
      const store = tx.objectStore('sales');
      const req = store.index('branchId').getAll(normalizeBranchId(branchId));
      req.onsuccess = () => {
        const bills = req.result || [];
        let max = 0;
        for (const bill of bills) {
          const num = parseInt(bill.billNo, 10);
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

export async function idbMarkPrintJob(saleId, result = {}) {
  const db = await openPharmaDB();
  if (!db) return storageFailure();
  const id = `PRINT:${saleId}`;
  return new Promise(resolve => {
    try {
      const tx = db.transaction('print_jobs', 'readwrite');
      const store = tx.objectStore('print_jobs');
      const req = store.get(id);
      req.onsuccess = () => {
        const current = req.result;
        if (!current) {
          try { tx.abort(); } catch (_) {}
          resolve({ success: false, error: `Print job not found for ${saleId}` });
          return;
        }
        store.put({
          ...current,
          status: result.success ? 'PRINTED' : 'FAILED',
          attempts: Number(current.attempts || 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          printedAt: result.success ? new Date().toISOString() : current.printedAt,
          lastError: result.success ? '' : String(result.error || 'Unknown printer error')
        });
      };
      tx.oncomplete = () => resolve({ success: true });
      tx.onerror = () => resolve({ success: false, error: tx.error?.message || 'Failed to update print job' });
      tx.onabort = () => resolve({ success: false, error: 'Print job update aborted' });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

export async function idbGetPendingPrintJobs() {
  const db = await openPharmaDB();
  if (!db) return [];
  return new Promise(resolve => {
    try {
      const tx = db.transaction('print_jobs', 'readonly');
      const req = tx.objectStore('print_jobs').getAll();
      req.onsuccess = () => resolve((req.result || []).filter(job => job.status !== 'PRINTED'));
      req.onerror = () => resolve([]);
    } catch (_) {
      resolve([]);
    }
  });
}
