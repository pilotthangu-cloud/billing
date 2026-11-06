import { createClient } from '@supabase/supabase-js';

function canonicalBackupJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalBackupJson).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalBackupJson(value[key])).join(',') + '}';
}

function calculateBackupChecksum(value) {
  const str = canonicalBackupJson(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) - hash) + str.charCodeAt(i)) | 0;
  }
  return `BP-CHK-${Math.abs(hash).toString(16).toUpperCase()}-${str.length}`;
}

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) || 
                    'https://coqziknetbiinumbueay.supabase.co';

const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || 
                    'sb_publishable_WYpbTNB7TwcbIUNF_413Pg_RMBShr9h';

// This identifies an installation; it is not an authorization secret. Real
// authorization must be enforced by Supabase RLS/auth claims on the server.
export const STORE_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PHARMACY_STORE_KEY) || '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: STORE_KEY ? { 'x-pharmacy-store-key': STORE_KEY } : {}
  }
});

/**
 * Helper to attempt serverless proxy sync when direct client RLS fails
 */
async function attemptProxySync(actionType, payload) {
  try {
    if (typeof window === 'undefined') return null;
    const branchId = payload?.branchId || payload?.branch_id || payload?.store || (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    const adminToken = typeof localStorage !== 'undefined' ? (localStorage.getItem('beta_pharma_admin_token') || '') : '';
    const headers = {
      'Content-Type': 'application/json',
      'x-pharmacy-branch-id': branchId,
      ...(STORE_KEY ? { 'x-pharmacy-store-key': STORE_KEY } : {})
    };
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({ actionType, payload: { ...payload, branchId } })
    });

    if (res.ok) {
      const json = await res.json();
      return json;
    }
    return null;
  } catch (e) {
    // Proxy not available (e.g. running static preview or offline)
    return null;
  }
}

/**
 * Test Connection & Permissions Watchdog
 */
export async function testSupabaseConnection() {
  try {
    const start = Date.now();
    // Test read query on actual sales_bills table
    const { data, error } = await supabase.from('sales_bills').select('bill_no').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return {
        connected: false,
        error: error.message,
        code: error.code,
        latency
      };
    }

    return {
      connected: true,
      url: supabaseUrl,
      latency,
      message: `Connected to Supabase PostgreSQL cluster (${latency}ms)`
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message || 'Network unreachable',
      latency: 0
    };
  }
}

/**
 * Sync completed sales bill to Supabase with deduplication and error classification
 */
