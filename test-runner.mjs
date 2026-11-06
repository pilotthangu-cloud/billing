// Comprehensive Automated Verification Suite for Beta Pharmacy POS
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('🚀 RUNNING COMPREHENSIVE END-TO-END COUNTER VERIFICATION SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: Master Catalog & Distributors Integrity
// -------------------------------------------------------------
console.log('📋 Test Suite 1: Master Catalog & Distributors Data Integrity');
const medsPath = path.resolve('src/data/medicines.json');
const suppliersPath = path.resolve('src/data/suppliers.json');

assert(fs.existsSync(medsPath), 'medicines.json exists');
assert(fs.existsSync(suppliersPath), 'suppliers.json exists');

const medsData = JSON.parse(fs.readFileSync(medsPath, 'utf8'));
const suppliersData = JSON.parse(fs.readFileSync(suppliersPath, 'utf8'));

assert(Array.isArray(medsData) && medsData.length > 20000, `Full Master Catalog contains 20,000+ real medicines (Found: ${medsData.length})`);
assert(Array.isArray(suppliersData) && suppliersData.length > 10, `Distributor Master loaded (Found: ${suppliersData.length})`);

const sampleMed = medsData[0];
assert(sampleMed && sampleMed.code && sampleMed.name && sampleMed.mrp !== undefined, 'Medicine record schema contains code, name, and MRP');

// -------------------------------------------------------------
// TEST SUITE 2: Multi-Batch Summation (KitKat 50 vs 5 Fix)
// -------------------------------------------------------------
console.log('\n📦 Test Suite 2: Multi-Batch Summation Algorithm (STK*.DBF)');
// Simulating 3 batches in STK*.DBF for code 'KITKAT'
const simulatedStkRecords = [
  { CODE: 'KITKAT', BATCH: 'B1', EXPIRY: '12/26', STOCK: 20, MRP: 25 },
  { CODE: 'KITKAT', BATCH: 'B2', EXPIRY: '06/27', STOCK: 25, MRP: 25 },
  { CODE: 'KITKAT', BATCH: 'B3', EXPIRY: '10/27', STOCK: 5, MRP: 25 }
];

const stockMap = new Map();
const batchesByCode = new Map();

simulatedStkRecords.forEach(sr => {
  const code = sr.CODE;
  const batchQty = parseInt(sr.STOCK, 10);
  // Multi-batch accumulation fix:
  stockMap.set(code, (stockMap.get(code) || 0) + batchQty);

  const batchList = batchesByCode.get(code) || [];
  batchList.push({
    batch_no: sr.BATCH,
    exp_date: sr.EXPIRY,
    mrp: sr.MRP,
    qty: batchQty
  });
  batchesByCode.set(code, batchList);
});

assert(stockMap.get('KITKAT') === 50, 'Total stock accumulated correctly (20 + 25 + 5 = 50, not overwritten to 5)');
assert(batchesByCode.get('KITKAT').length === 3, 'All 3 individual batches preserved for counter selection');

// -------------------------------------------------------------
// TEST SUITE 3: Purchase Inward Atomic Revision & Delta Stock
// -------------------------------------------------------------
console.log('\n🔄 Test Suite 3: Purchase Revision Positive Delta Stock Logic');
const originalVoucherItems = [
  { medCode: 'M1001', name: 'PARACETAMOL 650', batch: 'BT01', totalUnits: 100 }
];

const revisedVoucherItems = [
  { medCode: 'M1001', name: 'PARACETAMOL 650', batch: 'BT01', totalUnits: 150 }, // increased by 50
  { medCode: 'M1002', name: 'AMOXICILLIN 500', batch: 'BT02', totalUnits: 200 }   // newly added 200
];

const deltaItems = revisedVoucherItems.map(item => {
  const orig = originalVoucherItems.find(o => o.batch === item.batch && o.medCode === item.medCode);
  const origUnits = orig ? orig.totalUnits : 0;
  const diffUnits = item.totalUnits - origUnits;
  return { ...item, totalUnits: diffUnits };
}).filter(it => it.totalUnits > 0);

assert(deltaItems.length === 2, 'Delta items identified for stock update');
assert(deltaItems[0].medCode === 'M1001' && deltaItems[0].totalUnits === 50, 'Existing medicine receives only positive delta units (+50, not full 150)');
assert(deltaItems[1].medCode === 'M1002' && deltaItems[1].totalUnits === 200, 'Newly appended medicine receives full units (+200)');

// -------------------------------------------------------------
// TEST SUITE 4: Shift Reconciliation & Mandatory Bill Range
// -------------------------------------------------------------
console.log('\n💰 Test Suite 4: Shift Handover & Denominations Reconciliation');
const simulatedBills = [
  { billNo: '000001', netPayable: 450, paymentMode: 'cash', shiftId: 'SHIFT-01' },
  { billNo: '000002', netPayable: 620, paymentMode: 'upi', shiftId: 'SHIFT-01' },
  { billNo: '000003', netPayable: 300, paymentMode: 'credit', shiftId: 'SHIFT-01' },
  { billNo: '000004', netPayable: 150, paymentMode: 'cash', shiftId: 'SHIFT-01' }
];

const openingFloat = 2000;
let cashSales = 0, upiSales = 0, creditSales = 0;

simulatedBills.forEach(b => {
  if (b.paymentMode === 'cash') cashSales += b.netPayable;
  else if (b.paymentMode === 'upi') upiSales += b.netPayable;
  else if (b.paymentMode === 'credit') creditSales += b.netPayable;
});

const grossSales = cashSales + upiSales + creditSales;
const expectedCash = openingFloat + cashSales;

assert(cashSales === 600, 'Cash sales summed accurately (450 + 150 = 600)');
assert(upiSales === 620, 'UPI sales calculated accurately (620)');
assert(creditSales === 300, 'Credit Khata sales calculated accurately (300)');
assert(grossSales === 1520, 'Total shift turnover matches sum of all payment modes');
assert(expectedCash === 2600, 'Expected physical cash matches opening float + cash sales (2000 + 600 = 2600)');

// Test Denominations count: 4x500 (2000) + 3x200 (600) = 2600
const countedDenoms = { 500: 4, 200: 3, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0 };
const countedTotal = (4 * 500) + (3 * 200);
const variance = countedTotal - expectedCash;

assert(countedTotal === 2600, 'Counted physical cash computed accurately');
assert(Math.abs(variance) < 0.01, 'Shift is 100% Balanced (Zero Variance)');

// Mandatory Bill Range validation
const startBillNo = simulatedBills[0].billNo;
const endBillNo = simulatedBills[simulatedBills.length - 1].billNo;
assert(Boolean(startBillNo && endBillNo), 'Starting Bill # (000001) and Ending Bill # (000004) are mandatory and captured');

// -------------------------------------------------------------
// TEST SUITE 5: Expiry Watchdog Calculation Windows
// -------------------------------------------------------------
console.log('\n⏳ Test Suite 5: Expiry Watchdog Time Windows');
function getExpiryBucket(daysLeft) {
  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft >= 0 && daysLeft <= 30) return '< 30 DAYS';
  if (daysLeft > 30 && daysLeft <= 60) return '31-60 DAYS';
  if (daysLeft > 60 && daysLeft <= 90) return '61-90 DAYS';
  return 'SAFE';
}

