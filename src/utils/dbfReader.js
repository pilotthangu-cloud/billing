/**
 * Client-Side DBF (dBase III / Clipper / FoxPro) & CSV Parser
 * Runs 100% in-browser via Web APIs (FileReader & ArrayBuffer)
 * Zero external dependencies, zero server egress bloat.
 * 
 * Includes Authoritative Master Catalog Cross-Referencing:
 * Automatically matches item codes (e.g. IT_CODE 'E074A000') against the 
 * 24,665 master medicine catalog so that even if a pure stock file (e.g. STK2610.DBF)
 * is imported, real medicine names, racks, MRP, and pack sizes are 100% preserved!
 */

import masterCatalogData from '../data/medicines.json' with { type: 'json' };

// Build instantaneous O(1) indexed lookup maps
const masterByCode = new Map();
const masterByName = new Map();

if (Array.isArray(masterCatalogData)) {
  masterCatalogData.forEach(m => {
    if (m.code) {
      masterByCode.set(String(m.code).trim().toUpperCase(), m);
    }
    if (m.name) {
      masterByName.set(String(m.name).trim().toUpperCase(), m);
    }
  });
}

/**
 * Parses raw ArrayBuffer of a dBase III / Clipper DBF file
 * Handles zero-terminated field names and DOS Latin-1 / Windows-1252 text
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
  while (offset < headerLen && offset + 32 <= headerLen) {
    const firstByte = view.getUint8(offset);
    if (firstByte === 0x0D) break; // End of header marker

    // Field name: up to 11 bytes, terminated by the first null byte (0x00)
    let nameBytes = [];
    for (let i = 0; i < 11; i++) {
      const b = view.getUint8(offset + i);
      if (b === 0) break; // CRITICAL: Stop at the first null byte!
      nameBytes.push(b);
    }
    let name = String.fromCharCode(...nameBytes).trim().toUpperCase();
    name = name.replace(/[^A-Z0-9_]/g, ''); // Strip any unprintable/stray characters

    if (!name) {
      offset += 32;
      continue;
    }

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
        if (fieldPos + f.length > buffer.byteLength) break;
        const rawBytes = new Uint8Array(buffer, fieldPos, f.length);
        let valStr = '';
        try {
          valStr = decoder.decode(rawBytes).trim();
        } catch (_) {
          valStr = String.fromCharCode(...rawBytes).trim();
        }

        // Clean null terminators within text fields
        const nullIdx = valStr.indexOf('\0');
        if (nullIdx !== -1) {
          valStr = valStr.substring(0, nullIdx).trim();
        }
        
        if (f.type === 'N' || f.type === 'F') {
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
      const key = h.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
      if (key) {
        rec[key] = values[idx] !== undefined ? values[idx].trim() : '';
      }
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
 * Cleans medicine names by removing legacy Clipper formatting markers (+, *, trailing dots)
 */
