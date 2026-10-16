import React, { useRef, useEffect } from 'react';

export default function InvoiceGrid({
  items,
  activeRowIndex,
  setActiveRowIndex,
  inputQuery,
  setInputQuery,
  isDropdownOpen,
  setIsDropdownOpen,
  filteredMedicines,
  selectedDropdownIndex,
  setSelectedDropdownIndex,
  onSelectMedicine,
  activeQty,
  setActiveQty,
  isEditingQty,
  onCommitRow,
  onDeleteRow,
  activeInputRef,
  qtyInputRef,
  currentStore
}) {
  const TOTAL_ROWS = Math.max(12, items.length + 3);
  const dropdownRef = useRef(null);

  // Keep dropdown selection scrolled into view
  useEffect(() => {
    if (dropdownRef.current && dropdownRef.current.children[selectedDropdownIndex]) {
      dropdownRef.current.children[selectedDropdownIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedDropdownIndex]);

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col relative select-none">
      {/* Table Header */}
      <div className="bg-slate-200 border-b border-slate-300 grid grid-cols-12 text-[11px] font-mono font-bold text-slate-700 uppercase tracking-tight">
        <div className="col-span-1 grid-cell text-center bg-slate-300/80">Sr</div>
        <div className="col-span-4 grid-cell">Product / Medicine Description</div>
        <div className="col-span-1 grid-cell text-center">Rack</div>
        <div className="col-span-1 grid-cell">Batch</div>
        <div className="col-span-1 grid-cell text-center">Expiry</div>
        <div className="col-span-1 grid-cell text-right">M.R.P.</div>
        <div className="col-span-1 grid-cell text-center">Pack</div>
        <div className="col-span-1 grid-cell text-center bg-sky-100 text-sky-900">Qty</div>
        <div className="col-span-1 grid-cell text-right bg-slate-100">Amount (₹)</div>
      </div>

      {/* Grid Rows */}
      <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-slate-200">
        {[...Array(TOTAL_ROWS)].map((_, index) => {
          const item = items[index];
          const isActiveRow = index === activeRowIndex;

          return (
            <div
              key={index}
              onClick={() => {
                if (index < items.length) {
                  setActiveRowIndex(index);
                }
              }}
              className={`grid grid-cols-12 text-xs items-center transition-colors ${
                isActiveRow
                  ? 'bg-sky-50 font-semibold text-slate-900 border-l-4 border-l-sky-600'
                  : index % 2 === 0
                  ? 'bg-white text-slate-800'
                  : 'bg-slate-50/70 text-slate-800'
              }`}
              style={{ minHeight: '28px' }}
            >
              {/* Sr No */}
              <div className="col-span-1 grid-cell text-center text-slate-400 font-mono text-[11px]">
                {index + 1}
              </div>

              {/* Product Name (Active input when in this row) */}
              <div className="col-span-4 grid-cell relative font-sans">
                {isActiveRow && !isEditingQty ? (
                  <div className="relative w-full">
                    <input
                      ref={activeInputRef}
                      type="text"
                      value={inputQuery}
                      onChange={(e) => {
                        setInputQuery(e.target.value);
                        setIsDropdownOpen(true);
                        setSelectedDropdownIndex(0);
                      }}
                      placeholder="Type medicine name or salt (e.g. PAC, AUG, EQCEF)..."
                      className="w-full bg-white border border-sky-500 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
                      autoFocus
                    />

                    {/* Inline Search Dropdown anchored right under active cell */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 w-[680px] bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-md z-50 overflow-hidden font-sans">
                        <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex justify-between">
                          <span>Product / Salt / Company</span>
                          <span>Rack • Stock • Multi-Store Radar</span>
                        </div>

                        <div ref={dropdownRef} className="max-h-64 overflow-y-auto divide-y divide-slate-800 text-xs">
                          {filteredMedicines.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-xs font-mono">
                              No medicines found matching "{inputQuery}"
                            </div>
                          ) : (
                            filteredMedicines.map((med, mIdx) => {
                              const isHighlighted = mIdx === selectedDropdownIndex;
                              const currentStock = currentStore === 'shop1'
                                ? med.stock_shop1
                                : (currentStore === 'shop2' ? med.stock_shop2 : med.stock_shop3);
                              const isOutOfStock = currentStock <= 0;

                              return (
                                <div
                                  key={med.code + mIdx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelectMedicine(med);
                                  }}
                                  className={`px-3 py-2 flex items-center justify-between cursor-pointer ${
                                    isHighlighted
                                      ? 'bg-sky-600 text-white font-bold'
                                      : 'hover:bg-slate-800 text-slate-200'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-bold">{med.name}</span>
                                      <span className={`text-[10px] font-mono px-1 rounded ${
                                        isHighlighted ? 'bg-sky-800 text-sky-100' : 'bg-slate-800 text-slate-400'
                                      }`}>
                                        {med.group_label}
                                      </span>
                                      {med.schedule !== 'Normal' && (
                                        <span className={`text-[9px] font-mono px-1 rounded ${
                                          isHighlighted ? 'bg-purple-900 text-purple-200' : 'bg-purple-950 text-purple-300'
                                        }`}>
                                          {med.schedule}
                                        </span>
                                      )}
                                    </div>
                                    <div className={`text-[11px] truncate font-mono ${
                                      isHighlighted ? 'text-sky-100' : 'text-sky-400'
                                    }`}>
                                      {med.generic ? med.generic : med.company}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="flex items-center space-x-3 justify-end">
                                      <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                                        isHighlighted ? 'bg-sky-700 text-white' : 'bg-amber-950 text-amber-300 border border-amber-700'
                                      }`}>
                                        RACK {med.rack}
                                      </span>
                                      <span className="font-mono text-xs">
                                        ₹{med.mrp.toFixed(2)}
                                      </span>
                                      <span className={`font-mono px-2 py-0.5 rounded text-xs font-bold ${
                                        isOutOfStock
                                          ? (isHighlighted ? 'bg-rose-900 text-rose-200' : 'bg-rose-950 text-rose-400 border border-rose-800')
                                          : (isHighlighted ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-950 text-emerald-300 border border-emerald-800')
                                      }`}>
                                        {currentStock} in stock
                                      </span>
                                    </div>

                                    {/* Cross Store Stock Radar */}
                                    {isOutOfStock && (med.stock_shop2 > 0 || med.stock_shop3 > 0) && (
                                      <div className={`text-[10px] font-mono mt-0.5 ${
                                        isHighlighted ? 'text-amber-200' : 'text-amber-400'
                                      }`}>
                                        📍 Available: 
                                        {currentStore !== 'shop2' && med.stock_shop2 > 0 && ` Shop 2 (${med.stock_shop2})`}
                                        {currentStore !== 'shop3' && med.stock_shop3 > 0 && ` Shop 3 (${med.stock_shop3})`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="bg-slate-950 px-3 py-1 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex justify-between">
                          <span>↑↓ Navigate • Enter Select • Esc Close</span>
                          <span>Press Tab to move to Qty</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : item ? (
                  <div>
                    <span className="font-bold text-slate-900">{item.medicine.name}</span>
                    {item.medicine.generic && (
                      <span className="text-[10px] text-slate-500 font-mono ml-2">
                        ({item.medicine.generic})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-300 select-none">-</span>
                )}
              </div>

              {/* Rack */}
              <div className="col-span-1 grid-cell text-center font-mono font-bold text-amber-700">
                {item ? `R-${item.medicine.rack}` : '-'}
              </div>

              {/* Batch */}
              <div className="col-span-1 grid-cell font-mono truncate text-slate-700">
                {item ? item.batch.batch_no : '-'}
              </div>

              {/* Expiry */}
              <div className="col-span-1 grid-cell text-center font-mono text-slate-700">
                {item ? item.batch.exp_date : '-'}
              </div>

              {/* MRP */}
              <div className="col-span-1 grid-cell text-right tabular-nums text-slate-800 font-medium">
                {item ? item.batch.mrp.toFixed(2) : '-'}
              </div>

              {/* Pack */}
              <div className="col-span-1 grid-cell text-center font-mono text-slate-600">
                {item ? `${item.batch.per || 10}s` : '-'}
              </div>

              {/* Qty Input or Display */}
              <div className="col-span-1 grid-cell text-center font-mono font-bold bg-sky-50">
                {isActiveRow && isEditingQty ? (
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="1"
                    value={activeQty}
                    onChange={(e) => setActiveQty(Math.max(1, parseInt(e.target.value) || 0))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onCommitRow();
                      }
                    }}
                    className="w-16 bg-white border border-sky-600 rounded px-1 text-center font-mono font-bold text-sm text-sky-900 focus:outline-none focus:ring-1 focus:ring-sky-600 shadow-sm"
                    autoFocus
                  />
                ) : item ? (
                  <span className="text-sky-900 font-bold text-xs">{item.qty}</span>
                ) : (
                  '-'
                )}
              </div>

              {/* Amount */}
              <div className="col-span-1 grid-cell text-right tabular-nums font-bold text-slate-900 bg-slate-50">
                {item ? `₹${item.totalValue.toFixed(2)}` : '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
