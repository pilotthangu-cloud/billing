import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Building2, 
  User, 
  KeyRound, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function TerminalLockScreen({
  theme,
  activeBranch,
  staffList = [],
  onUnlockTerminal,
  onAddStaff
}) {
  const isDark = theme === 'dark';
  
  // Login States
  const [selectedStaff, setSelectedStaff] = useState(() => staffList[0] || '');
  const [isRegisteringStaff, setIsRegisteringStaff] = useState(() => staffList.length === 0);
  const [newStaffName, setNewStaffName] = useState('');
  const [pin, setPin] = useState('');
  const [openingFloat, setOpeningFloat] = useState(2000);
  const [counterId, setCounterId] = useState('Counter 01');
  const [errorMsg, setErrorMsg] = useState('');
  const [isManagerTab, setIsManagerTab] = useState(false);
  const [managerPin, setManagerPin] = useState('');

  // Live time for clock display
  const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDateStr = new Date().toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const handleStaffUnlock = (e) => {
    e.preventDefault();
    setErrorMsg('');

    let finalStaffName = selectedStaff;
    if (isRegisteringStaff || staffList.length === 0) {
      finalStaffName = newStaffName.trim();
      if (!finalStaffName) {
        setErrorMsg('Please enter your staff/pharmacist name.');
        return;
      }
      if (onAddStaff) {
        onAddStaff(finalStaffName);
      }
    }

    if (!finalStaffName) {
      setErrorMsg('Please select or register a staff member.');
      return;
    }

    // Staff counter login - PIN removed for instant counter speed
    // (Admin PIN remains strictly for Sales & Margin inspection in Manager tab)

    // Initialize clean shift
    const shiftPayload = {
      shiftId: `SHIFT-${Date.now().toString().slice(-4)}`,
      staffName: finalStaffName,
      counter: counterId || 'Counter 01',
      startTime: currentTimeStr,
      startTimestamp: Date.now(),
      openingFloat: Number(openingFloat) || 0
    };

    onUnlockTerminal(shiftPayload, 'CASHIER');
  };

  const handleManagerUnlock = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (managerPin !== '1536') {
      setErrorMsg('Incorrect Manager Security PIN.');
      return;
    }

    const shiftPayload = {
      shiftId: `MGR-${Date.now().toString().slice(-4)}`,
      staffName: 'Store Manager',
      counter: counterId || 'Counter 01',
      startTime: currentTimeStr,
      startTimestamp: Date.now(),
      openingFloat: 0
    };

    onUnlockTerminal(shiftPayload, 'MANAGER');
  };

  return (
    <div className={`fixed inset-0 z-[999] flex items-center justify-center p-4 font-sans select-none backdrop-blur-md ${
      isDark ? 'bg-zinc-950/95 text-zinc-100' : 'bg-slate-900/90 text-slate-100'
    }`}>
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-fade-in ${
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white text-slate-900 border-slate-200'
      }`}>
        
        {/* Top Security Banner */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black shadow-inner">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-base tracking-tight">{activeBranch?.name || 'Beta Pharmacy'}</h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 font-bold uppercase">
                  {activeBranch?.prefix || 'POS'}
                </span>
              </div>
              <p className="text-xs text-sky-100 font-mono flex items-center space-x-1.5 mt-0.5">
                <span>Terminal Secured</span>
                <span>•</span>
                <span>{activeBranch?.location || 'Main Counter'}</span>
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <div className="text-xs font-black">{currentTimeStr}</div>
            <div className="text-[10px] text-sky-200">{currentDateStr}</div>
          </div>
        </div>

        {/* Tab Selection: Cashier Shift Login vs Manager PIN Override */}
        <div className={`grid grid-cols-2 border-b text-xs font-bold ${
          isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            type="button"
            onClick={() => { setIsManagerTab(false); setErrorMsg(''); }}
            className={`py-3 text-center transition flex items-center justify-center space-x-1.5 ${
              !isManagerTab
                ? 'border-b-2 border-sky-600 text-sky-600 bg-sky-500/10 font-black'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Staff Shift Login</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsManagerTab(true); setErrorMsg(''); }}
            className={`py-3 text-center transition flex items-center justify-center space-x-1.5 ${
              isManagerTab
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-500/10 font-black'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Manager Override</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ============ STAFF SHIFT LOGIN FORM ============ */}
          {!isManagerTab ? (
            <form onSubmit={handleStaffUnlock} className="space-y-4">
              
              {/* Staff Member Selection or Registration */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-sky-600" />
                    <span>Counter Staff / Pharmacist</span>
                  </label>

                  {staffList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsRegisteringStaff(prev => !prev)}
                      className="text-[11px] font-bold text-sky-600 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      {isRegisteringStaff ? 'Select Existing Staff' : '+ Add New Staff'}
                    </button>
                  )}
                </div>

                {!isRegisteringStaff && staffList.length > 0 ? (
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {staffList.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Enter pharmacist or counter operator name"
                    autoFocus
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                )}
              </div>

              {/* Staff PIN & Counter ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Counter PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN"
                    className={`w-full px-3 py-2.5 rounded-lg border text-center font-mono font-black text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Opening Cash Float (₹)
                  </label>
                  <input
                    type="number"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-right font-mono font-black text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Unlock Counter Button */}
              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl font-black text-sm bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Counter & Open Shift</span>
              </button>
            </form>
          ) : (
            /* ============ MANAGER OVERRIDE FORM ============ */
            <form onSubmit={handleManagerUnlock} className="space-y-4">
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                isDark ? 'bg-indigo-950/30 border-indigo-900/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}>
                <p className="font-bold flex items-center space-x-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>Administrative Bypass</span>
                </p>
                Enter the Master Security PIN to immediately unlock the terminal in Manager mode with full operational and settings rights.
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">
                  Manager Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className={`w-full px-3 py-3 rounded-lg border text-center font-mono font-black text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
              >
                <Unlock className="w-4 h-4" />
                <span>Authorize & Unlock as Manager</span>
              </button>
            </form>
          )}

          {/* Footer Safety Notice */}
          <div className="mt-5 pt-4 border-t border-inherit text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              🔒 Counter locked to prevent unauthorized sales. Press <strong>Ctrl+L</strong> at any time to lock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
