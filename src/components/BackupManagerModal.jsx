import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  ShieldCheck, 
  FileText,
  Calendar,
  Usb,
  Cloud,
  RefreshCw,
  Database
} from 'lucide-react';
import { 
  downloadDailyBackupFile, 
  downloadTwoYearArchive, 
  getLocalBackupStats,
  triggerVerifiedCloudBackup,
  restoreFromVerifiedCloudBackup,
  restoreFromLocalBackupJson
} from '../utils/backupEngine';
import { getCloudStorageEstimate } from '../utils/supabaseClient';

export default function BackupManagerModal({
  isOpen,
  onClose,
  theme,
  medicines = [],
  recentBills = [],
  activeBranch,
  onRestoreBackup
}) {
  const isDark = theme === 'dark';
  const [backupStats, setBackupStats] = useState({ totalBackups: 0, retentionDays: 730 });
  const [restoreStatus, setRestoreStatus] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCloudBackingUp, setIsCloudBackingUp] = useState(false);
  const [cloudBackupResult, setCloudBackupResult] = useState(null);
  const [storageEstimate, setStorageEstimate] = useState(null);

  useEffect(() => {
    if (isOpen) {
      getLocalBackupStats().then(stats => setBackupStats(stats));
      getCloudStorageEstimate().then(est => setStorageEstimate(est));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerCloudBackup = async () => {
    setIsCloudBackingUp(true);
    setRestoreStatus('');
    try {
      const res = await triggerVerifiedCloudBackup(medicines, recentBills, activeBranch);
      setCloudBackupResult(res);
      if (res.success && res.verified) {
        setRestoreStatus(`✓ Cloud Backup Verified! Checksum: ${res.checksum} (${res.recordCounts?.medicines || 0} meds, ${res.recordCounts?.bills || 0} bills)`);
      } else {
        setRestoreStatus(`Notice: ${res.error || 'Backup could not be verified in Supabase.'}`);
      }
    } catch (err) {
      setRestoreStatus(`Cloud backup error: ${err.message}`);
    } finally {
      setIsCloudBackingUp(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!confirm(`Restore latest verified backup from Supabase for branch "${activeBranch?.name || 'Main'}"?\n\nThis will load the authoritative medicines, stock, and bills from the cloud into this browser profile.`)) {
      return;
    }

    setIsRestoring(true);
    setRestoreStatus('Connecting to Supabase to fetch verified backup...');

    try {
      let res = await restoreFromVerifiedCloudBackup(activeBranch?.id || 'MAIN');
      if (!res.success && res.isRegression) {
        if (confirm(`${res.error}\n\nDo you want to FORCE overwrite your newer data with this older cloud backup?`)) {
          res = await restoreFromVerifiedCloudBackup(activeBranch?.id || 'MAIN', { force: true });
        } else {
          setRestoreStatus('Restore cancelled by user.');
          setIsRestoring(false);
          return;
        }
      }

      if (res.success) {
        if (onRestoreBackup) {
          onRestoreBackup({
            restoredMeds: res.meds,
            restoredBills: res.bills,
            restoredOverrides: res.overrides,
            restoredBranch: res.branch,
            restoredStoreConfig: res.storeConfig
          });
        }
        setRestoreStatus(res.message);
      } else {
        setRestoreStatus(`Cloud Restore Error: ${res.error}`);
      }
    } catch (err) {
      setRestoreStatus(`Restore Exception: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreStatus(`Reading ${file.name}...`);

    try {
      const text = await file.text();
      let res = await restoreFromLocalBackupJson(text);
      if (!res.success && res.isRegression) {
        if (confirm(`${res.error}\n\nDo you want to FORCE overwrite your newer local data with this older backup?`)) {
          res = await restoreFromLocalBackupJson(text, { force: true });
        } else {
          setRestoreStatus('Restore cancelled by user.');
          setIsRestoring(false);
          return;
        }
      }

      if (res.success) {
        if (onRestoreBackup) {
          onRestoreBackup({
            restoredMeds: res.meds,
            restoredBills: res.bills,
            restoredOverrides: res.overrides,
            restoredBranch: res.branch,
            restoredStoreConfig: res.storeConfig
          });
        }
        setRestoreStatus(res.message);
      } else {
        setRestoreStatus(`Error: ${res.error}`);
      }
    } catch (err) {
      setRestoreStatus(`Error restoring file: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans animate-fade-in select-text">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Pharmacy Backup & Disaster Recovery Hub</h2>
              <p className="text-xs text-slate-500 font-mono">Verified Cloud Snapshots (Supabase Free Tier) & 730-Day Hard Drive Archives</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-400' : 'border-slate-300 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* Status & Free-Tier Capacity Watchdog */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  {backupStats.totalBackups > 0 ? 'LOCAL BACKUP: VERIFIED PRESENT' : 'LOCAL BACKUP: NOT YET CONFIRMED'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {backupStats.totalBackups > 0
                    ? <span><strong>{backupStats.totalBackups}</strong> committed daily snapshot(s); retention target <strong>730 days</strong>. </span>
                    : <span>No committed local snapshot is currently visible. Start a shift or export a backup before relying on recovery. </span>}
                  {storageEstimate && (
                    <span> Cloud Storage: <strong>{storageEstimate.usedMB} MB / {storageEstimate.maxMB} MB ({storageEstimate.pctUsed}% used)</strong>.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                100% Free Tier Compliant
              </span>
            </div>
          </div>

          {/* Section 1: Supabase Verified Cloud Backup & Restore */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sky-600">
                <Cloud className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">Supabase Cloud Sync & Backup</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Double-Blind Readback Verification
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Back up the complete live pharmacy state (all medicines, batches, stock, and recent bills) to Supabase. Every backup is verified by a read-back round-trip check before confirming.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleTriggerCloudBackup}
                disabled={isCloudBackingUp}
                className="py-2.5 px-3 rounded-lg font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudBackingUp ? 'animate-spin' : ''}`} />
                <span>{isCloudBackingUp ? 'Verifying Cloud Backup...' : 'Trigger Verified Cloud Backup'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreFromCloud}
                disabled={isRestoring}
                className="py-2.5 px-3 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white shadow transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Restore from Cloud Backup</span>
              </button>
            </div>
          </div>

          {/* Section 2: Local Hardware Backups (USB / Hard Drive) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Download Today's Backup */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center space-x-2 text-emerald-600 mb-1.5">
                  <Download className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">Local PC Snapshot</span>
                </div>
                <h5 className="font-extrabold text-sm mb-1">Save Local JSON File</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Download a complete standalone backup file directly to your PC's Downloads or Documents folder. Completely independent of internet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => downloadDailyBackupFile(medicines, recentBills, activeBranch)}
                className="mt-4 w-full py-2 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Local Backup (.json)</span>
              </button>
            </div>

            {/* 2. Export 2-Year USB Archive */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center space-x-2 text-indigo-600 mb-1.5">
                  <Usb className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">Tax & Audit Archive</span>
                </div>
                <h5 className="font-extrabold text-sm mb-1">Export 2-Year Archive</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export 24-month sales registers, inward purchases, and cashier reconciliation records for drug inspector audits or USB pen drive storage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => downloadTwoYearArchive(recentBills, activeBranch)}
                className="mt-4 w-full py-2 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Export 2-Year USB Archive</span>
              </button>
            </div>
          </div>

          {/* Section 3: Restore from Local File */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-amber-600">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-black uppercase">Local File Restoration</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Restoring onto a new computer or clean browser profile? Select any saved <code>BetaPharma_Backup_*.json</code> file to restore all medicines, batches, and bills instantly.
            </p>

            <label className="w-full py-2.5 px-4 rounded-lg font-bold text-xs border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-sky-500 text-center flex items-center justify-center space-x-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-slate-400" />
              <span>{isRestoring ? 'Restoring data...' : 'Select Backup File (.json) to Restore'}</span>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleFileUpload} 
                disabled={isRestoring}
              />
            </label>
          </div>

          {restoreStatus && (
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-bold font-mono">
              {restoreStatus}
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-inherit text-[11px] text-slate-400 leading-relaxed">
            🛡️ <strong>Single-Profile Boundary Notice:</strong> Browser storage (IndexedDB) is isolated to this specific user profile. For daily operations, always launch the POS using the dedicated desktop shortcut.
          </div>
        </div>
      </div>
    </div>
  );
}
