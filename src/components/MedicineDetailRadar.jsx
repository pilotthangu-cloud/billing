import React from 'react';

export default function MedicineDetailRadar({ selectedMed, theme }) {
  if (!selectedMed) {
    return (
      <div className={`border-t p-2.5 flex items-center justify-between text-xs select-none transition-colors ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-800'
      }`}>
        <div className="flex items-center space-x-2 font-mono">
          <span className="font-black px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px]">
            INSPECTOR
          </span>
          <span className="font-bold text-slate-700 dark:text-zinc-300">
            Click any row or search to inspect Shelf Location, Salt Composition, and Multi-Store Stock Radar.
          </span>
        </div>
        <div className="text-slate-500 font-mono text-[11px] font-bold">
          Type medicine name above (e.g. PAC, AUG, EQCEF)
        </div>
      </div>
    );
  }

  const currentStock = selectedMed.stock_shop1 || 0;

  return (
    <div className={`border-t p-2.5 select-none text-xs transition-colors ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-100 border-slate-300 text-slate-900'
    }`}>
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Left: Product & Salt Identity */}
        <div className="col-span-4">
          <div className="flex items-center space-x-2">
            <span className={`font-black text-sm tracking-wide ${
              theme === 'dark' ? 'text-white' : 'text-slate-950'
            }`}>
              {selectedMed.name}
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              theme === 'dark' ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-slate-200 text-slate-900 border border-slate-300'
            }`}>
              {selectedMed.group_label}
            </span>
            {selectedMed.schedule && selectedMed.schedule !== 'Normal' && (
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-purple-900 text-purple-200">
                Sched {selectedMed.schedule}
              </span>
            )}
          </div>
          <div className={`text-[11px] font-mono font-bold mt-0.5 truncate ${
            theme === 'dark' ? 'text-sky-300' : 'text-sky-800'
          }`}>
            {selectedMed.generic ? selectedMed.generic : selectedMed.company}
          </div>
        </div>

        {/* Center-Left: Physical Shelf Location */}
        <div className={`col-span-2 flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-amber-950/60 border-amber-800 text-amber-200' 
            : 'bg-amber-100 border-amber-300 text-amber-950 shadow-sm'
        }`}>
          <div>
            <div className="text-[9px] font-mono uppercase font-extrabold opacity-80">Shelf Location</div>
            <div className="font-black font-mono text-sm tracking-wider">
              RACK {selectedMed.rack}
            </div>
          </div>
        </div>

        {/* Center-Right: Pricing & Tax Info */}
        <div className="col-span-2 font-mono text-[11px]">
          <div>
            MRP: <strong className={theme === 'dark' ? 'text-white' : 'text-slate-950 font-black'}>
              ₹{selectedMed.mrp ? selectedMed.mrp.toFixed(2) : '0.00'}
            </strong> / {selectedMed.per || 10}s
          </div>
          <div className="text-[10px] text-slate-600 dark:text-zinc-400 font-bold">
            HSN: {selectedMed.hsn || '3004'} • GST: {selectedMed.tax_percent || 12}%
          </div>
        </div>

        {/* Right: Multi-Store Cross Stock Radar */}
        <div className={`col-span-4 p-2 rounded-lg border flex items-center justify-between font-mono text-xs ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-300 shadow-sm'
        }`}>
          <div className="text-slate-600 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
            Stock Radar:
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <div className="text-center">
              <span className="text-[9px] text-slate-500 font-bold block">This Shop</span>
              <span className={`font-black ${currentStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {currentStock} strips
              </span>
            </div>
            <span className="text-slate-300 dark:text-zinc-700">|</span>
            <div className="text-center">
              <span className="text-[9px] text-slate-500 font-bold block">Branch B</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                {selectedMed.stock_shop2 || 0}
              </span>
            </div>
            <span className="text-slate-300 dark:text-zinc-700">|</span>
            <div className="text-center">
              <span className="text-[9px] text-slate-500 font-bold block">Branch C</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                {selectedMed.stock_shop3 || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
