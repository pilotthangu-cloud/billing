/**
 * 2+ Years Local Disk & Verified Cloud Backup Engine for Beta Pharmacy POS
 * Retains daily database snapshots in IndexedDB for 730+ days (2+ years),
 * provides 1-click JSON backup export, USB fiscal archive exports,
 * and double-blind verified Supabase Cloud backups.
 * 
 * Free-Tier Optimizations:
 * - Local disk backups use 0 MB cloud storage (IndexedDB on counter PC).
 * - Cloud backups store rolling verified snapshots with automated pruning.
 * - Double-blind readback verification ensures no fake success reporting.
 * - Deterministic canonical JSON serialization guarantees repeatable checksums.
 */

import { 
  openPharmaDB, 
  idbCacheMedicines, 
  idbSaveBill, 
  idbSaveUnverifiedReturn, 
  idbGetUnverifiedReturns,
  idbSaveStockTransfer,
  idbGetAllStockTransfers,
  idbSaveDueBill,
  idbGetAllDueBills,
  idbSetInitialized 
} from './indexedDb.js';
import { uploadVerifiedCloudBackup, fetchLatestVerifiedCloudBackup } from './supabaseClient.js';

const BACKUP_RETENTION_DAYS = 730; // 2+ years of daily backups

/**
 * Deterministic canonical JSON stringifier (sorts object keys recursively)
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(k => JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Generate a deterministic content checksum for backup integrity verification
 */
export function generateBackupChecksum(data) {
  const str = typeof data === 'string' ? data : canonicalJsonStringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `BP-CHK-${Math.abs(hash).toString(16).toUpperCase()}-${str.length}`;
}

/**
 * Gather complete state snapshot across all operational categories
 */
async function gatherCompleteSnapshot(medicines, recentBills, activeBranch) {
  const branchId = activeBranch?.id || 'MAIN';
  const branchOverridesKey = `beta_pharma_med_overrides_${branchId}`;
  const overrides = JSON.parse(localStorage.getItem(branchOverridesKey) || localStorage.getItem('beta_pharma_med_overrides') || '{}');
  const creditNotes = JSON.parse(localStorage.getItem('beta_pharma_credit_notes') || '[]');
  const purchases = JSON.parse(localStorage.getItem('beta_pharma_purchase_bills') || '[]');
  const branchConfigKey = `beta_pharma_store_config_${branchId}`;
  const storeConfig = JSON.parse(localStorage.getItem(branchConfigKey) || localStorage.getItem('beta_pharma_store_config') || '{}');
  const staffList = JSON.parse(localStorage.getItem('beta_pharma_staff_list') || '[]');
  const lastMutation = parseInt(localStorage.getItem(`beta_pharma_last_operational_mutation_${branchId}`) || '0', 10);

  // Read durable entities from IndexedDB
  let unverifiedReturns = [];
  let stockTransfers = [];
  let dueBills = [];

  try {
    unverifiedReturns = await idbGetUnverifiedReturns();
  } catch (e) {}

  try {
    stockTransfers = await idbGetAllStockTransfers();
  } catch (e) {}

  try {
    dueBills = await idbGetAllDueBills();
  } catch (e) {
    dueBills = JSON.parse(localStorage.getItem('beta_pharma_due_bills') || '[]');
  }

  return {
    medicines: medicines || [],
    recentBills: recentBills || [],
    creditNotes: creditNotes || [],
    unverifiedReturns: unverifiedReturns || [],
    stockTransfers: stockTransfers || [],
    purchases: purchases || [],
    dueBills: dueBills || [],
    storeConfig,
    staffList,
    overrides,
    branch: activeBranch,
    branchId,
    lastOperationalMutation: Math.max(lastMutation, Date.now())
  };
}

/**
 * Save daily backup snapshot into IndexedDB
 */
