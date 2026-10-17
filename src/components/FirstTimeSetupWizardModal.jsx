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
  X
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
  const [cashierName, setCashierName] = useState('Rahul C');

  // Step 2: Catalog Choice - Defaulting to 'import' if user chooses Option B, or 'master'
  const [catalogChoice, setCatalogChoice] = useState('import'); // 'master' | 'import' (Option B)
  const [importedFile, setImportedFile] = useState(null);
  const [importedMeds, setImportedMeds] = useState([]);
  const [importStatus, setImportStatus] = useState('');
  const [isParsing, setIsParsing] = useState(false);

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
        setImportStatus(`✓ Extracted ${normalized.length.toLocaleString()} medicines from ${file.name}!`);
      } else if (fileName.endsWith('.CSV') || fileName.endsWith('.TXT')) {
        const text = await file.text();
        const records = parseCsvText(text);
        const normalized = normalizeLegacyMedicineRecords(records);
        setImportedMeds(normalized);
        setImportStatus(`✓ Extracted ${normalized.length.toLocaleString()} medicines from CSV!`);
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

              {/* Branch Selection Cards: Beta Pharmacy & Beta Polyclinic */}
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
                    placeholder="e.g. Rahul C, Suresh Kumar"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[11px] text-slate-500">Staff can change or hand over shifts anytime at the top bar.</span>
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
                  <label className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDark 
                      ? 'border-zinc-700 hover:border-purple-500 hover:bg-zinc-900' 
                      : 'border-slate-300 hover:border-purple-500 hover:bg-purple-50/50'
                  }`}>
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <span className="text-sm font-bold block">
                      {importedFile ? importedFile.name : 'Click to select or drag & drop ITEMFILE.DBF / CSV'}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">
                      Runs 100% locally in your browser memory — zero server upload, private & secure.
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
                        If an item is out of stock in <strong>Beta Pharmacy</strong>, the radar instantly shows whether it is available in <strong>Beta Polyclinic</strong> or <strong>FN Branch</strong> so you can transfer it immediately.
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