export async function pushSalesBillToSupabase(billData) {
  if (!billData || !billData.billNo) {
    return { success: false, error: 'Invalid bill payload or missing billNo' };
  }

  const row = {
    bill_no: String(billData.billNo),
    bill_date: billData.date || new Date().toISOString().slice(0, 10),
    store_branch: billData.store || 'MAIN',
    patient_name: billData.patientName || 'CUSTOMER',
    doctor_name: billData.doctorName || 'Self / OTC',
    payment_mode: billData.paymentMode || 'cash',
    gross_total: Number(billData.grossTotal || 0),
    net_payable: Number(billData.netPayable || 0),
    items_json: Array.isArray(billData.items) ? billData.items : [],
    shift_id: billData.shiftId || null,
    quarantine_flag: Boolean(billData.quarantine_flag),
    client_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  try {
    // 1. Attempt direct Supabase push with store key header
    const { data, error } = await supabase
      .from('sales_bills')
      .upsert([row], { onConflict: 'bill_no' });

    if (error) {
      if (error.code === '42501') {
        // Attempt proxy fallback via /api/sync
        const proxyRes = await attemptProxySync('SALES_BILL', billData);
        if (proxyRes && proxyRes.success) {
          return { success: true, data: proxyRes.result, viaProxy: true };
        }

        return { 
          success: false, 
          rlsBlocked: true, 
          error: 'Cloud Sync Blocked: Row-Level Security (RLS) policy requires counter authentication. Bill is secured in local database.' 
        };
      }
      return { success: false, error: error.message, code: error.code };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, offline: true, error: err.message || 'Network disconnected' };
  }
}

/**
 * Sync credit note / sales return to Supabase (quarantined or verified)
 */
export async function pushCreditNoteToSupabase(creditNoteData) {
  if (!creditNoteData) return { success: false, error: 'Missing credit note data' };

  const creditNoteNo = String(creditNoteData.creditNoteNo || creditNoteData.billNo || `CN-${Date.now()}`);
  const row = {
    credit_note_no: creditNoteNo,
    patient_name: creditNoteData.customerName || creditNoteData.patientName || 'CUSTOMER',
    refund_amount: Number(creditNoteData.refundAmount || 0),
    items_json: Array.isArray(creditNoteData.items || creditNoteData.returnedItems) ? (creditNoteData.items || creditNoteData.returnedItems) : [],
    unverified_items_json: Array.isArray(creditNoteData.unverifiedItems) ? creditNoteData.unverifiedItems : [],
    status: creditNoteData.status || (creditNoteData.unverifiedItems?.length > 0 ? 'QUARANTINED' : 'PROCESSED'),
    branch_id: creditNoteData.branchId || 'MAIN',
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('credit_notes')
      .upsert([row], { onConflict: 'credit_note_no' });

    if (error) {
      if (error.code === '42501') {
        const proxyRes = await attemptProxySync('CREDIT_NOTE', creditNoteData);
        if (proxyRes && proxyRes.success) {
          return { success: true, data: proxyRes.result, viaProxy: true };
        }
        return { success: false, rlsBlocked: true, error: 'Cloud Sync Blocked: RLS permissions.' };
      }
      return { success: false, error: error.message, code: error.code };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, offline: true, error: err.message };
  }
}

/**
 * Sync incremental stock changes for a single medicine (Free-Tier Safe: zero full catalog spam)
 */
export async function pushMedicineDeltaToSupabase(med, branchId = 'MAIN') {
  if (!med || !med.code) return { success: false, error: 'Invalid medicine object' };

  const targetBranch = String(med.branchId || branchId || 'MAIN');
  const row = {
    branch_id: targetBranch,
    medicine_code: String(med.code),
    name: med.name,
    company: med.company || '',
    mrp: Number(med.mrp || 0),
    rack: String(med.rack || ''),
    schedule: med.schedule || '',
    stock: Number(med.stock !== undefined ? med.stock : (med.stock_shop1 || 0)),
    stock_shop1: Number(med.stock_shop1 || 0),
    stock_shop2: Number(med.stock_shop2 || 0),
    batches_json: Array.isArray(med.batches) ? med.batches : [],
    updated_at: med.updatedAt || new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('medicines_delta')
      .upsert([row], { onConflict: 'branch_id,medicine_code' });

    if (error) {
      if (error.code === '42501') {
        const proxyRes = await attemptProxySync('MEDICINE_DELTA', { ...med, branchId: targetBranch });
        if (proxyRes && proxyRes.success) {
          return { 
            success: true, 
            viaProxy: true, 
            conflict: proxyRes.conflict || proxyRes.data?.conflict || null 
          };
        }
        return { success: false, rlsBlocked: true, error: 'RLS policy blocked delta sync' };
      }
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, offline: true, error: err.message };
  }
}

/**
 * Sync stock transfer between branches
 */
export async function pushStockTransferToSupabase(transferData) {
  try {
    const { data, error } = await supabase.from('stock_transfers').insert([{
      transfer_id: String(transferData.id || `TR-${Date.now()}`),
      medicine_name: transferData.medicine || transferData.medicine_name,
      from_store: transferData.from || transferData.from_store,
      to_store: transferData.to || transferData.to_store,
      quantity: Number(transferData.qty || transferData.quantity || 0),
      status: transferData.status || 'COMPLETED',
      branch_id: transferData.branchId || 'MAIN',
      created_at: new Date().toISOString()
    }]);

    if (error) {
      if (error.code === '42501') {
        const proxyRes = await attemptProxySync('STOCK_TRANSFER', transferData);
        if (proxyRes && proxyRes.success) return { success: true, viaProxy: true };
        return { success: false, rlsBlocked: true, error: 'RLS blocked' };
      }
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, offline: true, error: err.message };
  }
}

/**
 * Sync purchase inward invoice to Supabase
 */
export async function pushPurchaseInwardToSupabase(purchaseData) {
  try {
    const { data, error } = await supabase.from('purchase_inwards').insert([{
      supplier_name: purchaseData.supplierName || purchaseData.supplier || 'Standard Distributor',
      bill_date: purchaseData.invoiceDate || purchaseData.date || new Date().toISOString().slice(0, 10),
      total_amount: Number(purchaseData.totalAmount || purchaseData.netAmount || 0),
      items_json: purchaseData.items || [],
      branch_id: purchaseData.branchId || 'shop1',
      created_at: new Date().toISOString()
    }]);

    if (error) {
      if (error.code === '42501') {
        const proxyRes = await attemptProxySync('PURCHASE_INWARD', purchaseData);
        if (proxyRes && proxyRes.success) return { success: true, viaProxy: true };
        return { success: false, rlsBlocked: true, error: 'RLS blocked' };
      }
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, offline: true, error: err.message };
  }
}

/**
 * Upload medicines catalog to Supabase in batches of 200 items (Optional manual cloud sync)
 */
export async function uploadMedicinesCatalogToSupabase(medicinesList, onProgress) {
  if (!Array.isArray(medicinesList) || medicinesList.length === 0) {
    return { success: false, message: 'No medicines to upload' };
  }

  const BATCH_SIZE = 200;
  let totalUploaded = 0;

  for (let i = 0; i < medicinesList.length; i += BATCH_SIZE) {
    const chunk = medicinesList.slice(i, i + BATCH_SIZE).map(med => ({
      medicine_code: med.code || `M${i}`,
      name: med.name,
      company: med.company || '',
      mrp: Number(med.mrp || 0),
      rack: String(med.rack || ''),
      schedule: med.schedule || '',
      stock_shop1: Number(med.stock_shop1 || med.stock || 0),
      batches_json: med.batches || [],
      updated_at: new Date().toISOString()
    }));

    try {
      const { error } = await supabase.from('medicines_catalog').insert(chunk);
      if (error) {
        console.warn(`Supabase catalog batch ${i}-${i + BATCH_SIZE} notice:`, error.message);
      } else {
        totalUploaded += chunk.length;
      }
    } catch (e) {
      console.warn('Catalog upload network exception:', e.message);
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, medicinesList.length), medicinesList.length);
    }
  }

  return { success: true, uploadedCount: totalUploaded, total: medicinesList.length };
}

