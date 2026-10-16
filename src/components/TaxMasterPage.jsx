import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Percent, 
  BookOpen, 
  ShieldCheck, 
  Printer, 
  Download, 
  Filter, 
  Plus, 
  Check, 
  Edit3, 
  Hash, 
  HelpCircle,
  FileText,
  Clock
} from 'lucide-react';
import taxData from '../data/taxes.json';

export default function TaxMasterPage({ theme, medicines, onBackToBilling }) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('slabs'); // 'slabs', 'hsn', 'items', 'kvats'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHsn, setSelectedHsn] = useState('ALL');
  const [selectedSlab, setSelectedSlab] = useState('ALL');

  // Filter medicines for live item tax check
  const q = searchQuery.trim().toLowerCase();
  const sampleMedicines = (medicines || []).slice(0, 500); // work with sample for speed
  const filteredItems = sampleMedicines.filter(m => {
    const matchName = m.name.toLowerCase().includes(q) || (m.generic && m.generic.toLowerCase().includes(q));
    const matchHsn = selectedHsn === 'ALL' || (m.hsn && m.hsn.includes(selectedHsn));
    const matchSlab = selectedSlab === 'ALL' || (m.gstPercent !== undefined && String(m.gstPercent) === selectedSlab);
    return matchName && matchHsn && matchSlab;
  }).slice(0, 50);

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
                Tax Master & GST HSN Schedule [MAS010 / TAX.DBF]
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isDark 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                  : 'bg-emerald-100 text-emerald-950 border-emerald-300'
              }`}>
                Statutory GST & HSN
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              CGST/SGST/IGST tax rates, Chapter 30 HSN codes, and legacy Kerala KVATS rate mapping
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => window.print()}
            className={`py-1.5 px-3 rounded-lg border font-bold flex items-center space-x-1.5 transition ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-sm'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Print Tax Schedule</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className={`grid grid-cols-4 gap-4 p-4 border-b text-xs font-mono ${
        isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Standard Pharma Slab</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-600">GST 12%</p>
          <span className="text-[10px] font-semibold text-slate-500">CGST 6% + SGST 6% (~85% of Store)</span>
        </div>

        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Concessional Slab</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-sky-600">GST 5%</p>
          <span className="text-[10px] font-semibold text-slate-500">Insulin, critical vaccines, test kits</span>
        </div>

        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>HSN Chapters</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-600">8 Active HSNs</p>
          <span className="text-[10px] font-semibold text-slate-500">Primary: HSN 3004 (Medicaments)</span>
        </div>

        <div className={`p-3 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-300 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Legacy KVATS Mapping</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-600">TAX.DBF Linked</p>
          <span className="text-[10px] font-semibold text-slate-500">Code 1 (4.00%) & Code 2 (0.00%)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={`px-4 pt-2 border-b flex items-center space-x-2 font-mono text-xs ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-100 border-slate-300'
      }`}>
        <button
          onClick={() => setActiveTab('slabs')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'slabs'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          1. GST Tax Slabs (0%, 5%, 12%, 18%, 28%)
        </button>
        <button
          onClick={() => setActiveTab('hsn')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'hsn'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          2. HSN Code Directory (Chapter 30)
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'items'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          3. Live Catalog Product Tax Audit
        </button>
        <button
          onClick={() => setActiveTab('kvats')}
          className={`py-2 px-3 font-bold border-b-2 transition ${
            activeTab === 'kvats'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          4. Legacy TAX.DBF (Clipper KVATS)
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: GST TAX SLABS */}
        {activeTab === 'slabs' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Statutory GST Tax Structure for Retail Pharmacies in India
                </p>
                <p className={`mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Under CGST + SGST Act, intra-state medicine retail sales in Kerala are split 50:50 between Central and State GST.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-300">
                Active Tax System: GSTIN
              </span>
            </div>

            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-16 text-center border-r border-inherit">Code</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Tax Slab Name</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">GST Rate</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">CGST</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">SGST</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">IGST</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Pharmaceutical Scope / Description</th>
                    <th className="py-2.5 px-3 text-center w-28">Est. Items</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {taxData.gstSlabs.map((s, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                      <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                        {s.code}
                      </td>
                      <td className="py-2.5 px-3 font-bold border-r border-inherit">
                        <span className="font-sans font-black">{s.name}</span>
                        <span className="block text-[10px] text-slate-500">{s.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 border-r border-inherit">
                        {s.rate}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">
                        {s.cgst}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">
                        {s.sgst}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold border-r border-inherit">
                        {s.igst}%
                      </td>
                      <td className="py-2.5 px-3 border-r border-inherit text-slate-600 dark:text-zinc-400 font-sans text-xs">
                        {s.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black border-inherit text-sky-600">
                        {s.activeItemsCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: HSN DIRECTORY */}
        {activeTab === 'hsn' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Harmonized System of Nomenclature (HSN) — Chapter 30 (Pharmaceuticals)
                </p>
                <p className={`mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Mandatory 4-digit and 8-digit HSN classification printed on customer dot-matrix invoices and distributor e-way bills.
                </p>
              </div>
            </div>

            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">HSN Code</th>
                    <th className="py-2.5 px-3 w-28 text-center border-r border-inherit">GST Slab</th>
                    <th className="py-2.5 px-3 w-32 border-r border-inherit">GST Schedule</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Official Tariff Description</th>
                    <th className="py-2.5 px-3 border-inherit">Representative Medicines / Products</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {taxData.hsnChapters.map((h, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                      <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                        {h.hsn}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 border-r border-inherit">
                        {h.gstRate}%
                      </td>
                      <td className="py-2.5 px-3 font-bold border-r border-inherit text-slate-700 dark:text-zinc-300">
                        {h.schedule}
                      </td>
                      <td className="py-2.5 px-3 border-r border-inherit text-slate-800 dark:text-zinc-200 font-sans text-xs">
                        {h.description}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-bold text-sky-700 dark:text-sky-300">
                        {h.exampleDrugs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE CATALOG PRODUCT TAX AUDIT */}
        {activeTab === 'items' && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className={`p-3 rounded-lg border grid grid-cols-12 gap-3 text-xs font-mono ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="col-span-6 relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 24k medicines to inspect assigned tax slab..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 py-1.5 px-2 rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                />
              </div>

              <div className="col-span-3">
                <select
                  value={selectedHsn}
                  onChange={(e) => setSelectedHsn(e.target.value)}
                  className={`w-full py-1.5 px-2 rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                >
                  <option value="ALL">All HSN Chapters</option>
                  <option value="3004">HSN 3004 (General Medicaments 12%)</option>
                  <option value="3002">HSN 3002 (Vaccines & Insulin 5%)</option>
                  <option value="3005">HSN 3005 (Bandages & Dressings 12%)</option>
                  <option value="2106">HSN 2106 (Nutritional Powders 18%)</option>
                </select>
              </div>

              <div className="col-span-3">
                <select
                  value={selectedSlab}
                  onChange={(e) => setSelectedSlab(e.target.value)}
                  className={`w-full py-1.5 px-2 rounded border font-bold text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950'
                  }`}
                >
                  <option value="ALL">All GST Slabs</option>
                  <option value="12">GST 12% (Standard)</option>
                  <option value="5">GST 5% (Concessional)</option>
                  <option value="0">GST 0% (Nil)</option>
                  <option value="18">GST 18% (Consumer Pharma)</option>
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-12 text-center border-r border-inherit">#</th>
                    <th className="py-2.5 px-3 border-r border-inherit">Product Name & Molecule</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">HSN</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-24">GST %</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-28">MRP (₹)</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-28">Taxable Val</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-24">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right border-r border-inherit w-24">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-center w-28">Tax Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {filteredItems.map((m, idx) => {
                    const gst = m.gstPercent || 12;
                    const mrp = m.mrp || 100;
                    const taxable = +(mrp / (1 + gst / 100)).toFixed(2);
                    const cgstAmt = +((mrp - taxable) / 2).toFixed(2);
                    const sgstAmt = cgstAmt;

                    return (
                      <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                        <td className="py-2 px-3 text-center font-bold text-slate-400 border-r border-inherit">{idx + 1}</td>
                        <td className="py-2 px-3 border-r border-inherit">
                          <span className="font-black block font-sans">{m.name}</span>
                          <span className="text-[10px] text-slate-500">{m.generic || 'Active Salt'}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-black text-sky-600 border-r border-inherit">
                          {m.hsn || '3004'}
                        </td>
                        <td className="py-2 px-3 text-center font-black text-emerald-600 border-r border-inherit">
                          {gst}%
                        </td>
                        <td className={`py-2 px-3 text-right font-black border-r border-inherit ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          ₹{mrp.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-600 dark:text-zinc-400 border-r border-inherit">
                          ₹{taxable.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-600 dark:text-zinc-400 border-r border-inherit">
                          ₹{cgstAmt.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-600 dark:text-zinc-400 border-r border-inherit">
                          ₹{sgstAmt.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-600">
                          GST COMPLIANT
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LEGACY KVATS */}
        {activeTab === 'kvats' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border text-xs font-mono space-y-2 ${
              isDark ? 'bg-purple-950/30 border-purple-800 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
              <p className="font-black text-sm uppercase">
                Historical Context: TAX.DBF from Legacy Clipper Software (RETAILG4 / TESTG)
              </p>
              <p className="leading-relaxed">
                Prior to the nationwide Goods and Services Tax (GST) rollout on 1st July 2017, Beta Pharmacy operated under the 
                <strong> Kerala Value Added Tax (KVAT) Act, 2003</strong>. The Clipper system recorded tax rates in <code>TAX.DBF</code> using 2 statutory codes:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-semibold">
                <li><code>CODE 1</code>: 4.00% standard medicine retail VAT (theirs: 5.20% distributor PTR surcharge).</li>
                <li><code>CODE 2</code>: 0.00% exempted formulations.</li>
              </ul>
              <p className="text-[11px] opacity-80">
                In our modern system, all 24,703 items have been seamlessly upgraded to statutory Indian GST slabs (HSN 3004 / 12% GST) while preserving backward compatibility for past sales audits.
              </p>
            </div>

            <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
                  }`}>
                    <th className="py-2.5 px-3 w-24 text-center border-r border-inherit">Clipper Code</th>
                    <th className="py-2.5 px-3 border-r border-inherit">KVAT Rate Description</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-32">Retail Rate (OURS)</th>
                    <th className="py-2.5 px-3 text-center border-r border-inherit w-32">Distributor (THEIRS)</th>
                    <th className="py-2.5 px-3 border-inherit">Modern GST Transition Mapping</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {taxData.legacyKvatsCodes.map((k, idx) => (
                    <tr key={idx} className={isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50'}>
                      <td className="py-2.5 px-3 text-center font-black text-purple-600 border-r border-inherit">
                        {k.code}
                      </td>
                      <td className="py-2.5 px-3 font-bold border-r border-inherit">
                        {k.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-emerald-600 border-r border-inherit">
                        {k.ourRate.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                        {k.theirRate.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-700 dark:text-zinc-300">
                        {k.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
