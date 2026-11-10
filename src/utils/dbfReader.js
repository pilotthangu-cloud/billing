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
import { isBatchExpired, isExpiryValid, normalizeExpiry } from './billUtils.js';

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
  const hasSourceMaster = Array.isArray(customMaster);
  const activeMasterByCode = customMaster 
    ? new Map(customMaster.map(m => [String(m.code || '').trim().toUpperCase(), m]))
    : masterByCode;

  const activeMasterByName = customMaster
    ? new Map(customMaster.map(m => [cleanMedicineName(m.name), m]))
    : masterByName;

  const normalizedList = records.map((rawRec) => {
    // 1. Normalize all field keys to uppercase trimmed strings
    const r = {};
    for (const [k, v] of Object.entries(rawRec)) {
      if (k) r[k.trim().toUpperCase()] = v;
    }

    // 2. Extract Item Code
    const rawCode = r.IT_CODE || r.ITEMCODE || r.ITEM_CODE || r.CODE || r.ID || r.PRODUCT_CODE || r.PROD_CODE || '';
    const code = String(rawCode).trim().toUpperCase();
    if (!code) return null;

    // 3. Find matching master record (by code or name)
    const master = activeMasterByCode.get(code) || activeMasterByName.get(cleanMedicineName(r.IT_NAME || r.NAME || ''));

    // 4. Extract Medicine Name
    const rawName = r.IT_NAME || r.ITEMNAME || r.ITEM_NAME || r.NAME || r.DESCRIPTION || r.DESCRIPT || r.DESCR || r.PRODUCT || r.PRODUCT_NAME || r.PARTICULAR || r.PARTICULARS || r.MEDICINE || r.MED_NAME || r.TITLE || r.DRUG_NAME || '';
    let cleanedName = cleanMedicineName(rawName);

    // A code match may safely restore descriptive catalog fields. It must never
    // be used to manufacture transactional fields such as stock, batch or expiry.
    if (!cleanedName || cleanedName === 'UNKNOWN MEDICINE' || cleanedName === 'UNKNOWN') {
      if (master && master.name) {
        cleanedName = cleanMedicineName(master.name);
      } else {
        cleanedName = '';
      }
    }

    // 5. Extract Rack Location
    const rawRack = r.RACK || r.RACKNO || r.RACK_NO || r.LOCATION || r.SHELF || r.BIN || '';
    let rack = String(rawRack).trim().toUpperCase();
    if (!rack) {
      rack = master?.rack || '';
    }

    // 6. Extract MRP & PTR
    const firstPresent = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '');
    const mrpSource = firstPresent(r.MRP, r.PRICE, r.RATE, r.MRATE, r.S_RATE, r.SRATE, master?.mrp, 0);
    let mrp = Number(mrpSource);
    if (!Number.isFinite(mrp)) mrp = 0;

    const ptrSource = firstPresent(r.PTR, r.PUR_RATE, r.PURRATE, r.PRATE, r.COST, master?.ptr, 0);
    let ptr = Number(ptrSource);
    if (!Number.isFinite(ptr)) ptr = 0;

    // 7. Extract Stock (Exhaustive aliases for Clipper/FoxPro/Marg/DOS stock files)
    let stock = 0;
    const rawStock = r.STOCK ?? r.QTY ?? r.BALANCE ?? r.CLOSING_ST ?? r.CL_STOCK ?? r.CL_STK ?? 
      r.OP_STOCK ?? r.IT_QTY ?? r.BAL_QTY ?? r.BAL ?? r.CLOSING ?? r.CLOSE_STK ?? r.CURR_STK ?? 
      r.PHYSICAL ?? r.STK_QTY ?? r.S_QTY ?? r.QUANTITY ?? r.UNITS ?? r.TOTAL_QTY;
    if (rawStock !== undefined) {
      stock = Number(rawStock);
      if (!Number.isFinite(stock)) stock = 0;
    } else {
      stock = 0; // Strictly 0 if not in imported stock file - NEVER resurrect master.stock_shop1!
    }

    // 8. Extract Packing & Units
    const packing = String(firstPresent(r.PACK, r.PACKING, r.UNIT, r.PER, master?.packing, '')).trim();
    const perValue = Number(firstPresent(r.PER, master?.per, 1));
    const per = Number.isFinite(perValue) && perValue > 0 ? perValue : 1;

    // 9. Extract Company & Generic (Recover manufacturer from master if raw is missing or numeric code)
    const rawCoCode = String(r.CO_CODE || r.COMPANY_CODE || r.MFG_CODE || '').trim().toUpperCase();
    let company = (companyMap && rawCoCode && companyMap.get(rawCoCode)) ||
      String(r.CO_NAME || r.COMPANY || r.MFG || r.MFGR || '').trim().toUpperCase();
    if ((!company || /^\d+$/.test(company) || company === 'GEN') && hasSourceMaster) {
      if (master?.company && !/^\d+$/.test(master.company)) {
        company = master.company.toUpperCase();
      }
    }

    let generic = String(r.GEN_NAME || r.GENERIC || r.COMPOSITION || r.SALT || '').trim().toUpperCase();
    if (!generic && hasSourceMaster && master?.generic) {
      generic = master.generic.toUpperCase();
    }

    // 10. GST Tax & HSN
    const gstSource = firstPresent(r.GST, r.TAX, r.VAT, r.PUR_TAX, r.SAL_TPS, hasSourceMaster ? (master?.gstPercent ?? master?.tax_percent) : undefined);
    const gstParsed = gstSource === undefined ? null : Number(gstSource);
    const gstPercent = Number.isFinite(gstParsed) ? gstParsed : null;
    const hsn = String(firstPresent(r.HSN, r.HSNCODE, r.HSN_CODE, hasSourceMaster ? master?.hsn : undefined) ?? '').trim();

    // 11. Batches & expiry. Preserve only source evidence; never generate either.
    const rawBatchStr = String(
      r.BATCH || r.BATCH_NO || r.BATCHNO || r.BAT_NO || r.BATNO || r.BAT || r.B_NO || 
      r.BNO || r.BN || r.LOT || r.LOTNO || r.LOT_NO || r.BT_NO || r.B_NUM || r.BATCH_ID || 
      r.CH_NO || r.CHALLAN || r.PACK_BATCH || r.S_BATCH || r.STK_BAT || r.ST_BATCH || ''
    ).trim();

    const rawExpStr = String(
      r.EXPIRY || r.EXP_DATE || r.EXPDATE || r.EXPDT || r.EXP_DT || r.EXP || r.EDATE || 
      r.E_DATE || r.DT_EXP || r.EX_DATE || r.EX_DT || r.EXP_D || r.EXPD || r.EXPIRY_DT || 
      r.EXPIRYDATE || r.EX_P || r.S_EXP || r.STK_EXP || r.ST_EXP || ''
    ).trim();

    let batches = [];
    if (Array.isArray(r.BATCHES)) {
      batches = r.BATCHES.map(b => ({
          batch_no: String(b.batch_no || b.batch || '').trim(),
          exp_date: normalizeExpiry(b.exp_date || b.exp || ''),
          mrp: Number(firstPresent(b.mrp, mrp, 0)) || 0,
          per: per,
          qty: Number(firstPresent(b.qty, b.stock, 0)) || 0,
          supplier: String(b.supplier || '').trim()
        }));
    } else if (rawBatchStr || rawExpStr) {
      batches = [{
        batch_no: rawBatchStr,
        exp_date: normalizeExpiry(rawExpStr),
        mrp: Number(mrp.toFixed(2)),
        per: per,
        qty: stock,
        supplier: String(r.SUPPLIER || r.DIST || '').trim()
      }];
    }

    const importIssues = [];
    if (!cleanedName) importIssues.push('MISSING_NAME');
    if (stock < 0) importIssues.push('NEGATIVE_STOCK');
    if (stock > 0 && batches.length === 0) importIssues.push('UNALLOCATED_STOCK_NO_BATCH');
    if (batches.some(b => !b.batch_no || !b.exp_date)) importIssues.push('INCOMPLETE_BATCH');
    if (batches.some(b => b.exp_date && !isExpiryValid(b.exp_date))) importIssues.push('INVALID_EXPIRY');
    if (batches.some(b => b.exp_date && isBatchExpired(b.exp_date))) importIssues.push('EXPIRED_BATCH');
    if (stock > 0 && batches.some(b => b.exp_date && isBatchExpired(b.exp_date))) importIssues.push('ACTIVE_STOCK_EXPIRED_BATCH');
    if (gstPercent === null) importIssues.push('MISSING_GST');

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
      stock_shop2: 0,
      stock_shop3: 0,
      gstPercent,
      hsn,
      schedule: hasSourceMaster ? (master?.schedule || '') : '',
      batches,
      importIssues,
      isImported: true
    };
  }).filter(Boolean);

  // Group duplicate medicine codes: sum live stock and merge batches
  const groupedMap = new Map();
  for (const item of normalizedList) {
    if (!groupedMap.has(item.code)) {
      groupedMap.set(item.code, item);
    } else {
      const existing = groupedMap.get(item.code);
      if (!existing.importIssues.includes('DUPLICATE_CODE')) existing.importIssues.push('DUPLICATE_CODE');
      existing.stock = (existing.stock || 0) + (item.stock || 0);
      existing.stock_shop1 = existing.stock;
      for (const issue of item.importIssues) if (!existing.importIssues.includes(issue)) existing.importIssues.push(issue);
      for (const b of (item.batches || [])) {
        const matching = existing.batches.find(previous => previous.batch_no === b.batch_no && previous.exp_date === b.exp_date && previous.mrp === b.mrp);
        if (!matching) {
          existing.batches.push(b);
        } else matching.qty += b.qty;
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
    if (!med) return masterCatalogData[idx] || med;
    const codeUpper = String(med.code || '').trim().toUpperCase();
    const master = masterByCode.get(codeUpper) || masterByName.get(cleanMedicineName(med.name));

    let updatedName = med.name;
    if (!updatedName || updatedName.toUpperCase().includes('UNKNOWN')) {
      updatedName = master?.name || med.name;
    }

    let updatedCompany = med.company;
    if (!updatedCompany || /^\d+$/.test(updatedCompany) || updatedCompany === 'GEN') {
      if (master?.company && !/^\d+$/.test(master.company)) {
        updatedCompany = master.company;
      }
    }

    // Only normalize recorded values. Catalog guesses are not evidence of the
    // physical batch held at a branch and must never be written into inventory.
    const updatedBatches = Array.isArray(med.batches)
      ? med.batches.map(b => ({ ...b, exp_date: normalizeExpiry(b.exp_date) }))
      : [];

    return {
      ...med,
      name: updatedName,
      company: updatedCompany,
      batches: updatedBatches
    };
  });
}

