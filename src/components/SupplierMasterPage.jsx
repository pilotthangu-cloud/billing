import React, { useState } from 'react';
import { 
  Search, 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Building2, 
  User, 
  Edit3, 
  PlusCircle, 
  X, 
  Save, 
  Check, 
  Clock, 
  Receipt 
} from 'lucide-react';
import initialSuppliers from '../data/suppliers.json';

export default function SupplierMasterPage({ theme, onBackToBilling }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const q = search.trim().toLowerCase();
  const filtered = suppliers.filter(s => 
    q.length === 0 ||
    s.name.toLowerCase().includes(q) || 
    (s.address && s.address.toLowerCase().includes(q)) ||
    (s.contact && s.contact.toLowerCase().includes(q)) ||
    (s.phone && s.phone.includes(q)) ||
    (s.code && s.code.toLowerCase().includes(q)) ||
    (s.kgst && s.kgst.includes(q))
  ).slice(0, 100);

  const handleOpenEdit = (s, e) => {
    e.stopPropagation();
    setIsAddMode(false);
    setEditingSupplier(s);
    setFormData({
      code: s.code || '',
      name: s.name || '',
      address: s.address || '',
      add1: s.add1 || '',
      add2: s.add2 || '',
      add3: s.add3 || '',
      phone: s.phone || '',
      contact: s.contact || '',
      creditDays: s.creditDays || 21,
      kgst: s.kgst || '',
      cst: s.cst || ''
    });
  };

  const handleOpenAdd = () => {
    setIsAddMode(true);
    setEditingSupplier({});
    setFormData({
      code: `S${(suppliers.length + 1).toString().padStart(3, '0')}`,
      name: '',
      address: '',
      add1: '',
      add2: '',
      add3: 'THALASSERY',
      phone: '',
      contact: '',
      creditDays: 21,
      kgst: '',
      cst: ''
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Agency Name is required');
      return;
    }

    const addrParts = [formData.add1, formData.add2, formData.add3].filter(Boolean);
    const combinedAddress = addrParts.join(', ') || formData.address;

    const record = {
      ...formData,
      address: combinedAddress,
      creditDays: parseInt(formData.creditDays) || 21
    };

    if (isAddMode) {
      setSuppliers(prev => [record, ...prev]);
      setToastMessage(`Added new distributor "${record.name}" successfully!`);
    } else {
      setSuppliers(prev => prev.map(s => s.code === record.code ? record : s));
      setToastMessage(`Updated distributor "${record.name}" successfully!`);
    }

    setTimeout(() => setToastMessage(''), 3500);
    setEditingSupplier(null);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1 ${
              theme === 'dark' 
                ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white' 
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 shadow-sm'
            }`}
            title="Back to Sale Billing (Esc)"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-mono font-bold">Billing (Esc)</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                Supplier & Distributor Master [MAS002 / SUPPMAST.DBF]
              </h2>
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded border ${
                theme === 'dark' 
                  ? 'bg-sky-950 text-sky-300 border-sky-800' 
                  : 'bg-sky-100 text-sky-950 border-sky-300'
              }`}>
                {suppliers.length} Registered Agencies
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Click any distributor to edit credit payment terms, phone, address, and GST registration
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-80 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search distributor, contact, code, phone, GST..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                theme === 'dark' 
                  ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' 
                  : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
              }`}
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg text-xs flex items-center space-x-1.5 shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Agency</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-200 border-slate-300 text-slate-900'
            }`}>
              <th className="py-2.5 px-3 w-20 text-center border-r border-inherit">Agency Code</th>
              <th className="py-2.5 px-3 border-r border-inherit">Distributor / Agency Name</th>
              <th className="py-2.5 px-3 border-r border-inherit">Address / Location</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Credit Days</th>
              <th className="py-2.5 px-3 border-r border-inherit w-36">Telephone</th>
              <th className="py-2.5 px-3 border-r border-inherit w-36">Contact Person</th>
              <th className="py-2.5 px-3 border-r border-inherit w-32">GST / KGST</th>
              <th className="py-2.5 px-3 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filtered.map((s, idx) => (
              <tr 
                key={s.code || idx}
                onClick={(e) => handleOpenEdit(s, e)}
                className={`transition-colors border-b cursor-pointer ${
                  theme === 'dark' ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-sky-50/70 border-slate-300'
                }`}
              >
                <td className={`py-2 px-3 text-center font-black border-r border-inherit font-mono ${
                  theme === 'dark' ? 'text-sky-400' : 'text-sky-800'
                }`}>
                  {s.code}
                </td>

                <td className="py-2 px-3 font-sans border-r border-inherit">
                  <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                    {s.name}
                  </div>
                </td>

                <td className={`py-2 px-3 font-sans border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'
                }`}>
                  <div className="flex items-center space-x-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{s.address || 'KANNUR / THALASSERY'}</span>
                  </div>
                </td>

                <td className="py-2 px-3 text-center border-r border-inherit font-bold">
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${
                    s.creditDays > 30 
                      ? (theme === 'dark' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-amber-100 text-amber-950 border border-amber-400')
                      : (theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-900')
                  }`}>
                    {s.creditDays || 21} days
                  </span>
                </td>

                <td className={`py-2 px-3 font-mono font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                }`}>
                  {s.phone ? (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">--</span>
                  )}
                </td>

                <td className={`py-2 px-3 font-sans border-r border-inherit font-bold ${
                  theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                }`}>
                  {s.contact ? (
                    <div className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{s.contact}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">--</span>
                  )}
                </td>

                <td className={`py-2 px-3 font-mono font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-slate-700'
                }`}>
                  {s.kgst || s.cst || '--'}
                </td>

                <td className="py-2 px-3 text-center">
                  <button
                    onClick={(e) => handleOpenEdit(s, e)}
                    className={`p-1 rounded text-sky-600 transition ${
                      theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-sky-100'
                    }`}
                    title="Edit Distributor"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {isAddMode ? 'Add New Distributor [MAS002]' : 'Edit Distributor Master [MAS002]'}
                </h3>
              </div>
              <button 
                onClick={() => setEditingSupplier(null)}
                className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Agency Code (SP_CODE)</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-black focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>Credit Days (C_DAYS)</label>
                  <input
                    type="number"
                    value={formData.creditDays}
                    onChange={(e) => setFormData({ ...formData, creditDays: e.target.value })}
                    required
                    placeholder="e.g. 21, 30, 35"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-black focus:ring-2 focus:ring-amber-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-amber-300' : 'bg-amber-50 border-amber-400 text-amber-950'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Distributor / Agency Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. THE CAN DRUG HOUSE"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Street / Building Address (ADD1 & ADD2)</label>
                  <input
                    type="text"
                    value={formData.add1}
                    onChange={(e) => setFormData({ ...formData, add1: e.target.value.toUpperCase() })}
                    placeholder="e.g. FORT ROAD, KANNUR"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">City / Town (ADD3)</label>
                  <input
                    type="text"
                    value={formData.add3}
                    onChange={(e) => setFormData({ ...formData, add3: e.target.value.toUpperCase() })}
                    placeholder="e.g. THALASSERY"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Telephone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 0490-2325049"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.toUpperCase() })}
                    placeholder="e.g. ANOOP"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">KGST / GSTIN No.</label>
                  <input
                    type="text"
                    value={formData.kgst}
                    onChange={(e) => setFormData({ ...formData, kgst: e.target.value })}
                    placeholder="e.g. 32AAAAA0000A1Z5"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold ${
                    theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{isAddMode ? 'Add Distributor' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