export async function saveDailyBackupSnapshot(medicines, recentBills, activeBranch, activeShift) {
  try {
    const db = await openPharmaDB();
    if (!db) return null;

    if (!db.objectStoreNames.contains('backups')) {
      return null;
    }

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const snapshotData = await gatherCompleteSnapshot(medicines, recentBills, activeBranch);

    const backupPayload = {
      date: todayStr,
      timestamp: Date.now(),
      createdTime: new Date().toLocaleTimeString(),
      branchId: activeBranch?.id || 'MAIN',
      branchName: activeBranch?.name || 'Beta Pharmacy',
      operator: activeShift?.staffName || 'Counter Staff',
      medicinesCount: (medicines || []).length,
      billsCount: (recentBills || []).length,
      snapshot: snapshotData
    };

    const tx = db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    store.put(backupPayload);

    // Prune backups older than 730 days (2+ years)
    const cutoffTimestamp = Date.now() - (BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.timestamp && cursor.value.timestamp < cutoffTimestamp) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    return backupPayload;
  } catch (err) {
    console.warn('Daily backup engine note:', err);
    return null;
  }
}

/**
 * Get count of retained daily backups
 */
export async function getLocalBackupStats() {
  try {
    const db = await openPharmaDB();
    if (!db || !db.objectStoreNames.contains('backups')) {
      return { totalBackups: 0, oldestDate: null, newestDate: null, retentionDays: BACKUP_RETENTION_DAYS };
    }

    return new Promise((resolve) => {
      const tx = db.transaction('backups', 'readonly');
      const store = tx.objectStore('backups');
      const countReq = store.count();

      countReq.onsuccess = () => {
        resolve({
          totalBackups: countReq.result || 0,
          retentionDays: BACKUP_RETENTION_DAYS,
          status: 'Active (730+ Days Retention)'
        });
      };
      countReq.onerror = () => {
        resolve({ totalBackups: 0, retentionDays: BACKUP_RETENTION_DAYS });
      };
    });
  } catch (e) {
    return { totalBackups: 0, retentionDays: BACKUP_RETENTION_DAYS };
  }
}

/**
 * Safely compress a snapshot object using native web CompressionStream('gzip')
 * Returns base64 gzipped string or null if unsupported.
 */
export async function compressSnapshotData(snapshotData) {
  try {
    const jsonStr = typeof snapshotData === 'string' ? snapshotData : JSON.stringify(snapshotData);
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('gzip'));
      const ab = await new Response(stream).arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(ab);
      const chunkSize = 0x8000; // 32KB chunking to prevent call stack overflow
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    }
  } catch (err) {
    console.warn('CompressionStream fallback notice:', err);
  }
  return null;
}

/**
 * Create and verify a Supabase Cloud Backup with double-blind readback proof
 */
export async function triggerVerifiedCloudBackup(medicines, recentBills, activeBranch) {
  const branchId = activeBranch?.id || 'MAIN';
  const todayStr = new Date().toISOString().split('T')[0];

  const snapshotData = await gatherCompleteSnapshot(medicines, recentBills, activeBranch);
  const checksum = generateBackupChecksum(snapshotData);
  const compressedBase64 = await compressSnapshotData(snapshotData);

  const recordCounts = {
    medicines: (snapshotData.medicines || []).length,
    bills: (snapshotData.recentBills || []).length,
    creditNotes: (snapshotData.creditNotes || []).length,
    unverifiedReturns: (snapshotData.unverifiedReturns || []).length,
    purchases: (snapshotData.purchases || []).length,
    stockTransfers: (snapshotData.stockTransfers || []).length,
    dueBills: (snapshotData.dueBills || []).length
  };

  const payload = {
    branchId,
    backup_date: todayStr,
    backup_timestamp: new Date().toISOString(),
    checksum,
    record_counts: recordCounts,
    snapshot_data: snapshotData,
    isCompressed: Boolean(compressedBase64),
    compressedData: compressedBase64
  };

  const res = await uploadVerifiedCloudBackup(payload);
  return res;
}

/**
 * Helper to determine the latest operational timestamp on this local machine for a branch
 */
export function getLocalLatestOperationalTimestamp(branchId) {
  let latest = 0;
  try {
    const recorded = parseInt(localStorage.getItem(`beta_pharma_last_operational_mutation_${branchId}`) || '0', 10);
    if (!isNaN(recorded) && recorded > 0) latest = Math.max(latest, recorded);
  } catch (e) {}

  try {
    const recentBills = JSON.parse(localStorage.getItem('beta_pharma_recent_bills') || '[]');
    for (const b of recentBills) {
      const bTime = new Date(b.dateTime || b.created_at || b.date || 0).getTime();
      if (!isNaN(bTime) && bTime > latest) latest = bTime;
    }
  } catch (e) {}

  return latest;
}

