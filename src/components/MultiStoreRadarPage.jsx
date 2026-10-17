import React, { useState } from 'react';
import { Building2, Search, ArrowLeft, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

export default function MultiStoreRadarPage({ theme, medicines, onBackToBilling }) {
  const [search, setSearch] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(null);

  const filtered = search.trim() === ''
    ? medicines.slice(0, 50)
    : medicines.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          (m.generic && m.generic.toLowerCase().includes(q)) ||
          (m.company && m.company.toLowerCase().includes(q)) ||
          m.rack.toLowerCase().includes(q)
        );
      }).slice(0, 60);

  const handleTransfer = (med, fromShop, toShop, qty = 5) => {
    const trNumber = `TR-${Date.now().toString().slice(-6)}`;
    const note = {
      id: trNumber,
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      medicineName: med.name,
      medCode: med.code,
      fromBranch: fromShop,
      toBranch: toShop,
      qty,
      status: 'DISPATCHED'
    };
    try {
      const existing = JSON.parse(localStorage.getItem('beta_pharma_transfer_notes') || '[]');
      localStorage.setItem('beta_pharma_transfer_notes', JSON.stringify([note, ...existing]));
    } catch (e) {}
    setTransferSuccess(`Inter-store Transfer Note Created: ${qty} strips of ${med.name} moving from ${fromShop} to ${toShop}. Voucher #${trNumber} generated.`);
    setTimeout(() => setTransferSuccess(null), 5000);
  };

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
            className={`p-1.5 rounded-lg border transition ${
              theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-200' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-sm'
            }`}
            title="Back to Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                Multi-Store Batch & Inventory Radar
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                Network Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 font-mono mt-0.5 font-medium">
              Live stock visibility across pharmacy locations • Zero inventory dead loss
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine, salt, or rack across all shops..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
                : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
            }`}
          />
        </div>
      </div>

      {transferSuccess && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-mono font-bold flex items-center space-x-2 shadow">
          <CheckCircle2 className="w-4 h-4" />
          <span>{transferSuccess}</span>
        </div>
      )}

      {/* Radar Comparison Table */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              theme === 'dark' 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300' 
                : 'bg-slate-200 border-slate-300 text-slate-900'
            }`}>
              <th className="py-2.5 px-3 border-r border-inherit">Product Name & Salt</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Rack</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-24">M.R.P.</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-48 font-black">
                Beta Pharmacy (Main)
              </th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-48 font-black">
                Beta Polyclinic
              </th>
              <th className="py-2.5 px-3 text-center w-36">Inter-Store Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filtered.map((med, idx) => (
              <tr 
                key={idx}
                className={`transition-colors border-b ${
                  theme === 'dark' 
                    ? 'border-zinc-800 hover:bg-zinc-900' 
                    : 'border-slate-300 hover:bg-sky-50/60'
                }`}
              >
                <td className="py-2.5 px-3 font-sans border-r border-inherit">
                  <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                    {med.name}
                  </div>
                  <div className={`text-[11px] font-mono font-bold mt-0.5 ${theme === 'dark' ? 'text-sky-300' : 'text-sky-800'}`}>
                    {med.generic || med.company}
                  </div>
                </td>

                <td className="py-2.5 px-3 text-center border-r border-inherit">
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-300 px-2 py-0.5 rounded font-black text-xs border border-amber-300">
                    R-{med.rack}
                  </span>
                </td>

                <td className={`py-2.5 px-3 text-right font-black border-r border-inherit ${
                  theme === 'dark' ? 'text-white' : 'text-slate-950'
                }`}>
                  ₹{med.mrp.toFixed(2)}
                </td>

                {/* Beta Pharmacy (Shop 1) */}
                <td className="py-2.5 px-3 text-center border-r border-inherit">
                  <span className={`px-2.5 py-0.5 rounded font-black text-xs ${
                    med.stock_shop1 > 0 
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-950 border border-rose-400 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {med.stock_shop1} strips
                  </span>
                </td>

                {/* Beta Polyclinic (Shop 2) */}
                <td className="py-2.5 px-3 text-center border-r border-inherit">
                  <span className={`px-2 py-0.5 rounded font-black text-xs ${
                    med.stock_shop2 > 0 
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'text-slate-400 font-bold'
                  }`}>
                    {med.stock_shop2} strips
                  </span>
                </td>

                {/* Action */}
                <td className="py-2.5 px-3 text-center">
                  {med.stock_shop1 <= 0 && med.stock_shop2 > 0 ? (
                    <button
                      onClick={() => handleTransfer(med, 'Beta Polyclinic', 'Beta Pharmacy', 5)}
                      className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded text-xs flex items-center space-x-1 mx-auto shadow"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Pull Stock</span>
                    </button>
                  ) : med.stock_shop2 <= 0 && med.stock_shop1 > 0 ? (
                    <button
                      onClick={() => handleTransfer(med, 'Beta Pharmacy', 'Beta Polyclinic', 5)}
                      className="py-1 px-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded text-xs flex items-center space-x-1 mx-auto shadow"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Push Stock</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px] font-bold">Balanced</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
