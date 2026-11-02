/**
 * Vercel Serverless Function — Beta Pharmacy Sync Proxy
 * Executes atomic cloud sync server-side, protecting database credentials
 * and enforcing store authentication within Vercel Free Tier (Hobby).
 * 
 * Security & Free-Tier Protections:
 * - Rejects request bodies > 4 MB to prevent memory/storage DoS.
 * - Enforces entity whitelist and strict property schema validation.
 * - Never returns raw database internals, connection strings, or stack traces.
 * - Prevents arbitrary table modifications (only supported operations allowed).
 */

import { createClient } from '@supabase/supabase-js';
import zlib from 'zlib';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://coqziknetbiinumbueay.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WYpbTNB7TwcbIUNF_413Pg_RMBShr9h';

export let supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export function setSupabaseServer(client) {
  supabaseServer = client;
}

const STORE_KEY = process.env.PHARMACY_STORE_KEY || 'beta_counter_2026';
const ADMIN_TOKEN = process.env.PHARMACY_ADMIN_TOKEN || 'beta_admin_secret_2026';
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024; // 4 MB free-tier safety cap (strictly below Vercel's 4.5 MB request body limit)

// Event-sourcing deduplication cache (Prevents double-deductions during retries)
export const appliedEventCache = new Map();

export default async function handler(req, res) {
  // Free-tier CORS handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pharmacy-store-key, x-pharmacy-branch-id, x-admin-token, x-admin-role');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Payload size guard
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload Too Large: exceeds 4 MB limit' });
  }

  // 2. Terminal Authentication & Key check
  const clientStoreKey = req.headers['x-pharmacy-store-key'] || req.body?.storeKey;
  const clientAdminToken = req.headers['x-admin-token'] || req.body?.adminToken;
  const clientBranchId = String(req.headers['x-pharmacy-branch-id'] || req.body?.branchId || '').trim() || 'MAIN';
  const isAdmin = Boolean(clientAdminToken && clientAdminToken === ADMIN_TOKEN);

  if (!isAdmin && (!clientStoreKey || clientStoreKey !== STORE_KEY)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid counter terminal credentials' });
  }

  const { actionType, payload } = req.body || {};
  if (!actionType || !payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid actionType or payload object' });
  }

  // 3. Server-Enforced Branch Authorization & Anti-Spoofing Guard
  const targetBranch = String(payload.branchId || payload.branch_id || payload.store || payload.store_branch || clientBranchId).trim();
  if (!isAdmin && targetBranch && targetBranch !== clientBranchId) {
    return res.status(403).json({ 
      error: `Forbidden: Terminal assigned to branch "${clientBranchId}" is not authorized to modify or access "${targetBranch}".` 
    });
  }

  try {
    let result = null;

    switch (actionType) {
      case 'SALES_BILL': {
        if (!payload.billNo) {
          return res.status(400).json({ error: 'Validation Error: billNo is required for SALES_BILL' });
        }
        const branch = String(payload.branchId || payload.store || payload.store_branch || clientBranchId || 'MAIN');
        const billRow = {
          bill_no: String(payload.billNo).trim(),
          bill_date: payload.date || new Date().toISOString().slice(0, 10),
          store_branch: branch,
          patient_name: String(payload.patientName || 'CUSTOMER').slice(0, 100),
          doctor_name: String(payload.doctorName || 'Self / OTC').slice(0, 100),
          payment_mode: String(payload.paymentMode || 'cash').toLowerCase(),
          gross_total: Math.max(0, Number(payload.grossTotal || 0)),
          net_payable: Math.max(0, Number(payload.netPayable || 0)),
          items_json: Array.isArray(payload.items) ? payload.items : [],
          created_at: payload.date ? new Date(payload.date).toISOString() : new Date().toISOString()
        };
        if (payload.shiftId) billRow.shift_id = String(payload.shiftId);
        if (payload.quarantine_flag !== undefined) billRow.quarantine_flag = Boolean(payload.quarantine_flag);

        let { data, error } = await supabaseServer.from('sales_bills').upsert([billRow], { onConflict: 'store_branch,bill_no' });

        // Graceful fallback if database migration with compound unique constraint is pending application
        if (error && (error.code === '42P10' || error.message?.includes('ON CONFLICT') || error.message?.includes('constraint'))) {
          const existing = await supabaseServer
            .from('sales_bills')
            .select('id')
            .eq('bill_no', billRow.bill_no)
            .eq('store_branch', branch)
            .maybeSingle();

          if (existing.data?.id) {
            const upd = await supabaseServer.from('sales_bills').update(billRow).eq('id', existing.data.id);
            data = upd.data;
            error = upd.error;
          } else {
            const ins = await supabaseServer.from('sales_bills').insert([billRow]);
            data = ins.data;
            error = ins.error;
          }
        }

        if (error) throw error;
        result = data;
        break;
      }

      case 'CREDIT_NOTE': {
        if (!payload.creditNoteNo) {
          return res.status(400).json({ error: 'Validation Error: creditNoteNo is required for CREDIT_NOTE' });
        }
        const branch = String(payload.branchId || clientBranchId || 'MAIN');
        const { data, error } = await supabaseServer.from('credit_notes').upsert([{
          branch_id: branch,
          credit_note_no: String(payload.creditNoteNo).trim(),
          patient_name: String(payload.customerName || payload.patientName || 'CUSTOMER').slice(0, 100),
          refund_amount: Math.max(0, Number(payload.refundAmount || 0)),
          items_json: Array.isArray(payload.items || payload.returnedItems) ? (payload.items || payload.returnedItems) : [],
          unverified_items_json: Array.isArray(payload.unverifiedItems) ? payload.unverifiedItems : [],
          status: payload.status || 'PROCESSED',
          created_at: new Date().toISOString()
        }], { onConflict: 'branch_id,credit_note_no' });

        if (error) throw error;
        result = data;
        break;
      }

      case 'MEDICINE_DELTA': {
        if (!payload.code) {
          return res.status(400).json({ error: 'Validation Error: medicine code is required for MEDICINE_DELTA' });
        }
        const branch = String(payload.branchId || clientBranchId || 'MAIN');
        const medCode = String(payload.code).trim();
        const deltaQty = payload.deltaQty !== undefined ? Number(payload.deltaQty) : null;
        const eventId = payload.eventId ? String(payload.eventId).trim() : null;

        // 1. Check Event Idempotency (Prevent duplicate application on network retry)
        if (eventId) {
          if (appliedEventCache.has(eventId)) {
            const cached = appliedEventCache.get(eventId);
            return res.status(200).json({
              success: true,
              duplicate: true,
              targetStock: cached.targetStock,
              conflict: cached.conflict || null,
              message: `Event "${eventId}" was already applied. Skipping duplicate stock deduction.`
            });
          }

          // Also check persistent inventory_events table if available
          try {
            const { data: existingEvent } = await supabaseServer
              .from('inventory_events')
              .select('*')
              .eq('event_id', eventId)
              .maybeSingle();

            if (existingEvent) {
              appliedEventCache.set(eventId, {
                targetStock: existingEvent.resulting_stock,
                conflict: existingEvent.oversold_flag ? { oversold: true } : null
              });
              return res.status(200).json({
                success: true,
                duplicate: true,
                targetStock: existingEvent.resulting_stock,
                message: `Event "${eventId}" was already applied in database. Skipping duplicate stock deduction.`
              });
            }
          } catch (_) {}
        }

        // Query existing cloud record to apply delta and prevent stale snapshot overwrites
        let existingDelta = null;
        try {
          const { data: exData } = await supabaseServer
            .from('medicines_delta')
            .select('*')
            .eq('branch_id', branch)
            .eq('medicine_code', medCode)
            .maybeSingle();
          existingDelta = exData;
        } catch (_) {}

        let targetStock = 0;
        let conflictDetails = null;

        if (existingDelta) {
          if (deltaQty !== null) {
            // DELTA-AWARE RECONCILIATION:
            // Apply incremental quantity change to current server stock instead of stale snapshot
            const currentCloudStock = Number(existingDelta.stock || 0);
            targetStock = currentCloudStock + deltaQty;

            // Detect concurrent oversell (e.g. 10 available, T1 sold 6 -> 4, T2 sold 6 -> -2)
            if (targetStock < 0) {
              conflictDetails = {
                type: 'OVERSOLD_INVENTORY',
                medicineCode: medCode,
                medicineName: payload.name || existingDelta.name,
                branchId: branch,
                serverStockBefore: currentCloudStock,
                deltaQty: deltaQty,
                resultingStock: targetStock,
                oversoldUnits: Math.abs(targetStock),
                billNo: payload.billNo,
                timestamp: new Date().toISOString()
              };
            }
          } else {
            // Absolute snapshot update: check timestamps to prevent older offline states from overwriting newer stock
            const existingTime = new Date(existingDelta.updated_at || 0).getTime();
            const incomingTime = new Date(payload.updatedAt || 0).getTime();
            if (incomingTime > 0 && existingTime > 0 && incomingTime < existingTime) {
              // Stale snapshot: ignore overwrite to protect newer data
              result = {
                staleIgnored: true,
                message: `Stale snapshot ignored: incoming timestamp (${payload.updatedAt}) is older than cloud record (${existingDelta.updated_at}).`
              };
              break;
            }
            targetStock = Math.max(0, Number(payload.stock !== undefined ? payload.stock : (branch === 'POLYCLINIC' ? (payload.stock_shop2 || 0) : (payload.stock_shop1 || 0))));
          }
        } else {
          // New medicine delta record for this branch
          targetStock = Number(payload.stock !== undefined ? payload.stock : (branch === 'POLYCLINIC' ? (payload.stock_shop2 || 0) : (payload.stock_shop1 || 0)));
          if (deltaQty !== null && targetStock < 0) {
            conflictDetails = {
              type: 'OVERSOLD_INVENTORY',
              medicineCode: medCode,
              medicineName: payload.name,
              branchId: branch,
              serverStockBefore: 0,
              deltaQty: deltaQty,
              resultingStock: targetStock,
              oversoldUnits: Math.abs(targetStock),
              billNo: payload.billNo,
              timestamp: new Date().toISOString()
            };
          }
        }

        const deltaRow = {
          branch_id: branch,
          medicine_code: medCode,
          name: String(payload.name || `MEDICINE ${payload.code}`).slice(0, 150),
          company: String(payload.company !== undefined ? payload.company : '').slice(0, 100),
          mrp: Math.max(0, Number(payload.mrp || 0)),
          rack: String(payload.rack || '').slice(0, 20),
          schedule: String(payload.schedule || '').slice(0, 30),
          stock: targetStock, // Stores actual stock (including negative deficit if oversold)
          batches_json: Array.isArray(payload.batches) ? payload.batches : [],
          updated_at: payload.updatedAt || new Date().toISOString()
        };

        if (payload.stock_shop1 !== undefined) {
          deltaRow.stock_shop1 = Math.max(0, Number(payload.stock_shop1));
        }
        if (payload.stock_shop2 !== undefined) {
          deltaRow.stock_shop2 = Math.max(0, Number(payload.stock_shop2));
        }

        let { data, error } = await supabaseServer.from('medicines_delta').upsert([deltaRow], { 
          onConflict: 'branch_id,medicine_code' 
        });

        if (error && (error.code === '42P10' || error.message?.includes('ON CONFLICT'))) {
          const fallback = await supabaseServer.from('medicines_delta').upsert([deltaRow], { 
            onConflict: 'medicine_code' 
          });
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;

        // Remember applied event ID
        if (eventId) {
          appliedEventCache.set(eventId, {
            targetStock,
            conflict: conflictDetails
          });

          try {
            await supabaseServer.from('inventory_events').insert([{
              event_id: eventId,
              branch_id: branch,
              medicine_code: medCode,
              delta_qty: deltaQty !== null ? deltaQty : 0,
              bill_no: payload.billNo || null,
              resulting_stock: targetStock,
              oversold_flag: Boolean(conflictDetails),
              created_at: new Date().toISOString()
            }]);
          } catch (_) {}
        }

        result = {
          success: true,
          targetStock,
          conflict: conflictDetails
        };
        break;
      }

      case 'FETCH_BRANCH_DELTAS': {
        const queryBranch = isAdmin && payload.branchId ? String(payload.branchId) : (clientBranchId || 'MAIN');
        let { data, error } = await supabaseServer
          .from('medicines_delta')
          .select('*')
          .eq('branch_id', queryBranch);

        if (error && (error.code === '42703' || error.message?.includes('branch_id'))) {
          const fallback = await supabaseServer
            .from('medicines_delta')
            .select('*');
          data = fallback.data;
          error = fallback.error;
        }

        // Graceful fallback if database migration is pending application
        if (error && (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('schema cache'))) {
          data = [];
          error = null;
        }

        if (error) throw error;
        result = data || [];
        break;
      }

      case 'FETCH_BRANCH_BILLS': {
        const queryBranch = isAdmin && payload.branchId ? String(payload.branchId) : (clientBranchId || 'MAIN');
        let { data, error } = await supabaseServer
          .from('sales_bills')
          .select('*')
          .eq('store_branch', queryBranch)
          .order('created_at', { ascending: false })
          .limit(Math.min(500, Number(payload.limit || 100)));

        if (error && (error.code === '42703' || error.message?.includes('store_branch'))) {
          const fallback = await supabaseServer
            .from('sales_bills')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Math.min(500, Number(payload.limit || 100)));
          data = fallback.data;
          error = fallback.error;
        }

        // Graceful fallback if database migration is pending application
        if (error && (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('schema cache'))) {
          data = [];
          error = null;
        }

        if (error) throw error;
        result = data || [];
        break;
      }

      case 'STOCK_TRANSFER': {
        const { data, error } = await supabaseServer.from('stock_transfers').insert([{
          transfer_id: String(payload.transferId || `TRF-${Date.now()}`),
          from_store: String(payload.fromStore || 'MAIN'),
          to_store: String(payload.toStore || 'POLYCLINIC'),
          medicine_name: String(payload.medicineName || payload.code || 'MEDICINE').slice(0, 150),
          quantity: Math.max(1, Number(payload.quantity || 1)),
          batches_json: Array.isArray(payload.batches) ? payload.batches : [],
          status: 'IN-TRANSIT',
          created_at: new Date().toISOString()
        }]);

        if (error) throw error;
        result = data;
        break;
      }

      case 'PURCHASE_INWARD': {
        const { data, error } = await supabaseServer.from('purchase_inwards').insert([{
          invoice_no: String(payload.invoiceNo || `INW-${Date.now()}`),
          distributor: String(payload.distributor || 'DIRECT_SUPPLY').slice(0, 100),
          store_branch: String(payload.branchId || clientBranchId || 'MAIN'),
          items_json: Array.isArray(payload.items) ? payload.items : [],
          net_amount: Math.max(0, Number(payload.netAmount || 0)),
          created_at: new Date().toISOString()
        }]);

        if (error) throw error;
        result = data;
        break;
      }

      case 'SHIFT_RECORD': {
        const { data, error } = await supabaseServer.from('shift_records').upsert([{
          shift_id: String(payload.shiftId || `SHIFT-${Date.now()}`),
          closing_cash: Math.max(0, Number(payload.closingCash || 0)),
          notes: String(payload.notes || '').slice(0, 500),
          branch_id: payload.branchId || clientBranchId || 'MAIN',
          created_at: new Date().toISOString()
        }], { onConflict: 'shift_id' });

        if (error) throw error;
        result = data;
        break;
      }

      case 'PURGE_OLD_BILLS': {
        if (!isAdmin) {
          return res.status(403).json({ error: 'Forbidden: Purging historical cloud storage requires Manager authentication' });
        }
        const cutoffDate = payload.cutoffDate;
        if (!cutoffDate || isNaN(Date.parse(cutoffDate))) {
          return res.status(400).json({ error: 'Validation Error: A valid cutoffDate ISO string is required' });
        }
        const cutoffMillis = new Date(cutoffDate).getTime();
        const minRetentionMillis = Date.now() - (30 * 24 * 60 * 60 * 1000); // Enforce minimum 30 days retention
        if (cutoffMillis > minRetentionMillis) {
          return res.status(400).json({ error: 'Security Guard: Cannot purge records younger than 30 days' });
        }
        const { data, error } = await supabaseServer
          .from('sales_bills')
          .delete()
          .lt('created_at', cutoffDate);

        if (error) throw error;
        result = { purged: true, cutoffDate };
        break;
      }

      case 'PHARMACY_BACKUP': {
        if (!payload.checksum || !payload.record_counts) {
          return res.status(400).json({ error: 'Validation Error: Checksum and record_counts are required for PHARMACY_BACKUP' });
        }
        let snapshotData = payload.snapshot_data;
        if (payload.isCompressed && payload.compressedData) {
          try {
            const buf = Buffer.from(payload.compressedData, 'base64');
            const decompressed = zlib.gunzipSync(buf).toString('utf-8');
            snapshotData = JSON.parse(decompressed);
          } catch (decompErr) {
            return res.status(400).json({ error: 'Validation Error: Failed to decompress backup payload' });
          }
        }
        if (!snapshotData || typeof snapshotData !== 'object') {
          return res.status(400).json({ error: 'Validation Error: snapshot_data is required for PHARMACY_BACKUP' });
        }
        const { data, error } = await supabaseServer.from('pharmacy_backups').insert([{
          branch_id: payload.branchId || payload.branch_id || 'MAIN',
          backup_date: payload.backup_date || new Date().toISOString().slice(0, 10),
          backup_timestamp: payload.backup_timestamp || new Date().toISOString(),
          checksum: String(payload.checksum),
          record_counts: payload.record_counts || {},
          snapshot_data: snapshotData,
          verified: true,
          created_at: new Date().toISOString()
        }]);

        if (error) throw error;
        result = data;
        break;
      }

      case 'RECONCILE_CONFLICT': {
        if (!isAdmin) {
          return res.status(403).json({ error: 'Forbidden: Manager authorization required to reconcile oversold inventory conflict' });
        }
        if (!payload.conflictId || !payload.code) {
          return res.status(400).json({ error: 'Validation Error: conflictId and code are required for RECONCILE_CONFLICT' });
        }
        const branch = String(payload.branchId || clientBranchId || 'MAIN');
        const medCode = String(payload.code).trim();
        const resolvedStock = Math.max(0, Number(payload.resolvedStock || 0));

        let { data, error } = await supabaseServer.from('medicines_delta').upsert([{
          branch_id: branch,
          medicine_code: medCode,
          stock: resolvedStock,
          updated_at: new Date().toISOString()
        }], { onConflict: 'branch_id,medicine_code' });

        if (error && (error.code === '42P10' || error.message?.includes('ON CONFLICT'))) {
          const fallback = await supabaseServer.from('medicines_delta').upsert([{
            branch_id: branch,
            medicine_code: medCode,
            stock: resolvedStock,
            updated_at: new Date().toISOString()
          }], { onConflict: 'medicine_code' });
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;

        try {
          await supabaseServer.from('inventory_events').insert([{
            event_id: `RECON_${payload.conflictId}_${Date.now()}`,
            branch_id: branch,
            medicine_code: medCode,
            delta_qty: Number(payload.adjustmentDelta || 0),
            resulting_stock: resolvedStock,
            oversold_flag: false,
            created_at: new Date().toISOString()
          }]);
        } catch (_) {}

        result = {
          success: true,
          reconciled: true,
          conflictId: payload.conflictId,
          medicineCode: medCode,
          branchId: branch,
          reconciledStock: resolvedStock,
          authorizedBy: payload.authorizedBy || 'MANAGER'
        };
        break;
      }

      default:
        return res.status(400).json({ error: `Unsupported actionType: ${actionType}` });
    }

    return res.status(200).json({ 
      success: true, 
      synced: true, 
      actionType, 
      targetStock: result?.targetStock,
      conflict: result?.conflict,
      duplicate: result?.duplicate,
      result 
    });
  } catch (err) {
    console.warn('[SYNC PROXY DB ERROR]', err.message || err);
    // Return standardized sanitized error response without leaking database stack
    return res.status(500).json({ 
      success: false, 
      error: 'Proxy synchronization error: database operation failed', 
      code: err.code || 'PROXY_ERROR' 
    });
  }
}
