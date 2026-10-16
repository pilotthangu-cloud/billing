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
  CreditCard,
  Banknote,
  Search,
  Store,
  Layers,
  Sparkles,
  Command
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
  onLogoutRole
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const isDark = theme === 'dark';

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const navigateTo = (page) => {
    setActivePage(page);
    setOpenDropdown(null);
  };

  // Primary Quick Navigation Tabs (2026 Sleek Segmented Controller)
  const primaryTabs = [
    { id: 'billing', label: 'Counter POS', icon: ShoppingCart, hotkey: 'F1' },
    { id: 'purchases', label: 'Inward Purchase', icon: Truck, hotkey: 'F5', lock: !authenticatedRole },
    { id: 'expiry', label: 'Near Expiry', icon: AlertTriangle, hotkey: 'F6', badge: '1.1k', badgeColor: 'bg-rose-500 text-white' },
    { id: 'shortages', label: 'Shortages', icon: Package, hotkey: 'F7', badge: '476', badgeColor: 'bg-amber-500 text-white' },
    { id: 'radar', label: 'Multi-Store', icon: Store, hotkey: 'F8' }
  ];

  return (
    <header className={`px-4 py-2 border-b select-none transition-colors z-40 relative ${
      isDark ? 'bg-zinc-900 border-zinc-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      <div className="flex items-center justify-between gap-3">
        {/* Brand & Store Identity */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 font-black text-sm">
            B
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className={`font-black text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Beta Pharmacy
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isDark ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-sky-50 text-sky-900 border border-sky-200'
              }`}>
                Counter 01 • Main
              </span>
            </div>
            <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'} font-medium`}>
              Chirakkara, Thalassery • Sadanada Pai Rd
            </p>
          </div>
        </div>

        {/* 2026 Segmented Navigation Controller */}
        <nav className="hidden lg:flex items-center space-x-1 p-1 rounded-xl border transition ${
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-100/90 border-slate-200'
        }">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : isDark 
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60' 
                      : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : (isDark ? 'text-zinc-500' : 'text-slate-500')}`} />
                <span>{tab.label}</span>
                {tab.lock && <Lock className="w-2.5 h-2.5 opacity-70 text-amber-500 ml-0.5" />}
                {tab.badge && (
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                  isActive ? 'bg-white/20 text-white' : (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-200 text-slate-500')
                }`}>
                  {tab.hotkey}
                </span>
              </button>
            );
          })}

          {/* More Masters & Ledgers Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('more')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                ['product-master', 'supplier-master', 'due-bills', 'distributor-payments', 'sales-register'].includes(activePage) || openDropdown === 'more'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : isDark 
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <span>More Modules</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'more' && (
              <div className={`absolute left-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border z-50 p-1.5 font-sans divide-y ${
                isDark ? 'bg-zinc-900 border-zinc-700 divide-zinc-800 text-white' : 'bg-white border-slate-200 divide-slate-100 text-slate-900'
              }`}>
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Catalogs & Masters
                  </div>
                  <button 
                    onClick={() => navigateTo('product-master')} 
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                      <span>Product Master Catalog</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">24.6k</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('supplier-master')} 
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Distributor Agencies</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">370</span>
                  </button>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Ledgers & Accounts
                  </div>
                  <button 
                    onClick={() => navigateTo('due-bills')} 
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                      <span>Customer Due Bills</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-500">DUEBILL</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('distributor-payments')} 
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Distributor Payments & Cheques</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">PAYMENTS</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('sales-register')} 
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                      <span>Daily Sales Register & Margins</span>
                    </span>
                    {!authenticatedRole && <Lock className="w-3 h-3 text-amber-500" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right Cockpit Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick + Add Medicine Modal Button */}
          <button
            onClick={onOpenNewMedModal}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition ${
              isDark 
                ? 'bg-zinc-800 border-zinc-700 text-sky-400 hover:bg-zinc-700' 
                : 'bg-slate-100 border-slate-200 text-sky-700 hover:bg-slate-200 shadow-xs'
            }`}
            title="Add a new medicine to Master Catalog"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">+ Medicine</span>
          </button>

          {/* Dedicated Owner Admin HQ Button */}
          <button
            onClick={() => navigateTo('admin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition shadow-xs ${
              activePage === 'admin'
                ? 'bg-purple-600 text-white shadow-purple-600/30'
                : isDark
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800 hover:bg-purple-900'
                  : 'bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200'
            }`}
            title="Open Multi-Pharmacy Owner Admin HQ Portal"
          >
            <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Admin HQ</span>
          </button>

          {/* Security Role Pill (Clipper CC / DD) */}
          {authenticatedRole ? (
            <button
              onClick={onLogoutRole}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center space-x-1.5 transition ${
                authenticatedRole === 'MANAGER'
                  ? (isDark ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-900')
                  : (isDark ? 'bg-sky-950 border-sky-800 text-sky-300' : 'bg-sky-50 border-sky-300 text-sky-900')
              }`}
              title="Session Authenticated. Click to lock session."
            >
              <Unlock className="w-3 h-3 text-emerald-600" />
              <span>{authenticatedRole === 'MANAGER' ? 'Manager (CC)' : 'Staff (DD)'}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenPasswordModal('Manager Authorization', 'Enter 2-character security PIN (CC or DD) to unlock protected modules.')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Click to authenticate as Manager or Staff"
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Unlock PIN</span>
            </button>
          )}

          {/* Offline / Online Sync Pill */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition ${
              isOffline
                ? (isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-900 border-amber-300')
                : (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-900 border-emerald-300')
            }`}
            title="Click to simulate offline / online status"
          >
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="hidden md:inline">{isOffline ? 'Local Mode' : 'Cloud Sync Live'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition ${
              isDark 
                ? 'bg-zinc-800 border-zinc-700 text-amber-300 hover:bg-zinc-700' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-xs'
            }`}
            title="Toggle Light / Dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Realtime Clock */}
          <div className={`hidden sm:flex px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold ${
            isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}>
            {currentTime}
          </div>
        </div>
      </div>
    </header>
  );
}
