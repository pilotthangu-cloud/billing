import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, AlertCircle, Sparkles, Building2, Layers, X, ArrowUpDown } from 'lucide-react';

export default function MedicineSearchModal({ 
  isOpen, 
  onClose, 
  onSelectMedicine, 
  medicines, 
  currentStore 
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter medicines
  const filtered = query.trim() === '' 
    ? medicines.slice(0, 50) 
    : medicines.filter(m => {
        const q = query.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.generic?.toLowerCase().includes(q) ||
          m.company?.toLowerCase().includes(q) ||
          m.code?.toLowerCase().includes(q)
        );
      }).slice(0, 60);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectMedicine(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Keep highlighted item in view
  useEffect(() => {
    if (listRef.current && listRef.current.children[selectedIndex]) {
      listRef.current.children[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-14">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[82vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center space-x-3">
          <div className="p-2 bg-sky-950 text-sky-400 rounded-lg border border-sky-800/50">
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by Medicine Name, Generic Salt, or Manufacturer (e.g. PACIMOL, AUGMENTIN, PARACETAMOL)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 font-medium text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Headers */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400 grid grid-cols-12 gap-2 select-none">
          <div className="col-span-5">Product Name & Generic Salt</div>
          <div className="col-span-2">Rack / Shelf</div>
          <div className="col-span-2">Company / Mfr</div>
          <div className="col-span-3 text-right">Stock & Multi-Branch Radar</div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto flex-1 divide-y divide-slate-800/60 font-sans text-xs">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">No medicines found matching "{query}"</p>
              <p className="text-xs text-slate-600 mt-1">Press Esc to close or try typing by Salt Name</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const currentStock = currentStore === 'shop1' 
                ? item.stock_shop1 
                : (currentStore === 'shop2' ? item.stock_shop2 : item.stock_shop3);
              
              const isOutOfStock = currentStock <= 0;
              const otherStoreTotal = (item.stock_shop1 + item.stock_shop2 + item.stock_shop3) - currentStock;

              return (
                <div
                  key={item.code + idx}
                  onClick={() => onSelectMedicine(item)}
                  className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-sky-950/90 border-l-4 border-sky-400 text-white' 
                      : 'hover:bg-slate-800/50 text-slate-200'
                  }`}
                >
                  {/* Name and Generic */}
                  <div className="col-span-5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-100">{item.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.group_label}
                      </span>
                      {item.schedule !== 'Normal' && (
                        <span className="text-[9px] font-bold px-1 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                          {item.schedule}
                        </span>
                      )}
                    </div>
                    {item.generic && (
                      <div className="text-[11px] text-sky-400/90 font-mono flex items-center space-x-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>{item.generic}</span>
                      </div>
                    )}
                  </div>

                  {/* Rack / Shelf Location */}
                  <div className="col-span-2">
                    <div className="inline-flex items-center space-x-1 font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 text-xs">
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>RACK {item.rack}</span>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="col-span-2 text-slate-400 truncate text-[11px]">
                    {item.company}
                  </div>

                  {/* Stock & Cross-Shop Radar */}
                  <div className="col-span-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="font-mono text-xs">
                        MRP: <span className="font-bold text-slate-200">₹{item.mrp.toFixed(2)}</span>
                      </span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        isOutOfStock 
                          ? 'bg-rose-950/90 text-rose-300 border border-rose-800' 
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                      }`}>
                        {currentStock} in stock
                      </span>
                    </div>

                    {/* Multi-Store Live Radar badge when this store is low or out of stock */}
                    {isOutOfStock && otherStoreTotal > 0 && (
                      <div className="mt-1 inline-flex items-center space-x-1 text-[10px] bg-slate-950/90 text-amber-400 border border-amber-600/50 px-2 py-0.5 rounded-full font-mono">
                        <Building2 className="w-3 h-3 text-amber-400" />
                        <span>
                          Available: 
                          {currentStore !== 'shop2' && item.stock_shop2 > 0 && ` Shop 2 (${item.stock_shop2})`}
                          {currentStore !== 'shop3' && item.stock_shop3 > 0 && ` Shop 3 (${item.stock_shop3})`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="bg-slate-950 p-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Enter</kbd>
              <span>Select Medicine</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Esc</kbd>
              <span>Cancel</span>
            </span>
          </div>
          <div className="text-slate-500">
            Showing {filtered.length} matches from 24,667 catalog
          </div>
        </div>
      </div>
    </div>
  );
}