/**
 * Validate schema and relationships of a backup snapshot before modifying local state
 */
export function validateBackupSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, error: 'Invalid backup: payload is not an object.' };
  }

  const payload = snapshot.data || snapshot.snapshot || snapshot;
  const meds = payload.medicines;

  if (!Array.isArray(meds) || meds.length === 0) {
    return { valid: false, error: 'Validation Error: Backup contains zero medicines. Refusing to restore empty catalogue.' };
  }

  // Verify first 5 items have required medicine structure
  for (let i = 0; i < Math.min(5, meds.length); i++) {
    const m = meds[i];
    if (!m || (!m.code && !m.name)) {
      return { valid: false, error: `Validation Error: Medicine at index ${i} lacks required code/name.` };
    }
  }

  return { valid: true, payload };
}

/**
 * Restore pharmacy state from verified Supabase Cloud Backup
 */
export async function restoreFromVerifiedCloudBackup(branchId = 'MAIN', options = {}) {
  const res = await fetchLatestVerifiedCloudBackup(branchId);
  if (!res.success || !res.backup) {
    return { success: false, error: res.error || 'Failed to fetch verified cloud backup.' };
  }

  const backup = res.backup;
  const validation = validateBackupSnapshot(backup.data || {});
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const payload = validation.payload;
  const targetBranchId = payload.branchId || branchId || 'MAIN';

  // Anti-regression protection
  const backupTimestamp = backup.timestamp ? new Date(backup.timestamp).getTime() : 
    (backup.date ? new Date(backup.date).getTime() : 0);
  const localLatest = getLocalLatestOperationalTimestamp(targetBranchId);

  // If local terminal has newer operations and force is not set, block restore to prevent silent data loss
  if (!options.force && backupTimestamp > 0 && localLatest > 0 && localLatest > (backupTimestamp + 60000)) {
    return {
      success: false,
      isRegression: true,
      backupTimestamp,
      localLatest,
      error: `ANTI_REGRESSION_PROTECTION: The cloud backup you are attempting to restore (dated ${new Date(backupTimestamp).toLocaleString()}) is older than active local counter data (latest operation: ${new Date(localLatest).toLocaleString()}). Overwriting with an older snapshot will cause irreversible loss of newer bills and stock updates. Specify force=true to proceed if performing disaster recovery.`
    };
  }

  const meds = payload.medicines || [];
  const bills = payload.recentBills || payload.bills || [];
  const unverifiedReturns = payload.unverifiedReturns || [];
  const stockTransfers = payload.stockTransfers || [];
  const dueBills = payload.dueBills || [];
  const purchases = payload.purchases || [];
  const creditNotes = payload.creditNotes || [];
  const overrides = payload.overrides || {};
  const storeConfig = payload.storeConfig || {};
  const staffList = payload.staffList || [];

  // Restore into authoritative local IndexedDB with failure tracking
  const persistenceFailures = [];
  const isIndexedDBAvailable = (typeof indexedDB !== 'undefined') || (typeof window !== 'undefined' && Boolean(window.indexedDB));

  const medRes = await idbCacheMedicines(meds);
  const isMedOk = medRes === true || (medRes && medRes.success);
  if (!isMedOk && isIndexedDBAvailable) {
    persistenceFailures.push(`Medicines: ${medRes?.error || 'Failed to cache medicines into IndexedDB'}`);
  }

  // Restore bills
  let failedBills = 0;
  for (const b of bills) {
    if (b && (b.billNo || b.id)) {
      const bRes = await idbSaveBill(b);
      const isBOk = bRes === true || (bRes && bRes.success);
      if (!isBOk) {
        failedBills++;
      }
    }
  }
  if (failedBills > 0 && isIndexedDBAvailable) {
    persistenceFailures.push(`Bills: Failed to persist ${failedBills}/${bills.length} bills into IndexedDB`);
  }

  // Restore quarantined unverified returns
  let failedReturns = 0;
  for (const uv of unverifiedReturns) {
    if (uv && uv.creditNoteNo) {
      const uvRes = await idbSaveUnverifiedReturn(uv);
      const isUvOk = uvRes === true || (uvRes && uvRes.success);
      if (!isUvOk) {
        failedReturns++;
      }
    }
  }
  if (failedReturns > 0 && isIndexedDBAvailable) {
    persistenceFailures.push(`Unverified Returns: Failed to persist ${failedReturns}/${unverifiedReturns.length} records into IndexedDB`);
  }

  // Restore stock transfers
  let failedTransfers = 0;
  for (const tr of stockTransfers) {
    if (tr && tr.id) {
      const trRes = await idbSaveStockTransfer(tr);
      const isTrOk = trRes === true || (trRes && trRes.success);
      if (!isTrOk) {
        failedTransfers++;
      }
    }
  }
  if (failedTransfers > 0 && isIndexedDBAvailable) {
    persistenceFailures.push(`Stock Transfers: Failed to persist ${failedTransfers}/${stockTransfers.length} records into IndexedDB`);
  }

  // Restore due bills
  let failedDueBills = 0;
  for (const db of dueBills) {
    if (db && db.id) {
      const dbRes = await idbSaveDueBill(db);
      const isDbOk = dbRes === true || (dbRes && dbRes.success);
      if (!isDbOk) {
        failedDueBills++;
      }
    }
  }
  if (failedDueBills > 0 && isIndexedDBAvailable) {
    persistenceFailures.push(`Due Bills: Failed to persist ${failedDueBills}/${dueBills.length} records into IndexedDB`);
  }

  // Restore LocalStorage configurations safely with branch isolation
  try {
    localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
    localStorage.setItem(`beta_pharma_med_overrides_${targetBranchId}`, JSON.stringify(overrides));
    localStorage.setItem('beta_pharma_recent_bills', JSON.stringify(bills.slice(0, 500)));
    localStorage.setItem('beta_pharma_purchase_bills', JSON.stringify(purchases));
    localStorage.setItem('beta_pharma_credit_notes', JSON.stringify(creditNotes));
    localStorage.setItem('beta_pharma_transfer_notes', JSON.stringify(stockTransfers));
    localStorage.setItem('beta_pharma_due_bills', JSON.stringify(dueBills));
    if (staffList.length > 0) {
      localStorage.setItem('beta_pharma_staff_list', JSON.stringify(staffList));
    }
    if (storeConfig && (storeConfig.name || storeConfig.pharmacyName || Object.keys(storeConfig).length > 0)) {
      localStorage.setItem('beta_pharma_store_config', JSON.stringify(storeConfig));
      localStorage.setItem(`beta_pharma_store_config_${targetBranchId}`, JSON.stringify(storeConfig));
    }
    localStorage.setItem(`beta_pharma_last_operational_mutation_${targetBranchId}`, String(Date.now()));
  } catch (e) {}

  await idbSetInitialized({
    restoredFrom: 'SUPABASE_CLOUD_BACKUP',
    backupId: backup.id,
    checksum: backup.checksum,
    restoredAt: new Date().toISOString(),
    medCount: meds.length
  });

  const hasFailures = persistenceFailures.length > 0;
  if (hasFailures) {
    console.error('[STORAGE_WARNING] Cloud backup restore encountered persistence failures:', persistenceFailures);
  }

  return {
    success: !hasFailures,
    hasPartialFailures: hasFailures,
    persistenceFailures,
    meds,
    bills,
    overrides,
    storeConfig,
    branch: payload.branch,
    checksum: backup.checksum,
    date: backup.date,
    recordCounts: backup.recordCounts,
    error: hasFailures ? `Partial restore with persistence errors: ${persistenceFailures.join('; ')}` : null,
    message: hasFailures
      ? `Storage Warning: Restored with persistence errors: ${persistenceFailures.join('; ')}`
      : `✓ Successfully restored ${meds.length} medicines, ${bills.length} bills, and all operating registers from verified Cloud Backup (${backup.date})!`
  };
}

