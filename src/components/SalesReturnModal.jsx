import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  Stethoscope,
  ArrowRight
} from 'lucide-react';

export default function SalesReturnModal({
  isOpen,
  onClose,
  recentBills = [],
  medicines = [],
  activeBranch,
  theme,
  onConfirmReturn
}) {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('Doctor Changed Prescription');
  const [refundMode, setRefundMode] = useState('CASH_REFUND'); // 'CASH_REFUND' or 'CREDIT_NOTE'
  const [returnSuccessData, setReturnSuccessData] = useState(null);

  // When a bill is selected, initialize the returnItems state with selectable items
  useEffect(() => {
    if (selectedBill) {
      const initial = (selectedBill.items || []).map((it, idx) => ({
        originalIndex: idx,
        name: it.name || it.medicine?.name,
        code: it.code || it.medicine?.code,
        batch: it.batch?.batch_no || it.batch || 'STANDARD',
        mrp: it.mrp || it.batch?.mrp || 0,
        per: it.per || it.batch?.per || 10,
        billedQty: it.qty || 1,
        returnQty: 0,
        isSelected: false
      }));
      setReturnItems(initial);
    } else {
      setReturnItems([]);
    }
    setReturnSuccessData(null);
  }, [selectedBill]);

  // Keyboard shortcut: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter bills by Bill No or Patient Phone or Patient Name
  const cleanQ = searchQuery.trim().toLowerCase();
  const filteredBills = recentBills.filter(b => {
    if (!cleanQ) return true;
    const bNo = (b.billNo || '').toLowerCase();
    const phone = (b.customerPhone || '').toLowerCase();
    const name = (b.patientName || '').toLowerCase();
    return bNo.includes(cleanQ) || phone.includes(cleanQ) || name.includes(cleanQ);
  });

  const handleToggleItem = (index) => {
    setReturnItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const nextSelected = !it.isSelected;
      return {
        ...it,
        isSelected: nextSelected,
        returnQty: nextSelected ? it.billedQty : 0
      };
    }));
  };

  const handleUpdateQty = (index, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setReturnItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const safeQty = Math.min(it.billedQty, num);
      return {
        ...it,
        returnQty: safeQty,
        isSelected: safeQty > 0
      };
    }));
  };

  // Calculate total refund amount
  const selectedReturns = returnItems.filter(it => it.isSelected && it.returnQty > 0);
  const totalRefundAmount = selectedReturns.reduce((acc, it) => {
    const unitPrice = it.mrp / (it.per || 10);
    return acc + (unitPrice * it.returnQty);
  }, 0);

  const handleSubmitReturn = (e) => {
    e.preventDefault();
    if (selectedReturns.length === 0) {
      alert('Please select at least one medicine and quantity to return.');
      return;
    }

    const returnPayload = {
      creditNoteNo: 'CN-' + Math.floor(100000 + Math.random() * 900000),
      originalBillNo: selectedBill.billNo,
      billDate: selectedBill.date,
      returnDate: new Date().toLocaleDateString('en-GB'),
      returnTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientName: selectedBill.patientName || 'Customer',
      customerPhone: selectedBill.customerPhone || '',
      doctorName: selectedBill.doctorName || 'GENERAL OTC',
      items: selectedReturns,
      refundAmount: Math.round(totalRefundAmount),
      refundMode,
      reason: returnReason,
      store: activeBranch?.name || 'Beta Pharmacy',
      branchId: activeBranch?.id || 'MAIN'
    };

    if (onConfirmReturn) {
      onConfirmReturn(returnPayload);
    }

    setReturnSuccessData(returnPayload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Sales Return & Credit Note [SALESRET.PRG / F8]
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                  Stock Reversal
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Reverse unopened medicines back into shelf stock and issue a Credit Note or Cash Refund
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {returnSuccessData ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-black text-emerald-600">Credit Note Issued Successfully!</h4>
              <p className="text-sm font-mono text-slate-500 mt-1">
                Voucher #{returnSuccessData.creditNoteNo} • Amount: ₹{returnSuccessData.refundAmount.toFixed(2)}
              </p>
            </div>

            <div className={`p-4 rounded-xl border max-w-md mx-auto text-left text-xs space-y-1.5 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Original Bill No:</span>
                <span className="font-mono font-black">{returnSuccessData.originalBillNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Customer:</span>
                <span className="font-bold">{returnSuccessData.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Items Reversed to Shelf:</span>
                <span className="font-bold text-emerald-600">{returnSuccessData.items.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Refund Settlement:</span>
                <span className="font-black text-rose-600 uppercase">{returnSuccessData.refundMode.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center space-x-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Credit Note Slip</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
              >
                Done & Return to Billing
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Column: Bill Lookup */}
            <div className="md:col-span-5 space-y-3 border-r pr-4 border-inherit">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Bill to Reverse
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Bill No, Phone or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-2 pl-9 pr-3 rounded-xl border text-xs font-mono font-bold ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredBills.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No recent bills found matching "{searchQuery}".
                  </div>
                ) : (
                  filteredBills.slice(0, 15).map((bill) => {
                    const isPicked = selectedBill?.billNo === bill.billNo;
                    return (
                      <div
                        key={bill.billNo}
                        onClick={() => setSelectedBill(bill)}
                        className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                          isPicked
                            ? 'bg-rose-50 border-rose-400 dark:bg-rose-950/40 dark:border-rose-600'
                            : (isDark ? 'bg-zinc-800/60 border-zinc-700/80 hover:bg-zinc-800' : 'bg-white border-slate-200 hover:bg-slate-50')
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-black text-sm text-sky-600 dark:text-sky-400">
                              #{bill.billNo}
                            </span>
                            <span className="text-[11px] text-slate-400 ml-2">{bill.date}</span>
                          </div>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            ₹{parseFloat(bill.netPayable || bill.grossTotal || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                          {bill.patientName || 'Customer'}
                        </div>

                        <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1">
                          <span>{bill.items?.length || 0} items</span>
                          <span>{bill.doctorName || 'GENERAL OTC'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Return Item Selection */}
            <div className="md:col-span-7 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Select Items & Return Quantity
              </label>

              {!selectedBill ? (
                <div className={`p-12 text-center rounded-2xl border border-dashed ${
                  isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-300 text-slate-400'
                }`}>
                  <FileText className="w-8 h-8 mx-auto opacity-50 mb-2" />
                  <p className="font-bold text-xs">Select a bill from the left list to proceed with return</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReturn} className="space-y-4">
                  {/* Bill Summary Banner */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-300'
                  }`}>
                    <div>
                      <div className="font-black text-sm">Bill #{selectedBill.billNo} ({selectedBill.date})</div>
                      <div className="text-[11px] text-slate-500">{selectedBill.patientName} • Dr. {selectedBill.doctorName}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-300">
                      Original Paid: ₹{parseFloat(selectedBill.netPayable || selectedBill.grossTotal || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Return Items Table */}
                  <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b text-[10px] uppercase font-black ${
                        isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        <tr>
                          <th className="py-2 px-2.5 w-10 text-center">Pick</th>
                          <th className="py-2 px-2.5">Medicine</th>
                          <th className="py-2 px-2 text-center w-20">Batch</th>
                          <th className="py-2 px-2 text-center w-16">Billed</th>
                          <th className="py-2 px-2 text-center w-20">Return</th>
                          <th className="py-2 px-2.5 text-right w-20">Refund (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {returnItems.map((it, idx) => {
                          const unitPrice = it.mrp / (it.per || 10);
                          const lineRefund = unitPrice * it.returnQty;

                          return (
                            <tr key={idx} className={it.isSelected ? (isDark ? 'bg-rose-950/30' : 'bg-rose-50/70') : ''}>
                              <td className="py-2 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={it.isSelected}
                                  onChange={() => handleToggleItem(idx)}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-2.5">
                                <div className="font-black text-xs">{it.name}</div>
                                <div className="text-[10px] text-slate-400">MRP: ₹{it.mrp.toFixed(2)} ({it.per}s pack)</div>
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-slate-500">
                                {it.batch}
                              </td>
                              <td className="py-2 px-2 text-center font-bold">
                                {it.billedQty}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={it.billedQty}
                                  value={it.returnQty}
                                  onChange={(e) => handleUpdateQty(idx, e.target.value)}
                                  disabled={!it.isSelected}
                                  className={`w-14 py-1 text-center font-mono font-black text-xs rounded border ${
                                    it.isSelected 
                                      ? (isDark ? 'bg-zinc-800 border-rose-500 text-white' : 'bg-white border-rose-400 text-rose-900 font-bold') 
                                      : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-zinc-900 border-slate-300'
                                  }`}
                                />
                              </td>
                              <td className="py-2 px-2.5 text-right font-black text-rose-600">
                                ₹{lineRefund.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Return Reason & Settlement Mode */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Reason for Return</label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className={`w-full py-1.5 px-2.5 rounded-xl border font-bold text-xs ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="Doctor Changed Prescription">Doctor Changed Prescription</option>
                        <option value="Excess Quantity Purchased">Excess Quantity Purchased</option>
                        <option value="Patient Recovered Early">Patient Recovered Early</option>
                        <option value="Wrong Item Picked">Wrong Item Picked</option>
                        <option value="Medicine Adverse Effect">Medicine Adverse Effect</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Refund Settlement</label>
                      <select
                        value={refundMode}
                        onChange={(e) => setRefundMode(e.target.value)}
                        className={`w-full py-1.5 px-2.5 rounded-xl border font-bold text-xs ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="CASH_REFUND">Cash Refund (Out from Counter)</option>
                        <option value="CREDIT_NOTE">Credit Note Voucher (For next visit)</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Refund Value</span>
                      <span className="text-xl font-black text-rose-600 font-mono">
                        ₹{totalRefundAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={selectedReturns.length === 0}
                        className={`px-5 py-2 rounded-xl font-black text-xs text-white flex items-center space-x-1.5 shadow-md ${
                          selectedReturns.length > 0
                            ? 'bg-rose-600 hover:bg-rose-500 cursor-pointer'
                            : 'bg-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Confirm Return & Re-Stock</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
