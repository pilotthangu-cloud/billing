import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Coins, 
  DollarSign, 
  Check, 
  AlertTriangle, 
  Printer, 
  UserCheck, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  UserPlus,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function ShiftReconciliationModal({
  isOpen,
  onClose,
  activeBranch,
  activeShift,
  onSaveShiftHandover,
  recentBills = [],
  theme,
  staffList = [],
  onAddStaff,
  targetIncomingStaff
}) {
  const isDark = theme === 'dark';

  // Step 1: 'cashier_count' (blind physical count & staff handover selection)
  // Step 2: 'audit_slip' (finalized handover slip with exact variance breakdown)
  const [step, setStep] = useState('cashier_count');

  // Staff Handover Selection
  const [outgoingStaff, setOutgoingStaff] = useState(() => activeShift?.staffName || staffList[0] || 'Counter Staff');
  const [incomingStaff, setIncomingStaff] = useState(() => {
    const current = activeShift?.staffName || staffList[0] || 'Counter Staff';
    if (targetIncomingStaff && targetIncomingStaff !== current) return targetIncomingStaff;
    return staffList.find(s => s !== current) || staffList[1] || '';
  });

  // Inline Quick Add Staff Sub-State
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffInput, setNewStaffInput] = useState('');

  // Mandatory Shift Bill Range State
  const [startBillNo, setStartBillNo] = useState('');
  const [endBillNo, setEndBillNo] = useState('');

  // Handover Parameters
  const [handoverNotes, setHandoverNotes] = useState('');
  const [nextOpeningFloat, setNextOpeningFloat] = useState(2000);
  const [completedRecord, setCompletedRecord] = useState(null);

  // Sync with activeShift, targetIncomingStaff, and bill range when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('cashier_count');
      const current = activeShift?.staffName || staffList[0] || 'Counter Staff';
      setOutgoingStaff(current);
      if (targetIncomingStaff && targetIncomingStaff !== current) {
        setIncomingStaff(targetIncomingStaff);
      } else {
        setIncomingStaff(staffList.find(s => s !== current) || staffList[1] || '');
      }
      setCompletedRecord(null);
      setHandoverNotes('');

      // Auto-detect starting and ending bill numbers from current shift's transactions
      const shiftBills = recentBills.filter(b => !b.shiftId || b.shiftId === activeShift?.shiftId);
      if (shiftBills.length > 0) {
        // recentBills stores newest first: last element is earliest, first element is latest
        const earliest = shiftBills[shiftBills.length - 1]?.billNo || '';
        const latest = shiftBills[0]?.billNo || '';
        setStartBillNo(earliest);
        setEndBillNo(latest);
      } else {
        const branchId = activeBranch?.id || 'MAIN';
        const nextNo = localStorage.getItem(`beta_pharma_next_bill_no_${branchId}`) || localStorage.getItem('beta_pharma_next_bill_no') || '000001';
        setStartBillNo(nextNo);
        setEndBillNo(nextNo);
      }
    }
  }, [isOpen, activeShift, staffList, targetIncomingStaff, recentBills]);

  // Cashier physical denominations count
  const [denominations, setDenominations] = useState({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    coins: 0
  });

  // Calculate counted physical cash
  const totalPhysicalCash = useMemo(() => {
    return (
      (parseInt(denominations[500], 10) || 0) * 500 +
      (parseInt(denominations[200], 10) || 0) * 200 +
      (parseInt(denominations[100], 10) || 0) * 100 +
      (parseInt(denominations[50], 10) || 0) * 50 +
      (parseInt(denominations[20], 10) || 0) * 20 +
      (parseInt(denominations[10], 10) || 0) * 10 +
      (parseFloat(denominations.coins) || 0)
    );
  }, [denominations]);

  // Calculate actual shift sales from bills
  const shiftSales = useMemo(() => {
    // Filter bills for current shift session
    const bills = recentBills.filter(b => !b.shiftId || b.shiftId === activeShift?.shiftId);
    
    let cash = 0;
    let upi = 0;
    let credit = 0;

    bills.forEach(b => {
      const amt = b.netPayable || b.grossTotal || 0;
      if (b.paymentMode === 'cash') cash += amt;
      else if (b.paymentMode === 'upi') upi += amt;
      else if (b.paymentMode === 'credit') credit += amt;
      else cash += amt; // default to cash
    });

    const opening = activeShift?.openingFloat || 2000;
    const expectedCash = opening + cash;
    const variance = totalPhysicalCash - expectedCash;

    return {
      billCount: bills.length,
      cashSales: cash,
      upiSales: upi,
      creditSales: credit,
      grossTotal: cash + upi + credit,
      openingFloat: opening,
      expectedCash,
      variance,
      isShortage: variance < 0,
      isOverage: variance > 0,
      isBalanced: Math.abs(variance) < 0.01
    };
  }, [recentBills, activeShift, totalPhysicalCash]);

  const handleDenomChange = (key, val) => {
    const num = val === '' ? 0 : parseInt(val, 10);
    setDenominations(prev => ({
      ...prev,
      [key]: isNaN(num) ? 0 : Math.max(0, num)
    }));
  };

  const handleCoinsChange = (val) => {
    const num = parseFloat(val);
    setDenominations(prev => ({
      ...prev,
      coins: isNaN(num) ? 0 : Math.max(0, num)
    }));
  };

  const handleSaveNewStaff = (e) => {
    if (e) e.preventDefault();
    const clean = newStaffInput.trim();
    if (!clean) return;
    if (onAddStaff) {
      onAddStaff(clean);
    }
    setIncomingStaff(clean);
    setNewStaffInput('');
    setIsAddingStaff(false);
  };

  // Direct Peer-to-Peer Cashier Handover (No blocking manager PIN!)
  const handleExecuteHandover = (e) => {
    if (e) e.preventDefault();

    if (!outgoingStaff) {
      alert('Please select the outgoing cashier name.');
      return;
    }
    if (!incomingStaff) {
      alert('Please select the incoming cashier name.');
      return;
    }

    if (!startBillNo.trim()) {
      alert('Mandatory Requirement: Please enter the Starting Bill Number for this shift.');
      return;
    }
    if (!endBillNo.trim()) {
      alert('Mandatory Requirement: Please enter the Ending Bill Number for this shift.');
      return;
    }

    if (totalPhysicalCash <= 0) {
      if (!window.confirm('You have entered ₹0.00 physical cash. Are you sure your cash drawer is empty?')) {
        return;
      }
    }

    const record = {
      shiftId: activeShift?.shiftId || `SHIFT-${Date.now().toString().slice(-6)}`,
      staffName: outgoingStaff,
      counter: activeShift?.counter || 'Counter 01',
      startTime: activeShift?.startTime || '08:00 AM',
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-GB'),
      startBillNo: startBillNo.trim(),
      endBillNo: endBillNo.trim(),
      openingFloat: shiftSales.openingFloat,
      totalBills: shiftSales.billCount,
      cashSales: shiftSales.cashSales,
      upiSales: shiftSales.upiSales,
      creditSales: shiftSales.creditSales,
      grossTotal: shiftSales.grossTotal,
      expectedCash: shiftSales.expectedCash,
      countedPhysicalCash: totalPhysicalCash,
      variance: shiftSales.variance,
      denominations: { ...denominations },
      managerApproved: true,
      handoverNotes: handoverNotes.trim() || 'Shift handover completed at counter.',
      nextStaffName: incomingStaff,
      nextOpeningFloat: parseFloat(nextOpeningFloat) || 2000
    };

    // Save to persistent handover audit logs in localStorage
    try {
      const logs = JSON.parse(localStorage.getItem('beta_pharma_handover_logs') || '[]');
      logs.unshift(record);
      localStorage.setItem('beta_pharma_handover_logs', JSON.stringify(logs.slice(0, 500)));
    } catch (err) {
      console.error('Error saving to beta_pharma_handover_logs', err);
    }

    setCompletedRecord(record);

    if (onSaveShiftHandover) {
      onSaveShiftHandover(record);
    }

    // Immediately display the finalized audit slip without prompt barriers
    setStep('audit_slip');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
      }`}>
        {/* Modal Top Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">
                Cash Counter Shift Handover & Reconciliation
              </h3>
              <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Counter 01 • Active Cashier: <strong>{activeShift?.staffName || outgoingStaff}</strong>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: CASHIER COUNT & PEER-TO-PEER HANDOVER SETUP */}
        {step === 'cashier_count' && (
          <form onSubmit={handleExecuteHandover} className="p-5 space-y-4 overflow-y-auto">
            {/* Staff Handover Roster Selection Bar */}
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase font-mono text-sky-600 flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>Cashier Custody Handover</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsAddingStaff(!isAddingStaff)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded border transition flex items-center space-x-1 ${
                    isDark 
                      ? 'border-zinc-700 hover:bg-zinc-800 text-sky-400' 
                      : 'border-slate-300 hover:bg-white text-sky-700'
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{isAddingStaff ? 'Cancel' : '+ Add Staff Name'}</span>
                </button>
              </div>

              {/* Inline Add Staff Row */}
              {isAddingStaff && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="Enter new employee / cashier name..."
                    value={newStaffInput}
                    onChange={(e) => setNewStaffInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSaveNewStaff(e);
                      } else if (e.key === 'Escape') {
                        setIsAddingStaff(false);
                      }
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewStaff}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold"
                  >
                    Save Staff
                  </button>
                </div>
              )}

              {/* Two-Column Staff Selector */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className={`block text-[10px] font-mono font-bold uppercase mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Outgoing Cashier (Handing Over) *
                  </label>
                  <select
                    value={outgoingStaff}
                    onChange={(e) => setOutgoingStaff(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-black ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  >
                    {Array.from(new Set([...staffList, outgoingStaff].filter(Boolean))).map((name, idx) => (
                      <option key={idx} value={name}>
                        {name} (Off Duty)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-mono font-bold uppercase mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Incoming Cashier (Taking Over) *
                  </label>
                  <select
                    value={incomingStaff}
                    onChange={(e) => setIncomingStaff(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-black ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-sky-400' : 'bg-white border-slate-300 text-sky-900'
                    }`}
                  >
                    {Array.from(new Set([...staffList, incomingStaff, targetIncomingStaff].filter(Boolean))).map((name, idx) => (
                      <option key={idx} value={name}>
                        {name} (Next Shift)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mandatory Shift Bill Sequence & Sales Audit Range */}
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase font-mono text-sky-600 flex items-center space-x-1.5">
                  <Receipt className="w-4 h-4" />
                  <span>Mandatory Bill Sequence & Sales Audit Range</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-bold">
                  {shiftSales.billCount} Bill{shiftSales.billCount === 1 ? '' : 's'} in Shift
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className={`block text-[10px] font-mono font-bold uppercase mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Starting Bill No *
                  </label>
                  <input
                    type="text"
                    required
                    value={startBillNo}
                    onChange={(e) => setStartBillNo(e.target.value)}
                    placeholder="e.g. 000001"
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-black ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-mono font-bold uppercase mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    Ending Bill No *
                  </label>
                  <input
                    type="text"
                    required
                    value={endBillNo}
                    onChange={(e) => setEndBillNo(e.target.value)}
                    placeholder="e.g. 000014"
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-black ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              {/* Payment Mode Split Badges */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
                <div className={`p-2 rounded-lg border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-emerald-50/70 border-emerald-200'
                }`}>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Cash Sales</span>
                  <span className="font-black text-emerald-600">₹{shiftSales.cashSales.toFixed(2)}</span>
                </div>
                <div className={`p-2 rounded-lg border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-indigo-50/70 border-indigo-200'
                }`}>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">UPI / QR Digital</span>
                  <span className="font-black text-indigo-600">₹{shiftSales.upiSales.toFixed(2)}</span>
                </div>
                <div className={`p-2 rounded-lg border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Credit Khata</span>
                  <span className="font-black text-amber-600">₹{shiftSales.creditSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Currency Denominations Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Physical Currency Note Counts in Cash Drawer:
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
                {[500, 200, 100, 50, 20, 10].map(denom => (
                  <div key={denom} className={`p-2 rounded-lg border flex items-center justify-between ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-300'
                  }`}>
                    <span className="text-sky-600 font-black w-14">₹{denom} ×</span>
                    <input
                      type="number"
                      min="0"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      value={denominations[denom] || ''}
                      onChange={(e) => handleDenomChange(denom, e.target.value)}
                      placeholder="0 notes"
                      className={`w-24 text-right px-2 py-1 rounded border font-mono font-black text-xs ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                      }`}
                    />
                    <span className="w-20 text-right text-slate-500 text-[11px]">
                      = ₹{((denominations[denom] || 0) * denom).toLocaleString()}
                    </span>
                  </div>
                ))}

                {/* Loose Coins Input */}
                <div className={`col-span-2 p-2 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-300'
                }`}>
                  <span className="text-sky-600 font-black">Loose Coins Total (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    value={denominations.coins || ''}
                    onChange={(e) => handleCoinsChange(e.target.value)}
                    placeholder="₹0.00"
                    className={`w-32 text-right px-2 py-1 rounded border font-mono font-black text-xs ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'
                    }`}
                  />
                  <span className="text-slate-500 text-[11px] w-20 text-right font-mono font-bold">
                    = ₹{(parseFloat(denominations.coins) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Counted Banner */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-700' : 'bg-sky-50 border-sky-300'
            }`}>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Total Physical Cash Counted</span>
                <span className={`text-xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  ₹{totalPhysicalCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono font-bold text-slate-500 block">Drawer Transfer</span>
                <span className="text-xs font-mono font-black text-sky-600">
                  {outgoingStaff} ➔ {incomingStaff}
                </span>
              </div>
            </div>

            {/* Shift Handover Parameters: Float Left & Notes */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <label className="block text-xs font-bold mb-1">Float Left in Drawer for Next Shift (₹) *</label>
                <input
                  type="number"
                  min="0"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={nextOpeningFloat}
                  onChange={(e) => setNextOpeningFloat(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border font-mono font-bold ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Handover Notes / Drawer Remarks</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. ₹2000 float left in drawer, cash bag sealed."
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>
            </div>

            {/* Action Buttons: Direct Handover (No Admin Prompt Barrier!) */}
            <div className="pt-2 border-t flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center space-x-2 shadow cursor-pointer"
              >
                <span>Complete Shift Handover & View Audit Slip</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: FINALIZED SHIFT AUDIT SLIP (RECONCILIATION SUMMARY) */}
        {step === 'audit_slip' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Shift Handover Complete & Incoming Cashier Notice */}
            <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
              isDark ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wide">
                    Shift Handover Complete!
                  </h4>
                  <p className="text-xs font-mono mt-0.5">
                    Counter custody successfully handed over to: <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-black">{incomingStaff}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-[11px] shrink-0">
                <span className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold block text-[10px] uppercase">
                  CONFIRMED
                </span>
                <span className="opacity-70 mt-1 block">
                  {completedRecord?.endTime || new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Variance Alert Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              shiftSales.isShortage
                ? (isDark ? 'bg-rose-950/70 border-rose-700 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-950')
                : shiftSales.isBalanced
                  ? (isDark ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-950')
                  : (isDark ? 'bg-sky-950/70 border-sky-700 text-sky-200' : 'bg-sky-50 border-sky-300 text-sky-950')
            }`}>
              <div className="flex items-center space-x-3">
                {shiftSales.isShortage ? (
                  <TrendingDown className="w-7 h-7 text-rose-600 shrink-0" />
                ) : shiftSales.isBalanced ? (
                  <Check className="w-7 h-7 text-emerald-600 shrink-0" />
                ) : (
                  <TrendingUp className="w-7 h-7 text-sky-600 shrink-0" />
                )}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">
                    Cash Drawer Audit Result
                  </span>
                  <div className="text-lg font-black font-mono">
                    {shiftSales.isShortage && `SHORTAGE OF -₹${Math.abs(shiftSales.variance).toFixed(2)}`}
                    {shiftSales.isBalanced && `DRAWER 100% BALANCED (₹0.00 Variance)`}
                    {shiftSales.isOverage && `OVERAGE OF +₹${shiftSales.variance.toFixed(2)}`}
                  </div>
                  <p className="text-[11px] font-mono mt-0.5 opacity-80">
                    {shiftSales.isShortage 
                      ? 'Physical drawer cash is less than computer expected cash.' 
                      : 'Physical cash matches all computer sales and opening float.'}
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold block text-[10px]">
                  HANDOVER SAVED
                </span>
                <span className="opacity-70 mt-1 block">
                  {completedRecord?.endTime || new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Financial Reconciliation Ledger */}
            <div className={`border rounded-lg overflow-hidden font-mono text-xs ${
              isDark ? 'border-zinc-800' : 'border-slate-300'
            }`}>
              <table className="w-full text-left border-collapse">
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Shift Handover Custody</td>
                    <td className={`py-2 px-3 font-black text-right ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {outgoingStaff} ➔ <strong className="text-sky-600">{incomingStaff}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Shift Bill Sequence Range</td>
                    <td className="py-2 px-3 font-black text-right text-sky-600">
                      {completedRecord?.startBillNo || startBillNo} ➔ {completedRecord?.endBillNo || endBillNo} ({shiftSales.billCount} Bills)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Opening Cash Float</td>
                    <td className="py-2 px-3 font-bold text-right">
                      ₹{shiftSales.openingFloat.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Cash Sales Collected (+)</td>
                    <td className="py-2 px-3 font-black text-right text-emerald-600">
                      ₹{shiftSales.cashSales.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">UPI / QR Digital Sales (Non-Cash)</td>
                    <td className="py-2 px-3 font-bold text-right text-indigo-600">
                      ₹{shiftSales.upiSales.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Credit Khata Sales (Uncollected)</td>
                    <td className="py-2 px-3 font-bold text-right text-amber-600">
                      ₹{shiftSales.creditSales.toFixed(2)}
                    </td>
                  </tr>
                  <tr className={isDark ? 'bg-zinc-950/80 font-bold' : 'bg-slate-50 font-bold'}>
                    <td className="py-2 px-3 text-slate-400">Total Shift Turnover Ringed</td>
                    <td className="py-2 px-3 font-bold text-right">
                      ₹{shiftSales.grossTotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr className={isDark ? 'bg-zinc-950 font-black' : 'bg-slate-100 font-black'}>
                    <td className="py-2 px-3">Expected Physical Cash (Opening + Cash Sales)</td>
                    <td className="py-2 px-3 text-right text-sm">
                      ₹{shiftSales.expectedCash.toFixed(2)}
                    </td>
                  </tr>
                  <tr className={isDark ? 'bg-zinc-950 font-black' : 'bg-sky-50 font-black'}>
                    <td className="py-2 px-3 text-sky-700">Actual Counted Physical Cash</td>
                    <td className="py-2 px-3 text-right text-sm text-sky-700">
                      ₹{totalPhysicalCash.toFixed(2)}
                    </td>
                  </tr>
                  <tr className={
                    shiftSales.isShortage 
                      ? (isDark ? 'bg-rose-950/40 text-rose-300 font-black' : 'bg-rose-100 text-rose-950 font-black') 
                      : (isDark ? 'bg-emerald-950/40 text-emerald-300 font-black' : 'bg-emerald-100 text-emerald-950 font-black')
                  }>
                    <td className="py-2.5 px-3 uppercase">Net Shift Cash Variance</td>
                    <td className="py-2.5 px-3 text-right text-base font-mono">
                      {shiftSales.variance >= 0 ? '+' : ''}₹{shiftSales.variance.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Opening Float for {incomingStaff}</td>
                    <td className="py-2 px-3 font-black text-right text-sky-600">
                      ₹{parseFloat(nextOpeningFloat || 2000).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Handover Notes Display */}
            {handoverNotes && (
              <div className={`p-2.5 rounded-lg border text-xs font-mono ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span className="font-bold text-slate-500 block uppercase text-[10px]">Handover Remarks:</span>
                <span>{handoverNotes}</span>
              </div>
            )}

            {/* Actions: Print and Close */}
            <div className="pt-3 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className={`px-4 py-2 rounded-lg border font-bold text-xs flex items-center space-x-1.5 cursor-pointer ${
                  isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-sky-600" />
                <span>Print Shift Slip</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black shadow flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done & Start Billing as {incomingStaff}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
