/**
 * 2+ Years Local Disk Backup Engine for Beta Pharmacy POS
 * Retains daily database snapshots in IndexedDB for 730+ days (2+ years)
 * and provides 1-click JSON backup export and USB fiscal archive exports.
 */

import { openPharmaDB } from './indexedDb';

const BACKUP_RETENTION_DAYS = 730; // 2+ years of daily backups

/**
 * Save daily backup snapshot into IndexedDB
 */
export async function saveDailyBackupSnapshot(medicines, recentBills, activeBranch, activeShift) {
  try {
    const db = await openPharmaDB();
    if (!db) return null;

    // Check if backups store exists
    if (!db.objectStoreNames.contains('backups')) {
      // Handled during DB upgrade or fallback
      return null;
    }

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
    const staffList = JSON.parse(localStorage.getItem('beta_pharma_staff_list') || '[]');

    const backupPayload = {
      date: todayStr,
      timestamp: Date.now(),
      createdTime: new Date().toLocaleTimeString(),
      branchId: activeBranch?.id || 'MAIN',
      branchName: activeBranch?.name || 'Beta Pharmacy',
      operator: activeShift?.staffName || 'Counter Staff',
      medicinesCount: (medicines || []).length,
      billsCount: (recentBills || []).length,
      snapshot: {
        medicines: medicines || [], // Full inventory — no truncation
        overrides,
        recentBills,
        staffList
      }
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
 * Export 1-Click Complete Daily Backup (.json file download)
 */
export function downloadDailyBackupFile(medicines, recentBills, activeBranch) {
  const dateStr = new Date().toISOString().split('T')[0];
  const overrides = JSON.parse(localStorage.getItem('beta_pharma_med_overrides') || '{}');
  const creditNotes = JSON.parse(localStorage.getItem('beta_pharma_credit_notes') || '[]');
  const dueBills = JSON.parse(localStorage.getItem('beta_pharma_due_bills') || '[]');
  const staffList = JSON.parse(localStorage.getItem('beta_pharma_staff_list') || '[]');

  const fullExport = {
    app: 'Beta Pharmacy Desktop POS',
    schemaVersion: '2.0',
    exportDate: dateStr,
    exportTimestamp: Date.now(),
    branch: activeBranch,
    counts: {
      medicines: medicines.length,
      recentBills: recentBills.length,
      creditNotes: creditNotes.length,
      dueBills: dueBills.length
    },
    data: {
      medicines,
      overrides,
      recentBills,
      creditNotes,
      dueBills,
      staffList
    }
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
