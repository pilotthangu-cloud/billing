/**
 * Client-Side DBF (dBase III / Clipper / FoxPro) & CSV Parser
 * Runs 100% in-browser via Web APIs (FileReader & ArrayBuffer)
 * Zero external dependencies, zero server egress bloat.
 */

export function parseDbfBuffer(buffer) {
  const view = new DataView(buffer);
  
  // Header: 32 bytes
  const recordCount = view.getUint32(4, true);
  const headerLen = view.getUint16(8, true);
  const recordLen = view.getUint16(10, true);

  const fields = [];
  let offset = 32;

  // Read field descriptors
  while (offset < headerLen) {
    const firstByte = view.getUint8(offset);
    if (firstByte === 0x0D) break; // End of header marker

    // Field name: up to 11 bytes
    let nameBytes = [];
    for (let i = 0; i < 11; i++) {
      const b = view.getUint8(offset + i);
      if (b !== 0) nameBytes.push(b);
    }
    const name = String.fromCharCode(...nameBytes).trim().toUpperCase();
    const type = String.fromCharCode(view.getUint8(offset + 11));
    const length = view.getUint8(offset + 16);
    const decimals = view.getUint8(offset + 17);

    fields.push({ name, type, length, decimals });
    offset += 32;
  }

  // Read records
  const records = [];
  const decoder = new TextDecoder('latin1');
  let recOffset = headerLen;

  for (let r = 0; r < recordCount && recOffset + recordLen <= buffer.byteLength; r++) {
    const isDeleted = view.getUint8(recOffset) === 0x2A; // '*' = deleted
    if (!isDeleted) {
      const record = {};
      let fieldPos = recOffset + 1;

      for (const f of fields) {
        const rawBytes = new Uint8Array(buffer, fieldPos, f.length);
        const valStr = decoder.decode(rawBytes).trim();
        
        if (f.type === 'N') {
          record[f.name] = valStr === '' ? 0 : parseFloat(valStr) || 0;
        } else {
          record[f.name] = valStr;
        }

        fieldPos += f.length;
      }
      records.push(record);
    }
    recOffset += recordLen;
  }

  return { fields, records };
}

/**
 * Standard CSV Parser supporting quotes and comma separation
 */
export function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCsvLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;
    const rec = {};
    header.forEach((h, idx) => {
      rec[h.trim().toUpperCase()] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    records.push(rec);
  }

  return records;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Standardizes extracted records from Clipper/FoxPro (ITEMFILE.DBF, STK2610.DBF, CSV)
 * into Beta Pharmacy's high-speed catalog schema.
 */
export function normalizeLegacyMedicineRecords(records) {
  return records.map((r, idx) => {
    // Look for common column variants in Clipper / Marg / Tally
    const code = r.IT_CODE || r.ITEMCODE || r.CODE || r.ID || `IMP-${(idx + 1).toString().padStart(5, '0')}`;
    const name = r.IT_NAME || r.ITEMNAME || r.NAME || r.DESCRIPTION || r.PRODUCT || 'UNKNOWN MEDICINE';
    const packing = r.PACK || r.PACKING || r.UNIT || '10 TAB';
    const company = r.CO_NAME || r.COMPANY || r.MFG || r.MFGR || 'GENERIC';
    const generic = r.GEN_NAME || r.GENERIC || r.COMPOSITION || r.SALT || '';
    const rack = r.RACK || r.LOCATION || r.SHELF || 'A-01';
    
    const mrp = parseFloat(r.MRP || r.PRICE || r.RATE || 0) || 10.0;
    const ptr = parseFloat(r.PTR || r.PUR_RATE || r.PURRATE || (mrp * 0.75)) || (mrp * 0.75);
    const stock = parseInt(r.STOCK || r.QTY || r.BALANCE || 0, 10) || 0;
    const gstPercent = parseFloat(r.GST || r.TAX || r.VAT || 12) || 12;
    const hsn = r.HSN || r.HSNCODE || '30049099';

    return {
      code: String(code).trim(),
      name: String(name).trim().toUpperCase(),
      packing: String(packing).trim(),
      company: String(company).trim().toUpperCase(),
      generic: String(generic).trim().toUpperCase(),
      rack: String(rack).trim().toUpperCase(),
      mrp: Number(mrp.toFixed(2)),
      ptr: Number(ptr.toFixed(2)),
      stock: stock,
      stock_shop1: stock,
      stock_shop2: 0,
      stock_shop3: 0,
      gstPercent: gstPercent,
      hsn: String(hsn).trim(),
      schedule: name.toUpperCase().includes('CLONA') || name.toUpperCase().includes('ALPRA') ? 'H1' : 'H',
      isImported: true
    };
  });
}
