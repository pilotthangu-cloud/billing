import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLegacyMedicineRecords, processDbfFolderFiles } from '../src/utils/dbfReader.js';
import { reconcileStockSample, stockComparisonCsv } from '../src/utils/stockReconciliation.js';
import { formatTvsBillLines, generateTvsEscPosStream } from '../src/utils/tvsPrinterEngine.js';

test('DOLO 450 versus reference 435 blocks sample verification with exact +15 difference', () => {
  const result = reconcileStockSample([{ code: 'T241D060', name: 'DOLO 650', stock: 450 }], { T241D060: 435 });
  assert.equal(result.ready, false);
  assert.equal(result.mismatches[0].difference, 15);
});

test('three matching positive products pass; blank input, zero-only and mismatches fail', () => {
  const meds = [{ code: 'A', stock: 435 }, { code: 'B', stock: 25 }, { code: 'C', stock: 3 }];
  assert.equal(reconcileStockSample(meds, { A: 435, B: 25, C: 3 }).ready, true);
  assert.equal(reconcileStockSample(meds, { A: '', B: 25, C: 3 }).ready, false);
  assert.equal(reconcileStockSample(meds, { A: 435, B: 25, C: 2 }).ready, false);
  assert.equal(reconcileStockSample([{ code: 'Z', stock: 0 }], { Z: 0 }).ready, false);
});

