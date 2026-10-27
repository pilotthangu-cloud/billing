/**
 * TVS Electronics MSP 250 STAR Native ESC/P Print Engine
 * Generates raw 80-column character streams and byte arrays for:
 * - Half-Sheet Continuous Tractor Paper (Fanfold, ~5.5" / 6" page height)
 * - 33 Lines per invoice (matches tear-off perforation exactly)
 * - Built-in Hardware ESC/P control codes (Draft, Condensed, Bold)
 * - Zero browser canvas rasterization, zero blurry dots, zero A4 driver scaling bugs
 */

// ESC/P Byte Constants for TVS MSP 250 Star
export const ESC_P = {
  INIT: [0x1B, 0x40],             // ESC @ : Initialize hardware / clear buffer
  PAGE_LEN_33: [0x1B, 0x43, 33],  // ESC C 33 : Set page length to 33 lines (half-sheet)
  LINE_SPACING_6LPI: [0x1B, 0x32],// ESC 2 : Standard 6 lines per inch
  BOLD_ON: [0x1B, 0x45],          // ESC E : Bold on
  BOLD_OFF: [0x1B, 0x46],         // ESC F : Bold off
  CONDENSED_ON: [0x0F],           // SI (0x0F) : 17.14 CPI Condensed text
  CONDENSED_OFF: [0x12],          // DC2 (0x12) : 10 CPI Normal text
  FORM_FEED: [0x0C]               // FF : Eject / advance to exact perforation
};

/**
 * Format string to fixed length with padding
 */
