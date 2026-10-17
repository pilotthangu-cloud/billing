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
  AlertTriangle,
  Percent,
  Tag,
  DollarSign,
  TrendingUp,
  Package,
  Ban,
  CheckCircle2
} from 'lucide-react';

export default function ProductCatalogPage({ 
  theme, 
  medicines, 
  onBackToBilling, 
  onOpenNewMedModal,
  onUpdateMedicine
}) {
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [selectedRack, setSelectedRack] = useState('ALL');
  const [selectedSchedule, setSelectedSchedule] = useState('ALL');
  const [selectedTax, setSelectedTax] = useState('ALL');
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
      (m.hsn && m.hsn.includes(q)) ||
      (m.code && m.code.toLowerCase().includes(q));

    const matchesRack = selectedRack === 'ALL' || (m.rack || 'GN') === selectedRack;
    const matchesSchedule = selectedSchedule === 'ALL' || (m.schedule || 'Normal') === selectedSchedule;
    const matchesTax = selectedTax === 'ALL' || String(m.gstPercent !== undefined ? m.gstPercent : 12) === selectedTax;

    return matchesSearch && matchesRack && matchesSchedule && matchesTax;
  }).slice(0, 100);

  const handleOpenEdit = (med, e) => {
    if (e) e.stopPropagation();
    setEditingMedicine(med);
    setEditFormData({
      code: med.code || '',
      name: med.name || '',
      rack: med.rack || 'GN',
      mrp: med.mrp || 0,
      ptr: med.ptr !== undefined ? med.ptr : +(med.mrp * 0.78).toFixed(2),
      per: med.per || 10,
      generic: med.generic || '',
      company: med.company || '',
      hsn: med.hsn || '3004',
      gstPercent: med.gstPercent !== undefined ? med.gstPercent : 12,
      schedule: med.schedule || 'Normal',
      ro_level: med.ro_level || 5,
      dn_level: med.dn_level || 2,
      ro_qty: med.ro_qty || 10,
      stock_shop1: med.stock_shop1 || 0,
      barcode: med.barcode || '',
      isBlocked: !!med.isBlocked
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
      mrp: parseFloat(editFormData.mrp) || editingMedicine.mrp || 0,
      ptr: parseFloat(editFormData.ptr) || editingMedicine.ptr || 0,
      gstPercent: parseFloat(editFormData.gstPercent) !== undefined ? parseFloat(editFormData.gstPercent) : 12,
      per: parseInt(editFormData.per, 10) || 10,
      ro_level: parseInt(editFormData.ro_level, 10) || 5,
      dn_level: parseInt(editFormData.dn_level, 10) || 2,
      ro_qty: parseInt(editFormData.ro_qty, 10) || 10,
      rack: (editFormData.rack || 'GN').trim().toUpperCase(),
      hsn: (editFormData.hsn || '3004').trim(),
      schedule: editFormData.schedule || 'Normal',
      company: (editFormData.company || '').trim(),
      generic: (editFormData.generic || '').trim(),
      barcode: (editFormData.barcode || '').trim(),
      isBlocked: !!editFormData.isBlocked
    };

    if (onUpdateMedicine) {
      onUpdateMedicine(updated);
    }

    setSaveToast(`Updated "${updated.name}" — Tax: ${updated.gstPercent}% GST, Rack: R-${updated.rack}`);
    setTimeout(() => setSaveToast(''), 3500);
    setEditingMedicine(null);
  };

  // Quick margin calculation in edit modal
  const curMrp = parseFloat(editFormData.mrp) || 0;
  const curPtr = parseFloat(editFormData.ptr) || 0;
  const curGst = parseFloat(editFormData.gstPercent) || 0;
  const marginAmt = curMrp > 0 ? (curMrp - curPtr) : 0;
  const marginPct = curMrp > 0 ? ((marginAmt / curMrp) * 100).toFixed(1) : '0.0';
  const taxableVal = curMrp > 0 ? +(curMrp / (1 + curGst / 100)).toFixed(2) : 0;
  const gstAmt = +(curMrp - taxableVal).toFixed(2);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Toast Notification */}
      {saveToast && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl font-mono font-bold text-xs flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToBilling}
            className={`p-2 rounded-lg border font-bold transition flex items-center space-x-1 ${
              isDark 
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
              <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Product Master Catalog [MAS001 / ITEMFILE.DBF]
              </h2>
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded border ${
                isDark ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-sky-100 text-sky-950 border-sky-300'
              }`}>
                {medicines.length.toLocaleString()} Master Items
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Click any medicine or Edit icon to modify Tax % (GST 0/5/12/18/28%), Shelf Rack, Pricing, HSN & Reorder
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* GST Tax Slab Filter */}
          <div className="flex items-center space-x-1">
            <span className={`text-[11px] font-mono font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Tax:</span>
            <select
              value={selectedTax}
              onChange={(e) => setSelectedTax(e.target.value)}
              className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
              }`}
            >
              <option value="ALL">All Taxes</option>
              <option value="12">12% GST (Std)</option>
              <option value="5">5% GST (Crit)</option>
              <option value="0">0% GST (Nil)</option>
              <option value="18">18% GST (Hyg)</option>
              <option value="28">28% GST (Lux)</option>
            </select>
          </div>

          {/* Schedule Filter */}
          <div className="flex items-center space-x-1">
            <span className={`text-[11px] font-mono font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Sch:</span>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
              }`}
            >
              <option value="ALL">All Schedules</option>
              <option value="Normal">Normal OTC</option>
              <option value="Schedule H">Schedule H</option>
              <option value="Schedule H1">Schedule H1</option>
              <option value="Narcotic">Narcotic</option>
            </select>
          </div>

          {/* Shelf Rack Quick Filter */}
          <div className="flex items-center space-x-1">
            <span className={`text-[11px] font-mono font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Rack:</span>
            <select
              value={selectedRack}
              onChange={(e) => setSelectedRack(e.target.value)}
              className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950 shadow-sm'
              }`}
            >
              <option value="ALL">All Racks</option>
              {allRacks.filter(r => r !== 'ALL').slice(0, 40).map(r => (
                <option key={r} value={r}>Rack {r}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="w-64 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 24k items by name, salt, rack..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-slate-400 text-slate-950 placeholder-slate-500 shadow-sm'
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

      {/* Modern High-Contrast Table */}
      <div className="flex-1 overflow-y-auto">
        <table className={`w-full text-left border-collapse text-xs font-mono border ${
          isDark ? 'border-zinc-800' : 'border-slate-300'
        }`}>
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-200 border-slate-300 text-slate-950'
            }`}>
              <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">Sr</th>
              <th className="py-2.5 px-3 border-r border-inherit">Product Name & Molecule Salt</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Shelf Rack</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-20">HSN</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-20">GST %</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-24">M.R.P.</th>
              <th className="py-2.5 px-3 text-right border-r border-inherit w-24">P.T.R.</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-16">Pack</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-28">Current Stock</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-20">Reorder</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Schedule</th>
              <th className="py-2.5 px-3 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-inherit">
            {filtered.map((med, idx) => {
              const gst = med.gstPercent !== undefined ? med.gstPercent : 12;
              const stock = med.stock_shop1 || 0;
              const isBlocked = !!med.isBlocked;

              return (
                <tr 
                  key={med.code || idx}
                  onClick={(e) => handleOpenEdit(med, e)}
                  className={`transition-colors border-b cursor-pointer ${
                    isBlocked
                      ? (isDark ? 'bg-red-950/20 hover:bg-red-950/40 border-zinc-800' : 'bg-red-50/50 hover:bg-red-50 border-slate-300')
                      : (isDark ? 'hover:bg-zinc-900 border-zinc-800' : 'hover:bg-sky-50/80 border-slate-300')
                  }`}
                >
                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    {idx + 1}
                  </td>

                  <td className="py-2 px-3 font-sans border-r border-inherit">
                    <div className="flex items-center space-x-2">
                      <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        {med.name}
                      </span>
                      {isBlocked && (
                        <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded border ${
                          isDark ? 'bg-red-950 text-red-300 border-red-700' : 'bg-red-100 text-red-900 border-red-300'
                        }`}>
                          BLOCKED
                        </span>
                      )}
                    </div>
                    {med.generic && (
                      <div className={`text-[11px] font-mono font-bold mt-0.5 ${
                        isDark ? 'text-sky-300' : 'text-sky-800'
                      }`}>
                        {med.generic}
                      </div>
                    )}
                    {med.company && (
                      <div className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        Mfg: {med.company}
                      </div>
                    )}
                  </td>

                  {/* Lit Shelf Rack Pill (Electric Cyan / Sky Blue) */}
                  <td className="py-2 px-3 text-center border-r border-inherit">
                    <span className={`px-2.5 py-0.5 rounded font-black text-xs border shadow-xs inline-block ${
                      isDark 
                        ? 'bg-sky-950/80 text-sky-300 border-sky-600' 
                        : 'bg-sky-50 text-sky-800 border-sky-300'
                    }`}>
                      R-{med.rack || 'GN'}
                    </span>
                  </td>

                  {/* HSN Code */}
                  <td className={`py-2 px-3 text-center font-mono font-black border-r border-inherit ${
                    isDark ? 'text-zinc-200' : 'text-slate-900'
                  }`}>
                    {med.hsn || '3004'}
                  </td>

                  {/* Lit GST % Pill */}
                  <td className="py-2 px-3 text-center border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded font-black text-xs border shadow-xs inline-block ${
                      isDark 
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600' 
                        : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                    }`}>
                      {gst}%
                    </span>
                  </td>

                  {/* M.R.P. */}
                  <td className={`py-2 px-3 text-right font-black border-r border-inherit ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    ₹{(med.mrp || 0).toFixed(2)}
                  </td>

                  {/* P.T.R. */}
                  <td className={`py-2 px-3 text-right font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-300' : 'text-slate-800'
                  }`}>
                    ₹{med.ptr ? med.ptr.toFixed(2) : ((med.mrp || 0) * 0.78).toFixed(2)}
                  </td>

                  {/* Pack */}
                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    {med.per || 10}s
                  </td>

                  {/* Lit Current Stock Pill */}
                  <td className="py-2 px-3 text-center font-black border-r border-inherit">
                    <span className={`px-2 py-0.5 rounded text-xs font-black border shadow-xs inline-block ${
                      stock > 0 
                        ? (isDark 
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-400')
                        : (isDark 
                            ? 'bg-rose-950/80 text-rose-300 border-rose-600 font-bold' 
                            : 'bg-rose-50 text-rose-700 border-rose-300 font-bold')
                    }`}>
                      {stock} in stock
                    </span>
                  </td>

                  {/* Reorder Level */}
                  <td className={`py-2 px-3 text-center font-bold border-r border-inherit ${
                    isDark ? 'text-zinc-400' : 'text-slate-700'
                  }`}>
                    {med.ro_level || 5} u
                  </td>

                  {/* Lit Schedule Pill */}
                  <td className="py-2 px-3 text-center font-bold border-r border-inherit">
                    <span className={`text-[10px] px-2 py-0.5 rounded border inline-block ${
                      ['Schedule H', 'Schedule H1', 'Narcotic'].includes(med.schedule)
                        ? (isDark 
                            ? 'bg-violet-950/80 text-violet-300 border-violet-600 font-black shadow-xs' 
                            : 'bg-violet-50 text-violet-800 border-violet-300 font-black shadow-xs')
                        : (isDark 
                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700 font-semibold' 
                            : 'bg-slate-100 text-slate-700 border-slate-300 font-semibold')
                    }`}>
                      {med.schedule || 'Normal'}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={(e) => handleOpenEdit(med, e)}
                      className={`p-1.5 rounded transition ${
                        isDark ? 'hover:bg-zinc-800 text-sky-400' : 'hover:bg-sky-100 text-sky-600'
                      }`}
                      title="Edit Medicine & Tax Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Comprehensive In-Place Edit Medicine & Tax Modal */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-950'
          }`}>
            {/* Modal Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Edit Medicine Master & Tax Slab [MAS001 / TAX.DBF]
                  </h3>
                  <p className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Code: {editFormData.code || 'Auto'} • Changes sync immediately to live billing & purchase inward
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingMedicine(null)}
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-6 gap-3">
                {/* Trade Name */}
                <div className="col-span-6">
                  <label className="block text-xs font-bold mb-1">Product Trade Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                {/* Generic Salt */}
                <div className="col-span-4">
                  <label className="block text-xs font-bold mb-1">Generic Chemical Salt Composition</label>
                  <input
                    type="text"
                    value={editFormData.generic}
                    onChange={(e) => setEditFormData({ ...editFormData, generic: e.target.value })}
                    placeholder="e.g. PARACETAMOL 650 MG"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                {/* Manufacturer Company */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Manufacturer / Brand</label>
                  <input
                    type="text"
                    value={editFormData.company}
                    onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                    placeholder="e.g. Cipla / Sun Pharma"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                {/* Shelf Rack */}
                <div className="col-span-2">
                  <label className={`block text-xs font-black mb-1 ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                    Shelf Rack Location (RACK)
                  </label>
                  <input
                    type="text"
                    value={editFormData.rack}
                    onChange={(e) => setEditFormData({ ...editFormData, rack: e.target.value.toUpperCase() })}
                    placeholder="e.g. A1, R-56"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-sky-300' : 'bg-sky-50 border-sky-400 text-sky-950'
                    }`}
                  />
                </div>

                {/* GST Tax Slab Edit (Legacy MAS010 Feature) */}
                <div className="col-span-2">
                  <label className={`block text-xs font-black mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                    Tax Slab (TAX_PER) *
                  </label>
                  <select
                    value={editFormData.gstPercent}
                    onChange={(e) => setEditFormData({ ...editFormData, gstPercent: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-indigo-300' : 'bg-indigo-50 border-indigo-400 text-indigo-950'
                    }`}
                  >
                    <option value={12}>12% GST (Standard Medicaments)</option>
                    <option value={5}>5% GST (Critical / Insulin)</option>
                    <option value={0}>0% GST (Exempt / Life Saving)</option>
                    <option value={18}>18% GST (Nutraceuticals / Hygiene)</option>
                    <option value={28}>28% GST (Cosmetics / Luxury)</option>
                  </select>
                </div>

                {/* HSN Code */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">GST HSN Code</label>
                  <input
                    type="text"
                    value={editFormData.hsn}
                    onChange={(e) => setEditFormData({ ...editFormData, hsn: e.target.value })}
                    placeholder="3004"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                {/* Pricing: MRP & PTR */}
                <div className="col-span-3">
                  <label className="block text-xs font-bold mb-1">M.R.P. (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.mrp}
                    onChange={(e) => setEditFormData({ ...editFormData, mrp: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-bold mb-1">P.T.R. Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.ptr}
                    onChange={(e) => setEditFormData({ ...editFormData, ptr: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-black font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                {/* Tax Breakdown Strip */}
                <div className={`col-span-6 p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-300'
                }`}>
                  <div className="flex items-center space-x-1">
                    <Percent className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-bold">Tax Breakdown:</span>
                  </div>
                  <span>Taxable Val: <strong>₹{taxableVal.toFixed(2)}</strong></span>
                  <span>GST ({curGst}%): <strong>₹{gstAmt.toFixed(2)}</strong></span>
                  <span>CGST: <strong>₹{(gstAmt / 2).toFixed(2)}</strong></span>
                  <span>SGST: <strong>₹{(gstAmt / 2).toFixed(2)}</strong></span>
                </div>

                {/* Pack Size, Reorder, Danger, Reorder Qty */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Pack Size (PER)</label>
                  <input
                    type="number"
                    value={editFormData.per}
                    onChange={(e) => setEditFormData({ ...editFormData, per: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Reorder Level (RO_LEVEL)</label>
                  <input
                    type="number"
                    value={editFormData.ro_level}
                    onChange={(e) => setEditFormData({ ...editFormData, ro_level: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">Danger Level (DN_LEVEL)</label>
                  <input
                    type="number"
                    value={editFormData.dn_level}
                    onChange={(e) => setEditFormData({ ...editFormData, dn_level: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  />
                </div>

                {/* Schedule Category */}
                <div className="col-span-3">
                  <label className="block text-xs font-bold mb-1">Schedule Drug Category</label>
                  <select
                    value={editFormData.schedule}
                    onChange={(e) => setEditFormData({ ...editFormData, schedule: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold focus:ring-2 focus:ring-sky-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950'
                    }`}
                  >
                    <option value="Normal">Normal OTC</option>
                    <option value="Schedule H">Schedule H (Prescription)</option>
                    <option value="Schedule H1">Schedule H1 (High Risk / Antibiotic)</option>
                    <option value="Narcotic">Narcotic / NDPS</option>
                    <option value="Schedule G">Schedule G</option>
                    <option value="Schedule X">Schedule X</option>
                  </select>
                </div>

                {/* Discontinued / Blocked Status (Clipper BLOCKED.PRG) */}
                <div className="col-span-3">
                  <label className="block text-xs font-bold mb-1">Item Status (BLOCKED.PRG)</label>
                  <select
                    value={editFormData.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                    onChange={(e) => setEditFormData({ ...editFormData, isBlocked: e.target.value === 'BLOCKED' })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold focus:ring-2 focus:ring-sky-500 ${
                      editFormData.isBlocked 
                        ? (isDark ? 'bg-red-950 border-red-700 text-red-300' : 'bg-red-50 border-red-400 text-red-900')
                        : (isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-400 text-slate-950')
                    }`}
                  >
                    <option value="ACTIVE">Active (Available for Sale)</option>
                    <option value="BLOCKED">Blocked / Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
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
                  <Save className="w-4 h-4" />
                  <span>Save Product & Tax Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
