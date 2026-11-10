import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';

let moduleIndex = 0;
const freshStorage = async factory => {
  globalThis.indexedDB = factory;
  return import(`../src/utils/indexedDb.js?case=${++moduleIndex}`);
};
const open = (factory, version, upgrade) => new Promise((resolve, reject) => {
  const request = factory.open('BetaPharmaDB', version);
  request.onupgradeneeded = () => upgrade?.(request.result);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

test('fresh import commits and survives closing/reopening the database', async () => {
  const factory = new IDBFactory();
  const storage = await freshStorage(factory);
  assert.equal((await storage.idbCacheMedicines([{ code: 'DOLO', stock: 435 }], { replace: true })).success, true);
  (await storage.openPharmaDB()).close();
  const reopened = await freshStorage(factory);
  assert.equal((await reopened.idbGetCachedMedicines())[0].stock, 435);
});

test('replacement removes omitted products instead of resurrecting them on restart', async () => {
  const storage = await freshStorage(new IDBFactory());
  await storage.idbCacheMedicines([{ code: 'STALE', stock: 450 }]);
  await storage.idbCacheMedicines([{ code: 'CURRENT', stock: 435 }], { replace: true });
  assert.deepEqual((await storage.idbGetCachedMedicines()).map(m => m.code), ['CURRENT']);
});

test('failed structured clone aborts clear and all writes atomically', async () => {
  const storage = await freshStorage(new IDBFactory());
  await storage.idbCacheMedicines([{ code: 'OLD', stock: 435 }]);
  const result = await storage.idbCacheMedicines([{ code: 'NEW', uncloneable: () => {} }], { replace: true });
  assert.equal(result.success, false);
  assert.deepEqual((await storage.idbGetCachedMedicines()).map(m => m.code), ['OLD']);
});

test('upgrade preserves records from an older database', async () => {
  const factory = new IDBFactory();
  const older = await open(factory, 4, db => db.createObjectStore('medicines', { keyPath: 'code' }));
  const tx = older.transaction('medicines', 'readwrite');
  tx.objectStore('medicines').put({ code: 'DOLO', stock: 435 });
  await new Promise(resolve => { tx.oncomplete = resolve; });
  older.close();
  const storage = await freshStorage(factory);
  assert.equal((await storage.idbGetCachedMedicines())[0].stock, 435);
  assert.equal((await storage.openPharmaDB()).objectStoreNames.contains('app_meta'), true);
});

test('a newer compatible database opens without a forced downgrade', async () => {
  const factory = new IDBFactory();
  const newer = await open(factory, 30, db => {
    for (const name of ['bills', 'sales', 'medicines', 'due_bills', 'payments', 'customer_profiles', 'print_jobs', 'stock_transfers', 'sync_queue', 'backups', 'unverified_returns', 'app_meta']) {
      db.createObjectStore(name, { keyPath: 'code' });
    }
  });
  newer.close();
  const storage = await freshStorage(factory);
  assert.equal((await storage.openPharmaDB()).version, 30);
});

test('blocked upgrade returns actionable error and does not erase records', async () => {
  const factory = new IDBFactory();
  const blocker = await open(factory, 4, db => db.createObjectStore('medicines', { keyPath: 'code' }));
  const storage = await freshStorage(factory);
  const result = await storage.idbCacheMedicines([{ code: 'DOLO', stock: 435 }]);
  assert.equal(result.code, 'BLOCKED');
  assert.match(result.error, /other POS/);
  blocker.close();
});

test('browser denial is exposed with its real error instead of generic unavailable', async () => {
  const storage = await freshStorage({ open() { throw new DOMException('Storage access denied', 'SecurityError'); } });
  const result = await storage.idbCacheMedicines([{ code: 'DOLO' }]);
  assert.equal(result.code, 'SecurityError');
  assert.match(result.error, /Storage access denied/);
});

test('same bill number can be committed independently for two branches', async () => {
  const storage = await freshStorage(new IDBFactory());
  const base = { billNo: '000001', date: '10/11/2026', items: [], netPayable: 10, paymentMode: 'cash' };
  assert.equal((await storage.idbCommitSaleTransaction([], { ...base, branchId: 'MAIN' })).success, true);
  assert.equal((await storage.idbCommitSaleTransaction([], { ...base, branchId: 'POLYCLINIC' })).success, true);
  const bills = await storage.idbGetAllBills();
  assert.deepEqual(bills.map(b => b.id).sort(), ['MAIN:000001', 'POLYCLINIC:000001']);
});

test('credit sale atomically creates payment, due, sequence and print job', async () => {
  const storage = await freshStorage(new IDBFactory());
  const result = await storage.idbCommitSaleTransaction(
    [{ code: 'DOLO', stock: 434 }],
    {
      billNo: '000009', branchId: 'MAIN', date: '10/11/2026', items: [],
      patientName: 'TEST CUSTOMER', customerPhone: '9999999999',
      paymentMode: 'credit', netPayable: 32.28
    }
  );
  assert.equal(result.success, true);
  assert.equal(result.billRecord.id, 'MAIN:000009');
  assert.equal(result.dueRecord.id, 'DUE:MAIN:000009');

  const db = await storage.openPharmaDB();
  const tx = db.transaction(['payments', 'due_bills', 'customer_profiles', 'print_jobs', 'app_meta'], 'readonly');
  const get = (store, key) => new Promise(resolve => {
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  const [payment, due, customer, printJob, sequence] = await Promise.all([
    get('payments', 'PAY:MAIN:000009'),
    get('due_bills', 'DUE:MAIN:000009'),
    get('customer_profiles', '9999999999'),
    get('print_jobs', 'PRINT:MAIN:000009'),
    get('app_meta', 'next_bill_no:MAIN')
  ]);
  assert.equal(payment.amount, 32.28);
  assert.equal(due.status, 'UNPAID');
  assert.equal(customer.totalVisits, 1);
  assert.equal(printJob.status, 'PENDING');
  assert.equal(sequence.nextBillNo, '000010');
});

test('duplicate branch bill aborts without a second stock change or ledger entry', async () => {
  const storage = await freshStorage(new IDBFactory());
  const bill = { billNo: '000001', branchId: 'MAIN', date: '10/11/2026', items: [], paymentMode: 'cash', netPayable: 10 };
  assert.equal((await storage.idbCommitSaleTransaction([{ code: 'DOLO', stock: 434 }], bill)).success, true);
  const duplicate = await storage.idbCommitSaleTransaction([{ code: 'DOLO', stock: 100 }], bill);
  assert.equal(duplicate.success, false);
  assert.equal(duplicate.alreadyCommitted, true);
  assert.equal((await storage.idbGetCachedMedicines())[0].stock, 434);
  assert.equal((await storage.idbGetAllBills()).length, 1);
});

test('snapshot restore replaces all core stores atomically', async () => {
  const storage = await freshStorage(new IDBFactory());
  await storage.idbCacheMedicines([{ code: 'OLD', stock: 10 }]);
  await storage.idbSaveBill({ billNo: '000001', branchId: 'MAIN', netPayable: 10 });
  const result = await storage.idbRestoreCoreSnapshotAtomic({
    medicines: [{ code: 'NEW', stock: 20 }],
    bills: [{ billNo: '000002', branchId: 'MAIN', netPayable: 20 }],
    dueBills: [], stockTransfers: [], unverifiedReturns: []
  });
  assert.equal(result.success, true);
  assert.deepEqual((await storage.idbGetCachedMedicines()).map(m => m.code), ['NEW']);
  assert.deepEqual((await storage.idbGetAllBills()).map(b => b.id), ['MAIN:000002']);
});

test('invalid snapshot restore preserves the existing database', async () => {
  const storage = await freshStorage(new IDBFactory());
  await storage.idbCacheMedicines([{ code: 'SAFE', stock: 435 }]);
  const result = await storage.idbRestoreCoreSnapshotAtomic({
    medicines: [{ code: 'BROKEN', uncloneable: () => {} }], bills: [], dueBills: [], stockTransfers: [], unverifiedReturns: []
  });
  assert.equal(result.success, false);
  assert.deepEqual((await storage.idbGetCachedMedicines()).map(m => m.code), ['SAFE']);
});
