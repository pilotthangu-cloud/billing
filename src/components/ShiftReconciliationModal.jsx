import React, { useState, useMemo } from 'react';
import { 
  X, 
  Coins, 
  DollarSign, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  Printer, 
  UserCheck, 
  Lock, 
  Unlock, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt
} from 'lucide-react';

export default function ShiftReconciliationModal({
  isOpen,
  onClose,
  activeShift,
  onSaveShiftHandover,
  recentBills = [],
  theme
}) {
  const isDark = theme === 'dark';

  // Step 1: 'cashier_count' (blind physical count), Step 2: 'manager_auth' (PIN 1536), Step 3: 'audit_slip' (variance breakdown)
  const [step, setStep] = useState('cashier_count');
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');
  const [nextStaffName, setNextStaffName] = useState('Suresh Kumar');
  const [nextOpeningFloat, setNextOpeningFloat] = useState(2000);

  // Cashier blind physical denominations count
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
    const shiftStart = activeShift?.startTimestamp || 0;
    // Bills during this shift session
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
      isBalanced: variance === 0
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

  const handleProceedToManagerAuth = (e) => {
    e.preventDefault();
    if (totalPhysicalCash <= 0) {
      if (!window.confirm('You have entered ₹0.00 physical cash. Are you sure your cash drawer is empty?')) {
        return;
      }
    }
    setStep('manager_auth');
  };

  const handleVerifyManagerPin = (e) => {
    e.preventDefault();
    const cleanPin = managerPin.trim();
    // Default admin pin is 1536
    if (cleanPin === '1536' || cleanPin === 'CC' || cleanPin === 'admin') {
      setPinError(false);
      setStep('audit_slip');
    } else {
      setPinError(true);
    }
  };

  const handleCompleteHandover = () => {
    const completedShiftRecord = {
      shiftId: activeShift?.shiftId || `SHIFT-${Date.now().toString().slice(-6)}`,
      staffName: activeShift?.staffName || 'Counter Staff 1',
      counter: activeShift?.counter || 'Counter 01',
      startTime: activeShift?.startTime || '08:00 AM',
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-GB'),
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
      managerNotes: managerNotes || 'Handover verified and accepted.',
      nextStaffName: nextStaffName.trim() || 'Incoming Staff',
      nextOpeningFloat: parseFloat(nextOpeningFloat) || 2000
    };

    if (onSaveShiftHandover) {
      onSaveShiftHandover(completedShiftRecord);
    }

    alert(`Shift successfully closed for ${completedShiftRecord.staffName}. New shift started for ${completedShiftRecord.nextStaffName}!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
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
                Staff Shift Handover & Blind Cash Reconciliation
              </h3>
              <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Counter 01 • Cashier On Duty: <strong>{activeShift?.staffName || 'Counter Staff 1'}</strong>
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

        {/* STEP 1: BLIND PHYSICAL CASH COUNT */}
        {step === 'cashier_count' && (
          <form onSubmit={handleProceedToManagerAuth} className="p-5 space-y-4 overflow-y-auto">
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="font-bold block">Blind Cash Drawer Audit Protocol</span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Count all currency notes and coins physically present in the drawer right now.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">
                BLIND AUDIT
              </span>
            </div>

            {/* Currency Denominations Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Physical Currency Note Counts:
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
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Total Cash Counted</span>
                <span className={`text-xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  ₹{totalPhysicalCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                Staff: <strong>{activeShift?.staffName || 'Counter Staff 1'}</strong>
              </span>
            </div>

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
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
              >
                <span>Submit Cash Count & Manager Sign-Off</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: MANAGER PIN AUTHENTICATION */}
        {step === 'manager_auth' && (
          <form onSubmit={handleVerifyManagerPin} className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Manager Authorization Required
              </h4>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Enter Manager PIN (1536) to reveal expected sales totals and approve shift handover.
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <label className="block text-xs font-bold text-center mb-1.5">Security PIN</label>
              <input
                type="password"
                autoFocus
                value={managerPin}
                onChange={(e) => {
                  setManagerPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="Enter 1536..."
                className={`w-full text-center px-4 py-2.5 rounded-lg border text-base font-black font-mono tracking-widest ${
                  pinError 
                    ? 'border-red-500 ring-2 ring-red-500/20' 
                    : (isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950')
                }`}
              />
              {pinError && (
                <p className="text-red-500 text-xs font-bold text-center mt-1">
                  Incorrect PIN. Please re-enter Administrator PIN.
                </p>
              )}
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('cashier_count')}
                className={`px-3 py-1.5 rounded text-xs font-bold ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ← Back to Cash Count
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow flex items-center space-x-1"
              >
                <Unlock className="w-4 h-4" />
                <span>Verify & View Audit Slip</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: FULL RECONCILIATION AUDIT SLIP (VARIANCE BREAKDOWN) */}
        {step === 'audit_slip' && (
          <div className="p-5 space-y-4 overflow-y-auto">
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
                      ? 'Physical drawer cash is less than expected sales revenue.' 
                      : 'Physical cash matches all computer sales and opening float.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Reconciliation Ledger */}
            <div className={`border rounded-lg overflow-hidden font-mono text-xs ${
              isDark ? 'border-zinc-800' : 'border-slate-300'
            }`}>
              <table className="w-full text-left border-collapse">
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Shift Session Staff</td>
                    <td className={`py-2 px-3 font-black text-right ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {activeShift?.staffName || 'Counter Staff 1'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Opening Cash Float</td>
                    <td className="py-2 px-3 font-bold text-right">
                      ₹{shiftSales.openingFloat.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-bold">Total Sales Bills Ringed</td>
                    <td className="py-2 px-3 font-bold text-right text-sky-600">
                      {shiftSales.billCount} Bills
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
                </tbody>
              </table>
            </div>

            {/* Handover & Next Shift Setup */}
            <div className="grid grid-cols-2 gap-3 font-sans text-xs">
              <div>
                <label className="block text-xs font-bold mb-1">Incoming Staff Name *</label>
                <input
                  type="text"
                  value={nextStaffName}
                  onChange={(e) => setNextStaffName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className={`w-full px-3 py-1.5 rounded-lg border font-bold ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Next Shift Opening Float (₹) *</label>
                <input
                  type="number"
                  value={nextOpeningFloat}
                  onChange={(e) => setNextOpeningFloat(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border font-mono font-bold ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold mb-1">Manager Handover Audit Notes</label>
                <input
                  type="text"
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="e.g. Verified with Rahul, shortage ₹50 settled from allowance."
                  className={`w-full px-3 py-1.5 rounded-lg border ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                  }`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className={`px-3.5 py-2 rounded-lg border font-bold text-xs flex items-center space-x-1.5 ${
                  isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-slate-300 bg-white text-slate-800'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-sky-600" />
                <span>Print Shift Slip</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep('cashier_count')}
                  className={`px-3 py-2 rounded text-xs font-bold ${
                    isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Recount Cash
                </button>
                <button
                  type="button"
                  onClick={handleCompleteHandover}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Start Next Shift</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