test('comparison CSV reports differences and neutralizes spreadsheet formulas', () => {
  const csv = stockComparisonCsv([{ code: 'A', name: '=cmd()', stock: 450 }], { A: 435 });
  assert.match(csv, /"15"/);
  assert.match(csv, /'=cmd/);
});

test('empty snapshot batch evidence never inherits item-master batch with all stock', () => {
  const [med] = normalizeLegacyMedicineRecords([{ IT_CODE: 'A', IT_NAME: 'A', STOCK: 450, BATCHES: [], BATCH: 'LATESTONLY', EXPIRY: '12/30' }], []);
  assert.equal(med.stock, 450);
  assert.deepEqual(med.batches, []);
  assert.ok(med.importIssues.includes('UNALLOCATED_STOCK_NO_BATCH'));
});

test('duplicate rows reconcile batch quantity and preserve different expiries', () => {
  const [med] = normalizeLegacyMedicineRecords([
    { IT_CODE: 'A', IT_NAME: 'A', STOCK: 10, BATCH: 'B1', EXPIRY: '12/30', MRP: 10 },
    { IT_CODE: 'A', IT_NAME: 'A', STOCK: 15, BATCH: 'B1', EXPIRY: '12/30', MRP: 10 },
    { IT_CODE: 'A', IT_NAME: 'A', STOCK: 5, BATCH: 'B1', EXPIRY: '11/30', MRP: 10 }
  ], []);
  assert.equal(med.stock, 30);
  assert.equal(med.batches.length, 2);
  assert.equal(med.batches.reduce((n, b) => n + b.qty, 0), 30);
});

test('compact receipts add exactly one line per extra item and two trailing lines', () => {
  const item = { medicine: { name: 'DOLO 650' }, batch: { batch_no: 'B1', exp_date: '12/30' }, quantity: 1, amount: 10 };
  const short = formatTvsBillLines({ items: [item] });
  const long = formatTvsBillLines({ items: Array.from({ length: 20 }, () => item) });
  assert.equal(long.length - short.length, 19);
  const footer = short.findIndex(line => line.includes('GET WELL SOON'));
  assert.equal(short.length - footer - 1, 2);
  assert.ok(short.slice(-2).every(line => line.trim() === ''));
  assert.ok(!generateTvsEscPosStream({ items: [item] }).includes(12));
  assert.equal(formatTvsBillLines({ items: [item], paperSaver: false }).length, 32);
});

// Real DBF bytes exercise parsing, folder selection, stock joins and provenance.
function dbfFile(name, folder, rows) {
  const columns = Object.keys(rows[0]).map(key => ({ key, type: typeof rows[0][key] === 'number' ? 'N' : 'C', length: 32 }));
  const headerLength = 32 + columns.length * 32 + 1;
  const recordLength = 1 + columns.reduce((n, c) => n + c.length, 0);
  const buffer = Buffer.alloc(headerLength + recordLength * rows.length + 1, 32);
  buffer[0] = 3; buffer[1] = 126; buffer[2] = 11; buffer[3] = 6;
  buffer.writeUInt32LE(rows.length, 4); buffer.writeUInt16LE(headerLength, 8); buffer.writeUInt16LE(recordLength, 10);
  columns.forEach((column, i) => {
    const offset = 32 + i * 32;
    buffer.fill(0, offset, offset + 32);
    buffer.write(column.key, offset, 'ascii'); buffer[offset + 11] = column.type.charCodeAt(0); buffer[offset + 16] = column.length;
  });
  buffer[headerLength - 1] = 13;
  rows.forEach((row, i) => {
    let offset = headerLength + i * recordLength + 1;
    for (const c of columns) { buffer.write(String(row[c.key]).padEnd(c.length), offset, c.length, 'ascii'); offset += c.length; }
  });
  buffer[buffer.length - 1] = 26;
  return { name, webkitRelativePath: `${folder}/${name}`, lastModified: Date.UTC(2026, 10, 6), arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
}

test('complete DBF folder pipeline ignores DATA-OLD and joins only current monthly stock', async () => {
  const result = await processDbfFolderFiles([
    dbfFile('ITEMFILE.DBF', 'RETAILG4/DATA', [{ IT_CODE: 'DOLO', IT_NAME: 'DOLO 650', OP_STOCK: 0, MRP: 32.28 }]),
    dbfFile('ITEMFILE.DBF', 'RETAILG4/DATA-OLD', [{ IT_CODE: 'DOLO', IT_NAME: 'DOLO 650', OP_STOCK: 999, MRP: 32.28 }]),
    dbfFile('ITEM_DET.DBF', 'RETAILG4/DATA', [{ IT_CODE: 'DOLO', STOCK: 123 }]),
    dbfFile('STK2610.DBF', 'RETAILG4/DATA', [{ IT_CODE: 'DOLO', STOCK: 450, BATCH: 'B1', EXPIRY: '12/30' }]),
    dbfFile('STK2611.DBF', 'RETAILG4/DATA', [{ IT_CODE: 'DOLO', STOCK: 435, BATCH: 'B1', EXPIRY: '12/30' }]),
    dbfFile('STK2612.DBF', 'RETAILG4/DATA-OLD', [{ IT_CODE: 'DOLO', STOCK: 999, BATCH: 'B1', EXPIRY: '12/30' }])
  ]);
  assert.equal(result.totalStock, 435);
  assert.equal(result.medicines[0].batches[0].qty, 435);
  assert.equal(result.stockSource, 'RETAILG4/DATA/STK2611.DBF');
  assert.equal(result.medicines[0].stockProvenance.liveBalanceVerified, false);
});

test('unrecognized stock quantity schema stops rather than silently zeroing inventory', async () => {
  await assert.rejects(processDbfFolderFiles([
    dbfFile('ITEMFILE.DBF', 'DATA', [{ IT_CODE: 'DOLO', IT_NAME: 'DOLO 650', OP_STOCK: 435 }]),
    dbfFile('STK2611.DBF', 'DATA', [{ IT_CODE: 'DOLO', UNKNOWN: 435 }])
  ]), /no valid stock quantity/);
});

test('built-in catalog metadata cannot fabricate manufacturer, GST, HSN or schedule during DBF import', () => {
  const [dolo] = normalizeLegacyMedicineRecords([{
    IT_CODE: 'T241D060',
    IT_NAME: 'DOLO 650',
    RO_QTY: '15',
    OP_STOCK: 0,
    MRP: 32.28,
    PTR: 5,
    PER: 15,
    RACK: 'O4'
  }]);
  assert.equal(dolo.company, '');
  assert.equal(dolo.generic, '');
  assert.equal(dolo.gstPercent, null);
  assert.equal(dolo.hsn, '');
  assert.equal(dolo.schedule, '');
  assert.ok(dolo.importIssues.includes('MISSING_GST'));
});
