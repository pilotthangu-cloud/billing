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
export function padRight(str, len) {
  const s = String(str || '').slice(0, len);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

export function padLeft(str, len) {
  const s = String(str || '').slice(0, len);
  return ' '.repeat(Math.max(0, len - s.length)) + s;
}

export function padCenter(str, width) {
  const s = String(str || '');
  if (s.length >= width) return s.slice(0, width);
  const leftPad = Math.floor((width - s.length) / 2);
  const rightPad = width - s.length - leftPad;
  return ' '.repeat(leftPad) + s + ' '.repeat(rightPad);
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
    patientName = 'CASH',
    doctorName = 'SELF',
    paymentMode = 'cash',
    items = [],
    netPayable = 0,
    storeInfo = {}
  } = billData || {};

  const headerStyle = storeInfo.headerStyle || 'FULL_PHARMACY';
  const storeName = storeInfo.name || 'BETA PHARMACY';
  const modeLabel = paymentMode.toUpperCase() === 'CREDIT' ? 'Credit Bill' : 'Cash Bill';
  const storeAddr = storeInfo.address || 'Sadanada Pai Road, Chirakkara, Thalassery.';
  const storePhone = storeInfo.phone || 'Tel - 0490-2325049';
  const storeDl = storeInfo.dlNo || 'D.L.No.13/134/20/05, 13/135/21/05 Dt 30-08-05.';
  const storeMob = storeInfo.mobile || 'Mob - 9497172662';
  const memoTitle = storeInfo.memoTitle || 'CASH MEMO';
  const city = storeInfo.city || 'THALASSERY';

  const lines = [];

  // Header (Lines 1 to 5)
  if (headerStyle === 'COMPACT_MEMO') {
    lines.push(padRight(memoTitle, 80));
    lines.push(padRight(`Sold to  ${patientName.toUpperCase()}`, 55) + padLeft(`Date:${date}`, 25));
    lines.push(padRight(`Pr by ${doctorName.toUpperCase()}`, 35) + padCenter(city, 20) + padLeft(`Bill No.${billNo}`, 25));
    lines.push(' '.repeat(80));
    lines.push(' '.repeat(80));
  } else {
    lines.push(padRight(`${storeName} (${modeLabel})`, 80));
    lines.push(padRight(storeAddr, 55) + padLeft(storePhone, 25));
    lines.push(padRight(storeDl, 55) + padLeft(storeMob, 25));
    lines.push(padRight(`Sold to  ${patientName.toUpperCase()}`, 55) + padLeft(`Date:${date}`, 25));
    lines.push(padRight(`Pr by ${doctorName.toUpperCase()}`, 55) + padLeft(`Bill No.${billNo}`, 25));
  }

  // Dividers & Column Headers (Lines 6 to 8)
  lines.push('-'.repeat(80));
  const colHeader = 
    padRight('Sr', 3) + ' ' +
    padRight('Product', 24) + ' ' +
    padRight('Mfr', 4) + ' ' +
    padRight('Batch', 11) + ' ' +
    padRight('Expiry', 7) + ' ' +
    padLeft('M R P/Per', 9) + ' ' +
    padLeft('Qty', 5) + ' ' +
    padLeft('Value', 10);
  lines.push(colHeader);
  lines.push('-'.repeat(80));

  // Items slots (Lines 9 to 22 = 14 slots for half-sheet)
  const MAX_ITEM_SLOTS = 14;
  let runningSubtotal = 0;

  for (let slot = 0; slot < MAX_ITEM_SLOTS; slot++) {
    if (slot < items.length) {
      const it = items[slot];
      const sr = String(slot + 1).padStart(2, ' ');
      const isSchedule = it.isScheduleH || it.schedule === 'H' || it.schedule === 'H1';
      let rawName = (it.medicine?.name || it.name || 'ITEM').toUpperCase();
      let prodName = rawName.slice(0, isSchedule ? 21 : 24);
      if (isSchedule) prodName = padRight(prodName, 22) + '*';
      prodName = padRight(prodName, 24);

      const mfr = padRight((it.medicine?.company || it.company || 'GEN').slice(0, 4).toUpperCase(), 4);
      const batch = padRight((it.batch?.batch_no || it.batch || 'BT').slice(0, 11), 11);
      const exp = padRight((it.batch?.exp_date || it.exp || '').slice(0, 7), 7);
      const qty = parseInt(it.quantity || it.qty || 1, 10);
      const mrpValue = parseFloat(it.mrp || it.rate || 0);
      const packSize = it.packSize || it.pack || 1;
      const mrpPerStr = packSize > 1 ? `${mrpValue.toFixed(2)}/${packSize}` : mrpValue.toFixed(2);
      const mrpCol = padLeft(mrpPerStr.slice(0, 9), 9);

      const ratePerUnit = packSize > 1 ? (mrpValue / packSize) : (parseFloat(it.rate || it.mrp || 0));
      const itemAmount = parseFloat(it.amount || it.total || (qty * ratePerUnit));
      runningSubtotal += itemAmount;

      const qtyCol = padLeft(String(qty), 5);
      const valCol = padLeft(itemAmount.toFixed(2), 10);

      const row = 
        padRight(sr, 3) + ' ' +
        prodName + ' ' +
        mfr + ' ' +
        batch + ' ' +
        exp + ' ' +
        mrpCol + ' ' +
        qtyCol + ' ' +
        valCol;
      lines.push(row);
    } else {
      lines.push(' '.repeat(80));
    }
  }

  // Divider (Line 23)
  lines.push('-'.repeat(80));

  // Footer (Lines 24 to 32)
  const netValStr = (netPayable > 0 ? parseFloat(netPayable) : runningSubtotal).toFixed(2);

  lines.push(padRight('We undertake to refund any excess', 80));
  lines.push(padRight('collected by oversight. E &.O.E.', 55) + padLeft(netValStr, 25));
  lines.push(padRight('Sale return will be entertained only within 7 days of bill date.', 80));
  lines.push(padRight(' ', 40) + padLeft('Signature - Pharmacist', 40));
  lines.push(padRight(time, 30) + padCenter('** GET WELL SOON **', 20) + ' '.repeat(30));
  lines.push(' '.repeat(80));
  lines.push(' '.repeat(80));
  lines.push(' '.repeat(80));
  lines.push(' '.repeat(80));

  // Perforation line (Line 33)
  lines.push('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ');

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
