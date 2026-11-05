/**
 * TVS Electronics MSP 250 STAR Native ESC/P Print Engine
 * Generates raw 80-column character streams and byte arrays for:
 * - Half-Sheet Continuous Tractor Paper (Fanfold, 8.5" x 5.5", 11 tractor holes)
 * - Exactly 33 Lines per invoice (matches 5.5" tear-off perforation at 6 LPI)
 * - Built-in Hardware ESC/P control codes (Condensed 17.14 CPI, Bold)
 * - Zero browser canvas rasterization, zero blurry dots, zero A4 driver scaling bugs
 * - Zero Form Feed (0x0C) to prevent 11-inch/22-hole driver overfeed & tractor jamming
 */

// ESC/P Byte Constants for TVS MSP 250 Star
export const ESC_P = {
  INIT: [0x1B, 0x40],             // ESC @ : Initialize hardware / clear buffer
  PAGE_LEN_33: [0x1B, 0x43, 33],  // ESC C 33 : Set page length to 33 lines (half-sheet backup)
  LINE_SPACING_6LPI: [0x1B, 0x32],// ESC 2 : Standard 6 lines per inch (1/6" feed per line)
  BOLD_ON: [0x1B, 0x45],          // ESC E : Bold on
  BOLD_OFF: [0x1B, 0x46],         // ESC F : Bold off
  CONDENSED_ON: [0x0F, 0x1B, 0x0F], // SI (0x0F) & ESC SI : 17.14 CPI Condensed text
  CONDENSED_OFF: [0x12],          // DC2 (0x12) : 10 CPI Normal text
  FORM_FEED: [0x0C]               // FF : Hardware Form Feed
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
 * Perfectly mirrors legacy Clipper/DOS Indian retail pharmacy half-sheet continuous tractor bills
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

  const headerStyle = storeInfo.headerStyle || storeInfo.receiptStyle || 'FULL_PHARMACY';
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
    const memoHeader = (storeInfo.name && storeInfo.name !== 'BETA PHARMACY') ? storeInfo.name : memoTitle;
    lines.push(padRight(memoHeader, 80));
    lines.push(padRight(`Sold to  ${patientName.toUpperCase()}`, 55) + padLeft(`Date: ${date}`, 25));
    lines.push(padRight(`Pr by ${doctorName.toUpperCase()}`, 35) + padCenter(city, 20) + padLeft(`Bill No.${billNo}`, 25));
    lines.push(' '.repeat(80));
    lines.push(' '.repeat(80));
  } else {
    lines.push(padRight(`${storeName} (${modeLabel})`, 80));
    lines.push(padRight(storeAddr, 55) + padLeft(storePhone, 25));
    lines.push(padRight(storeDl, 55) + padLeft(storeMob, 25));
    lines.push(padRight(`Sold to  ${patientName.toUpperCase()}`, 55) + padLeft(`Date: ${date}`, 25));
    lines.push(padRight(`Pr by ${doctorName.toUpperCase()}`, 55) + padLeft(`Bill No.${billNo}`, 25));
  }

  // Dividers & Column Headers (Lines 6 to 8)
  lines.push('-'.repeat(80));
  const colHeader = 
    padRight('Sr', 3) +
    padRight('Product', 24) +
    padRight('Mfr', 4) +
    padRight('Batch', 12) +
    padRight('Expiry', 8) +
    padLeft('M R P/Per', 9) + ' ' +
    padLeft('Qty', 4) + ' ' +
    padLeft('Value', 10);
  lines.push(padRight(colHeader, 80));
  lines.push('-'.repeat(80));

  // Item Rows (Dynamic item count with zero middle blank bloat)
  const itemsToRender = Array.isArray(items) && items.length > 0 ? items : [];
  let runningSubtotal = 0;

  const itemRows = [];
  itemsToRender.forEach((it, slot) => {
    const sr = String(slot + 1).padStart(2, ' ');
    const isSchedule = it.isScheduleH || it.schedule === 'H' || it.schedule === 'H1' || it.medicine?.isScheduleH || it.medicine?.schedule === 'H' || it.medicine?.schedule === 'H1';
    let rawName = (it.medicine?.name || it.name || 'ITEM').toUpperCase();
    let prodName = rawName.slice(0, isSchedule ? 21 : 23);
    if (isSchedule) prodName = padRight(prodName, 22) + '*';
    prodName = padRight(prodName, 24);

    const mfr = padRight((it.medicine?.company || it.company || 'GEN').slice(0, 3).toUpperCase(), 4);
    const batchNo = String(it.batch?.batch_no || it.batch_no || it.batch || 'BN001').trim();
    const batch = padRight(batchNo.slice(0, 11), 12);

    // Read exp_date from all possible alias fields so it never prints blank
    const rawExp = String(it.batch?.exp_date || it.batch?.expiry || it.exp_date || it.expiry || it.exp || '').trim();
    const exp = padRight(rawExp.slice(0, 7), 8);

    const qty = parseInt(it.quantity || it.qty || 1, 10);

    // Read mrp and packSize properly from item, batch, or medicine
    const mrpValue = parseFloat(it.batch?.mrp ?? it.medicine?.mrp ?? it.mrp ?? it.rate ?? 0);
    const packSize = parseInt(it.batch?.per ?? it.medicine?.per ?? it.packSize ?? it.pack ?? 1, 10) || 1;
    const mrpPerStr = packSize > 1 ? `${mrpValue.toFixed(2)}/${packSize}` : mrpValue.toFixed(2);
    const mrpCol = padLeft(mrpPerStr.slice(0, 9), 9);

    const ratePerUnit = packSize > 1 ? (mrpValue / packSize) : (parseFloat(it.rate || mrpValue) || mrpValue);
    const itemAmount = parseFloat(it.totalValue ?? it.amount ?? it.total ?? (qty * ratePerUnit));
    runningSubtotal += itemAmount;

    const qtyCol = padLeft(String(qty), 4);
    const valCol = padLeft(itemAmount.toFixed(2), 10);

    const row = 
      padRight(sr, 3) +
      prodName +
      mfr +
      batch +
      exp +
      mrpCol + ' ' +
      qtyCol + ' ' +
      valCol;
    itemRows.push(padRight(row, 80));
  });

  if (itemRows.length === 0) {
    itemRows.push(padRight(' 1 (NO ITEMS CHARGED)', 80));
  }

  // Push items directly without injecting artificial blank lines in the middle!
  itemRows.forEach(row => lines.push(row));

  // Footer: Anchored cleanly directly below the items
  const netValStr = (netPayable > 0 ? parseFloat(netPayable) : runningSubtotal).toFixed(2);

  // Line: Divider
  lines.push('-'.repeat(80));
  // Line: Net Payable right-aligned under Value column
  lines.push(padRight(padLeft(netValStr, 76), 80));
  // Line: Terms part 1 + dashed line
  lines.push(padRight(padRight('We undertake to refund any excess', 54) + padLeft('------------------', 22), 80));
  // Line: Terms part 2 + Pharmacist Signature
  lines.push(padRight(padRight('collected by oversight. E &.O.E.', 50) + padLeft('Signature - Pharmacist', 26), 80));
  // Line: Return policy
  lines.push(padRight('Sale return will be entertained only within 7 days of bill date.', 80));
  // Line: Time & Get Well Soon
  lines.push(padRight(padRight(time, 20) + padCenter('** GET WELL SOON **', 40) + ' '.repeat(20), 80));

  // Trailing line feeds:
  // Advance paper so the total lines fill the 5.5" half-sheet (33 lines) tractor perforation.
  // This pushes the compact bill up past the print head needles so it is fully visible,
  // and places the horizontal perforation right at the tear bar for clean manual tear-off.
  const targetPageLines = Math.max(33, Math.ceil(lines.length / 33) * 33);
  while (lines.length < targetPageLines) {
    lines.push(' '.repeat(80));
  }

  return lines;
}

