import React, { useState, useMemo, useEffect } from 'react';
import {
  FileDiff,
  Plus,
  Minus,
  Trash2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  X,
  Printer,
  Eye,
  CheckCircle2,
  Package,
  RotateCcw,
  Tag
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';

export default function CreditDebitNoteManager({
  notes = [],
  customers = [],
  suppliers = [],
  branches = [],
  items = [],
  tenant,
  fixedType = null, // 'credit_note' | 'debit_note' | null
  onNoteUpdated = () => {},
  addToast = () => {}
}) {
  const currency = tenant?.currency || '₹';
  const initialType = fixedType || 'all';
  const [activeType, setActiveType] = useState(initialType);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (fixedType) {
      setActiveType(fixedType);
    }
  }, [fixedType]);

  // Form State
  const defaultNoteType = fixedType || 'credit_note';
  const [formData, setFormData] = useState({
    type: defaultNoteType,
    party_type: defaultNoteType === 'credit_note' ? 'customer' : 'supplier',
    party_id: '',
    party_name: '',
    branch_id: '',
    original_invoice_no: '',
    note_date: new Date().toISOString().split('T')[0],
    reason: defaultNoteType === 'credit_note' ? 'Customer sales return' : 'Purchase return to supplier',
    discount_amount: '',
    affects_stock: true,
    notes: '',
    items: []
  });

  const noteList = useMemo(() => {
    if (Array.isArray(notes)) return notes;
    if (Array.isArray(notes?.data)) return notes.data;
    return [];
  }, [notes]);

  const branchList = useMemo(() => {
    if (Array.isArray(branches)) return branches;
    if (Array.isArray(branches?.branches)) return branches.branches;
    if (Array.isArray(branches?.data)) return branches.data;
    return [];
  }, [branches]);

  const customerList = useMemo(() => {
    if (Array.isArray(customers)) return customers;
    if (Array.isArray(customers?.customers)) return customers.customers;
    if (Array.isArray(customers?.data)) return customers.data;
    return [];
  }, [customers]);

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

  const filteredNotes = useMemo(() => {
    return noteList.filter((n) => {
      const matchType = fixedType
        ? n.type === fixedType
        : (activeType === 'all' || n.type === activeType);
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        n.note_no?.toLowerCase().includes(term) ||
        n.party_name?.toLowerCase().includes(term) ||
        n.original_invoice_no?.toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }, [noteList, fixedType, activeType, searchTerm]);

  // Line calculation helper
  const calculateLine = (it) => {
    const qty = Math.max(0.01, Number(it.quantity) || 1);
    const rate = Math.max(0, Number(it.unit_price) || 0);
    const gross = Math.round(qty * rate * 100) / 100;

    let discAmt = 0;
    let discPct = 0;
    if (it.discount_amount !== undefined && it.discount_amount !== '' && Number(it.discount_amount) > 0) {
      discAmt = Math.min(gross, Number(it.discount_amount) || 0);
      discPct = gross > 0 ? Math.round((discAmt / gross) * 10000) / 100 : 0;
    } else if (it.discount_percent !== undefined && it.discount_percent !== '' && Number(it.discount_percent) > 0) {
      discPct = Math.min(100, Number(it.discount_percent) || 0);
      discAmt = Math.round(((gross * discPct) / 100) * 100) / 100;
    }

    const subtotal = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
    return { gross, discAmt, discPct, subtotal };
  };

  const handleOpenAdd = (targetType = null) => {
    const chosenType = fixedType || targetType || 'credit_note';
    setFormData({
      type: chosenType,
      party_type: chosenType === 'credit_note' ? 'customer' : 'supplier',
      party_id: '',
      party_name: '',
      branch_id: branchList[0]?.id || '',
      original_invoice_no: '',
      note_date: new Date().toISOString().split('T')[0],
      reason: chosenType === 'credit_note' ? 'Customer sales return' : 'Purchase return to supplier',
      discount_amount: '',
      affects_stock: true,
      notes: '',
      items: []
    });
    setIsModalOpen(true);
  };

  const handleAddItemLine = (itemId) => {
    if (!itemId) return;
    const it = itemList.find((i) => String(i.id) === String(itemId));
    if (!it) return;

    const rate = formData.type === 'credit_note'
      ? (Number(it.price) || 0)
      : (Number(it.purchase_price || it.price) || 0);

    setFormData((prev) => {
      const existingIdx = prev.items.findIndex((line) => String(line.item_id) === String(it.id));
      if (existingIdx !== -1) {
        const updated = [...prev.items];
        const line = updated[existingIdx];
        const newQty = (Number(line.quantity) || 0) + 1;
        const newGross = newQty * (Number(line.unit_price) || 0);

        let newDiscAmt = line.discount_amount;
        if (line.discount_percent !== '' && Number(line.discount_percent) > 0) {
          const pct = Math.min(100, Number(line.discount_percent));
          newDiscAmt = Math.round(((newGross * pct) / 100) * 100) / 100;
        }

        updated[existingIdx] = {
          ...line,
          quantity: newQty,
          discount_amount: newDiscAmt > 0 ? String(newDiscAmt) : ''
        };
        return { ...prev, items: updated };
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            item_id: it.id,
            item_name: it.name,
            barcode: it.barcode || it.short_name || '',
            unit: it.unit || 'Pcs',
            quantity: 1,
            unit_price: rate,
            discount_percent: '',
            discount_amount: '',
            restock: true
          }
        ]
      };
    });
  };

  const updateItemLine = (idx, field, val) => {
    const updated = [...formData.items];
    const it = { ...updated[idx], [field]: val };

    if (field === 'quantity' || field === 'unit_price') {
      const qty = Math.max(0.01, Number(field === 'quantity' ? val : it.quantity) || 1);
      const rate = Math.max(0, Number(field === 'unit_price' ? val : it.unit_price) || 0);
      const gross = qty * rate;

      if (it.discount_percent !== '' && Number(it.discount_percent) > 0) {
        const pct = Math.min(100, Number(it.discount_percent));
        const newDiscAmt = Math.round(((gross * pct) / 100) * 100) / 100;
        it.discount_amount = newDiscAmt > 0 ? String(newDiscAmt) : '';
      }
    }

    updated[idx] = it;
    setFormData({ ...formData, items: updated });
  };

  const updateItemDiscountPercent = (idx, pctVal) => {
    const updated = [...formData.items];
    const it = updated[idx];
    const qty = Math.max(0.01, Number(it.quantity) || 1);
    const rate = Math.max(0, Number(it.unit_price) || 0);
    const gross = qty * rate;

    if (pctVal === '' || pctVal === null) {
      updated[idx] = { ...it, discount_percent: '', discount_amount: '' };
    } else {
      const pct = Math.min(100, Math.max(0, parseFloat(pctVal) || 0));
      const amt = gross > 0 ? Math.round(((gross * pct) / 100) * 100) / 100 : 0;
      updated[idx] = {
        ...it,
        discount_percent: pctVal,
        discount_amount: amt > 0 ? String(amt) : ''
      };
    }
    setFormData({ ...formData, items: updated });
  };

  const updateItemDiscountAmount = (idx, amtVal) => {
    const updated = [...formData.items];
    const it = updated[idx];
    const qty = Math.max(0.01, Number(it.quantity) || 1);
    const rate = Math.max(0, Number(it.unit_price) || 0);
    const gross = qty * rate;

    if (amtVal === '' || amtVal === null) {
      updated[idx] = { ...it, discount_percent: '', discount_amount: '' };
    } else {
      const amt = Math.min(gross, Math.max(0, parseFloat(amtVal) || 0));
      const pct = gross > 0 ? Math.round(((amt / gross) * 100) * 100) / 100 : 0;
      updated[idx] = {
        ...it,
        discount_amount: amtVal,
        discount_percent: pct > 0 ? String(pct) : ''
      };
    }
    setFormData({ ...formData, items: updated });
  };

  const removeItemLine = (idx) => {
    const updated = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: updated });
  };

  // Calculations for form totals (GST free, linked discounts)
  const formCalculations = useMemo(() => {
    let grossTotal = 0;
    let lineDiscounts = 0;
    let subtotal = 0;

    formData.items.forEach((it) => {
      const c = calculateLine(it);
      grossTotal += c.gross;
      lineDiscounts += c.discAmt;
      subtotal += c.subtotal;
    });

    const billDisc = Number(formData.discount_amount) || 0;
    const total = Math.max(0, Math.round((subtotal - billDisc) * 100) / 100);

    return {
      grossTotal: grossTotal.toFixed(2),
      lineDiscounts: lineDiscounts.toFixed(2),
      subtotal: subtotal.toFixed(2),
      billDisc: billDisc.toFixed(2),
      total: total.toFixed(2)
    };
  }, [formData.items, formData.discount_amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      addToast('Please add at least one line item to the note', 'error');
      return;
    }
    if (!formData.party_name.trim()) {
      addToast('Party name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        discount_amount: Number(formData.discount_amount) || 0,
        items: formData.items.map((it) => {
          const c = calculateLine(it);
          return {
            item_id: it.item_id,
            item_name: it.item_name,
            barcode: it.barcode || null,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            discount_percent: Math.round(c.discPct * 100) / 100,
            discount_amount: Math.round(c.discAmt * 100) / 100,
            gst_percent: 0,
            tax_amount: 0,
          };
        })
      };

      await axios.post('/api/credit-debit-notes', payload);
      const label = formData.type === 'credit_note' ? 'Credit Note' : 'Debit Note';
      addToast(`${label} issued successfully. Stock & ledger updated without GST.`, 'success');
      setIsModalOpen(false);
      onNoteUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error creating note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Titles based on fixedType
  const pageTitle = fixedType === 'credit_note'
    ? 'Credit Notes (Customer Sales Return)'
    : (fixedType === 'debit_note'
      ? 'Debit Notes (Supplier Purchase Return)'
      : 'Credit Note & Debit Note Desk');

  const pageSubtitle = fixedType === 'credit_note'
    ? 'Record goods returned by wholesale customers, restock inventory & adjust party credit balance'
    : (fixedType === 'debit_note'
      ? 'Record goods returned to wholesale suppliers, deduct stock inventory & debit vendor payable balance'
      : 'Handle sales returns from retail customers and purchase returns to wholesale suppliers');

  return (
    <div className="space-y-6">
      
      {/* Top Banner (Light Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-inner">
            <FileDiff className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {pageTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {pageSubtitle}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {(!fixedType || fixedType === 'credit_note') && (
            <button
              onClick={() => handleOpenAdd('credit_note')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-purple-700" />
              <span>+ Issue Credit Note (Sales Return)</span>
            </button>
          )}

          {(!fixedType || fixedType === 'debit_note') && (
            <button
              onClick={() => handleOpenAdd('debit_note')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-700" />
              <span>+ Issue Debit Note (Purchase Return)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Subtabs (Light Theme) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {!fixedType ? (
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto shadow-2xs">
            <button
              onClick={() => setActiveType('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs border border-amber-400'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Notes
            </button>
            <button
              onClick={() => setActiveType('credit_note')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeType === 'credit_note'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Credit Notes (Customer)</span>
            </button>
            <button
              onClick={() => setActiveType('debit_note')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeType === 'debit_note'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Debit Notes (Supplier)</span>
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-500">
            Showing all {fixedType === 'credit_note' ? 'Customer Credit Notes' : 'Supplier Debit Notes'} ({filteredNotes.length})
          </div>
        )}

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search note #, party, original invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Table (Light Card) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Note # & Date</th>
                <th className="px-5 py-3.5">Nature</th>
                <th className="px-5 py-3.5">Party / Ledger</th>
                <th className="px-5 py-3.5">Against Bill Ref</th>
                <th className="px-5 py-3.5 text-right">Subtotal</th>
                <th className="px-5 py-3.5 text-right">Net Note Amount ({currency})</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No {fixedType === 'credit_note' ? 'Credit' : (fixedType === 'debit_note' ? 'Debit' : 'Credit or Debit')} notes recorded yet.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{n.note_no}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{n.note_date}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {n.type === 'credit_note' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                          Credit Note (Sales Return)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          Debit Note (Purchase Return)
                        </span>
                      )}
                      {n.affects_stock && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                          &bull; Stock Restored/Adjusted
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{n.party_name}</div>
                      <div className="text-[11px] text-slate-500 capitalize">{n.party_type}</div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-700">
                      {n.original_invoice_no || '-'}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-right font-medium text-slate-600">
                      {currency} {Number(n.subtotal || n.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-5 py-3.5 font-mono font-black text-right text-slate-900 text-sm">
                      {currency} {Number(n.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setViewingNote(n)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal (Light Theme) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col text-slate-900">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileDiff className="w-5 h-5 text-amber-600" />
                <span>
                  Issue {formData.type === 'credit_note' ? 'Credit Note (Customer Sales Return)' : 'Debit Note (Supplier Purchase Return)'}
                </span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Note Type *</label>
                  <select
                    disabled={Boolean(fixedType)}
                    value={formData.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      setFormData({
                        ...formData,
                        type: t,
                        party_type: t === 'credit_note' ? 'customer' : 'supplier',
                        party_id: '',
                        party_name: '',
                        reason: t === 'credit_note' ? 'Customer sales return' : 'Purchase return to supplier'
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white ${
                      fixedType ? 'opacity-80 cursor-not-allowed bg-slate-100' : ''
                    }`}
                  >
                    <option value="credit_note">Credit Note (Sales Return)</option>
                    <option value="debit_note">Debit Note (Purchase Return)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={formData.note_date}
                    onChange={(e) => setFormData({ ...formData, note_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Original Invoice / Bill #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-202610-0001"
                    value={formData.original_invoice_no}
                    onChange={(e) => setFormData({ ...formData, original_invoice_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Warehouse Branch</label>
                  <SearchableSelect
                    options={branchList.map((b) => ({
                      value: b.id,
                      label: b.name,
                      sublabel: b.address || '',
                      badge: b.type || ''
                    }))}
                    value={formData.branch_id}
                    onChange={(val) => setFormData({ ...formData, branch_id: val })}
                    placeholder="-- Select Branch --"
                    searchPlaceholder="Search branch name..."
                    theme="light"
                  />
                </div>
              </div>

              {/* Party selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select {formData.type === 'credit_note' ? 'Customer / Wholesale Buyer' : 'Supplier / Vendor'} *
                  </label>
                  {formData.type === 'credit_note' ? (
                    <SearchableSelect
                      options={customerList.map((c) => ({
                        ...c,
                        value: c.id,
                        label: c.name,
                        sublabel: c.mobile_no ? `Mob: ${c.mobile_no}` : (c.city ? `City: ${c.city}` : ''),
                        badge: c.current_balance !== undefined ? `Bal: ₹${c.current_balance}` : '',
                        raw: c
                      }))}
                      value={formData.party_id}
                      onChange={(val, opt) => {
                        setFormData({
                          ...formData,
                          party_id: val,
                          party_name: opt ? (opt.name || opt.label) : ''
                        });
                      }}
                      placeholder="-- Search & Select Customer --"
                      searchPlaceholder="Search customer name or phone..."
                      allowClear
                      theme="light"
                    />
                  ) : (
                    <SearchableSelect
                      options={supplierList.map((s) => ({
                        ...s,
                        value: s.id,
                        label: s.name,
                        sublabel: s.phone ? `Mob: ${s.phone}` : (s.city ? `City: ${s.city}` : ''),
                        badge: s.current_balance !== undefined ? `Payable: ₹${s.current_balance}` : '',
                        raw: s
                      }))}
                      value={formData.party_id}
                      onChange={(val, opt) => {
                        setFormData({
                          ...formData,
                          party_id: val,
                          party_name: opt ? (opt.name || opt.label) : ''
                        });
                      }}
                      placeholder="-- Search & Select Supplier --"
                      searchPlaceholder="Search supplier name or phone..."
                      allowClear
                      theme="light"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Reason / Justification</label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g. Defective goods return, rate difference credit, cancelled order..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white"
                  />
                </div>
              </div>

              {/* Items Line Table with POS-Style Discounts and Zero GST */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-800">Returned Line Items:</span>
                    <label className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.affects_stock}
                        onChange={(e) => setFormData({ ...formData, affects_stock: e.target.checked })}
                        className="rounded text-emerald-600 bg-white border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Restore / Update Inventory Stock</span>
                    </label>
                  </div>

                  <div className="w-full sm:w-80">
                    <SearchableSelect
                      options={itemList.map((it) => ({
                        ...it,
                        value: it.id,
                        label: it.name,
                        sublabel: it.short_name ? `Code: ${it.short_name}` : '',
                        badge: `${currency}${Number(it.price || 0).toFixed(2)} • Stock: ${it.stock_quantity ?? 0}`
                      }))}
                      value=""
                      onChange={(val) => {
                        if (val) handleAddItemLine(val);
                      }}
                      placeholder="+ Search & Add Product to Return..."
                      searchPlaceholder="Search product name or code..."
                      theme="light"
                    />
                  </div>
                </div>

                {/* EXACT POS-STYLE ITEM TABLE: S.NO., Particulars & Rate, Qty, Amount, Discount (% or Amt), Subtotal, Action */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-mono uppercase text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12">S.NO.</th>
                        <th className="px-3 py-2.5">Particulars & Rate</th>
                        <th className="px-3 py-2.5 text-center w-28">Return Qty</th>
                        <th className="px-3 py-2.5 text-right w-24">Amount</th>
                        <th className="px-3 py-2.5 text-center w-48">Discount (% or Amt)</th>
                        <th className="px-3 py-2.5 text-right w-24">Subtotal</th>
                        <th className="px-3 py-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((it, idx) => {
                        const c = calculateLine(it);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            {/* 1. S.NO. */}
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            {/* 2. Particulars & Rate */}
                            <td className="px-3 py-2">
                              <div className="space-y-1">
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {it.item_name}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                  {it.barcode && (
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1 rounded">
                                      {it.barcode}
                                    </span>
                                  )}
                                  <span className="text-slate-400 font-mono">
                                    Unit: {it.unit || 'Pcs'}
                                  </span>

                                  {/* Editable Rate input */}
                                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={it.unit_price}
                                      onChange={(e) => updateItemLine(idx, 'unit_price', e.target.value)}
                                      className="w-16 text-right font-mono font-bold text-slate-900 text-xs bg-transparent outline-none"
                                      title="Edit return unit rate"
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. Return Qty */}
                            <td className="px-3 py-2 text-center">
                              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateItemLine(idx, 'quantity', Math.max(0.01, Number(it.quantity || 0) - 1))}
                                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="1"
                                  value={it.quantity}
                                  onChange={(e) => updateItemLine(idx, 'quantity', e.target.value)}
                                  className="w-10 text-center font-bold text-slate-900 font-mono text-xs bg-transparent outline-none p-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateItemLine(idx, 'quantity', Number(it.quantity || 0) + 1)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </td>

                            {/* 4. Amount */}
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                              {currency}{c.gross.toFixed(2)}
                            </td>

                            {/* 5. Discount (% or Amt) dual linked auto-calculating fields */}
                            <td className="px-3 py-2 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-amber-50/60 p-1 rounded-lg border border-amber-200">
                                {/* % Field */}
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    placeholder="0"
                                    value={it.discount_percent}
                                    onChange={(e) => updateItemDiscountPercent(idx, e.target.value)}
                                    className="w-12 text-right font-mono font-bold text-slate-900 text-xs bg-white border border-amber-300 rounded px-1 py-0.5 outline-none"
                                    title="Discount percentage"
                                  />
                                  <span className="text-[9px] font-mono font-bold text-amber-700 ml-0.5">%</span>
                                </div>

                                <span className="text-slate-300 text-[10px]">&bull;</span>

                                {/* Amt Field */}
                                <div className="relative">
                                  <span className="text-[9px] font-mono font-bold text-amber-700 mr-0.5">{currency}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="0"
                                    value={it.discount_amount}
                                    onChange={(e) => updateItemDiscountAmount(idx, e.target.value)}
                                    className="w-14 text-right font-mono font-bold text-slate-900 text-xs bg-white border border-amber-300 rounded px-1 py-0.5 outline-none"
                                    title="Discount amount"
                                  />
                                </div>
                              </div>
                            </td>

                            {/* 6. Subtotal */}
                            <td className="px-3 py-2 font-mono text-right font-black text-slate-950">
                              {currency}{c.subtotal.toFixed(2)}
                            </td>

                            {/* 7. Action */}
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemLine(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Remove line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No items added yet. Select products from the dropdown above to add returned lines.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Footer with Extra Note Discount & Zero GST */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                  <div>Gross Amount: <span className="text-slate-900 font-bold">{currency} {formCalculations.grossTotal}</span></div>
                  {Number(formCalculations.lineDiscounts) > 0 && (
                    <div className="text-amber-800">Item Discounts: <span className="font-bold">-{currency} {formCalculations.lineDiscounts}</span></div>
                  )}
                  <div>Items Subtotal: <span className="text-slate-900 font-bold">{currency} {formCalculations.subtotal}</span></div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <span className="font-semibold">Extra Bill Discount:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                      className="w-20 px-2 py-1 rounded-lg bg-white border border-slate-300 font-mono text-right text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="pl-3 border-l border-amber-200">
                    <span className="text-xs text-slate-600 font-medium block text-right">Total Note Value:</span>
                    <span className="text-lg font-black font-mono text-amber-900">
                      {currency} {formCalculations.total}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note Narration</label>
                <textarea
                  rows={2}
                  placeholder="Reason for return, physical condition of goods, warranty credit, customer remarks..."
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
                  {isSaving ? 'Processing...' : `Authorize ${formData.type === 'credit_note' ? 'Credit Note' : 'Debit Note'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Print Document Modal (GST-Free Wholesale Note) */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Official Note Document</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button onClick={() => setViewingNote(null)} className="p-1 rounded text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-4 text-center pb-4 border-b border-slate-200">
              <h2 className="text-lg font-black uppercase text-slate-900">{tenant?.name}</h2>
              <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">
                {viewingNote.type === 'credit_note' ? 'CREDIT NOTE (SALES RETURN)' : 'DEBIT NOTE (PURCHASE RETURN)'}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                Note #: {viewingNote.note_no} &bull; Date: {viewingNote.note_date}
              </div>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Party Name:</span>
                <span className="font-bold text-slate-900">{viewingNote.party_name}</span>
              </div>
              {viewingNote.original_invoice_no && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Against Bill Ref:</span>
                  <span className="font-mono text-slate-900">{viewingNote.original_invoice_no}</span>
                </div>
              )}
              {viewingNote.reason && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Return Reason:</span>
                  <span className="text-slate-900">{viewingNote.reason}</span>
                </div>
              )}
            </div>

            <table className="w-full text-left text-xs border-t border-b border-slate-200">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 px-2">Item Description</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-right">Disc</th>
                  <th className="py-2.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(viewingNote.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-2 font-medium text-slate-800">{it.item_name}</td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono text-slate-900">{it.quantity}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-700">{currency} {Number(it.unit_price).toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                      {Number(it.discount_amount || 0) > 0 ? `-${currency}${Number(it.discount_amount).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-900">{currency} {Number(it.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-3 space-y-1 text-xs border-b border-slate-200 pb-3">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">
                  {currency} {Number(viewingNote.subtotal || viewingNote.total_amount || 0).toFixed(2)}
                </span>
              </div>
              {Number(viewingNote.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Note Extra Discount:</span>
                  <span className="font-mono font-bold">
                    -{currency} {Number(viewingNote.discount_amount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black pt-1 border-t border-slate-100">
                <span className="text-slate-900">Total Note Amount:</span>
                <span className="font-mono text-base text-amber-900">
                  {currency} {Number(viewingNote.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-400">
              <div className="border-t border-slate-200 pt-1">Authorized Signatory</div>
              <div className="border-t border-slate-200 pt-1">Party Acceptance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
