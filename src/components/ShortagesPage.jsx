import React from 'react';
import { ArrowLeft, PackageCheck, AlertCircle, ShoppingCart } from 'lucide-react';

export default function ShortagesPage({ theme, medicines, onBackToBilling }) {
  const shortages = medicines.filter(m => m.stock_shop1 <= (m.ro_level || 5)).slice(0, 50);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1 ${
              theme === 'dark' ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 shadow-sm'
            }`}
            title="Back to Sale Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-mono font-bold">Billing (Esc)</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-950 dark:text-white">
                Stock Shortages & Products Below Re-Order Level
              </h2>
              <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950 dark:text-rose-200">
                Critical Replenishment
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 font-mono mt-0.5 font-medium">
              Medicines that need immediate purchase orders to avoid losing sales
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
          theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
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
              const suggested = Math.max(10, (med.ro_level || 10) * 2 - med.stock_shop1);
              const cost = (med.ptr || med.mrp * 0.78) * (suggested / (med.per || 10));

              return (
                <tr 
                  key={idx}
                  className={`transition-colors border-b ${
                    theme === 'dark' ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-rose-50/50 border-slate-300'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center font-bold text-slate-600 dark:text-zinc-400 border-r border-inherit">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-sans border-r border-inherit">
                    <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                      {med.name}
                    </div>
                    <div className={`text-[11px] font-mono font-bold mt-0.5 ${theme === 'dark' ? 'text-sky-300' : 'text-sky-800'}`}>
                      {med.generic || med.company}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-inherit">
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 px-2 py-0.5 rounded font-black text-xs border border-amber-400">
                      RACK {med.rack}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-zinc-300 border-r border-inherit">
                    {med.company}
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded font-black text-xs ${
                      med.stock_shop1 === 0 
                        ? 'bg-rose-100 text-rose-950 border border-rose-400 dark:bg-rose-950 dark:text-rose-300' 
                        : 'bg-amber-100 text-amber-950 border border-amber-400 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {med.stock_shop1} strips
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-zinc-200 border-r border-inherit">
                    {med.ro_level || 10}
                  </td>
                  <td className="py-2.5 px-3 text-center font-black text-sky-800 dark:text-sky-400 border-r border-inherit">
                    +{suggested} strips
                  </td>
                  <td className={`py-2.5 px-3 text-right font-black ${
                    theme === 'dark' ? 'text-white' : 'text-slate-950'
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