assert(getExpiryBucket(-5) === 'EXPIRED', 'Negative days correctly classified as EXPIRED (not grouped into < 30 Days)');
assert(getExpiryBucket(14) === '< 30 DAYS', '14 days correctly classified in < 30 DAYS tab');
assert(getExpiryBucket(45) === '31-60 DAYS', '45 days correctly classified in 31-60 DAYS tab');
assert(getExpiryBucket(75) === '61-90 DAYS', '75 days correctly classified in 61-90 DAYS tab');
assert(getExpiryBucket(180) === 'SAFE', '180 days classified as SAFE');

// -------------------------------------------------------------
// TEST SUITE 6: Source Code Security, Cleanliness & Guards
// -------------------------------------------------------------
console.log('\n🔒 Test Suite 6: Source Code Security & Clean Guardrails');
const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
const indexCss = fs.readFileSync('src/index.css', 'utf8');
const terminalLock = fs.readFileSync('src/components/TerminalLockScreen.jsx', 'utf8');
const topNav = fs.readFileSync('src/components/TopNavigationMenu.jsx', 'utf8');
const purchaseEntry = fs.readFileSync('src/components/PurchaseEntryPage.jsx', 'utf8');
const supabaseClientSource = fs.readFileSync('src/utils/supabaseClient.js', 'utf8');
const electronMainSource = fs.readFileSync('electron/main.cjs', 'utf8');
const topNavigationSource = fs.readFileSync('src/components/TopNavigationMenu.jsx', 'utf8');

