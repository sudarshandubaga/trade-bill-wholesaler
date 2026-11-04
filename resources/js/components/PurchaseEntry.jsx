import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  Printer,
  X,
  CreditCard,
  FileText,
  AlertCircle,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import { printElement, numberToWordsIndian } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';
import PaginationControls from './PaginationControls';
import { usePagination } from '../utils/usePagination';

export default function PurchaseEntry({
  purchases = [],
  suppliers = [],
  branches = [],
  tenant,
  onPurchaseAdded = () => {},
  addToast = () => {}
}) {
  const currency = tenant?.currency || '₹';
  const supplierSelectRef = useRef(null);

  const supplierList = useMemo(() => {
    return Array.isArray(suppliers) ? suppliers : (suppliers?.data || suppliers?.suppliers || []);
  }, [suppliers]);

  const branchList = useMemo(() => {
    return Array.isArray(branches) ? branches : (branches?.data || branches?.branches || []);
  }, [branches]);

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: supplierList[0]?.id ? String(supplierList[0].id) : '',
    amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_invoice_no: '',
    remarks: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPurchase, setViewingPurchase] = useState(null);

  // Auto-focus supplier trigger on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      supplierSelectRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  // Auto-select first supplier if none selected
  useEffect(() => {
    if (!formData.supplier_id && supplierList.length > 0) {
      setFormData((prev) => ({ ...prev, supplier_id: String(supplierList[0].id) }));
    }
  }, [supplierList, formData.supplier_id]);

  // Synchronize recent purchases with purchases prop whenever prop updates
  useEffect(() => {
    if (purchases) {
      const list = Array.isArray(purchases)
        ? purchases
        : (Array.isArray(purchases?.data) ? purchases.data : (Array.isArray(purchases?.purchases) ? purchases.purchases : []));
      if (list.length > 0) {
        setRecentPurchases((prev) => {
          const map = new Map();
          [...prev, ...list].forEach((item) => {
            if (item && item.id && !map.has(item.id)) {
              map.set(item.id, item);
            }
          });
          return Array.from(map.values());
        });
      }
    }
  }, [purchases]);

  // Fetch recent purchases
  const fetchRecentPurchases = async () => {
    setIsLoadingRecent(true);
    try {
      const res = await axios.get('/api/purchases?per_page=100');
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.purchases || []));
      setRecentPurchases((prev) => {
        const map = new Map();
        [...list, ...prev].forEach((item) => {
          if (item && item.id && !map.has(item.id)) {
            map.set(item.id, item);
          }
        });
        return Array.from(map.values());
      });
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentPurchases();
  }, []);

  const selectedSupplierObj = useMemo(() => {
    return supplierList.find((s) => String(s.id) === String(formData.supplier_id));
  }, [supplierList, formData.supplier_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      addToast('Please select a supplier', 'error');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid purchase amount greater than zero', 'error');
      return;
    }
    if (!formData.purchase_date) {
      addToast('Please select a purchase date', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        supplier_id: formData.supplier_id,
        amount: amt,
        total_amount: amt,
        purchase_date: formData.purchase_date,
        purchase_invoice_no: formData.purchase_invoice_no.trim() || null,
        supplier_bill_no: formData.purchase_invoice_no.trim() || null,
        remarks: formData.remarks.trim() || null,
        notes: formData.remarks.trim() || null,
        payment_status: 'Unpaid',
        payment_method: 'Credit',
        purchase_type: 'intra_state',
      };

      const res = await axios.post('/api/purchases', payload);
      const savedPurchase = res.data?.purchase || res.data;

      addToast(
        `Purchase Entry ${savedPurchase?.purchase_no || ''} saved successfully! Supplier ledger updated.`,
        'success'
      );

      // Reset form
      setFormData({
        supplier_id: supplierList[0]?.id ? String(supplierList[0].id) : '',
        amount: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_invoice_no: '',
        remarks: ''
      });

      // Immediately prepend saved purchase so it appears right away
      if (savedPurchase && savedPurchase.id) {
        setRecentPurchases((prev) => [savedPurchase, ...prev.filter((p) => p.id !== savedPurchase.id)]);
      }

      fetchRecentPurchases();
      onPurchaseAdded();
      setViewingPurchase(savedPurchase);

      // Re-focus supplier select for speedy consecutive entries
      setTimeout(() => {
        supplierSelectRef.current?.focus();
      }, 150);
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Error recording purchase entry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Derive consolidated list from recent purchases and purchases prop
  const purchaseList = useMemo(() => {
    const fromRecent = Array.isArray(recentPurchases) ? recentPurchases : [];
    const fromProp = Array.isArray(purchases)
      ? purchases
      : (Array.isArray(purchases?.data) ? purchases.data : (Array.isArray(purchases?.purchases) ? purchases.purchases : []));

    if (fromRecent.length === 0 && fromProp.length === 0) return [];
    if (fromRecent.length === 0) return fromProp;
    if (fromProp.length === 0) return fromRecent;

    const map = new Map();
    [...fromRecent, ...fromProp].forEach((p) => {
      if (p && p.id && !map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }, [purchases, recentPurchases]);

  // Filtered recent purchases
  const filteredPurchases = useMemo(() => {
    if (!searchTerm.trim()) return purchaseList;
    const q = searchTerm.toLowerCase().trim();
    return purchaseList.filter((p) => {
      const pNo = String(p.purchase_no || '').toLowerCase();
      const sBill = String(p.supplier_bill_no || p.purchase_invoice_no || '').toLowerCase();
      const sName = String(p.supplier_name || p.supplier?.name || '').toLowerCase();
      const notes = String(p.notes || p.remarks || '').toLowerCase();
      return pNo.includes(q) || sBill.includes(q) || sName.includes(q) || notes.includes(q);
    });
  }, [purchaseList, searchTerm]);

  // Pagination
  const pagination = usePagination(filteredPurchases, 15, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shadow-inner">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Purchase Entry</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Inventory Module
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Record supplier purchases, inward invoice amount, and auto-post to supplier payable ledger
            </p>
          </div>
        </div>
      </div>

      {/* Main Entry Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">New Purchase Voucher</h2>
              <p className="text-[11px] text-slate-500">Fill in supplier invoice details to record entry</p>
            </div>
          </div>
          {selectedSupplierObj && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-500">Current Payable:</span>
              <span className="font-bold text-amber-700">
                {currency} {Number(selectedSupplierObj.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Select Supplier */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Select Supplier <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                triggerRef={supplierSelectRef}
                autoFocus={true}
                options={supplierList.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  sublabel: s.company_name ? `${s.company_name} • ${s.phone || ''}` : (s.phone ? `Mob: ${s.phone}` : ''),
                  badge: s.current_balance !== undefined ? `Bal: ₹${s.current_balance}` : ''
                }))}
                value={formData.supplier_id}
                onChange={(val) => setFormData({ ...formData, supplier_id: val })}
                placeholder="-- Search & Select Supplier --"
                searchPlaceholder="Search supplier name or phone..."
                theme="light"
                required
              />
            </div>

            {/* 2. Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Amount ({currency}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono font-bold focus:bg-white focus:border-amber-400 outline-none transition-colors"
                />
              </div>
            </div>

            {/* 3. Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 4. Purchase Invoice Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Purchase Invoice Number
              </label>
              <input
                type="text"
                placeholder="e.g. INV-98421 or BILL-2024-001"
                value={formData.purchase_invoice_no}
                onChange={(e) => setFormData({ ...formData, purchase_invoice_no: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:border-amber-400 outline-none transition-colors"
              />
            </div>

            {/* 5. Remarks (textbox) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Remarks (Textbox)
              </label>
              <textarea
                rows={2}
                placeholder="Notes, book lot details, consignment reference, payment terms..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  supplier_id: supplierList[0]?.id ? String(supplierList[0].id) : '',
                  amount: '',
                  purchase_date: new Date().toISOString().split('T')[0],
                  purchase_invoice_no: '',
                  remarks: ''
                });
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving Entry...' : 'Save Purchase Entry'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Purchases List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Recorded Purchase Invoices</h3>
            <p className="text-xs text-slate-500">History of inward supplier invoices recorded in inventory</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Purchase No</th>
                <th className="px-4 py-3">Invoice / Bill #</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3 text-right">Amount ({currency})</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pagination.paginatedItems.map((p, idx) => {
                const sName = p.supplier_name || p.supplier?.name || supplierList.find((s) => String(s.id) === String(p.supplier_id))?.name || 'Supplier';
                const billNo = p.supplier_bill_no || p.purchase_invoice_no || '-';
                const remarks = p.notes || p.remarks || '-';
                const amount = Number(p.total_amount ?? p.amount ?? 0);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">
                      {pagination.startIndex + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {formatDateDMY(p.purchase_date || p.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700">
                      {p.purchase_no}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {billNo}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 uppercase">
                      {sName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                      {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={remarks}>
                      {remarks}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setViewingPurchase(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                        title="View & Print Slip"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pagination.paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    {isLoadingRecent ? 'Loading purchase records...' : 'No purchase records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <PaginationControls
          pagination={pagination}
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>

      {/* Printable Purchase Slip Modal */}
      {viewingPurchase && (() => {
        const storeName = tenant?.name || '';
        const storeAddress = tenant?.address || '';
        const storePhone = tenant?.phone || '';
        const storeGst = tenant?.gst_number || tenant?.tax_number || tenant?.gstin || '';
        const storeEmail = tenant?.email || '';

        const party = supplierList.find((s) => String(s.id) === String(viewingPurchase.supplier_id)) || viewingPurchase.supplier;
        const partyPhone = party?.phone || party?.mobile_no || '';
        const partyAddress = party?.address || '';
        const partyGst = party?.gstin || party?.gst_in || party?.tax_number || '';

        const purchaseAmount = Number(viewingPurchase.total_amount || 0);

        const handlePrint = () => {
          printElement('printable-purchase-entry-slip', {
            title: `Purchase Slip - ${viewingPurchase.purchase_no}`
          });
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto">
              <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between border-b border-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Official Purchase Voucher</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{viewingPurchase.purchase_no}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingPurchase(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <X className="w-4 h-4" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Printable Content */}
              <div id="printable-purchase-entry-slip" className="p-6 sm:p-8 text-black bg-white max-w-full font-sans print:p-0 print:m-0">
                <div className="text-center font-bold text-sm tracking-widest uppercase pb-1 text-black">
                  PURCHASE INWARD VOUCHER
                </div>

                <table
                  className="w-full border-collapse border-2 border-black"
                  style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
                >
                  <tbody>
                    <tr>
                      {/* Left: Store Details */}
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

                      {/* Right: Supplier Details */}
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
                          <span className="font-medium text-black font-mono">{formatDateDMY(viewingPurchase.purchase_date || viewingPurchase.created_at)}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-28 font-bold text-black shrink-0">Supplier Name:</span>
                          <span className="font-bold uppercase text-black">{viewingPurchase.supplier_name || party?.name || 'Supplier'}</span>
                        </div>
                        {viewingPurchase.supplier_bill_no && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-black shrink-0">Invoice / Bill #:</span>
                            <span className="font-mono font-bold text-black">{viewingPurchase.supplier_bill_no}</span>
                          </div>
                        )}
                        {partyAddress && (
                          <div className="flex items-start">
                            <span className="w-28 font-bold text-black shrink-0">Address:-</span>
                            <span className="uppercase text-black" dangerouslySetInnerHTML={{ __html: partyAddress }} />
                          </div>
                        )}
                        {partyPhone && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-black shrink-0">Mobile No:-</span>
                            <span className="font-mono text-black">{partyPhone}</span>
                          </div>
                        )}
                        {partyGst && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-black shrink-0">GST No:-</span>
                            <span className="font-mono text-black">{partyGst}</span>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Particulars & Amount Table */}
                    <tr>
                      <td colSpan={2} style={{ padding: 0, borderBottom: '2px solid black' }} className="p-0 border-b-2 border-black">
                        <table className="w-full text-left border-collapse" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr className="bg-white text-black font-bold uppercase text-xs">
                              <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'center', width: '48px' }}>SN</th>
                              <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'left' }}>Description / Remarks</th>
                              <th style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'right', width: '160px' }}>Amount ({currency})</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-black">
                            <tr>
                              <td style={{ border: '1px solid black', padding: '8px 12px', textAlign: 'center' }} className="font-mono">1</td>
                              <td style={{ border: '1px solid black', padding: '8px 12px' }}>
                                <div className="font-bold uppercase">
                                  Wholesale Inward Purchase Bill #{viewingPurchase.supplier_bill_no || viewingPurchase.purchase_no}
                                </div>
                                {viewingPurchase.notes && (
                                  <div className="text-slate-600 text-[11px] mt-0.5">
                                    {viewingPurchase.notes}
                                  </div>
                                )}
                              </td>
                              <td style={{ border: '1px solid black', padding: '8px 12px', textAlign: 'right' }} className="font-mono font-bold text-sm">
                                {purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>

                            {/* Total Row */}
                            <tr className="font-bold text-xs bg-white">
                              <td style={{ border: '1px solid black', padding: '6px 12px' }}></td>
                              <td style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'center' }} className="uppercase tracking-wider">
                                Total Inward Purchase Amount
                              </td>
                              <td style={{ border: '1px solid black', padding: '6px 12px', textAlign: 'right' }} className="font-mono font-black text-sm">
                                {purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Bottom Summary */}
                    <tr>
                      <td style={{ width: '60%', verticalAlign: 'top', padding: '12px 14px', borderRight: '2px solid black' }} className="text-xs">
                        <div className="text-[11px] text-slate-600 font-bold mb-1">Amount in Words:</div>
                        <div className="font-bold uppercase text-slate-900 leading-snug">
                          {numberToWordsIndian(purchaseAmount)} ONLY
                        </div>
                      </td>
                      <td style={{ width: '40%', verticalAlign: 'bottom', padding: '24px 14px 12px', textAlign: 'right' }} className="text-xs font-bold">
                        <div className="border-t border-black pt-1 inline-block min-w-40 text-center">
                          Authorized Signatory
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

