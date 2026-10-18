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