/**
 * Fetch medicines catalog from Supabase with chunked pagination
 */
export async function fetchMedicinesCatalogFromSupabase(onProgress) {
  try {
    const { count, error: countErr } = await supabase
      .from('medicines_catalog')
      .select('*', { count: 'exact', head: true });

    if (countErr || !count || count === 0) {
      return { success: false, count: 0, medicines: [] };
    }

    const PAGE_SIZE = 1000;
    const allMeds = [];

    for (let from = 0; from < count; from += PAGE_SIZE) {
      const to = Math.min(from + PAGE_SIZE - 1, count - 1);
      const { data, error } = await supabase
        .from('medicines_catalog')
        .select('*')
        .range(from, to);

      if (error || !data) break;

      for (const row of data) {
        allMeds.push({
          code: row.medicine_code,
          name: row.name,
          company: row.company,
          mrp: row.mrp,
          rack: row.rack,
          schedule: row.schedule,
          stock_shop1: row.stock_shop1,
          stock_shop2: 0,
          batches: row.batches_json || []
        });
      }

      if (onProgress) {
        onProgress(allMeds.length, count);
      }
    }

    return { success: true, count: allMeds.length, medicines: allMeds };
  } catch (err) {
    console.warn('Error fetching cloud catalog from Supabase', err);
    return { success: false, error: err.message, medicines: [] };
  }
}

/**
 * Sync shift handover record to Supabase
 */
