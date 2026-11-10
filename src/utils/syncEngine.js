/**
 * Background Delta Sync Engine for Supabase Cloud Sync
 * Automatically queues offline mutations in IndexedDB and flushes them
 * in the background when connectivity is active.
 * 
 * Free-Tier Optimizations:
 * - Exponential backoff (30s -> 1m -> 2m -> 5m) on errors to prevent API quota hammering.
 * - Incremental medicine stock syncing (syncs 1-5 modified meds per sale instead of 24k).
 * - Exact status reporting (SYNCED, PENDING, RLS_BLOCKED, OFFLINE).
 * - Zero data loss: items stay strictly in IndexedDB sync_queue until confirmed by cloud.
 */

import { 
  pushSalesBillToSupabase, 
  pushStockTransferToSupabase,
  pushPurchaseInwardToSupabase,
  pushCreditNoteToSupabase,
  pushShiftRecordToSupabase,
  pushMedicineDeltaToSupabase,
  getCloudStorageEstimate
} from './supabaseClient.js';
import { 
  idbEnqueueDelta, 
  idbGetPendingDeltas, 
  idbRemoveDelta,
  idbSaveBill,
  idbSaveStockTransfer
} from './indexedDb.js';

class DeltaSyncEngine {
  constructor() {
    this.enabled = import.meta.env?.VITE_ENABLE_CLOUD_SYNC === 'true';
    this.isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
    this.isSyncing = false;
    this.subscribers = new Set();
    this.pendingCount = 0;
    this.lastSyncTime = null;
    this.lastError = null;
    this.syncState = this.enabled ? 'PENDING' : 'LOCAL_ONLY';
    this.backoffMs = 30000;
    this.heartbeatTimer = null;
    this.unresolvedConflicts = this.loadStoredConflicts();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      
      if (this.enabled) {
        this.refreshPendingCount();
        this.startHeartbeat();
      }
    }
  }

  loadStoredConflicts() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('beta_pharma_unresolved_conflicts');
        if (raw) {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        }
      }
    } catch (_) {}
    return [];
  }

  loadUnresolvedConflicts() {
    this.unresolvedConflicts = this.loadStoredConflicts();
    if (this.unresolvedConflicts.length > 0) {
      this.syncState = 'RECONCILIATION_REQUIRED';
    }
    return this.unresolvedConflicts;
  }

  saveStoredConflicts() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('beta_pharma_unresolved_conflicts', JSON.stringify(this.unresolvedConflicts));
      }
    } catch (_) {}
  }

  addUnresolvedConflict(conflictData) {
    if (!conflictData) return null;
    const existingIdx = this.unresolvedConflicts.findIndex(c => 
      c.medicineCode === conflictData.medicineCode && 
      c.billNo === conflictData.billNo && 
      c.branchId === conflictData.branchId
    );
    let result = null;
    if (existingIdx !== -1) {
      this.unresolvedConflicts[existingIdx] = { ...this.unresolvedConflicts[existingIdx], ...conflictData };
      result = this.unresolvedConflicts[existingIdx];
    } else {
      result = {
        id: conflictData.id || `CONFLICT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: 'CONFLICT_UNRESOLVED',
        createdAt: new Date().toISOString(),
        ...conflictData
      };
      this.unresolvedConflicts.push(result);
    }
    this.saveStoredConflicts();
    this.syncState = 'RECONCILIATION_REQUIRED';
    this.notifySubscribers();
    return result;
  }

  recordOversellConflict(conflictData) {
    return this.addUnresolvedConflict(conflictData);
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    if (!this.enabled) {
      this.syncState = 'LOCAL_ONLY';
      this.notifySubscribers();
      return;
    }
    if (!online) {
      this.syncState = 'OFFLINE';
      this.notifySubscribers();
    } else {
      this.backoffMs = 30000;
      this.syncState = this.unresolvedConflicts.length > 0 
        ? 'RECONCILIATION_REQUIRED' 
        : (this.pendingCount > 0 ? 'PENDING' : 'SYNCED');
      this.notifySubscribers();
      this.flushQueue();
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing && (this.pendingCount > 0 || this.unresolvedConflicts.length > 0)) {
        this.flushQueue();
      }
    }, this.backoffMs);
  }

  adjustHeartbeat(newDelayMs) {
    this.backoffMs = Math.max(30000, Math.min(newDelayMs, 300000)); // between 30s and 5 min
    this.startHeartbeat();
  }

  async refreshPendingCount() {
    try {
      const deltas = await idbGetPendingDeltas();
      this.pendingCount = Array.isArray(deltas) ? deltas.length : 0;
    } catch (_) {
      this.pendingCount = 0;
    }

    // Reload stored conflicts
    this.unresolvedConflicts = this.loadStoredConflicts();

    // INVARIANT: If any unresolved concurrency conflicts exist, state CANNOT be marked SYNCED!
    if (this.unresolvedConflicts.length > 0) {
      this.syncState = 'RECONCILIATION_REQUIRED';
    } else if (!this.isOnline) {
      this.syncState = 'OFFLINE';
    } else if (this.lastError && this.lastError.includes('RLS')) {
      this.syncState = 'RLS_BLOCKED';
    } else if (this.pendingCount > 0) {
      this.syncState = 'PENDING';
    } else {
      this.syncState = 'SYNCED';
    }

    this.notifySubscribers();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.getStatus());
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    const status = this.getStatus();
    this.subscribers.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error('Error in sync engine subscriber callback', e);
      }
    });
  }

  getStatus() {
    return {
      enabled: this.enabled,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      unresolvedConflictsCount: this.unresolvedConflicts.length,
      unresolvedConflicts: [...this.unresolvedConflicts],
      syncState: this.syncState,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError
    };
  }

  // Manager Conflict Reconciliation Methods
  async resolveConflictWithInward(identifier, branchIdOrDetails, qty, invoiceNo) {
    let details = typeof branchIdOrDetails === 'object' ? branchIdOrDetails : null;
    if (!details && typeof qty === 'number') {
      details = { branchId: branchIdOrDetails, qty, invoiceNo };
    }
    const idx = this.unresolvedConflicts.findIndex(c => c.id === identifier || c.medicineCode === identifier);
    if (idx === -1) return { success: false, error: 'Conflict not found' };

    const conflict = this.unresolvedConflicts[idx];
    conflict.status = 'RESOLVED_BY_INWARD';
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolutionDetails = details;

    if (details && typeof this.recordPurchaseInward === 'function') {
      try {
        await this.recordPurchaseInward(details);
      } catch (_) {}
    }

    this.unresolvedConflicts.splice(idx, 1);
    this.saveStoredConflicts();
    await this.refreshPendingCount();
    return { success: true, conflict };
  }

  async resolveConflictWithTransfer(identifier, fromBranch, toBranch, qty) {
    let details = typeof fromBranch === 'object' ? fromBranch : { fromBranch, toBranch, qty };
    const idx = this.unresolvedConflicts.findIndex(c => c.id === identifier || c.medicineCode === identifier);
    if (idx === -1) return { success: false, error: 'Conflict not found' };

    const conflict = this.unresolvedConflicts[idx];
    conflict.status = 'RESOLVED_BY_TRANSFER';
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolutionDetails = details;

    if (details && typeof this.recordStockTransfer === 'function') {
      try {
        await this.recordStockTransfer(details);
      } catch (_) {}
    }

    this.unresolvedConflicts.splice(idx, 1);
    this.saveStoredConflicts();
    await this.refreshPendingCount();
    return { success: true, conflict };
  }

  async resolveConflictWithAdjustment(identifier, branchOrAdjustment, maybeStock, maybeReason, authorizedBy = 'MANAGER') {
    let details = typeof branchOrAdjustment === 'object' ? branchOrAdjustment : {
      branchId: branchOrAdjustment,
      adjustedStock: maybeStock,
      reason: maybeReason,
      authorizedBy: authorizedBy || 'MANAGER'
    };
    if (!details.authorizedBy) {
      return { success: false, error: 'Unauthorized: Manager credentials required for inventory reconciliation' };
    }
    const idx = this.unresolvedConflicts.findIndex(c => c.id === identifier || c.medicineCode === identifier);
    if (idx === -1) return { success: false, error: 'Conflict not found' };

    const conflict = this.unresolvedConflicts[idx];
    conflict.status = 'RESOLVED_BY_ADJUSTMENT';
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolutionDetails = details;

    this.unresolvedConflicts.splice(idx, 1);
    this.saveStoredConflicts();
    await this.refreshPendingCount();
    return { success: true, conflict };
  }

  getMedicineConflict(medCode, branchId = null) {
    if (!medCode) return null;
    return this.unresolvedConflicts.find(c => 
      c.status === 'CONFLICT_UNRESOLVED' &&
      c.medicineCode === medCode &&
      (!branchId || c.branchId === branchId)
    ) || null;
  }

  isMedicineBlocked(medCode, branchId = null) {
    return Boolean(this.getMedicineConflict(medCode, branchId));
  }

  /**
   * Durable outbox: write locally before any network attempt, then remove the
   * exact queued record only after the cloud confirms success.
   */
  async persistThenPush(actionType, payload, pushFn) {
    if (!this.enabled) {
      return { success: true, localOnly: true, queued: false };
    }
    const queueId = await idbEnqueueDelta(actionType, payload);
    if (queueId === null || queueId === undefined) {
      this.lastError = 'Could not persist sync event to the local outbox';
      await this.refreshPendingCount();
      return { success: false, error: this.lastError };
    }
    await this.refreshPendingCount();

    if (this.isOnline) {
      try {
        const pushResult = await pushFn();
        if (pushResult?.success) {
          await idbRemoveDelta(queueId);
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.lastError = null;
          await this.refreshPendingCount();
          return { success: true, synced: true, pushResult };
        }
        if (pushResult?.rlsBlocked) {
          this.lastError = pushResult.error;
          this.syncState = 'RLS_BLOCKED';
        }
      } catch (err) {
        this.lastError = err.message || 'Cloud push failed';
      }
    }

    await this.refreshPendingCount();
    return { success: true, queued: true, queueId };
  }

  /**
   * Queue a sales bill: writes to local IndexedDB and queues sync
   */
  async recordSalesBill(billPayload) {
    const activeBranchId = (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    billPayload.branchId = billPayload.branchId || activeBranchId;

    try {
      await idbSaveBill(billPayload);
    } catch (e) {
      console.warn('Could not save bill to IndexedDB', e);
    }

    return this.persistThenPush('SALES_BILL', billPayload, () => pushSalesBillToSupabase(billPayload));
  }

  /**
   * Queue incremental medicine stock change with durable uniquely identified event
   */
  async recordMedicineDelta(medicineData) {
    if (!medicineData || !medicineData.code) return;
    const activeBranchId = (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    const targetBranch = medicineData.branchId || activeBranchId;
    const eventId = medicineData.eventId || `${targetBranch}_${medicineData.billNo || 'MUT'}_${medicineData.code}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    const stampedMed = {
      ...medicineData,
      branchId: targetBranch,
      eventId
    };

    const result = await this.persistThenPush('MEDICINE_DELTA', stampedMed, () => pushMedicineDeltaToSupabase(stampedMed, targetBranch));
    const conflict = result.pushResult?.conflict || result.pushResult?.data?.conflict || null;
    if (conflict) this.addUnresolvedConflict(conflict);
    return { ...result, eventId, conflict };
  }

  /**
   * Queue a stock transfer: writes to local IndexedDB and queues sync
   */
  async recordStockTransfer(transferPayload) {
    const activeBranchId = (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    transferPayload.branchId = transferPayload.branchId || activeBranchId;

    try {
      await idbSaveStockTransfer(transferPayload);
    } catch (e) {}

    return this.persistThenPush('STOCK_TRANSFER', transferPayload, () => pushStockTransferToSupabase(transferPayload));
  }

  /**
   * Queue a purchase inward: writes to local queue and pushes to Supabase
   */
  async recordPurchaseInward(purchasePayload) {
    const activeBranchId = (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    purchasePayload.branchId = purchasePayload.branchId || activeBranchId;

    return this.persistThenPush('PURCHASE_INWARD', purchasePayload, () => pushPurchaseInwardToSupabase(purchasePayload));
  }

  /**
   * Queue a credit note / sales return
   */
  async recordCreditNote(creditPayload) {
    const activeBranchId = (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    creditPayload.branchId = creditPayload.branchId || activeBranchId;

    return this.persistThenPush('CREDIT_NOTE', creditPayload, () => pushCreditNoteToSupabase(creditPayload));
  }

  /**
   * Queue a staff shift handover record
   */
  async recordShift(shiftPayload) {
    const activeBranchId = (typeof localStorage !== 'undefined' ? localStorage.getItem('beta_pharma_branch_id') : 'MAIN') || 'MAIN';
    shiftPayload.branchId = shiftPayload.branchId || activeBranchId;

    return this.persistThenPush('SHIFT_RECORD', shiftPayload, () => pushShiftRecordToSupabase(shiftPayload));
  }

  /**
   * Flush pending delta queue to Supabase with exponential backoff on failures
   */
  async flushQueue() {
    if (!this.enabled) return { success: false, localOnly: true, error: 'Cloud sync is disabled in this release.' };
    if (this.isSyncing || !this.isOnline) return;
    this.isSyncing = true;
    this.notifySubscribers();

    try {
      const deltas = await idbGetPendingDeltas();
      if (!deltas || deltas.length === 0) {
        this.pendingCount = 0;
        this.isSyncing = false;
        this.syncState = 'SYNCED';
        this.notifySubscribers();
        return;
      }

      let hadFailure = false;

      for (const item of deltas) {
        try {
          let pushRes = null;
          if (item.actionType === 'SALES_BILL') {
            pushRes = await pushSalesBillToSupabase(item.payload);
          } else if (item.actionType === 'CREDIT_NOTE') {
            pushRes = await pushCreditNoteToSupabase(item.payload);
          } else if (item.actionType === 'MEDICINE_DELTA') {
            pushRes = await pushMedicineDeltaToSupabase(item.payload);
            if (pushRes && (pushRes.conflict || pushRes.data?.conflict)) {
              this.addUnresolvedConflict(pushRes.conflict || pushRes.data?.conflict);
            }
          } else if (item.actionType === 'STOCK_TRANSFER') {
            pushRes = await pushStockTransferToSupabase(item.payload);
          } else if (item.actionType === 'PURCHASE_INWARD') {
            pushRes = await pushPurchaseInwardToSupabase(item.payload);
          } else if (item.actionType === 'SHIFT_RECORD') {
            pushRes = await pushShiftRecordToSupabase(item.payload);
          }

          if (pushRes && (pushRes.success || pushRes.data)) {
            await idbRemoveDelta(item.id || item.timestamp);
          } else if (pushRes && pushRes.error && (pushRes.error.includes('duplicate key') || pushRes.code === '23505')) {
            // Already recorded in cloud, safely remove to prevent clogged queue
            await idbRemoveDelta(item.id || item.timestamp);
          } else if (pushRes && pushRes.rlsBlocked) {
            hadFailure = true;
            this.lastError = pushRes.error;
            this.syncState = 'RLS_BLOCKED';
            // Increase backoff to 5 minutes so we don't spam requests when RLS blocked
            this.adjustHeartbeat(300000);
            break;
          } else if (pushRes && pushRes.offline) {
            hadFailure = true;
            this.syncState = 'OFFLINE';
            break;
          } else {
            hadFailure = true;
            this.lastError = pushRes?.error || 'Sync push failed';
            break;
          }
        } catch (err) {
          console.warn('Error syncing delta item', item, err);
          hadFailure = true;
          this.lastError = err.message;
          break;
        }
      }

      if (!hadFailure) {
        this.lastSyncTime = new Date().toLocaleTimeString();
        this.lastError = null;
        this.syncState = 'SYNCED';
        this.backoffMs = 30000; // Reset backoff to 30s
      } else {
        // Double the backoff on failure (up to 5 min)
        this.adjustHeartbeat(this.backoffMs * 2);
      }
    } catch (err) {
      console.warn('Error during flushQueue', err);
      this.lastError = err.message;
    } finally {
      this.isSyncing = false;
      await this.refreshPendingCount();
    }
  }

  /**
   * Manual 1-click sync trigger from UI button
   */
  async triggerManualSync() {
    if (!this.enabled) return this.getStatus();
    this.backoffMs = 30000;
    await this.flushQueue();
    return this.getStatus();
  }
}

// Global Singleton Instance
export const syncEngine = new DeltaSyncEngine();
