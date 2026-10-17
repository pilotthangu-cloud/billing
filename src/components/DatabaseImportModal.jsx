import React, { useState } from 'react';
import { 
  Database, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  X, 
  HelpCircle, 
  AlertCircle,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { parseDbfBuffer, parseCsvText, normalizeLegacyMedicineRecords } from '../utils/dbfReader';

export default function DatabaseImportModal({
  isOpen,
  onClose,
  theme,
  onImportMedicines
}) {
  const isDark = theme === 'dark';

  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [mergeMode, setMergeMode] = useState('merge'); // 'merge' | 'replace'

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setStatusMessage(`Parsing ${file.name}...`);

    try {
      const fileName = file.name.toUpperCase();
      if (fileName.endsWith('.DBF')) {
        const buffer = await file.arrayBuffer();
        const { records } = parseDbfBuffer(buffer);
        const normalized = normalizeLegacyMedicineRecords(records);
        setParsedRecords(normalized);
        setStatusMessage(`✓ Extracted ${normalized.length.toLocaleString()} medicine records from ${file.name}`);
      } else if (fileName.endsWith('.CSV') || fileName.endsWith('.TXT')) {
        const text = await file.text();
        const records = parseCsvText(text);
        const normalized = normalizeLegacyMedicineRecords(records);
        setParsedRecords(normalized);
        setStatusMessage(`✓ Extracted ${normalized.length.toLocaleString()} medicine records from CSV`);
      } else {
        setStatusMessage('Please select a .DBF file (e.g. ITEMFILE.DBF) or a .CSV file.');
      }
    } catch (err) {
      console.error('Import parse error:', err);
      setStatusMessage(`Error parsing file: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyImport = () => {
    if (parsedRecords.length === 0) return;
    onImportMedicines(parsedRecords, mergeMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-sans">
      <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Import Legacy Database (.DBF / CSV)</h3>
              <p className="text-xs text-slate-500 font-mono">RETAILG4 / DOS / Marg / Excel Medicine Migration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border text-slate-400 hover:text-slate-600 ${
              isDark ? 'border-zinc-800 hover:bg-zinc-800' : 'border-slate-200 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Dropzone */}
          <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDark 
              ? 'border-zinc-700 hover:border-purple-500 hover:bg-zinc-800/40' 
              : 'border-slate-300 hover:border-purple-500 hover:bg-purple-50/40'
          }`}>
            <Upload className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <span className="text-sm font-bold block">
              {selectedFile ? selectedFile.name : 'Select or Drop ITEMFILE.DBF, STK2610.DBF or CSV'}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              Supports dBase III / Clipper DBF files and CSV exports. Processes 100% locally in browser memory.
            </span>
            <input
              type="file"
              accept=".dbf,.csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 ${
              statusMessage.startsWith('✓')
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
            }`}>
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Import Preview */}
          {parsedRecords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Preview (First 4 extracted items):</span>
                <span className="text-slate-500 font-mono">Total {parsedRecords.length.toLocaleString()} items ready</span>
              </div>

              <div className={`rounded-lg border overflow-hidden text-xs font-mono ${
                isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50'
              }`}>
                <table className="w-full text-left">
                  <thead className={isDark ? 'bg-zinc-800 text-slate-300' : 'bg-slate-200 text-slate-700'}>
                    <tr>
                      <th className="p-2">Code</th>
                      <th className="p-2">Medicine Name</th>
                      <th className="p-2">Pack</th>
                      <th className="p-2 text-right">MRP</th>
                      <th className="p-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRecords.slice(0, 4).map((m, i) => (
                      <tr key={i} className="border-t border-slate-200/20">
                        <td className="p-2 text-sky-500 font-bold">{m.code}</td>
                        <td className="p-2 font-bold">{m.name}</td>
                        <td className="p-2 text-slate-500">{m.packing}</td>
                        <td className="p-2 text-right">₹{m.mrp.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold text-emerald-600">{m.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Merge vs Replace Mode */}
              <div className="pt-2 flex items-center space-x-4 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={mergeMode === 'merge'}
                    onChange={() => setMergeMode('merge')}
                    className="text-purple-600"
                  />
                  <span><strong>Merge with catalog:</strong> Add new medicines and update existing matching codes</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={mergeMode === 'replace'}
                    onChange={() => setMergeMode('replace')}
                    className="text-purple-600"
                  />
                  <span><strong>Replace entire catalog:</strong> Use only this imported file</span>
                </label>
              </div>
            </div>
          )}

          {/* Help Box */}
          <div className={`p-3.5 rounded-lg border text-xs space-y-1 ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
              <span>Where to find this in your shop's old computer:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Open your old computer's File Explorer and check <code>D:\LOCAL DISK\RETAILG4\DATA\ITEMFILE.DBF</code> or <code>C:\PHARMA\DATA</code>. Copy it onto a USB thumb drive and select it here.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border text-xs font-bold ${
              isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            Cancel
          </button>

          <button
            onClick={handleApplyImport}
            disabled={parsedRecords.length === 0}
            className={`px-6 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 shadow-md ${
              parsedRecords.length > 0
                ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Apply {parsedRecords.length > 0 ? `(${parsedRecords.length} Items)` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
