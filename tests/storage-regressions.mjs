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
    for (const name of ['bills', 'medicines', 'due_bills', 'stock_transfers', 'sync_queue', 'backups', 'unverified_returns', 'app_meta']) {
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
