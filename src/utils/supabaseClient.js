import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                    import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
                    'https://coqziknetbiinumbueay.supabase.co';

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
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
