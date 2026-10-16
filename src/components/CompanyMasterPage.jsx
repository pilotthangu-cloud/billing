import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Building2, 
  Layers, 
  Package, 
  Truck, 
  Printer, 
  Download, 
  Filter, 
  Plus, 
  Edit3, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import companyList from '../data/companies.json';
import supplierList from '../data/suppliers.json';

export default function CompanyMasterPage({ theme, medicines, onBackToBilling }) {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRack, setSelectedRack] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Map supplier codes to names
  const supplierMap = useMemo(() => {
    const map = {};
    supplierList.forEach(s => {
      map[s.code] = s.name;
    });
    return map;
  }, []);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return companyList.filter(c => {
      const matchQuery = !q || c.NAME.toLowerCase().includes(q) || c.CODE.toLowerCase().includes(q);
      const matchRack = selectedRack === 'ALL' || (selectedRack === 'UNASSIGNED' ? !c.RACK : c.RACK === selectedRack);
      return matchQuery && matchRack;
    });
  }, [searchQuery, selectedRack]);

  // Extract unique racks for filter
  const uniqueRacks = useMemo(() => {
    const racks = new Set();
    companyList.forEach(c => {
      if (c.RACK) racks.add(c.RACK);
    });
    return Array.from(racks).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, []);

  // Products belonging to selected company
  const companyProducts = useMemo(() => {
    if (!selectedCompany) return [];
    const cName = selectedCompany.NAME.toLowerCase();
    return (medicines || []).filter(m => {
      return m.company && m.company.toLowerCase().includes(cName);
    }).slice(0, 50);
  }, [selectedCompany, medicines]);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-950'
    }`}>
      {/* Header */}
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
                Company & Pharma Master [MAS003 / PHARMA.DBF]
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isDark 
                  ? 'bg-purple-950 text-purple-300 border-purple-800' 
                  : 'bg-purple-100 text-purple-950 border-purple-300'
              }`}>
                {companyList.length} Manufacturers
              </span>
            </div>
            <p className={`text-xs font-mono mt-0.5 font-semibold ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              Pharmaceutical company directory, shelf rack mappings, and primary/secondary distributor channels
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
            <span>Print Master</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`p-3 border-b grid grid-cols-12 gap-3 text-xs font-mono ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="col-span-8 relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search manufacturer name (e.g. Cipla, Abbot, Glaxo, Sun Pharma, Alkem)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 py-1.5 px-2 rounded border font-bold text-xs ${
              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950 shadow-xs'
            }`}
          />
        </div>

        <div className="col-span-4">
          <select
            value={selectedRack}
            onChange={(e) => setSelectedRack(e.target.value)}
            className={`w-full py-1.5 px-2 rounded border font-bold text-xs ${
              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-950 shadow-xs'
            }`}
          >
            <option value="ALL">All Shelf Racks ({uniqueRacks.length} Racks)</option>
            <option value="UNASSIGNED">Unassigned Rack</option>
            {uniqueRacks.map((r, idx) => (
              <option key={idx} value={r}>Shelf Rack {r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-extrabold sticky top-0 z-10 ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-200 border-slate-300 text-slate-950'
            }`}>
              <th className="py-2.5 px-3 w-16 text-center border-r border-inherit">Code</th>
              <th className="py-2.5 px-3 border-r border-inherit">Manufacturer Company Name</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Shelf Rack</th>
              <th className="py-2.5 px-3 text-center border-r border-inherit w-24">Products</th>
              <th className="py-2.5 px-3 border-r border-inherit w-48">1st Distributor Agency</th>
              <th className="py-2.5 px-3 border-r border-inherit w-48">2nd Distributor Agency</th>
              <th className="py-2.5 px-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
            {filteredCompanies.slice(0, 150).map((c, idx) => {
              const firstSupp = supplierMap[c.FIRST] || c.FIRST;
              const secondSupp = supplierMap[c.SECOND] || c.SECOND;

              return (
                <tr 
                  key={idx} 
                  onClick={() => setSelectedCompany(c)}
                  className={`cursor-pointer transition ${
                    selectedCompany?.CODE === c.CODE
                      ? (isDark ? 'bg-sky-950/50' : 'bg-sky-100/70')
                      : (isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-sky-50/50')
                  }`}
                >
                  <td className="py-2.5 px-3 text-center font-black text-sky-600 border-r border-inherit">
                    {c.CODE}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-black text-xs border-r border-inherit">
                    <span className={isDark ? 'text-white' : 'text-slate-950'}>{c.NAME}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-black border-r border-inherit">
                    {c.RACK ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold">
                        RACK {c.RACK}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal text-[10px]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-black border-r border-inherit text-emerald-600">
                    {c.PRODUCTS || 0}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-xs border-r border-inherit">
                    {firstSupp ? (
                      <span className="font-bold text-slate-700 dark:text-zinc-300 line-clamp-1">{firstSupp}</span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-xs border-r border-inherit">
                    {secondSupp ? (
                      <span className="font-bold text-slate-700 dark:text-zinc-300 line-clamp-1">{secondSupp}</span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-600 flex items-center justify-center space-x-1">
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Company Drawer / Modal */}
      {selectedCompany && (
        <div className={`p-4 border-t font-mono text-xs flex items-center justify-between ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Selected Manufacturer</span>
            <h4 className={`text-sm font-black font-sans ${isDark ? 'text-white' : 'text-slate-950'}`}>
              {selectedCompany.NAME} ({selectedCompany.CODE}) • {selectedCompany.RACK ? `RACK ${selectedCompany.RACK}` : 'General Storage'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Primary Supplier: <strong>{supplierMap[selectedCompany.FIRST] || selectedCompany.FIRST || 'Direct Indent'}</strong>
              {selectedCompany.SECOND && ` • Secondary: ${supplierMap[selectedCompany.SECOND] || selectedCompany.SECOND}`}
            </p>
          </div>
          <button
            onClick={() => setSelectedCompany(null)}
            className="px-3 py-1 rounded bg-slate-300 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-400"
          >
            Close Panel
          </button>
        </div>
      )}
    </div>
  );
}