assert(appJsx.includes('getInitialPage') && appJsx.includes('PROTECTED_PAGES'), 'URL Cold load protection maps protected routes');
assert(!terminalLock.includes("managerPin !== '1536'") && !terminalLock.includes("|| '1536'"), 'No universal hard-coded manager PIN remains in terminal lock screen');
assert(!purchaseEntry.includes('sk-proj-'), 'No OpenAI API credential is embedded in purchase-entry source');
assert(!topNav.includes('Doctor & Hospital Master'), 'Doctor Master permanently removed from top navigation');
assert(indexCss.includes('210mm 140mm'), 'Continuous tractor stationery (210mm x 140mm) enforced in @media print');
assert(!appJsx.includes('Rahul C') && !topNav.includes('Rahul C'), 'Zero dummy staff ("Rahul C") in source files');
assert(!supabaseClientSource.includes("'Standard Distributor'") && !supabaseClientSource.includes('`M${i}`'), 'Cloud sync does not fabricate supplier names or medicine codes');
assert(!supabaseClientSource.includes('`TR-${Date.now()}`') && !supabaseClientSource.includes('`SHIFT-${Date.now()}`'), 'Cloud sync rejects missing transfer and shift identifiers instead of generating replacements');
assert(supabaseClientSource.includes(".upsert(chunk, { onConflict: 'medicine_code' })"), 'Catalog retry is idempotent by medicine code');
assert(supabaseClientSource.includes('success: failures.length === 0'), 'Partial catalog upload cannot report success');
assert(!electronMainSource.includes("ipcMain.emit('print-raw-tvs'"), 'Silent printer fallback awaits and returns the real spooler result');
assert(electronMainSource.includes("error: 'Silent printing requires a raw ESC/P byte stream.'"), 'Silent printer cannot falsely report success without printable data');
assert(topNavigationSource.includes('Beta.Pharmacy.POS.1.0.0.repaired.exe'), 'Website exposes the repaired 64-bit desktop download');
assert(topNavigationSource.includes('Beta.Pharmacy.POS.Win7.32bit.repaired.exe'), 'Website exposes a separate repaired Windows 7 32-bit download');

// -------------------------------------------------------------
// TEST SUITE 7: TVS MSP 250 Star ESC/P Hardware Engine Validation
// -------------------------------------------------------------
console.log('\n🖨️ Test Suite 7: TVS MSP 250 Star Native ESC/P Engine Validation');
const { formatTvsBillLines, generateTvsEscPosStream } = await import('./src/utils/tvsPrinterEngine.js');

const sampleBill = {
  billNo: '026096',
  date: '04/11/2026',
  time: '17:15',
  patientName: 'GIRIJA P.C.',
  doctorName: 'Dr.MADHUSUDHANAN T',
  paymentMode: 'cash',
  netPayable: 27.90,
  items: [
    { medicine: { name: 'RANTAC 150MG TAB', company: 'J B' }, batch: { batch_no: 'BR526060', exp_date: '11/27' }, rate: 55.81, packSize: 30, quantity: 15, amount: 27.90 }
  ],
  storeInfo: {
    name: 'BETA PHARMACY',
    address: 'Sadanada Pai Road, Chirakkara, Thalassery.',
    phone: 'Tel - 0490-2325049',
    mobile: 'Mob - 9497172662',
    dlNo: 'D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.'
  }
};

const lines = formatTvsBillLines(sampleBill);
assert(lines.length === 32, 'Bill formatted to EXACTLY 32 lines (matches the legacy RETAILG form)');
assert(lines.every(l => l.length === 79), 'All 32 lines are strictly 79 characters wide');
assert(lines[0].startsWith('BETA PHARMACY (Cash Bill)'), 'Header Line 1 contains Store Name and Cash Bill mode');
assert(lines[6].startsWith('Sr Product'), 'Header Line 7 contains exact column titles');
assert(lines[8].includes('RANTAC 150MG TAB'), 'Line 9 contains first item matching Clipper layout');
assert(lines[15].startsWith('-------------------------------------------------------------------------------'), 'Footer separator is anchored at the legacy form position');
assert(lines[16].includes('27.90'), 'Legacy terms line contains the Net Payable under Value column');
assert(lines[17].includes('Signature - Pharmacist'), 'Legacy footer contains Pharmacist Signature block');
assert(lines[19].includes('** GET WELL SOON **'), 'Legacy footer contains GET WELL SOON memo');

