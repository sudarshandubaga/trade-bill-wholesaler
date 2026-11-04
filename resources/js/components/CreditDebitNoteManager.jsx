import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Tag,
  MessageCircle
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import { printElement, numberToWordsIndian } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';
import PaginationControls from './PaginationControls';
import { usePagination } from '../utils/usePagination';

export default function CreditDebitNoteManager({
  notes = [],
  customers = [],
  suppliers = [],
  branches = [],
  items = [],
  tenant,
  fixedType = null, // 'credit_note' | 'debit_note' | null
  onNoteUpdated = () => { },
  onOpenAdd = null,
  addToast = () => { }
}) {
  const currency = tenant?.currency || '₹';
  const initialType = fixedType || 'all';
  const [activeType, setActiveType] = useState(initialType);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef(null);

  // Auto focus search input when register screen mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [fixedType]);

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

  // Pagination hook
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedNotes
  } = usePagination(filteredNotes, 25, [searchTerm, activeType, fixedType]);

  const handleSendNoteWhatsApp = (note) => {
    const isCredit = note.type === 'credit_note';
    const party = isCredit
      ? customerList.find((c) => String(c.id) === String(note.party_id))
      : supplierList.find((s) => String(s.id) === String(note.party_id));

    const rawPhone = party?.mobile_no || party?.phone || note.party_phone;
    if (!rawPhone) {
      addToast('No mobile number available for this party.', 'error');
      return;
    }

    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const storeName = tenant?.name || activeBranch?.name || 'Krishna Book Agency';
    const partyName = party?.name || note.party_name || (isCredit ? 'Customer' : 'Supplier');
    const noteTypeTitle = isCredit ? 'Credit Note' : 'Debit Note';
    const noteNo = note.note_no;
    const noteDate = formatDateDMY(note.note_date || note.created_at);
    const total = Number(note.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const refBill = note.original_invoice_no ? `\n🔗 *Against Bill Ref:* ${note.original_invoice_no}` : '';
    const itemsCount = (note.items || []).length;

    const message = `Dear ${partyName},\n\nThis is regarding *${noteTypeTitle}* issued by *${storeName}*.\n\n📄 *${noteTypeTitle} #:* ${noteNo}\n📅 *Date:* ${noteDate}\n💰 *Net Amount:* ₹${total}${refBill}${itemsCount > 0 ? `\n📦 *Items Count:* ${itemsCount}` : ''}\n${note.reason ? `📝 *Reason:* ${note.reason}\n` : ''}\nThank you!\n*${storeName}*`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    addToast(`WhatsApp opened for ${noteTypeTitle} ${noteNo}!`, 'success');
  };

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
    if (onOpenAdd) {
      onOpenAdd(chosenType);
      return;
    }
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
      : 'Handle sales returns from customers and purchase returns to wholesale suppliers');

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
              data-add-new-btn="true"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
              title="Shortcut: Alt+N or F2"
            >
              <RotateCcw className="w-4 h-4 text-purple-700" />
              <span>+ Issue Credit Note (Sales Return)</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-purple-200/60 text-purple-900 rounded border border-purple-300">Alt+N</kbd>
            </button>
          )}

          {(!fixedType || fixedType === 'debit_note') && (
            <button
              onClick={() => handleOpenAdd('debit_note')}
              data-add-new-btn={fixedType === 'debit_note' ? 'true' : undefined}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold cursor-pointer transition-all shadow-2xs"
              title="Shortcut: Alt+N or F2"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-700" />
              <span>+ Issue Debit Note (Purchase Return)</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-amber-200/60 text-amber-900 rounded border border-amber-300">Alt+N</kbd>
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
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs border border-amber-400'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Notes
            </button>
            <button
              onClick={() => setActiveType('credit_note')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'credit_note'
                ? 'bg-purple-600 text-white font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>Credit Notes (Customer)</span>
            </button>
            <button
              onClick={() => setActiveType('debit_note')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'debit_note'
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
            ref={searchInputRef}
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
              {paginatedNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No {fixedType === 'credit_note' ? 'Credit' : (fixedType === 'debit_note' ? 'Debit' : 'Credit or Debit')} notes recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedNotes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{n.note_no}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDateDMY(n.note_date || n.created_at)}</span>
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
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSendNoteWhatsApp(n)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1 transition-colors shadow-2xs no-print"
                          title="Send Note details via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingNote(n)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View / Print</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar */}
      <PaginationControls
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

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
                  <SearchableSelect
                    disabled={Boolean(fixedType)}
                    options={[
                      { value: 'credit_note', label: 'Credit Note (Sales Return)' },
                      { value: 'debit_note', label: 'Debit Note (Purchase Return)' }
                    ]}
                    value={formData.type}
                    onChange={(val) => {
                      setFormData({
                        ...formData,
                        type: val,
                        party_type: val === 'credit_note' ? 'customer' : 'supplier',
                        party_id: '',
                        party_name: '',
                        reason: val === 'credit_note' ? 'Customer sales return' : 'Purchase return to supplier'
                      });
                    }}
                    placeholder="Select Note Type"
                    theme="light"
                  />
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

                                  {/* Auto-fetched Rate */}
                                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                      {Number(it.unit_price || 0).toFixed(2)}
                                    </span>
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
                <input
                  type="text"
                  placeholder="Reason for return, physical condition of goods, warranty credit, customer remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
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
      {viewingNote && (() => {
        const isNoteCredit = viewingNote.type === 'credit_note';
        const storeName = tenant?.name || activeBranch?.name || '';
        const storeAddress = tenant?.address || activeBranch?.address || '';
        const storePhone = tenant?.phone || activeBranch?.phone || '';
        const storeGst = tenant?.tax_number || tenant?.gst_number || tenant?.gstin || '';
        const storeEmail = tenant?.email || activeBranch?.email || '';

        const party = isNoteCredit
          ? customerList.find((c) => String(c.id) === String(viewingNote.party_id))
          : supplierList.find((s) => String(s.id) === String(viewingNote.party_id));
        const partyPhone = party?.mobile_no || party?.phone || '';
        const partyAddress = party?.address || '';
        const partyEmail = party?.email || '';
        const partyGst = party?.gstin || party?.gst_in || party?.tax_number || '';

        const noteItems = viewingNote.items || [];
        const noteTotalQty = noteItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const noteGross = Number(viewingNote.subtotal || noteItems.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0));
        const noteDiscount = Number(viewingNote.discount_amount || 0);
        const noteFinal = Number(viewingNote.total_amount || (noteGross - noteDiscount));

        const handlePrint = () => {
          printElement('printable-viewing-note-slip', {
            title: `${isNoteCredit ? 'Credit Note' : 'Debit Note'} - ${viewingNote.note_no}`,
            onAfterPrint: () => {
              window.location.href = isNoteCredit ? '/credit-notes' : '/debit-notes';
            }
          });
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in overflow-y-auto"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setViewingNote(null);
              if (e.key === 'Enter' && !e.shiftKey) handlePrint();
            }}
            tabIndex={0}
          >
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto">
              {/* Modal Top Control Bar */}
              <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between border-b border-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Official Note Document</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{viewingNote.note_no}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendNoteWhatsApp(viewingNote)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-all ring-1 ring-emerald-400"
                    title="Send Note details via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
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
                    onClick={() => setViewingNote(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                    <span>Close <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd></span>
                  </button>
                </div>
              </div>

              {/* Printable Note Container (Matches Sale Invoice Format) */}
              <div
                id="printable-viewing-note-slip"
                className="p-6 sm:p-8 text-black bg-white max-w-full font-sans print:p-0 print:m-0"
              >
                {/* Header Title Centered above the box */}
                <div
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    paddingBottom: '6px',
                    color: '#000000',
                    width: '100%',
                    display: 'block'
                  }}
                  className="text-center font-bold text-sm tracking-widest uppercase pb-1 text-black"
                >
                  {isNoteCredit ? 'CREDIT NOTE (SALES RETURN)' : 'DEBIT NOTE (PURCHASE RETURN)'}
                </div>

                {/* Main Master Table with Black Border */}
                <table
                  className="w-full border-collapse border-2 border-black"
                  style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
                >
                  <tbody>
                    {/* Row 1: Header (Store Info Left & Note Meta Right) */}
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
                          {storeAddress && <div dangerouslySetInnerHTML={{ __html: storeAddress }} />}
                          {storePhone && <div>Mobile No: {storePhone}</div>}
                          {storeGst && <div className="font-mono">GST No. {storeGst}</div>}
                          {storeEmail && <div>Email: {storeEmail}</div>}
                        </div>
                      </td>

                      {/* Right Note Meta */}
                      <td
                        style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderBottom: '2px solid black' }}
                        className="w-1/2 p-3 sm:p-4 align-top border-b-2 border-black text-xs space-y-1 print-header-cell"
                      >
                        <div className="flex items-center">
                          <span className="w-24 text-red-600 font-bold shrink-0">Note No:-</span>
                          <span className="font-bold text-red-600 font-mono text-sm">{viewingNote.note_no}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 font-bold text-black shrink-0">Note Date:-</span>
                          <span className="font-medium text-black font-mono">{formatDateDMY(viewingNote.note_date || viewingNote.created_at)}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-24 font-bold text-black shrink-0">Party Name:</span>
                          <span className="font-bold uppercase text-black">{viewingNote.party_name}</span>
                        </div>
                        {partyAddress && (
                          <div className="flex items-start">
                            <span className="w-24 font-bold text-black shrink-0">Address:-</span>
                            <span className="uppercase text-black" dangerouslySetInnerHTML={{ __html: partyAddress }} />
                          </div>
                        )}
                        {partyPhone && (
                          <div className="flex items-center">
                            <span className="w-24 font-bold text-black shrink-0">Mobile No:-</span>
                            <span className="font-mono text-black">{partyPhone}</span>
                          </div>
                        )}
                        {partyGst && (
                          <div className="flex items-center">
                            <span className="w-24 font-bold text-black shrink-0">GST No:-</span>
                            <span className="font-mono text-black">{partyGst}</span>
                          </div>
                        )}
                        {partyEmail && (
                          <div className="flex items-center">
                            <span className="w-24 font-bold text-black shrink-0">Email:-</span>
                            <span className="font-mono text-black lowercase">{partyEmail}</span>
                          </div>
                        )}
                        {viewingNote.original_invoice_no && (
                          <div className="flex items-center">
                            <span className="w-24 font-bold text-black shrink-0">Bill No:-</span>
                            <span className="font-mono font-bold text-slate-900">{viewingNote.original_invoice_no}</span>
                          </div>
                        )}
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
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 text-left">Book Name</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right', width: '96px' }} className="border border-black py-0 px-3 text-right w-24">Rate</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center', width: '80px' }} className="border border-black py-0 px-3 text-center w-20">Qty</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right', width: '128px' }} className="border border-black py-0 px-3 text-right w-32">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-black">
                            {noteItems.map((item, idx) => {
                              const rate = Number(item.unit_price || 0);
                              const qty = Number(item.quantity || 0);
                              const lineAmt = qty * rate;

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

                            {noteItems.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }} className="border border-black py-2 text-center text-slate-400 text-xs">
                                  No items recorded on this note.
                                </td>
                              </tr>
                            )}

                            {/* Total Row */}
                            <tr className="font-bold text-xs bg-white">
                              <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-bold uppercase tracking-wider">Total</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px' }} className="border border-black py-0 px-3"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-mono font-bold">{noteTotalQty}</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono font-bold">
                                {noteGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                {numberToWordsIndian(noteFinal)}
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
                                {noteGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Discount</td>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                                {noteDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0px 12px', fontWeight: '900', color: '#dc2626' }} className="px-3 py-0 font-black text-red-600">Final Amount</td>
                              <td style={{ padding: '0px 12px', fontWeight: '900', textAlign: 'right', color: '#dc2626', fontSize: '14px' }} className="px-3 py-0 font-black font-mono text-right text-red-600 text-sm">
                                {noteFinal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
