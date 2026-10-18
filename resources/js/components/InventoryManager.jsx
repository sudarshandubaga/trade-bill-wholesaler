import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Warehouse,
  Building2,
  Calendar,
  CheckCircle2,
  X,
  Printer,
  Eye,
  Trash2,
  Boxes
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';

export default function InventoryManager({
  fixedType = null, // 'stock_in' | 'stock_transfer' | null
  movements = [],
  challans = [],
  branches = [],
  suppliers = [],
  items = [],
  tenant,
  onStockUpdated = () => {},
  onChallanUpdated = () => {},
  addToast = () => {}
}) {
  const currency = tenant?.currency || '₹';

  // Normalize initial active filter
  const initialFilter = useMemo(() => {
    if (fixedType === 'stock_in') return 'inward';
    if (fixedType === 'stock_transfer') return 'transfer';
    return 'all';
  }, [fixedType]);

  const [activeType, setActiveType] = useState(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingMovement, setViewingMovement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setActiveType(initialFilter);
  }, [initialFilter]);

  // Form State
  const [formData, setFormData] = useState({
    movement_kind: fixedType || 'stock_in', // 'stock_in' | 'stock_transfer'
    type: 'inward', // API: 'inward' or 'outward'
    branch_id: '',
    target_branch_id: '',
    supplier_id: '',
    party_name: '',
    movement_date: new Date().toISOString().split('T')[0],
    vehicle_no: '',
    transport_name: '',
    notes: '',
    status: 'completed',
    items: []
  });

  const rawList = movements.length > 0 ? movements : challans;
  const movementList = useMemo(() => {
    if (Array.isArray(rawList)) return rawList;
    if (Array.isArray(rawList?.data)) return rawList.data;
    return [];
  }, [rawList]);

  const branchList = useMemo(() => {
    if (Array.isArray(branches)) return branches;
    if (Array.isArray(branches?.branches)) return branches.branches;
    if (Array.isArray(branches?.data)) return branches.data;
    return [];
  }, [branches]);

  const supplierList = useMemo(() => {
    if (Array.isArray(suppliers)) return suppliers;
    if (Array.isArray(suppliers?.suppliers)) return suppliers.suppliers;
    if (Array.isArray(suppliers?.data)) return suppliers.data;
    return [];
  }, [suppliers]);

  const mainBranch = useMemo(() => {
    return branchList.find((b) => b.is_head || b.is_primary) || branchList[0] || null;
  }, [branchList]);

  const itemList = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.items)) return items.items;
    if (Array.isArray(items?.data)) return items.data;
    return [];
  }, [items]);

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    return movementList.filter((m) => {
      // Determine movement classification
      let mKind = 'stock_in';
      if (m.type === 'inward') {
        mKind = 'stock_in';
      } else if (m.type === 'outward' && m.target_branch_id) {
        mKind = 'stock_transfer';
      } else if (m.type === 'outward') {
        mKind = 'stock_out';
      }

      if (fixedType === 'stock_in' && mKind !== 'stock_in') return false;
      if (fixedType === 'stock_transfer' && mKind !== 'stock_transfer') return false;

      if (!fixedType && activeType !== 'all') {
        if (activeType === 'inward' && mKind !== 'stock_in') return false;
        if (activeType === 'transfer' && mKind !== 'stock_transfer') return false;
      }

      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        m.challan_no?.toLowerCase().includes(term) ||
        m.party_name?.toLowerCase().includes(term) ||
        m.branch?.name?.toLowerCase().includes(term) ||
        m.target_branch?.name?.toLowerCase().includes(term);

      return matchSearch;
    });
  }, [movementList, fixedType, activeType, searchTerm]);

  const handleOpenAdd = (kind = (fixedType || 'stock_in')) => {
    const isTransfer = kind === 'stock_transfer';
    const isInward = kind === 'stock_in';

    setFormData({
      movement_kind: kind,
      type: isInward ? 'inward' : 'outward',
      branch_id: isInward ? (mainBranch?.id || branchList[0]?.id || '') : (branchList[0]?.id || ''),
      target_branch_id: isTransfer ? (branchList[1]?.id || '') : '',
      supplier_id: '',
      party_name: '',
      movement_date: new Date().toISOString().split('T')[0],
      vehicle_no: '',
      transport_name: '',
      notes: '',
      status: 'completed',
      items: itemList.slice(0, 1).map((i) => ({
        item_id: i.id,
        item_name: i.name,
        quantity: 10,
        rate: i.price || i.wholesale_price || 100
      }))
    });
    setIsModalOpen(true);
  };

  const handleAddItemLine = (itemId) => {
    if (!itemId) return;
    const it = items.find((i) => String(i.id) === String(itemId));
    if (!it) return;

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_id: it.id,
          item_name: it.name,
          quantity: 1,
          rate: it.price || it.wholesale_price || 100
        }
      ]
    }));
  };

  const updateItemLine = (idx, field, val) => {
    const updated = [...formData.items];
    updated[idx][field] = val;
    setFormData({ ...formData, items: updated });
  };

  const removeItemLine = (idx) => {
    const updated = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      addToast('Please include at least one item line', 'error');
      return;
    }
    if (formData.movement_kind === 'stock_transfer' && !formData.target_branch_id) {
      addToast('Please select destination branch for stock transfer', 'error');
      return;
    }
    if (formData.movement_kind === 'stock_transfer' && String(formData.branch_id) === String(formData.target_branch_id)) {
      addToast('Source and destination branches cannot be the same', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const isStockIn = formData.movement_kind === 'stock_in';
      const payload = {
        branch_id: isStockIn ? (mainBranch?.id || formData.branch_id) : formData.branch_id,
        target_branch_id: formData.movement_kind === 'stock_transfer' ? formData.target_branch_id : null,
        challan_date: formData.movement_date,
        type: formData.type,
        purpose: formData.movement_kind,
        party_name: formData.party_name || null,
        vehicle_no: isStockIn ? null : (formData.vehicle_no || null),
        status: formData.status,
        notes: formData.notes || null,
        items: formData.items
      };

      await axios.post('/api/challans', payload);
      const actionName =
        formData.movement_kind === 'stock_in'
          ? 'Stock In entry saved & inventory added to main branch'
          : 'Stock transferred between branches successfully';

      addToast(actionName, 'success');
      setIsModalOpen(false);
      onStockUpdated();
      onChallanUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving inventory movement', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Header Titles
  const getHeaderInfo = () => {
    if (fixedType === 'stock_in') {
      return {
        title: 'Stock In (Inward Inventory Entry)',
        subtitle: 'Record inward wholesale shipments, supplier deliveries & restock warehouse goods',
        icon: <ArrowDownLeft className="w-6 h-6 stroke-[2.2]" />,
        iconClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
        addBtnText: '+ New Stock In Entry',
        addBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        targetKind: 'stock_in'
      };
    }
    if (fixedType === 'stock_transfer') {
      return {
        title: 'Stock Transfer (Inter-Branch / Inter-Warehouse)',
        subtitle: 'Move inventory securely between central warehouses, branch outlets & store registers',
        icon: <ArrowRightLeft className="w-6 h-6 stroke-[2.2]" />,
        iconClass: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600',
        addBtnText: '+ New Stock Transfer',
        addBtnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        targetKind: 'stock_transfer'
      };
    }
    return {
      title: 'Inventory & Stock Movements Desk',
      subtitle: 'Manage inward stock receipts and inter-branch warehouse transfers',
      icon: <Boxes className="w-6 h-6 stroke-[2.2]" />,
      iconClass: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
      addBtnText: '+ Record Stock Movement',
      addBtnClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      targetKind: 'stock_in'
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card (Light Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner ${headerInfo.iconClass}`}>
            {headerInfo.icon}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {headerInfo.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {headerInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {fixedType ? (
            <button
              onClick={() => handleOpenAdd(headerInfo.targetKind)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs ${headerInfo.addBtnClass}`}
            >
              <Plus className="w-4 h-4" />
              <span>{headerInfo.addBtnText}</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => handleOpenAdd('stock_in')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Stock In</span>
              </button>
              <button
                onClick={() => handleOpenAdd('stock_transfer')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>+ Stock Transfer</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {!fixedType ? (
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto shadow-2xs gap-1">
            <button
              onClick={() => setActiveType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Movements
            </button>
            <button
              onClick={() => setActiveType('inward')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeType === 'inward'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Stock In</span>
            </button>
            <button
              onClick={() => setActiveType('transfer')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeType === 'transfer'
                  ? 'bg-indigo-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfers</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs font-mono">
              Total Records: <span className="text-amber-700 font-bold">{filteredMovements.length}</span>
            </span>
          </div>
        )}

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search movement #, branch, party..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Movements Table (Light Theme) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Reference # & Date</th>
                <th className="px-5 py-3.5">Movement Type</th>
                <th className="px-5 py-3.5">Location / Branches</th>
                <th className="px-5 py-3.5 text-center">Items & Units</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isTransfer = m.type === 'outward' && m.target_branch_id;
                  const isInward = m.type === 'inward';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {m.challan_no}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{m.challan_date}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {isInward ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>STOCK IN</span>
                          </span>
                        ) : isTransfer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>TRANSFER</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>STOCK OUT</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.branch?.name || 'Main Warehouse'}</span>
                          {isTransfer && (
                            <>
                              <span className="text-slate-400 font-mono">&rarr;</span>
                              <span className="text-indigo-700">{m.target_branch?.name || 'Destination Branch'}</span>
                            </>
                          )}
                        </div>
                        {m.party_name && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Party/Vendor: {m.party_name}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {m.total_quantity || 0}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {m.items?.length || 0} items
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Applied</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setViewingMovement(m)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STOCK MOVEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col text-slate-900">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" />
                <span>
                  {formData.movement_kind === 'stock_in'
                    ? 'Record Stock In (Inward Inventory Addition)'
                    : 'Record Stock Transfer (Inter-Branch Move)'}
                </span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              {formData.movement_kind === 'stock_in' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Supplier *
                    </label>
                    <SearchableSelect
                      options={supplierList.map((s) => ({
                        value: s.id,
                        label: s.name,
                        sublabel: [s.mobile_no || s.phone, s.city].filter(Boolean).join(' • '),
                        badge: s.gstin ? `GST: ${s.gstin}` : '',
                        raw: s
                      }))}
                      value={formData.supplier_id}
                      onChange={(val, opt) => {
                        setFormData({
                          ...formData,
                          supplier_id: val,
                          party_name: opt ? opt.label : ''
                        });
                      }}
                      placeholder="-- Search & Select Supplier --"
                      searchPlaceholder="Search supplier name, mobile, city..."
                      allowClear
                      theme="light"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Stock-in Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.movement_date}
                      onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Source Warehouse / Branch *
                      </label>
                      <SearchableSelect
                        options={branchList.map((b) => ({
                          value: b.id,
                          label: b.name,
                          sublabel: b.address || '',
                          badge: b.type || ''
                        }))}
                        value={formData.branch_id}
                        onChange={(val) => setFormData({ ...formData, branch_id: val })}
                        placeholder="-- Select Source Branch --"
                        searchPlaceholder="Search branch or warehouse..."
                        theme="light"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Destination Warehouse / Branch *
                      </label>
                      <SearchableSelect
                        options={branchList
                          .filter((b) => String(b.id) !== String(formData.branch_id))
                          .map((b) => ({
                            value: b.id,
                            label: b.name,
                            sublabel: b.address || '',
                            badge: b.type || ''
                          }))}
                        value={formData.target_branch_id}
                        onChange={(val) => setFormData({ ...formData, target_branch_id: val })}
                        placeholder="-- Select Destination Branch --"
                        searchPlaceholder="Search destination branch..."
                        theme="light"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Movement Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.movement_date}
                        onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle / Transit Ref (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. MH-04-AB-1234 or Hand Delivery"
                        value={formData.vehicle_no}
                        onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">Inventory Line Items:</span>
                  <div className="w-full sm:w-80">
                    <SearchableSelect
                      options={itemList.map((it) => ({
                        value: it.id,
                        label: it.name,
                        sublabel: it.short_name ? `Code: ${it.short_name}` : '',
                        badge: `Stock: ${it.stock_quantity ?? 0}`
                      }))}
                      value=""
                      onChange={(id) => handleAddItemLine(id)}
                      placeholder="+ Search & Add Product to Movement..."
                      searchPlaceholder="Search product by name or code..."
                      allowClear
                      theme="light"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-mono text-[11px] uppercase">
                      <tr>
                        <th className="px-3 py-2 w-8">#</th>
                        <th className="px-3 py-2">Item Name</th>
                        <th className="px-3 py-2 text-center w-32">Movement Qty</th>
                        <th className="px-3 py-2 text-right w-32">Rate ({currency})</th>
                        <th className="px-3 py-2 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                            No items added yet. Search and select above.
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((it, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{it.item_name}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0.01"
                                step="1"
                                required
                                value={it.quantity}
                                onChange={(e) => updateItemLine(idx, 'quantity', e.target.value)}
                                className="w-20 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-center font-mono font-bold focus:bg-white"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.rate}
                                onChange={(e) => updateItemLine(idx, 'rate', e.target.value)}
                                className="w-24 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-right font-mono font-bold focus:bg-white"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemLine(idx)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Internal Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional stock remarks or movement reference..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Authorize & Update Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SLIP MODAL */}
      {viewingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Inventory Movement Note</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Note</span>
                </button>
                <button onClick={() => setViewingMovement(null)} className="p-1 rounded text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-4 text-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-black uppercase text-slate-900">{tenant?.name}</h2>
              <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">
                {viewingMovement.type === 'inward'
                  ? 'INWARD STOCK RECEIPT NOTE'
                  : viewingMovement.target_branch_id
                  ? 'INTER-BRANCH STOCK TRANSFER NOTE'
                  : 'OUTWARD STOCK ISSUE NOTE'}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                Ref #: {viewingMovement.challan_no} &bull; Date: {viewingMovement.challan_date}
              </div>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Source Location:</span>
                <span className="font-bold text-slate-900">{viewingMovement.branch?.name || 'Main Warehouse'}</span>
              </div>
              {viewingMovement.target_branch_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Destination Location:</span>
                  <span className="font-bold text-indigo-700">{viewingMovement.target_branch?.name || 'Store Branch'}</span>
                </div>
              )}
              {viewingMovement.party_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Party / Transporter:</span>
                  <span className="font-bold text-slate-900">{viewingMovement.party_name}</span>
                </div>
              )}
              {viewingMovement.vehicle_no && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Vehicle:</span>
                  <span className="font-mono text-slate-900">{viewingMovement.vehicle_no}</span>
                </div>
              )}
            </div>

            {/* Line items summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewingMovement.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-bold text-slate-900">{it.item_name}</td>
                      <td className="p-2 text-center font-mono font-bold">{it.quantity}</td>
                      <td className="p-2 text-right font-mono">{currency}{it.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs font-bold">
              <span>Total Units Moved:</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {viewingMovement.total_quantity} Units
              </span>
            </div>

            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-400">
              <div className="border-t border-slate-200 pt-1">Warehouse In-Charge</div>
              <div className="border-t border-slate-200 pt-1">Authorized Receiver</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