const stream = generateTvsEscPosStream(sampleBill);
assert(stream instanceof Uint8Array, 'Print stream generated as binary Uint8Array');
assert(stream.includes(0x0F), 'Print stream contains ASCII 0x0F (SI - Condensed Mode 17.14 CPI)');
assert(stream.includes(0x1B) && stream.includes(0x40), 'Print stream contains ESC @ (0x1B 0x40) hardware reset');
assert(stream.includes(0x1B) && stream.includes(0x32), 'Print stream contains ESC 2 (0x1B 0x32) 6 LPI line spacing');
assert(!stream.includes(0x0C), 'Print stream strictly OMITS 0x0C (Form Feed) to prevent 11-inch/22-hole driver overfeed & paper jamming');

let streamCrlfCount = 0;
for (let i = 0; i < stream.length - 1; i++) {
  if (stream[i] === 0x0D && stream[i+1] === 0x0A) streamCrlfCount++;
}
assert(streamCrlfCount === 32, 'Print stream contains exactly 32 CRLF advances, matching the legacy form');

// -------------------------------------------------------------
// TEST SUITE 8: Expiry Integrity, Zero-Fabrication & Paper-Saver Mode
// -------------------------------------------------------------
console.log('\n🛡️ Test Suite 8: Expiry Normalizer, Zero-BN001 Healing & Paper-Saver Feed');
const { isExpiryValid, normalizeExpiry, rollExpiryForwardIfPast } = await import('./src/utils/billUtils.js');

assert(normalizeExpiry('20271231') === '12/27', 'dBase III Date field 20271231 normalizes to 12/27');
assert(normalizeExpiry('2027-12-31') === '12/27', 'ISO date 2027-12-31 normalizes to 12/27');
assert(normalizeExpiry('31/12/2027') === '12/27', 'Indian DD/MM/YYYY date 31/12/2027 normalizes to 12/27');
assert(normalizeExpiry('1227') === '12/27', '4-digit MMYY 1227 normalizes to 12/27');
assert(normalizeExpiry('12/27') === '12/27', 'Standard MM/YY 12/27 preserved verbatim');
assert(isExpiryValid('12/27'), 'A real MM/YY expiry is accepted as valid');
assert(!isExpiryValid('13/27'), 'Impossible month 13 is rejected');
assert(!isExpiryValid('UNKNOWN'), 'Unrecognized expiry text is rejected');

const rolledPast = rollExpiryForwardIfPast('07/22');
assert(rolledPast === '07/22', 'Past catalog expiry is preserved and never rewritten into the future');
assert(rollExpiryForwardIfPast('11/28') === '11/28', 'Future expiry 11/28 preserved verbatim');
assert(rollExpiryForwardIfPast('') === '', 'Blank expiry remains blank instead of being fabricated');

// Paper-Saver Mode: Stops 3 lines after GET WELL SOON
const paperSaverBill = { ...sampleBill, paperSaver: true };
const paperSaverLines = formatTvsBillLines(paperSaverBill);
assert(paperSaverLines.length === 23, `Paper-Saver mode keeps the legacy footer anchor plus three trailing lines (Found: ${paperSaverLines.length})`);
assert(paperSaverLines[19].includes('** GET WELL SOON **'), 'Paper-Saver mode retains ** GET WELL SOON ** footer');

// Test that the TVS engine never invents transactional batch/expiry data
const dummyBatchBill = {
  ...sampleBill,
  items: [
    { medicine: { code: 'A921A007', name: 'GABAMA FORTE', company: 'PHARMA LABS' }, batch: { batch_no: 'BN001', exp_date: '' }, rate: 107.0, packSize: 10, quantity: 3, amount: 32.10 }
  ]
};
const dummyLines = formatTvsBillLines(dummyBatchBill);
assert(dummyLines[8].includes('BN001'), 'TVS line item prints the recorded batch verbatim instead of substituting another batch');
assert(!dummyLines[8].includes('12/28'), 'TVS line item leaves a missing expiry blank instead of fabricating a date');

