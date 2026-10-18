import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Layers,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

export default function ItemsServices({
  items = [],
  tenant,
  categories = [],
  onSaveItem = () => { },
  onDeleteItem = () => { },
  isSaving = false,
  onNavigateToCategories = () => { },
  onItemsRefresh = () => { },
  addToast = () => { }
}) {
  const currency = tenant?.currency || '₹';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    category: 'General',
    price: '',
    unit: 'Pcs',
    stock_quantity: 10,
    min_stock_alert: 5,
    description: '',
    is_active: true
  });

  // Category option lists
  const categoryOptions = useMemo(() => {
    const raw = Array.isArray(categories) ? categories : (categories?.categories || categories?.data || []);
    const list = raw.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
    return list.length > 0 ? list : ['General', 'Groceries', 'Apparel', 'FMCG', 'Stationery'];
  }, [categories]);

  const itemList = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.items)) return items.items;
    if (Array.isArray(items?.data)) return items.data;
    return [];
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return itemList.filter((it) => {
      const matchCat = selectedCategory === 'All' || it.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        it.name?.toLowerCase().includes(term) ||
        (it.short_name && it.short_name.toLowerCase().includes(term)) ||
        (it.category && it.category.toLowerCase().includes(term));

      return matchCat && matchSearch;
    });
  }, [itemList, selectedCategory, searchTerm]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    const initialCategory = categoryOptions[0] || 'General';

    setFormData({
      name: '',
      short_name: '',
      category: initialCategory,
      price: '',
      unit: 'Pcs',
      stock_quantity: 10,
      min_stock_alert: 5,
      description: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (it) => {
    setEditingItem(it);

    setFormData({
      name: it.name,
      short_name: it.short_name || '',
      category: it.category || 'General',
      price: it.price || '',
      unit: it.unit || 'Pcs',
      stock_quantity: it.stock_quantity ?? 0,
      min_stock_alert: it.min_stock_alert ?? 5,
      description: it.description || '',
      is_active: it.is_active ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Product name is required', 'error');
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      addToast('Please enter a valid price', 'error');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        short_name: formData.short_name.trim() || null,
        category: formData.category || 'General',
        price: parseFloat(formData.price) || 0,
        unit: formData.unit || 'Pcs',
        stock_quantity: parseFloat(formData.stock_quantity) || 0,
        min_stock_alert: parseFloat(formData.min_stock_alert) || 5,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        type: 'general',
        purchase_price: null,
        image_url: null,
        gst_percent: 0,
        brand: null,
        hsn_sac: null,
        barcode: null
      };

      if (editingItem) {
        await onSaveItem(payload, editingItem.id);
      } else {
        await onSaveItem(payload, null);
      }
      setIsModalOpen(false);
      onItemsRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner & Quick Toolbars */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Wholesale Items Catalog
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage wholesale merchandise, rates, units of measure and inventory stock levels
            </p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNavigateToCategories}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-all"
            title="Open Dedicated Category Manager"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add New Item</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name, code, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="w-52">
            <SearchableSelect
              options={['All', ...categoryOptions]}
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val || 'All')}
              placeholder="All Categories"
              searchPlaceholder="Filter category..."
              size="sm"
              theme="light"
            />
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs cursor-pointer ${viewMode === 'table' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs cursor-pointer ${viewMode === 'grid' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Item Display: Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5">Product & Code</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Rate</th>
                  <th className="px-4 py-3.5">Current Stock</th>
                  <th className="px-4 py-3.5 text-center w-24">Status</th>
                  <th className="px-4 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No wholesale products found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting search filters or add a new item.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it, idx) => {
                    const isLowStock = Number(it.stock_quantity || 0) <= Number(it.min_stock_alert || 0);
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                              {it.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm">
                                {it.name}
                              </div>
                              {it.short_name && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  SKU: <span className="font-bold text-slate-700">{it.short_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-lg font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            {it.category || 'General'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-mono font-black text-slate-900 text-sm">
                            {currency}{Number(it.price || 0).toFixed(2)}
                            <span className="text-[10px] font-normal text-slate-500 font-sans ml-1">/ {it.unit || 'Pcs'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-black text-xs px-2 py-0.5 rounded ${isLowStock
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                            >
                              {Number(it.stock_quantity || 0)} {it.unit || 'Pcs'}
                            </span>
                            {isLowStock && (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="Low stock warning" />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {it.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(it)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete product "${it.name}"?`)) {
                                  onDeleteItem(it.id);
                                }
                              }}
                              title="Delete Product"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((it) => (
            <div
              key={it.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl p-4 shadow-xs hover:shadow-md flex flex-col justify-between transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-black text-sm shrink-0">
                    {it.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {it.category || 'General'}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-snug">{it.name}</h3>
                  {it.short_name && (
                    <span className="font-mono text-[10px] text-slate-500 font-semibold mt-1 block">
                      Code: {it.short_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">Stock:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {it.stock_quantity} {it.unit || 'Pcs'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Selling Rate</span>
                  <div className="font-mono font-black text-amber-700 text-base">
                    {currency}{Number(it.price || 0).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(it)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-amber-700 hover:bg-amber-100 cursor-pointer transition-colors"
                    title="Edit Product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete product "${it.name}"?`)) {
                        onDeleteItem(it.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col text-slate-800">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Enter product name, category, wholesale selling rate and stock
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice 25kg Bag, A4 Paper Rim, Ball Pen Box"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              {/* SKU & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. BR-25KG, PEN-BL-10"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <SearchableSelect
                    options={categoryOptions.map((c) => ({
                      value: c,
                      label: c
                    }))}
                    value={formData.category || ''}
                    onChange={(val) => setFormData({ ...formData, category: val || 'General' })}
                    placeholder="-- Select Category --"
                    searchPlaceholder="Search category..."
                    allowClear
                    theme="light"
                  />
                </div>
              </div>

              {/* Selling Rate & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rate ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-amber-700 text-xs font-mono font-black focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:border-amber-400 outline-none"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Box">Box</option>
                    <option value="Ctn">Ctn (Carton)</option>
                    <option value="Pack">Pack</option>
                    <option value="Bag">Bag</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Kg">Kg</option>
                    <option value="Quintal">Quintal</option>
                    <option value="Pair">Pair</option>
                    <option value="Set">Set</option>
                    <option value="Meter">Meter</option>
                    <option value="Roll">Roll</option>
                  </select>
                </div>
              </div>

              {/* Stock Quantity & Alert Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Opening Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Low Stock Alert Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Packaging specifications, bundle count, terms..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="item_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                />
                <label htmlFor="item_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Product is Active (Available for sale in POS)
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingItem ? 'Update Product' : 'Save Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
