import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Layers
} from 'lucide-react';
import axios from 'axios';

export default function BrandManager({
  brands = [],
  onBrandUpdated = () => {},
  addToast = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true
  });

  const brandList = Array.isArray(brands) ? brands : (brands?.brands || brands?.data || []);

  const filteredBrands = brandList.filter(
    (b) =>
      b.name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      b.code?.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setFormData({ name: '', code: '', description: '', is_active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      code: brand.code || '',
      description: brand.description || '',
      is_active: brand.is_active ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Brand name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingBrand) {
        await axios.put(`/api/brands/${editingBrand.id}`, formData);
        addToast('Brand updated successfully', 'success');
      } else {
        await axios.post('/api/brands', formData);
        addToast('New Brand added successfully', 'success');
      }
      setIsModalOpen(false);
      onBrandUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save brand', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete brand "${name}"?`)) return;
    try {
      await axios.delete(`/api/brands/${id}`);
      addToast('Brand deleted', 'success');
      onBrandUpdated();
    } catch (err) {
      addToast('Cannot delete brand in active use', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            <Tag className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Master &bull; Brand Directory
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Standardize item branding across stores, mall counters, and warehouse stock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search brands..."
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
            <span>Add Brand</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBrands.map((b) => (
          <div
            key={b.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-amber-700 text-base">
                  {b.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-slate-900 text-base">{b.name}</h3>
                {b.code && (
                  <span className="inline-block mt-1 font-mono text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {b.code}
                  </span>
                )}
                {b.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {b.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Active Brand
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                {editingBrand ? 'Edit Brand' : 'Add Brand'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nike, Apple, Samsung"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Code (Short identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. NKE, APL"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Category Focus</label>
                <textarea
                  rows={2}
                  placeholder="Footwear, electronics, cosmetics..."
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
                  {isSaving ? 'Saving...' : editingBrand ? 'Update Brand' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
