import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Database, 
  Download, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  FileSpreadsheet, 
  FolderOpen, 
  Monitor, 
  WifiOff, 
  Layers, 
  Check, 
  HelpCircle,
  AlertCircle,
  FileText,
  Search,
  Receipt,
  Users,
  ShieldCheck,
  Zap,
  ArrowRightCircle,
  Lock,
  X,
  Cloud,
  CloudDownload,
  FileUp,
  RefreshCw
} from 'lucide-react';
import { parseDbfBuffer, parseCsvText, normalizeLegacyMedicineRecords, processDbfFolderFiles, extractFilesFromDrop } from '../utils/dbfReader';
import { fetchLatestVerifiedCloudBackup } from '../utils/supabaseClient';
import { restoreFromVerifiedCloudBackup, restoreFromLocalBackupJson } from '../utils/backupEngine';

export default function FirstTimeSetupWizardModal({
  isOpen,
  onClose,
  theme,
  availableBranches,
  onCompleteSetup,
  installPrompt,
  isAppInstalled
}) {
  const isDark = theme === 'dark';

  // Step state: 
  // 1 = Branch & Counter
  // 2 = Catalog Choice (Option A vs Option B)
  // 3 = Step-by-Step Feature Walkthrough
  // 4 = 1-Click Desktop App Install & Launch
  const [step, setStep] = useState(1);

  // Step 1: Branch & Counter Settings
  const [selectedBranchId, setSelectedBranchId] = useState('MAIN');
  const [customBranchName, setCustomBranchName] = useState('');
  const [counterName, setCounterName] = useState('Counter 01');
  const [cashierName, setCashierName] = useState('');

  // Step 2: Catalog Choice - Defaulting to 'import' if user chooses Option B, or 'master'
  const [catalogChoice, setCatalogChoice] = useState('import'); // 'master' | 'import' (Option B)
  const [importedFile, setImportedFile] = useState(null);
  const [importedMeds, setImportedMeds] = useState([]);
  const [importStatus, setImportStatus] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [restoredMeds, setRestoredMeds] = useState([]);
  const [restoredBills, setRestoredBills] = useState([]);
  const [cloudBackupMeta, setCloudBackupMeta] = useState(null);
  const [isFetchingCloudBackup, setIsFetchingCloudBackup] = useState(false);
  const [cloudFetchError, setCloudFetchError] = useState(null);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('');

  // Step 3: Feature Tour Active Tab
  const [activeFeatureTab, setActiveFeatureTab] = useState('billing');

  // Step 4: Installation status
  const [installSuccess, setInstallSuccess] = useState(isAppInstalled);

  useEffect(() => {
    if (isAppInstalled) {
      setInstallSuccess(true);
    }
  }, [isAppInstalled]);

  if (!isOpen) return null;

  // Process file list from input or drop
  const handleProcessFolderFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsParsing(true);
    setImportStatus(`Analyzing ${files.length} files...`);

    try {
      // Check if it's a single CSV file
      if (files.length === 1 && (files[0].name.toUpperCase().endsWith('.CSV') || files[0].name.toUpperCase().endsWith('.TXT'))) {
        const text = await files[0].text();
        const records = parseCsvText(text);
        const normalized = normalizeLegacyMedicineRecords(records);
        setImportedMeds(normalized);
        setImportSummary({
          totalCount: normalized.length,
          itemFile: files[0].name,
          stockFile: 'Direct CSV',
          companyFile: 'Embedded'
        });
        setImportStatus(`✓ Extracted ${normalized.length.toLocaleString()} medicines from CSV!`);
        return;
      }

      // Process as DBF folder (ITEMFILE + COMPMAST + STKFILE)
      const res = await processDbfFolderFiles(files, setImportStatus);
      setImportedMeds(res.medicines);
      setImportSummary(res);
      setImportStatus(`✓ Previewed ${res.totalCount.toLocaleString()} medicines. Stock source: ${res.stockSource}. Total units: ${res.totalStock.toLocaleString()}. Review flags: ${res.issueCount.toLocaleString()}.`);
    } catch (err) {
      console.error('Wizard import error:', err);
      setImportStatus(`Error: ${err.message || 'Invalid files'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFolderSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    await handleProcessFolderFiles(files);
  };

  const handleDropFolder = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      const files = await extractFilesFromDrop(e.dataTransfer);
      await handleProcessFolderFiles(files);
    } catch (err) {
      setImportStatus(`Drop error: ${err.message}`);
    }
  };

  const handleFetchCloudBackup = async () => {
    setIsFetchingCloudBackup(true);
    setCloudFetchError(null);
    setCloudBackupMeta(null);
    try {
      const res = await fetchLatestVerifiedCloudBackup(selectedBranchId);
      if (res.success && res.backup) {
        setCloudBackupMeta(res.backup);
      } else {
        setCloudFetchError(res.error || 'No verified backups found in Supabase for this branch.');
      }
    } catch (err) {
      setCloudFetchError(err.message || 'Error connecting to Supabase');
    } finally {
      setIsFetchingCloudBackup(false);
    }
  };

  const handleRestoreCloudBackup = async () => {
    setIsRestoringData(true);
    setRestoreSuccessMsg('');
    setCloudFetchError(null);
    try {
      let res = await restoreFromVerifiedCloudBackup(selectedBranchId);
      if (!res.success && res.isRegression) {
        if (confirm(`${res.error}\n\nDo you want to FORCE overwrite your local data with this cloud backup?`)) {
          res = await restoreFromVerifiedCloudBackup(selectedBranchId, { force: true });
        } else {
          setIsRestoringData(false);
          return;
        }
      }

      if (res.success) {
        setRestoredMeds(res.meds || []);
        setRestoredBills(res.bills || []);
        setRestoreSuccessMsg(res.message);
      } else {
        setCloudFetchError(res.error || 'Cloud restore failed.');
      }
    } catch (err) {
      setCloudFetchError(err.message || 'Restore exception');
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleLocalBackupSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoringData(true);
    setRestoreSuccessMsg('');
    try {
      const text = await file.text();
      let res = await restoreFromLocalBackupJson(text);
      if (!res.success && res.isRegression) {
        if (confirm(`${res.error}\n\nDo you want to FORCE overwrite local data with this older backup?`)) {
          res = await restoreFromLocalBackupJson(text, { force: true });
        } else {
          setIsRestoringData(false);
          return;
        }
      }

      if (res.success) {
        setRestoredMeds(res.meds || []);
        setRestoredBills(res.bills || []);
        setRestoreSuccessMsg(res.message);
      } else {
        alert(`Backup validation failed: ${res.error}`);
      }
    } catch (err) {
      alert(`Failed to read backup file: ${err.message}`);
    } finally {
      setIsRestoringData(false);
    }
  };

  // Trigger PWA Desktop App Installation
  const handleTriggerInstall = async () => {
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallSuccess(true);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else {
      alert("To install as a Desktop App on Windows:\n1. Click the 'Install' icon (⤓) in the right side of Chrome/Edge address bar.\n2. Or click Browser Menu (⋮) -> 'Save and share' -> 'Install Beta Pharmacy'.");
    }
  };

  // Finalize Setup
  const handleFinish = async () => {
    let finalBranch = availableBranches.find(b => b.id === selectedBranchId);
    if (selectedBranchId === 'CUSTOM' && customBranchName.trim()) {
      finalBranch = {
        id: 'CUSTOM',
        name: customBranchName.trim(),
        location: 'Branch Counter',
        short: customBranchName.trim().slice(0, 15),
        prefix: 'SHP',
        stockKey: 'stock_shop1'
      };
    }

    const result = await onCompleteSetup({
      branch: finalBranch || availableBranches[0],
      counter: counterName.trim() || 'Counter 01',
      cashier: cashierName.trim() || 'Counter Staff',
      catalogType: catalogChoice,
      importedMeds: catalogChoice === 'import' ? importedMeds : [],
      restoredMeds: (catalogChoice === 'cloud' || catalogChoice === 'local_json') ? restoredMeds : null,
      restoredBills: (catalogChoice === 'cloud' || catalogChoice === 'local_json') ? restoredBills : null
    });

    if (result?.success === false) {
      setImportStatus(`Setup was not completed: ${result.error || 'The local database write failed.'}`);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-lg shadow-md">
              β
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Beta Pharmacy Terminal Onboarding</h2>
              <p className="text-xs text-slate-500 font-mono">First-Time Setup, Feature Walkthrough & Desktop Installation</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 4-Step Breadcrumbs */}
            <div className="flex items-center space-x-1.5 text-xs font-mono">
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                step === 1 ? 'bg-sky-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
              }`}>1. Shop</span>
              <span className="text-slate-400">➔</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                step === 2 ? 'bg-sky-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
              }`}>2. Option B</span>
              <span className="text-slate-400">➔</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                step === 3 ? 'bg-sky-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
              }`}>3. Features</span>
              <span className="text-slate-400">➔</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                step === 4 ? 'bg-sky-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
              }`}>4. Install</span>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'border-slate-300 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Close Onboarding"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================= STEP 1: BRANCH & COUNTER ================= */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2 text-sky-600">
                  <Building2 className="w-5 h-5" />
                  <span>Step 1: Identify This Shop Branch & Billing Counter</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Different branches keep their own separate stock and inventory. Which shop machine is this?
                </p>
              </div>

              {/* Branch Selection Cards: Beta Pharmacy & Beta Polyclinic Pharmacy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableBranches.map((b) => {
                  const isSelected = selectedBranchId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500/10 shadow-sm'
                          : (isDark ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50')
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-extrabold text-sm">{b.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-sky-500 shrink-0" />}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{b.location}</div>
                      <div className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded self-start bg-sky-100 text-sky-800 font-bold">
                        Tag: {b.stockKey}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Counter & Staff Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Billing Counter ID</label>
                  <input
                    type="text"
                    value={counterName}
                    onChange={(e) => setCounterName(e.target.value)}
                    placeholder="e.g. Counter 01, Main Counter"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[11px] text-slate-500">Separates physical cash drawers for shift reconciliation.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Primary Cashier / Operator</label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    placeholder="Enter primary cashier / pharmacist name"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[11px] text-slate-500">Staff can change or hand over shifts anytime at the top bar.</span>
                </div>
              </div>

              {/* Single-Profile Storage Boundary Info */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 ${
                isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <div className="font-bold">Important Data Boundary: Single-Profile Browser Storage</div>
                  <div>Beta Pharmacy POS stores all counter bills, daily stock, and inventory inside this computer profile's private IndexedDB sandbox.</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-zinc-400">
                    <li><strong>Dedicated Terminal:</strong> Always launch the application using the same browser profile or Desktop App shortcut (PWA). Opening in an Incognito window or different browser profile will show a blank terminal.</li>
                    <li><strong>Terminal Migration:</strong> To move your pharmacy setup to a new PC or counter, use the Backup & Restore Hub (F8 or Cloud Backup).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CATALOG CHOICE & OPTION B IMPORT ================= */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2 text-purple-600">
                  <Database className="w-5 h-5" />
                  <span>Step 2: Choose Medicine Catalog & Stock Source</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Would you like to import this shop's existing database (Option B) or use the master Kerala catalog?
                </p>
              </div>

              {/* Two Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Option B: Import Old Shop DB (Highlighted) */}
                <div
                  onClick={() => setCatalogChoice('import')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    catalogChoice === 'import'
                      ? 'border-purple-500 bg-purple-500/10 shadow-md ring-1 ring-purple-500'
                      : (isDark ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50')
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-900 uppercase tracking-wider">
                        Option B (Your Preference)
                      </span>
                      {catalogChoice === 'import' && <CheckCircle className="w-5 h-5 text-purple-500" />}
                    </div>
                    <h4 className="font-bold text-base mb-1">Import Existing Shop Database</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Migrate your shop's specific existing medicines, custom codes, rack locations, and stock numbers from your old DOS/Clipper software.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/40 text-[11px] font-mono text-purple-600 font-bold">
                    ✓ Supports RETAILG4 (ITEMFILE.DBF), Marg, & CSV
                  </div>
                </div>

                {/* Option A: Master Kerala Catalog */}
                <div
                  onClick={() => setCatalogChoice('master')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    catalogChoice === 'master'
                      ? 'border-sky-500 bg-sky-500/10 shadow-md ring-1 ring-sky-500'
                      : (isDark ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50')
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-900 uppercase tracking-wider">
                        Option A (Instant Start)
                      </span>
                      {catalogChoice === 'master' && <CheckCircle className="w-5 h-5 text-sky-500" />}
                    </div>
                    <h4 className="font-bold text-base mb-1">Pre-Loaded Kerala 24k Catalog</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Instant billing with zero manual entry. All Kerala pharma brands, salt compositions, GST rates, schedules (H/H1), and HSN codes pre-loaded.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/40 text-[11px] font-mono text-emerald-600 font-bold">
                    ✓ Stock increments automatically when invoices are scanned.
                  </div>
                </div>

                {/* Option C: Supabase Cloud Backup Restore */}
                <div
                  onClick={() => setCatalogChoice('cloud')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    catalogChoice === 'cloud'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500'
                      : (isDark ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50')
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 uppercase tracking-wider">
                        Option C (Cloud Sync)
                      </span>
                      {catalogChoice === 'cloud' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    </div>
                    <h4 className="font-bold text-base mb-1 flex items-center space-x-1.5">
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      <span>Restore from Supabase Cloud</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Download latest double-blind verified backup from Supabase. Restores catalog, batches, and bills with zero manual entry.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/40 text-[11px] font-mono text-emerald-600 font-bold">
                    ✓ Double-blind verified snapshot restoration
                  </div>
                </div>

                {/* Option D: Local Backup File (.json) */}
                <div
                  onClick={() => setCatalogChoice('local_json')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    catalogChoice === 'local_json'
                      ? 'border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500'
                      : (isDark ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50')
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase tracking-wider">
                        Option D (File / USB)
                      </span>
                      {catalogChoice === 'local_json' && <CheckCircle className="w-5 h-5 text-amber-500" />}
                    </div>
                    <h4 className="font-bold text-base mb-1 flex items-center space-x-1.5">
                      <FileUp className="w-4 h-4 text-amber-600" />
                      <span>Restore from Local Backup (.json)</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Select a backup JSON file exported from another terminal or pen drive. Validates schema and checksum before hydrating.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/40 text-[11px] font-mono text-amber-600 font-bold">
                    ✓ Offline USB migration without cloud dependency
                  </div>
                </div>
              </div>

              {/* If Option B Selected: File Upload Area */}
              {catalogChoice === 'import' && (
                <div className={`p-5 rounded-xl border space-y-4 animate-fade-in ${
                  isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold flex items-center space-x-2">
                        <FolderOpen className="w-4 h-4 text-purple-500" />
                        <span>Select Your Old Shop Database File (.DBF or .CSV)</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Select <strong>ITEMFILE.DBF</strong> or <strong>STK2610.DBF</strong> directly from your old software folder.
                      </p>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDropFolder}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      isDragging 
                        ? 'border-purple-500 bg-purple-500/10 scale-[1.01]' 
                        : (isDark ? 'border-zinc-700 hover:border-purple-500 bg-zinc-900/60' : 'border-slate-300 hover:border-purple-500 bg-white')
                    }`}
                  >
                    <FolderOpen className={`w-10 h-10 mx-auto mb-2 ${isDragging ? 'text-purple-500 animate-bounce' : 'text-slate-400'}`} />
                    <span className="text-sm font-bold block">
                      {isParsing ? 'Reading and verifying database files...' : (isDragging ? 'Drop DATA folder now!' : 'Drag & Drop DATA Folder Here')}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">
                      Directly drop the DATA folder from your USB drive, or click below to select
                    </span>

                    <div className="mt-4 flex items-center justify-center space-x-3">
                      <label className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center space-x-1.5">
                        <FolderOpen className="w-4 h-4" />
                        <span>Select DATA Folder</span>
                        <input
                          type="file"
                          webkitdirectory=""
                          directory=""
                          multiple
                          onChange={handleFolderSelect}
                          className="hidden"
                        />
                      </label>

                      <label className="px-3.5 py-2 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Select Individual DBF</span>
                        <input
                          type="file"
                          multiple
                          accept=".dbf,.csv,.txt"
                          onChange={handleFolderSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Status Banner & Pre-Flight Diagnostic Card */}
                  {importStatus && (
                    <div className={`p-4 rounded-xl text-xs font-mono font-bold space-y-2 ${
                      importStatus.startsWith('✓')
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span>{importStatus}</span>
                      </div>
                      
                      {importSummary && (
                        <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-sans">
                          <div className="p-2 rounded bg-emerald-500/10">
                            <span className="text-slate-400 block text-[10px] uppercase">Catalog Master</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{importSummary.itemFile || 'ITEMFILE.DBF'}</span>
                          </div>
                          <div className="p-2 rounded bg-emerald-500/10">
                            <span className="text-slate-400 block text-[10px] uppercase">Live Shop Stock</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{importSummary.stockFile || 'STKFILE.DBF'}</span>
                          </div>
                          <div className="p-2 rounded bg-emerald-500/10">
                            <span className="text-slate-400 block text-[10px] uppercase">Company Master</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{importSummary.companyFile || 'COMPMAST.DBF'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Folder Location Guide */}
                  <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <div className="font-bold flex items-center space-x-1.5 text-purple-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Where to find this file on your old shop computer:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      1. Right-click the old software desktop icon ➔ Click <strong>"Open file location"</strong>.<br/>
                      2. Look inside the <strong>DATA</strong> folder (usually <code>D:\LOCAL DISK\RETAILG4\DATA</code> or <code>C:\PHARMA\DATA</code>).<br/>
                      3. Select <strong>ITEMFILE.DBF</strong>. Your medicines and stock will be loaded instantly!
                    </p>
                  </div>
                </div>
              )}

              {/* If Master Catalog Selected */}
              {catalogChoice === 'master' && (
                <div className={`p-5 rounded-xl border space-y-2 animate-fade-in ${
                  isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-sky-50 border-sky-200'
                }`}>
                  <h4 className="text-sm font-bold text-sky-600 flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>Kerala 24k Master Drug Catalogue Selected</span>
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The full master catalogue with 24,665 medicines, manufacturer brands, schedule designations, and standard pricing is initialized. You can immediately search medicines with <strong>Ctrl+F</strong> or scan barcodes at the billing counter.
                  </p>
                </div>
              )}

              {/* If Cloud Backup Selected */}
              {catalogChoice === 'cloud' && (
                <div className={`p-5 rounded-xl border space-y-4 animate-fade-in ${
                  isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold flex items-center space-x-2 text-emerald-600">
                        <Cloud className="w-4 h-4" />
                        <span>Supabase Cloud Backup Retrieval</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Fetch the latest double-blind verified backup stored for branch: <strong>{selectedBranchId}</strong>.
                      </p>
                    </div>
                    <button
                      onClick={handleFetchCloudBackup}
                      disabled={isFetchingCloudBackup}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingCloudBackup ? 'animate-spin' : ''}`} />
                      <span>{isFetchingCloudBackup ? 'Querying...' : 'Fetch Latest Backup'}</span>
                    </button>
                  </div>

                  {cloudFetchError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-mono">
                      {cloudFetchError}
                    </div>
                  )}

                  {cloudBackupMeta && (
                    <div className={`p-4 rounded-xl border text-xs font-mono space-y-3 ${
                      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold text-emerald-600 pb-2 border-b border-inherit">
                        <span>✓ Verified Snapshot Found</span>
                        <span>Date: {cloudBackupMeta.date}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-sans">
                        <div className="p-2 rounded bg-emerald-500/10">
                          <span className="text-slate-400 block text-[10px] uppercase">Medicines</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{cloudBackupMeta.recordCounts?.medicines || 0}</span>
                        </div>
                        <div className="p-2 rounded bg-emerald-500/10">
                          <span className="text-slate-400 block text-[10px] uppercase">Bills</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{cloudBackupMeta.recordCounts?.bills || 0}</span>
                        </div>
                        <div className="p-2 rounded bg-emerald-500/10 col-span-2 sm:col-span-1">
                          <span className="text-slate-400 block text-[10px] uppercase">Checksum</span>
                          <span className="font-bold font-mono text-[10px] text-emerald-700 dark:text-emerald-400 truncate block">{cloudBackupMeta.checksum || 'N/A'}</span>
                        </div>
                      </div>

                      {!restoreSuccessMsg ? (
                        <button
                          onClick={handleRestoreCloudBackup}
                          disabled={isRestoringData}
                          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md cursor-pointer disabled:opacity-50"
                        >
                          <CloudDownload className="w-4 h-4" />
                          <span>{isRestoringData ? 'Hydrating IndexedDB...' : 'Restore This Snapshot Into Local Terminal'}</span>
                        </button>
                      ) : (
                        <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center space-x-2 font-mono">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span>{restoreSuccessMsg}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* If Local Backup Selected */}
              {catalogChoice === 'local_json' && (
                <div className={`p-5 rounded-xl border space-y-4 animate-fade-in ${
                  isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-amber-50/50 border-amber-200'
                }`}>
                  <div>
                    <h4 className="text-sm font-bold flex items-center space-x-2 text-amber-600">
                      <FileUp className="w-4 h-4" />
                      <span>Select Local Backup JSON File</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Select a <code>BetaPharma_Backup_*.json</code> file exported from another counter or USB backup archive.
                    </p>
                  </div>

                  <div className={`border-2 border-dashed rounded-xl p-6 text-center ${
                    isDark ? 'border-zinc-700 bg-zinc-900/60' : 'border-amber-300 bg-white'
                  }`}>
                    <label className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center space-x-2">
                      <FileUp className="w-4 h-4" />
                      <span>Browse Backup File (.json)</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleLocalBackupSelect}
                        className="hidden"
                      />
                    </label>
                    <span className="block text-xs text-slate-400 mt-2">
                      Validates medicines count, bill records, and content checksum before restoring
                    </span>
                  </div>

                  {restoreSuccessMsg && (
                    <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center space-x-2 font-mono">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{restoreSuccessMsg}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: STEP-BY-STEP FEATURE EXPLAINER ================= */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2 text-emerald-600">
                  <Zap className="w-5 h-5" />
                  <span>Step 3: Core Features & Operating Guide (First-Time Tour)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Here is how the system simplifies everyday counter operations for you and your staff:
                </p>
              </div>

              {/* Feature Tabs */}
              <div className="flex border-b border-inherit space-x-1 font-mono text-xs overflow-x-auto pb-1">
                {[
                  { id: 'billing', label: '1. Fast Billing Terminal', icon: Receipt },
                  { id: 'substitute', label: '2. F2 Substitute Radar', icon: Search },
                  { id: 'ocr', label: '3. OCR Inward Entry', icon: FileText },
                  { id: 'shift', label: '4. Shift Handover', icon: Users },
                  { id: 'offline', label: '5. Offline Security', icon: ShieldCheck }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeFeatureTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFeatureTab(tab.id)}
                      className={`px-3 py-1.5 rounded-t-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                        isActive
                          ? (isDark ? 'bg-zinc-800 text-sky-400 border-b-2 border-sky-400' : 'bg-slate-200 text-sky-800 border-b-2 border-sky-600')
                          : (isDark ? 'text-zinc-400 hover:bg-zinc-800/40' : 'text-slate-600 hover:bg-slate-100')
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Feature Tab Content */}
              <div className={`p-5 rounded-xl border min-h-[220px] ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {activeFeatureTab === 'billing' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-sky-500">Fast Keyboard Billing Terminal (Alt+B)</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-bold">100% Keyboard Driven</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Designed for rapid customer billing without needing a mouse. Cashiers type medicine name or barcode, hit <strong>Enter</strong> to select batch, specify quantity, and press <strong>F10</strong> to finish.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                      <div className={`p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-sky-500 font-bold">Ctrl + F:</span> Search by Medicine or Salt Name
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-sky-500 font-bold">F7:</span> Instant Bill Recall & Tractor Print
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-sky-500 font-bold">F10:</span> Complete Bill & Print Slip
                      </div>
                      <div className={`p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-sky-500 font-bold">Shift+H:</span> Hold / Park current customer bill
                      </div>
                    </div>
                  </div>
                )}

                {activeFeatureTab === 'substitute' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-emerald-500">Generic Salt & Substitute Radar (F2)</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">Never Lose a Sale</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      If a doctor writes a brand you don't have in stock, press <strong>F2</strong> or type the salt name. The system reveals all other brands on your shelves that contain the <strong>exact same chemical molecule</strong>!
                    </p>
                    <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      <div className="font-bold text-emerald-600">✓ Multi-Branch Radar Built-In:</div>
                      <p className="text-[11px] leading-relaxed">
                        If an item is out of stock in <strong>Beta Pharmacy</strong>, the radar instantly shows whether it is available in <strong>Beta Polyclinic Pharmacy</strong> or <strong>FN Branch</strong> so you can transfer it immediately.
                      </p>
                    </div>
                  </div>
                )}

                {activeFeatureTab === 'ocr' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-purple-500">Purchase Inward Entry & Smart Invoice OCR</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">Zero Manual Purchase Typing</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      When distributor bills arrive, simply drop the PDF or photo into the Purchase screen. The OCR engine reads:
                    </p>
                    <ul className="text-xs space-y-1 list-disc list-inside text-slate-500">
                      <li>Distributor Name, GSTIN, Invoice No & Date</li>
                      <li>Batch numbers & Expiry dates</li>
                      <li>MRP and PTR with auto-swap protection (MRP &gt; PTR)</li>
                      <li><strong>Instant Stock Increment:</strong> Saving the purchase automatically increments stock in your catalog!</li>
                    </ul>
                  </div>
                )}

                {activeFeatureTab === 'shift' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-amber-500">Staff Shift Handover & Blind Cash Reconciliation</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">Zero Cash Leakage</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Solves the problem of daily cash drawer shortages! When a cashier leaves:
                    </p>
                    <ol className="text-xs space-y-1.5 list-decimal list-inside text-slate-500">
                      <li>Cashier counts physical currency in the drawer (Blind Cash Entry).</li>
                      <li>System compares it with expected sales and flags any cash discrepancy.</li>
                      <li>Selects incoming cashier and hands over float smoothly without blocking managers.</li>
                    </ol>
                  </div>
                )}

                {activeFeatureTab === 'offline' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-sky-500">100% Offline Freedom & Bank-Grade Security</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-bold">Safe & Private</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Your business data and source code are protected by 4 security rings:
                    </p>
                    <div className="space-y-1 text-xs text-slate-500">
                      <div>• <strong>No Code Theft:</strong> Source code is private in your GitHub. What runs in the browser is a minified, compiled production build.</div>
                      <div>• <strong>Browser Sandbox:</strong> Local pharmacy inventory is stored in encrypted, isolated Origin storage that no other website can access.</div>
                      <div>• <strong>Database Protection:</strong> Protected by Supabase Row Level Security (RLS) policies.</div>
                      <div>• <strong>Offline Continuity:</strong> If Wi-Fi fails, billing never stops. Bills queue locally and sync automatically when internet restores.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 4: INSTALL DESKTOP APP ================= */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2 text-sky-600">
                  <Monitor className="w-5 h-5" />
                  <span>Step 4: 1-Click Desktop App Installation (PWA)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Do staff have to type the Vercel link every time? <strong>No!</strong> Install it once as a standalone Windows Desktop App.
                </p>
              </div>

              {/* Install Feature Card */}
              <div className={`p-6 rounded-xl border text-center space-y-4 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white font-black text-3xl flex items-center justify-center mx-auto shadow-lg shadow-sky-600/30">
                  β
                </div>

                <div>
                  <h4 className="text-lg font-extrabold tracking-tight">Beta Pharmacy POS Terminal</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Adds a Windows Desktop shortcut icon. Opens in an ultra-fast full-screen window with zero browser URL bars or tabs.
                  </p>
                </div>

                {/* Key Benefits Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
                  <span className={`px-3 py-1 rounded-full border flex items-center space-x-1.5 ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-slate-300 text-slate-800'
                  }`}>
                    <WifiOff className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Works 100% Offline without Wi-Fi</span>
                  </span>
                  <span className={`px-3 py-1 rounded-full border flex items-center space-x-1.5 ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-slate-300 text-slate-800'
                  }`}>
                    <CheckCircle className="w-3.5 h-3.5 text-sky-500" />
                    <span>No Vercel URLs for Cashiers</span>
                  </span>
                </div>

                {/* Big Install Button */}
                <div className="pt-2">
                  {installSuccess ? (
                    <div className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-md">
                      <Check className="w-5 h-5" />
                      <span>Installed as Desktop App! Ready to Go.</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleTriggerInstall}
                      className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                      <span>Install as Windows Desktop App</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  * If your browser does not pop up the prompt automatically, click the install icon (⤓) in your browser address bar.
                </p>
              </div>

              {/* Free Forever & Security Reassurance */}
              <div className={`p-3.5 rounded-lg border text-xs flex items-start space-x-3 ${
                isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Permanent Zero-Cost & Security Guarantee:</strong> All app files are permanently cached on this PC's local hard drive (`sw.js`). Normal daily billing uses <strong>0 KB Vercel bandwidth</strong> and daily aggregated sales data stays permanently under 50 MB on Supabase. It remains <strong>100% Free Forever</strong>.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className={`px-4 py-2 rounded-lg border text-xs font-bold flex items-center space-x-1.5 ${
                isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center space-x-3">
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <span>Continue to Step {step + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Complete Setup & Start Billing (Enter)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
