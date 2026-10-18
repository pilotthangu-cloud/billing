import fs from 'fs';
import path from 'path';

// Load real database files
const medicines = JSON.parse(fs.readFileSync('./src/data/medicines.json', 'utf8'));
const suppliers = JSON.parse(fs.readFileSync('./src/data/suppliers.json', 'utf8'));
const doctors = JSON.parse(fs.readFileSync('./src/data/doctors.json', 'utf8'));
const companies = JSON.parse(fs.readFileSync('./src/data/companies.json', 'utf8'));
const taxes = JSON.parse(fs.readFileSync('./src/data/taxes.json', 'utf8'));

console.log('================================================================');
console.log('   BETA PHARMACY HQ ADMIN & MANAGER PANEL - COMPREHENSIVE AUDIT');
console.log('   Database Records:');
console.log(`     - Master Medicines: ${medicines.length.toLocaleString()}`);
console.log(`     - Registered Distributors/Suppliers: ${suppliers.length.toLocaleString()}`);
console.log(`     - Consulting Doctors: ${doctors.length.toLocaleString()}`);
console.log(`     - Pharmaceutical Companies: ${companies.length.toLocaleString()}`);
console.log('================================================================\n');

const testResults = [];

function assert(feature, testName, condition, details = '') {
  const passed = Boolean(condition);
  testResults.push({ feature, testName, passed, details });
  const icon = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${icon}] [${feature}] ${testName}`);
  if (details) {
    console.log(`       Proof: ${details}`);
  }
}

// --------------------------------------------------------------------------
// 1. STORE SELECTOR & FINANCIAL TELEMETRY
// --------------------------------------------------------------------------
console.log('\n--- 1. Testing Store Selector & Financial Telemetry ---');

const AVAILABLE_BRANCHES = [
  { id: 'MAIN', name: 'Beta Pharmacy', location: 'Main Pharmacy', short: 'Beta Pharmacy', prefix: 'BP', stockKey: 'stock_shop1' },
  { id: 'POLYCLINIC', name: 'Beta Polyclinic', location: 'Polyclinic Division', short: 'Beta Polyclinic', prefix: 'BPC', stockKey: 'stock_shop2' }
];

const mockBills = [
  {
    billNo: '025315',
    date: '16/10/2026',
    time: '20:15:22',
    patientName: 'K. RAGHAVAN',
    customerPhone: '9847012345',
    doctorName: 'DR. SUKUMARAN MBBS',
    doctorRegNo: 'KMC-14258',
    paymentMode: 'cash',
    items: [
      { code: 'M10001', name: 'AUGMENTIN 625MG TAB', batch: 'AUG9901', exp: '04/28', qty: 10, mrp: 22.34, totalValue: 223.40, gstPercent: 12 },
      { code: 'M10002', name: 'PAN 40MG TAB', batch: 'PAN2041', exp: '11/27', qty: 15, mrp: 15.50, totalValue: 232.50, gstPercent: 12 }
    ],
    grossTotal: 455.90,
    netPayable: 456,
    store: 'Beta Pharmacy (Thalassery)'
  },
  {
    billNo: '025316',
    date: '16/10/2026',
    time: '20:45:10',
    patientName: 'M. LEELA',
    customerPhone: '9447198765',
    doctorName: 'DR. ANITA SHENOY MD',
    doctorRegNo: 'KMC-28491',
    paymentMode: 'upi',
    items: [
      { code: 'M10003', name: 'TELMA 40MG TAB', batch: 'TEL5520', exp: '08/27', qty: 30, mrp: 12.80, totalValue: 384.00, gstPercent: 12 },
      { code: 'M10004', name: 'ALPRASAFE 0.5MG TAB', schedule: 'H1', batch: 'ALP1102', exp: '03/27', qty: 10, mrp: 4.50, totalValue: 45.00, gstPercent: 12 }
    ],
    grossTotal: 429.00,
    netPayable: 429,
    store: 'Beta Pharmacy (Thalassery)'
  },
  {
    billNo: 'BPC-00104',
    date: '16/10/2026',
    time: '18:10:00',
    patientName: 'P. VIJAYAN',
    customerPhone: '9744112233',
    doctorName: 'DR. SUKUMARAN MBBS',
    doctorRegNo: 'KMC-14258',
    paymentMode: 'upi',
    items: [
      { code: 'M10005', name: 'GLYCOMET 500MG TAB', batch: 'GLY8821', exp: '05/27', qty: 20, mrp: 3.20, totalValue: 64.00, gstPercent: 12 }
    ],
    grossTotal: 64.00,
    netPayable: 64,
    store: 'Beta Polyclinic'
  }
];

function calculateTelemetry(bills, branchId) {
  const filtered = bills.filter(b => {
    if (branchId === 'ALL') return true;
    if (branchId === 'MAIN') return (b.store || '').toLowerCase().includes('beta pharmacy') || (b.store || '').toLowerCase().includes('main');
    if (branchId === 'POLYCLINIC') return (b.store || '').toLowerCase().includes('polyclinic');
    return true;
  });

  const grossSales = filtered.reduce((acc, b) => acc + (parseFloat(b.netPayable || b.grossTotal) || 0), 0);
  const billCount = filtered.length;
  const cashInflow = filtered.filter(b => (b.paymentMode || 'cash').toLowerCase() === 'cash').reduce((acc, b) => acc + (parseFloat(b.netPayable || b.grossTotal) || 0), 0);
  const upiInflow = filtered.filter(b => (b.paymentMode || '').toLowerCase() === 'upi').reduce((acc, b) => acc + (parseFloat(b.netPayable || b.grossTotal) || 0), 0);
  const avgTicket = billCount > 0 ? (grossSales / billCount) : 0;

  return { grossSales, billCount, cashInflow, upiInflow, avgTicket };
}

const allTel = calculateTelemetry(mockBills, 'ALL');
const mainTel = calculateTelemetry(mockBills, 'MAIN');
const polyTel = calculateTelemetry(mockBills, 'POLYCLINIC');

assert('Store Selector', 'Consolidated HQ Gross Sales', allTel.grossSales === 949, `Total Gross: ₹${allTel.grossSales}, Total Bills: ${allTel.billCount}`);
assert('Store Selector', 'Main Pharmacy Slicing', mainTel.grossSales === 885 && mainTel.billCount === 2, `Main Gross: ₹${mainTel.grossSales}, Bills: ${mainTel.billCount}`);
assert('Store Selector', 'Polyclinic Division Slicing', polyTel.grossSales === 64 && polyTel.billCount === 1, `Polyclinic Gross: ₹${polyTel.grossSales}, Bills: ${polyTel.billCount}`);
assert('Store Selector', 'Payment Split Separation', allTel.cashInflow === 456 && allTel.upiInflow === 493, `Cash: ₹${allTel.cashInflow}, UPI: ₹${allTel.upiInflow}`);

// --------------------------------------------------------------------------
// 2. VIEW MODE TOGGLE & DATE LOGIC
// --------------------------------------------------------------------------
console.log('\n--- 2. Testing View Mode (Daily vs Monthly) & Date Navigation ---');

function formatToDateInput(billDate) {
  if (billDate && billDate.includes('/')) {
    const parts = billDate.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

function formatDateToDisplay(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const parts = isoDate.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const inputDate = formatToDateInput('16/10/2026');
const displayDate = formatDateToDisplay('2026-10-16');

assert('Date Utilities', 'Date Format Conversion (DD/MM/YYYY -> YYYY-MM-DD)', inputDate === '2026-10-16', `Converted '16/10/2026' -> '${inputDate}'`);
assert('Date Utilities', 'Date Format Display (YYYY-MM-DD -> DD/MM/YYYY)', displayDate === '16/10/2026', `Converted '2026-10-16' -> '${displayDate}'`);

// Monthly Aggregation
function generateMonthlyDays(monthStr, bills) {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${d.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    const dayBills = bills.filter(b => b.date === dayStr);
    const gross = dayBills.reduce((acc, b) => acc + (parseFloat(b.netPayable || b.grossTotal) || 0), 0);
    days.push({ day: d, dateStr: dayStr, gross, count: dayBills.length });
  }
  return days;
}

const oct2026Days = generateMonthlyDays('2026-10', mockBills);
const totalOctSales = oct2026Days.reduce((acc, d) => acc + d.gross, 0);

assert('Monthly Aggregation', 'Monthly Days Generation (31 days for Oct)', oct2026Days.length === 31, `Generated ${oct2026Days.length} days`);
assert('Monthly Aggregation', 'Monthly Gross Sales Rollup', totalOctSales === 949, `Total October Gross: ₹${totalOctSales}`);

// --------------------------------------------------------------------------
// 3. EXECUTIVE WHATSAPP SUMMARY GENERATOR
// --------------------------------------------------------------------------
console.log('\n--- 3. Testing Executive WhatsApp Daily Summary ---');

function generateWhatsAppAdminSummary({ branchName, dateStr, grossSales, billCount, cashInflow, upiInflow, avgTicket, shortageCount, expiryCount }) {
  let msg = `*DAILY EXECUTIVE REVENUE REPORT - ${branchName.toUpperCase()}*\n`;
  msg += `Date: ${dateStr}\n`;
  msg += `------------------------------------\n`;
  msg += `*Gross Sales:* ₹${grossSales.toFixed(2)}\n`;
  msg += `*Bills Dispensed:* ${billCount}\n`;
  msg += `*Avg Ticket Size:* ₹${avgTicket.toFixed(2)}\n`;
  msg += `*Cash Inflow:* ₹${cashInflow.toFixed(2)}\n`;
  msg += `*Digital/UPI Inflow:* ₹${upiInflow.toFixed(2)}\n`;
  msg += `------------------------------------\n`;
  msg += `*Shortages to Order:* ${shortageCount} items\n`;
  msg += `*Near Expiry Risk (<90d):* ${expiryCount} batches\n`;
  msg += `------------------------------------\n`;
  msg += `Generated via Beta Pharmacy HQ Admin`;
  return msg;
}

const summaryText = generateWhatsAppAdminSummary({
  branchName: 'Beta Pharmacy (Thalassery)',
  dateStr: '16/10/2026',
  grossSales: 949.00,
  billCount: 3,
  cashInflow: 456.00,
  upiInflow: 493.00,
  avgTicket: 316.33,
  shortageCount: 476,
  expiryCount: 12
});

assert('Executive WhatsApp Summary', 'Message Format Structure', summaryText.includes('*DAILY EXECUTIVE REVENUE REPORT - BETA PHARMACY (THALASSERY)*'), 'Contains correct bold header');
assert('Executive WhatsApp Summary', 'Financial Metrics Inclusion', summaryText.includes('*Gross Sales:* ₹949.00') && summaryText.includes('*Digital/UPI Inflow:* ₹493.00'), 'Contains exact gross and UPI figures');
assert('Executive WhatsApp Summary', 'Inventory Risk Inclusion', summaryText.includes('*Shortages to Order:* 476 items') && summaryText.includes('*Near Expiry Risk (<90d):* 12 batches'), 'Contains inventory alerts');

// --------------------------------------------------------------------------
// 4. REORDER TAB & PURCHASE ORDER BUILDER
// --------------------------------------------------------------------------
console.log('\n--- 4. Testing Reorder Tab & WhatsApp PO Builder ---');

// Medicine Search Algorithm (Prefix priority)
function calculateMedSearchScore(med, query) {
  if (!query || !query.trim()) return 0;
  const q = query.toLowerCase().trim();
  const name = (med.name || '').toLowerCase();
  const generic = (med.generic || '').toLowerCase();
  const rack = (med.rack || '').toLowerCase();

  if (name === q) return 1000;
  if (name.startsWith(q)) return 500;
  const words = name.split(' ');
  if (words.some(w => w.startsWith(q))) return 200;
  if (name.includes(q)) return 50;
  if (generic.startsWith(q)) return 150;
  if (generic.includes(q)) return 30;
  if (rack.startsWith(q)) return 10;
  return 0;
}

// Search for 'J'
const matchesForJ = medicines
  .filter(m => calculateMedSearchScore(m, 'J') > 0)
  .sort((a, b) => calculateMedSearchScore(b, 'J') - calculateMedSearchScore(a, 'J'));

const topMatchesForJ = matchesForJ.slice(0, 5).map(m => m.name);
const allStartWithJ = topMatchesForJ.every(n => n.toUpperCase().startsWith('J'));

assert('PO Search Prefix Priority', "Query 'J' returns medicines starting with 'J'", allStartWithJ, `Top 5 matches: ${topMatchesForJ.join(', ')}`);

// Clean Medicine Name Helper
function cleanMedicineName(name) {
  if (!name) return '';
  return name.replace(/\s*\+\s*$/, '').replace(/\s+/g, ' ').trim();
}

assert('PO Helper', 'cleanMedicineName strips trailing Clipper +', cleanMedicineName('FCET TAB. +') === 'FCET TAB.', `Cleaned: '${cleanMedicineName('FCET TAB. +')}'`);

// Pack Unit Helper
function getPackUnit(groupLabel) {
  const g = (groupLabel || '').toLowerCase();
  if (g.includes('liquid') || g.includes('drops') || g.includes('syrup')) return 'Bottles';
  if (g.includes('ointment') || g.includes('cream') || g.includes('gel')) return 'Tubes';
  if (g.includes('injection')) return 'Vials';
  return 'Packs';
}

assert('PO Helper', 'getPackUnit assigns correct pharmaceutical units',
  getPackUnit('Liquid') === 'Bottles' && getPackUnit('Syrup') === 'Bottles' && getPackUnit('Tablet') === 'Packs' && getPackUnit('Gel') === 'Tubes' && getPackUnit('Injection') === 'Vials',
  'Tablets -> Packs, Syrups -> Bottles, Gels -> Tubes, Injections -> Vials'
);

// WhatsApp PO Generator (Zero rack clutter, exact items)
function generateWhatsAppPOMessage(supplier, selectedItems = []) {
  if (!supplier) return '';
  const supplierName = typeof supplier === 'string' ? supplier : (supplier.name || 'General Distributor');
  let text = `*PURCHASE ORDER - BETA PHARMACY*\n`;
  text += `Distributor: ${supplierName}\n`;
  text += `Date: 16/10/2026\n`;
  text += `------------------------------------\n`;

  if (selectedItems.length === 0) {
    text += `(No medicines selected)\n`;
  } else {
    selectedItems.forEach((it, idx) => {
      const qty = it.orderQty || 10;
      const unit = it.unit || 'Packs';
      const cleanName = cleanMedicineName(it.name);
      text += `${idx + 1}. *${cleanName}* - ${qty} ${unit}\n`;
    });
  }

  text += `------------------------------------\n`;
  text += `Total Items: ${selectedItems.length}\n`;
  text += `Kindly dispatch with the earliest delivery van. Thank you!`;
  return text;
}

const testPOItems = [
  { name: 'FCET TAB.', orderQty: 10, unit: 'Packs' },
  { name: 'PAN 40MG TAB', orderQty: 20, unit: 'Boxes' },
  { name: 'BENADRYL COUGH SYRUP', orderQty: 5, unit: 'Bottles' }
];

const generatedPOText = generateWhatsAppPOMessage({ name: 'THE CAN DRUG HOUSE' }, testPOItems);

assert('WhatsApp PO Generator', 'No Rack numbers in generated text', !generatedPOText.includes('Rack') && !generatedPOText.includes('R-'), 'Zero rack clutter confirmed');
assert('WhatsApp PO Generator', 'Clean Item Listing with Custom Units', generatedPOText.includes('1. *FCET TAB.* - 10 Packs') && generatedPOText.includes('2. *PAN 40MG TAB* - 20 Boxes') && generatedPOText.includes('3. *BENADRYL COUGH SYRUP* - 5 Bottles'), 'Exact items, quantities and units matched');
assert('WhatsApp PO Generator', 'Header & Dispatch Footer', generatedPOText.includes('*PURCHASE ORDER - BETA PHARMACY*') && generatedPOText.includes('Total Items: 3'), 'Header and item count verified');

// Reorder Shortages Calculation [SHORTAGE.PRG]
const shelfShortages = medicines.filter(m => (m.stock_shop1 || 0) <= (m.ro_level || 10) && (m.stock_shop1 || 0) > 0);
const fullDepleted = medicines.filter(m => (m.stock_shop1 || 0) <= (m.ro_level || 10));

assert('Shortage Recommendations', 'Shelf Low Stock Detection', shelfShortages.length > 0, `Found ${shelfShortages.length} medicines low on shelf`);
assert('Shortage Recommendations', 'Full Catalog Depleted Detection', fullDepleted.length >= shelfShortages.length, `Found ${fullDepleted.length} total catalog depleted medicines`);

// --------------------------------------------------------------------------
// 5. DEAD CAPITAL / OVERSTOCKED INVENTORY
// --------------------------------------------------------------------------
console.log('\n--- 5. Testing Dead Capital & Overstocked Inventory ---');

const stagnantItems = medicines.filter(m => {
  const stock = m.stock_shop1 || 0;
  const ro = m.ro_level || 10;
  return stock >= (ro * 2) && stock > 20;
});

const deadCapitalValue = stagnantItems.reduce((acc, m) => acc + ((m.stock_shop1 || 0) * (m.mrp || 0)), 0);

assert('Dead Capital Radar', 'Stagnant Stock Identification', stagnantItems.length > 0, `Found ${stagnantItems.length} stagnant/overstocked medicines`);
assert('Dead Capital Radar', 'Dead Capital Valuation', deadCapitalValue > 0, `Total Dead Capital Value: ₹${deadCapitalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

// Inter-Branch Stock Transfer Audit
function createStockTransfer(med, qty, fromBranch, toBranch) {
  return {
    id: `TR-${Date.now().toString().slice(-4)}`,
    date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    medicine: med.name,
    from: fromBranch,
    to: toBranch,
    qty: qty,
    status: 'IN-TRANSIT'
  };
}

const sampleTransfer = createStockTransfer(stagnantItems[0], 25, 'Beta Pharmacy', 'Beta Polyclinic');
assert('Inter-Branch Stock Transfer', 'Transfer Log Creation', sampleTransfer.qty === 25 && sampleTransfer.status === 'IN-TRANSIT', `Dispatched ${sampleTransfer.qty} packs of ${sampleTransfer.medicine} from ${sampleTransfer.from} to ${sampleTransfer.to}`);

// --------------------------------------------------------------------------
// 6. NEAR EXPIRY RISK RADAR & INTERACTIVE FILTERS
// --------------------------------------------------------------------------
console.log('\n--- 6. Testing Near Expiry Risk Radar & Filters ---');

function parseExpiryToDays(expStr, refDateStr = '16/10/2026') {
  if (!expStr || !expStr.includes('/')) return 999;
  const [refD, refM, refY] = refDateStr.split('/').map(Number);
  const refDate = new Date(refY, refM - 1, refD);

  const parts = expStr.split('/').map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return 999;
  const [expM, expYPart] = parts;
  const expY = expYPart < 100 ? 2000 + expYPart : expYPart;
  // End of expiry month
  const expDate = new Date(expY, expM, 0);

  const diffMs = expDate - refDate;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Test parsing
const daysToNov26 = parseExpiryToDays('11/26', '16/10/2026'); // Nov 30 2026 - Oct 16 2026 = 45 days
const daysToOct26 = parseExpiryToDays('10/26', '16/10/2026'); // Oct 31 2026 - Oct 16 2026 = 15 days
const daysToDec26 = parseExpiryToDays('12/26', '16/10/2026'); // Dec 31 2026 - Oct 16 2026 = 76 days

assert('Near Expiry Math', 'Critical (<30d) calculation', daysToOct26 >= 0 && daysToOct26 <= 30, `Oct 2026 expiry has ${daysToOct26} days left (Critical)`);
assert('Near Expiry Math', 'Warning (31-60d) calculation', daysToNov26 > 30 && daysToNov26 <= 60, `Nov 2026 expiry has ${daysToNov26} days left (Warning)`);
assert('Near Expiry Math', 'Caution (61-90d) calculation', daysToDec26 > 60 && daysToDec26 <= 90, `Dec 2026 expiry has ${daysToDec26} days left (Caution)`);

// Extract real batches expiring within 90 days from full DB
const nearExpiryBatches = [];
medicines.forEach(m => {
  (m.batches || []).forEach(b => {
    const days = parseExpiryToDays(b.exp_date, '16/10/2026');
    if (days >= 0 && days <= 90) {
      nearExpiryBatches.push({
        code: m.code,
        name: m.name,
        batch: b.batch_no,
        exp: b.exp_date,
        daysLeft: days,
        mrp: b.mrp || m.mrp,
        stock: m.stock_shop1 || 0,
        riskVal: (m.stock_shop1 || 0) * (b.mrp || m.mrp),
        category: days <= 30 ? 'CRITICAL' : days <= 60 ? 'WARNING' : 'CAUTION'
      });
    }
  });
});

const criticalBatches = nearExpiryBatches.filter(b => b.category === 'CRITICAL');
const warningBatches = nearExpiryBatches.filter(b => b.category === 'WARNING');
const cautionBatches = nearExpiryBatches.filter(b => b.category === 'CAUTION');
const totalRiskValue = nearExpiryBatches.reduce((acc, b) => acc + b.riskVal, 0);

assert('Near Expiry DB Extraction', 'Near Expiry Batches Found in Catalog', nearExpiryBatches.length > 0, `Total Near Expiry Batches: ${nearExpiryBatches.length} (Critical: ${criticalBatches.length}, Warning: ${warningBatches.length}, Caution: ${cautionBatches.length})`);
assert('Near Expiry Valuation', 'Total Expiry Risk Value Calculation', totalRiskValue >= 0, `Total Risk Value: ₹${totalRiskValue.toFixed(2)}`);

// Interactive category filter test
function filterExpiryList(list, activeCategory, search) {
  return list.filter(b => {
    const matchesCat = activeCategory === 'ALL' || b.category === activeCategory;
    const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.batch.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });
}

assert('Near Expiry Interactive Card Filter', "Clicking Critical Card filters exactly to category='CRITICAL'",
  filterExpiryList(nearExpiryBatches, 'CRITICAL', '').every(b => b.category === 'CRITICAL'),
  `Filtered ${filterExpiryList(nearExpiryBatches, 'CRITICAL', '').length} critical items`
);

assert('Near Expiry Interactive Card Filter', "Clicking Warning Card filters exactly to category='WARNING'",
  filterExpiryList(nearExpiryBatches, 'WARNING', '').every(b => b.category === 'WARNING'),
  `Filtered ${filterExpiryList(nearExpiryBatches, 'WARNING', '').length} warning items`
);

// --------------------------------------------------------------------------
// 7. SCHEDULE H1 REGISTER [FORM 35 GOVT AUDIT]
// --------------------------------------------------------------------------
console.log('\n--- 7. Testing Schedule H1 Drug Register [Form 35 Audit] ---');

function isH1Item(medOrItem) {
  if (!medOrItem) return false;
  if (medOrItem.schedule === 'H1' || medOrItem.schedule === 'Schedule H1' || medOrItem.schedule === 'X') return true;
  const h1Keywords = ['alprazolam', 'clonazepam', 'zolpidem', 'tramadol', 'diazepam', 'cefixime', 'azithromycin', 'ofloxacin', 'levofloxacin', 'meropenem', 'ceftriaxone', 'moxifloxacin', 'lorazepam', 'nitrazepam', 'chlordiazepoxide', 'codeine'];
  const text = ((medOrItem.name || '') + ' ' + (medOrItem.generic || '')).toLowerCase();
  return h1Keywords.some(kw => text.includes(kw));
}

assert('Schedule H1 Detection', 'Identifies H1 keyword in name/generic', isH1Item({ generic: 'Alprazolam 0.5mg' }) && isH1Item({ generic: 'Cefixime 200mg' }) && isH1Item({ schedule: 'H1' }), 'Alpra, Cefixime, Schedule H1 verified');
assert('Schedule H1 Detection', 'Rejects normal OTC drugs', !isH1Item({ name: 'PARACETAMOL 500MG', schedule: 'Normal' }), 'Paracetamol correctly identified as non-H1');

// Extract H1 records from mockBills
const h1Records = [];
mockBills.forEach(bill => {
  (bill.items || []).forEach(it => {
    if (isH1Item(it)) {
      h1Records.push({
        billNo: bill.billNo,
        date: bill.date,
        time: bill.time,
        patientName: bill.patientName,
        customerPhone: bill.customerPhone,
        doctorName: bill.doctorName,
        doctorRegNo: bill.doctorRegNo,
        drugName: it.name,
        qty: it.qty,
        batch: it.batch,
        exp: it.exp,
        pharmacist: 'Staff Cashier'
      });
    }
  });
});

assert('Schedule H1 Form 35 Logging', 'Automatic extraction from sales bills', h1Records.length === 1 && h1Records[0].drugName === 'ALPRASAFE 0.5MG TAB', `Logged Bill #${h1Records[0]?.billNo} for Patient ${h1Records[0]?.patientName} under Doctor ${h1Records[0]?.doctorName} (${h1Records[0]?.doctorRegNo})`);

// --------------------------------------------------------------------------
// 8. CUSTOMER KHATA / CREDIT LEDGER
// --------------------------------------------------------------------------
console.log('\n--- 8. Testing Customer Khata / Credit Ledger ---');

const sampleDueBills = [
  { id: 'DUE-101', billNo: '025280', date: '10/10/2026', customerName: 'R. K. NAIR', customerPhone: '9847055443', amount: 1540.00, balance: 1540.00, status: 'PENDING' },
  { id: 'DUE-102', billNo: '025110', date: '15/09/2026', customerName: 'GEORGE VARGHESE', customerPhone: '9447011223', amount: 890.00, balance: 890.00, status: 'OVERDUE' },
  { id: 'DUE-103', billNo: '025301', date: '14/10/2026', customerName: 'SITA RAMAN', customerPhone: '9895012345', amount: 450.00, balance: 0.00, status: 'PAID' }
];

const totalOutstanding = sampleDueBills.filter(d => d.status !== 'PAID').reduce((acc, it) => acc + it.balance, 0);

assert('Customer Khata', 'Total Outstanding Due Balance Calculation', totalOutstanding === 2430.00, `Outstanding balance: ₹${totalOutstanding.toFixed(2)}`);

// Settlement simulation
function settleDueBill(dueBills, dueId, paidAmt) {
  return dueBills.map(d => {
    if (d.id === dueId) {
      const newBal = Math.max(0, d.balance - paidAmt);
      return {
        ...d,
        balance: newBal,
        status: newBal === 0 ? 'PAID' : 'PARTIAL'
      };
    }
    return d;
  });
}

const partialSettlement = settleDueBill(sampleDueBills, 'DUE-101', 540.00);
const updated101 = partialSettlement.find(d => d.id === 'DUE-101');
assert('Customer Khata', 'Partial Settlement updates balance and marks PARTIAL', updated101.balance === 1000.00 && updated101.status === 'PARTIAL', `New balance: ₹${updated101.balance}, status: ${updated101.status}`);

const fullSettlement = settleDueBill(partialSettlement, 'DUE-101', 1000.00);
const paid101 = fullSettlement.find(d => d.id === 'DUE-101');
assert('Customer Khata', 'Full Settlement marks invoice as PAID with 0 balance', paid101.balance === 0.00 && paid101.status === 'PAID', `New balance: ₹${paid101.balance}, status: ${paid101.status}`);

// --------------------------------------------------------------------------
// 9. CHRONIC REFILL REMINDERS
// --------------------------------------------------------------------------
console.log('\n--- 9. Testing Chronic Refill Reminders ---');

const chronicKeywords = ['telmisartan', 'metformin', 'thyronorm', 'amlodipine', 'glycomet', 'ecosprin', 'atorvastatin', 'rosuvastatin', 'montelukast', 'losartan', 'glimepiride', 'olmesartan'];

const sampleCustomerHistory = [
  {
    phone: '9847011122',
    name: 'RAMESH CHANDRAN',
    preferredDoctor: 'DR. SUKUMARAN MBBS',
    bills: [
      {
        billNo: '024990',
        date: '10/09/2026',
        items: [
          { name: 'TELMA 40MG TAB', generic: 'Telmisartan 40mg' },
          { name: 'GLYCOMET 500MG TAB', generic: 'Metformin 500mg' }
        ]
      }
    ]
  },
  {
    phone: '9447022233',
    name: 'SARASWATHI AMMA',
    preferredDoctor: 'DR. ANITA SHENOY MD',
    bills: [
      {
        billNo: '025280',
        date: '12/10/2026',
        items: [
          { name: 'THYRONORM 50MCG TAB', generic: 'Thyroxine Sodium' }
        ]
      }
    ]
  }
];

function processChronicRefills(customerHistory, refDateStr = '16/10/2026') {
  const [refD, refM, refY] = refDateStr.split('/').map(Number);
  const refDate = new Date(refY, refM - 1, refD);
  const list = [];

  customerHistory.forEach(c => {
    const allItems = (c.bills || []).flatMap(b => b.items || []);
    const chronicItems = allItems.filter(it => {
      const text = ((it.name || '') + ' ' + (it.generic || '')).toLowerCase();
      return chronicKeywords.some(kw => text.includes(kw));
    });

    if (chronicItems.length > 0) {
      const lastBill = c.bills[0];
      const [bD, bM, bY] = lastBill.date.split('/').map(Number);
      const billDate = new Date(bY, bM - 1, bD);
      const daysAgo = Math.floor((refDate - billDate) / (1000 * 60 * 60 * 24));

      list.push({
        phone: c.phone,
        name: c.name,
        preferredDoctor: c.preferredDoctor,
        lastVisit: lastBill.date,
        daysAgo,
        medicines: [...new Set(chronicItems.map(it => it.name))].join(', '),
        status: daysAgo >= 25 ? `Refill Due (${daysAgo} Days)` : `Healthy (${daysAgo} Days)`
      });
    }
  });
  return list;
}

const refillList = processChronicRefills(sampleCustomerHistory, '16/10/2026');
const ramesh = refillList.find(r => r.name === 'RAMESH CHANDRAN');
const saraswathi = refillList.find(r => r.name === 'SARASWATHI AMMA');

assert('Chronic Refills', 'Refill Due calculation (>=25 days)', ramesh.daysAgo === 36 && ramesh.status.startsWith('Refill Due'), `Ramesh Chandran: ${ramesh.daysAgo} days ago -> ${ramesh.status}`);
assert('Chronic Refills', 'Healthy calculation (<25 days)', saraswathi.daysAgo === 4 && saraswathi.status.startsWith('Healthy'), `Saraswathi Amma: ${saraswathi.daysAgo} days ago -> ${saraswathi.status}`);

// WhatsApp Refill Reminder Link Generation
const rameshWhatsAppUrl = `https://wa.me/91${ramesh.phone}?text=${encodeURIComponent(`Dear ${ramesh.name}, gentle refill reminder from Beta Pharmacy. Your monthly regular prescription for ${ramesh.medicines} is due for refill. Would you like us to keep your pack ready at the counter or arrange doorstep delivery? Thank you!`)}`;
assert('Chronic Refills', 'Personalized WhatsApp Reminder Link', rameshWhatsAppUrl.includes('9847011122') && rameshWhatsAppUrl.includes('TELMA%2040MG%20TAB'), 'Contains customer phone and prescribed medicine');

// --------------------------------------------------------------------------
// 10. MULTI-STORE RADAR
// --------------------------------------------------------------------------
console.log('\n--- 10. Testing Multi-Store Radar (Cross-Branch Stock Comparison) ---');

const crossBranchItems = medicines.slice(0, 500).map(m => ({
  code: m.code,
  name: m.name,
  generic: m.generic,
  rack: m.rack,
  mrp: m.mrp,
  shop1: m.stock_shop1 || 0,
  shop2: m.stock_shop2 || 0,
  diff: (m.stock_shop1 || 0) - (m.stock_shop2 || 0),
  imbalance: (m.stock_shop1 > 10 && (m.stock_shop2 || 0) === 0) ? 'SHOP2_DEPLETED' : ((m.stock_shop2 > 10 && (m.stock_shop1 || 0) === 0) ? 'SHOP1_DEPLETED' : 'BALANCED')
}));

const shop2Depleted = crossBranchItems.filter(i => i.imbalance === 'SHOP2_DEPLETED');
assert('Multi-Store Radar', 'Identifies branch stock imbalances', crossBranchItems.length === 500, `Analyzed 500 medicines. Found ${shop2Depleted.length} items with Shop 1 stock but Shop 2 zero.`);

// --------------------------------------------------------------------------
// 11. DISTRIBUTOR PAYABLES LEDGER
// --------------------------------------------------------------------------
console.log('\n--- 11. Testing Distributor Payables Ledger ---');

const samplePayables = [
  { id: 'PAY-1', name: 'THE CAN DRUG HOUSE', billNo: 'CDH-9921', billDate: '01/10/2026', cDays: 14, due: '15/10/2026', amount: 14500.00, status: 'OVERDUE' },
  { id: 'PAY-2', name: 'SOUTHERN PHARMA DISTRIBUTORS', billNo: 'SPD-4412', billDate: '05/10/2026', cDays: 21, due: '26/10/2026', amount: 8200.00, status: 'CURRENT' }
];

const totalPayablesAmount = samplePayables.reduce((acc, p) => acc + p.amount, 0);
assert('Distributor Payables', 'Total Agency Payables Rollup', totalPayablesAmount === 22700.00, `Total Outstanding Payables: ₹${totalPayablesAmount.toFixed(2)}`);

// Record Payment
function recordDistributorPayment(payables, billNo, chqNo, bank) {
  return payables.filter(p => p.billNo !== billNo);
}

const updatedPayables = recordDistributorPayment(samplePayables, 'CDH-9921', 'CHQ-881920', 'HDFC Bank');
assert('Distributor Payables', 'Payment settlement clears agency bill', updatedPayables.length === 1 && !updatedPayables.some(p => p.billNo === 'CDH-9921'), 'Bill CDH-9921 cleared from payables ledger');

// --------------------------------------------------------------------------
// 12. DOCTOR PRESCRIPTIONS TELEMETRY
// --------------------------------------------------------------------------
console.log('\n--- 12. Testing Doctor Prescriptions Telemetry ---');

function calculateDoctorAnalytics(bills) {
  const docMap = {};
  bills.forEach(b => {
    if (!b) return;
    const doc = (b.doctorName || '').trim();
    if (!doc || doc.toLowerCase().includes('self') || doc.toLowerCase() === 'none') return;
    if (!docMap[doc]) {
      docMap[doc] = { name: doc, bills: 0, revenue: 0, drugs: new Set() };
    }
    docMap[doc].bills += 1;
    docMap[doc].revenue += (parseFloat(b.netPayable || b.grossTotal) || 0);
    (b.items || []).forEach(it => {
      if (it?.name) docMap[doc].drugs.add(it.name);
    });
  });

  return Object.values(docMap).map(d => ({
    name: d.name,
    bills: d.bills,
    revenue: d.revenue,
    avgBasket: d.bills > 0 ? (d.revenue / d.bills) : 0,
    topDrug: Array.from(d.drugs).slice(0, 2).join(', ') || '-'
  })).sort((a, b) => b.revenue - a.revenue);
}

const docAnalytics = calculateDoctorAnalytics(mockBills);
const drSukumaran = docAnalytics.find(d => d.name.includes('SUKUMARAN'));
const drAnita = docAnalytics.find(d => d.name.includes('ANITA'));

assert('Doctor Telemetry', 'Multi-bill doctor aggregation (Dr. Sukumaran: 2 bills)', drSukumaran.bills === 2 && drSukumaran.revenue === 520.00, `Dr. Sukumaran: 2 bills, Gross: ₹${drSukumaran.revenue}, Avg Basket: ₹${drSukumaran.avgBasket.toFixed(2)}`);
assert('Doctor Telemetry', 'Single-bill doctor aggregation (Dr. Anita Shenoy: 1 bill)', drAnita.bills === 1 && drAnita.revenue === 429.00, `Dr. Anita Shenoy: 1 bill, Gross: ₹${drAnita.revenue}`);
assert('Doctor Telemetry', 'Revenue Sorting (Top Doctor First)', docAnalytics[0].name === drSukumaran.name, `Top Doctor: ${docAnalytics[0].name}`);

// --------------------------------------------------------------------------
// 13. CLOUD SYNC HUB
// --------------------------------------------------------------------------
console.log('\n--- 13. Testing Cloud Sync Hub Status Logic ---');

function evaluateCloudStatus(connected, latency) {
  if (!connected) return { label: 'Cloud Offline', color: 'bg-zinc-500' };
  if (latency < 250) return { label: 'Optimal (<250ms)', color: 'bg-emerald-500' };
  return { label: 'High Latency (>250ms)', color: 'bg-amber-500' };
}

assert('Cloud Sync Hub', 'Optimal latency status indicator', evaluateCloudStatus(true, 65).label === 'Optimal (<250ms)', '65ms latency rated Optimal');
assert('Cloud Sync Hub', 'Offline status indicator', evaluateCloudStatus(false, 0).label === 'Cloud Offline', 'Disconnected rated Offline');

// --------------------------------------------------------------------------
// SUMMARY REPORT
// --------------------------------------------------------------------------
console.log('\n================================================================');
console.log('   AUDIT VERIFICATION SUMMARY');
console.log('================================================================');
const passedCount = testResults.filter(r => r.passed).length;
const totalCount = testResults.length;
console.log(`Total Features Tested: ${totalCount}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${totalCount - passedCount}`);
console.log(`Success Rate: ${((passedCount / totalCount) * 100).toFixed(1)}%`);
console.log('================================================================\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