function cleanMedicineName(rawName) {
  if (!rawName) return '';
  return rawName
    .replace(/[+*.]+$/g, '') // remove trailing +, *, .
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Standardizes extracted records from Clipper/FoxPro (ITEMFILE.DBF, STK2610.DBF, CSV)
 * into Beta Pharmacy's high-speed catalog schema.
 * 
 * Cross-references the authoritative 24,665 master catalog to recover real medicine
 * names, racks, and MRPs even when importing stock-only balance files (e.g. STK2610.DBF).
 */
export function normalizeLegacyMedicineRecords(records, customMaster = null, companyMap = null) {
  const activeMasterByCode = customMaster 
    ? new Map(customMaster.map(m => [String(m.code || '').trim().toUpperCase(), m]))
    : masterByCode;

  const activeMasterByName = customMaster
    ? new Map(customMaster.map(m => [cleanMedicineName(m.name), m]))
    : masterByName;

  const normalizedList = records.map((rawRec, idx) => {
    // 1. Normalize all field keys to uppercase trimmed strings
    const r = {};
    for (const [k, v] of Object.entries(rawRec)) {
      if (k) r[k.trim().toUpperCase()] = v;
    }

    // 2. Extract Item Code
    const rawCode = r.IT_CODE || r.ITEMCODE || r.ITEM_CODE || r.CODE || r.ID || r.PRODUCT_CODE || r.PROD_CODE || '';
    const code = String(rawCode).trim().toUpperCase() || `IMP-${(idx + 1).toString().padStart(5, '0')}`;

    // 3. Find matching master record (by code or name)
    const master = activeMasterByCode.get(code) || activeMasterByName.get(cleanMedicineName(r.IT_NAME || r.NAME || ''));

    // 4. Extract Medicine Name
    const rawName = r.IT_NAME || r.ITEMNAME || r.ITEM_NAME || r.NAME || r.DESCRIPTION || r.DESCRIPT || r.DESCR || r.PRODUCT || r.PRODUCT_NAME || r.PARTICULAR || r.PARTICULARS || r.MEDICINE || r.MED_NAME || r.TITLE || r.DRUG_NAME || '';
    let cleanedName = cleanMedicineName(rawName);

    // If name is blank or "UNKNOWN MEDICINE", look it up from the 24,665 master catalog!
    if (!cleanedName || cleanedName === 'UNKNOWN MEDICINE' || cleanedName === 'UNKNOWN') {
      if (master && master.name) {
        cleanedName = cleanMedicineName(master.name);
      } else {
        cleanedName = code ? `MEDICINE ${code}` : `ITEM ${(idx + 1).toString().padStart(5, '0')}`;
      }
    }

    // 5. Extract Rack Location
    const rawRack = r.RACK || r.RACKNO || r.RACK_NO || r.LOCATION || r.SHELF || r.BIN || '';
    let rack = String(rawRack).trim().toUpperCase();
    if (!rack) {
      rack = master?.rack || 'GN';
    }

    // 6. Extract MRP & PTR
    let mrp = parseFloat(r.MRP || r.PRICE || r.RATE || r.MRATE || r.S_RATE || r.SRATE || 0);
    if (!mrp || mrp <= 0 || (mrp === 10.0 && master?.mrp && master.mrp !== 10.0)) {
      mrp = master?.mrp || 10.0;
    }

    let ptr = parseFloat(r.PTR || r.PUR_RATE || r.PURRATE || r.PRATE || r.COST || 0);
    if (!ptr || ptr <= 0 || (ptr === 7.5 && master?.ptr && master.ptr !== 7.5)) {
      ptr = master?.ptr || Number((mrp * 0.78).toFixed(2));
    }

    // 7. Extract Stock (Critical for STK2610.DBF & inventory files)
    let stock = 0;
    if (r.STOCK !== undefined) stock = parseInt(r.STOCK, 10) || 0;
    else if (r.QTY !== undefined) stock = parseInt(r.QTY, 10) || 0;
    else if (r.BALANCE !== undefined) stock = parseInt(r.BALANCE, 10) || 0;
    else if (r.CLOSING_ST !== undefined) stock = parseInt(r.CLOSING_ST, 10) || 0;
    else if (r.CL_STOCK !== undefined) stock = parseInt(r.CL_STOCK, 10) || 0;
    else if (r.OP_STOCK !== undefined) stock = parseInt(r.OP_STOCK, 10) || 0;
    else if (r.IT_QTY !== undefined) stock = parseInt(r.IT_QTY, 10) || 0;
    else stock = 0; // Strictly 0 if not in imported stock file - NEVER resurrect master.stock_shop1!

    // 8. Extract Packing & Units
    const packing = String(r.PACK || r.PACKING || r.UNIT || r.PER || master?.per || '10 TAB').trim();
    const per = parseInt(r.PER || master?.per || 10, 10) || 10;

    // 9. Extract Company & Generic
    const rawCoCode = String(r.CO_CODE || r.COMPANY_CODE || r.MFG_CODE || '').trim().toUpperCase();
    let company = (companyMap && rawCoCode && companyMap.get(rawCoCode)) ||
      String(r.CO_NAME || r.COMPANY || r.MFG || r.MFGR || '').trim().toUpperCase();
    // Option B: Preserved verbatim without master catalogue substitution

    let generic = String(r.GEN_NAME || r.GENERIC || r.COMPOSITION || r.SALT || '').trim().toUpperCase();
    if (!generic && master?.generic) {
      generic = master.generic.toUpperCase();
    }

    // 10. GST Tax & HSN
    const gstPercent = parseFloat(r.GST || r.TAX || r.VAT || r.PUR_TAX || r.SAL_TPS || master?.tax_percent || 12) || 12;
    const hsn = String(r.HSN || r.HSNCODE || r.HSN_CODE || master?.hsn || '3004').trim();

    // 11. Batches (keep realistic batches from imported DBF or master catalog)
    let batches = [];
    if (Array.isArray(r.BATCHES) && r.BATCHES.length > 0) {
      batches = r.BATCHES.map(b => ({
        batch_no: String(b.batch_no || b.batch || `B${code.slice(-4)}`).trim(),
        exp_date: String(b.exp_date || b.exp || '').trim(),
        mrp: parseFloat(b.mrp) || Number(mrp.toFixed(2)),
        per: per,
        qty: parseInt(b.qty || b.stock || 0, 10) || 0,
        supplier: b.supplier || ''
      }));
    } else if (r.BATCH || r.BATCH_NO || r.BAT_NO || r.BATCHNO || r.LOT_NO || r.LOT || r.EXPIRY || r.EXP_DATE || r.EXPDATE || r.EXPDT || r.EXP || r.EDATE) {
      const extractedBatch = String(r.BATCH || r.BATCH_NO || r.BAT_NO || r.BATCHNO || r.LOT_NO || r.LOT || `B${code.slice(-4)}`).trim();
      const extractedExp = String(r.EXPIRY || r.EXP_DATE || r.EXPDATE || r.EXPDT || r.EXP_DT || r.EXP || r.EDATE || r.DT_EXP || '').trim();
      batches = [{
        batch_no: extractedBatch,
        exp_date: extractedExp,
        mrp: Number(mrp.toFixed(2)),
        per: per,
        qty: stock,
        supplier: r.SUPPLIER || r.DIST || ''
      }];
    } else if (stock > 0) {
      batches = (master?.batches && master.batches.length > 0) ? master.batches : [{
        batch_no: `B${code.slice(-4)}`,
        exp_date: '',
        mrp: Number(mrp.toFixed(2)),
        per: per,
        qty: stock,
        supplier: ''
      }];
    } else {
      batches = [];
    }

    return {
      code,
      name: cleanedName,
      packing,
      per,
      company,
      generic,
      rack,
      mrp: Number(mrp.toFixed(2)),
      ptr: Number(ptr.toFixed(2)),
      stock,
      stock_shop1: stock,
      stock_shop2: master?.stock_shop2 || 0,
      stock_shop3: master?.stock_shop3 || 0,
      gstPercent,
      hsn,
      schedule: master?.schedule || (cleanedName.includes('CLONA') || cleanedName.includes('ALPRA') ? 'H1' : ''),
      batches,
      isImported: true
    };
  });

  // Group duplicate medicine codes: sum live stock and merge batches
  const groupedMap = new Map();
  for (const item of normalizedList) {
    if (!groupedMap.has(item.code)) {
      groupedMap.set(item.code, item);
    } else {
      const existing = groupedMap.get(item.code);
      existing.stock = (existing.stock || 0) + (item.stock || 0);
      existing.stock_shop1 = existing.stock;
      const existingBatchNos = new Set((existing.batches || []).map(b => b.batch_no));
      for (const b of (item.batches || [])) {
        if (!existingBatchNos.has(b.batch_no)) {
          existing.batches.push(b);
          existingBatchNos.add(b.batch_no);
        }
      }
    }
  }

  return Array.from(groupedMap.values());
}

/**
 * Emergency Auto-Repair: Heals any medicines in state that have 'UNKNOWN MEDICINE'
 * by cross-referencing code or index against the 24,665 master catalog.
 */
export function autoRepairCorruptedMedicines(medicinesList) {
  if (!Array.isArray(medicinesList)) return masterCatalogData;

  return medicinesList.map((med, idx) => {
    if (!med || !med.name || med.name.toUpperCase().includes('UNKNOWN')) {
      const codeUpper = String(med?.code || '').trim().toUpperCase();
      const master = masterByCode.get(codeUpper) || masterCatalogData[idx];
      if (master) {
        return {
          ...master,
          stock: med.stock !== undefined ? med.stock : master.stock_shop1,
          stock_shop1: med.stock !== undefined ? med.stock : master.stock_shop1
        };
      }
    }
    return med;
  });
}


/**
 * Universal Multi-File DBF Folder Processor (ITEMFILE + COMPMAST + STKFILE)
 * Shared between FirstTimeSetupWizardModal and DatabaseImportModal
 */
export async function processDbfFolderFiles(fileList, statusCallback = () => {}) {
  const files = Array.from(fileList || []);
  if (files.length === 0) {
    throw new Error('No files found in folder.');
  }

  // 1. Locate Master Item File
  const itemFile = files.find(f => {
    const n = f.name.toUpperCase();
    return (n.startsWith('ITEM') || n.startsWith('MEDICINE') || n.startsWith('PRODUCT')) && n.endsWith('.DBF');
  });

  // 2. Locate Company Master File (COMPMAST.DBF / COMPANY.DBF / COMAST.DBF / etc.)
  const companyFile = files.find(f => {
    const n = f.name.toUpperCase();
    return (n.startsWith('COMP') || n.startsWith('COMAST') || n.startsWith('COMPANY')) && n.endsWith('.DBF');
  });

  // Build Company Map if COMPMAST.DBF is present
  const companyMap = new Map();
  if (companyFile) {
    statusCallback(`Reading company master from ${companyFile.name}...`);
    const cBuf = await companyFile.arrayBuffer();
    const { records: compRecs } = parseDbfBuffer(cBuf);
    compRecs.forEach(cr => {
      const coCode = String(cr.CO_CODE || cr.CODE || cr.C_CODE || cr.MF_CODE || '').trim().toUpperCase();
      const coName = String(cr.CO_NAME || cr.NAME || cr.COMPANY || cr.MFR || '').trim();
      if (coCode && coName) {
        companyMap.set(coCode, coName);
      }
    });
  }

  // 3. Locate Stock File (Chronological STK<DD><MM>.DBF, STKFILE.DBF, STOCK*.DBF, BATCH*.DBF)
  const stockFiles = files.filter(f => {
    const n = f.name.toUpperCase();
    return (n.startsWith('STK') || n.startsWith('STOCK') || n.startsWith('BATCH')) && n.endsWith('.DBF');
  });

  function getStkFilePriorityScore(file) {
    const n = file.name.toUpperCase();
    // Daily closing stock pattern: STK<DD><MM>.DBF (e.g. STK0411.DBF = Nov 04, STK2610.DBF = Oct 26)
    const match = n.match(/^STK(\d{2})(\d{2})\.DBF$/i);
    if (match) {
      const day = parseInt(match[1], 10) || 1;
      const month = parseInt(match[2], 10) || 1;
      return 10000 + (month * 100 + day);
    }
    if (n === 'STKFILE.DBF') return 5000;
    if (n.startsWith('STK')) return 4000;
    if (n.startsWith('STOCK')) return 3000;
    if (n.startsWith('BATCH')) return 2000;
    return 1000;
  }

  let stockFile = null;
  if (stockFiles.length > 0) {
    stockFiles.sort((a, b) => {
      const scoreA = getStkFilePriorityScore(a);
      const scoreB = getStkFilePriorityScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      // Fallback to lastModified timestamp if scores are identical
      return (b.lastModified || 0) - (a.lastModified || 0);
    });
    stockFile = stockFiles[0];
  }

  let records = [];

  // Parse Item File
  if (itemFile) {
    statusCallback(`Reading master catalog from ${itemFile.name}...`);
    const buf = await itemFile.arrayBuffer();
    const { records: itemRecs } = parseDbfBuffer(buf);
    records = itemRecs;
  }

  // Parse and Merge Stock File
  const stockMap = new Map();
  const batchesMap = new Map();

  if (stockFile) {
    statusCallback(`Applying live shop stock from ${stockFile.name}...`);
    const sBuf = await stockFile.arrayBuffer();
    const { records: stockRecs } = parseDbfBuffer(sBuf);

    stockRecs.forEach(sr => {
      const code = String(sr.IT_CODE || sr.CODE || '').trim().toUpperCase();
      const batchQty = parseInt(sr.STOCK || sr.QTY || sr.BALANCE || sr.CL_STOCK || 0, 10) || 0;
      if (!code) return;

      stockMap.set(code, (stockMap.get(code) || 0) + batchQty);

      const batchNo = String(sr.BATCH || sr.BATCH_NO || sr.BAT_NO || 'BN001').trim();
      const expDate = String(sr.EXPIRY || sr.EXP_DATE || sr.EXP || '').trim();
      const mrp = parseFloat(sr.MRP || sr.RATE || sr.PRICE || 0) || 0;
      const ptr = parseFloat(sr.PTR || sr.PUR_RATE || sr.PRATE || 0) || 0;
      const supplier = String(sr.SUPPLIER || sr.DIST || 'Direct Inward').trim();

      const list = batchesMap.get(code) || [];
      list.push({
        batch_no: batchNo,
        exp_date: expDate,
        mrp: mrp > 0 ? mrp : undefined,
        ptr: ptr > 0 ? ptr : undefined,
        qty: batchQty,
        stock: batchQty,
        supplier: supplier
      });
      batchesMap.set(code, list);
    });

    if (records.length > 0) {
      records = records.map(r => {
        const code = String(r.IT_CODE || r.CODE || '').trim().toUpperCase();
        if (stockMap.has(code)) {
          return {
            ...r,
            STOCK: stockMap.get(code),
            BATCHES: batchesMap.get(code)
          };
        }
        return {
          ...r,
          STOCK: 0,
          BATCHES: []
        };
      });
    } else {
      const grouped = [];
      batchesMap.forEach((batchList, code) => {
        const total = stockMap.get(code) || 0;
        grouped.push({
          IT_CODE: code,
          IT_NAME: '',
          STOCK: total,
          BATCHES: batchList
        });
      });
      records = grouped;
    }
  }

  if (records.length === 0) {
    throw new Error('No valid medicine records found in the selected files.');
  }

  statusCallback(`Normalizing ${records.length.toLocaleString()} records...`);
  const normalized = normalizeLegacyMedicineRecords(records, null, companyMap);

  return {
    medicines: normalized,
    itemFile: itemFile?.name || null,
    stockFile: stockFile?.name || null,
    companyFile: companyFile?.name || null,
    totalCount: normalized.length,
    activeStockCount: stockMap.size,
    companyCount: companyMap.size
  };
}

/**
 * Robust HTML5 Drag & Drop File Extractor (Extracts recursive folder contents)
 */
export async function extractFilesFromDrop(dataTransfer) {
  const files = [];
  const items = dataTransfer?.items;
  if (items && items.length > 0) {
    const queue = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) queue.push(entry);
        else {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }
    while (queue.length > 0) {
      const entry = queue.shift();
      if (entry.isFile) {
        const f = await new Promise(res => entry.file(res, () => res(null)));
        if (f) files.push(f);
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readEntries = () => new Promise(res => dirReader.readEntries(res, () => res([])));
        let batch;
        do {
          batch = await readEntries();
          queue.push(...batch);
        } while (batch && batch.length > 0);
      }
    }
  }
  if (files.length === 0 && dataTransfer?.files) {
    files.push(...Array.from(dataTransfer.files));
  }
  return files;
}
