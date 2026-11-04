import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Boxes,
  Plus,
  Trash2,
  Search,
  Calendar,
  CheckCircle2,
  X,
  Printer,
  Package,
  Building2,
  Warehouse,
  Truck,
  ArrowRightLeft,
  ArrowDownLeft,
  BarChart3,
  Store,
  Layers
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import { printElement, numberToWordsIndian } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';

export default function StockMovementEntry({
  mode = 'stock_in', // 'stock_in' | 'stock_transfer'
  branches = [],
  suppliers = [],
  items = [],
  tenant,
  onStockUpdated = () => {},
  onViewReport = () => {},
  addToast = () => {}
}) {
  const currency = tenant?.currency || '₹';
  const isStockIn = mode === 'stock_in';

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

  const mainBranch = branchList.find((b) => b.is_head || b.is_primary) || branchList[0];
  const secondBranch = branchList.find((b) => b.id !== mainBranch?.id) || branchList[1] || branchList[0];

  // Form State
  const [formData, setFormData] = useState({
    branch_id: mainBranch?.id || '',
    target_branch_id: !isStockIn ? (secondBranch?.id || '') : '',
    challan_date: new Date().toISOString().split('T')[0],
    party_name: isStockIn ? (supplierList[0]?.name || '') : '',
    vehicle_no: '',
    status: 'completed',
    notes: '',
    items: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [createdChallan, setCreatedChallan] = useState(null);

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
  const [popupFeedbackMsg, setPopupFeedbackMsg] = useState('');

  const popupSearchInputRef = useRef(null);
  const popupQtyInputRef = useRef(null);
  const popupRateInputRef = useRef(null);
  const popupDropdownRef = useRef(null);
  const popupItemRefs = useRef([]);
  const partyTriggerRef = useRef(null);
  const firstFieldTriggerRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Auto focus first input or select dropdown when screen mounts or mode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (firstFieldTriggerRef.current) {
        firstFieldTriggerRef.current.focus();
      } else {
        const firstEl = document.querySelector('form input:not([type="hidden"]), form [data-searchable-select="true"]');
        firstEl?.focus();
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [mode]);

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

  // Keyboard shortcut: F2 or Alt+N to open product popup, Esc to close,
  // and Enter to focus/trigger Save Movement when products are added
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (createdChallan) return;

      if (e.key === 'F2') {
        e.preventDefault();
        setIsAddProductModalOpen(true);
      } else if (e.key === 'Escape') {
        if (isAddProductModalOpen) {
          e.preventDefault();
          handleCloseAddProductModal();
        }
      } else if (e.key === 'Enter') {
        if (isAddProductModalOpen) return;

        if (formData.items.length > 0 && !isSaving) {
          if (document.activeElement === submitButtonRef.current) {
            return;
          }

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
  }, [isAddProductModalOpen, createdChallan, formData.items.length, isSaving]);

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

    const pPurchase = Number(product.purchase_price ?? 0);
    const pPrice = Number(product.price ?? 0);
    const defaultRate = pPurchase > 0 ? pPurchase : (pPrice > 0 ? pPrice : 0);
    setPopupRate(defaultRate > 0 ? String(defaultRate) : '0');

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
    const pPurchase = Number(popupSelectedProduct.purchase_price ?? 0);
    const pPrice = Number(popupSelectedProduct.price ?? 0);
    const fallbackRate = pPurchase > 0 ? pPurchase : (pPrice > 0 ? pPrice : 0);
    const validRate = (!isNaN(rate) && rate >= 0) ? rate : fallbackRate;

    const lineTotal = Math.round(validQty * validRate * 100) / 100;

    setFormData((prev) => {
      const existingIdx = prev.items.findIndex((line) => String(line.item_id) === String(popupSelectedProduct.id));
      if (existingIdx !== -1) {
        const updated = [...prev.items];
        const existing = updated[existingIdx];
        const newQty = Math.round(((Number(existing.quantity) || 0) + validQty) * 1000) / 1000;
        const newTotal = Math.round(newQty * validRate * 100) / 100;

        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          rate: validRate,
          total: newTotal
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
            sku: popupSelectedProduct.short_name || popupSelectedProduct.sku || popupSelectedProduct.code || popupSelectedProduct.barcode || '',
            unit: popupSelectedProduct.unit || 'pcs',
            quantity: validQty,
            rate: validRate,
            total: lineTotal
          }
        ]
      };
    });

    const addedName = popupSelectedProduct.name;
    setPopupFeedbackMsg(`Added ${validQty}x "${addedName}" to movement!`);
    setTimeout(() => setPopupFeedbackMsg(''), 2200);

    // Reset popup fields for consecutive entry
    setPopupSelectedProduct(null);
    setPopupProductSearchQuery('');
    setPopupQty('1');
    setPopupRate('');
    setIsPopupDropdownOpen(false);

    // Focus returns to search input for rapid continuous item entry
    setTimeout(() => {
      popupSearchInputRef.current?.focus();
    }, 40);
  };

  const handleUpdateItemLine = (idx, field, val) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      const item = { ...updated[idx], [field]: val };

      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      item.total = Math.round(q * r * 100) / 100;

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
    let totalVal = 0;
    let totalQty = 0;

    formData.items.forEach((it) => {
      const q = parseFloat(it.quantity) || 0;
      const r = parseFloat(it.rate) || 0;
      totalQty += q;
      totalVal += q * r;
    });

    return {
      totalQty: Math.round(totalQty * 1000) / 1000,
      totalVal: Math.round(totalVal * 100) / 100
    };
  }, [formData.items]);

  // Form Submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (formData.items.length === 0) {
      addToast('Please add at least one product using "+ Add Product"', 'error');
      setIsAddProductModalOpen(true);
      return;
    }

    if (!isStockIn) {
      if (!formData.branch_id || !formData.target_branch_id) {
        addToast('Please select both source and destination branches', 'error');
        return;
      }
      if (String(formData.branch_id) === String(formData.target_branch_id)) {
        addToast('Source and destination branches cannot be the same', 'error');
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload = {
        branch_id: formData.branch_id || mainBranch?.id || null,
        target_branch_id: !isStockIn ? formData.target_branch_id : null,
        challan_date: formData.challan_date,
        type: isStockIn ? 'inward' : 'outward',
        purpose: isStockIn ? 'stock_in' : 'stock_transfer',
        party_name: isStockIn ? (formData.party_name || 'Vendor Inward') : null,
        vehicle_no: formData.vehicle_no || null,
        status: formData.status,
        notes: formData.notes || null,
        items: formData.items.map((it) => ({
          item_id: it.item_id,
          item_name: it.item_name,
          quantity: it.quantity,
          rate: it.rate
        }))
      };

      const res = await axios.post('/api/challans', payload);
      const savedChallan = res.data?.challan || res.data;

      addToast(
        isStockIn
          ? `Stock In entry ${savedChallan.challan_no} recorded & inventory added!`
          : `Stock Transfer ${savedChallan.challan_no} executed successfully!`,
        'success'
      );

      setCreatedChallan(savedChallan);
      onStockUpdated();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Error saving stock movement', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForm = () => {
    setCreatedChallan(null);
    setFormData({
      branch_id: mainBranch?.id || '',
      target_branch_id: !isStockIn ? (secondBranch?.id || '') : '',
      challan_date: new Date().toISOString().split('T')[0],
      party_name: isStockIn ? (supplierList[0]?.name || '') : '',
      vehicle_no: '',
      status: 'completed',
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
              isStockIn
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-sky-50 border-sky-200 text-sky-600'
            }`}
          >
            {isStockIn ? (
              <ArrowDownLeft className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <ArrowRightLeft className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {isStockIn ? 'Stock In Entry (Inward Receiving)' : 'Stock Transfer Entry (Inter-Store Movement)'}
              </h1>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                  isStockIn
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                {isStockIn ? 'Inward Inventory Entry' : 'Warehouse Transfer'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStockIn
                ? 'Receive supplier wholesale merchandise, vendor shipments & factory lots directly into store inventory'
                : 'Move stock units securely between main warehouse, retail counters, and branch locations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewReport(isStockIn ? 'stock_in' : 'stock_transfer')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            title="View Historical Register & Print Challans"
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>View {isStockIn ? 'Stock In' : 'Stock Transfer'} Report</span>
          </button>
        </div>
      </div>

      {/* Main Entry Sheet */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Transaction Header Info Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isStockIn ? (
              <>
                {/* Destination Branch (Where stock goes in) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination Branch / Store *
                  </label>
                  <SearchableSelect
                    triggerRef={firstFieldTriggerRef}
                    autoFocus={true}
                    options={branchList.map((b) => ({
                      value: b.id,
                      label: b.name,
                      badge: b.type
                    }))}
                    value={formData.branch_id}
                    onChange={(val) => setFormData({ ...formData, branch_id: val })}
                    placeholder="Select Destination Branch"
                    theme="light"
                  />
                </div>

                {/* Vendor / Supplier */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor / Supplier / Source Name
                  </label>
                  <SearchableSelect
                    triggerRef={partyTriggerRef}
                    options={supplierList.map((s) => ({
                      value: s.name,
                      label: s.name,
                      sublabel: `${s.phone || ''} ${s.city ? '• ' + s.city : ''}`
                    }))}
                    value={formData.party_name}
                    onChange={(val) => setFormData({ ...formData, party_name: val })}
                    placeholder="-- Select Vendor / Supplier --"
                    searchPlaceholder="Search vendor by name, phone..."
                    theme="light"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Source Branch */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Source Branch / Store (Transfer FROM) *
                  </label>
                  <SearchableSelect
                    triggerRef={firstFieldTriggerRef}
                    autoFocus={true}
                    options={branchList.map((b) => ({
                      value: b.id,
                      label: b.name,
                      badge: b.type
                    }))}
                    value={formData.branch_id}
                    onChange={(val) => setFormData({ ...formData, branch_id: val })}
                    placeholder="Select Originating Branch"
                    theme="light"
                  />
                </div>

                {/* Destination Branch */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination Branch / Store (Transfer TO) *
                  </label>
                  <SearchableSelect
                    options={branchList
                      .filter((b) => String(b.id) !== String(formData.branch_id))
                      .map((b) => ({
                        value: b.id,
                        label: b.name,
                        badge: b.type
                      }))}
                    value={formData.target_branch_id}
                    onChange={(val) => setFormData({ ...formData, target_branch_id: val })}
                    placeholder="Select Receiving Branch"
                    theme="light"
                  />
                </div>
              </>
            )}

            {/* Inward / Transfer Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isStockIn ? 'Inward Date *' : 'Transfer Date *'}
              </label>
              <input
                type="date"
                required
                value={formData.challan_date}
                onChange={(e) => setFormData({ ...formData, challan_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Vehicle / Transit No */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Vehicle # / Courier / Transport Waybill
              </label>
              <input
                type="text"
                placeholder="e.g. MH-04-AB-1234, Porter #502"
                value={formData.vehicle_no}
                onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>

            {/* Movement Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Movement Status</label>
              <SearchableSelect
                options={[
                  { value: 'completed', label: 'Completed (Immediate Inventory Update)' },
                  { value: 'in_transit', label: 'In Transit (Dispatched from Source)' },
                  { value: 'pending', label: 'Pending Verification' }
                ]}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
                placeholder="Select Status"
                theme="light"
              />
            </div>

            {/* Inward Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {isStockIn ? 'Supplier Invoice / Delivery Gate Pass #' : 'Slip Narration'}
              </label>
              <input
                type="text"
                placeholder={isStockIn ? 'e.g. SUPP-INV-8821' : 'Stock replenishment, urgent transfer...'}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
              />
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
                Movement Products & Quantities
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[10px] font-mono font-bold">
                {formData.items.length} {formData.items.length === 1 ? 'line' : 'lines'}
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
                No items added to this movement yet.
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
                    <th className="px-4 py-3 w-36">Quantity</th>
                    <th className="px-4 py-3 w-36 text-right">Unit Rate / Cost ({currency})</th>
                    <th className="px-4 py-3 w-36 text-right">Line Valuation ({currency})</th>
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
                          className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-amber-400 outline-none text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={it.rate}
                          onChange={(e) => handleUpdateItemLine(idx, 'rate', e.target.value)}
                          className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-amber-400 outline-none text-right ml-auto"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-slate-900 text-sm">
                        {currency} {Number(it.total).toFixed(2)}
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
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 block">Total Quantity:</span>
              <span className="font-mono font-black text-slate-900 text-base">{calculations.totalQty} units</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Valuation:</span>
              <span className="font-mono font-black text-amber-900 text-base">
                {currency} {calculations.totalVal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-black text-xs shadow-xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isStockIn
                  ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500 ring-1 ring-emerald-400/50'
                  : 'bg-sky-600 hover:bg-sky-500 focus:ring-sky-500 ring-1 ring-sky-400/50'
              } disabled:opacity-50`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Recording Movement...'
                  : isStockIn
                  ? 'Record Stock In (Enter)'
                  : 'Execute Transfer (Enter)'}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* ------------------------------------------------------------- */}
      {/* POS-STYLE ADD PRODUCT POPUP MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Add Product to {isStockIn ? 'Stock Inward' : 'Stock Transfer'}
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
                      const pPurchase = Number(p.purchase_price ?? 0);
                      const pPrice = Number(p.price ?? 0);
                      const displayPrice = pPurchase > 0 ? pPurchase : (pPrice > 0 ? pPrice : 0);
                      const currentStock = Number(p.stock_quantity ?? p.stock ?? p.quantity ?? 0);
                      const itemCode = p.short_name || p.barcode || p.sku || p.code || '';

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
                              className={`text-[10px] flex items-center gap-1.5 ${
                                isHighlighted ? 'text-slate-900/80' : 'text-slate-500'
                              }`}
                            >
                              {itemCode && (
                                <span className="font-mono font-bold">
                                  {itemCode}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold">
                              {currency} {displayPrice.toFixed(2)}
                            </div>
                            <div
                              className={`text-[10px] font-mono ${
                                isHighlighted ? 'text-slate-900/90' : 'text-emerald-700 font-semibold'
                              }`}
                            >
                              Stock: {currentStock} {p.unit || 'pcs'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Product Pill */}
              {popupSelectedProduct && (() => {
                const selPurchase = Number(popupSelectedProduct.purchase_price ?? 0);
                const selPrice = Number(popupSelectedProduct.price ?? 0);
                const selDisplayPrice = selPurchase > 0 ? selPurchase : (selPrice > 0 ? selPrice : 0);
                const selStock = Number(popupSelectedProduct.stock_quantity ?? popupSelectedProduct.stock ?? popupSelectedProduct.quantity ?? 0);
                const selCode = popupSelectedProduct.short_name || popupSelectedProduct.barcode || popupSelectedProduct.sku || popupSelectedProduct.code || '';

                return (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 block">{popupSelectedProduct.name}</span>
                        {selCode && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                            {selCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-600 font-mono mt-0.5 block">
                        Item Price / Rate: <strong className="text-slate-900 font-bold">{currency} {selDisplayPrice.toFixed(2)}</strong> &bull; Current Available Stock: <strong className={selStock > 0 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>{selStock} {popupSelectedProduct.unit || 'pcs'}</strong>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                      Selected
                    </span>
                  </div>
                );
              })()}

              {/* Qty & Rate Fields */}
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
                        popupRateInputRef.current?.focus();
                        popupRateInputRef.current?.select();
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-amber-400 outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Rate / Price ({currency}) *</label>
                  <input
                    ref={popupRateInputRef}
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={popupRate}
                    onChange={(e) => setPopupRate(e.target.value)}
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:bg-white focus:border-amber-400 outline-none text-right"
                  />
                </div>
              </div>

              {/* Live Calculated Stock Value */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                    Calculated Inward Stock Value
                  </span>
                  <div className="text-[11px] text-slate-600 font-mono">
                    {parseFloat(popupQty) || 0} {popupSelectedProduct?.unit || 'units'} &times; {currency} {(parseFloat(popupRate) || 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-amber-950">
                    {currency} {Math.max(0, Math.round((parseFloat(popupQty) || 0) * (parseFloat(popupRate) || 0) * 100) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Tip: Press <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd> on rate to add line & continue
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
                    + Add to Movement (Enter)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINTABLE SUCCESS CHALLAN MODAL */}
      {/* ------------------------------------------------------------- */}
      {createdChallan && (() => {
        const storeName = tenant?.name || activeBranch?.name || '';
        const storeAddress = tenant?.address || activeBranch?.address || '';
        const storePhone = tenant?.phone || activeBranch?.phone || '';
        const storeGst = tenant?.gst_number || tenant?.tax_number || tenant?.gstin || '';
        const storeEmail = tenant?.email || activeBranch?.email || '';

        const challanItems = (createdChallan.items && createdChallan.items.length > 0)
          ? createdChallan.items
          : (formData.items || []);
        const challanTotalQty = challanItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        const challanValuation = Number(createdChallan.total_value || challanItems.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.rate || 0)), 0));

        const sourceBranchName = branchList.find((b) => b.id === createdChallan.branch_id)?.name || 'Main Godown';
        const targetBranchName = branchList.find((b) => b.id === createdChallan.target_branch_id)?.name || 'Destination Branch';

        const handlePrint = () => {
          printElement('printable-stock-challan-slip', {
            title: `${isStockIn ? 'Inward Receipt' : 'Transfer Challan'} - ${createdChallan.challan_no}`
          });
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in overflow-y-auto"
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleResetForm();
              if (e.key === 'Enter' && !e.shiftKey) handlePrint();
            }}
            tabIndex={0}
          >
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto">
              {/* Modal Top Control Bar */}
              <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between border-b border-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Official Movement Challan</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{createdChallan.challan_no}</span>
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
                    onClick={handleResetForm}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
                    title="Close & New (Esc)"
                  >
                    <X className="w-4 h-4" />
                    <span>Done <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd></span>
                  </button>
                </div>
              </div>

              {/* Printable Challan Box (Matches Sale Invoice Format) */}
              <div
                id="printable-stock-challan-slip"
                className="p-6 sm:p-8 text-black bg-white max-w-full font-sans print:p-0 print:m-0"
              >
                {/* Header Title Centered above the box */}
                <div className="text-center font-bold text-sm tracking-widest uppercase pb-1 text-black">
                  {isStockIn ? 'STOCK INWARD RECEIPT (CONSIGNMENT)' : 'STOCK TRANSFER CHALLAN (INTER-BRANCH)'}
                </div>

                {/* Main Master Table with Black Border */}
                <table
                  className="w-full border-collapse border-2 border-black"
                  style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
                >
                  <tbody>
                    {/* Row 1: Header (Store Info Left & Challan Meta Right) */}
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

                      {/* Right Challan Meta */}
                      <td
                        style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderBottom: '2px solid black' }}
                        className="w-1/2 p-3 sm:p-4 align-top border-b-2 border-black text-xs space-y-1 print-header-cell"
                      >
                        <div className="flex items-center">
                          <span className="w-28 text-red-600 font-bold shrink-0">Challan No:-</span>
                          <span className="font-bold text-red-600 font-mono text-sm">{createdChallan.challan_no}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 font-bold text-black shrink-0">Challan Date:-</span>
                          <span className="font-medium text-black font-mono">{formatDateDMY(createdChallan.challan_date || createdChallan.created_at)}</span>
                        </div>
                        {isStockIn ? (
                          <div className="flex items-start">
                            <span className="w-28 font-bold text-black shrink-0">Publisher / Vendor:</span>
                            <span className="font-bold uppercase text-black">{createdChallan.party_name || 'Vendor Inward'}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start">
                              <span className="w-28 font-bold text-black shrink-0">Origin Godown:</span>
                              <span className="font-bold uppercase text-black">{sourceBranchName}</span>
                            </div>
                            <div className="flex items-start">
                              <span className="w-28 font-bold text-black shrink-0">Target Godown:</span>
                              <span className="font-bold uppercase text-black">{targetBranchName}</span>
                            </div>
                          </>
                        )}
                        {createdChallan.vehicle_no && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-slate-600 shrink-0">Transit / Vehicle:</span>
                            <span className="font-mono text-slate-900 font-semibold">{createdChallan.vehicle_no}</span>
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
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 text-left">Book Title / Item</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right', width: '96px' }} className="border border-black py-0 px-3 text-right w-24">Rate</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center', width: '80px' }} className="border border-black py-0 px-3 text-center w-20">Qty</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right', width: '128px' }} className="border border-black py-0 px-3 text-right w-32">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-black">
                            {challanItems.map((item, idx) => {
                              const rate = Number(item.rate || 0);
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

                            {challanItems.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }} className="border border-black py-2 text-center text-slate-400 text-xs">
                                  No items recorded on this challan.
                                </td>
                              </tr>
                            )}

                            {/* Total Row */}
                            <tr className="font-bold text-xs bg-white">
                              <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-bold uppercase tracking-wider">Total</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px' }} className="border border-black py-0 px-3"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-mono font-bold">{challanTotalQty}</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono font-bold">
                                {challanValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                {numberToWordsIndian(challanValuation)}
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
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Gross Valuation</td>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                                {challanValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Discount</td>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">0.00</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0px 12px', fontWeight: '900', color: '#dc2626' }} className="px-3 py-0 font-black text-red-600">Final Valuation</td>
                              <td style={{ padding: '0px 12px', fontWeight: '900', textAlign: 'right', color: '#dc2626', fontSize: '14px' }} className="px-3 py-0 font-black font-mono text-right text-red-600 text-sm">
                                {challanValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