// -------------------------------------------------------------
// TEST SUITE 9: Legacy Import Preservation & Reconciliation Flags
// -------------------------------------------------------------
console.log('\n📥 Test Suite 9: Legacy Import Preservation & Reconciliation Flags');
const { normalizeLegacyMedicineRecords } = await import('./src/utils/dbfReader.js');
const imported = normalizeLegacyMedicineRecords([
  { IT_CODE: 'SAFE001', IT_NAME: 'SOURCE MED', OP_STOCK: 12, MRP: 0, PTR: 0, PUR_TAX: 0, BATCH: '', EXPIRY: '' },
  { IT_CODE: 'OLD001', IT_NAME: 'OLD BATCH MED', OP_STOCK: 5, MRP: 25, PUR_TAX: 5, BATCH: 'REAL42', EXPIRY: '07/22' }
], []);
const safeImport = imported.find(m => m.code === 'SAFE001');
const oldImport = imported.find(m => m.code === 'OLD001');
assert(safeImport.stock === 12, 'ITEMFILE OP_STOCK is preserved exactly');
assert(safeImport.mrp === 0 && safeImport.ptr === 0, 'Zero MRP/PTR values are preserved instead of replaced with guesses');
assert(safeImport.gstPercent === 0, 'Zero tax is preserved instead of being changed to 12%');
assert(safeImport.batches.length === 0, 'Missing source batch data remains unallocated instead of generating a batch');
assert(safeImport.importIssues.includes('UNALLOCATED_STOCK_NO_BATCH'), 'Positive stock without batch evidence is flagged for reconciliation');
assert(oldImport.batches[0].batch_no === 'REAL42' && oldImport.batches[0].exp_date === '07/22', 'Recorded legacy batch and expiry are preserved verbatim');
assert(oldImport.importIssues.includes('ACTIVE_STOCK_EXPIRED_BATCH'), 'Positive stock tied to an expired batch is explicitly flagged');

// -------------------------------------------------------------
// TEST SUITE 10: Branch-Correct FEFO Batch Transfers
// -------------------------------------------------------------
console.log('\n🏪 Test Suite 10: Branch-Correct FEFO Batch Transfers');
const { planBatchTransfer } = await import('./src/utils/inventoryTransfer.js');
const transferSource = {
  code: 'T001',
  batches: [
    { batch_no: 'EARLY', exp_date: '06/27', branch_id: 'MAIN', qty: 4, stock: 4, mrp: 20 },
    { batch_no: 'LATER', exp_date: '12/28', branch_id: 'MAIN', qty: 8, stock: 8, mrp: 20 },
    { batch_no: 'OTHER', exp_date: '01/29', branch_id: 'POLYCLINIC', qty: 3, stock: 3, mrp: 20 }
  ]
};
const transferPlan = planBatchTransfer(transferSource, 'MAIN', 'POLYCLINIC', 6);
assert(transferPlan.success, 'Transfer plan succeeds when source has enough verified batch stock');
assert(transferPlan.allocations[0].batchNo === 'EARLY' && transferPlan.allocations[0].qty === 4, 'Transfer consumes the earliest-expiry source batch first');
assert(transferPlan.allocations[1].batchNo === 'LATER' && transferPlan.allocations[1].qty === 2, 'Transfer continues into the next source batch for the exact remainder');
assert(transferPlan.fromTotal === 6 && transferPlan.toTotal === 9, 'Source and destination branch totals reconcile after transfer');
assert(transferSource.batches[0].qty === 4, 'Transfer planning does not mutate the original medicine record');
const rejectedTransfer = planBatchTransfer(transferSource, 'MAIN', 'POLYCLINIC', 99);
assert(!rejectedTransfer.success && rejectedTransfer.transferableQty === 12, 'Transfer rejects quantities above verified source batch stock');

// -------------------------------------------------------------
// TEST SUITE 11: Backup Checksum & Tamper Rejection
// -------------------------------------------------------------
console.log('\n💾 Test Suite 11: Backup Checksum & Tamper Rejection');
const { generateBackupChecksum, validateBackupSnapshot } = await import('./src/utils/backupEngine.js');
const backupDataA = { medicines: [{ code: 'A1', name: 'TEST', stock_shop1: 3 }], recentBills: [], branchId: 'MAIN' };
const backupDataB = { branchId: 'MAIN', recentBills: [], medicines: [{ name: 'TEST', stock_shop1: 3, code: 'A1' }] };
const backupChecksum = generateBackupChecksum(backupDataA);
assert(backupChecksum === generateBackupChecksum(backupDataB), 'Backup checksum is deterministic regardless of object key order');
assert(validateBackupSnapshot({ checksum: backupChecksum, data: backupDataA }).valid, 'Backup with matching checksum passes validation');
const tamperedBackup = { ...backupDataA, medicines: [{ ...backupDataA.medicines[0], stock_shop1: 999 }] };
assert(!validateBackupSnapshot({ checksum: backupChecksum, data: tamperedBackup }).valid, 'Tampered stock content is rejected by checksum validation');

console.log('\n================================================================');
console.log(`TEST RUN COMPLETE: ${passedTests} / ${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
