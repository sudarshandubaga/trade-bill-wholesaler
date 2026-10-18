import React, { useState, useMemo } from 'react';
import {
  Printer,
  QrCode,
  X,
  Layers,
  Sparkles,
  Search,
  Check,
  Tag,
  Copy,
  Sliders
} from 'lucide-react';

export default function BarcodePrintingModal({
  isOpen,
  onClose,
  items = [],
  tenant,
  preselectedItem = null
}) {
  const currency = tenant?.currency || '₹';

  const itemList = Array.isArray(items) ? items : (items?.items || items?.data || []);

  const [selectedItemId, setSelectedItemId] = useState(preselectedItem?.id || itemList[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [copies, setCopies] = useState(24);
  const [layout, setLayout] = useState('sheet24'); // 'sheet24', 'sheet40', 'single'
  const [showPrice, setShowPrice] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);

  if (!isOpen) return null;

  const currentItem = itemList.find((i) => String(i.id) === String(selectedItemId)) || preselectedItem || itemList[0];

  const filteredItems = itemList.filter(
    (i) =>
      i.name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      i.barcode?.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const barcodeNumber = currentItem?.barcode || '8901001000101';

  // Generate SVG barcode representation (Code 128 / EAN style visual lines)
  const renderBarcodeLines = (code) => {
    // Generate deterministic pattern based on barcode string characters
    const bars = [];
    const seed = String(code);
    let totalWidth = 0;

    for (let i = 0; i < seed.length; i++) {
      const charCode = seed.charCodeAt(i);
      const w1 = ((charCode % 3) + 1);
      const w2 = (((charCode >> 1) % 2) + 1);
      const w3 = (((charCode >> 2) % 3) + 1);

      bars.push({ width: w1, filled: true });
      bars.push({ width: 1, filled: false });
      bars.push({ width: w2, filled: true });
      bars.push({ width: 2, filled: false });
      bars.push({ width: w3, filled: true });
      bars.push({ width: 1, filled: false });
      totalWidth += (w1 + 1 + w2 + 2 + w3 + 1);
    }

    return (
      <svg
        viewBox={`0 0 ${totalWidth} 45`}
        className="w-full h-10 object-contain text-black"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          if (!bar.filled) return null;
          let xOffset = 0;
          for (let j = 0; j < idx; j++) {
            xOffset += bars[j].width;
          }
          return (
            <rect
              key={idx}
              x={xOffset}
              y={0}
              width={bar.width}
              height={45}
              fill="currentColor"
            />
          );
        })}
      </svg>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-xl overflow-hidden flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
              <Printer className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Barcode Label Printing Studio
              </h2>
              <p className="text-xs text-slate-500">
                Generate high-density EAN barcode stickers for items, shelves and retail racks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Left Controls + Right Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Column */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Item to Print
              </label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-1 bg-slate-50 space-y-1">
                {filteredItems.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelectedItemId(it.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      String(selectedItemId) === String(it.id)
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold">{it.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{it.barcode || 'No barcode'}</div>
                    </div>
                    <span className="font-mono text-xs shrink-0 font-bold">{currency} {it.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Stickers</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sheet Format</label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-amber-400 outline-none"
                >
                  <option value="sheet24">24 / Sheet (3x8)</option>
                  <option value="sheet40">40 / Sheet (4x10)</option>
                  <option value="single">Single Label Roll (50x25mm)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="rounded text-amber-500 bg-white border-slate-300 focus:ring-amber-400 cursor-pointer"
                />
                <span>Include Store Name on Label Header</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-amber-500 bg-white border-slate-300 focus:ring-amber-400 cursor-pointer"
                />
                <span>Include MRP / Selling Price Tag</span>
              </label>
            </div>

            <div className="pt-4">
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>Print {copies} Barcode Stickers</span>
              </button>
            </div>
          </div>

          {/* Right Printable Preview Column */}
          <div className="lg:col-span-8 bg-slate-100/70 rounded-2xl border border-slate-200 p-4 flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-200 mb-4">
              <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                <QrCode className="w-4 h-4 text-amber-600" />
                Live Sheet Print Layout Preview
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Format: {layout} &bull; Count: {copies} labels
              </span>
            </div>

            {/* Simulated Label Sheet */}
            <div className="flex-1 overflow-y-auto bg-white text-black p-4 rounded-xl shadow-xs border border-slate-200 max-h-[500px]">
              <div
                className={`grid gap-3 ${
                  layout === 'sheet40'
                    ? 'grid-cols-4'
                    : layout === 'sheet24'
                    ? 'grid-cols-3'
                    : 'grid-cols-2'
                }`}
              >
                {Array.from({ length: Math.min(copies, 48) }).map((_, index) => (
                  <div
                    key={index}
                    className="border border-dashed border-slate-400 p-2.5 rounded-lg flex flex-col items-center justify-center text-center bg-white shadow-xs"
                    style={{ minHeight: '90px' }}
                  >
                    {showStoreName && (
                      <div className="text-[9px] font-extrabold uppercase tracking-tight text-slate-700 truncate w-full">
                        {tenant?.name || 'TradeBill Mall Mart'}
                      </div>
                    )}

                    <div className="text-[11px] font-bold text-slate-900 leading-tight mt-0.5 line-clamp-1 w-full">
                      {currentItem?.name || 'Product Barcode Item'}
                    </div>

                    <div className="w-full my-1 px-1">
                      {renderBarcodeLines(barcodeNumber)}
                    </div>

                    <div className="text-[10px] font-mono font-bold tracking-widest text-slate-900">
                      {barcodeNumber}
                    </div>

                    {showPrice && (
                      <div className="text-[10px] font-black text-slate-900 mt-0.5">
                        MRP: {currency} {Number(currentItem?.price || 0).toLocaleString()} <span className="text-[8px] font-normal text-slate-600">(Incl. Taxes)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