export async function pushShiftRecordToSupabase(shiftData) {
  try {
    const notesSummary = shiftData.notes || 
      `Staff: ${shiftData.staffName || 'Counter Staff'}, Total Sales: Rs.${shiftData.totalSales || 0}, Bills: ${shiftData.startBill || '0'} - ${shiftData.endBill || '0'}`;

    const { data, error } = await supabase.from('shift_records').insert([{
      shift_id: String(shiftData.shiftId || `SHIFT-${Date.now()}`),
      closing_cash: Number(shiftData.closingCash || 0),
      notes: notesSummary,
      branch_id: shiftData.branchId || 'shop1',
      created_at: new Date().toISOString()
    }]);

    if (error) {
      if (error.code === '42501') {
        const proxyRes = await attemptProxySync('SHIFT_RECORD', shiftData);
        if (proxyRes && proxyRes.success) return { success: true, viaProxy: true };
        return { success: false, rlsBlocked: true, error: 'RLS blocked' };
      }
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, offline: true, error: err.message };
  }
}

/**
 * Upload verified cloud backup with round-trip verification (Never claim success without proof!)
 */
export async function uploadVerifiedCloudBackup(backupPayload) {
  if (!backupPayload || !backupPayload.snapshot_data) {
    return { success: false, error: 'Invalid backup payload structure' };
  }

  const branchId = backupPayload.branchId || 'MAIN';
  const checksum = String(backupPayload.checksum);
  const recordCounts = backupPayload.record_counts || {};

  const row = {
    branch_id: branchId,
    backup_date: backupPayload.backup_date || new Date().toISOString().slice(0, 10),
    backup_timestamp: new Date().toISOString(),
    checksum: checksum,
    record_counts: recordCounts,
    snapshot_data: backupPayload.snapshot_data,
    isCompressed: Boolean(backupPayload.isCompressed),
    compressedData: backupPayload.compressedData,
    verified: true,
    created_at: new Date().toISOString()
  };

  try {
    // 1. Attempt upload
    let uploadSuccess = false;
    let backupId = null;

    const { data, error } = await supabase
      .from('pharmacy_backups')
      .insert([row])
      .select('id, checksum, record_counts');

    if (error) {
      if (error.code === '42501') {
        const proxyPayload = {
          ...row,
          // Strip 14MB uncompressed snapshot when sending via proxy to protect 4MB serverless cap
          snapshot_data: row.isCompressed && row.compressedData ? undefined : row.snapshot_data
        };
        const proxyRes = await attemptProxySync('PHARMACY_BACKUP', proxyPayload);
        if (proxyRes && proxyRes.success) {
          uploadSuccess = true;
        } else {
          return { 
            success: false, 
            rlsBlocked: true, 
            error: 'Cloud Backup Blocked: Supabase RLS policy requires counter authorization. Please use Local JSON Backup Export.' 
          };
        }
      } else {
        return { success: false, error: error.message, code: error.code };
      }
    } else if (data && data.length > 0) {
      uploadSuccess = true;
      backupId = data[0].id;
    }

    if (!uploadSuccess) {
      return { success: false, error: 'Cloud backup could not be recorded.' };
    }

    // 2. DOUBLE-BLIND VERIFICATION READBACK
    // Verify that the cloud record actually exists and its checksum matches exactly!
    const { data: readData, error: readError } = await supabase
      .from('pharmacy_backups')
      .select('id, checksum, record_counts, created_at, snapshot_data')
      .eq('branch_id', branchId)
      .eq('checksum', checksum)
      .order('created_at', { ascending: false })
      .limit(1);

    if (readError || !readData || readData.length === 0) {
      return {
        success: false,
        verified: false,
        error: 'Double-blind verification failed: Cloud backup record could not be confirmed in Supabase.'
      };
    }

    const verifiedRecord = readData[0];
    if (!verifiedRecord.snapshot_data) {
      return { success: false, verified: false, error: 'Cloud backup metadata exists, but snapshot content could not be read back.' };
    }
    const readbackChecksum = calculateBackupChecksum(verifiedRecord.snapshot_data);
    if (readbackChecksum !== checksum || verifiedRecord.checksum !== checksum) {
      return { success: false, verified: false, error: 'Cloud backup readback checksum did not match the uploaded snapshot.' };
    }
    return {
      success: true,
      verified: true,
      backupId: verifiedRecord.id,
      checksum: verifiedRecord.checksum,
      recordCounts: verifiedRecord.record_counts,
      timestamp: verifiedRecord.created_at,
      message: `✓ Cloud backup successfully uploaded and verified in Supabase (${recordCounts.medicines || 0} meds, ${recordCounts.bills || 0} bills).`
    };
  } catch (err) {
    return { success: false, offline: true, error: err.message || 'Network disconnected during backup upload.' };
  }
}