/**
 * Restore pharmacy state from a local JSON backup file
 */
export async function restoreFromLocalBackupJson(rawInput, options = {}) {
  try {
    const json = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    const validation = validateBackupSnapshot(json);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const payload = validation.payload;
    const targetBranchId = payload.branchId || payload.branch?.id || 'MAIN';

    // Anti-regression protection
    const backupTimestamp = json.exportTimestamp || json.timestamp || 
      (json.exportDate ? new Date(json.exportDate).getTime() : 0);
    const localLatest = getLocalLatestOperationalTimestamp(targetBranchId);

    if (!options.force && backupTimestamp > 0 && localLatest > 0 && localLatest > (backupTimestamp + 60000)) {
      return {
        success: false,
        isRegression: true,
        backupTimestamp,
        localLatest,
        error: `ANTI_REGRESSION_PROTECTION: The local backup file you are attempting to restore (dated ${new Date(backupTimestamp).toLocaleString()}) is older than active local counter data (latest operation: ${new Date(localLatest).toLocaleString()}). Restoring this file will silently overwrite newer bills and inventory changes. Specify force=true to proceed if performing deliberate disaster recovery.`
      };
    }

    const meds = payload.medicines || [];
    const bills = payload.recentBills || payload.bills || [];
    const unverifiedReturns = payload.unverifiedReturns || [];
    const stockTransfers = payload.stockTransfers || [];
    const dueBills = payload.dueBills || [];
    const purchases = payload.purchases || [];
    const creditNotes = payload.creditNotes || [];
    const overrides = payload.overrides || {};
    const storeConfig = payload.storeConfig || {};
    const staffList = payload.staffList || [];

    // Persist into authoritative IndexedDB with failure tracking
    const persistenceFailures = [];
    const isIndexedDBAvailable = (typeof indexedDB !== 'undefined') || (typeof window !== 'undefined' && Boolean(window.indexedDB));

    const medRes = await idbCacheMedicines(meds);
    const isMedOk = medRes === true || (medRes && medRes.success);
    if (!isMedOk && isIndexedDBAvailable) {
      persistenceFailures.push(`Medicines: ${medRes?.error || 'Failed to cache medicines into IndexedDB'}`);
    }

    let failedBills = 0;
    for (const b of bills) {
      if (b && (b.billNo || b.id)) {
        const bRes = await idbSaveBill(b);
        const isBOk = bRes === true || (bRes && bRes.success);
        if (!isBOk) {
          failedBills++;
        }
      }
    }
    if (failedBills > 0 && isIndexedDBAvailable) {
      persistenceFailures.push(`Bills: Failed to persist ${failedBills}/${bills.length} bills into IndexedDB`);
    }

    let failedReturns = 0;
    for (const uv of unverifiedReturns) {
      if (uv && uv.creditNoteNo) {
        const uvRes = await idbSaveUnverifiedReturn(uv);
        const isUvOk = uvRes === true || (uvRes && uvRes.success);
        if (!isUvOk) {
          failedReturns++;
        }
      }
    }
    if (failedReturns > 0 && isIndexedDBAvailable) {
      persistenceFailures.push(`Unverified Returns: Failed to persist ${failedReturns}/${unverifiedReturns.length} records into IndexedDB`);
    }

    let failedTransfers = 0;
    for (const tr of stockTransfers) {
      if (tr && tr.id) {
        const trRes = await idbSaveStockTransfer(tr);
        const isTrOk = trRes === true || (trRes && trRes.success);
        if (!isTrOk) {
          failedTransfers++;
        }
      }
    }
    if (failedTransfers > 0 && isIndexedDBAvailable) {
      persistenceFailures.push(`Stock Transfers: Failed to persist ${failedTransfers}/${stockTransfers.length} records into IndexedDB`);
    }

    let failedDueBills = 0;
    for (const db of dueBills) {
      if (db && db.id) {
        const dbRes = await idbSaveDueBill(db);
        const isDbOk = dbRes === true || (dbRes && dbRes.success);
        if (!isDbOk) {
          failedDueBills++;
        }
      }
    }
    if (failedDueBills > 0 && isIndexedDBAvailable) {
      persistenceFailures.push(`Due Bills: Failed to persist ${failedDueBills}/${dueBills.length} records into IndexedDB`);
    }

    try {
      localStorage.setItem('beta_pharma_med_overrides', JSON.stringify(overrides));
      localStorage.setItem(`beta_pharma_med_overrides_${targetBranchId}`, JSON.stringify(overrides));
      if (bills.length > 0) {
        localStorage.setItem('beta_pharma_recent_bills', JSON.stringify(bills.slice(0, 500)));
      }
      localStorage.setItem('beta_pharma_purchase_bills', JSON.stringify(purchases));
      localStorage.setItem('beta_pharma_credit_notes', JSON.stringify(creditNotes));
      localStorage.setItem('beta_pharma_transfer_notes', JSON.stringify(stockTransfers));
      localStorage.setItem('beta_pharma_due_bills', JSON.stringify(dueBills));
      if (staffList.length > 0) {
        localStorage.setItem('beta_pharma_staff_list', JSON.stringify(staffList));
      }
      if (storeConfig && (storeConfig.name || storeConfig.pharmacyName || Object.keys(storeConfig).length > 0)) {
        localStorage.setItem('beta_pharma_store_config', JSON.stringify(storeConfig));
        localStorage.setItem(`beta_pharma_store_config_${targetBranchId}`, JSON.stringify(storeConfig));
      }
      localStorage.setItem(`beta_pharma_last_operational_mutation_${targetBranchId}`, String(Date.now()));
    } catch (e) {}

    await idbSetInitialized({
      restoredFrom: 'LOCAL_JSON_BACKUP',
      exportDate: json.exportDate || new Date().toISOString(),
      checksum: json.checksum || 'N/A',
      restoredAt: new Date().toISOString(),
      medCount: meds.length
    });

    const hasFailures = persistenceFailures.length > 0;
    if (hasFailures) {
      console.error('[STORAGE_WARNING] Local backup restore encountered persistence failures:', persistenceFailures);
    }

    return {
      success: !hasFailures,
      hasPartialFailures: hasFailures,
      persistenceFailures,
      meds,
      bills,
      overrides,
      storeConfig,
      branch: payload.branch,
      date: json.exportDate || 'Unknown',
      checksum: json.checksum || 'N/A',
      recordCounts: payload.recordCounts,
      error: hasFailures ? `Partial restore with persistence errors: ${persistenceFailures.join('; ')}` : null,
      message: hasFailures
        ? `Storage Warning: Restored with persistence errors: ${persistenceFailures.join('; ')}`
        : `✓ Successfully restored ${meds.length} medicines, ${bills.length} bills, and all registers from local backup!`
    };
  } catch (err) {
    return { success: false, error: `Failed to restore from local backup: ${err.message}` };
  }
}