/**
 * Select the current stock snapshot from an active RETAILG DATA directory.
 * RETAILG monthly files use STKYYMM.DBF (for example STK2611 = Nov 2026),
 * so the greatest valid year/month is deterministic within one DATA folder.
 */
export function selectLegacyStockSnapshot(stockFiles = []) {
  const files = Array.from(stockFiles || []);
  const canonical = files.filter(file => file.name.toUpperCase() === 'STKFILE.DBF');
  if (canonical.length === 1) return canonical[0];

  const monthly = files
    .map(file => {
      const match = file.name.toUpperCase().match(/^STK(\d{2})(\d{2})\.DBF$/);
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month < 1 || month > 12) return null;
      return { file, score: (year * 100) + month };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || Number(b.file.lastModified || 0) - Number(a.file.lastModified || 0));

  if (monthly.length > 0) return monthly[0].file;
  if (files.length === 1) return files[0];
  return null;
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

  const relativePath = (file) => String(file.webkitRelativePath || file.relativePath || file.name).replace(/\\/g, '/');
  const parentPath = (file) => {
    const path = relativePath(file);
    const slash = path.lastIndexOf('/');
    return slash >= 0 ? path.slice(0, slash) : '';
  };

  // 1. Locate one unambiguous master dataset. A whole-drive upload commonly
  // contains RETAILG, RETAILG1...RETAILG4 and choosing the first ITEMFILE was
  // the primary cause of importing stale stock.
  const broadItemCandidates = files.filter(f => {
    const n = f.name.toUpperCase();
    return (n.startsWith('ITEM') || n.startsWith('MEDICINE') || n.startsWith('PRODUCT')) && n.endsWith('.DBF');
  });
  // A real RETAILG data directory contains hundreds of DBFs, often including
  // ITEM-ledger/history tables. ITEMFILE.DBF is the authoritative product
  // master; prefer that exact name instead of misclassifying every ITEM*.DBF
  // as another legacy dataset.
  const exactItemFiles = files.filter(f => f.name.toUpperCase() === 'ITEMFILE.DBF');
  let itemCandidates = exactItemFiles.length > 0 ? exactItemFiles : broadItemCandidates;
  if (itemCandidates.length > 1) {
    // A live RETAILG installation commonly keeps DATA-OLD beside DATA. When
    // the user selects the RETAILG parent, prefer the one exact current DATA
    // directory and ignore archival siblings such as DATA-OLD.
    const currentDataCandidates = itemCandidates.filter(file => {
      const parent = parentPath(file);
      const folderName = parent.split('/').filter(Boolean).pop() || '';
      return folderName.toUpperCase() === 'DATA';
    });
    if (currentDataCandidates.length === 1) itemCandidates = currentDataCandidates;
  }
  if (itemCandidates.length > 1) {
    const paths = itemCandidates.map(relativePath).sort().join('\n - ');
    throw new Error(
      `Multiple legacy datasets were found. The import was stopped to prevent mixing snapshots.\n\n - ${paths}\n\nSelect only the exact DATA folder you want to import.`
    );
  }
  const itemFile = itemCandidates[0] || null;
  const datasetPath = itemFile ? parentPath(itemFile) : null;
  const datasetFiles = datasetPath === null ? files : files.filter(f => parentPath(f) === datasetPath);

  // 2. Locate Company Master File (COMPMAST.DBF / COMPANY.DBF / COMAST.DBF / etc.)
  const companyFile = datasetFiles.find(f => {
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
  const stockFiles = datasetFiles.filter(f => {
    const n = f.name.toUpperCase();
    return (n.startsWith('STK') || n.startsWith('STOCK') || n.startsWith('BATCH')) && n.endsWith('.DBF');
  });

  const stockFile = selectLegacyStockSnapshot(stockFiles);
  if (!stockFile && stockFiles.length > 1) {
    const paths = stockFiles.map(relativePath).sort().join('\n - ');
    throw new Error(
      `Multiple stock files were found in ${datasetPath || 'the selected folder'}, but none had a deterministic STKYYMM.DBF or STKFILE.DBF name.\n\n - ${paths}\n\nSelect ITEMFILE.DBF together with the intended stock file, or import ITEMFILE.DBF alone to use its OP_STOCK values.`
    );
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

    stockRecs.forEach((sr, rowIndex) => {
      const code = String(
        sr.IT_CODE || sr.ITEMCODE || sr.ITEM_CODE || sr.CODE || sr.ICODE || 
        sr.I_CODE || sr.PROD_CODE || sr.PRODUCT_CODE || sr.MED_CODE || sr.ID || ''
      ).trim().toUpperCase();
      if (!code) return;

      const rawQty = sr.STOCK ?? sr.QTY ?? sr.BALANCE ?? sr.CLOSING_ST ?? sr.CL_STOCK ?? sr.CL_STK ?? 
        sr.OP_STOCK ?? sr.IT_QTY ?? sr.BAL_QTY ?? sr.BAL ?? sr.CLOSING ?? sr.CLOSE_STK ?? sr.CURR_STK ?? 
        sr.PHYSICAL ?? sr.STK_QTY ?? sr.S_QTY ?? sr.QUANTITY ?? sr.UNITS ?? sr.TOTAL_QTY;
      if (rawQty === undefined || String(rawQty).trim() === '' || !Number.isFinite(Number(rawQty))) {
        throw new Error(`${stockFile.name}, row ${rowIndex + 1} (${code}): no valid stock quantity was found. Import stopped instead of replacing the product balance with zero.`);
      }
      const batchQty = Number(rawQty);

      stockMap.set(code, (stockMap.get(code) || 0) + batchQty);

      const rawBatch = String(
        sr.BATCH || sr.BATCH_NO || sr.BATCHNO || sr.BAT_NO || sr.BATNO || sr.BAT || sr.B_NO || 
        sr.BNO || sr.BN || sr.LOT || sr.LOTNO || sr.LOT_NO || sr.BT_NO || sr.B_NUM || sr.BATCH_ID || 
        sr.CH_NO || sr.CHALLAN || sr.PACK_BATCH || sr.S_BATCH || sr.STK_BAT || sr.ST_BATCH || ''
      ).trim();

      const rawExp = String(
        sr.EXPIRY || sr.EXP_DATE || sr.EXPDATE || sr.EXPDT || sr.EXP_DT || sr.EXP || sr.EDATE || 
        sr.E_DATE || sr.DT_EXP || sr.EX_DATE || sr.EX_DT || sr.EXP_D || sr.EXPD || sr.EXPIRY_DT || 
        sr.EXPIRYDATE || sr.EX_P || sr.S_EXP || sr.STK_EXP || sr.ST_EXP || ''
      ).trim();

      const batchNo = rawBatch;
      const expDate = normalizeExpiry(rawExp);

      const mrp = Number(sr.MRP ?? sr.PRICE ?? sr.RATE ?? sr.MRATE ?? sr.S_RATE ?? 0) || 0;
      const ptr = Number(sr.PTR ?? sr.PUR_RATE ?? sr.PURRATE ?? sr.PRATE ?? 0) || 0;
      const supplier = String(sr.SUPPLIER || sr.DIST || '').trim();

      if (batchNo || expDate) {
        const list = batchesMap.get(code) || [];
        list.push({
          batch_no: batchNo,
          exp_date: expDate,
          mrp: mrp > 0 ? mrp : undefined,
          ptr: ptr > 0 ? ptr : undefined,
          qty: batchQty,
          stock: batchQty,
          supplier
        });
        batchesMap.set(code, list);
      }
    });

    if (records.length > 0) {
      records = records.map(r => {
        const code = String(r.IT_CODE || r.CODE || '').trim().toUpperCase();
        if (stockMap.has(code)) {
          return {
            ...r,
            STOCK: stockMap.get(code),
            BATCHES: batchesMap.get(code) || []
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
      stockMap.forEach((total, code) => {
        grouped.push({
          IT_CODE: code,
          IT_NAME: '',
          STOCK: total,
          BATCHES: batchesMap.get(code) || []
        });
      });
      records = grouped;
    }
  }

  if (records.length === 0) {
    throw new Error('No valid medicine records found in the selected files.');
  }

  statusCallback(`Normalizing ${records.length.toLocaleString()} records without inventing missing stock data...`);
  const normalized = normalizeLegacyMedicineRecords(records, null, companyMap);
  const totalStock = normalized.reduce((sum, med) => sum + (Number(med.stock) || 0), 0);
  const issueCount = normalized.reduce((sum, med) => sum + (med.importIssues?.length || 0), 0);
  const stockSource = stockFile ? relativePath(stockFile) : (itemFile ? `${relativePath(itemFile)}:OP_STOCK` : null);
  const sourceModifiedAt = stockFile?.lastModified ? new Date(stockFile.lastModified).toISOString() : null;
  for (const medicine of normalized) {
    medicine.stockProvenance = { source: stockSource, modifiedAt: sourceModifiedAt, importedAt: new Date().toISOString(), liveBalanceVerified: false };
  }

  return {
    medicines: normalized,
    itemFile: itemFile ? relativePath(itemFile) : null,
    stockFile: stockFile ? relativePath(stockFile) : null,
    companyFile: companyFile ? relativePath(companyFile) : null,
    datasetPath,
    stockSource,
    sourceModifiedAt,
    liveBalanceVerified: false,
    stockWarning: 'Imported file quantities are a snapshot, not a verified live balance. Compare with the old system after pausing billing. Monthly snapshots may exclude later sales, purchases or returns.',
    totalStock,
    issueCount,
    totalCount: normalized.length,
    activeStockCount: normalized.filter(m => Number(m.stock) !== 0).length,
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
