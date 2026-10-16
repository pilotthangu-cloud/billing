import React, { useState } from 'react';
import { UserCheck, ChevronDown, Check, Stethoscope } from 'lucide-react';

export default function DoctorSelector({ doctorName, setDoctorName, theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === 'dark';

  // EXCLUSIVELY the 5 Beta Pharmacy Clinic doctors
  const clinicDoctors = [
    'Dr. Madhusoodanan T',
    'Dr. Manojan',
    'Dr. Deepa Manojan',
    'Dr. Saurabh Manojan',
    'Dr. Lakshmi Saurabh'
  ];

  const handleSelect = (doc) => {
    setDoctorName(doc);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5 w-full relative">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-mono font-black text-slate-500 flex items-center space-x-1">
          <Stethoscope className="w-3 h-3 text-sky-600" />
          <span>Prescribing Doctor [F3]</span>
        </label>
        {doctorName && (
          <button 
            type="button"
            onClick={() => setDoctorName('')}
            className="text-[10px] text-slate-400 hover:text-rose-500 font-bold"
          >
            Clear (OTC)
          </button>
        )}
      </div>

      {/* Free-typing Input + Quick Dropdown for Clinic Doctors */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Type doctor name or pick below..."
          className={`w-full py-2 pl-3 pr-8 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
            isDark
              ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
              : 'bg-white border-slate-300 text-slate-950 placeholder-slate-400 shadow-xs'
          }`}
        />

        {/* Dropdown toggle chevron */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
          title="Pick from Beta Pharmacy Clinic Doctors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown Menu - Strictly the 5 Clinic Doctors */}
        {isOpen && (
          <div className={`absolute left-0 top-full mt-1.5 w-full rounded-2xl border shadow-2xl z-50 p-1.5 font-sans divide-y ${
            isDark 
              ? 'bg-zinc-900 border-zinc-700 divide-zinc-800 text-white' 
              : 'bg-white border-slate-200 divide-slate-100 text-slate-900'
          }`}>
            <div className="px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">
              Beta Pharmacy Clinic Doctors
            </div>
            <div className="py-1">
              {clinicDoctors.map((doc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(doc)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                    doctorName === doc
                      ? 'bg-sky-600 text-white shadow-xs'
                      : isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-slate-100 text-slate-900'
                  }`}
                >
                  <span>{doc}</span>
                  {doctorName === doc && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium italic transition ${
                isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              General OTC (No Doctor)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
