import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) || 
                    'https://coqziknetbiinumbueay.supabase.co';

const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || 
                    'sb_publishable_WYpbTNB7TwcbIUNF_413Pg_RMBShr9h';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Test Connection Helper
export async function testSupabaseConnection() {
  try {
    const start = Date.now();
    // Test a basic lightweight query (e.g. check server response)
    const { data, error } = await supabase.from('todos').select('id').limit(1);
    const latency = Date.now() - start;
    
    // Even if 'todos' table doesn't exist yet (returns 404 / relation does not exist),
    // a valid response from coqziknetbiinumbueay.supabase.co proves network and API key authentication!
    if (error && error.code !== '42P01' && error.message && !error.message.includes('relation') && !error.message.includes('not found')) {
      return {
        connected: false,
        error: error.message,
        latency
      };
    }

    return {
      connected: true,
      url: supabaseUrl,
      latency,
      message: 'Connected to Supabase PostgreSQL cluster (coqziknetbiinumbueay)'
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message || 'Network unreachable'
    };
  }
}

// Sync completed sales bill to Supabase
export async function pushSalesBillToSupabase(billData) {
  try {
    const { data, error } = await supabase.from('sales_bills').insert([{
      bill_no: billData.billNo,
      bill_date: billData.date,
      store_branch: billData.store || 'MAIN',
      patient_name: billData.patientName,
      doctor_name: billData.doctorName,
      payment_mode: billData.paymentMode,
      gross_total: billData.grossTotal,
      net_payable: billData.netPayable,
      items_json: billData.items,
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.warn('Supabase sales_bills sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Offline fallback - sales bill queued locally:', err.message);
    return { success: false, offline: true };
  }
}

// Sync stock transfer between branches
export async function pushStockTransferToSupabase(transferData) {
  try {
    const { data, error } = await supabase.from('stock_transfers').insert([{
      transfer_id: transferData.id,
      medicine_name: transferData.medicine,
      from_store: transferData.from,
      to_store: transferData.to,
      quantity: transferData.qty,
      status: transferData.status,
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.warn('Supabase stock_transfers sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, offline: true };
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
      // Fallback to local stored bill count
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
 * Purge historical bills older than cutoff date from Cloud Supabase
 */
export async function purgeOldCloudBills(cutoffIsoDate) {
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

// Sync purchase inward invoice to Supabase
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
      console.warn('Supabase purchase_inwards sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Offline fallback - purchase queued locally:', err.message);
    return { success: false, offline: true };
  }
}

// Sync credit note / sales return to Supabase
export async function pushCreditNoteToSupabase(creditNoteData) {
  try {
    const { data, error } = await supabase.from('credit_notes').insert([{
      patient_name: creditNoteData.customerName || creditNoteData.patientName || 'CUSTOMER',
      refund_amount: Number(creditNoteData.refundAmount || creditNoteData.amount || 0),
      items_json: creditNoteData.items || creditNoteData.returnedItems || [],
      branch_id: creditNoteData.branchId || 'shop1',
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.warn('Supabase credit_notes sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Offline fallback - credit note queued locally:', err.message);
    return { success: false, offline: true };
  }
}

// Sync shift handover record to Supabase
export async function pushShiftRecordToSupabase(shiftData) {
  try {
    const notesSummary = shiftData.notes || 
      `Staff: ${shiftData.staffName || 'Counter Staff'}, Total Sales: Rs.${shiftData.totalSales || 0}, Bills: ${shiftData.startBill || '0'} - ${shiftData.endBill || '0'}`;

    const { data, error } = await supabase.from('shift_records').insert([{
      shift_id: shiftData.shiftId || `SHIFT-${Date.now()}`,
      closing_cash: Number(shiftData.closingCash || 0),
      notes: notesSummary,
      branch_id: shiftData.branchId || 'shop1',
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.warn('Supabase shift_records sync notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Offline fallback - shift record queued locally:', err.message);
    return { success: false, offline: true };
  }
}

// Upload medicines catalog to Supabase in batches of 200 items
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

// Fetch medicines catalog from Supabase with chunked pagination
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

