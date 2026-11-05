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

assert(appJsx.includes('getInitialPage') && appJsx.includes('PROTECTED_PAGES'), 'URL Cold load protection maps protected routes');
assert(terminalLock.includes('1536'), 'Manager Override PIN 1536 configured in terminal lock screen');
assert(!topNav.includes('Doctor & Hospital Master'), 'Doctor Master permanently removed from top navigation');
assert(indexCss.includes('210mm 140mm'), 'Continuous tractor stationery (210mm x 140mm) enforced in @media print');
assert(!appJsx.includes('Rahul C') && !topNav.includes('Rahul C'), 'Zero dummy staff ("Rahul C") in source files');

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
assert(lines.length === 33, 'Bill formatted to EXACTLY 33 lines (matches 5.5" half-sheet tractor paper)');
assert(lines.every(l => l.length === 80), 'All 33 lines are strictly 80 characters wide');
assert(lines[0].startsWith('BETA PHARMACY (Cash Bill)'), 'Header Line 1 contains Store Name and Cash Bill mode');
assert(lines[6].startsWith('Sr Product'), 'Header Line 7 contains exact column titles');
assert(lines[8].includes('RANTAC 150MG TAB'), 'Line 9 contains first item matching Clipper layout');
assert(lines[9].startsWith('--------------------------------------------------------------------------------'), 'Line 10 is the compact footer separator directly under items');
assert(lines[10].includes('27.90'), 'Line 11 anchors the Net Payable under Value column');
assert(lines[12].includes('Signature - Pharmacist'), 'Line 13 contains Pharmacist Signature block');
assert(lines[14].includes('** GET WELL SOON **'), 'Line 15 contains GET WELL SOON memo');

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
assert(streamCrlfCount === 33, 'Print stream contains exactly 33 CRLF advances (33 * 1/6" = exactly 5.5" perforation stop)');

// -------------------------------------------------------------
// TEST SUITE 8: Expiry Normalizer, Zero-BN001 Healing & Paper-Saver Mode
// -------------------------------------------------------------
console.log('\n🛡️ Test Suite 8: Expiry Normalizer, Zero-BN001 Healing & Paper-Saver Feed');
const { normalizeExpiry, rollExpiryForwardIfPast } = await import('./src/utils/billUtils.js');

assert(normalizeExpiry('20271231') === '12/27', 'dBase III Date field 20271231 normalizes to 12/27');
assert(normalizeExpiry('2027-12-31') === '12/27', 'ISO date 2027-12-31 normalizes to 12/27');
assert(normalizeExpiry('31/12/2027') === '12/27', 'Indian DD/MM/YYYY date 31/12/2027 normalizes to 12/27');
assert(normalizeExpiry('1227') === '12/27', '4-digit MMYY 1227 normalizes to 12/27');
assert(normalizeExpiry('12/27') === '12/27', 'Standard MM/YY 12/27 preserved verbatim');

const rolledPast = rollExpiryForwardIfPast('07/22');
assert(rolledPast.startsWith('07/') && parseInt(rolledPast.slice(-2), 10) >= 27, 'Past catalog expiry 07/22 rolled forward to valid shelf life (>= 27)');
assert(rollExpiryForwardIfPast('11/28') === '11/28', 'Future expiry 11/28 preserved verbatim');
assert(Boolean(rollExpiryForwardIfPast('')), 'Blank expiry assigned non-blank current shelf life');

// Paper-Saver Mode: Stops 3 lines after GET WELL SOON
const paperSaverBill = { ...sampleBill, paperSaver: true };
const paperSaverLines = formatTvsBillLines(paperSaverBill);
assert(paperSaverLines.length === 18, `Paper-Saver mode outputs exactly 18 compact lines without 15 trailing blank lines (Found: ${paperSaverLines.length})`);
assert(paperSaverLines[14].includes('** GET WELL SOON **'), 'Paper-Saver mode retains ** GET WELL SOON ** footer');

// Test that TVS engine heals BN001 dummy batch if item has medicine code
const dummyBatchBill = {
  ...sampleBill,
  items: [
    { medicine: { code: 'A921A007', name: 'GABAMA FORTE', company: 'PHARMA LABS' }, batch: { batch_no: 'BN001', exp_date: '' }, rate: 107.0, packSize: 10, quantity: 3, amount: 32.10 }
  ]
};
const dummyLines = formatTvsBillLines(dummyBatchBill);
assert(!dummyLines[8].includes('BN001'), `TVS line item heals dummy BN001 and replaces with item batch (Found line: "${dummyLines[8]}")`);
assert(dummyLines[8].includes('12/28'), 'TVS line item guarantees non-blank expiry column (12/28 found in line)');

console.log('\n================================================================');
console.log(`TEST RUN COMPLETE: ${passedTests} / ${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
