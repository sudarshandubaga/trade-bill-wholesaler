import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Sparkles,
  Save,
  X,
  Search,
  CheckCircle2,
  RefreshCw,
  Wand2
} from 'lucide-react';
import axios from 'axios';

export default function BulkBarcodeModal({
  isOpen,
  onClose,
  items = [],
  onItemsUpdated = () => {},
  addToast = () => {}
}) {
  const [itemList, setItemList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  useEffect(() => {
    const list = Array.isArray(items) ? items : (items?.items || items?.data || []);
    setItemList(list.map((i) => ({ id: i.id, name: i.name, category: i.category, barcode: i.barcode || '' })));
  }, [items]);

  if (!isOpen) return null;

  const handleBarcodeChange = (id, newBarcode) => {
    setItemList((prev) =>
      prev.map((it) => (it.id === id ? { ...it, barcode: newBarcode } : it))
    );
  };

  const handleAutoGenerateMissing = async () => {
    try {
      setIsAutoGenerating(true);
      const res = await axios.post('/api/items/auto-generate-barcodes');
      addToast(res.data.message || 'Generated barcodes successfully', 'success');
      onItemsUpdated();
      onClose();
    } catch (err) {
      addToast('Error generating barcodes', 'error');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      await axios.post('/api/items/bulk-barcodes', {
        items: itemList.map((i) => ({ id: i.id, barcode: i.barcode }))
      });
      addToast('All barcodes updated successfully', 'success');
      onItemsUpdated();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error updating barcodes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = itemList.filter((it) => {
    const matchSearch =
      it.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      it.barcode.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchMissing = filterMissingOnly ? !it.barcode : true;
    return matchSearch && matchMissing;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Bulk Barcode Management & Generation
              </h2>
              <p className="text-xs text-slate-500">
                Quickly assign barcodes or auto-generate EAN standard barcodes in batch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={filterMissingOnly}
                onChange={(e) => setFilterMissingOnly(e.target.checked)}
                className="rounded text-amber-500 bg-white border-slate-300 focus:ring-amber-400 cursor-pointer"
              />
              <span>Missing Barcode Only</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoGenerateMissing}
              disabled={isAutoGenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer transition-all shadow-2xs disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isAutoGenerating ? 'Generating...' : 'Auto-Generate All Missing'}</span>
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs cursor-pointer transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Barcodes'}</span>
            </button>
          </div>
        </div>

        {/* Items Spreadsheet Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Barcode (Scan or Type)</th>
                <th className="px-4 py-3 text-right">Quick Gen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {item.category || 'General'}
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="e.g. 8901001000101"
                      value={item.barcode}
                      onChange={(e) => handleBarcodeChange(item.id, e.target.value)}
                      className="w-full max-w-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        const randomCode = '890' + Math.floor(1000000000 + Math.random() * 9000000000);
                        handleBarcodeChange(item.id, randomCode);
                      }}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                    >
                      Random EAN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
