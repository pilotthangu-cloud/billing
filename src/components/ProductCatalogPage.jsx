import React, { useState } from 'react';
import { 
  Search, 
  PlusCircle, 
  ArrowLeft, 
  Layers, 
  ShieldCheck, 
  Edit3, 
  X, 
  Save, 
  Check, 
  Filter,
  AlertTriangle
} from 'lucide-react';

export default function ProductCatalogPage({ 
  theme, 
  medicines, 
  onBackToBilling, 
  onOpenNewMedModal,
  onUpdateMedicine
}) {
  const [search, setSearch] = useState('');
  const [selectedRack, setSelectedRack] = useState('ALL');
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saveToast, setSaveToast] = useState('');

  // Extract unique racks for quick filter
  const allRacks = ['ALL', ...Array.from(new Set(medicines.map(m => m.rack || 'GN'))).sort()];

  const q = search.trim().toLowerCase();
  const filtered = medicines.filter(m => {
    const matchesSearch = q.length === 0 || 
      m.name.toLowerCase().includes(q) || 
      (m.generic && m.generic.toLowerCase().includes(q)) ||
      (m.rack && m.rack.toLowerCase().includes(q)) ||
      (m.company && m.company.toLowerCase().includes(q)) ||
      (m.hsn && m.hsn.includes(q));

    const matchesRack = selectedRack === 'ALL' || m.rack === selectedRack;
    return matchesSearch && matchesRack;
  }).slice(0, 100);

  const handleOpenEdit = (med, e) => {
    e.stopPropagation();
    setEditingMedicine(med);
    setEditFormData({
      code: med.code,
      name: med.name,
      rack: med.rack || 'GN',
      mrp: med.mrp,
      ptr: med.ptr || +(med.mrp * 0.78).toFixed(2),
      per: med.per || 10,
      generic: med.generic || '',
      company: med.company || '',
      hsn: med.hsn || '3004',
      schedule: med.schedule || 'Normal',
      ro_level: med.ro_level || 5,
      dn_level: med.dn_level || 2,
      ro_qty: med.ro_qty || 10,
      stock_shop1: med.stock_shop1 || 0
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      alert('Product Name cannot be blank');
      return;
    }

    const updated = {
      ...editingMedicine,
      ...editFormData,
      mrp: parseFloat(editFormData.mrp) || editingMedicine.mrp,
      ptr: parseFloat(editFormData.ptr) || editingMedicine.ptr,
      per: parseInt(editFormData.per) || 10,
      ro_level: parseInt(editFormData.ro_level) || 5,
      dn_level: parseInt(editFormData.dn_level) || 2,
      ro_qty: parseInt(editFormData.ro_qty) || 10
    };

    if (onUpdateMedicine) {
      onUpdateMedicine(updated);
    }

    setSaveToast(`Updated "${updated.name}" successfully! Shelf Rack: R-${updated.rack}`);
    setTimeout(() => setSaveToast(''), 3500);
    setEditingMedicine(null);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {saveToast && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{saveToast}</span>
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
                Product Master Catalog [MAS001 / ITEMFILE.DBF]
              </h2>
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded border ${
                theme === 'dark' ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-sky-100 text-sky-950 border-sky-300'
              }`}>
                {medicines.length.toLocaleString()} Master Items
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Click any medicine or Edit icon to modify Shelf Rack, Pricing, Re-Order Levels, and GST HSN
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Shelf Rack Quick Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-zinc-400">Rack:</span>
            <select
              value={selectedRack}
              onChange={(e) => setSelectedRack(e.target.value)}
              className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
              }`}
            >
              <option value="ALL">All Racks</option>
              {allRacks.filter(r => r !== 'ALL').slice(0, 30).map(r => (
                <option key={r} value={r}>Rack {r}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="w-72 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 24k medicines by name, salt, rack..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
              }`}
            />
          </div>

          <button
            onClick={onOpenNewMedModal}
            className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-lg text-xs flex items-center space-x-1.5 shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add New Med</span>
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
              <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
              <th className="py-2.5 px-3 border-r border-inherit">Product Name & Salt</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Shelf Rack</th>
              <th className="py-2.5 px-3 border-r border-inherit w-24">HSN Code</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-24">M.R.P.</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-24">P.T.R.</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-20">Pack</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Current Stock</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Reorder Lvl</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-20">Schedule</th>
              <th className="py-2.5 px-3 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filtered.map((med, idx) => (
              <tr 
                key={med.code || idx}
                onClick={(e) => handleOpenEdit(med, e)}
                className={`transition-colors border-b cursor-pointer ${
                  theme === 'dark' ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-sky-50/70 border-slate-300'
                }`}
              >
                <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                }`}>
                  {idx + 1}
                </td>

                <td className="py-2 px-3 font-sans border-r border-inherit">
                  <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                    {med.name}
                  </div>
                  {med.generic && (
                    <div className={`text-[11px] font-mono font-bold mt-0.5 ${
                      theme === 'dark' ? 'text-sky-300' : 'text-sky-800'
                    }`}>
                      {med.generic}
                    </div>
                  )}
                </td>

                <td className="py-2 px-3 text-center border-r border-inherit">
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 px-2.5 py-0.5 rounded font-black text-xs border border-amber-400">
                    R-{med.rack || 'GN'}
                  </span>
                </td>

                <td className={`py-2 px-3 font-mono font-black border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                }`}>
                  {med.hsn || '3004'}
                </td>

                <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                  theme === 'dark' ? 'text-white' : 'text-slate-950'
                }`}>
                  ₹{(med.mrp || 0).toFixed(2)}
                </td>

                <td className={`py-2 px-3 text-right font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-300' : 'text-slate-800'
                }`}>
                  ₹{med.ptr ? med.ptr.toFixed(2) : ((med.mrp || 0) * 0.78).toFixed(2)}
                </td>

                <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-300' : 'text-slate-700'
                }`}>
                  {med.per || 10}s
                </td>

                <td className="py-2 px-3 text-center font-black border-r border-inherit">
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${
                    (med.stock_shop1 || 0) > 0 
                      ? (theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-950 border border-emerald-400')
                      : 'text-rose-600 bg-rose-50 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                  }`}>
                    {med.stock_shop1 || 0} in stock
                  </span>
                </td>

                <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-slate-700'
                }`}>
                  {med.ro_level || 5} units
                </td>

                <td className="py-2 px-3 text-center font-bold border-r border-inherit">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    theme === 'dark' ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-950 border-purple-300'
                  }`}>
                    {med.schedule || 'Normal'}
                  </span>
                </td>

                <td className="py-2 px-3 text-center">
                  <button
                    onClick={(e) => handleOpenEdit(med, e)}
                    className="p-1 rounded hover:bg-sky-100 dark:hover:bg-zinc-800 text-sky-600 transition"
                    title="Edit Medicine Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* In-Place Edit Medicine Master Modal */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            {/* Modal Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Edit Medicine Master [MAS001]
                </h3>
              </div>
              <button 
                onClick={() => setEditingMedicine(null)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Product Trade Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Generic Chemical Salt Composition</label>
                  <input
                    type="text"
                    value={editFormData.generic}
                    onChange={(e) => setEditFormData({ ...editFormData, generic: e.target.value })}
                    placeholder="e.g. PARACETAMOL 650 MG"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-amber-700 dark:text-amber-400">Shelf Rack (e.g. A1, B2)</label>
                  <input
                    type="text"
                    value={editFormData.rack}
                    onChange={(e) => setEditFormData({ ...editFormData, rack: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-amber-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-amber-300' : 'bg-amber-50 border-amber-400 text-amber-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">GST HSN Code</label>
                  <input
                    type="text"
                    value={editFormData.hsn}
                    onChange={(e) => setEditFormData({ ...editFormData, hsn: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">M.R.P. (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.mrp}
                    onChange={(e) => setEditFormData({ ...editFormData, mrp: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">P.T.R. Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.ptr}
                    onChange={(e) => setEditFormData({ ...editFormData, ptr: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Re-Order Level (RO_LEVEL)</label>
                  <input
                    type="number"
                    value={editFormData.ro_level}
                    onChange={(e) => setEditFormData({ ...editFormData, ro_level: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Danger Minimum Level (DN_LEVEL)</label>
                  <input
                    type="number"
                    value={editFormData.dn_level}
                    onChange={(e) => setEditFormData({ ...editFormData, dn_level: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Pack Size (PER)</label>
                  <input
                    type="number"
                    value={editFormData.per}
                    onChange={(e) => setEditFormData({ ...editFormData, per: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Schedule Drug Category</label>
                  <select
                    value={editFormData.schedule}
                    onChange={(e) => setEditFormData({ ...editFormData, schedule: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold focus:ring-2 focus:ring-sky-500 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  >
                    <option value="Normal">Normal OTC</option>
                    <option value="Schedule H">Schedule H</option>
                    <option value="Schedule H1">Schedule H1</option>
                    <option value="Narcotic">Narcotic</option>
                    <option value="Schedule G">Schedule G</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
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
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
