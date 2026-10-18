import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Terminal, 
  Building2, 
  ShoppingCart, 
  Package, 
  FileText, 
  CreditCard, 
  Store, 
  AlertTriangle, 
  Clock, 
  Printer, 
  PlusCircle, 
  Sun, 
  Moon, 
  Layers, 
  Upload, 
  ArrowRight, 
  CheckCircle2, 
  Share2, 
  Zap,
  Repeat
} from 'lucide-react';
import { fuzzySearchMedicines } from '../utils/fuzzySearch';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  onNavigate,
  medicines = [],
  onDirectAddMedicine,
  onReprintLastBill,
  onOpenNewMedModal,
  onOpenSalesReturn,
  onOpenShiftModal,
  onOpenInvoiceImport,
  onToggleTheme,
  theme,
  density,
  onToggleDensity,
  onTriggerSync
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const defaultActions = useMemo(() => [
    // Pages Navigation
    { id: 'nav-billing', title: 'Sale Counter (Fast Billing)', category: 'Navigation', icon: Terminal, action: () => onNavigate('billing'), hint: 'Esc' },
    { id: 'nav-admin', title: 'Admin HQ Executive Portal', category: 'Navigation', icon: Building2, action: () => onNavigate('admin'), hint: 'Ctrl+H' },
    { id: 'nav-purchases', title: 'Purchase Entry (Stock Inward)', category: 'Navigation', icon: ShoppingCart, action: () => onNavigate('purchases') },
    { id: 'nav-catalog', title: 'Product Catalog Master', category: 'Navigation', icon: Package, action: () => onNavigate('product-master') },
    { id: 'nav-sales-reg', title: 'Daily Sales Register & Cash Tally', category: 'Navigation', icon: FileText, action: () => onNavigate('sales-register') },
    { id: 'nav-udhaar', title: 'Customer Credit Ledger (Khata)', category: 'Navigation', icon: CreditCard, action: () => onNavigate('due-bills') },
    { id: 'nav-multistore', title: 'Multi-Store Inventory Radar', category: 'Navigation', icon: Store, action: () => onNavigate('radar') },
    { id: 'nav-expiry', title: 'Expiry & Near-Expiry Batches', category: 'Navigation', icon: AlertTriangle, action: () => onNavigate('expiry') },
    { id: 'nav-shortages', title: 'Shortages & Reorder Radar', category: 'Navigation', icon: Layers, action: () => onNavigate('shortages') },
    { id: 'nav-batch-enq', title: 'Batch & Lot Inward Enquiry', category: 'Navigation', icon: Package, action: () => onNavigate('batch-enquiry') },
    { id: 'nav-payables', title: 'Distributor Payments & Bills', category: 'Navigation', icon: FileText, action: () => onNavigate('distributor-payments') },
    { id: 'nav-import', title: 'Import Distributor Purchase Invoice (CSV/XLSX)', category: 'Navigation', icon: Upload, action: onOpenInvoiceImport },

    // Counter Actions
    { id: 'act-reprint', title: 'Reprint Last Completed Bill (F7)', category: 'Quick Action', icon: Printer, action: onReprintLastBill, hint: 'F7' },
    { id: 'act-return', title: 'Sales Return & Credit Note (F8)', category: 'Quick Action', icon: Repeat, action: onOpenSalesReturn, hint: 'F8' },
    { id: 'act-new-med', title: 'Add New Medicine to Catalog', category: 'Quick Action', icon: PlusCircle, action: onOpenNewMedModal },
    { id: 'act-shift', title: 'Cashier Shift Handover & Drawer Audit', category: 'Quick Action', icon: Clock, action: onOpenShiftModal },
    { id: 'act-density', title: `Toggle Table Density (${density === 'compact' ? 'Switch to Comfortable' : 'Switch to Speed Compact'})`, category: 'Quick Action', icon: Layers, action: onToggleDensity },
    { id: 'act-theme', title: `Toggle Theme (${theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'})`, category: 'Quick Action', icon: theme === 'dark' ? Sun : Moon, action: onToggleTheme },
    { id: 'act-sync', title: 'Trigger Supabase Background Delta Sync', category: 'Quick Action', icon: Zap, action: onTriggerSync }
  ], [onNavigate, onReprintLastBill, onOpenSalesReturn, onOpenNewMedModal, onOpenShiftModal, onToggleDensity, density, onToggleTheme, theme, onTriggerSync, onOpenInvoiceImport]);

  // Dynamic search results: Filter actions + medicine search
  const filteredItems = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return defaultActions;

    // 1. Filtered actions
    const matchedActions = defaultActions.filter(item => 
      item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );

    // 2. Search medicines
    const matchedMeds = fuzzySearchMedicines(medicines, q, 'stock_shop1', 6).map(m => ({
      id: `med-${m.code}`,
      title: `${m.name} (R-${m.rack})`,
      subtitle: `${m.generic || m.company} • MRP ₹${m.mrp.toFixed(2)} • Main: ${m.stock_shop1 || 0}s`,
      category: 'Medicine Quick Add',
      icon: Package,
      action: () => {
        if (onDirectAddMedicine) {
          onNavigate('billing');
          onDirectAddMedicine(m);
        }
      }
    }));

    return [...matchedActions, ...matchedMeds];
  }, [query, defaultActions, medicines, onDirectAddMedicine, onNavigate]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-20 p-4 font-sans animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className={`p-3.5 border-b flex items-center space-x-3 ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <Search className="w-5 h-5 text-sky-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, pages, actions, or medicines (Type to filter)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
              theme === 'dark' ? 'text-white placeholder-zinc-500' : 'text-slate-950 placeholder-slate-400'
            }`}
          />
          <kbd className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold ${
            theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-slate-300 text-slate-500'
          }`}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or medicines found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const IconComp = item.icon || Terminal;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs font-semibold ${
                    isSelected
                      ? (theme === 'dark' ? 'bg-sky-950/80 text-sky-200' : 'bg-sky-100 text-sky-950')
                      : (theme === 'dark' ? 'hover:bg-zinc-800/60 text-zinc-300' : 'hover:bg-slate-100 text-slate-700')
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`p-1.5 rounded-lg ${
                      isSelected 
                        ? 'bg-sky-500 text-white shadow-xs' 
                        : (theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600')
                    }`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold flex items-center space-x-2">
                        <span>{item.title}</span>
                        {item.category === 'Medicine Quick Add' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-300">
                            + ADD TO BILL
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                      theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-slate-200 text-slate-500'
                    }`}>
                      {item.category}
                    </span>
                    {item.hint && (
                      <kbd className="text-[10px] font-mono text-sky-600 font-bold">
                        {item.hint}
                      </kbd>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 opacity-40 ${isSelected ? 'opacity-100' : ''}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Key Hints */}
        <div className={`p-2.5 px-4 border-t flex items-center justify-between text-[11px] font-mono select-none ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center space-x-4">
            <span><kbd className="font-bold">↑↓</kbd> Navigate</span>
            <span><kbd className="font-bold">↵</kbd> Select</span>
            <span><kbd className="font-bold">Esc</kbd> Close</span>
          </div>
          <span className="text-[10px] font-bold text-sky-600">
            Universal Spotlight (Ctrl+K)
          </span>
        </div>
      </div>
    </div>
  );
}
