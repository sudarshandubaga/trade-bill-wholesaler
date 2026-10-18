import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Package,
  Layers,
  Wrench,
  Search
} from 'lucide-react';

export default function CategoryModal({
  isOpen,
  onClose,
  categories = [],
  onSaveCategory = () => {},
  onDeleteCategory = () => {},
  isLoading = false
}) {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Both',
    description: '',
  });

  const handleStartCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', type: 'Both', description: '' });
    setIsCreating(true);
  };

  const handleStartEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      type: cat.type || 'Both',
      description: cat.description || '',
    });
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setEditingCategory(null);
    setIsCreating(false);
    setFormData({ name: '', type: 'Both', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await onSaveCategory(formData, editingCategory.id);
    } else {
      await onSaveCategory(formData);
    }
    handleCancelForm();
  };

  const categoryList = Array.isArray(categories)
    ? categories
    : (categories?.categories || categories?.data || []);

  const filteredCategories = categoryList.filter((c) =>
    (c?.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    (c?.type && c.type.toLowerCase().includes(searchTerm.toLowerCase().trim()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Dynamic Categories Management
              </h3>
              <p className="text-xs text-slate-500">
                Organize services, spare parts, and labor classifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create / Edit Form Drawer */}
        {(isCreating || editingCategory) && (
          <form
            onSubmit={handleSubmit}
            className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3 shrink-0 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>{editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}</span>
              </span>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tyres & Balancing, Transmission Fluids"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                  Classification Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Both">Both (Service & Parts)</option>
                  <option value="Service">Service / Labor Only</option>
                  <option value="Part">Spare Part / Physical Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-bold text-[11px]">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Short description or notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingCategory ? 'Update Category' : 'Save Category'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Toolbar: Search & Add Category Button */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search categories by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {!isCreating && !editingCategory && (
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Category</span>
            </button>
          )}
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[220px]">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
              <p>No categories found matching "{searchTerm}"</p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const typeBadge =
                cat.type === 'Service'
                  ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                  : cat.type === 'Part'
                  ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {cat.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${typeBadge}`}>
                          {cat.type || 'Both'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          {cat.items_count ?? 0} {cat.items_count === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete category "${cat.name}"? Linked items will be safely preserved.`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Total: {categoryList.length} categories defined</span>
          <span className="font-medium text-slate-500">Categories update in real-time across POS and Inventory</span>
        </div>

      </div>
    </div>
  );
}
