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
  User
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
  onOpenCustomerHistory
}) {
  const isDark = theme === 'dark';
  const [openDropdown, setOpenDropdown] = useState(null);

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
          {/* Pharmacy Identity & Physical Store Branch Selector */}
          <div className="flex items-center space-x-2">
            <span className="font-black text-sm tracking-wider text-sky-600 font-mono">BETA PHARMACY</span>
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border text-[11px] font-mono font-bold ${
              isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-300' : 'bg-white border-slate-300 text-slate-800 shadow-xs'
            }`}>
              <Building2 className="w-3 h-3 text-sky-500" />
              <select
                value={activeBranch?.id || 'MAIN'}
                onChange={(e) => onSelectBranch && onSelectBranch(e.target.value)}
                className={`bg-transparent border-0 cursor-pointer focus:outline-none font-bold text-[11px] ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
                title="Configure Shop Branch for this Machine"
              >
                {availableBranches.map(b => (
                  <option key={b.id} value={b.id} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-950'}>
                    {b.name} ({b.location}) • Counter 01
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-slate-400">|</span>

          {/* Traditional Software Menu Dropdowns */}
          <div className="flex items-center space-x-1 font-medium">
            {/* Masters */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('masters')}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 ${
                  ['product-master', 'supplier-master', 'company-master', 'tax-master', 'doctor-master'].includes(activePage) || openDropdown === 'masters'
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
                    onClick={() => navigateTo('doctor-master')} 
                    className="w-full text-left px-3 py-1.5 hover:bg-sky-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Doctor & Hospital Master [MAS007]</span>
                    <span className="text-[10px] font-mono opacity-70">1.3k</span>
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
          {/* Active Cashier Shift & Handover Button */}
          <div className="flex items-center space-x-1">
            <div className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1.5 font-bold ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-white border-slate-300 text-slate-800 shadow-xs'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-500 text-[10px]">CASHIER:</span>
              <select
                value={activeShift?.staffName || (staffList[0] || 'Rahul C')}
                onChange={(e) => onSelectActiveStaff && onSelectActiveStaff(e.target.value)}
                className={`font-black bg-transparent border-0 cursor-pointer focus:outline-none text-[11px] ${
                  isDark ? 'text-white' : 'text-slate-950 font-black'
                }`}
                title="Select cashier on counter"
              >
                {staffList.map((s, idx) => (
                  <option key={idx} value={s} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-slate-950'}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenShiftModal}
              className={`px-2 py-1 rounded border text-[10px] font-black uppercase transition shadow-xs cursor-pointer ${
                isDark 
                  ? 'bg-sky-950 text-sky-300 border-sky-800 hover:bg-sky-900' 
                  : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200'
              }`}
              title="Click to perform cash drawer audit and shift handover"
            >
              Handover
            </button>
          </div>

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



          {/* Cloud Sync Status Indicator */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-2.5 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1.5 cursor-pointer transition ${
              isOffline
                ? (isDark 
                    ? 'bg-amber-950 text-amber-300 border-amber-800' 
                    : 'bg-amber-100 text-amber-900 border-amber-300')
                : (isDark 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300')
            }`}
            title="Click to simulate offline / online sync"
          >
            {isOffline ? (
              <>
                <WifiOff className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>OFFLINE (Local)</span>
              </>
            ) : (
              <>
                <Wifi className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>CLOUD SYNC: ACTIVE</span>
              </>
            )}
          </button>

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
    </div>
  );
}