function padRight(str, len) {
  const s = String(str || '').slice(0, len);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function padLeft(str, len) {
  const s = String(str || '').slice(0, len);
  return ' '.repeat(Math.max(0, len - s.length)) + s;
}

/**
 * Convert number to Indian Currency words (e.g. 150 -> One Hundred Fifty Rupees Only)
 */
export function numberToWordsIndian(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  function inWords(num) {
    if (num < 20) return a[num];
    const digit = num % 10;
    if (num < 100) return b[Math.floor(num / 10)] + (digit ? ' ' + a[digit] : ' ');
    if (num < 1000) return a[Math.floor(num / 100)] + 'Hundred ' + (num % 100 ? 'and ' + inWords(num % 100) : '');
    if (num < 100000) return inWords(Math.floor(num / 1000)) + 'Thousand ' + (num % 1000 ? inWords(num % 1000) : '');
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + 'Lakh ' + (num % 100000 ? inWords(num % 100000) : '');
    return inWords(Math.floor(num / 10000000)) + 'Crore ' + (num % 10000000 ? inWords(num % 10000000) : '');
  }

  return (inWords(n).trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

/**
 * Generates an exact 80-column, 33-line formatted ASCII bill
 * @param {Object} billData The invoice details
 * @returns {Array<string>} Exactly 33 lines of 80-column strings
 */
export function formatTvsBillLines(billData) {
  const {
    billNo = '000001',
    date = new Date().toLocaleDateString('en-GB'),
    time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    patientName = '*',
    doctorName = 'Self / OTC',
    paymentMode = 'cash',
    items = [],
    netPayable = 0,
    storeInfo = {}
  } = billData || {};

  const storeName = storeInfo.name || 'BETA PHARMACY';
  const modeLabel = paymentMode === 'upi' ? 'UPI Bill' : (paymentMode === 'credit' ? 'Credit Bill' : 'Cash Bill');
  const storeAddr = storeInfo.address || 'Sadanada Pai Road, Chirakkara, Thalassery.';
  const storePhone = storeInfo.phone || 'Tel - 0490-2325049';
  const storeDl = storeInfo.dlNo || 'D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.';
  const storeMob = storeInfo.mobile || 'Mob - 9497172662';

  const lines = [];

  // Line 01: Time & Greeting
  lines.push(padRight(time, 40) + padLeft('** GET WELL SOON **', 40));

  // Line 02: Store Name & Bill Mode
  lines.push(padRight(`${storeName} (${modeLabel})`, 80));

  // Line 03: Address & Phone
  lines.push(padRight(storeAddr, 55) + padLeft(storePhone, 25));

  // Line 04: Drug Licenses & Mobile
  lines.push(padRight(storeDl, 55) + padLeft(storeMob, 25));

  // Line 05: Patient & Date
  const patStr = `Sold to: ${patientName.toUpperCase()}`;
  const dateStr = `Date: ${date}`;
  lines.push(padRight(patStr, 55) + padLeft(dateStr, 25));

  // Line 06: Doctor & Bill Number
  const docStr = `Pr by  : ${doctorName.toUpperCase()}`;
  const billStr = `Bill No: ${billNo}`;
  lines.push(padRight(docStr, 55) + padLeft(billStr, 25));

  // Line 07: Table Divider
  lines.push('-'.repeat(80));

  // Line 08: Table Header (80 columns)
  // Col widths: Sr(3) Sp(1) Name(24) Sp(1) Mfr(5) Sp(1) Batch(8) Sp(1) Exp(6) Sp(1) Qty(4) Sp(1) MRP(7) Sp(1) Rate(7) Sp(1) Amt(8) = 80
  const header = 
    padRight('Sr', 3) + ' ' +
    padRight('Product Name', 24) + ' ' +
    padRight('Mfr', 5) + ' ' +
    padRight('Batch', 8) + ' ' +
    padRight('Exp', 6) + ' ' +
    padLeft('Qty', 4) + ' ' +
    padLeft('M.R.P', 7) + ' ' +
    padLeft('Rate', 7) + ' ' +
    padLeft('Amount', 8);
  lines.push(header);

  // Line 09: Sub-Header Divider
  lines.push('-'.repeat(80));

  // Lines 10-23: Items (14 slots for medicine lines)
  const MAX_ITEM_SLOTS = 14;
  let totalQty = 0;
  let grossAmount = 0;

  for (let i = 0; i < MAX_ITEM_SLOTS; i++) {
    if (i < items.length) {
      const it = items[i];
      const sr = String(i + 1);
      const name = (it.medicine?.name || it.name || 'ITEM').slice(0, 24);
      const mfr = (it.medicine?.company || it.company || 'GEN').slice(0, 5).toUpperCase();
      const batch = (it.batch?.batch_no || it.batch || 'BT').slice(0, 8);
      const exp = (it.batch?.exp_date || it.exp || '').slice(0, 6);
      const qty = parseInt(it.quantity || it.qty || 1, 10);
      const mrp = (parseFloat(it.mrp || it.rate || 0)).toFixed(2);
      const rate = (parseFloat(it.rate || it.ptr || it.mrp || 0)).toFixed(2);
      const amt = (parseFloat(it.amount || it.total || (qty * parseFloat(rate)))).toFixed(2);

      totalQty += qty;
      grossAmount += parseFloat(amt);

      const row = 
        padRight(sr, 3) + ' ' +
        padRight(name, 24) + ' ' +
        padRight(mfr, 5) + ' ' +
        padRight(batch, 8) + ' ' +
        padRight(exp, 6) + ' ' +
        padLeft(String(qty), 4) + ' ' +
        padLeft(mrp, 7) + ' ' +
        padLeft(rate, 7) + ' ' +
        padLeft(amt, 8);
      lines.push(row);
    } else {
      // Empty filler line to lock physical height
      lines.push(' '.repeat(80));
    }
  }

  // Line 24: Table Footer Divider
  lines.push('-'.repeat(80));

  // Line 25: Summary / Totals
  const countStr = `Items: ${items.length}   Units: ${totalQty}`;
  const grossStr = `Gross Total: ${padLeft(grossAmount.toFixed(2), 10)}`;
  lines.push(padRight(countStr, 45) + padLeft(grossStr, 35));

  // Line 26: Tax Breakdown & Discount
  const taxNote = 'GST Included (CGST 6% + SGST 6%)';
  const discStr = `Discount   : ${padLeft('0.00', 10)}`;
  lines.push(padRight(taxNote, 45) + padLeft(discStr, 35));

  // Line 27: Net Payable
  const net = Number(netPayable || grossAmount).toFixed(2);
  const netStr = `NET PAYABLE: ${padLeft(net, 10)}`;
  lines.push(' '.repeat(45) + padLeft(netStr, 35));

  // Line 28: Words
  const words = numberToWordsIndian(parseFloat(net));
  lines.push(padRight(words, 80));

  // Line 29: Bottom Divider
  lines.push('-'.repeat(80));

  // Line 30: Legal Notice
  lines.push(padRight('Terms: Sold medicines returnable within 7 days with bill.', 80));

  // Line 31: Store Signoff
  lines.push(padLeft(`For ${storeName}`, 80));

  // Line 32: Pharmacist Signature Line
  lines.push(padLeft('Pharmacist Signature', 80));

  // Line 33: Perforation Marker Line (Stops right at tear-off boundary)
  lines.push('- '.repeat(40));

  return lines;
}

/**
 * Generates raw ESC/P byte buffer for TVS MSP 250 Star
 * @param {Object} billData 
 * @returns {Uint8Array} Binary print stream
 */
export function generateTvsEscPosStream(billData) {
  const lines = formatTvsBillLines(billData);
  const bytes = [];

  // 1. Initialize hardware
  bytes.push(...ESC_P.INIT);
  // 2. Set 1/6-inch line spacing
  bytes.push(...ESC_P.LINE_SPACING_6LPI);
  // 3. Set page length to exactly 33 lines
  bytes.push(...ESC_P.PAGE_LEN_33);

  // 4. Output lines with native formatting
  lines.forEach((line, idx) => {
    // Bold store name and net amount
    if (idx === 1 || idx === 26) {
      bytes.push(...ESC_P.BOLD_ON);
    }

    // Convert line chars to ASCII bytes
    for (let i = 0; i < line.length; i++) {
      bytes.push(line.charCodeAt(i) & 0xFF);
    }

    if (idx === 1 || idx === 26) {
      bytes.push(...ESC_P.BOLD_OFF);
    }

    // Carriage Return + Line Feed
    bytes.push(0x0D, 0x0A);
  });

  return new Uint8Array(bytes);
}
