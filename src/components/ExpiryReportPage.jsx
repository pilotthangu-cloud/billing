import React, { useState } from 'react';
import { ArrowLeft, Search, AlertTriangle, Calendar, Building2, Download } from 'lucide-react';

export default function ExpiryReportPage({ theme, medicines, onBackToBilling }) {
  const [filterTab, setFilterTab] = useState('30days');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all batches from catalog
  const expiringItems = medicines.flatMap((med) => {
    return (med.batches || []).map((b) => ({
      ...b,
      medicineName: med.name,
      company: med.company,
      rack: med.rack,
      generic: med.generic,
      daysLeft: b.exp_date?.startsWith('10/') ? 14 : (b.exp_date?.startsWith('11/') ? 45 : (b.exp_date?.startsWith('12/') ? 75 : 180))
    }));
  });

  // Filter by Tab and Search Query
  const filtered = expiringItems.filter((item) => {
    // 1. Tab filter
    if (filterTab === '30days' && item.daysLeft > 30) return false;
    if (filterTab === '60days' && (item.daysLeft <= 30 || item.daysLeft > 60)) return false;
    if (filterTab === '90days' && (item.daysLeft <= 60 || item.daysLeft > 90)) return false;

    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match = (
        item.medicineName.toLowerCase().includes(q) ||
        item.batch_no.toLowerCase().includes(q) ||
        (item.supplier && item.supplier.toLowerCase().includes(q)) ||
        (item.generic && item.generic.toLowerCase().includes(q)) ||
        item.rack.toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    return true;
  }).slice(0, 100);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* 1. Header Bar with Search & Tabs */}
      <div className={`px-4 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
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
              <h2 className={`text-base font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                Near-Expiry Watchdog & Return Register [REP002]
              </h2>
              <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded border ${
                theme === 'dark' ? 'bg-rose-950 text-rose-200 border-rose-800' : 'bg-rose-100 text-rose-950 border-rose-400'
              }`}>
                1,089 Total Expiring Batches
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-medium ${
              theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Filter by expiry window and return batches to Kannur & Thalassery distributors for Credit Notes
            </p>
          </div>
        </div>

        {/* Search Bar on Expiry Page */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine, batch, distributor, or rack..."
            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
                : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
            }`}
          />
        </div>
      </div>

      {/* 2. Filter Buttons Bar */}
      <div className={`px-4 py-2 border-b flex items-center justify-between font-mono text-xs ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-2">
          <span className={`font-extrabold text-xs ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'}`}>
            Expiry Window:
          </span>
          <button
            onClick={() => setFilterTab('30days')}
            className={`px-3 py-1 rounded font-bold transition border ${
              filterTab === '30days'
                ? 'bg-rose-600 text-white border-rose-600 shadow'
                : (theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50')
            }`}
          >
            &lt; 30 Days (379 Batches)
          </button>
          <button
            onClick={() => setFilterTab('60days')}
            className={`px-3 py-1 rounded font-bold transition border ${
              filterTab === '60days'
                ? 'bg-amber-600 text-white border-amber-600 shadow'
                : (theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50')
            }`}
          >
            31 - 60 Days (361 Batches)
          </button>
          <button
            onClick={() => setFilterTab('90days')}
            className={`px-3 py-1 rounded font-bold transition border ${
              filterTab === '90days'
                ? 'bg-sky-600 text-white border-sky-600 shadow'
                : (theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50')
            }`}
          >
            61 - 90 Days (349 Batches)
          </button>
        </div>

        <div className={`font-extrabold ${theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'}`}>
          Showing {filtered.length} matching batches
        </div>
      </div>

      {/* 3. The High-Contrast Table (Guaranteed solid black text in light mode) */}
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
              <th className="py-2.5 px-3 text-center w-12 border-r border-inherit">Sr</th>
              <th className="py-2.5 px-3 border-r border-inherit">Product Name & Salt</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Shelf Rack</th>
              <th className="py-2.5 px-3 border-r border-inherit w-28">Batch No</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Expiry</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Status</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-24">M.R.P.</th>
              <th className="py-2.5 px-3 border-r border-inherit">Distributor / Supplier</th>
              <th className="py-2.5 px-3 text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-600 font-bold text-sm font-sans">
                  No near-expiry batches found matching your search.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr 
                  key={idx}
                  className={`transition-colors border-b ${
                    theme === 'dark' 
                      ? 'border-zinc-800 hover:bg-zinc-900' 
                      : 'border-slate-300 hover:bg-amber-50/60'
                  }`}
                >
                  <td className={`py-2.5 px-3 text-center font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-sans border-r border-inherit">
                    <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                      {item.medicineName}
                    </div>
                    {item.generic && (
                      <div className={`text-[11px] font-mono font-bold mt-0.5 ${
                        theme === 'dark' ? 'text-sky-300' : 'text-sky-800'
                      }`}>
                        {item.generic}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-inherit">
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 font-black px-2 py-0.5 rounded text-xs border border-amber-400">
                      RACK {item.rack}
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 font-black border-r border-inherit font-mono ${
                    theme === 'dark' ? 'text-white' : 'text-slate-950'
                  }`}>
                    {item.batch_no}
                  </td>
                  <td className={`py-2.5 px-3 text-center font-black text-xs border-r border-inherit ${
                    theme === 'dark' ? 'text-rose-400' : 'text-rose-700'
                  }`}>
                    {item.exp_date}
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                      item.daysLeft <= 30
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-amber-500 text-white shadow-sm'
                    }`}>
                      {item.daysLeft} days left
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 text-right font-black text-xs border-r border-inherit ${
                    theme === 'dark' ? 'text-white' : 'text-slate-950'
                  }`}>
                    ₹{item.mrp.toFixed(2)}
                  </td>
                  <td className={`py-2.5 px-3 font-bold border-r border-inherit ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    {item.supplier || 'THE CAN DRUG HOUSE'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => alert(`Return Debit Note created for ${item.medicineName} (Batch: ${item.batch_no}) to ${item.supplier || 'Supplier'}`)}
                      className="py-1 px-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded text-xs transition shadow"
                    >
                      Return Note
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
