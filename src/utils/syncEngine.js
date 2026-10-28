/**
 * Background Delta Sync Engine for Supabase Cloud Sync
 * Automatically queues offline mutations in IndexedDB and flushes them
 * in the background when connectivity is active.
 */

import { 
  pushSalesBillToSupabase, 
  pushStockTransferToSupabase,
  pushPurchaseInwardToSupabase,
  pushCreditNoteToSupabase,
  pushShiftRecordToSupabase 
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
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.subscribers = new Set();
    this.pendingCount = 0;
    this.lastSyncTime = null;
    this.lastError = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      
      // Initial check & start periodic heartbeat flush
      this.refreshPendingCount();
      this.startHeartbeat();
    }
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    this.notifySubscribers();
    if (online) {
      this.flushQueue();
    }
  }

  startHeartbeat() {
    // Check and flush every 30 seconds if online
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.flushQueue();
      }
    }, 30000);
  }

  async refreshPendingCount() {
    try {
      const deltas = await idbGetPendingDeltas();
      this.pendingCount = Array.isArray(deltas) ? deltas.length : 0;
      this.notifySubscribers();
    } catch (e) {
      this.pendingCount = 0;
    }
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
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError
    };
  }

  /**
   * Queue a sales bill: writes to local IndexedDB and queues sync
   */
  async recordSalesBill(billPayload) {
    // 1. Save to local IndexedDB for instant persistence
    try {
      await idbSaveBill(billPayload);
    } catch (e) {
      console.warn('Could not save bill to IndexedDB', e);
    }

    // 2. If online, attempt direct push
    if (this.isOnline) {
      try {
        const res = await pushSalesBillToSupabase(billPayload);
        if (res && res.success) {
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.notifySubscribers();
          return { success: true, synced: true };
        }
      } catch (err) {
        console.warn('Direct push failed, queuing in delta store:', err);
      }
    }

    // 3. Queue delta for background sync
    await idbEnqueueDelta('SALES_BILL', billPayload);
    await this.refreshPendingCount();
    return { success: true, queued: true };
  }

  /**
   * Queue a stock transfer: writes to local IndexedDB and queues sync
   */
  async recordStockTransfer(transferPayload) {
    try {
      await idbSaveStockTransfer(transferPayload);
    } catch (e) {}

    if (this.isOnline) {
      try {
        const res = await pushStockTransferToSupabase(transferPayload);
        if (res && res.success) {
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.notifySubscribers();
          return { success: true, synced: true };
        }
      } catch (err) {}
    }

    await idbEnqueueDelta('STOCK_TRANSFER', transferPayload);
    await this.refreshPendingCount();
    return { success: true, queued: true };
  }

  /**
   * Queue a purchase inward: writes to local queue and pushes to Supabase
   */
  async recordPurchaseInward(purchasePayload) {
    if (this.isOnline) {
      try {
        const res = await pushPurchaseInwardToSupabase(purchasePayload);
        if (res && res.success) {
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.notifySubscribers();
          return { success: true, synced: true };
        }
      } catch (err) {}
    }

    await idbEnqueueDelta('PURCHASE_INWARD', purchasePayload);
    await this.refreshPendingCount();
    return { success: true, queued: true };
  }

  /**
   * Queue a credit note / sales return
   */
  async recordCreditNote(creditPayload) {
    if (this.isOnline) {
      try {
        const res = await pushCreditNoteToSupabase(creditPayload);
        if (res && res.success) {
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.notifySubscribers();
          return { success: true, synced: true };
        }
      } catch (err) {}
    }

    await idbEnqueueDelta('CREDIT_NOTE', creditPayload);
    await this.refreshPendingCount();
    return { success: true, queued: true };
  }

  /**
   * Queue a staff shift handover record
   */
  async recordShift(shiftPayload) {
    if (this.isOnline) {
      try {
        const res = await pushShiftRecordToSupabase(shiftPayload);
        if (res && res.success) {
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.notifySubscribers();
          return { success: true, synced: true };
        }
      } catch (err) {}
    }

    await idbEnqueueDelta('SHIFT_RECORD', shiftPayload);
    await this.refreshPendingCount();
    return { success: true, queued: true };
  }

  /**
   * Flush pending delta queue to Supabase
   */
  async flushQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notifySubscribers();

    try {
      const deltas = await idbGetPendingDeltas();
      if (!deltas || deltas.length === 0) {
        this.pendingCount = 0;
        this.isSyncing = false;
        this.notifySubscribers();
        return;
      }

      for (const item of deltas) {
        try {
          let pushRes = null;
          if (item.actionType === 'SALES_BILL') {
            pushRes = await pushSalesBillToSupabase(item.payload);
          } else if (item.actionType === 'STOCK_TRANSFER') {
            pushRes = await pushStockTransferToSupabase(item.payload);
          } else if (item.actionType === 'PURCHASE_INWARD') {
            pushRes = await pushPurchaseInwardToSupabase(item.payload);
          } else if (item.actionType === 'CREDIT_NOTE') {
            pushRes = await pushCreditNoteToSupabase(item.payload);
          } else if (item.actionType === 'SHIFT_RECORD') {
            pushRes = await pushShiftRecordToSupabase(item.payload);
          }

          if (pushRes && (pushRes.success || pushRes.data)) {
            await idbRemoveDelta(item.id || item.timestamp);
          } else if (pushRes && pushRes.offline) {
            // Still offline or disconnected, break loop
            break;
          }
        } catch (err) {
          console.warn('Error syncing delta item', item, err);
        }
      }

      this.lastSyncTime = new Date().toLocaleTimeString();
      this.lastError = null;
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
    await this.flushQueue();
    return this.getStatus();
  }
}

// Global Singleton Instance
export const syncEngine = new DeltaSyncEngine();
