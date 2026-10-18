import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  Building,
  Warehouse,
  CheckCircle2,
  Clock,
  Eye,
  Printer,
  X,
  CreditCard,
  Percent,
  Sparkles,
  FileText
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';

export default function PurchaseManager({
  purchases = [],
  suppliers = [],
  branches = [],
  items = [],
  tenant,
  initialType = 'all', // 'all', 'intra_state', 'inter_state', 'unregistered'
  onPurchaseUpdated = () => {},
  addToast = () => {}
}) {
  const currency = tenant?.currency || '₹';
  const [activeType, setActiveType] = useState(initialType);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for creating purchase
  const [formData, setFormData] = useState({
    branch_id: '',
    supplier_id: '',
    supplier_name: '',
    supplier_bill_no: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_type: 'intra_state',
    payment_status: 'Paid',
    payment_method: 'Bank Transfer',
    paid_amount: '',
    discount_amount: 0,
    notes: '',
    items: []
  });

  const purchaseList = useMemo(() => {
    if (Array.isArray(purchases)) return purchases;
    if (Array.isArray(purchases?.data)) return purchases.data;
    return [];
  }, [purchases]);

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

  const itemList = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (Array.isArray(items?.items)) return items.items;
    if (Array.isArray(items?.data)) return items.data;
    return [];
  }, [items]);

  const filteredPurchases = useMemo(() => {
    return purchaseList.filter((p) => {
      const matchType = activeType === 'all' || p.purchase_type === activeType;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.purchase_no?.toLowerCase().includes(term) ||
        p.supplier_bill_no?.toLowerCase().includes(term) ||
        p.supplier_name?.toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }, [purchaseList, activeType, searchTerm]);

  const handleOpenAdd = (type = 'intra_state') => {
    const firstSupplier = supplierList[0];
    setFormData({
      branch_id: branchList[0]?.id || '',
      supplier_id: type === 'unregistered' ? '' : (firstSupplier?.id || ''),
      supplier_name: type === 'unregistered' ? 'Local Vendor' : (firstSupplier?.name || ''),
      supplier_bill_no: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_type: type,
      payment_status: 'Paid',
      payment_method: 'Bank Transfer',
      paid_amount: '',
      discount_amount: 0,
      notes: '',
      items: itemList.slice(0, 1).map((i) => ({
        item_id: i.id,
        item_name: i.name,
        barcode: i.barcode,
        quantity: 10,
        purchase_price: i.purchase_price || 100,
        gst_percent: type === 'unregistered' ? 0 : (i.gst_percent || 18)
      }))
    });
    setIsModalOpen(true);
  };

  const handleAddItemLine = (itemId) => {
    if (!itemId) return;
    const it = itemList.find((i) => String(i.id) === String(itemId));
    if (!it) return;

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_id: it.id,
          item_name: it.name,
          barcode: it.barcode,
          quantity: 5,
          purchase_price: it.purchase_price || it.price || 100,
          gst_percent: prev.purchase_type === 'unregistered' ? 0 : (it.gst_percent || 18)
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

  // Calculations for form totals
  const formCalculations = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    const isUnregistered = formData.purchase_type === 'unregistered';

    formData.items.forEach((it) => {
      const lineSub = Number(it.quantity || 0) * Number(it.purchase_price || 0);
      subtotal += lineSub;
      const gst = isUnregistered ? 0 : Number(it.gst_percent || 0);
      tax += (lineSub * gst) / 100;
    });

    const discount = Number(formData.discount_amount || 0);
    const total = Math.max(0, subtotal - discount + tax);

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  }, [formData.items, formData.discount_amount, formData.purchase_type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      addToast('Please add at least one line item to purchase bill', 'error');
      return;
    }
    if (!formData.supplier_name.trim()) {
      addToast('Supplier name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await axios.post('/api/purchases', formData);
      addToast('Purchase invoice recorded successfully. Stock updated.', 'success');
      setIsModalOpen(false);
      onPurchaseUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving purchase', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card (Light Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-inner">
            <ShoppingBag className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Purchase Management & Inward Bills
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Record Intra State (In-State CGST+SGST), Inter State (IGST), and Unregistered Suppliers procurement
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAdd('intra_state')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>+ Intra State (In-State)</span>
          </button>
          <button
            onClick={() => handleOpenAdd('inter_state')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4 text-sky-700" />
            <span>+ Inter State (Out of State)</span>
          </button>
          <button
            onClick={() => handleOpenAdd('unregistered')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>+ Unregistered Vendor</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs (Light Theme) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto overflow-x-auto shadow-2xs">
          <button
            onClick={() => setActiveType('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeType === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs border border-amber-400'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Purchases ({purchaseList.length})
          </button>
          <button
            onClick={() => setActiveType('intra_state')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeType === 'intra_state'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intra State (In State)
          </button>
          <button
            onClick={() => setActiveType('inter_state')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeType === 'inter_state'
                ? 'bg-sky-600 text-white font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inter State (Out of State)
          </button>
          <button
            onClick={() => setActiveType('unregistered')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeType === 'unregistered'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unregistered Suppliers
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search purchase #, bill #, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium placeholder-slate-400"
          />
        </div>
      </div>

      {/* Purchases Table (Light Card) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Purchase # & Date</th>
                <th className="px-5 py-3.5">Type & Tax Type</th>
                <th className="px-5 py-3.5">Supplier / Firm</th>
                <th className="px-5 py-3.5">Receiving Branch</th>
                <th className="px-5 py-3.5">Total Amount ({currency})</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No purchase bills recorded. Click any "+ Purchase" button above to add one.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{p.purchase_no}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{p.purchase_date}</span>
                        {p.supplier_bill_no && <span>&bull; Bill: {p.supplier_bill_no}</span>}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {p.purchase_type === 'intra_state' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Intra State (CGST+SGST)
                        </span>
                      ) : p.purchase_type === 'inter_state' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          Inter State (IGST)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Unregistered (Non-GST)
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{p.supplier_name || 'Vendor'}</div>
                      {p.supplier?.gstin && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">GST: {p.supplier.gstin}</div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        {p.branch?.type === 'warehouse' ? <Warehouse className="w-3.5 h-3.5 text-indigo-500" /> : <Building className="w-3.5 h-3.5 text-emerald-600" />}
                        <span className="font-medium">{p.branch?.name || 'Central Warehouse'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        {currency} {Number(p.total_amount || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Tax: {currency} {Number(p.tax_amount || 0).toLocaleString()}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded ${
                        p.payment_status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : p.payment_status === 'Partial'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {p.payment_status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setViewingPurchase(p)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Bill</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Bill Modal (Light Card) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col text-slate-900">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <span>
                  New Purchase Invoice &bull;{' '}
                  {formData.purchase_type === 'intra_state'
                    ? 'Intra State (CGST + SGST)'
                    : formData.purchase_type === 'inter_state'
                    ? 'Inter State (IGST)'
                    : 'Unregistered Supplier'}
                </span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Classification *</label>
                  <select
                    value={formData.purchase_type}
                    onChange={(e) => {
                      const t = e.target.value;
                      setFormData({
                        ...formData,
                        purchase_type: t,
                        supplier_id: t === 'unregistered' ? '' : formData.supplier_id,
                        supplier_name: t === 'unregistered' ? 'Local Vendor' : formData.supplier_name
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white"
                  >
                    <option value="intra_state">🏛️ Intra State (In State CGST+SGST)</option>
                    <option value="inter_state">✈️ Inter State (Out of State IGST)</option>
                    <option value="unregistered">🌾 Unregistered Supplier (Non-GST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Bill / Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. TAX-2026/089"
                    value={formData.supplier_bill_no}
                    onChange={(e) => setFormData({ ...formData, supplier_bill_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Warehouse / Store *</label>
                  <SearchableSelect
                    options={branchList.map((b) => ({
                      value: b.id,
                      label: `${b.type === 'warehouse' ? '🏭 ' : '🏬 '}${b.name}`,
                      sublabel: b.address || '',
                      badge: b.type
                    }))}
                    value={formData.branch_id}
                    onChange={(val) => setFormData({ ...formData, branch_id: val })}
                    placeholder="-- Select Receiving Branch --"
                    searchPlaceholder="Search branch or warehouse..."
                    theme="light"
                  />
                </div>
              </div>

              {/* Supplier Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.purchase_type !== 'unregistered' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
                    <SearchableSelect
                      options={supplierList.map((s) => ({
                        value: s.id,
                        label: s.name,
                        sublabel: s.gstin ? `GSTIN: ${s.gstin} • ${s.state || 'Local'}` : `State: ${s.state || 'Local'}`,
                        badge: s.phone ? `Mob: ${s.phone}` : '',
                        raw: s
                      }))}
                      value={formData.supplier_id}
                      onChange={(val, opt) => {
                        setFormData({
                          ...formData,
                          supplier_id: val,
                          supplier_name: opt ? opt.label : ''
                        });
                      }}
                      placeholder="-- Search & Select Supplier --"
                      searchPlaceholder="Search supplier name or GSTIN..."
                      allowClear
                      theme="light"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unregistered Vendor / Artisan Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kisan Fresh Farms / Local Craft Vendor"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Credit">Credit / Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white"
                    >
                      <option value="Paid">Paid in Full</option>
                      <option value="Partial">Partial Paid</option>
                      <option value="Unpaid">Unpaid / Credit</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Line Table */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">Purchase Line Items (Increases Inventory):</span>
                  <div className="w-full sm:w-80">
                    <SearchableSelect
                      options={itemList.map((it) => ({
                        value: it.id,
                        label: it.name,
                        sublabel: it.short_name ? `Code: ${it.short_name}` : '',
                        badge: `Stock: ${it.stock_quantity ?? 0}`
                      }))}
                      value=""
                      onChange={(val) => {
                        if (val) handleAddItemLine(val);
                      }}
                      placeholder="+ Search & Add Product to Bill..."
                      searchPlaceholder="Search product name or code..."
                      theme="light"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Item Name</th>
                        <th className="px-3 py-2.5 w-28">Quantity</th>
                        <th className="px-3 py-2.5 w-32">Purchase Rate</th>
                        <th className="px-3 py-2.5 w-24">GST %</th>
                        <th className="px-3 py-2.5 w-28 text-right">Line Total</th>
                        <th className="px-3 py-2.5 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((it, idx) => {
                        const lineSub = Number(it.quantity || 0) * Number(it.purchase_price || 0);
                        const gst = formData.purchase_type === 'unregistered' ? 0 : Number(it.gst_percent || 0);
                        const lineTax = (lineSub * gst) / 100;
                        const lineTot = lineSub + lineTax;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2 font-bold text-slate-800">{it.item_name}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                value={it.quantity}
                                onChange={(e) => updateItemLine(idx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-xs text-center text-slate-900 focus:bg-white"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={it.purchase_price}
                                onChange={(e) => updateItemLine(idx, 'purchase_price', e.target.value)}
                                className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 focus:bg-white"
                              />
                            </td>
                            <td className="px-3 py-2">
                              {formData.purchase_type === 'unregistered' ? (
                                <span className="font-mono text-slate-400">0% (RCM)</span>
                              ) : (
                                <input
                                  type="number"
                                  value={it.gst_percent}
                                  onChange={(e) => updateItemLine(idx, 'gst_percent', e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-xs text-center text-slate-900 focus:bg-white"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-right font-bold text-slate-900">
                              {currency} {lineTot.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemLine(idx)}
                                className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Footer */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                  <div>Subtotal: <span className="text-slate-900 font-bold">{currency} {formCalculations.subtotal}</span></div>
                  <div>Tax: <span className="text-slate-900 font-bold">{currency} {formCalculations.tax}</span></div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 font-medium">Total Purchase Value:</span>
                  <span className="text-lg font-black font-mono text-amber-700">
                    {currency} {formCalculations.total}
                  </span>
                </div>
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
                  {isSaving ? 'Processing...' : 'Authorize Purchase & Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Bill Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Purchase Inward Document</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button onClick={() => setViewingPurchase(null)} className="p-1 rounded text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-4 text-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-black uppercase text-slate-900">{tenant?.name}</h2>
              <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">
                PURCHASE BILL ({viewingPurchase.purchase_type?.replace('_', ' ').toUpperCase()})
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                Purchase #: {viewingPurchase.purchase_no} &bull; Date: {viewingPurchase.purchase_date}
              </div>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Supplier:</span>
                <span className="font-bold text-slate-900">{viewingPurchase.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Receiving Warehouse:</span>
                <span className="font-bold text-slate-900">{viewingPurchase.branch?.name}</span>
              </div>
              {viewingPurchase.supplier_bill_no && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Supplier Invoice:</span>
                  <span className="font-mono text-slate-900">{viewingPurchase.supplier_bill_no}</span>
                </div>
              )}
            </div>

            <table className="w-full text-left text-xs border-t border-b border-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 px-2">Item Description</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Price</th>
                  <th className="py-2.5 px-2 text-right">GST</th>
                  <th className="py-2.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(viewingPurchase.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-2 font-medium text-slate-800">{it.item_name}</td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono text-slate-900">{it.quantity}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-700">{currency} {it.purchase_price}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-600">{it.gst_percent}%</td>
                    <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-900">{currency} {it.total_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-3 flex justify-between items-center text-sm font-black border-b border-slate-200 pb-3">
              <span className="text-slate-700">Total Purchase Value:</span>
              <span className="font-mono text-base text-slate-900">{currency} {Number(viewingPurchase.total_amount).toLocaleString()}</span>
            </div>

            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-400">
              <div className="border-t border-slate-200 pt-1">Warehouse Gate Inward Officer</div>
              <div className="border-t border-slate-200 pt-1">Authorized Purchase Approver</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
