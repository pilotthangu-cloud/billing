/**
 * Digital WhatsApp Bill Invoice Formatter & Generator
 * Generates beautifully formatted ESC/P style text receipts suitable for WhatsApp delivery.
 */

/**
 * Format date string or timestamp nicely
 */
function formatBillDate(dateStr, timeStr) {
  const d = dateStr || new Date().toLocaleDateString('en-GB');
  const t = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${d} ${t}`;
}

/**
 * Generate a complete, elegant WhatsApp invoice message
 * @param {Object} billData Completed or current bill object
 * @returns {string} WhatsApp-compatible Markdown formatted bill text
 */
export function generateWhatsAppBillText(billData) {
  if (!billData) return '';

  const storeName = (billData.store || 'BETA PHARMACY').toUpperCase();
  const branchLoc = billData.location ? ` (${billData.location})` : '';
  const billNo = billData.billNo || '000000';
  const dateTime = formatBillDate(billData.date, billData.time);
  const patient = (billData.patientName || billData.customerName || 'VALUED CUSTOMER').toUpperCase();
  const phone = (billData.customerPhone || billData.phone) ? `+91 ${billData.customerPhone || billData.phone}` : '';
  const doctor = (billData.doctorName || 'GENERAL OTC').toUpperCase();
  const paymentMode = (billData.paymentMode || 'CASH').toUpperCase();
  const items = Array.isArray(billData.items) ? billData.items : [];

  let itemsText = '';
  let subtotal = 0;

  items.forEach((item, index) => {
    const medName = item.medicine ? item.medicine.name : (item.name || 'MEDICINE');
    const batchNo = item.batch ? (item.batch.batch_no || item.batch) : (item.batchNo || '-');
    const expDate = item.batch?.exp_date || item.exp || '-';
    const qty = parseInt(item.qty, 10) || 1;
    const packPer = item.batch?.per || item.per || 10;
    const mrp = item.batch?.mrp || item.mrp || 0;
    const lineVal = typeof item.totalValue === 'number' 
      ? item.totalValue 
      : (mrp / packPer) * qty;

    subtotal += lineVal;

    itemsText += `${index + 1}. *${medName}* (${packPer}s)\n`;
    itemsText += `   Batch: \`${batchNo}\` | Exp: \`${expDate}\`\n`;
    itemsText += `   Qty: *${qty}* units × ₹${(mrp / packPer).toFixed(2)} = *₹${lineVal.toFixed(2)}*\n`;
  });

  const grossTotal = typeof billData.grossTotal === 'number' 
    ? billData.grossTotal 
    : (typeof billData.subtotal === 'number' ? billData.subtotal : subtotal);
  const netPayable = typeof billData.netPayable === 'number' 
    ? billData.netPayable 
    : (typeof billData.netTotal === 'number' ? billData.netTotal : Math.round(grossTotal));
  const roundOff = netPayable - grossTotal;

  const msg = [
    `🏥 *${storeName}${branchLoc}*`,
    `_GST Registered Retail Pharmacy & Healthcare_`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 *TAX INVOICE / CASH MEMO*`,
    `*Bill No:* #${billNo}`,
    `*Date & Time:* ${dateTime}`,
    `*Patient:* ${patient}${phone ? ` (${phone})` : ''}`,
    `*Prescribed by:* ${doctor}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*ITEMS DISPENSED:*`,
    itemsText || `_No items recorded_\n`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*Gross Amount:* ₹${grossTotal.toFixed(2)}`,
    Math.abs(roundOff) > 0.001 ? `*Round Off:* ${roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}` : null,
    `*NET PAYABLE:* *₹${netPayable.toFixed(2)}*`,
    `*Payment Status:* ${paymentMode} (PAID)`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ *Thank you for your visit!*`,
    `💊 Please verify medicine names & dosages before taking.`,
    `📞 For refills / queries: +91 98470 12345 / Beta Pharmacy Support`
  ].filter(Boolean).join('\n');

  return msg;
}

/**
 * Generate a WhatsApp Web / Universal App URL
 * @param {string} phone Customer 10-digit phone number
 * @param {string} text Message body
 * @returns {string} WhatsApp share link
 */
