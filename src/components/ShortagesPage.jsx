import React from 'react';
import { ArrowLeft, PackageCheck, AlertCircle, ShoppingCart } from 'lucide-react';

export default function ShortagesPage({ theme, medicines, onBackToBilling }) {
  const isDark = theme === 'dark';
  const shortages = (medicines || []).filter(m => (m.stock_shop1 || 0) <= (m.ro_level || 5)).slice(0, 50);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1 ${
              isDark 
                ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' 
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 shadow-sm'
            }`}
            title="Back to Sale Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-mono font-bold">Billing (Esc)</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Stock Shortages & Products Below Re-Order Level [MAS009 / SHORTAGE.DBF]
              </h2>
              <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded border ${
                isDark 
                  ? 'bg-rose-950 text-rose-300 border-rose-800' 
                  : 'bg-rose-100 text-rose-950 border-rose-300'
              }`}>
                Critical Replenishment
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Medicines that need immediate purchase orders to avoid lost counter sales
            </p>
          </div>
        </div>

        <button 
          onClick={() => alert('Purchase Order Draft generated for Kannur / Thalassery Drug Houses!')}
          className="py-2 px-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg text-xs flex items-center space-x-1.5 shadow"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Generate Supplier Order List</span>
        </button>
      </div>

      {/* Shortages Table */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          isDark ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-200 border-slate-300 text-slate-950'
            }`}>
              <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
              <th className="py-2.5 px-3 border-r border-inherit">Product Name & Salt</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Shelf Rack</th>
              <th className="py-2.5 px-3 border-r border-inherit">Manufacturer</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Current Stock</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Re-Order Level</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Suggested Order</th>
              <th className="py-2.5 px-3 text-right w-28">Estimated Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {shortages.map((med, idx) => {
              const stock = med.stock_shop1 || 0;
              const roLevel = med.ro_level || 5;
              const suggested = Math.max(10, roLevel * 2 - stock);
              const cost = (med.ptr || med.mrp * 0.78) * (suggested / (med.per || 10));

              return (
                <tr 
                  key={idx}
                  className={`transition-colors border-b ${
                    isDark ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-rose-50/50 border-slate-300'
                  }`}
                >
                  <td className={`py-2.5 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-sans border-r border-inherit">
                    <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {med.name}
                    </div>
                    <div className={`text-[11px] font-mono font-bold mt-0.5 ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
                      {med.generic || med.company}
                    </div>
                  </td>

                  {/* Lit Shelf Rack Pill (Electric Cyan / Sky Blue) */}
                  <td className="py-2.5 px-3 text-center border-r border-inherit">
                    <span className={`px-2.5 py-0.5 rounded font-black text-xs border shadow-xs inline-block ${
                      isDark 
                        ? 'bg-sky-950/80 text-sky-300 border-sky-600' 
                        : 'bg-sky-50 text-sky-800 border-sky-300'
                    }`}>
                      R-{med.rack || 'GN'}
                    </span>
                  </td>

                  <td className={`py-2.5 px-3 font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-200' : 'text-slate-800'
                  }`}>
                    {med.company || 'Standard Pharma'}
                  </td>

                  {/* Current Stock Pill */}
                  <td className="py-2.5 px-3 text-center border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded font-black text-xs border shadow-xs inline-block ${
                      stock === 0 
                        ? (isDark ? 'bg-rose-950/80 text-rose-300 border-rose-600 font-bold' : 'bg-rose-50 text-rose-700 border-rose-300 font-bold')
                        : (isDark ? 'bg-amber-950/80 text-amber-300 border-amber-600' : 'bg-amber-50 text-amber-800 border-amber-300')
                    }`}>
                      {stock} in stock
                    </span>
                  </td>

                  <td className={`py-2.5 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-200' : 'text-slate-900'
                  }`}>
                    {roLevel} units
                  </td>

                  <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                    +{suggested} units
                  </td>

                  <td className={`py-2.5 px-3 text-right font-black ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    ₹{cost.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
