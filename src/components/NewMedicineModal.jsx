import React, { useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';

export default function NewMedicineModal({ isOpen, onClose, onAddMedicine, theme }) {
  const [formData, setFormData] = useState({
    name: '',
    group: 'T',
    rack: '',
    company: '',
    generic: '',
    mrp: '',
    per: '10',
    batch_no: '',
    exp_date: '',
    stock: '20',
    supplier: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const newMed = {
      code: 'NEW' + Math.floor(1000 + Math.random() * 9000),
      name: formData.name.toUpperCase().trim(),
      group: formData.group,
      group_label: formData.group === 'T' ? 'Tablet' : (formData.group === 'L' ? 'Liquid' : (formData.group === 'C' ? 'Capsule' : 'Other')),
      rack: formData.rack.trim() || 'GEN',
      company: formData.company.toUpperCase().trim() || 'PHARMA',
      generic: formData.generic.toUpperCase().trim(),
      mrp: parseFloat(formData.mrp) || 100.00,
      ptr: Math.round((parseFloat(formData.mrp) || 100) * 0.78),
      per: parseInt(formData.per) || 10,
      hsn: '3004',
      tax_percent: 12.0,
      stock_shop1: parseInt(formData.stock) || 0,
      stock_shop2: 0,
      stock_shop3: 0,
      schedule: 'Normal',
      ro_level: 10,
      batches: [
        {
          batch_no: formData.batch_no.trim() || 'B101',
          exp_date: formData.exp_date.trim() || '',
          mrp: parseFloat(formData.mrp) || 100.00,
          per: parseInt(formData.per) || 10,
          supplier: formData.supplier || ''
        }
      ]
    };

    onAddMedicine(newMed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden font-sans ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold">Add New Medicine to Product Master</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">
              Medicine / Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CALPOL 650MG TAB"
              className={`w-full px-3 py-2 rounded border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">
                Form / Group
              </label>
              <select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                className={`w-full px-2 py-2 rounded border font-semibold text-xs ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="T">Tablet</option>
                <option value="C">Capsule</option>
                <option value="L">Liquid / Syrup</option>
                <option value="I">Injection</option>
                <option value="O">Ointment / Gel</option>
                <option value="D">Drops</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">
                Shelf Rack Number *
              </label>
              <input
                type="text"
                required
                value={formData.rack}
                onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                placeholder="e.g. 29 or C2"
                className={`w-full px-3 py-2 rounded border font-bold text-xs ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">
              Generic Salt Composition
            </label>
            <input
              type="text"
              value={formData.generic}
              onChange={(e) => setFormData({ ...formData, generic: e.target.value })}
              placeholder="e.g. Paracetamol 650mg"
              className={`w-full px-3 py-2 rounded border font-medium text-xs ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">
                Manufacturer / Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. GSK"
                className={`w-full px-3 py-2 rounded border font-medium text-xs ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">
                Distributor / Supplier
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="e.g. THE CAN DRUG HOUSE"
                className={`w-full px-3 py-2 rounded border font-medium text-xs ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 border-t border-inherit">
            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">Batch No</label>
              <input
                type="text"
                value={formData.batch_no}
                onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                placeholder="B101"
                className={`w-full px-2 py-1.5 rounded border text-xs font-mono font-bold ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">Expiry (MM/YY)</label>
              <input
                type="text"
                value={formData.exp_date}
                onChange={(e) => setFormData({ ...formData, exp_date: e.target.value })}
                placeholder="12/28"
                className={`w-full px-2 py-1.5 rounded border text-xs font-mono font-bold ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder="45.00"
                className={`w-full px-2 py-1.5 rounded border text-xs font-mono font-bold text-right ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-zinc-400 font-bold mb-1">Stock (Strips)</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="20"
                className={`w-full px-2 py-1.5 rounded border text-xs font-mono font-bold text-center ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-3 border-t border-inherit">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-lg font-bold border transition ${
                theme === 'dark' ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-300 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow flex items-center justify-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Save & Add to Catalog</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
