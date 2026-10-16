import React from 'react';

export default function EnterpriseHeader({
  currentStore,
  setCurrentStore,
  isOffline,
  setIsOffline,
  billNo,
  billDate,
  currentTime,
  patientName,
  setPatientName,
  doctorName,
  setDoctorName,
  paymentMode,
  setPaymentMode,
  patientInputRef,
  doctorInputRef
}) {
  return (
    <div className="bg-slate-800 text-slate-100 border-b border-slate-700 select-none text-xs">
      {/* Level 1: Enterprise Store Banner */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-700/80 bg-slate-900">
        <div className="flex items-center space-x-4">
          <div className="flex items-baseline space-x-2">
            <span className="font-extrabold text-sm tracking-wider text-sky-400 font-mono">BETA PHARMACY</span>
            <span className="text-slate-400 text-[11px]">Sadanada Pai Rd, Chirakkara, Thalassery</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-[11px] text-slate-400 font-mono">
            <span>DL: 13/134/20/05</span>
            <span className="mx-2">•</span>
            <span>GSTIN: 32AABCB1234D1Z5</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-[11px]">
          {/* Terminal Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            <span className="text-slate-400">Branch:</span>
            <select
              value={currentStore}
              onChange={(e) => setCurrentStore(e.target.value)}
              className="bg-transparent text-sky-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="shop1" className="bg-slate-900 text-slate-100">Shop 1 — Chirakkara (This Counter)</option>
              <option value="shop2" className="bg-slate-900 text-slate-100">Shop 2 — Kannur Road</option>
              <option value="shop3" className="bg-slate-900 text-slate-100">Shop 3 — Vatakara</option>
            </select>
          </div>

          {/* Sync Status Button */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center space-x-1.5 ${
              isOffline
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}
            title="Click to toggle offline mode simulation"
          >
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>{isOffline ? 'OFFLINE (Local Queue)' : 'CLOUD SYNC: ACTIVE'}</span>
          </button>

          <div className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {currentTime}
          </div>
        </div>
      </div>

      {/* Level 2: Invoice & Prescription Header Bar */}
      <div className="px-3 py-1.5 bg-slate-800 grid grid-cols-12 gap-2 items-center text-xs">
        {/* Bill Number & Date */}
        <div className="col-span-2 flex items-center space-x-2 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-700">
          <span className="text-slate-400 text-[10px] font-mono uppercase">Bill:</span>
          <span className="font-mono font-bold text-sky-300 text-sm tracking-wider">{billNo}</span>
          <span className="text-slate-500 font-mono text-[10px]">({billDate})</span>
        </div>

        {/* Patient / Customer Field */}
        <div className="col-span-4 flex items-center space-x-2 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-700 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
          <span className="text-slate-400 font-mono text-[10px] uppercase whitespace-nowrap">
            Patient [F2]:
          </span>
          <input
            ref={patientInputRef}
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Walk-in Cash Customer"
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 font-medium text-xs focus:outline-none"
          />
        </div>

        {/* Doctor Field */}
        <div className="col-span-4 flex items-center space-x-2 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-700 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
          <span className="text-slate-400 font-mono text-[10px] uppercase whitespace-nowrap">
            Dr. [F3]:
          </span>
          <input
            ref={doctorInputRef}
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="Dr. MADHUSUDHANAN T"
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 font-medium text-xs focus:outline-none"
          />
        </div>

        {/* Payment Mode Selection */}
        <div className="col-span-2 flex items-center justify-end space-x-1">
          {['cash', 'upi', 'credit'].map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentMode(mode)}
              className={`px-2.5 py-1 rounded font-mono font-bold uppercase text-[10px] transition-all border ${
                paymentMode === mode
                  ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
