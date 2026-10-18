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
  Usb
} from 'lucide-react';
import { 
  downloadDailyBackupFile, 
  downloadTwoYearArchive, 
  getLocalBackupStats 
} from '../utils/backupEngine';

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

  useEffect(() => {
    if (isOpen) {
      getLocalBackupStats().then(stats => setBackupStats(stats));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreStatus(`Reading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.data && !parsed.medicines) {
          throw new Error('Invalid Beta Pharmacy backup file structure.');
        }

        const restoredMeds = parsed.data?.medicines || parsed.medicines || [];
        const restoredBills = parsed.data?.recentBills || parsed.recentBills || [];
        const restoredOverrides = parsed.data?.overrides || parsed.overrides || {};

        if (confirm(`Backup verified!\n• Medicines: ${restoredMeds.length}\n• Recent Bills: ${restoredBills.length}\n\nRestore this data into active shop inventory now?`)) {
          if (onRestoreBackup) {
            onRestoreBackup({ restoredMeds, restoredBills, restoredOverrides });
          }
          setRestoreStatus(`✓ Successfully restored ${restoredMeds.length} medicines and ${restoredBills.length} bills!`);
        } else {
          setRestoreStatus('Restore cancelled.');
        }
      } catch (err) {
        setRestoreStatus(`Error restoring file: ${err.message}`);
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans animate-fade-in select-text">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">2+ Years Local Disk Backup Hub</h2>
              <p className="text-xs text-slate-500 font-mono">Automated 730-Day Hard Drive Snapshots & USB Archival</p>
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
        <div className="p-6 space-y-5">
          
          {/* Retention Health Status Card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  LOCAL DISK RETENTION POLICY: ACTIVE
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Daily database snapshots are retained locally on this computer for <strong>730+ Days (2+ Years)</strong> before pruning.
                </p>
              </div>
            </div>
          </div>

          {/* Export Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* 1. Download Today's Backup */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex items-center space-x-2 text-sky-600 mb-1.5">
                  <Download className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">Daily Snapshot</span>
                </div>
                <h5 className="font-extrabold text-sm mb-1">Download Today's Backup</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Save a complete standalone JSON backup of today's catalog, stock, and bills to your Downloads or Documents folder.
                </p>
              </div>

              <button
                type="button"
                onClick={() => downloadDailyBackupFile(medicines, recentBills, activeBranch)}
                className="mt-4 w-full py-2 rounded-lg font-black text-xs bg-sky-600 hover:bg-sky-500 text-white shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
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
                  <span className="text-xs font-black uppercase">Tax & USB Archive</span>
                </div>
                <h5 className="font-extrabold text-sm mb-1">Export 2-Year Fiscal Archive</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Export complete 24-month sales registers, inward bills, and cashier reconciliation records for audits or external USB pen drives.
                </p>
              </div>

              <button
                type="button"
                onClick={() => downloadTwoYearArchive(recentBills, activeBranch)}
                className="mt-4 w-full py-2 rounded-lg font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Export 2-Year Archive</span>
              </button>
            </div>
          </div>

          {/* 3. Restore from Backup File */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-amber-600">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-black uppercase">Disaster Recovery</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Need to restore on a new computer? Select any previous <code>BetaPharma_Backup_*.json</code> file to restore all medicines, batches, and bills instantly.
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
            🛡️ <strong>Independent of Cloud:</strong> These local backups are stored completely on your PC's physical disk and can be restored anytime without internet access.
          </div>
        </div>
      </div>
    </div>
  );
}