export function getWhatsAppShareUrl(phone = '', text = '') {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);

  if (cleanPhone.length >= 10) {
    // If phone has 10 digits without country code, prefix with 91 (India)
    const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${intlPhone}?text=${encodedText}`;
  }

  // Fallback to general WhatsApp share URL if phone is blank
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * 1-Click action to trigger WhatsApp Web or App
 * Prompts user for phone if not provided
 */
export function triggerWhatsAppBillShare(billData, fallbackPhone = '') {
  if (!billData) return;

  let phone = (billData.customerPhone || fallbackPhone || '').trim();
  if (!phone || phone.length < 10) {
    const input = window.prompt(
      'Enter customer 10-digit WhatsApp phone number (e.g. 9847012345):', 
      phone || ''
    );
    if (!input) return; // user cancelled
    phone = input.trim();
  }

  const text = generateWhatsAppBillText({ ...billData, customerPhone: phone });
  const url = getWhatsAppShareUrl(phone, text);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Standardizes any expiry date string into standard Indian pharmacy MM/YY format.
 * Supports:
 * - YYYYMMDD (dBase III Date field, e.g. 20271231, 20271200) -> 12/27
 * - YYYYMM (e.g. 202712) -> 12/27
 * - Delimited: MM/YY, MM-YY, MM.YY, MM/YYYY, DD/MM/YYYY, YYYY-MM-DD
 * - 4-digit MMYY (e.g. 1227 -> 12/27)
 * 
 * @param {string|number} val Raw date string or number
 * @returns {string} Clean MM/YY formatted string (e.g. "12/27")
 */
export function normalizeExpiry(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';

  // 1. Matches YYYYMMDD (e.g. 20271231, 20271200) -> MM/YY: 12/27
  const yyyymmdd = s.match(/^(\d{4})(\d{2})\d{2}$/);
  if (yyyymmdd) {
    const yr = yyyymmdd[1].slice(-2);
    const mo = yyyymmdd[2];
    return `${mo}/${yr}`;
  }

  // 2. Matches YYYYMM (e.g. 202712) -> 12/27
  const yyyymm = s.match(/^(\d{4})(\d{2})$/);
  if (yyyymm) {
    const yr = yyyymm[1].slice(-2);
    const mo = yyyymm[2];
    return `${mo}/${yr}`;
  }

  // 3. Delimited formats: MM/YY, MM-YY, MM.YY, MM/YYYY, DD/MM/YYYY, YYYY-MM-DD
  const parts = s.split(/[\/\-\.]/).map(p => p.trim());
  if (parts.length === 2) {
    let mo = parseInt(parts[0], 10);
    let yr = parseInt(parts[1], 10);
    if (mo >= 1 && mo <= 12) {
      return `${String(mo).padStart(2, '0')}/${String(yr).slice(-2)}`;
    } else if (yr >= 1 && yr <= 12) {
      return `${String(yr).padStart(2, '0')}/${String(mo).slice(-2)}`;
    }
  } else if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const yr = parts[0].slice(-2);
      const mo = String(parseInt(parts[1], 10)).padStart(2, '0');
      return `${mo}/${yr}`;
    } else {
      // DD/MM/YYYY
      const mo = String(parseInt(parts[1], 10)).padStart(2, '0');
      const yr = parts[2].slice(-2);
      return `${mo}/${yr}`;
    }
  }

  // 4. Matches 4-digit MMYY (e.g. 1227 -> 12/27)
  const mmyy = s.match(/^(\d{2})(\d{2})$/);
  if (mmyy) {
    const mo = parseInt(mmyy[1], 10);
    if (mo >= 1 && mo <= 12) {
      return `${mmyy[1]}/${mmyy[2]}`;
    }
  }

  return s;
}

/**
 * Backwards-compatible expiry normalizer.
 *
 * IMPORTANT: an expiry date is regulated inventory data.  It must never be
 * invented or moved into the future merely to make a batch saleable.  Older
 * callers still use this function name, so retain the export while making its
 * behaviour lossless and safe.
 *
 * @param {string} expStr Expiry string
 * @returns {string} Normalized expiry, or an empty string when none was supplied
 */
export function rollExpiryForwardIfPast(expStr) {
  return normalizeExpiry(expStr);
}

/**
 * Regulatory expiry checker under Drugs and Cosmetics Act (Section 18)
 * @param {string} expStr Expiry string formatted as MM/YY, MM/YYYY, or MM-YY
 * @returns {boolean} True if expired relative to current calendar month/year
 */
export function isBatchExpired(expStr) {
  if (!expStr || typeof expStr !== 'string') return false;
  const norm = normalizeExpiry(expStr);
  const parts = norm.trim().split(/[\/\-]/);
  if (parts.length >= 2) {
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (year < 100) year += 2000;
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    if (year < curYear || (year === curYear && month < curMonth)) {
      return true;
    }
  }
  return false;
}
