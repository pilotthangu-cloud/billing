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
  Sparkles as IconSparkleFallback, // Unused, keeping clean
  User, 
  Layers, 
  Check, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { parseDbfBuffer, parseCsvText, normalizeLegacyMedicineRecords } from '../utils/dbfReader';

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

  // Step state: 1 = Branch & Counter, 2 = Catalog Choice & Import, 3 = Install & Launch
  const [step, setStep] = useState(1);

  // Step 1: Branch & Counter Settings
  const [selectedBranchId, setSelectedBranchId] = useState('MAIN');
  const [customBranchName, setCustomBranchName] = useState('');
  const [counterName, setCounterName] = useState('Counter 01');
  const [cashierName, setCashierName] = useState('Rahul C');

  // Step 2: Catalog Choice
  const [catalogChoice, setCatalogChoice] = useState('master'); // 'master' | 'import'
  const [importedFile, setImportedFile] = useState(null);
  const [importedMeds, setImportedMeds] = useState([]);
  const [importStatus, setImportStatus] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Step 3: Installation status
  const [installSuccess, setInstallSuccess] = useState(isAppInstalled);

  useEffect(() => {
    if (isAppInstalled) {
      setInstallSuccess(true);
    }
  }, [isAppInstalled]);

  if (!isOpen) return null;

  // Handle Legacy File Upload (DBF or CSV)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setIsParsing(true);
    setImportStatus(`Reading ${file.name}...`);

    try {
      const fileName = file.name.toUpperCase();
      if (fileName.endsWith('.DBF')) {
        const buffer = await file.arrayBuffer();
        const { records } = parseDbfBuffer(buffer);
        const normalized = normalizeLegacyMedicineRecords(records);
        setImportedMeds(normalized);
        setImportStatus(`✓ Successfully extracted ${normalized.length.toLocaleString()} medicines from ${file.name}!`);
      } else if (fileName.endsWith('.CSV') || fileName.endsWith('.TXT')) {
        const text = await file.text();
        const records = parseCsvText(text);
        const normalized = normalizeLegacyMedicineRecords(records);
        setImportedMeds(normalized);
        setImportStatus(`✓ Successfully extracted ${normalized.length.toLocaleString()} medicines from CSV!`);
      } else {
        setImportStatus('Please upload a .DBF file (e.g. ITEMFILE.DBF) or a .CSV file.');
      }
    } catch (err) {
      console.error('Import error:', err);
      setImportStatus(`Error reading file: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
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
  const handleFinish = () => {
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

    onCompleteSetup({
      branch: finalBranch || availableBranches[0],
      counter: counterName.trim() || 'Counter 01',
      cashier: cashierName.trim() || 'Rahul C',
      catalogType: catalogChoice,
      importedMeds: catalogChoice === 'import' ? importedMeds : []
    });

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
              <h2 className="text-lg font-bold tracking-tight">Beta Pharmacy Terminal Setup</h2>
              <p className="text-xs text-slate-500 font-mono">1-Time Shop Onboarding & Desktop App Deployment</p>
            </div>
          </div>

          {/* Step Breadcrumbs */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className={`px-2.5 py-1 rounded-full font-bold ${
              step === 1 ? 'bg-sky-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
            }`}>1. Shop</span>
            <span className="text-slate-400">➔</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${
              step === 2 ? 'bg-sky-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
            }`}>2. Catalog</span>
            <span className="text-slate-400">➔</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${
              step === 3 ? 'bg-sky-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
            }`}>3. Install</span>
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

              {/* Branch Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                        <span className="font-bold text-sm">{b.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-sky-500 shrink-0" />}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{b.location}</div>
                      <div className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded self-start bg-sky-100 text-sky-800 font-bold">
                        Stock Tag: {b.stockKey}
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
                  <span className="text-[11px] text-slate-500">Helps track cash box reconciliation per physical counter.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Primary Cashier / Operator</label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    placeholder="e.g. Rahul C, Suresh Kumar"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[11px] text-slate-500">Staff can hand over shifts anytime at the top bar.</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CATALOG CHOICE & IMPORT ================= */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2 text-sky-600">
                  <Database className="w-5 h-5" />
                  <span>Step 2: Choose Medicine Catalog Source</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  How would you like to initialize this shop's medicine database?
                </p>
              </div>

              {/* Two Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Option 1: Master Kerala Catalog */}
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
                      <span className="font-extrabold text-sm text-sky-600">Recommended & Instant</span>
                      {catalogChoice === 'master' && <CheckCircle className="w-5 h-5 text-sky-500" />}
                    </div>
                    <h4 className="font-bold text-base mb-1">Pre-Loaded Kerala 24,000 Catalog</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Instant start with zero manual typing. Includes all standard Kerala pharma brands, salt compositions, GST rates, schedules (H/H1), and HSN codes.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/40 text-[11px] font-mono text-emerald-600 font-bold">
                    ✓ Stock increments automatically when invoices are scanned.
                  </div>
                </div>

                {/* Option 2: Import Legacy Shop DB */}
                <div
                  onClick={() => setCatalogChoice('import')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    catalogChoice === 'import'
                      ? 'border-sky-500 bg-sky-500/10 shadow-md ring-1 ring-sky-500'
                      : (isDark ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40' : 'border-slate-200 hover:border-slate-300 bg-slate-50')
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm text-purple-600">Migrate Existing Stock</span>
                      {catalogChoice === 'import' && <CheckCircle className="w-5 h-5 text-purple-500" />}
                    </div>
                    <h4 className="font-bold text-base mb-1">Import Old Shop DBF / CSV</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Migrate your specific existing inventory, custom item codes, rack locations, and stock numbers from your old DOS/Clipper software.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/40 text-[11px] font-mono text-purple-600 font-bold">
                    Supports RETAILG4 (ITEMFILE.DBF), Marg, & CSV
                  </div>
                </div>
              </div>

              {/* If Import Selected: File Upload Area */}
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
                  <label className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDark 
                      ? 'border-zinc-700 hover:border-sky-500 hover:bg-zinc-900' 
                      : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50/50'
                  }`}>
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <span className="text-sm font-bold block">
                      {importedFile ? importedFile.name : 'Click to select or drag & drop ITEMFILE.DBF / CSV'}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">
                      Runs 100% locally in your browser — zero internet or server upload required.
                    </span>
                    <input
                      type="file"
                      accept=".dbf,.csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Status Banner */}
                  {importStatus && (
                    <div className={`p-3 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 ${
                      importStatus.startsWith('✓')
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                    }`}>
                      <span>{importStatus}</span>
                    </div>
                  )}

                  {/* Folder Location Guide */}
                  <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <div className="font-bold flex items-center space-x-1.5 text-sky-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Where to find this file on your old shop computer:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      1. Right-click the old software icon on your desktop ➔ Click <strong>"Open file location"</strong>.<br/>
                      2. Look inside the <strong>DATA</strong> folder (usually in <code>D:\LOCAL DISK\RETAILG4\DATA</code> or <code>C:\PHARMA\DATA</code>).<br/>
                      3. Select <strong>ITEMFILE.DBF</strong>. All medicines and quantities will be imported instantly!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: INSTALL DESKTOP APP ================= */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2 text-sky-600">
                  <Monitor className="w-5 h-5" />
                  <span>Step 3: 1-Click Desktop App Installation (PWA)</span>
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

              {/* Free Forever Reassurance */}
              <div className={`p-3.5 rounded-lg border text-xs flex items-start space-x-3 ${
                isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Permanent Zero-Cost Architecture:</strong> All app files are permanently cached on this PC's local hard drive (`sw.js`). Normal daily billing uses <strong>0 KB Vercel bandwidth</strong> and daily aggregated sales data stays permanently under 50 MB on Supabase. It remains <strong>100% Free Forever</strong>.
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
            {step < 3 ? (
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
