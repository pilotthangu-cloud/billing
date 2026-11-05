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
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { parseDbfBuffer, parseCsvText, normalizeLegacyMedicineRecords, processDbfFolderFiles, extractFilesFromDrop } from '../utils/dbfReader';

export default function DatabaseImportModal({
  isOpen,
  onClose,
  theme,
  onImportMedicines,
  onResetMasterCatalog,
  onAutoRepairMedicines
}) {
  const isDark = theme === 'dark';

  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [mergeMode, setMergeMode] = useState('merge'); // 'merge' | 'replace'
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  // 1-Click Folder Upload: Reads entire DATA folder (ITEMFILE.DBF + STK*.DBF together)
  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsParsing(true);
    setStatusMessage(`Scanning ${files.length} files in folder...`);

    try {
      const res = await processDbfFolderFiles(files, setStatusMessage);
      setParsedRecords(res.medicines);
      setStatusMessage(`✓ Loaded ${res.totalCount.toLocaleString()} medicines (${res.itemFile || 'ITEMFILE'}). Stock from ${res.stockFile || 'STKFILE'}. Companies from ${res.companyFile || 'COMPMAST'}.`);
    } catch (err) {
      console.error('Import error:', err);
      setStatusMessage(`Error parsing DBF folder: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Drag & Drop Folder Handler
  const handleDropFolder = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    setIsParsing(true);
    setStatusMessage('Reading dropped folder...');

    try {
      const files = await extractFilesFromDrop(e.dataTransfer);
      if (files.length === 0) {
        throw new Error('No files detected in dropped item.');
      }
      setStatusMessage(`Found ${files.length} files in dropped folder...`);
      const res = await processDbfFolderFiles(files, setStatusMessage);
      setParsedRecords(res.medicines);
      setStatusMessage(`✓ Loaded ${res.totalCount.toLocaleString()} medicines (${res.itemFile || 'ITEMFILE'}). Stock from ${res.stockFile || 'STKFILE'}. Companies from ${res.companyFile || 'COMPMAST'}.`);
    } catch (err) {
      console.error('Drop error:', err);
      setStatusMessage(`Error reading dropped folder: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsing(false);
    }
  };

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
          {/* Two Clear Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Entire DATA Folder */}
            <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDark 
                ? 'border-purple-600/60 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-900/30' 
                : 'border-purple-400 hover:border-purple-600 bg-purple-50/60 hover:bg-purple-100/60'
            }`}>
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <span className="text-sm font-black block text-purple-700 dark:text-purple-300">
                1-Click: Select "DATA" Folder
              </span>
              <span className="text-[11px] text-slate-500 block mt-1 leading-normal">
                Select your old software's <strong>DATA</strong> folder directly. Automatically imports <strong>ITEMFILE.DBF</strong> + today's <strong>STK*.DBF</strong> stock in one click!
              </span>
              <input
                type="file"
                webkitdirectory="true"
                directory=""
                multiple
                onChange={handleFolderUpload}
                className="hidden"
              />
            </label>

            {/* Option 2: Single DBF / CSV File */}
            <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDark 
                ? 'border-zinc-700 hover:border-sky-500 hover:bg-zinc-800/40' 
                : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50/40'
            }`}>
              <Upload className="w-8 h-8 mx-auto mb-2 text-sky-500" />
              <span className="text-sm font-bold block">
                Select Single .DBF / .CSV File
              </span>
              <span className="text-[11px] text-slate-500 block mt-1 leading-normal">
                Double-click into <strong>DATA</strong>, click on <strong>ITEMFILE.DBF</strong> or <strong>STK2610.DBF</strong>, then click <strong>Open</strong>.
              </span>
              <input
                type="file"
                accept=".dbf,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

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
              <span>Which file to choose from your shop computer:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>ITEMFILE.DBF:</strong> Medicine names, shelf racks, MRP, and generics.<br />
              <strong>STK2610.DBF (or STK*.DBF):</strong> Live physical counter stock counts.<br />
              <em>Tip: You can import either or both. Names and stock are automatically cross-matched!</em>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-xs font-bold ${
                isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>

            {onAutoRepairMedicines && (
              <button
                onClick={() => {
                  onAutoRepairMedicines();
                  onClose();
                }}
                className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center space-x-1 ${
                  isDark 
                    ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' 
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
                title="Heals dummy BN001 batches, restores master expiries, and preserves all your live shop stock"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Fix Batches & Expiries</span>
              </button>
            )}

            {onResetMasterCatalog && (
              <button
                onClick={() => {
                  onResetMasterCatalog();
                  onClose();
                }}
                className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center space-x-1 ${
                  isDark 
                    ? 'border-purple-800 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60' 
                    : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Built-in 24,665 Master</span>
              </button>
            )}
          </div>

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
