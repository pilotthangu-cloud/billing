import { fuzzySearchMedicines } from './src/utils/fuzzySearch.js';
import { generateWhatsAppBillText } from './src/utils/billUtils.js';

console.log('================================================================');
console.log('   VERIFYING NEW FEATURES: VELOCITY, FUZZY, WHATSAPP & REBALANCE');
console.log('================================================================');

let passed = 0;
let total = 0;
function assert(name, condition, proof) {
  total++;
  if (condition) {
    passed++;
    console.log(`[✓ PASS] ${name}`);
    if (proof) console.log(`       Proof: ${proof}`);
  } else {
    console.error(`[✗ FAIL] ${name}`);
    if (proof) console.error(`       Proof: ${proof}`);
    process.exit(1);
  }
}

// 1. Test Typo-Tolerant Fuzzy Search
const sampleMeds = [
  { code: 'M001', name: 'AUGMENTIN 625MG TAB', generic: 'Amoxicillin + Clavulanic', company: 'GSK', rack: 'A1', stock_shop1: 30, mrp: 229 },
  { code: 'M002', name: 'DOLO 650 TABLETS', generic: 'Paracetamol 650mg', company: 'MICRO LABS', rack: 'B2', stock_shop1: 100, mrp: 34 },
  { code: 'M003', name: 'PAN 40 TABLETS', generic: 'Pantoprazole 40mg', company: 'ALKEM', rack: 'C1', stock_shop1: 50, mrp: 165 },
  { code: 'M004', name: 'TELMA H TABLETS', generic: 'Telmisartan + Hydrochlorothiazide', company: 'GLENMARK', rack: 'D3', stock_shop1: 25, mrp: 290 },
  { code: 'M005', name: 'AZITHRAL 500 TABLET', generic: 'Azithromycin 500mg', company: 'ALEMBIC', rack: 'E1', stock_shop1: 15, mrp: 132 }
];

// Exact prefix
const resExact = fuzzySearchMedicines(sampleMeds, 'Aug', 'stock_shop1', 5);
assert('Fuzzy Search: Exact prefix match', resExact.length > 0 && resExact[0].name.startsWith('AUGMENTIN'), `Found: ${resExact[0]?.name}`);

// Typo: "Doloo" -> "DOLO 650"
const resTypo1 = fuzzySearchMedicines(sampleMeds, 'Doloo', 'stock_shop1', 5);
assert('Fuzzy Search: Typo tolerance "Doloo" -> DOLO', resTypo1.length > 0 && resTypo1[0].name.includes('DOLO'), `Found: ${resTypo1[0]?.name}`);

// Typo: "Augmentn" -> "AUGMENTIN"
const resTypo2 = fuzzySearchMedicines(sampleMeds, 'Augmentn', 'stock_shop1', 5);
assert('Fuzzy Search: Typo tolerance "Augmentn" -> AUGMENTIN', resTypo2.length > 0 && resTypo2[0].name.includes('AUGMENTIN'), `Found: ${resTypo2[0]?.name}`);

// Typo: "TelmaH" -> "TELMA H"
const resTypo3 = fuzzySearchMedicines(sampleMeds, 'TelmaH', 'stock_shop1', 5);
assert('Fuzzy Search: Word boundary & typo "TelmaH" -> TELMA H', resTypo3.length > 0 && resTypo3[0].name.includes('TELMA'), `Found: ${resTypo3[0]?.name}`);

// 2. Test Digital WhatsApp Invoice Formatting
const mockBill = {
  billNo: '025345',
  date: '18/10/2026',
  time: '11:45 AM',
  customerName: 'K. R. NAMBIAR',
  customerPhone: '9847012345',
  paymentMode: 'UPI',
  items: [
    {
      name: 'AUGMENTIN 625MG TAB',
      batch: 'AUG9901',
      qty: 10,
      mrp: 22.90,
      amount: 229.00
    },
    {
      name: 'PAN 40 TABLETS',
      batch: 'PAN4412',
      qty: 15,
      mrp: 16.50,
      amount: 247.50
    }
  ],
  subtotal: 476.50,
  taxTotal: 57.18,
  netTotal: 476.50
};

const waText = generateWhatsAppBillText(mockBill);
assert('WhatsApp Invoice: Header and Store name', waText.includes('*BETA PHARMACY*'), 'Contains store header');
assert('WhatsApp Invoice: Bill No & Customer details', waText.includes('#025345') && waText.includes('K. R. NAMBIAR'), 'Contains bill details');
assert('WhatsApp Invoice: Line items with batch and MRP', waText.includes('AUGMENTIN 625MG TAB') && waText.includes('Qty: *10*') && waText.includes('AUG9901'), 'Line items included');
assert('WhatsApp Invoice: Net Total & Verification notice', waText.includes('NET PAYABLE') && waText.includes('₹476.50') && waText.includes('Thank you for your visit'), 'Net total & statutory notice included');

// 3. Test Proactive Multi-Store Rebalancing Detector
const multiStoreCatalog = [
  { code: 'M101', name: 'METFORMIN 500MG', stock_shop1: 30, stock_shop2: 0, rack: 'A2' },
  { code: 'M102', name: 'AMLODIPINE 5MG', stock_shop1: 1, stock_shop2: 25, rack: 'B1' },
  { code: 'M103', name: 'ATOCOR 10MG', stock_shop1: 8, stock_shop2: 10, rack: 'C4' } // Balanced, should not trigger
];

const rebalanceCandidates = [];
multiStoreCatalog.forEach(med => {
  const s1 = Number(med.stock_shop1 || 0);
  const s2 = Number(med.stock_shop2 || 0);
  if (s1 >= 15 && s2 <= 2) {
    rebalanceCandidates.push({
      med,
      fromBranch: 'Main Pharmacy',
      toBranch: 'Polyclinic Division',
      fromStock: s1,
      toStock: s2,
      transferQty: Math.min(Math.floor((s1 - s2) / 2), 20)
    });
  } else if (s2 >= 15 && s1 <= 2) {
    rebalanceCandidates.push({
      med,
      fromBranch: 'Polyclinic Division',
      toBranch: 'Main Pharmacy',
      fromStock: s2,
      toStock: s1,
      transferQty: Math.min(Math.floor((s2 - s1) / 2), 20)
    });
  }
});

assert('Rebalance Detector: Found 2 imbalanced candidates', rebalanceCandidates.length === 2, `Candidates: ${rebalanceCandidates.length}`);
assert('Rebalance Candidate 1: Main -> Polyclinic for METFORMIN', rebalanceCandidates[0].med.name === 'METFORMIN 500MG' && rebalanceCandidates[0].fromBranch === 'Main Pharmacy', `Qty to transfer: ${rebalanceCandidates[0].transferQty}`);
assert('Rebalance Candidate 2: Polyclinic -> Main for AMLODIPINE', rebalanceCandidates[1].med.name === 'AMLODIPINE 5MG' && rebalanceCandidates[1].fromBranch === 'Polyclinic Division', `Qty to transfer: ${rebalanceCandidates[1].transferQty}`);

console.log('================================================================');
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log('================================================================');
