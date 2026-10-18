import React, { useState } from 'react';
import {
  Building2,
  Warehouse,
  Store,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ArrowRightCircle,
  Crown
} from 'lucide-react';
import axios from 'axios';

export default function BranchManagerModal({
  isOpen,
  onClose,
  branches = [],
  activeBranch,
  onBranchUpdated,
  onSelectBranch,
  addToast = () => { }
}) {
  const branchList = Array.isArray(branches) ? branches : (branches?.branches || branches?.data || []);

  const [isEditing, setIsEditing] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'store', // 'store', 'warehouse', 'branch'
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    is_active: true,
    is_head: false
  });

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      type: 'store',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      is_active: true,
      is_head: branchList.length === 0
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || '',
      type: branch.type || 'store',
      phone: branch.phone || '',
      email: branch.email || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      is_active: branch.is_active ?? true,
      is_head: Boolean(branch.is_head || branch.is_primary)
    });
    setIsEditing(true);
  };

  const handleSetHeadBranch = async (branch) => {
    try {
      await axios.post(`/api/branches/${branch.id}/set-head`);
      addToast(`"${branch.name}" is now designated as the Head Branch!`, 'success');
      onBranchUpdated();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to designate head branch', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Branch/Store name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingBranch) {
        await axios.put(`/api/branches/${editingBranch.id}`, formData);
        addToast('Branch updated successfully', 'success');
      } else {
        await axios.post('/api/branches', formData);
        addToast('New Store/Warehouse added successfully', 'success');
      }
      setIsEditing(false);
      onBranchUpdated();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to save branch', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete branch "${name}"?`)) return;

    try {
      await axios.delete(`/api/branches/${id}`);
      addToast('Branch deleted successfully', 'success');
      onBranchUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error deleting branch', 'error');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warehouse':
        return <Warehouse className="w-4 h-4 text-purple-400" />;
      case 'branch':
        return <Building2 className="w-4 h-4 text-sky-400" />;
      default:
        return <Store className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'warehouse':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'branch':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col text-slate-800">

        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Store, Branch & Warehouse Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintain multi-location  stores, counters, and central distribution warehouses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!isEditing ? (
            <>
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm font-bold text-slate-800">
                  Registered Locations ({branchList.length})
                </div>
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all transform hover:scale-[1.02]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Branch / Store / Warehouse</span>
                </button>
              </div>

              {/* Branch Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branchList.map((b) => {
                  const isActive = activeBranch?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      className={`relative p-5 rounded-2xl border transition-all ${isActive
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            {getTypeIcon(b.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-sm">{b.name}</h3>
                              {Boolean(b.is_head || b.is_primary) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-300">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  Head Branch
                                </span>
                              )}
                              {isActive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active Counter
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${getTypeBadgeClass(b.type)}`}>
                                {b.type}
                              </span>
                              {b.code && (
                                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300">
                                  {b.code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            title="Edit Location"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {branchList.length > 1 && (
                            <button
                              onClick={() => handleDelete(b.id, b.name)}
                              title="Delete Location"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Location details */}
                      <div className="mt-3.5 pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
                        {b.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{b.address}{b.city ? `, ${b.city}` : ''}{b.state ? ` (${b.state})` : ''}</span>
                          </div>
                        )}
                        {b.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{b.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Card actions: Set as Head Branch & Switch Active */}
                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          {!b.is_head && !b.is_primary ? (
                            <button
                              type="button"
                              onClick={() => handleSetHeadBranch(b)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              title="Set as central Head Branch for vouchers and main store"
                            >
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                              <span>Set as Head Branch</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                              <span>Primary Head Branch</span>
                            </span>
                          )}
                        </div>

                        {!isActive && (
                          <button
                            onClick={() => onSelectBranch(b)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-500 hover:text-slate-950 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer ml-auto"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            <span>Switch Active Location</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Add / Edit Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {editingBranch ? 'Edit Location Details' : 'Register New Location'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel & Back
                </button>
              </div>

              {/* Head Branch designation checkbox */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="branch_is_head_cb"
                  checked={Boolean(formData.is_head)}
                  onChange={(e) => setFormData({ ...formData, is_head: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="branch_is_head_cb" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    Set as Head Branch (Primary Central Location)
                  </span>
                  <span className="block text-slate-500 text-[11px] mt-0.5">
                    Vouchers (Customer receipts, supplier payments) and central transactions default into/from this head branch.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / Store / Warehouse Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Phoenix Grand Mall (Store #1)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-amber-400 outline-none"
                  >
                    <option value="store">🏬 Store / Mall Outlet</option>
                    <option value="warehouse">🏭 Central Warehouse</option>
                    <option value="branch">🏢 Secondary Branch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STR-01 or WH-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="branch@store.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Shop number, floor, mall building, street..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 400001"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingBranch ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