/**
 * Generates raw ESC/P byte buffer for TVS MSP 250 Star (9-Pin Dot Matrix)
 * Adheres strictly to Indian retail pharmacy half-sheet tractor feed (8.5" x 5.5" / 33 lines).
 * 
 * Hardware sequence:
 * 1. ESC @ (Initialize printer hardware & clear buffer)
 * 2. ESC 2 (Standard 1/6-inch line spacing = 6 LPI)
 * 3. ESC C 33 (Set physical page length to exactly 33 lines)
 * 4. 0x0F & ESC SI (Condensed Mode ON = 17.14 CPI - fits 80 cols within 4.66" without cut-off)
 * 5. Content lines (Exactly 33 lines followed by CRLF 0x0D 0x0A)
 *    - 33 lines * 1/6" = exactly 5.5 inches (11 tractor holes)
 *    - Print head stops dead at the tear-off perforation line!
 * 6. ZERO FORM FEED (0x0C): Omitted to eliminate 11-inch driver overfeed and tractor jamming.
 * 
 * @param {Object} billData 
 * @returns {Uint8Array} Binary print stream
 */
export function generateTvsEscPosStream(billData) {
  const lines = formatTvsBillLines(billData);
  const bytes = [];

  // 1. Initialize hardware / reset buffer
  bytes.push(...ESC_P.INIT); // 0x1B, 0x40

  // 2. Set standard 6 lines per inch (6 LPI - each line feed is 1/6 inch)
  bytes.push(...ESC_P.LINE_SPACING_6LPI); // 0x1B, 0x32

  // 3. Set page length to exactly 33 lines (half-sheet 5.5 inches)
  bytes.push(...ESC_P.PAGE_LEN_33); // 0x1B, 0x43, 33

  // 4. Set Condensed Mode ON (17.14 CPI)
  // Both SI (0x0F) and ESC SI (0x1B, 0x0F) are sent for 100% TVS MSP 250 firmware compatibility
  bytes.push(...ESC_P.CONDENSED_ON);

  // 5. Output lines with hardware bolding
  lines.forEach((line, idx) => {
    // Bold store name header (Line 0) and Net total line (isolated numeric line with decimal)
    const isStoreName = (idx === 0);
    const isNetLine = idx > 7 && /^\s*\d+\.\d{2}\s*$/.test(line);

    if (isStoreName || isNetLine) {
      bytes.push(...ESC_P.BOLD_ON);
    }

    // Convert line chars to ASCII bytes
    for (let i = 0; i < line.length; i++) {
      bytes.push(line.charCodeAt(i) & 0xFF);
    }

    if (isStoreName || isNetLine) {
      bytes.push(...ESC_P.BOLD_OFF);
    }

    // Carriage Return + Line Feed: moves platen by 1/6 inch
    bytes.push(0x0D, 0x0A);
  });

  // ZERO Form Feed (0x0C): The 33 physical line feeds mechanically equal exactly 5.5 inches
  // (11 tractor holes), stopping the paper directly on the perforation without overfeed.

  return new Uint8Array(bytes);
}
