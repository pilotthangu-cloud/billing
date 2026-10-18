import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  AlertTriangle, 
  Calendar, 
  Building2, 
  Download, 
  Trash2, 
  Info, 
  X, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  AlertOctagon,
  ExternalLink,
  Receipt
} from 'lucide-react';

export default function ExpiryReportPage({ 
  theme, 
  medicines, 
  onBackToBilling, 
  onDeleteBatch, 
  onPurgeDeadBatches 
}) {
  const isDark = theme === 'dark';
  const [filterTab, setFilterTab] = useState('30days'); // '30days' | '60days' | '90days' | 'expired' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Helper to dynamically calculate days remaining from MM/YY or MM/YYYY
  const parseDaysToExpiry = (expStr) => {
    if (!expStr) return 999;
    try {
      const parts = expStr.trim().split(/[\/-]/);
      let month = 1, year = 2026;
      if (parts.length === 2) {
        month = parseInt(parts[0], 10);
        let yr = parseInt(parts[1], 10);
        year = yr < 100 ? 2000 + yr : yr;
      } else if (parts.length === 3) {
        month = parseInt(parts[1], 10);
        let yr = parseInt(parts[2], 10);
        year = yr < 100 ? 2000 + yr : yr;
      }
      const expDate = new Date(year, month, 0); // End of expiry month
      const now = new Date();
      const diffMs = expDate - now;
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 180;
    }
  };

  // Extract all batches from catalog with inward metadata
  const expiringItems = useMemo(() => {
    return (medicines || []).flatMap((med) => {
      return (med.batches || []).map((b) => ({
        ...b,
        medicineCode: med.code,
        medicineName: med.name,
        company: med.company,
        rack: med.rack || 'GN',
        generic: med.generic || '',
        stock: b.qty !== undefined ? b.qty : (b.stock !== undefined ? b.stock : (med.stock || 0)),
        daysLeft: parseDaysToExpiry(b.exp_date),
        inwardDate: b.inwardDate || 'Direct Counter Inward',
        purBillNo: b.purBillNo || `INV-${b.batch_no || '001'}`,
        ptr: b.ptr || Number(((b.mrp || med.mrp || 10) * 0.78).toFixed(2))
      }));
    });
  }, [medicines]);

  // Tab counts
  const count30 = useMemo(() => expiringItems.filter(it => it.daysLeft >= 0 && it.daysLeft <= 30).length, [expiringItems]);
  const count60 = useMemo(() => expiringItems.filter(it => it.daysLeft > 30 && it.daysLeft <= 60).length, [expiringItems]);
  const count90 = useMemo(() => expiringItems.filter(it => it.daysLeft > 60 && it.daysLeft <= 90).length, [expiringItems]);
  const countExpired = useMemo(() => expiringItems.filter(it => it.daysLeft < 0).length, [expiringItems]);
  const countDead = useMemo(() => expiringItems.filter(it => (it.stock !== undefined && it.stock <= 0) || it.daysLeft < -180).length, [expiringItems]);

  // Filter by Tab and Search Query
  const filtered = useMemo(() => {
    return expiringItems.filter((item) => {
      // 1. Tab filter
      if (filterTab === '30days' && (item.daysLeft < 0 || item.daysLeft > 30)) return false;
      if (filterTab === '60days' && (item.daysLeft <= 30 || item.daysLeft > 60)) return false;
      if (filterTab === '90days' && (item.daysLeft <= 60 || item.daysLeft > 90)) return false;
      if (filterTab === 'expired' && item.daysLeft >= 0) return false;

      // 2. Search query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const match = (
          item.medicineName.toLowerCase().includes(q) ||
          (item.batch_no && item.batch_no.toLowerCase().includes(q)) ||
          (item.supplier && item.supplier.toLowerCase().includes(q)) ||
          (item.generic && item.generic.toLowerCase().includes(q)) ||
          (item.rack && item.rack.toLowerCase().includes(q))
        );
        if (!match) return false;
      }
      return true;
    }).slice(0, 200);
  }, [expiringItems, filterTab, searchQuery]);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* 1. Header Bar with Search & Quick Actions */}
      <div className={`px-4 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1 ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 shadow-sm'
            }`}
            title="Back to Sale Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-mono font-bold">Billing (Esc)</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Near-Expiry Watchdog & Return Register [REP002]
              </h2>
              <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded border ${
                isDark ? 'bg-rose-950 text-rose-200 border-rose-800' : 'bg-rose-100 text-rose-950 border-rose-400'
              }`}>
                {expiringItems.length.toLocaleString('en-IN')} Total Batches
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-medium ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Inspect batch inward invoices, purge dead batches, or return to Kannur & Thalassery distributors for Credit Notes
            </p>
          </div>
        </div>

        {/* Right Header Toolbar: Search & Clean Dead Batches Button */}
        <div className="flex items-center space-x-2.5">
          {/* Prominent Clean Dead Batches Button */}
          {countDead > 0 && onPurgeDeadBatches && (
            <button
              onClick={onPurgeDeadBatches}
              className="px-3 py-1.5 rounded-lg font-black text-xs bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow transition cursor-pointer"
              title="Clean historical imported batches with 0 stock or expired > 180 days ago"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clean Dead Batches ({countDead.toLocaleString('en-IN')})</span>
            </button>
          )}

          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine, batch, distributor..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
                  : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs Bar */}
      <div className={`px-4 py-2 border-b flex items-center justify-between font-mono text-xs ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className={`font-extrabold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
            Window:
          </span>
          <button
            onClick={() => setFilterTab('30days')}
            className={`px-3 py-1 rounded font-bold transition border cursor-pointer ${
              filterTab === '30days'
                ? 'bg-rose-600 text-white border-rose-600 shadow'
                : (isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50')
            }`}
          >
            &lt; 30 Days ({count30.toLocaleString('en-IN')})
          </button>
          <button
            onClick={() => setFilterTab('60days')}
            className={`px-3 py-1 rounded font-bold transition border cursor-pointer ${
              filterTab === '60days'
                ? 'bg-amber-600 text-white border-amber-600 shadow'
                : (isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50')
            }`}
          >
            31 - 60 Days ({count60.toLocaleString('en-IN')})
          </button>
          <button
            onClick={() => setFilterTab('90days')}
            className={`px-3 py-1 rounded font-bold transition border cursor-pointer ${
              filterTab === '90days'
                ? 'bg-sky-600 text-white border-sky-600 shadow'
                : (isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50')
            }`}
          >
            61 - 90 Days ({count90.toLocaleString('en-IN')})
          </button>
          <button
            onClick={() => setFilterTab('expired')}
            className={`px-3 py-1 rounded font-bold transition border cursor-pointer ${
              filterTab === 'expired'
                ? 'bg-red-800 text-white border-red-800 shadow'
                : (isDark ? 'bg-zinc-900 border-zinc-700 text-rose-400 hover:text-white' : 'bg-white border-slate-300 text-rose-700 hover:bg-slate-50')
            }`}
          >
            Past Expired ({countExpired.toLocaleString('en-IN')})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded font-bold transition border cursor-pointer ${
              filterTab === 'all'
                ? 'bg-slate-800 text-white border-slate-800 shadow'
                : (isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50')
            }`}
          >
            All Batches
          </button>
        </div>

        <div className={`font-extrabold ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
          Showing {filtered.length} matching batches • <span className="text-sky-600 dark:text-sky-400 font-bold">Click row for Inward Details</span>
        </div>
      </div>

      {/* 3. The High-Contrast Batch Table */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          isDark ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              isDark 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300' 
                : 'bg-slate-200 border-slate-300 text-slate-900'
            }`}>
              <th className="py-2 px-3 text-center w-12 border-r border-inherit">Sr</th>
              <th className="py-2 px-3 border-r border-inherit">Product Name & Salt</th>
              <th className="py-2 px-3 text-center border-r border-inherit w-24">Shelf Rack</th>
              <th className="py-2 px-3 border-r border-inherit w-28">Batch No</th>
              <th className="py-2 px-3 text-center border-r border-inherit w-24">Expiry</th>
              <th className="py-2 px-3 text-center border-r border-inherit w-28">Status</th>
              <th className="py-2 px-3 text-right border-r border-inherit w-20">Stock</th>
              <th className="py-2 px-3 text-right border-r border-inherit w-24">M.R.P.</th>
              <th className="py-2 px-3 border-r border-inherit">Distributor / Supplier</th>
              <th className="py-2 px-3 text-center w-40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-12 text-center text-slate-600 font-bold text-sm font-sans">
                  No near-expiry batches found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr 
                  key={idx}
                  onClick={() => setSelectedBatch(item)}
                  className={`transition-colors border-b cursor-pointer ${
                    isDark 
                      ? 'border-zinc-800 hover:bg-zinc-900' 
                      : 'border-slate-300 hover:bg-amber-50/70'
                  }`}
                >
                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-sans border-r border-inherit">
                    <div className={`font-black text-sm flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      <span>{item.medicineName}</span>
                    </div>
                    {item.generic && (
                      <div className={`text-[11px] font-mono font-bold mt-0.5 ${
                        isDark ? 'text-sky-300' : 'text-sky-800'
                      }`}>
                        {item.generic}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded font-black text-xs border shadow-xs inline-block ${
                      isDark 
                        ? 'bg-sky-950/80 text-sky-300 border-sky-600' 
                        : 'bg-sky-50 text-sky-800 border-sky-300'
                    }`}>
                      R-{item.rack || 'GN'}
                    </span>
                  </td>
                  <td className={`py-2 px-3 font-black border-r border-inherit font-mono ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    {item.batch_no}
                  </td>
                  <td className={`py-2 px-3 text-center font-black text-xs border-r border-inherit ${
                    item.daysLeft < 0 ? 'text-rose-600 font-black' : (isDark ? 'text-amber-400' : 'text-amber-700')
                  }`}>
                    {item.exp_date}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black inline-block ${
                      item.daysLeft < 0
                        ? 'bg-red-700 text-white'
                        : item.daysLeft <= 30
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-amber-500 text-white shadow-sm'
                    }`}>
                      {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d Expired` : `${item.daysLeft}d left`}
                    </span>
                  </td>
                  <td className={`py-2 px-3 text-right font-black text-xs border-r border-inherit ${
                    item.stock <= 0 ? 'text-slate-400' : (isDark ? 'text-white' : 'text-slate-950')
                  }`}>
                    {item.stock}
                  </td>
                  <td className={`py-2 px-3 text-right font-black text-xs border-r border-inherit ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    ₹{item.mrp.toFixed(2)}
                  </td>
                  <td className={`py-2 px-3 font-bold border-r border-inherit truncate max-w-[180px] ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {item.supplier || 'Direct Inward'}
                  </td>
                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => {
                          const noteId = `DN-${Date.now().toString().slice(-6)}`;
                          const returnNote = {
                            id: noteId,
                            date: new Date().toLocaleDateString('en-GB'),
                            supplier: item.supplier || 'Direct Inward',
                            medicine: item.medicineName,
                            batch: item.batch_no,
                            expDate: item.exp_date,
                            amount: item.mrp || 0,
                            status: 'GENERATED'
                          };
                          try {
                            const existing = JSON.parse(localStorage.getItem('beta_pharma_purchase_returns') || '[]');
                            localStorage.setItem('beta_pharma_purchase_returns', JSON.stringify([returnNote, ...existing]));
                          } catch (err) {}
                          alert(`Return Debit Note #${noteId} created for ${item.medicineName} (Batch: ${item.batch_no}) to ${item.supplier || 'Supplier'}`);
                        }}
                        className="py-1 px-2 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded text-[11px] transition shadow cursor-pointer"
                        title="Create Return Note for Distributor Credit Note"
                      >
                        Return Note
                      </button>

                      {onDeleteBatch && (
                        <button
                          onClick={() => onDeleteBatch(item.medicineCode || item.medicineName, item.batch_no)}
                          className="p-1 bg-rose-600 hover:bg-rose-500 text-white rounded transition shadow cursor-pointer"
                          title="Delete Batch from Counter Inventory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Batch Inward Audit Dossier Modal (Interactive Drilldown on Row Click) */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-text">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase">Batch Inward Audit Dossier</h3>
                  <p className="text-xs text-slate-500 font-mono">Purchase Bill & Distributor Verification</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBatch(null)}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dossier Content */}
            <div className="p-5 space-y-4 text-xs font-mono">
              {/* Medicine Card */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-300'
              }`}>
                <div className="font-black text-base text-sky-600 dark:text-sky-400 font-sans">
                  {selectedBatch.medicineName}
                </div>
                {selectedBatch.generic && (
                  <div className="text-xs font-bold text-slate-600 dark:text-zinc-400 mt-0.5">
                    Salt: {selectedBatch.generic}
                  </div>
                )}
                <div className="flex items-center space-x-4 mt-2 text-[11px]">
                  <span>Rack: <strong>R-{selectedBatch.rack}</strong></span>
                  <span>Mfr: <strong>{selectedBatch.company || 'GENERIC'}</strong></span>
                  <span>Code: <strong>{selectedBatch.medicineCode}</strong></span>
                </div>
              </div>

              {/* Batch & Inward Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Batch Number</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{selectedBatch.batch_no}</span>
                </div>

                <div className={`p-3 rounded-lg border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Expiry Date / Status</span>
                  <span className={`text-sm font-black ${selectedBatch.daysLeft < 0 ? 'text-rose-600' : 'text-amber-500'}`}>
                    {selectedBatch.exp_date} ({selectedBatch.daysLeft < 0 ? `${Math.abs(selectedBatch.daysLeft)}d Expired` : `${selectedBatch.daysLeft}d left`})
                  </span>
                </div>

                <div className={`p-3 rounded-lg border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">MRP / PTR Rates</span>
                  <span className="text-sm font-black">MRP ₹{selectedBatch.mrp.toFixed(2)} • PTR ₹{selectedBatch.ptr.toFixed(2)}</span>
                </div>

                <div className={`p-3 rounded-lg border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Live Stock on Counter</span>
                  <span className="text-sm font-black text-emerald-600">{selectedBatch.stock} Units</span>
                </div>
              </div>

              {/* Purchase Inward Verification Card */}
              <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-amber-50/50 border-amber-300 text-amber-950'
              }`}>
                <div className="font-bold text-xs font-sans text-amber-900 dark:text-amber-300 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Inward Invoice Audit Information:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>Purchase Bill No: <strong>{selectedBatch.purBillNo}</strong></div>
                  <div>Inward Date: <strong>{selectedBatch.inwardDate}</strong></div>
                  <div className="col-span-2">Distributor / Supplier: <strong>{selectedBatch.supplier || 'THE CAN DRUG HOUSE'}</strong></div>
                  <div className="col-span-2">Total Inward Value: <strong>₹{((selectedBatch.stock || 1) * selectedBatch.mrp).toFixed(2)}</strong></div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className={`px-5 py-3 border-t flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {onDeleteBatch && (
                <button
                  onClick={() => {
                    onDeleteBatch(selectedBatch.medicineCode || selectedBatch.medicineName, selectedBatch.batch_no);
                    setSelectedBatch(null);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Batch</span>
                </button>
              )}

              <div className="flex items-center space-x-2 ml-auto">
                <button
                  onClick={() => {
                    const noteId = `DN-${Date.now().toString().slice(-6)}`;
                    alert(`Debit Note #${noteId} drafted for ${selectedBatch.supplier}`);
                    setSelectedBatch(null);
                  }}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
                >
                  Create Debit Note
                </button>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
