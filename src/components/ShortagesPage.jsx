import React, { useState, useMemo } from 'react';
import { ArrowLeft, PackageCheck, AlertCircle, ShoppingCart, Search } from 'lucide-react';

export default function ShortagesPage({ theme, medicines, onBackToBilling }) {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');

  // All shortages without 50 cap (Step 7)
  const allShortages = useMemo(() => {
    return (medicines || []).filter(m => (m.stock_shop1 || 0) <= (m.ro_level || 5));
  }, [medicines]);

  // Filtered shortages based on user search
  const filteredShortages = useMemo(() => {
    if (!searchTerm.trim()) return allShortages;
    const q = searchTerm.toLowerCase();
    return allShortages.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.company && m.company.toLowerCase().includes(q)) ||
      (m.rack && String(m.rack).toLowerCase().includes(q))
    );
  }, [allShortages, searchTerm]);

  const handleGenerateOrder = () => {
    const listToExport = filteredShortages.length > 0 ? filteredShortages : allShortages;
    if (listToExport.length === 0) {
      alert('No shortage items below re-order level.');
      return;
    }
    const headers = ['Sr', 'Product Name', 'Salt', 'Shelf Rack', 'Company', 'Current Stock', 'Re-Order Level', 'Suggested Order Units', 'Est PTR Cost'];
    const rows = listToExport.map((med, idx) => {
      const stock = med.stock_shop1 || 0;
      const roLevel = med.ro_level || 5;
      const suggested = Math.max(10, roLevel * 2 - stock);
      const cost = (med.ptr || med.mrp * 0.78) * (suggested / (med.per || 10));
      return [
        idx + 1,
        `"${med.name}"`,
        `"${med.generic || ''}"`,
        `"${med.rack || 'GN'}"`,
        `"${med.company || ''}"`,
        stock,
        roLevel,
        suggested,
        cost.toFixed(2)
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_Order_Draft_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Purchase Order Draft exported with ${listToExport.length} shortage items!`);
  };

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
                {filteredShortages.length} / {allShortages.length} Shortages
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Medicines that need immediate purchase orders to avoid lost counter sales
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search shortages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs font-mono font-semibold focus:outline-hidden ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <button 
            onClick={handleGenerateOrder}
            className="py-2 px-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg text-xs flex items-center space-x-1.5 shadow"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Generate Supplier Order List</span>
          </button>
        </div>
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
            {filteredShortages.map((med, idx) => {
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
            {filteredShortages.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-bold text-sm">
                  ✓ All stock levels are healthy. No items currently below re-order threshold.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
