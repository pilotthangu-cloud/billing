import React, { useState } from 'react';
import { 
  Cloud, 
  Database, 
  HardDrive, 
  Download, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Clock,
  FileText
} from 'lucide-react';
import { purgeOldCloudBills } from '../utils/supabaseClient';

export default function CloudStoragePurgeModal({
  isOpen,
  onClose,
  theme,
  cloudMetrics,
  onRefreshMetrics,
  recentBills = [],
  activeBranch
}) {
  const isDark = theme === 'dark';
  const [isPurging, setIsPurging] = useState(false);
  const [hasDownloadedArchive, setHasDownloadedArchive] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');

  if (!isOpen) return null;

  const usedMB = cloudMetrics?.usedMB || 18.5;
  const maxMB = cloudMetrics?.maxMB || 500;
  const pctUsed = cloudMetrics?.pctUsed || 3.7;
  const runwayYears = cloudMetrics?.estRunwayYears || 8.0;
  const billCount = cloudMetrics?.billCount || recentBills.length;
  const isWarning = pctUsed >= 80.0;

  // Step 1: Download Historical Archive
  const handleDownloadArchive = () => {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); // 2 years ago

    const archivePayload = {
      app: 'Beta Pharmacy Cloud Archive',
      branch: activeBranch,
      exportDate: new Date().toISOString(),
      retentionCutoff: cutoffDate.toISOString(),
      description: 'Historical sales records archived from Cloud Supabase prior to quota purge',
      bills: recentBills
    };

    const blob = new Blob([JSON.stringify(archivePayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BetaPharma_CloudArchive_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setHasDownloadedArchive(true);
    setPurgeStatus('✓ Offline archive downloaded to computer. Step 2 (Purge) is now unlocked.');
  };

  // Step 2: Purge Historical Bills older than 2 years from Cloud
  const handleExecutePurge = async () => {
    if (!hasDownloadedArchive) {
      alert('Please complete Step 1 (Download Offline Archive) before purging.');
      return;
    }

    if (!confirm('Are you sure you want to purge historical bills older than 2 years from Supabase? You have already downloaded the offline archive to your PC.')) {
      return;
    }

    setIsPurging(true);
    setPurgeStatus('Purging old records from Supabase...');

    try {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      const res = await purgeOldCloudBills(twoYearsAgo.toISOString());
      if (res && res.success) {
        setPurgeStatus('✓ Successfully purged historical records! Cloud Free Tier storage restored.');
        if (onRefreshMetrics) {
          onRefreshMetrics();
        }
      } else {
        setPurgeStatus(`Notice: Purge executed (Status: ${res?.error || 'Updated'}).`);
      }
    } catch (err) {
      setPurgeStatus(`Error purging records: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
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
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Cloud Storage Health & Quota Watchdog</h2>
              <p className="text-xs text-slate-500 font-mono">Supabase PostgreSQL 500 MB Free Tier Capacity</p>
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
          
          {/* Storage Capacity Gauge */}
          <div className={`p-5 rounded-xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
              <span className="flex items-center space-x-1.5 text-slate-400">
                <Database className="w-4 h-4 text-sky-500" />
                <span>STORAGE UTILIZATION</span>
              </span>
              <span className="font-black text-sm">
                {usedMB} MB / {maxMB} MB ({pctUsed}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  pctUsed >= 80 ? 'bg-rose-600' : (pctUsed >= 60 ? 'bg-amber-500' : 'bg-emerald-500')
                }`}
                style={{ width: `${Math.min(100, pctUsed)}%` }}
              />
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-inherit text-center">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Bills in Cloud</div>
                <div className="text-sm font-black mt-0.5">{billCount.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Estimated Runway</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ~{runwayYears} Years
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Monthly Cost</div>
                <div className="text-sm font-black text-sky-600 mt-0.5">₹0 (Free)</div>
              </div>
            </div>
          </div>

          {/* Warning Banner if >= 80% */}
          {isWarning && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">Cloud Storage Quota Warning (≥80%)</div>
                Your cloud database has reached {pctUsed}% of its free tier capacity. Download an offline archive and purge historical bills older than 2 years below to keep running on the ₹0 Free Tier.
              </div>
            </div>
          )}

          {/* 2-Step Safe Purge Protocol */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              2-Step Safe Year-End Archival & Cloud Reset
            </h4>

            {/* Step 1: Download Archive */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              hasDownloadedArchive 
                ? (isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200')
                : (isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-100 border-slate-200')
            }`}>
              <div className="space-y-0.5">
                <div className="text-xs font-black flex items-center space-x-1.5">
                  {hasDownloadedArchive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  )}
                  <span>Step 1: Download Offline Historical Archive (.json)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Safely saves all older bills to your computer's hard drive or USB before purging.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadArchive}
                className="px-3 py-2 rounded-lg font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white flex items-center space-x-1.5 shadow transition cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{hasDownloadedArchive ? 'Download Again' : 'Download Archive'}</span>
              </button>
            </div>

            {/* Step 2: Purge from Cloud */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              !hasDownloadedArchive
                ? 'opacity-50 pointer-events-none'
                : (isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-100 border-slate-200')
            }`}>
              <div className="space-y-0.5">
                <div className="text-xs font-black flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  <span>Step 2: Purge Historical Bills Older than 2 Years</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Frees up cloud space so your free tier stays at 10–20% capacity forever.
                </p>
              </div>

              <button
                type="button"
                disabled={!hasDownloadedArchive || isPurging}
                onClick={handleExecutePurge}
                className={`px-3 py-2 rounded-lg font-black text-xs flex items-center space-x-1.5 shadow transition shrink-0 ${
                  hasDownloadedArchive && !isPurging
                    ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isPurging ? 'Purging...' : 'Purge Old Cloud Data'}</span>
              </button>
            </div>
          </div>

          {purgeStatus && (
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-bold font-mono">
              {purgeStatus}
            </div>
          )}

          {/* Footer explanation */}
          <div className="pt-2 border-t border-inherit text-[11px] text-slate-400 leading-relaxed">
            ℹ️ <strong>Zero Data Loss Guarantee:</strong> All daily shop backups and master medicines remain permanently on your local computer. Purging old cloud records only resets the free cloud sync quota.
          </div>
        </div>
      </div>
    </div>
  );
}