/**
 * Fetch latest verified cloud backup for restoration
 */
export async function fetchLatestVerifiedCloudBackup(branchId = 'MAIN') {
  try {
    const { data, error } = await supabase
      .from('pharmacy_backups')
      .select('*')
      .eq('branch_id', branchId)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'No verified cloud backups found for this branch in Supabase.' };
    }

    const rec = data[0];
    return {
      success: true,
      backup: {
        id: rec.id,
        date: rec.backup_date,
        timestamp: rec.backup_timestamp,
        checksum: rec.checksum,
        recordCounts: rec.record_counts,
        data: rec.snapshot_data
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch live sales bills from Supabase (HQ Live Pull)
 */
export async function fetchLiveCloudSalesBills(limit = 300) {
  try {
    const { data, error } = await supabase
      .from('sales_bills')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase fetchLiveCloudSalesBills notice:', error.message);
      return { success: false, bills: [] };
    }

    const bills = (data || []).map(r => ({
      billNo: r.bill_no,
      date: r.bill_date,
      time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM',
      patientName: r.patient_name || 'CUSTOMER',
      customerPhone: '',
      doctorName: r.doctor_name || 'Self / OTC',
      paymentMode: r.payment_mode || 'cash',
      items: Array.isArray(r.items_json) ? r.items_json : [],
      grossTotal: Number(r.gross_total || 0),
      netPayable: Number(r.net_payable || 0),
      store: r.store_branch || 'Beta Pharmacy',
      source: 'CLOUD_SYNC'
    }));

    return { success: true, bills };
  } catch (err) {
    console.warn('Error fetching live sales bills:', err.message);
    return { success: false, bills: [] };
  }
}

/**
 * Fetch live purchase inwards from Supabase
 */
export async function fetchLiveCloudPurchases(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('purchase_inwards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, purchases: [] };
    }

    const purchases = (data || []).map(r => ({
      id: r.id,
      billNo: `INV-${String(r.id).padStart(4, '0')}`,
      name: r.supplier_name || 'General Distributor',
      supplier: r.supplier_name,
      date: r.bill_date,
      amount: Number(r.total_amount || 0),
      itemsCount: Array.isArray(r.items_json) ? r.items_json.length : 0,
      items: r.items_json || [],
      status: 'PAID',
      source: 'CLOUD_SYNC'
    }));

    return { success: true, purchases };
  } catch (err) {
    return { success: false, purchases: [] };
  }
}

/**
 * Fetch live shift records from Supabase
 */
export async function fetchLiveCloudShifts(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('shift_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, shifts: [] };
    }

    const shifts = (data || []).map(r => ({
      id: r.id,
      shiftId: r.shift_id,
      closingCash: Number(r.closing_cash || 0),
      notes: r.notes || '',
      branchId: r.branch_id,
      createdAt: r.created_at,
      source: 'CLOUD_SYNC'
    }));

    return { success: true, shifts };
  } catch (err) {
    return { success: false, shifts: [] };
  }
}

/**
 * Fetch live medicine inventory deltas from Supabase (Bidirectional Admin ↔ POS Sync)
 */
