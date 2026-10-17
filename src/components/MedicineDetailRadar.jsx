import React from 'react';
import { Repeat } from 'lucide-react';

export default function MedicineDetailRadar({ selectedMed, theme, onOpenSubstitutes, activeBranch }) {
  const isDark = theme === 'dark';
  const stockKey = activeBranch?.stockKey || 'stock_shop1';

  if (!selectedMed) {
    return (
      <div className={`border-t p-2.5 flex items-center justify-between text-xs select-none transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-800'
      }`}>
        <div className="flex items-center space-x-2 font-mono">
          <span className="font-black px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px]">
            RADAR
          </span>
          <span className={`font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            Click any row or search to inspect Shelf Location, Salt Composition, and Multi-Store Stock Radar.
          </span>
        </div>
        <div className="text-slate-500 font-mono text-[11px] font-bold">
          Type medicine name above (e.g. PAC, AUG, EQCEF) • Press F3 for Active Salt Substitutes
        </div>
      </div>
    );
  }

  const currentStock = selectedMed[stockKey] !== undefined ? selectedMed[stockKey] : (selectedMed.stock_shop1 || 0);
  const isOut = currentStock <= 0;

  return (
    <div className={`border-t p-2.5 select-none text-xs transition-colors ${
      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-100 border-slate-300 text-slate-900'
    }`}>
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Left: Product & Salt Identity */}
        <div className="col-span-4">
          <div className="flex items-center space-x-2">
            <span className={`font-black text-sm tracking-wide ${
              isDark ? 'text-white' : 'text-slate-950'
            }`}>
              {selectedMed.name}
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              isDark ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-slate-200 text-slate-900 border border-slate-300'
            }`}>
              {selectedMed.group_label || 'TAB'}
            </span>
            {selectedMed.schedule && selectedMed.schedule !== 'Normal' && (
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDark ? 'bg-violet-950 text-violet-300 border-violet-700' : 'bg-violet-100 text-violet-900 border-violet-300'
              }`}>
                Sched {selectedMed.schedule}
              </span>
            )}
          </div>
          <div className={`text-[11px] font-mono font-bold mt-0.5 truncate ${
            isDark ? 'text-sky-300' : 'text-sky-800'
          }`}>
            {selectedMed.generic ? selectedMed.generic : selectedMed.company}
          </div>
        </div>

        {/* Center-Left: Physical Shelf Location (Lit Electric Cyan) */}
        <div className={`col-span-2 flex items-center space-x-2 px-3 py-1.5 rounded-lg border shadow-xs ${
          isDark 
            ? 'bg-sky-950/80 border-sky-600 text-sky-200' 
            : 'bg-sky-50 border-sky-300 text-sky-950'
        }`}>
          <div>
            <div className="text-[9px] font-mono uppercase font-extrabold opacity-80">Shelf Location</div>
            <div className="font-black font-mono text-sm tracking-wider">
              RACK {selectedMed.rack || 'GN'}
            </div>
          </div>
        </div>

        {/* Center-Right: Pricing & Tax Info */}
        <div className="col-span-2 font-mono text-[11px]">
          <div>
            MRP: <strong className={isDark ? 'text-white' : 'text-slate-950 font-black'}>
              ₹{selectedMed.mrp ? selectedMed.mrp.toFixed(2) : '0.00'}
            </strong> / {selectedMed.per || 10}s
          </div>
          <div className={`text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            HSN: {selectedMed.hsn || '3004'} • GST: {selectedMed.gstPercent !== undefined ? selectedMed.gstPercent : (selectedMed.tax_percent || 12)}%
          </div>
        </div>

        {/* Right: Multi-Store Cross Stock Radar & Substitute Button */}
        <div className={`col-span-4 p-2 rounded-lg border flex items-center justify-between font-mono text-xs ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center space-x-3 text-[11px]">
            <div className="text-center">
              <span className="text-[9px] text-slate-500 font-bold block">{activeBranch?.id === 'POLYCLINIC' ? 'Polyclinic' : 'Beta Pharma'}</span>
              <span className={`font-black ${currentStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currentStock} strips
              </span>
            </div>
            <span className={isDark ? 'text-zinc-700' : 'text-slate-300'}>|</span>
            <div className="text-center">
              <span className="text-[9px] text-slate-500 font-bold block">
                {activeBranch?.id === 'POLYCLINIC' ? 'Beta Pharma' : 'Polyclinic'}
              </span>
              <span className={`font-bold ${
                (activeBranch?.id === 'POLYCLINIC' ? (selectedMed.stock_shop1 || 0) : (selectedMed.stock_shop2 || 0)) > 0
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}>
                {activeBranch?.id === 'POLYCLINIC' ? (selectedMed.stock_shop1 || 0) : (selectedMed.stock_shop2 || 0)} strips
              </span>
            </div>
          </div>

          {/* Quick Substitutes Launcher */}
          {onOpenSubstitutes && (
            <button
              type="button"
              onClick={() => onOpenSubstitutes(selectedMed)}
              className={`px-2 py-1 rounded text-[11px] font-black flex items-center space-x-1 transition shadow-xs border ${
                isOut 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                  : (isDark ? 'bg-sky-950 text-sky-300 border-sky-700 hover:bg-sky-900' : 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100')
              }`}
              title="Find generic & therapeutic substitutes (F3)"
            >
              <Repeat className="w-3 h-3 text-amber-200" />
              <span>{isOut ? 'Subs (F3)' : 'Substitutes'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
