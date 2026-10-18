import React, { useState } from 'react';
import {
  FileCode2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Percent,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

export default function HsnManager({
  hsnCodes = [],
  onHsnUpdated = () => {},
  addToast = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHsn, setEditingHsn] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    hsn_code: '',
    description: '',
    gst_percent: 18,
    type: 'goods'
  });

  const hsnList = Array.isArray(hsnCodes) ? hsnCodes : (hsnCodes?.codes || hsnCodes?.data || []);

  const filteredHsn = hsnList.filter(
    (h) =>
      h.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      h.description?.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleOpenAdd = () => {
    setEditingHsn(null);
    setFormData({ hsn_code: '', description: '', gst_percent: 18, type: 'goods' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h) => {
    setEditingHsn(h);
    setFormData({
      hsn_code: h.hsn_code,
      description: h.description || '',
      gst_percent: h.gst_percent || 18,
      type: h.type || 'goods'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hsn_code.trim()) {
      addToast('HSN / SAC Code is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingHsn) {
        await axios.put(`/api/hsn-codes/${editingHsn.id}`, formData);
        addToast('HSN Code updated successfully', 'success');
      } else {
        await axios.post('/api/hsn-codes', formData);
        addToast('HSN Code registered successfully', 'success');
      }
      setIsModalOpen(false);
      onHsnUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving HSN code', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete HSN code "${code}"?`)) return;
    try {
      await axios.delete(`/api/hsn-codes/${id}`);
      addToast('HSN code deleted', 'success');
      onHsnUpdated();
    } catch (err) {
      addToast('Cannot delete HSN code in active use', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            <FileCode2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Master &bull; HSN / SAC Tax Codes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Maintain GST Harmonized System of Nomenclature (HSN) and Service Accounting Codes (SAC)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search HSN code, goods description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add HSN / SAC</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">HSN / SAC Code</th>
                <th className="px-5 py-3.5">Classification Type</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Standard GST %</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredHsn.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-amber-700 text-sm">
                    {h.hsn_code}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {h.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 max-w-md truncate">
                    {h.description || '-'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Percent className="w-3 h-3" />
                      {Number(h.gst_percent)}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(h)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id, h.hsn_code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-amber-600" />
                {editingHsn ? 'Edit HSN / SAC Code' : 'Add HSN / SAC Code'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HSN / SAC Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8471, 6203, 1905"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Applicable GST % *</label>
                  <select
                    value={formData.gst_percent}
                    onChange={(e) => setFormData({ ...formData, gst_percent: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  >
                    <option value="goods">Goods (HSN)</option>
                    <option value="service">Service (SAC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Goods Category</label>
                <textarea
                  rows={2}
                  placeholder="Apparel, electronic machinery, food products..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : editingHsn ? 'Update HSN' : 'Save HSN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