export async function fetchLiveMedicineDeltas(branchId = 'MAIN', limit = 100) {
  try {
    const targetBranch = branchId || (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    const { data, error } = await supabase
      .from('medicines_delta')
      .select('*')
      .eq('branch_id', targetBranch)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Try proxy fallback
      const proxyRes = await attemptProxySync('FETCH_BRANCH_DELTAS', { branchId: targetBranch, limit });
      if (proxyRes && proxyRes.result) {
        return {
          success: true,
          deltas: proxyRes.result.map(r => ({
            code: r.medicine_code,
            branchId: r.branch_id,
            name: r.name,
            company: r.company || '',
            mrp: Number(r.mrp || 0),
            rack: r.rack || '',
            schedule: r.schedule || '',
            stock: Number(r.stock !== undefined ? r.stock : (r.stock_shop1 || 0)),
            stock_shop1: Number(r.stock_shop1 || 0),
            stock_shop2: Number(r.stock_shop2 || 0),
            batches: Array.isArray(r.batches_json) ? r.batches_json : [],
            updatedAt: r.updated_at,
            source: 'CLOUD_SYNC'
          }))
        };
      }
      return { success: false, deltas: [] };
    }

    const deltas = (data || []).map(r => ({
      code: r.medicine_code,
      branchId: r.branch_id,
      name: r.name,
      company: r.company || '',
      mrp: Number(r.mrp || 0),
      rack: r.rack || '',
      schedule: r.schedule || '',
      stock: Number(r.stock !== undefined ? r.stock : (r.stock_shop1 || 0)),
      stock_shop1: Number(r.stock_shop1 || 0),
      stock_shop2: Number(r.stock_shop2 || 0),
      batches: Array.isArray(r.batches_json) ? r.batches_json : [],
      updatedAt: r.updated_at,
      source: 'CLOUD_SYNC'
    }));

    return { success: true, deltas };
  } catch (err) {
    return { success: false, deltas: [], error: err.message };
  }
}

/**
 * Live Cloud Storage Metric Watchdog (Supabase 500 MB Free Tier)
 */
export async function getCloudStorageEstimate() {
  const MAX_FREE_TIER_MB = 500;
  const CATALOG_BASE_MB = 18.5; // Estimated footprint of 24k medicine master
  
  let billCount = 0;
  let isConnected = true;

  try {
    const { count, error } = await supabase
      .from('sales_bills')
      .select('*', { count: 'exact', head: true });

    if (error) {
      isConnected = false;
      const local = JSON.parse(localStorage.getItem('beta_pharma_recent_bills') || '[]');
      billCount = local.length;
    } else {
      billCount = count || 0;
    }
  } catch (e) {
    isConnected = false;
    const local = JSON.parse(localStorage.getItem('beta_pharma_recent_bills') || '[]');
    billCount = local.length;
  }

  const billsMB = (billCount * 0.85) / 1024;
  const totalUsedMB = Number((CATALOG_BASE_MB + billsMB).toFixed(1));
  const pctUsed = Number(((totalUsedMB / MAX_FREE_TIER_MB) * 100).toFixed(1));
  const remainingMB = Math.max(0, MAX_FREE_TIER_MB - totalUsedMB);
  const estRunwayYears = Number(((remainingMB / 0.16) / 365).toFixed(1));

  return {
    isConnected,
    billCount,
    usedMB: totalUsedMB,
    maxMB: MAX_FREE_TIER_MB,
    pctUsed,
    remainingMB,
    estRunwayYears,
    isWarningThreshold: pctUsed >= 80.0
  };
}

/**
 * Purge historical bills older than cutoff date from Cloud Supabase (Free-Tier Storage Maintenance)
 */
export async function purgeOldCloudBills(cutoffIsoDate) {
  try {
    const role = localStorage.getItem('beta_pharma_auth_role') || 'CASHIER';
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': role
      },
      body: JSON.stringify({
        action: 'PURGE_OLD_BILLS',
        payload: { cutoffDate: cutoffIsoDate }
      })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
  } catch (err) {}

  try {
    const { data, error } = await supabase
      .from('sales_bills')
      .delete()
      .lt('created_at', cutoffIsoDate);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
