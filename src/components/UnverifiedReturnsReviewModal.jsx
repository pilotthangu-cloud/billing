import React, { useState, useEffect } from 'react';
import { idbGetUnverifiedReturns } from '../utils/indexedDb';

export default function UnverifiedReturnsReviewModal({ isOpen, onClose }) {
  const [quarantinedReturns, setQuarantinedReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      idbGetUnverifiedReturns()
        .then(records => {
          setQuarantinedReturns(records || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[STORAGE_ERROR] Failed to fetch unverified returns from IndexedDB:', err);
          setQuarantinedReturns([]);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Quarantined Unverified Sales Returns
              </h2>
              <p className="text-xs text-amber-400 font-medium">
                Durable Quarantine Log • Excluded from Saleable Counter Inventory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-700/50 hover:bg-slate-700 transition"
          >
            ✕ Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-200">
          <div className="mb-4 p-3 bg-amber-950/40 border border-amber-600/40 rounded-lg text-xs text-amber-200">
            <strong>Manager Compliance Notice:</strong> The returned medicines below contained batch lot numbers that were not verified in the active inventory catalogue at the time of return. To prevent catalog contamination, these items were <strong>not added to active batches or saleable shop stock</strong>. Disposition actions (Accept into Inventory or Scrap) are locked pending management policy authorization.
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading quarantined returns from IndexedDB...</div>
          ) : quarantinedReturns.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="text-3xl block mb-2">✅</span>
              No unverified returns currently in quarantine.
            </div>
          ) : (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 border-b border-slate-700">Credit Note #</th>
                    <th className="p-3 border-b border-slate-700">Date</th>
                    <th className="p-3 border-b border-slate-700">Customer</th>
                    <th className="p-3 border-b border-slate-700">Medicine Details</th>
                    <th className="p-3 border-b border-slate-700">Unverified Batch</th>
                    <th className="p-3 border-b border-slate-700">Qty</th>
                    <th className="p-3 border-b border-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                  {quarantinedReturns.map((record, rIdx) => (
                    <React.Fragment key={record.creditNoteNo || rIdx}>
                      {(record.unverifiedItems || []).map((item, iIdx) => (
                        <tr key={`${record.creditNoteNo}-${iIdx}`} className="hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-emerald-400">{record.creditNoteNo}</td>
                          <td className="p-3 text-slate-400">{record.date || record.createdAt?.slice(0, 10) || 'N/A'}</td>
                          <td className="p-3 text-slate-300 font-sans">{record.customerName || 'CUSTOMER'}</td>
                          <td className="p-3 font-sans font-medium text-white">{item.name} <span className="text-slate-500 font-mono">({item.code})</span></td>
                          <td className="p-3 text-amber-400 font-bold">{item.batch || 'UNSPECIFIED'}</td>
                          <td className="p-3 text-white font-bold">{item.qty || item.returnQty || 0}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              QUARANTINED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span>Total Quarantined Return Vouchers: {quarantinedReturns.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
