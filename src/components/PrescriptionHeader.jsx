import React from 'react';
import { User, Stethoscope, Hash, Calendar, CreditCard, Smartphone } from 'lucide-react';

export default function PrescriptionHeader({
  billNo,
  billDate,
  patientName,
  setPatientName,
  doctorName,
  setDoctorName,
  paymentMode,
  setPaymentMode
}) {
  const commonDoctors = [
    "Dr. MADHUSUDHANAN T",
    "Dr. MANOJ",
    "Dr. RAJESH KUMAR",
    "M C H HOSPITAL",
    "GENERAL OTC"
  ];

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
      {/* Bill Meta */}
      <div className="flex items-center space-x-2 bg-slate-950/70 p-2 rounded border border-slate-800">
        <div className="p-1.5 bg-sky-950 text-sky-400 rounded">
          <Hash className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Bill Number</div>
          <div className="text-slate-100 font-bold font-mono text-sm">{billNo}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-slate-400 font-mono">Date</div>
          <div className="text-slate-300 font-mono text-xs">{billDate}</div>
        </div>
      </div>

      {/* Patient Name */}
      <div className="bg-slate-950/70 p-2 rounded border border-slate-800 flex flex-col justify-center">
        <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center space-x-1 mb-1">
          <User className="w-3 h-3 text-slate-400" />
          <span>Patient / Customer Name</span>
        </label>
        <input
          type="text"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Walk-in Cash Customer"
          className="bg-transparent text-slate-100 placeholder-slate-500 font-medium text-xs focus:outline-none focus:text-sky-300"
        />
      </div>

      {/* Doctor Prescriber */}
      <div className="bg-slate-950/70 p-2 rounded border border-slate-800 flex flex-col justify-center">
        <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center space-x-1 mb-1">
          <Stethoscope className="w-3 h-3 text-sky-400" />
          <span>Prescribing Doctor</span>
        </label>
        <input
          type="text"
          list="doctor-suggestions"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="e.g. Dr. MADHUSUDHANAN T"
          className="bg-transparent text-slate-100 placeholder-slate-500 font-medium text-xs focus:outline-none focus:text-sky-300"
        />
        <datalist id="doctor-suggestions">
          {commonDoctors.map((doc, idx) => (
            <option key={idx} value={doc} />
          ))}
        </datalist>
      </div>

      {/* Payment Mode Selector */}
      <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800 flex items-center justify-between">
        <div className="text-[10px] text-slate-400 font-mono pl-1">Payment:</div>
        <div className="grid grid-cols-3 gap-1 w-3/4">
          <button
            type="button"
            onClick={() => setPaymentMode('cash')}
            className={`py-1 px-2 rounded text-center font-medium text-[11px] transition-all ${
              paymentMode === 'cash' 
                ? 'bg-emerald-600 text-white font-bold shadow' 
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Cash
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('upi')}
            className={`py-1 px-2 rounded text-center font-medium text-[11px] transition-all ${
              paymentMode === 'upi' 
                ? 'bg-sky-600 text-white font-bold shadow' 
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            UPI
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('credit')}
            className={`py-1 px-2 rounded text-center font-medium text-[11px] transition-all ${
              paymentMode === 'credit' 
                ? 'bg-purple-600 text-white font-bold shadow' 
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Credit
          </button>
        </div>
      </div>
    </div>
  );
}
