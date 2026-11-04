import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Plus,
  Trash2,
  Search,
  Calendar,
  CheckCircle2,
  X,
  Printer,
  Eye,
  Tag,
  Package,
  Building2,
  Users,
  Truck,
  Sparkles,
  BarChart3,
  Percent,
  FileText,
  MessageCircle
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import { printElement, numberToWordsIndian } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';

export default function CreditDebitNoteEntry({
  type = 'credit_note', // 'credit_note' | 'debit_note'
  customers = [],
  suppliers = [],
  branches = [],
  items = [],
  tenant,
  onNoteSaved = () => {},
  onViewReport = () => {},
  addToast = () => {}
}) {
  const currency = tenant?.currency || '₹';
  const isCredit = type === 'credit_note';

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

  const defaultBranch = branchList.find((b) => b.is_primary || b.is_head) || branchList[0];

  // Form State
  const [formData, setFormData] = useState({
    party_id: '',
    party_name: '',
    branch_id: defaultBranch?.id || '',
    original_invoice_no: '',
    note_date: new Date().toISOString().split('T')[0],
    reason: isCredit ? 'Customer sales return' : 'Purchase return to supplier',
    extra_discount: '',
    affects_stock: true,
    notes: '',
    items: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [createdNote, setCreatedNote] = useState(null);

  // -------------------------------------------------------------
  // POS-STYLE ADD PRODUCT POPUP MODAL STATE
  // -------------------------------------------------------------
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [popupProductSearchQuery, setPopupProductSearchQuery] = useState('');
  const [popupSelectedProduct, setPopupSelectedProduct] = useState(null);
  const [isPopupDropdownOpen, setIsPopupDropdownOpen] = useState(false);
  const [popupHighlightedIndex, setPopupHighlightedIndex] = useState(0);
  const [popupQty, setPopupQty] = useState('1');
  const [popupRate, setPopupRate] = useState('');
  const [popupDiscountPercent, setPopupDiscountPercent] = useState('');
  const [popupFeedbackMsg, setPopupFeedbackMsg] = useState('');

  const popupSearchInputRef = useRef(null);
  const popupQtyInputRef = useRef(null);
  const popupRateInputRef = useRef(null);
  const popupDiscountInputRef = useRef(null);
  const popupDropdownRef = useRef(null);
  const popupItemRefs = useRef([]);
  const partyTriggerRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Auto focus first input or select dropdown when component screen mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (partyTriggerRef.current) {
        partyTriggerRef.current.focus();
      } else {
        const firstEl = document.querySelector('form input:not([type="hidden"]), form [data-searchable-select="true"]');
        firstEl?.focus();
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [type]);

  // Handler to close Add Product popup and immediately focus final submit button
  const handleCloseAddProductModal = () => {
    setIsPopupDropdownOpen(false);
    setIsAddProductModalOpen(false);
    setTimeout(() => {
      submitButtonRef.current?.focus();
    }, 60);
  };

  // Auto focus search input when Add Product popup opens
  useEffect(() => {
    if (isAddProductModalOpen) {
      setTimeout(() => {
        popupSearchInputRef.current?.focus();
      }, 70);
    }
  }, [isAddProductModalOpen]);

  // Click outside to close product dropdown inside popup
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupDropdownRef.current && !popupDropdownRef.current.contains(e.target)) {
        setIsPopupDropdownOpen(false);
      }
    };
    if (isPopupDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPopupDropdownOpen]);

  // Keyboard shortcut listener: F2 or Alt+N to open product popup, Esc to close,
  // and Enter to focus/trigger Issue Credit Note or Issue Debit Note when products are added
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (createdNote) return;

      if (e.key === 'F2') {
        e.preventDefault();
        setIsAddProductModalOpen(true);
      } else if (e.key === 'Escape') {
        if (isAddProductModalOpen) {
          e.preventDefault();
          handleCloseAddProductModal();
        }
      } else if (e.key === 'Enter') {
        // If modal is open, modal inputs handle their own Enter
        if (isAddProductModalOpen) return;

        // If items exist and not currently saving
        if (formData.items.length > 0 && !isSaving) {
          // If already on the submit button, let native click proceed
          if (document.activeElement === submitButtonRef.current) {
            return;
          }

          // If focused on an input/select inside the form or document body, focus final button
          const activeEl = document.activeElement;
          const isInsideForm = activeEl && activeEl.closest('form');
          if (isInsideForm || activeEl === document.body) {
            e.preventDefault();
            submitButtonRef.current?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddProductModalOpen, createdNote, formData.items.length, isSaving]);

  // Filter products for popup
  const popupFilteredProducts = useMemo(() => {
    const q = popupProductSearchQuery.toLowerCase().trim();
    if (!q) {
      return itemList.filter((it) => it.is_active !== false).slice(0, 35);
    }
    return itemList.filter((it) => {
      if (it.is_active === false) return false;
      const matchName = String(it.name || '').toLowerCase().includes(q);
      const matchSku = String(it.short_name || it.sku || it.code || '').toLowerCase().includes(q);
      return matchName || matchSku;
    }).slice(0, 35);
  }, [itemList, popupProductSearchQuery]);

  const handleSelectProductInPopup = (product) => {
    if (!product) return;
    setPopupSelectedProduct(product);
    setPopupProductSearchQuery(product.name || '');
    setIsPopupDropdownOpen(false);

    // Default rate: Sale price for Credit Note, Purchase price for Debit Note
    const defaultRate = isCredit
      ? (Number(product.price) || 0)
      : (Number(product.purchase_price || product.price) || 0);

    setPopupRate(String(defaultRate));

    // Focus Qty
    setTimeout(() => {
      popupQtyInputRef.current?.focus();
      popupQtyInputRef.current?.select();
    }, 50);
  };

  const handlePopupProductKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCloseAddProductModal();
      return;
    }

    if (!isPopupDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsPopupDropdownOpen(true);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (popupFilteredProducts.length > 0) {
          handleSelectProductInPopup(popupFilteredProducts[popupHighlightedIndex] || popupFilteredProducts[0]);
        } else if (popupSelectedProduct) {
          popupQtyInputRef.current?.focus();
          popupQtyInputRef.current?.select();
        } else {
          setIsPopupDropdownOpen(true);
        }
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPopupHighlightedIndex((prev) => {
        const next = prev < popupFilteredProducts.length - 1 ? prev + 1 : 0;
        popupItemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPopupHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : popupFilteredProducts.length - 1;
        popupItemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (popupFilteredProducts.length > 0) {
        handleSelectProductInPopup(popupFilteredProducts[popupHighlightedIndex] || popupFilteredProducts[0]);
      }
    }
  };

  const handleAddProductFromPopup = (e) => {
    if (e) e.preventDefault();

    if (!popupSelectedProduct) {
      setIsPopupDropdownOpen(true);
      popupSearchInputRef.current?.focus();
      return;
    }

    const qty = parseFloat(popupQty);
    const validQty = (!isNaN(qty) && qty > 0) ? qty : 1;
    const rate = parseFloat(popupRate);
    const validRate = (!isNaN(rate) && rate >= 0)
      ? rate
      : (isCredit ? Number(popupSelectedProduct.price) || 0 : Number(popupSelectedProduct.purchase_price || popupSelectedProduct.price) || 0);

    const discPct = popupDiscountPercent !== '' ? Math.min(100, Math.max(0, parseFloat(popupDiscountPercent) || 0)) : 0;
    const gross = Math.round(validQty * validRate * 100) / 100;
    const discAmt = discPct > 0 ? Math.round(((gross * discPct) / 100) * 100) / 100 : 0;
    const lineTotal = Math.max(0, Math.round((gross - discAmt) * 100) / 100);

    setFormData((prev) => {
      const existingIdx = prev.items.findIndex((line) => String(line.item_id) === String(popupSelectedProduct.id));
      if (existingIdx !== -1) {
        const updated = [...prev.items];
        const existing = updated[existingIdx];
        const newQty = Math.round(((Number(existing.quantity) || 0) + validQty) * 1000) / 1000;
        const newGross = Math.round(newQty * validRate * 100) / 100;
        const newDiscAmt = discPct > 0 ? Math.round(((newGross * discPct) / 100) * 100) / 100 : 0;
        const newTotal = Math.max(0, Math.round((newGross - newDiscAmt) * 100) / 100);

        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          unit_price: validRate,
          discount_percent: discPct > 0 ? discPct : '',
          discount_amount: newDiscAmt > 0 ? newDiscAmt : 0,
          total_price: newTotal
        };
        return { ...prev, items: updated };
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            item_id: popupSelectedProduct.id,
            item_name: popupSelectedProduct.name,
            sku: popupSelectedProduct.sku || popupSelectedProduct.code || '',
            unit: popupSelectedProduct.unit || 'pcs',
            quantity: validQty,
            unit_price: validRate,
            discount_percent: discPct > 0 ? discPct : '',
            discount_amount: discAmt,
            total_price: lineTotal
          }
        ]
      };
    });

    const addedName = popupSelectedProduct.name;
    setPopupFeedbackMsg(`Added ${validQty}x "${addedName}" to note!`);
    setTimeout(() => setPopupFeedbackMsg(''), 2200);

    // Reset popup fields for consecutive entry (discount stays as previous value!)
    setPopupSelectedProduct(null);
    setPopupProductSearchQuery('');
    setPopupQty('1');
    setPopupRate('');
    setIsPopupDropdownOpen(false);

    // Keep popup open and return focus to search input for rapid continuous item entry
    setTimeout(() => {
      popupSearchInputRef.current?.focus();
    }, 40);
  };

  const handleUpdateItemLine = (idx, field, val) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      const item = { ...updated[idx], [field]: val };

      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.unit_price) || 0;
      const d = parseFloat(item.discount_percent) || 0;
      const gross = Math.round(q * r * 100) / 100;
      const discAmt = d > 0 ? Math.round(((gross * d) / 100) * 100) / 100 : 0;
      item.discount_amount = discAmt;
      item.total_price = Math.max(0, Math.round((gross - discAmt) * 100) / 100);

      updated[idx] = item;
      return { ...prev, items: updated };
    });
  };

  const handleRemoveItem = (idx) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalLineDiscount = 0;
    let totalQty = 0;

    formData.items.forEach((it) => {
      const q = parseFloat(it.quantity) || 0;
      const r = parseFloat(it.unit_price) || 0;
      const d = parseFloat(it.discount_amount) || 0;
      totalQty += q;
      subtotal += q * r;
      totalLineDiscount += d;
    });

    const extraDisc = Math.max(0, parseFloat(formData.extra_discount) || 0);
    const netTotal = Math.max(0, Math.round((subtotal - totalLineDiscount - extraDisc) * 100) / 100);

    return {
      totalQty: Math.round(totalQty * 1000) / 1000,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round((totalLineDiscount + extraDisc) * 100) / 100,
      netTotal
    };
  }, [formData.items, formData.extra_discount]);

  // Form Submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.party_name && !formData.party_id) {
      addToast(`Please select a ${isCredit ? 'customer' : 'supplier'}`, 'error');
      partyTriggerRef.current?.focus();
      return;
    }

    if (formData.items.length === 0) {
      addToast('Please add at least one product using "+ Add Product"', 'error');
      setIsAddProductModalOpen(true);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        type,
        party_type: isCredit ? 'customer' : 'supplier',
        party_id: formData.party_id || null,
        party_name: formData.party_name,
        branch_id: formData.branch_id || defaultBranch?.id || null,
        original_invoice_no: formData.original_invoice_no || null,
        note_date: formData.note_date,
        reason: formData.reason || null,
        discount_amount: parseFloat(formData.extra_discount) || 0,
        affects_stock: Boolean(formData.affects_stock),
        notes: formData.notes || null,
        items: formData.items.map((it) => ({
          item_id: it.item_id,
          item_name: it.item_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_percent: parseFloat(it.discount_percent) || 0,
          discount_amount: parseFloat(it.discount_amount) || 0,
          total_price: it.total_price
        }))
      };

      const res = await axios.post('/api/credit-debit-notes', payload);
      const savedNote = res.data.note;

      addToast(
        `${isCredit ? 'Credit Note' : 'Debit Note'} ${savedNote.note_no} issued successfully!`,
        'success'
      );

      setCreatedNote(savedNote);
      onNoteSaved();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Error saving note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForm = () => {
    setCreatedNote(null);
    setFormData({
      party_id: '',
      party_name: '',
      branch_id: defaultBranch?.id || '',
      original_invoice_no: '',
      note_date: new Date().toISOString().split('T')[0],
      reason: isCredit ? 'Customer sales return' : 'Purchase return to supplier',
      extra_discount: '',
      affects_stock: true,
      notes: '',
      items: []
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs border ${
              isCredit
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-purple-50 border-purple-200 text-purple-600'
            }`}
          >
            <RotateCcw className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {isCredit ? 'Credit Note Entry (Sales Return)' : 'Debit Note Entry (Purchase Return)'}
              </h1>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                  isCredit
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {isCredit ? 'Zero GST Sales Return' : 'Zero GST Purchase Return'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCredit
                ? 'Issue credit note to wholesale buyer, reverse sales balance & re-enter goods into stock'
                : 'Issue debit note to vendor/supplier, deduct payable balance & adjust stock out'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewReport(isCredit ? 'credit_notes' : 'debit_notes')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            title="View Historical Register & Print Archives"
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>View {isCredit ? 'Credit Notes' : 'Debit Notes'} Report</span>
          </button>
        </div>
      </div>

      {/* Main Entry Sheet */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Transaction Header Info Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Party Selector */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select {isCredit ? 'Wholesale Customer / Buyer' : 'Vendor / Supplier'} *
              </label>
              <SearchableSelect
                triggerRef={partyTriggerRef}
                autoFocus={true}
                options={
                  isCredit
                    ? customerList.map((c) => ({
                        value: c.id,
                        label: c.name,
                        sublabel: `${c.phone || ''} ${c.city ? '• ' + c.city : ''}`,
                        raw: c
                      }))
                    : supplierList.map((s) => ({
                        value: s.id,
                        label: s.name,
                        sublabel: `${s.phone || ''} ${s.city ? '• ' + s.city : ''}`,
                        raw: s
                      }))
                }
                value={formData.party_id}
                onChange={(val, raw) => {
                  setFormData((prev) => ({
                    ...prev,
                    party_id: val,
                    party_name: raw?.name || ''
                  }));
                }}
                placeholder={`-- Select ${isCredit ? 'Customer' : 'Supplier'} --`}
                searchPlaceholder={`Search ${isCredit ? 'customer' : 'supplier'} by name, phone...`}
                theme="light"
              />
            </div>

            {/* Note Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Note Issue Date *</label>
              <input
                type="date"
                required
                value={formData.note_date}
                onChange={(e) => setFormData({ ...formData, note_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>

            {/* Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operating Branch / Store</label>
              <SearchableSelect
                options={branchList.map((b) => ({
                  value: b.id,
                  label: b.name,
                  badge: b.type
                }))}
                value={formData.branch_id}
                onChange={(val) => setFormData({ ...formData, branch_id: val })}
                placeholder="Select Branch"
                theme="light"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Original Invoice # */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Original Invoice / Bill # (Optional)</label>
              <input
                type="text"
                placeholder="e.g. INV-202610-0042"
                value={formData.original_invoice_no}
                onChange={(e) => setFormData({ ...formData, original_invoice_no: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Return Reason</label>
              <input
                type="text"
                placeholder={isCredit ? 'Customer sales return, damaged, overcharge...' : 'Purchase return, rejected lot...'}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>

            {/* Affects Stock Checkbox */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.affects_stock}
                  onChange={(e) => setFormData({ ...formData, affects_stock: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span>
                  {isCredit
                    ? 'Re-add returned items back into store inventory'
                    : 'Deduct returned goods from inventory'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Product Items Table Section */}
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          {/* Table Header Action Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Return Products & Lines
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[10px] font-mono font-bold">
                {formData.items.length} {formData.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              type="button"
              data-add-new-btn="true"
              onClick={() => setIsAddProductModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
              title="Open Add Product popup (Alt+N or F2)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Product</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-amber-600/30 text-slate-950 rounded border border-amber-600/40">
                Alt+N / F2
              </kbd>
            </button>
          </div>

          {/* Lines Table */}
          {formData.items.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Package className="w-6 h-6" />
              </div>
              <div className="text-slate-500 text-xs font-medium">
                No items added to this note yet.
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first product line (F2)</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">#</th>
                    <th className="px-4 py-3">Product Description</th>
                    <th className="px-4 py-3 w-32">Return Qty</th>
                    <th className="px-4 py-3 w-32 text-right">Unit Rate ({currency})</th>
                    <th className="px-4 py-3 w-28 text-right">Disc %</th>
                    <th className="px-4 py-3 w-36 text-right">Line Total ({currency})</th>
                    <th className="px-4 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {formData.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{it.item_name}</div>
                        {it.sku && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            SKU: {it.sku} &bull; {it.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          required
                          value={it.quantity}
                          onChange={(e) => handleUpdateItemLine(idx, 'quantity', e.target.value)}
                          className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-amber-400 outline-none text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {currency} {Number(it.unit_price || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={it.discount_percent}
                          onChange={(e) => handleUpdateItemLine(idx, 'discount_percent', e.target.value)}
                          className="w-20 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:border-amber-400 outline-none text-right ml-auto"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-slate-900 text-sm">
                        {currency} {Number(it.total_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Summary & Submit Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Notes & Remarks */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-700">Remarks / Accounting Narration</label>
            <input
              type="text"
              placeholder="Goods condition, reason for wholesale credit, warranty return details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>

          {/* Right: Totals Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Quantity:</span>
                <span className="font-mono font-bold text-slate-900">{calculations.totalQty} units</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">
                  {currency} {calculations.subtotal.toFixed(2)}
                </span>
              </div>
              {calculations.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Total Line Discounts:</span>
                  <span className="font-mono font-bold">
                    -{currency} {calculations.totalDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-100">
                <span>Extra Overall Discount ({currency}):</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={formData.extra_discount}
                  onChange={(e) => setFormData({ ...formData, extra_discount: e.target.value })}
                  className="w-24 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs text-right focus:bg-white outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">Total Note Amount:</span>
                <span className="font-mono text-xl font-black text-amber-900">
                  {currency} {calculations.netTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer transition-colors"
              >
                Reset
              </button>
              <button
                ref={submitButtonRef}
                type="submit"
                disabled={isSaving || formData.items.length === 0}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs shadow-xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isCredit
                    ? 'bg-rose-500 hover:bg-rose-400 text-white focus:ring-rose-500 ring-1 ring-rose-400/50'
                    : 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-purple-600 ring-1 ring-purple-400/50'
                } disabled:opacity-50`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'Saving...'
                    : isCredit
                    ? 'Issue Credit Note (Enter)'
                    : 'Issue Debit Note (Enter)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ------------------------------------------------------------- */}
      {/* POS-STYLE ADD PRODUCT POPUP MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Add Product to {isCredit ? 'Credit Note' : 'Debit Note'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Type product name, use &darr; &uarr; arrow keys & press Enter
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAddProductModal}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {popupFeedbackMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{popupFeedbackMsg}</span>
              </div>
            )}

            {/* Recently added item summary strip */}
            {formData.items.length > 0 && (
              <div className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                    Recently Added:
                  </span>
                  <span className="font-bold text-slate-800 truncate">
                    {formData.items[formData.items.length - 1].item?.name || formData.items[formData.items.length - 1].item_name}
                  </span>
                  <span className="font-mono font-bold text-amber-700 shrink-0">
                    ({formData.items[formData.items.length - 1].quantity} @ {currency}{formData.items[formData.items.length - 1].unit_price})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
                  Total Items: <strong className="text-slate-900 font-bold">{formData.items.length}</strong>
                </span>
              </div>
            )}

            <form onSubmit={handleAddProductFromPopup} className="space-y-4">
              {/* Product Search & Dropdown */}
              <div className="relative" ref={popupDropdownRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name / SKU Code *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={popupSearchInputRef}
                    type="text"
                    autoFocus
                    placeholder="Search product name, SKU, item code..."
                    value={popupProductSearchQuery}
                    onChange={(e) => {
                      setPopupProductSearchQuery(e.target.value);
                      setIsPopupDropdownOpen(true);
                      setPopupHighlightedIndex(0);
                    }}
                    onFocus={() => setIsPopupDropdownOpen(true)}
                    onKeyDown={handlePopupProductKeyDown}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                {isPopupDropdownOpen && popupFilteredProducts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in">
                    {popupFilteredProducts.map((p, idx) => {
                      const isHighlighted = idx === popupHighlightedIndex;
                      return (
                        <div
                          key={p.id}
                          ref={(el) => (popupItemRefs.current[idx] = el)}
                          onMouseEnter={() => setPopupHighlightedIndex(idx)}
                          onClick={() => handleSelectProductInPopup(p)}
                          className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{p.name}</div>
                            <div
                              className={`text-[10px] ${
                                isHighlighted ? 'text-slate-900/80' : 'text-slate-500'
                              }`}
                            >
                              SKU: {p.sku || p.code || p.short_name || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold">
                              {currency}{' '}
                              {Number(isCredit ? p.price : p.purchase_price || p.price || 0).toFixed(2)}
                            </div>
                            <div
                              className={`text-[10px] ${
                                isHighlighted ? 'text-slate-900/80' : 'text-slate-500'
                              }`}
                            >
                              Stock: {p.stock ?? p.quantity ?? 0} {p.unit || 'pcs'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Product Pill */}
              {popupSelectedProduct && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{popupSelectedProduct.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Standard Rate: {currency}{' '}
                      {Number(isCredit ? popupSelectedProduct.price : popupSelectedProduct.purchase_price || popupSelectedProduct.price || 0).toFixed(2)}{' '}
                      &bull; Available Stock: {popupSelectedProduct.stock ?? popupSelectedProduct.quantity ?? 0}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                    Selected
                  </span>
                </div>
              )}

              {/* Qty & Discount Fields (Price is auto-fetched) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    ref={popupQtyInputRef}
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={popupQty}
                    onChange={(e) => setPopupQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCloseAddProductModal();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        popupDiscountInputRef.current?.focus();
                        popupDiscountInputRef.current?.select();
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-amber-400 outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount %</label>
                  <input
                    ref={popupDiscountInputRef}
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={popupDiscountPercent}
                    onChange={(e) => setPopupDiscountPercent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCloseAddProductModal();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProductFromPopup(e);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:border-amber-400 outline-none text-right"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Tip: Press <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd> on discount to add & continue
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCloseAddProductModal}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Done (Esc)
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer"
                  >
                    + Add to Note (Enter)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINTABLE SUCCESS NOTE MODAL (MATCHING SALE INVOICE FORMAT)   */}
      {/* ------------------------------------------------------------- */}
      {createdNote && (() => {
        const noteItems = createdNote.items || [];
        const noteGross = noteItems.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);
        const noteDiscount = Math.max(0, noteGross - Number(createdNote.total_amount || 0));
        const noteFinal = Number(createdNote.total_amount || 0);
        const noteTotalQty = noteItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const isNoteCredit = createdNote.type === 'credit_note';

        const storeName = tenant?.name || activeBranch?.name || '';
        const storeAddress = tenant?.address || activeBranch?.address || '';
        const storePhone = tenant?.phone || activeBranch?.phone || '';
        const storeGst = tenant?.gst_number || tenant?.gstin || tenant?.tax_number || '';
        const storeEmail = tenant?.email || activeBranch?.email || '';

        const party = isNoteCredit
          ? customerList.find((c) => String(c.id) === String(createdNote.party_id))
          : supplierList.find((s) => String(s.id) === String(createdNote.party_id));
        const partyPhone = party?.mobile_no || party?.phone || '';
        const partyAddress = party?.address || '';
        const partyEmail = party?.email || '';
        const partyGst = party?.gstin || party?.gst_in || party?.tax_number || '';

        const handlePrintCreatedNote = () => {
          printElement('printable-credit-note-slip', {
            title: `${isNoteCredit ? 'Credit Note' : 'Debit Note'} - ${createdNote.note_no}`,
            onAfterPrint: () => {
              window.location.href = isNoteCredit ? '/credit-note-entry' : '/debit-note-entry';
            }
          });
        };

        const handleSendWhatsAppCreatedNote = () => {
          if (!partyPhone) {
            alert('No mobile number available for this party.');
            return;
          }
          let cleanPhone = String(partyPhone).replace(/[^0-9]/g, '');
          if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
          }
          const noteTypeTitle = isNoteCredit ? 'Credit Note' : 'Debit Note';
          const noteNo = createdNote.note_no;
          const noteDate = formatDateDMY(createdNote.note_date || createdNote.created_at);
          const total = Number(noteFinal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const refBill = createdNote.original_invoice_no ? `\n🔗 *Against Bill Ref:* ${createdNote.original_invoice_no}` : '';

          const message = `Dear ${party?.name || createdNote.party_name || 'Customer'},\n\nThis is regarding *${noteTypeTitle}* issued by *${storeName}*.\n\n📄 *${noteTypeTitle} #:* ${noteNo}\n📅 *Date:* ${noteDate}\n💰 *Net Amount:* ₹${total}${refBill}${noteItems.length > 0 ? `\n📦 *Items Count:* ${noteItems.length}` : ''}\n${createdNote.reason ? `📝 *Reason:* ${createdNote.reason}\n` : ''}\nThank you!\n*${storeName}*`;

          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePrintCreatedNote();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleResetForm();
              }
            }}
            tabIndex={0}
          >
            <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-4">
              
              {/* Modal Top Control Bar */}
              <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between no-print text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-white text-sm">
                        {isNoteCredit ? 'Credit Note' : 'Debit Note'} #{createdNote.note_no}
                      </span>
                      <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {createdNote.party_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Official Wholesale Note Document</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendWhatsAppCreatedNote}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer ring-1 ring-emerald-400"
                    title="Send Note details via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintCreatedNote}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer ring-1 ring-amber-300"
                    title="Print Document (Enter)"
                  >
                    <Printer className="w-4 h-4 stroke-[2.5]" />
                    <span>Print Note <kbd className="ml-1 px-1.5 py-0.5 rounded bg-slate-950/15 font-mono text-[10px]">Enter</kbd></span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
                    title="Close & New (Esc)"
                  >
                    <X className="w-4 h-4" />
                    <span>Done <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd></span>
                  </button>
                </div>
              </div>

              {/* Printable Note Container (Matches Sale Invoice Format) */}
              <div
                id="printable-credit-note-slip"
                className="p-6 sm:p-8 text-black bg-white max-w-full font-sans print:p-0 print:m-0"
              >
                {/* Header Title Centered above the box */}
                <div className="text-center font-bold text-sm tracking-widest uppercase pb-1 text-black">
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
                          <span className="font-bold text-red-600 font-mono text-sm">{createdNote.note_no}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 font-bold text-black shrink-0">Note Date:-</span>
                          <span className="font-medium text-black font-mono">{formatDateDMY(createdNote.note_date || createdNote.created_at)}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-24 font-bold text-black shrink-0">Party Name:</span>
                          <span className="font-bold uppercase text-black">{createdNote.party_name}</span>
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
                        {createdNote.original_invoice_no && (
                          <div className="flex items-center">
                            <span className="w-24 font-bold text-black shrink-0">Bill No:-</span>
                            <span className="font-mono font-bold text-slate-900">{createdNote.original_invoice_no}</span>
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
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Discount / Adjustments</td>
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

