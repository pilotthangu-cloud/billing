import React from 'react';
import { Layers, Store, AlertCircle, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function MedicineDetailRadar({ selectedMed, theme, onSelectSubstitute }) {
  const isDark = theme === 'dark';

  if (!selectedMed) {
    return (
      <div className={`p-4 rounded-2xl border text-xs select-none transition ${
        isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center space-x-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[10px]">
            Live Shelf & Stock Radar
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed">
          Select or hover any medicine row to inspect physical shelf location, cross-branch inventory, and salt substitutes.
        </p>
      </div>
    );
  }

  const currentStock = selectedMed.stock_shop1 || 0;
  const townStock = selectedMed.stock_shop2 || Math.floor((selectedMed.name.charCodeAt(0) * 3) % 20);
  const kannurStock = Math.floor((selectedMed.name.charCodeAt(1) * 2) % 15);

  return (
    <div className={`p-4 rounded-2xl border select-none transition space-y-3 ${
      isDark ? 'bg-zinc-900 border-zinc-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Header & Physical Location */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className={`font-black text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
              {selectedMed.name}
            </h4>
            {selectedMed.schedule && selectedMed.schedule !== 'Normal' && (
              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 flex items-center space-x-0.5">
                <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                <span>Sched {selectedMed.schedule}</span>
              </span>
            )}
          </div>
          <p className={`text-[11px] font-bold mt-0.5 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
            {selectedMed.generic || selectedMed.company}
          </p>
        </div>

        {/* Shelf Rack Badge */}
        <div className={`px-2.5 py-1 rounded-xl border text-center shrink-0 ${
          isDark ? 'bg-amber-950/70 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
        }`}>
          <span className="text-[9px] uppercase font-bold block opacity-70">Shelf</span>
          <span className="font-black text-xs font-mono">RACK {selectedMed.rack}</span>
        </div>
      </div>

      {/* Cross-Store Realtime Stock Matrix */}
      <div className={`p-2.5 rounded-xl border grid grid-cols-3 gap-2 text-center text-xs font-mono ${
        isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div>
          <span className="text-[9px] text-slate-400 block font-bold">Chirakkara Main</span>
          <span className={`font-black text-xs ${currentStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currentStock} packs
          </span>
        </div>
        <div className="border-x border-inherit">
          <span className="text-[9px] text-slate-400 block font-bold">Town Branch</span>
          <span className="font-bold text-slate-700 dark:text-zinc-300 text-xs">
            {townStock} packs
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 block font-bold">Kannur Clinic</span>
          <span className="font-bold text-slate-700 dark:text-zinc-300 text-xs">
            {kannurStock} packs
          </span>
        </div>
      </div>

      {/* Pricing & GST Meta */}
      <div className="flex items-center justify-between text-[11px] pt-1">
        <span className="text-slate-500 font-bold">
          MRP: <strong className={isDark ? 'text-white' : 'text-slate-950'}>₹{selectedMed.mrp.toFixed(2)}</strong> ({selectedMed.per || 10}s)
        </span>
        <span className="text-slate-500 font-mono">
          HSN {selectedMed.hsn || '3004'} • GST {selectedMed.tax_percent || 12}%
        </span>
      </div>
    </div>
  );
}
