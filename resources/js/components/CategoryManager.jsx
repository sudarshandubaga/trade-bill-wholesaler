import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function CategoryManager({
  categories = [],
  items = [],
  onSaveCategory = () => {},
  onDeleteCategory = () => {},
  isSaving = false,
  onNavigateToItems = () => {},
  addToast = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  const categoryList = useMemo(() => {
    if (Array.isArray(categories)) return categories;
    if (Array.isArray(categories?.categories)) return categories.categories;
    if (Array.isArray(categories?.data)) return categories.data;
    return [];
  }, [categories]);

  const itemList = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.items)) return items.items;
    if (Array.isArray(items?.data)) return items.data;
    return [];
  }, [items]);

  // Compute item counts mapped to category names
  const categoryItemCounts = useMemo(() => {
    const map = {};
    itemList.forEach((it) => {
      const cat = it.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [itemList]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return categoryList;
    return categoryList.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [categoryList, searchTerm]);

  // Overview metrics
  const totalCategories = categoryList.length;
  const activeCategoriesCount = categoryList.filter((c) => c.is_active !== false).length;
  const totalCategorizedItems = itemList.length;

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      description: cat.description || '',
      is_active: cat.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', is_active: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Category name is required', 'error');
      return;
    }

    try {
      await onSaveCategory(
        {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_active: formData.is_active
        },
        editingCategory ? editingCategory.id : null
      );
      handleCloseModal();
    } catch {
      // Handled by parent toast
    }
  };

  const handleDelete = async (cat) => {
    const count = cat.items_count || categoryItemCounts[cat.name] || 0;
    if (count > 0) {
      if (
        !window.confirm(
          `Category "${cat.name}" has ${count} wholesale item(s) linked to it. Deleting it may leave those items uncategorized. Are you sure you want to proceed?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
        return;
      }
    }
    await onDeleteCategory(cat.id);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            <Layers className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Wholesale Categories Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Department Master
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize wholesale products, merchandise groups & inventory classifications
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add New Category</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Categories
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {totalCategories}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Departments
            </span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
              {activeCategoriesCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Categorized Products
            </span>
            <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
              {totalCategorizedItems}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category name or description..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-medium transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredCategories.length}</span> of{' '}
            <span className="font-bold text-slate-900">{totalCategories}</span> categories
          </div>
        </div>

        {/* Categories Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center w-36">Total Items</th>
                <th className="py-3 px-4 text-center w-28">Status</th>
                <th className="py-3 px-4 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.map((cat, idx) => {
                const count = cat.items_count || categoryItemCounts[cat.name] || 0;
                const isActive = cat.is_active !== false;

                return (
                  <tr
                    key={cat.id || idx}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                          {cat.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">
                            {cat.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-md truncate">
                      {cat.description || (
                        <span className="text-slate-300 italic">No description</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onNavigateToItems(cat.name)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
                        title="View items in this category"
                      >
                        <Package className="w-3 h-3 text-slate-400 group-hover:text-amber-700" />
                        <span>{count} items</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <XCircle className="w-3 h-3" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600 text-xs">No categories found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchTerm ? `No categories match "${searchTerm}"` : 'Get started by creating your first wholesale category.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingCategory ? 'Edit Category' : 'Create Wholesale Category'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingCategory
                      ? 'Modify category name or description'
                      : 'Add a new product category or department'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Stationery, Fast Moving Goods, Hardware"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details about products grouped under this category..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 resize-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="category_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                />
                <label htmlFor="category_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Category is Active (Visible in POS and Item creation)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
