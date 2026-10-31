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
import { printElement, numberToWordsIndian } from '../utils/printHelper';

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
            data-add-new-btn="true"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
            title="Shortcut: Alt+N or F2"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>+ Intra State (In-State)</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-emerald-200/60 text-emerald-900 rounded border border-emerald-300">Alt+N</kbd>
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
                  <SearchableSelect
                    options={[
                      { value: 'intra_state', label: 'Intra State (In State CGST+SGST)' },
                      { value: 'inter_state', label: 'Inter State (Out of State IGST)' },
                      { value: 'unregistered', label: 'Unregistered Supplier (Non-GST)' }
                    ]}
                    value={formData.purchase_type}
                    onChange={(val) => {
                      setFormData({
                        ...formData,
                        purchase_type: val,
                        supplier_id: val === 'unregistered' ? '' : formData.supplier_id,
                        supplier_name: val === 'unregistered' ? 'Local Vendor' : formData.supplier_name
                      });
                    }}
                    placeholder="Select Classification"
                    theme="light"
                  />
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
                    <SearchableSelect
                      options={[
                        { value: 'Bank Transfer', label: 'Bank Transfer' },
                        { value: 'Cash', label: 'Cash' },
                        { value: 'UPI', label: 'UPI' },
                        { value: 'Credit', label: 'Credit / Account' }
                      ]}
                      value={formData.payment_method}
                      onChange={(val) => setFormData(prev => ({ ...prev, payment_method: val }))}
                      placeholder="Select Method"
                      theme="light"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                    <SearchableSelect
                      options={[
                        { value: 'Paid', label: 'Paid in Full' },
                        { value: 'Partial', label: 'Partial Paid' },
                        { value: 'Unpaid', label: 'Unpaid / Credit' }
                      ]}
                      value={formData.payment_status}
                      onChange={(val) => setFormData(prev => ({ ...prev, payment_status: val }))}
                      placeholder="Select Status"
                      theme="light"
                    />
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
      {viewingPurchase && (() => {
        const storeName = tenant?.name || 'KRISHNA BOOK AGENCY';
        const storeAddress = tenant?.address || 'Prakash Nagar, Narkatiyaganj (Bihar) - 845455';
        const storePhone = tenant?.phone || '9939175603, 9430472515';
        const storeGst = tenant?.tax_number || tenant?.gst_number || '10AYSPP3209J1ZC';
        const storeEmail = tenant?.email || 'krishnabookagency@gmail.com';

        const purchaseItems = viewingPurchase.items || [];
        const purchaseTotalQty = purchaseItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const purchaseGross = Number(viewingPurchase.subtotal || purchaseItems.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.purchase_price || 0)), 0));
        const purchaseFinal = Number(viewingPurchase.total_amount || purchaseGross);
        const purchaseDiscount = Math.max(0, purchaseGross - purchaseFinal);

        const handlePrint = () => {
          printElement('printable-purchase-bill-slip', {
            title: `Purchase Bill - ${viewingPurchase.purchase_no}`
          });
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in overflow-y-auto"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setViewingPurchase(null);
              if (e.key === 'Enter' && !e.shiftKey) handlePrint();
            }}
            tabIndex={0}
          >
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto">
              {/* Modal Top Control Bar */}
              <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between border-b border-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Official Purchase Inward</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{viewingPurchase.purchase_no}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 cursor-pointer transition-all"
                    title="Print Document (Enter)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill <kbd className="ml-1 px-1.5 py-0.5 rounded bg-black/20 text-slate-950 font-mono text-[10px]">Enter</kbd></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingPurchase(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                    <span>Close <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd></span>
                  </button>
                </div>
              </div>

              {/* Printable Purchase Box (Matches Sale Invoice Format) */}
              <div
                id="printable-purchase-bill-slip"
                className="p-6 sm:p-8 text-black bg-white max-w-full font-sans print:p-0 print:m-0"
              >
                {/* Header Title Centered above the box */}
                <div className="text-center font-bold text-sm tracking-widest uppercase pb-1 text-black">
                  PURCHASE - INWARD INVOICE
                </div>

                {/* Main Master Table with Black Border */}
                <table
                  className="w-full border-collapse border-2 border-black"
                  style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
                >
                  <tbody>
                    {/* Row 1: Header (Store Info Left & Bill Meta Right) */}
                    <tr>
                      {/* Left Store Info */}
                      <td
                        style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderRight: '2px solid black', borderBottom: '2px solid black' }}
                        className="w-1/2 p-3 sm:p-4 align-top border-r-2 border-b-2 border-black text-center sm:text-left print-header-cell"
                      >
                        <h1 className="text-xl sm:text-2xl font-black uppercase text-[#1e3a8a] tracking-tight mb-1 text-center">
                          {storeName}
                        </h1>
                        <div className="space-y-0.5 text-[11px] sm:text-xs text-slate-800 text-center font-medium">
                          {storeAddress && <div>{storeAddress}</div>}
                          {storePhone && <div>Mobile No: {storePhone}</div>}
                          {storeGst && <div className="font-mono">GST No. {storeGst}</div>}
                          {storeEmail && <div>Email: {storeEmail}</div>}
                        </div>
                      </td>

                      {/* Right Bill Meta */}
                      <td
                        style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderBottom: '2px solid black' }}
                        className="w-1/2 p-3 sm:p-4 align-top border-b-2 border-black text-xs space-y-1 print-header-cell"
                      >
                        <div className="flex items-center">
                          <span className="w-28 text-red-600 font-bold shrink-0">Purchase No:-</span>
                          <span className="font-bold text-red-600 font-mono text-sm">{viewingPurchase.purchase_no}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 font-bold text-black shrink-0">Bill Date:-</span>
                          <span className="font-medium text-black font-mono">{viewingPurchase.purchase_date}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-28 font-bold text-black shrink-0">Supplier/Pub:</span>
                          <span className="font-bold uppercase text-black">{viewingPurchase.supplier_name}</span>
                        </div>
                        {viewingPurchase.supplier_bill_no && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-black shrink-0">Supplier Inv:</span>
                            <span className="font-mono text-slate-900 font-bold">{viewingPurchase.supplier_bill_no}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="w-28 font-bold text-slate-600 shrink-0">Godown:-</span>
                          <span className="text-slate-800">{viewingPurchase.branch?.name || 'Main Godown'}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Row 2: Items Table with Full Borders */}
                    <tr>
                      <td colSpan={2} style={{ padding: 0, borderBottom: '2px solid black' }} className="p-0 border-b-2 border-black">
                        <table
                          className="w-full text-left border-collapse invoice-table"
                          style={{ width: '100%', borderCollapse: 'collapse' }}
                        >
                          <thead>
                            <tr className="bg-white text-black font-bold uppercase text-xs">
                              <th style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center', width: '48px' }} className="border border-black py-0 px-2 text-center w-12">SN</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 text-left">Book Title / Item Description</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right', width: '96px' }} className="border border-black py-0 px-3 text-right w-24">Rate</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center', width: '80px' }} className="border border-black py-0 px-3 text-center w-20">Qty</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right', width: '128px' }} className="border border-black py-0 px-3 text-right w-32">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-black">
                            {purchaseItems.map((item, idx) => {
                              const rate = Number(item.purchase_price || 0);
                              const qty = Number(item.quantity || 0);
                              const lineAmt = Number(item.total_price || (qty * rate));

                              return (
                                <tr key={idx} className="leading-snug">
                                  <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">{idx + 1}</td>
                                  <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 font-semibold uppercase">{item.item_name}</td>
                                  <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono">{rate.toFixed(2)}</td>
                                  <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-mono">{qty}</td>
                                  <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono">
                                    {lineAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}

                            {purchaseItems.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }} className="border border-black py-2 text-center text-slate-400 text-xs">
                                  No items recorded on this purchase.
                                </td>
                              </tr>
                            )}

                            {/* Total Row */}
                            <tr className="font-bold text-xs bg-white">
                              <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-bold uppercase tracking-wider">Total</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px' }} className="border border-black py-0 px-3"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-mono font-bold">{purchaseTotalQty}</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono font-bold">
                                {purchaseGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Row 3: Bottom Summary Section */}
                    <tr>
                      {/* Amount in Words (Left Side - 58%) */}
                      <td
                        style={{ width: '58%', verticalAlign: 'top', padding: 0, borderRight: '2px solid black' }}
                        className="w-[58%] align-top p-0 border-r-2 border-black"
                      >
                        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }} className="w-full h-full border-collapse">
                          <tbody>
                            <tr>
                              <td
                                style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}
                                className="border-b border-black px-3 py-0 font-bold text-xs uppercase text-black bg-slate-50 print:bg-transparent"
                              >
                                Amount in Words
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', lineHeight: '1.4' }}
                                className="px-3 py-2 font-bold text-xs uppercase leading-relaxed text-black"
                              >
                                {numberToWordsIndian(purchaseFinal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>

                      {/* Financial Summary Table (Right Side - 42%) */}
                      <td
                        style={{ width: '42%', verticalAlign: 'top', padding: 0 }}
                        className="w-[42%] align-top p-0"
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse' }} className="w-full text-xs border-collapse">
                          <tbody>
                            <tr>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Gross Amount</td>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                                {purchaseGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Discount</td>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                                {purchaseDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0px 12px', fontWeight: '900', color: '#dc2626' }} className="px-3 py-0 font-black text-red-600">Final Amount</td>
                              <td style={{ padding: '0px 12px', fontWeight: '900', textAlign: 'right', color: '#dc2626', fontSize: '14px' }} className="px-3 py-0 font-black font-mono text-right text-red-600 text-sm">
                                {purchaseFinal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <div className="flex justify-end items-center pt-2 px-1 text-[11px] text-slate-700 font-medium">
                  <span className="text-red-600 font-black text-sm tracking-wider">TAX FREE</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
