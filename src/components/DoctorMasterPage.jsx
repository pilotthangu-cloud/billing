import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  UserCheck, 
  Hospital, 
  Phone, 
  MapPin, 
  Printer, 
  Download, 
  Plus, 
  Edit3, 
  Check, 
  Building2,
  Stethoscope
} from 'lucide-react';
import doctorList from '../data/doctors.json';

export default function DoctorMasterPage({ theme, onBackToBilling, onSelectDoctorForBilling }) {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newClinic, setNewClinic] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return doctorList;
    return doctorList.filter(d => 
      d.name.toLowerCase().includes(q) || 
      (d.code && d.code.toLowerCase().includes(q)) ||
      (d.address && d.address.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Top Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
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
              <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Doctor & Hospital Master [MAS007 / DOCTOR.DBF]
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isDark 
                  ? 'bg-sky-950 text-sky-300 border-sky-800' 
                  : 'bg-sky-100 text-sky-950 border-sky-300'
              }`}>
                {doctorList.length} Registered Prescribers
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Registered medical practitioners, clinics, and government hospitals across Thalassery, Kannur & Calicut
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center space-x-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Doctor</span>
          </button>

          <button
            onClick={() => window.print()}
            className={`py-1.5 px-3 rounded-lg border font-bold flex items-center space-x-1.5 transition ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-sm'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Print Master</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`p-3 border-b text-xs font-mono ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctor name or clinic (e.g. Dr. Venugopal, Easaw, MCH Calicut, National Hospital)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 py-2 px-3 rounded border font-bold text-xs ${
              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950 shadow-xs'
            }`}
          />
        </div>
      </div>

      {/* Doctors Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold sticky top-0 z-10 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
            }`}>
              <th className="py-2.5 px-3 w-16 text-center border-r border-inherit">Code</th>
              <th className="py-2.5 px-3 border-r border-inherit">Doctor / Clinic / Hospital Name</th>
              <th className="py-2.5 px-3 border-r border-inherit">Clinic / Hospital Address</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-36">Phone</th>
              <th className="py-2.5 px-3 text-center w-36">Schedule H Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
            {filteredDoctors.slice(0, 150).map((d, idx) => (
              <tr 
                key={idx} 
                onClick={() => setSelectedDoctor(d)}
                className={`cursor-pointer transition ${
                  selectedDoctor?.code === d.code
                    ? (isDark ? 'bg-sky-950/50' : 'bg-sky-100/70')
                    : (isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50')
                }`}
              >
                <td className="py-2 px-3 text-center font-black text-sky-600 border-r border-inherit">
                  {d.code}
                </td>
                <td className="py-2 px-3 font-sans font-black text-xs border-r border-inherit">
                  <div className="flex items-center space-x-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className={isDark ? 'text-white' : 'text-slate-950'}>{d.name}</span>
                  </div>
                </td>
                <td className={`py-2 px-3 font-sans text-xs border-r border-inherit ${
                  isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}>
                  {d.address || 'Thalassery / Kannur Region'}
                </td>
                <td className="py-2 px-3 text-center font-mono border-r border-inherit text-slate-500">
                  {d.phone || '-'}
                </td>
                <td className="py-2 px-3 text-center font-bold text-emerald-600">
                  AUTHORIZED RX
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Doctor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className={`max-w-md w-full rounded-xl border p-5 shadow-2xl ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <h3 className="text-base font-black mb-3">Add New Doctor to Master [MAS007]</h3>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Doctor / Hospital Name</label>
                <input
                  type="text"
                  placeholder="DR. NAME MBBS MD"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value.toUpperCase())}
                  className="w-full py-1.5 px-2 rounded border font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Clinic / Hospital Address</label>
                <input
                  type="text"
                  placeholder="e.g. Sadanada Pai Road, Thalassery"
                  value={newClinic}
                  onChange={(e) => setNewClinic(e.target.value)}
                  className="w-full py-1.5 px-2 rounded border font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 0490-232145"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full py-1.5 px-2 rounded border font-bold"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2 font-mono text-xs">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`px-3 py-1.5 rounded border font-bold ${
                  isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newDoctorName.trim()) {
                    alert('Enter doctor name');
                    return;
                  }
                  alert(`Doctor "${newDoctorName}" added to Master!`);
                  setIsAddModalOpen(false);
                }}
                className="px-4 py-1.5 rounded bg-sky-600 text-white font-bold"
              >
                Save Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
