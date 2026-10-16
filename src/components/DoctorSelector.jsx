import React, { useState } from 'react';
import { UserCheck, ChevronDown, Check } from 'lucide-react';

export default function DoctorSelector({ doctorName, setDoctorName, theme }) {
  const [isOpen, setIsOpen] = useState(false);

  // EXCLUSIVELY the 5 Beta Pharmacy Clinic doctors requested
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
    <div className="flex items-center space-x-1.5 w-full relative">
      <span className="text-[10px] font-mono uppercase font-black text-slate-700 dark:text-zinc-400 whitespace-nowrap">
        Doctor:
      </span>

      {/* Free-typing Input + Quick Dropdown for Clinic Doctors */}
      <div className="relative flex-1 flex items-center">
        <input
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Type doctor name or pick from clinic..."
          className={`w-full py-1 pl-2 pr-7 rounded border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 transition ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
              : 'bg-white border-slate-400 text-slate-950 placeholder-slate-400 shadow-sm'
          }`}
        />

        {/* Dropdown toggle chevron */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute right-1 p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white transition`}
          title="Pick from Beta Pharmacy Clinic Doctors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown Menu - Strictly ONLY the 5 Clinic Doctors */}
        {isOpen && (
          <div className={`absolute left-0 top-full mt-1 w-full rounded-lg border shadow-xl z-50 py-1 font-sans divide-y ${
            theme === 'dark' 
              ? 'bg-zinc-900 border-zinc-700 divide-zinc-800 text-white' 
              : 'bg-white border-slate-300 divide-slate-100 text-slate-950'
          }`}>
            <div className="px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider text-slate-500">
              Beta Pharmacy Clinic Doctors
            </div>
            {clinicDoctors.map((doc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(doc)}
                className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center justify-between transition ${
                  doctorName === doc
                    ? 'bg-sky-600 text-white'
                    : (theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-sky-50 text-slate-900')
                }`}
              >
                <span>{doc}</span>
                {doctorName === doc && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 italic"
            >
              Clear / General OTC
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
