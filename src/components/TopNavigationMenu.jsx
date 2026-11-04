import React, { useState } from 'react';
import { 
  ShoppingCart, 
  AlertTriangle, 
  Package, 
  BarChart3, 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  Building2,
  ChevronDown,
  BookOpen,
  Truck,
  PlusCircle,
  Lock,
  Unlock,
  ShieldCheck,
  CreditCard,
  Banknote,
  Clock,
  History,
  Coins,
  Download,
  Database,
  Upload,
  User,
  Search,
  Layers,
  Zap,
  Printer,
  HelpCircle,
  Cloud,
  HardDrive,
  X
} from 'lucide-react';

export default function TopNavigationMenu({
  activePage,
  setActivePage,
  theme,
  setTheme,
  isOffline,
  setIsOffline,
  currentTime,
  onOpenNewMedModal,
  authenticatedRole,
  onOpenPasswordModal,
  onLogoutRole,
  activeShift,
  onOpenShiftModal,
  staffList = [],
  onSelectActiveStaff,
  activeBranch,
  onSelectBranch,
  availableBranches = [],
  onOpenImportModal,
  onOpenSetupWizard,
  onInstallApp,
  isAppInstalled = false,
  onOpenCustomerHistory,
  onOpenCommandPalette,
  density = 'compact',
  onToggleDensity,
  syncStatus,
  onTriggerSync,
  isInstantPrint = true,
  onToggleInstantPrint,
  onLockTerminal,
  onOpenCloudStorageModal,
  onOpenBackupModal,
  cloudMetrics
}) {
  const isDark = theme === 'dark';
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isPrinterGuideOpen, setIsPrinterGuideOpen] = useState(false);

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const navigateTo = (page) => {
    setActivePage(page);
    setOpenDropdown(null);
  };

  return (
    <div className={`border-b select-none text-xs transition-colors ${
      isDark 
        ? 'bg-zinc-900 border-zinc-800 text-zinc-200' 
        : 'bg-slate-100 border-slate-300 text-slate-800'
    }`}>
      {/* Level 1: Pharmacy Title & Menu Bar */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-inherit">
        <div className="flex items-center space-x-4">
          {/* Pharmacy Identity - Locked to Machine Configuration */}
          <div className="flex items-center space-x-2">
            <span className="font-black text-sm tracking-wider text-sky-600 font-mono">
              {activeBranch?.name?.toUpperCase() || 'BETA PHARMACY'}
            </span>
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded border text-[11px] font-mono font-bold select-none cursor-default ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
              }`} 
              title="Physical Counter Identity: Permanently assigned to this terminal."
            >
              <Building2 className="w-3 h-3 text-sky-600" />
              <span>{activeBranch?.location ? `${activeBranch.location} • Counter 01` : 'Main Counter 01'}</span>
            </div>
            {onOpenImportModal && (
              <button
                type="button"
                onClick={onOpenImportModal}
                className={`px-2.5 py-0.5 rounded border text-[11px] font-mono font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs ${
                  isDark ? 'bg-purple-950 text-purple-200 border-purple-700 hover:bg-purple-900' : 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
                }`}
                title="1-Click Upload old pharmacy DATA folder or ITEMFILE.DBF & STK*.DBF"
              >
                <Upload className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>📁 Upload DATA (.DBF)</span>
              </button>
            )}

            {!window.electronAPI?.isElectron && (
              <a
                href="https://github.com/pilotthangu-cloud/billing/releases/download/v1.0.0/Beta.Pharmacy.POS.1.0.0.exe"
                target="_blank"
                rel="noreferrer"
                className={`px-2.5 py-0.5 rounded border text-[11px] font-mono font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs ${
                  isDark ? 'bg-emerald-950 text-emerald-200 border-emerald-700 hover:bg-emerald-900' : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                }`}
                title="Download Standalone Windows Desktop Counter App (.exe) directly in Chrome"
              >
                <Download className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>⬇️ Download Counter App</span>
              </a>
            )}
          </div>

          <span className="text-slate-400">|</span>

          {/* Traditional Software Menu Dropdowns */}
          <div className="flex items-center space-x-1 font-medium">
            {/* Masters */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('masters')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 ${
                  ['product-master', 'supplier-master', 'company-master', 'tax-master'].includes(activePage) || openDropdown === 'masters'
                    ? (isDark ? 'bg-zinc-800 text-sky-400 font-bold' : 'bg-white text-sky-800 font-bold shadow-sm') 
                    : (isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200')
                }`}
              >
                <span>Masters</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {openDropdown === 'masters' && (
                <div className={`absolute left-0 top-full mt-1 w-60 rounded-md shadow-xl border z-50 py-1 font-sans ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                }`}>
                  <button 
                    onClick={() => navigateTo('product-master')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-bold"
                  >
                    <span>Product Master [MAS001]</span>
                    <span className="text-[10px] font-mono opacity-70">24k</span>
                  </button>
                  <button 
                    onClick={() => {
                      setOpenDropdown(null);
                      onOpenNewMedModal();
                    }} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold text-sky-600 flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add New Medicine</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('supplier-master')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Supplier / Distributors [MAS002]</span>
                    <span className="text-[10px] font-mono opacity-70">382</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('company-master')} 
                    className={`w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-bold ${
                      isDark ? 'text-purple-300' : 'text-purple-700'
                    }`}
                  >
                    <span>Company / Pharma Master [MAS003]</span>
                    <span className="text-[10px] font-mono opacity-70">923</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('doctor-master')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Doctor / Clinic Master [MAS004]</span>
                    <span className="text-[10px] font-mono opacity-70">DOCS</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('tax-master')} 
                    className={`w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-bold ${
                      isDark ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    <span>Tax & GST Master [MAS010]</span>
                    <span className={`text-[10px] font-mono px-1 rounded ${
                      isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    }`}>GST/HSN</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('shortages')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Shelf Rack Locations & Shortages</span>
                    <span className="text-[10px] font-mono opacity-70">MAS009</span>
                  </button>
                  <button 
                    onClick={() => {
                      setOpenDropdown(null);
                      if (onOpenImportModal) onOpenImportModal();
                    }} 
                    className={`w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-bold border-t ${
                      isDark ? 'border-zinc-800 text-purple-300' : 'border-slate-200 text-purple-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-purple-500" />
                      <span>Import Legacy DB (.DBF / CSV)</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80">IMPORT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Transactions */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('transactions')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 ${
                  ['billing', 'purchases'].includes(activePage) || openDropdown === 'transactions'
                    ? (isDark ? 'bg-zinc-800 text-sky-400 font-bold' : 'bg-white text-sky-800 font-bold shadow-sm') 
                    : (isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200')
                }`}
              >
                <span>Transactions</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {openDropdown === 'transactions' && (
                <div className={`absolute left-0 top-full mt-1 w-52 rounded-md shadow-xl border z-50 py-1 font-sans ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                }`}>
                  <button 
                    onClick={() => navigateTo('billing')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold flex items-center justify-between"
                  >
                    <span>Sale Billing (POS)</span>
                    <span className="text-[10px] font-mono opacity-80">Alt+B</span>
                  </button>
                  <button 
                    onClick={() => {
                      setOpenDropdown(null);
                      if (onOpenCustomerHistory) onOpenCustomerHistory();
                    }} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold flex items-center justify-between text-sky-600 dark:text-sky-400"
                  >
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Patient Rx & History</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1 rounded bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300">F4</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('purchases')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold flex items-center justify-between"
                  >
                    <span>Purchase Inward Entry</span>
                    <span className="text-[10px] font-mono opacity-70">INWARD</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('due-bills')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Customer Credit / Due Bills</span>
                    <span className="text-[10px] font-mono text-amber-500 font-bold">DUEBILL</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('distributor-payments')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Distributor Payments & Cheques</span>
                    <span className="text-[10px] font-mono opacity-70">PAYMENTS</span>
                  </button>
                  <button 
                    onClick={() => {
                      setOpenDropdown(null);
                      onOpenShiftModal();
                    }} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold flex items-center justify-between text-amber-600"
                  >
                    <span>Staff Shift Reconciliation</span>
                    <span className="text-[10px] font-mono font-bold px-1 rounded bg-amber-100 text-amber-900">AUDIT</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('expiry')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
                  >
                    <span>Expiry Return to Distributor</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reports */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('reports')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 ${
                  ['expiry', 'sales-register', 'shortages'].includes(activePage) || openDropdown === 'reports'
                    ? (isDark ? 'bg-zinc-800 text-sky-400 font-bold' : 'bg-white text-sky-800 font-bold shadow-sm') 
                    : (isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200')
                }`}
              >
                <span>Reports</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {openDropdown === 'reports' && (
                <div className={`absolute left-0 top-full mt-1 w-56 rounded-md shadow-xl border z-50 py-1 font-sans ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                }`}>
                  <button 
                    onClick={() => navigateTo('expiry')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold flex items-center justify-between text-amber-600"
                  >
                    <span>Near-Expiry Watchdog</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-amber-100 text-amber-800">1,089</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('batch-enquiry')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold flex items-center justify-between text-sky-600"
                  >
                    <span>Batch Enquiry (Inward Lots)</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-sky-100 text-sky-800">ENQ004</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('shortages')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Stock Shortages / Reorder</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('sales-register')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between font-bold"
                  >
                    <span>Daily Sales Register & Margins</span>
                    <span className="text-[10px] font-mono opacity-70">SALES</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('admin')} 
                    className={`w-full text-left px-3 py-1.5 hover:bg-purple-600 hover:text-white flex items-center justify-between font-bold ${
                      isDark ? 'text-purple-400' : 'text-purple-700'
                    }`}
                  >
                    <span>Owner Admin HQ Portal</span>
                    <span className="text-[10px] font-mono opacity-80 text-purple-400 font-bold">HQ</span>
                  </button>
                </div>
              )}
            </div>

            {/* Utilities */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('utilities')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 ${
                  ['radar', 'sales-register'].includes(activePage) || openDropdown === 'utilities'
                    ? (isDark ? 'bg-zinc-800 text-sky-400 font-bold' : 'bg-white text-sky-800 font-bold shadow-sm') 
                    : (isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-200')
                }`}
              >
                <span>Utilities</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {openDropdown === 'utilities' && (
                <div className={`absolute left-0 top-full mt-1 w-52 rounded-md shadow-xl border z-50 py-1 font-sans ${
                  theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                }`}>
                  <button 
                    onClick={() => navigateTo('radar')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold"
                  >
                    <span>Multi-Store Batch Radar</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('sales-register')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white"
                  >
                    <span>Day Begin & Cash Tally</span>
                  </button>
                  <button 
                    onClick={() => {
                      setOpenDropdown(null);
                      if (onOpenSetupWizard) onOpenSetupWizard();
                    }} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between border-t border-slate-200/40 font-bold"
                  >
                    <span>Terminal Setup & Features Guide</span>
                    <span className="text-[10px] font-mono opacity-80 text-emerald-500 font-bold">TOUR</span>
                  </button>
                  {!isAppInstalled && onInstallApp && (
                    <button 
                      onClick={() => {
                        setOpenDropdown(null);
                        onInstallApp();
                      }} 
                      className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white font-bold text-sky-500 flex items-center justify-between"
                    >
                      <span>Install Windows Desktop App</span>
                      <Download className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cashier Shift Handover, Owner Admin Portal, Security Status, Cloud Sync, Theme Toggle & Clock */}
        <div className="flex items-center space-x-2 font-mono text-[11px]">
          {/* Active Cashier Shift, Handover & Lock Terminal */}
          <div className="flex items-center space-x-1">
            <div className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1.5 font-bold ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-white border-slate-300 text-slate-800 shadow-xs'
            }`}>
              <span className={`w-2 h-2 rounded-full ${activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-500 text-[10px]">CASHIER:</span>
              <select
                value={activeShift?.staffName || staffList[0] || 'Counter Staff'}
                onChange={(e) => {
                  const selected = e.target.value;
                  if (selected !== (activeShift?.staffName || 'Counter Staff')) {
                    if (onOpenShiftModal) {
                      onOpenShiftModal(selected);
                    }
                  }
                }}
                className={`font-black bg-transparent border-0 cursor-pointer focus:outline-none text-[11px] ${
                  isDark ? 'text-white' : 'text-slate-950 font-black'
                }`}
                title="Active Cashier • Select another name to initiate shift handover"
              >
                {Array.from(new Set([...staffList, activeShift?.staffName].filter(Boolean))).map((s, idx) => (
                  <option key={idx} value={s} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-950'}>
                    {s}
                  </option>
                ))}
                {staffList.length === 0 && !activeShift?.staffName && (
                  <option value="Counter Staff" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-950'}>
                    Counter Staff
                  </option>
                )}
              </select>
            </div>

            <button
              onClick={onOpenShiftModal}
              className={`px-2 py-1 rounded border text-[10px] font-black uppercase transition shadow-xs cursor-pointer ${
                isDark 
                  ? 'bg-sky-950 text-sky-300 border-sky-800 hover:bg-sky-900' 
                  : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200'
              }`}
              title="Click to perform cash drawer audit and shift handover (F10)"
            >
              Handover
            </button>

            {/* Quick Lock Terminal Button (Ctrl+L) */}
            {onLockTerminal && (
              <button
                onClick={onLockTerminal}
                className={`p-1 rounded border transition cursor-pointer flex items-center space-x-1 text-xs font-bold ${
                  isDark 
                    ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-amber-400' 
                    : 'border-slate-300 bg-white hover:bg-slate-100 text-amber-700 shadow-xs'
                }`}
                title="Lock Terminal & Cash Register (Ctrl+L)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[10px]">Lock</span>
              </button>
            )}
          </div>

          {/* Universal Command Palette Spotlight Trigger (Ctrl+K) */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1.5 font-bold transition cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' 
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-xs'
              }`}
              title="Global Spotlight Search & Keyboard Shortcuts (Ctrl+K)"
            >
              <Search className="w-3 h-3 text-sky-500" />
              <span>Spotlight</span>
              <kbd className={`text-[9px] px-1 rounded font-bold ${
                isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-slate-100 text-slate-600'
              }`}>
                ^K
              </kbd>
            </button>
          )}

          {/* Table Density Switcher: Speed Counter (Compact) vs Executive HQ (Comfort) */}
          {onToggleDensity && (
            <button
              onClick={onToggleDensity}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-1 font-bold transition cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
              title={`Switch Density: Currently ${density === 'compact' ? 'Compact' : 'Comfortable'}`}
            >
              <Layers className="w-3 h-3 text-amber-500" />
              <span>{density === 'compact' ? 'COMPACT' : 'COMFORT'}</span>
            </button>
          )}

          {/* Owner Admin HQ Portal Quick Access */}
          <button
            onClick={() => navigateTo('admin')}
            className={`px-2.5 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1.5 font-black transition ${
              activePage === 'admin'
                ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                : (isDark 
                    ? 'bg-purple-950/70 border-purple-800 text-purple-300 hover:bg-purple-900' 
                    : 'bg-purple-100 border-purple-300 text-purple-900 hover:bg-purple-200 shadow-xs')
            }`}
            title="Open Multi-Pharmacy Owner Admin HQ Portal"
          >
            <Building2 className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>ADMIN HQ</span>
          </button>

          {/* Cloud Delta Sync Status Indicator */}
          <button
            onClick={() => {
              if (onTriggerSync) {
                onTriggerSync();
              } else if (setIsOffline) {
                setIsOffline(!isOffline);
              }
            }}
            className={`px-2.5 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1.5 cursor-pointer transition ${
              syncStatus && !syncStatus.isOnline
                ? (isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-900 border-amber-300')
                : syncStatus?.syncState === 'RLS_BLOCKED'
                ? (isDark ? 'bg-amber-950/60 text-amber-400 border-amber-700/60' : 'bg-amber-50 text-amber-800 border-amber-300')
                : syncStatus?.isSyncing
                ? (isDark ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-sky-100 text-sky-900 border-sky-300')
                : syncStatus?.pendingCount > 0
                ? (isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-900 border-amber-300')
                : (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-900 border-emerald-300')
            }`}
            title={`Supabase Cloud Sync • Status: ${syncStatus?.syncState || 'ACTIVE'} • Pending deltas: ${syncStatus?.pendingCount || 0} • Click to flush`}
          >
            {syncStatus && !syncStatus.isOnline ? (
              <>
                <WifiOff className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>OFFLINE (${syncStatus.pendingCount || 0} Q'd)</span>
              </>
            ) : syncStatus?.syncState === 'RLS_BLOCKED' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>LOCAL ONLY (${syncStatus.pendingCount || 0} PENDING)</span>
              </>
            ) : syncStatus?.isSyncing ? (
              <>
                <Wifi className="w-3 h-3 text-sky-400 animate-pulse" />
                <span>SYNCING...</span>
              </>
            ) : syncStatus?.pendingCount > 0 ? (
              <>
                <Wifi className="w-3 h-3 text-amber-400" />
                <span>PENDING (${syncStatus.pendingCount})</span>
              </>
            ) : (
              <>
                <Wifi className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>CLOUD SYNC: ACTIVE</span>
              </>
            )}
          </button>

          {/* Live Cloud Storage Quota Watchdog Meter */}
          {onOpenCloudStorageModal && (
            <button
              onClick={onOpenCloudStorageModal}
              className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1 font-bold cursor-pointer transition ${
                cloudMetrics?.isWarningThreshold
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 animate-pulse'
                  : (isDark ? 'bg-zinc-800 border-zinc-700 text-sky-400 hover:bg-zinc-700' : 'bg-white border-slate-300 text-sky-700 hover:bg-slate-100 shadow-xs')
              }`}
              title="Cloud Storage Health & Quota Watchdog (500 MB Free Tier) • Click to inspect or purge old archive"
            >
              <Cloud className="w-3 h-3 text-sky-500 shrink-0" />
              <span>{cloudMetrics?.usedMB || 18.5}/{cloudMetrics?.maxMB || 500}M</span>
            </button>
          )}

          {/* 2+ Years Local Disk Backup Hub Button */}
          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1 font-bold cursor-pointer transition ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-emerald-400 hover:bg-zinc-700' : 'bg-white border-slate-300 text-emerald-700 hover:bg-slate-100 shadow-xs'
              }`}
              title="2+ Years Local Disk Backup Hub (730+ Days Local Hard Drive Retention)"
            >
              <HardDrive className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="hidden xl:inline">Backup:</span>
              <span>730d</span>
            </button>
          )}

          {/* 1-Click Install App Badge (Hidden if already standalone desktop app) */}
          {!isAppInstalled && onInstallApp && (
            <button
              onClick={onInstallApp}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-1 font-black cursor-pointer transition uppercase ${
                isDark 
                  ? 'bg-sky-950 text-sky-300 border-sky-800 hover:bg-sky-900' 
                  : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200 shadow-xs'
              }`}
              title="Install Beta POS as native Windows Desktop App"
            >
              <Download className="w-3 h-3 text-sky-500" />
              <span>Install App</span>
            </button>
          )}

          {/* Theme Toggle (Sun / Moon) */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-1.5 rounded border flex items-center justify-center transition ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-amber-300 hover:bg-zinc-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* TVS MSP 250 Star 1-Click Print Toggle & Setup Guide */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleInstantPrint}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-1 font-bold transition cursor-pointer ${
                isInstantPrint
                  ? (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs')
                  : (isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300')
              }`}
              title="Toggle between 1-Click Instant Print (Clipper DOS speed) and Preview Modal"
            >
              <Printer className="w-3 h-3 text-emerald-500" />
              <span>TVS 250: {isInstantPrint ? 'INSTANT' : 'PREVIEW'}</span>
            </button>

            <button
              onClick={() => setIsPrinterGuideOpen(true)}
              className={`p-1 rounded border text-[10px] transition cursor-pointer ${
                isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white' : 'bg-white text-slate-600 border-slate-300 hover:text-black shadow-xs'
              }`}
              title="TVS MSP 250 Star Hardware & Windows Driver Setup Guide (Continuous Tractor Stationery)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
            </button>
          </div>

          {/* Admin Session Status & 1-Click Lock / Unlock */}
          {authenticatedRole === 'MANAGER' ? (
            <button
              onClick={onLogoutRole}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-1 font-bold cursor-pointer transition ${
                isDark 
                  ? 'bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900' 
                  : 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200 shadow-xs'
              }`}
              title="Admin Session Active (Click to Lock Counter Security)"
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Admin [Lock]</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenPasswordModal && onOpenPasswordModal('Manager Authorization', 'Enter Admin PIN to unlock management features.')}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-1 font-bold cursor-pointer transition ${
                isDark 
                  ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700' 
                  : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300 shadow-xs'
              }`}
              title="Click to enter Admin PIN and unlock manager features"
            >
              <Unlock className="w-3 h-3 text-slate-500" />
              <span>Admin Login</span>
            </button>
          )}

          {/* Clock */}
          <div className={`px-2 py-0.5 rounded border font-mono ${
            isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-slate-300 text-slate-800 shadow-sm font-bold'
          }`}>
            {currentTime}
          </div>
        </div>
      </div>

      {/* Level 2: Fast Navigation Tabs Bar */}
      <div className={`px-3 py-1 flex items-center justify-between text-xs border-b border-inherit font-mono overflow-x-auto ${
        isDark ? 'bg-zinc-950' : 'bg-slate-200/70'
      }`}>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => navigateTo('billing')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              activePage === 'billing'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sale Billing (POS)</span>
          </button>

          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 bg-purple-700 hover:bg-purple-600 text-white shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="1-Click Upload old software DATA folder or ITEMFILE.DBF & STK*.DBF"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>📁 Upload DATA / DBF</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onOpenCustomerHistory) onOpenCustomerHistory();
            }}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
              isDark ? 'hover:bg-zinc-800 text-sky-400' : 'hover:bg-slate-300 text-sky-800 font-bold'
            }`}
            title="Inspect Patient Prescription History & 1-Click Repeat Orders (F4)"
          >
            <User className="w-3.5 h-3.5 text-sky-500" />
            <span>Patient Rx History [F4]</span>
          </button>

          <button
            onClick={() => navigateTo('product-master')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              activePage === 'product-master'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Product Master (24k)</span>
          </button>

          <button
            onClick={() => navigateTo('purchases')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              activePage === 'purchases'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Purchase Entry</span>
          </button>

          <button
            onClick={() => navigateTo('expiry')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              activePage === 'expiry'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Near Expiry (Watchdog)</span>
          </button>

          <button
            onClick={() => navigateTo('batch-enquiry')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
              activePage === 'batch-enquiry'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span>Batch Enquiry</span>
          </button>

          <button
            onClick={() => navigateTo('supplier-master')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              activePage === 'supplier-master'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Suppliers (370)</span>
          </button>

          <button
            onClick={() => navigateTo('shortages')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              activePage === 'shortages'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Shortages</span>
          </button>

          <button
            onClick={() => navigateTo('due-bills')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1 ${
              activePage === 'due-bills'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-500" />
            <span>Due Bills</span>
          </button>

          <button
            onClick={() => navigateTo('distributor-payments')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1 ${
              activePage === 'distributor-payments'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
            <span>Payments</span>
          </button>

          <button
            onClick={() => navigateTo('sales-register')}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
              activePage === 'sales-register'
                ? 'bg-sky-600 text-white shadow-sm'
                : (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-300 text-slate-800')
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Sales & Margins</span>
          </button>

          <button
            onClick={() => navigateTo('admin')}
            className={`px-3 py-1 rounded text-xs font-black transition flex items-center space-x-1.5 ${
              activePage === 'admin'
                ? 'bg-purple-600 text-white shadow-sm'
                : (isDark 
                    ? 'hover:bg-purple-950/80 text-purple-300 border border-purple-900/60' 
                    : 'hover:bg-purple-100 text-purple-900 bg-purple-100/70 border border-purple-300')
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Admin HQ Portal</span>
          </button>
        </div>

        <div className={`flex items-center space-x-2 text-[10px] shrink-0 whitespace-nowrap pl-3 ${
          isDark ? 'text-zinc-400' : 'text-slate-600 font-bold'
        }`}>
          <span>Esc: Back to Billing</span>
          <span>•</span>
          <span>Alt+B: POS</span>
        </div>
      </div>

      {/* TVS MSP 250 Star Hardware & Driver Setup Modal */}
      {isPrinterGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-text">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase">TVS MSP 250 Star • Tractor Feed Setup</h3>
                  <p className="text-xs text-slate-500 font-mono">Continuous 80-Column Fanfold Hardware Protocol</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrinterGuideOpen(false)}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono leading-relaxed overflow-y-auto max-h-[75vh]">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold font-sans">✓ Continuous Stationery Dimensions Applied:</div>
                <div>App is hardcoded to <strong>210mm wide x 140mm height (8.5&quot; x 5.5&quot;)</strong>. It will stop immediately at the half-fold tear perforation without rolling an 11-inch A4 page.</div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm font-sans text-sky-600 dark:text-sky-400">
                  Step 1: Windows Printer Driver Settings (One-Time)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-700 dark:text-zinc-300">
                  <li>Open <strong>Windows Settings</strong> &rarr; <strong>Bluetooth & devices</strong> &rarr; <strong>Printers & scanners</strong>.</li>
                  <li>Click on <strong>TVS MSP 250 Star</strong> &rarr; <strong>Printing preferences</strong>.</li>
                  <li>Click <strong>Advanced</strong> or <strong>Page Setup</strong>.</li>
                  <li>Set Paper Size to: <strong>User Defined / Fanfold 8.5 x 5.5 in</strong> (Width: 210mm / 8.5in, Height: 140mm / 5.5in).</li>
                  <li>Click <strong>Apply</strong> and <strong>OK</strong>.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm font-sans text-sky-600 dark:text-sky-400">
                  Step 2: Chrome / Browser Print Dialog Settings
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-700 dark:text-zinc-300">
                  <li>In print preview, click <strong>More settings</strong>.</li>
                  <li>Set Margins to: <strong>None</strong>.</li>
                  <li>Check <strong>Background graphics</strong>.</li>
                  <li>Ensure Destination is set to <strong>TVS MSP 250 Star</strong>.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-sm font-sans text-emerald-600 dark:text-emerald-400">
                  Step 3: Instant 1-Click Print (Clipper POS Speed)
                </div>
                <p className="text-slate-700 dark:text-zinc-300">
                  When <strong>TVS 250: INSTANT</strong> is toggled ON in the top menu, pressing <strong>Print Bill (*+)</strong> or <strong>F5</strong> in sales billing will automatically print directly without displaying the in-app preview modal!
                </p>
              </div>
            </div>

            <div className={`px-5 py-3 border-t flex justify-end ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setIsPrinterGuideOpen(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