/**
 * Export 1-Click Complete Daily Backup (.json file download)
 */
export async function downloadDailyBackupFile(medicines, recentBills, activeBranch) {
  const dateStr = new Date().toISOString().split('T')[0];
  const fullData = await gatherCompleteSnapshot(medicines, recentBills, activeBranch);
  const checksum = generateBackupChecksum(fullData);

  const fullExport = {
    app: 'Beta Pharmacy Desktop POS',
    schemaVersion: '2.2',
    exportDate: dateStr,
    exportTimestamp: Date.now(),
    branch: activeBranch,
    checksum,
    counts: {
      medicines: (fullData.medicines || []).length,
      recentBills: (fullData.recentBills || []).length,
      creditNotes: (fullData.creditNotes || []).length,
      unverifiedReturns: (fullData.unverifiedReturns || []).length,
      purchases: (fullData.purchases || []).length,
      stockTransfers: (fullData.stockTransfers || []).length,
      dueBills: (fullData.dueBills || []).length
    },
    data: fullData
  };

  const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BetaPharma_Backup_${activeBranch?.short || 'Shop'}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export 2-Year Fiscal Archive for Audits / USB Pen Drive
 */
export function downloadTwoYearArchive(recentBills, activeBranch) {
  const dateStr = new Date().toISOString().split('T')[0];
  const purchases = JSON.parse(localStorage.getItem('beta_pharma_purchase_bills') || '[]');
  const creditNotes = JSON.parse(localStorage.getItem('beta_pharma_credit_notes') || '[]');
  const staffHandoverLogs = JSON.parse(localStorage.getItem('beta_pharma_handover_logs') || '[]');

  const archiveData = {
    title: 'Beta Pharmacy 2-Year Full Fiscal & Operations Archive',
    generationDate: dateStr,
    branch: activeBranch,
    retentionWindow: '24 Months (730 Days)',
    registers: {
      salesBills: recentBills,
      purchaseInwards: purchases,
      salesReturns: creditNotes,
      staffHandoverReconciliations: staffHandoverLogs
    }
  };

  const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BetaPharma_2Year_Fiscal_Archive_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
