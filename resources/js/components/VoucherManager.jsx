import React, { useState, useMemo, useEffect } from 'react';
import {
  Banknote,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Building,
  Users,
  CreditCard,
  Printer,
  Eye,
  CheckCircle2,
  X,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import { printElement, numberToWordsIndian } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';
import PaginationControls from './PaginationControls';
import { usePagination } from '../utils/usePagination';

export default function VoucherManager({
  vouchers = [],
  customers = [],
  suppliers = [],
  branches = [],
  tenant,
  fixedType = null, // 'receipt' | 'payment' | null
  onVoucherUpdated = () => { },
  addToast = () => { }
}) {
  const currency = tenant?.currency || '₹';
  const [activeType, setActiveType] = useState(fixedType || 'all'); // 'all', 'payment', 'receipt'
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'receipt', // 'payment' or 'receipt'
    party_type: 'customer', // 'customer', 'supplier', 'expense', 'other'
    party_id: '',
    party_name: '',
    branch_id: '',
    voucher_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode: 'cash', // 'cash', 'bank', 'upi', 'cheque'
    reference_no: '',
    narration: ''
  });

  const voucherList = useMemo(() => {
    if (Array.isArray(vouchers)) return vouchers;
    if (Array.isArray(vouchers?.data)) return vouchers.data;
    return [];
  }, [vouchers]);

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

  const headBranch = useMemo(() => {
    return branchList.find((b) => b.is_head || b.is_primary) || branchList[0] || null;
  }, [branchList]);

  const handleSendWhatsAppReceipt = (voucher) => {
    if (!voucher) return;
    const isReceipt = voucher.type === 'receipt';
    const party = isReceipt
      ? customerList.find((c) => String(c.id) === String(voucher.party_id)) || { name: voucher.party_name, mobile_no: voucher.party_phone }
      : supplierList.find((s) => String(s.id) === String(voucher.party_id)) || { name: voucher.party_name, phone: voucher.party_phone };

    const rawPhone = party?.mobile_no || party?.phone || voucher.party_phone;
    if (!rawPhone) {
      alert('Mobile number not available for this party.');
      return;
    }

    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const storeName = tenant?.name || 'Krishna Book Agency';
    const partyName = party?.name || voucher.party_name || 'Customer';
    const amount = Number(voucher.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const voucherDate = formatDateDMY(voucher.voucher_date || voucher.created_at);

    const message = `Dear ${partyName},\n\nWe have received payment of *₹${amount}* on *${voucherDate}* via *${(voucher.payment_mode || 'Cash').toUpperCase()}* against Receipt Voucher *#${voucher.voucher_no}*.\n${voucher.narration ? `Note: ${voucher.narration}\n` : ''}\nThank you for your business!\n*${storeName}*`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredVouchers = useMemo(() => {
    return voucherList.filter((v) => {
      const matchType = activeType === 'all' || v.type === activeType;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        v.voucher_no?.toLowerCase().includes(term) ||
        v.party_name?.toLowerCase().includes(term) ||
        v.reference_no?.toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }, [voucherList, activeType, searchTerm]);

  // Pagination hook
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedVouchers
  } = usePagination(filteredVouchers, 25, [searchTerm, activeType, fixedType]);

  useEffect(() => {
    if (fixedType) {
      setActiveType(fixedType);
    }
  }, [fixedType]);

  const handleOpenAdd = (type = (fixedType || 'receipt')) => {
    const selectedType = fixedType || type;
    setFormData({
      type: selectedType,
      party_type: selectedType === 'receipt' ? 'customer' : 'supplier',
      party_id: '',
      party_name: '',
      branch_id: headBranch?.id || '',
      voucher_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_mode: 'cash',
      reference_no: '',
      narration: ''
    });
    setIsModalOpen(true);
  };

  const handlePartySelect = (id) => {
    if (!id) {
      setFormData((prev) => ({ ...prev, party_id: '', party_name: '' }));
      return;
    }

    if (formData.type === 'receipt') {
      const c = customerList.find((cust) => String(cust.id) === String(id));
      setFormData((prev) => ({
        ...prev,
        party_id: id,
        party_name: c ? c.name : ''
      }));
    } else {
      const s = supplierList.find((sup) => String(sup.id) === String(id));
      setFormData((prev) => ({
        ...prev,
        party_id: id,
        party_name: s ? s.name : ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      addToast('Please enter a valid voucher amount', 'error');
      return;
    }
    if (!formData.party_name.trim()) {
      addToast(`Please select a ${formData.type === 'receipt' ? 'customer' : 'supplier'}`, 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        party_type: formData.type === 'receipt' ? 'customer' : 'supplier',
        branch_id: headBranch?.id || formData.branch_id || null
      };
      await axios.post('/api/vouchers', payload);
      addToast('Voucher entry saved and ledger updated.', 'success');
      setIsModalOpen(false);
      onVoucherUpdated();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error recording voucher', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner (Light Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${fixedType === 'receipt'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
              : fixedType === 'payment'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-600'
            }`}>
            {fixedType === 'receipt' ? (
              <ArrowDownLeft className="w-6 h-6 stroke-[2.2]" />
            ) : fixedType === 'payment' ? (
              <ArrowUpRight className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <Banknote className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {fixedType === 'receipt'
                ? 'Receipt Vouchers (Money In)'
                : fixedType === 'payment'
                  ? 'Payment Vouchers (Money Out)'
                  : 'Vouchers • Payment & Receipt Desk'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {fixedType === 'receipt'
                ? 'Record customer cash collections, invoice receipts, and inward bank transfers'
                : fixedType === 'payment'
                  ? 'Record supplier payments, vendor settlement disbursements, and operational expenses'
                  : 'Record customer cash collections, supplier purchase settlements, and operational expenses'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {(!fixedType || fixedType === 'receipt') && (
            <button
              onClick={() => handleOpenAdd('receipt')}
              data-add-new-btn="true"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
              title="Shortcut: Alt+N or F2"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ New Receipt Voucher (Money IN)</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-emerald-700/80 text-white rounded border border-emerald-500/40">Alt+N</kbd>
            </button>
          )}
          {(!fixedType || fixedType === 'payment') && (
            <button
              onClick={() => handleOpenAdd('payment')}
              data-add-new-btn={fixedType === 'payment' ? 'true' : undefined}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition-all shadow-sm"
              title="Shortcut: Alt+N or F2"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>+ New Payment Voucher (Money OUT)</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-amber-600/30 text-slate-950 rounded border border-amber-600/40">Alt+N</kbd>
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
              All Vouchers
            </button>
            <button
              onClick={() => setActiveType('receipt')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'receipt'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receipts</span>
            </button>
            <button
              onClick={() => setActiveType('payment')}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeType === 'payment'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Payments</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs font-mono">
              Total {fixedType === 'receipt' ? 'Receipts' : 'Payments'}: <span className="text-amber-700 font-bold">{filteredVouchers.length}</span>
            </span>
          </div>
        )}

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search voucher #, party name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Vouchers Table (Light Card) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Voucher # & Date</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Party / Ledger Account</th>
                <th className="px-5 py-3.5">Payment Mode</th>
                <th className="px-5 py-3.5">Amount ({currency})</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{v.voucher_no}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDateDMY(v.voucher_date || v.created_at)}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {v.type === 'receipt' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Receipt (IN)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Payment (OUT)</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{v.party_name}</div>
                      <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1">
                        <span>{v.type === 'receipt' ? 'Customer' : 'Supplier'}</span>
                        <span>&bull;</span>
                        <span className="font-medium text-slate-600">{v.branch?.name || headBranch?.name || 'Main Branch'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 uppercase font-mono font-bold text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        <span>{v.payment_mode}</span>
                      </span>
                      {v.reference_no && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">Ref: {v.reference_no}</div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className={`font-mono font-black text-sm ${v.type === 'receipt' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {v.type === 'receipt' ? '+' : '-'}{currency} {Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right flex items-center justify-end gap-1.5">
                      {v.type === 'receipt' && (
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppReceipt(v)}
                          title="Send WhatsApp Receipt"
                          className="no-print p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setViewingVoucher(v)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View</span>
                      </button>
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

      {/* Add Voucher Modal (Light Theme) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col text-slate-900">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-600" />
                <span>
                  {fixedType === 'receipt'
                    ? 'Record Customer Receipt Voucher (Money IN)'
                    : fixedType === 'payment'
                      ? 'Record Supplier Payment Voucher (Money OUT)'
                      : `Record New Voucher (${formData.type === 'receipt' ? 'Receipt Money IN' : 'Payment Money OUT'})`}
                </span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Date *</label>
                  <input
                    autoFocus
                    type="date"
                    required
                    value={formData.voucher_date}
                    onChange={(e) => setFormData({ ...formData, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-amber-700 font-mono font-black text-sm focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Dynamic Party Selector: Customer for Receipt, Supplier for Payment */}
              {formData.type === 'receipt' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer *</label>
                  <SearchableSelect
                    options={customerList.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.mobile_no ? `Mob: ${c.mobile_no}` : (c.email || ''),
                      badge: c.current_balance !== undefined ? `Bal: ${currency}${c.current_balance}` : '',
                      raw: c
                    }))}
                    value={formData.party_id}
                    onChange={(val) => handlePartySelect(val)}
                    placeholder="-- Search & Select Customer --"
                    searchPlaceholder="Search customer name or phone..."
                    allowClear
                    theme="light"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
                  <SearchableSelect
                    options={supplierList.map((s) => ({
                      value: s.id,
                      label: s.name,
                      sublabel: s.phone ? `Mob: ${s.phone}` : (s.email || ''),
                      badge: s.current_balance !== undefined ? `Payable: ${currency}${s.current_balance}` : '',
                      raw: s
                    }))}
                    value={formData.party_id}
                    onChange={(val) => handlePartySelect(val)}
                    placeholder="-- Search & Select Supplier --"
                    searchPlaceholder="Search supplier name or phone..."
                    allowClear
                    theme="light"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Narration / Remarks</label>
                <input
                  type="text"
                  placeholder="Additional accounting notes..."
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
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
                  {isSaving ? 'Saving...' : 'Authorize & Save Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Voucher Slip Modal (Light Theme) */}
      {viewingVoucher && (() => {
        const isReceipt = viewingVoucher.type === 'receipt';
        const storeName = tenant?.name || activeBranch?.name || '';
        const storeAddress = tenant?.address || activeBranch?.address || '';
        const storePhone = tenant?.phone || activeBranch?.phone || '';
        const storeGst = tenant?.tax_number || tenant?.gst_number || tenant?.gstin || '';
        const storeEmail = tenant?.email || activeBranch?.email || '';

        const party = isReceipt
          ? customerList.find((c) => String(c.id) === String(viewingVoucher.party_id))
          : supplierList.find((s) => String(s.id) === String(viewingVoucher.party_id));
        const partyPhone = party?.mobile_no || party?.phone || viewingVoucher.party_phone || '';
        const partyAddress = party?.address || '';
        const partyEmail = party?.email || '';

        const voucherAmount = Number(viewingVoucher.amount || 0);

        const handlePrint = () => {
          printElement('printable-voucher-slip', {
            title: `${isReceipt ? 'Receipt Voucher' : 'Payment Voucher'} - ${viewingVoucher.voucher_no}`
          });
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in overflow-y-auto"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setViewingVoucher(null);
              if (e.key === 'Enter' && !e.shiftKey) handlePrint();
            }}
            tabIndex={0}
          >
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto">
              {/* Modal Top Control Bar */}
              <div className="bg-slate-900 px-6 py-3.5 flex items-center justify-between border-b border-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Official Accounting Voucher</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{viewingVoucher.voucher_no}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isReceipt && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReceipt(viewingVoucher)}
                      className="no-print flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                      title="Send Receipt Acknowledgement via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send WhatsApp</span>
                    </button>
                  )}
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
                    onClick={() => setViewingVoucher(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                    <span>Close <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd></span>
                  </button>
                </div>
              </div>

              {/* Printable Voucher Box (Matches Sale Invoice Format) */}
              <div
                id="printable-voucher-slip"
                className="p-6 sm:p-8 text-black bg-white max-w-full font-sans print:p-0 print:m-0"
              >
                {/* Header Title Centered above the box */}
                <div className="text-center font-bold text-sm tracking-widest uppercase pb-1 text-black">
                  {isReceipt ? 'CASH / BANK RECEIPT VOUCHER' : 'PAYMENT VOUCHER'}
                </div>

                {/* Main Master Table with Black Border */}
                <table
                  className="w-full border-collapse border-2 border-black"
                  style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
                >
                  <tbody>
                    {/* Row 1: Header (Store Info Left & Voucher Meta Right) */}
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

                      {/* Right Voucher Meta */}
                      <td
                        style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderBottom: '2px solid black' }}
                        className="w-1/2 p-3 sm:p-4 align-top border-b-2 border-black text-xs space-y-1 print-header-cell"
                      >
                        <div className="flex items-center">
                          <span className="w-28 text-red-600 font-bold shrink-0">Voucher No:-</span>
                          <span className="font-bold text-red-600 font-mono text-sm">{viewingVoucher.voucher_no}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 font-bold text-black shrink-0">Voucher Date:-</span>
                          <span className="font-medium text-black font-mono">{formatDateDMY(viewingVoucher.voucher_date || viewingVoucher.created_at)}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-28 font-bold text-black shrink-0">Party / Account:</span>
                          <span className="font-bold uppercase text-black">{viewingVoucher.party_name}</span>
                        </div>
                        {partyAddress && (
                          <div className="flex items-start">
                            <span className="w-28 font-bold text-black shrink-0">Address:-</span>
                            <span className="uppercase text-black">{partyAddress}</span>
                          </div>
                        )}
                        {partyPhone && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-black shrink-0">Mobile No:-</span>
                            <span className="font-mono text-black">{partyPhone}</span>
                          </div>
                        )}
                        {partyEmail && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-black shrink-0">Email:-</span>
                            <span className="font-mono text-black lowercase">{partyEmail}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="w-28 font-bold text-black shrink-0">Payment Mode:</span>
                          <span className="font-mono font-bold uppercase text-slate-900">{viewingVoucher.payment_mode}</span>
                        </div>
                        {viewingVoucher.reference_no && (
                          <div className="flex items-center">
                            <span className="w-28 font-bold text-black shrink-0">Cheque / Ref:</span>
                            <span className="font-mono text-slate-900">{viewingVoucher.reference_no}</span>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Row 2: Particulars Table with Full Borders */}
                    <tr>
                      <td colSpan={2} style={{ padding: 0, borderBottom: '2px solid black' }} className="p-0 border-b-2 border-black">
                        <table
                          className="w-full text-left border-collapse invoice-table"
                          style={{ width: '100%', borderCollapse: 'collapse' }}
                        >
                          <thead>
                            <tr className="bg-white text-black font-bold uppercase text-xs">
                              <th style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center', width: '48px' }} className="border border-black py-0 px-2 text-center w-12">SN</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 text-left">Particulars / Transaction Description</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center', width: '128px' }} className="border border-black py-0 px-3 text-center w-32">Type</th>
                              <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right', width: '160px' }} className="border border-black py-0 px-3 text-right w-40">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-black">
                            <tr className="leading-snug">
                              <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">1</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 font-semibold uppercase">
                                {isReceipt ? 'Payment Received From' : 'Payment Issued To'}: {viewingVoucher.party_name}
                                {viewingVoucher.narration ? ` (${viewingVoucher.narration})` : ''}
                              </td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-mono uppercase font-bold text-slate-700">
                                {viewingVoucher.payment_mode}
                              </td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono font-bold text-slate-900">
                                {voucherAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>

                            {/* Total Row */}
                            <tr className="font-bold text-xs bg-white">
                              <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-bold uppercase tracking-wider">Total</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px' }} className="border border-black py-0 px-3"></td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono font-bold">
                                {voucherAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                {numberToWordsIndian(voucherAmount)}
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
                                {voucherAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Discount</td>
                              <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">0.00</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0px 12px', fontWeight: '900', color: '#dc2626' }} className="px-3 py-0 font-black text-red-600">Net Settled</td>
                              <td style={{ padding: '0px 12px', fontWeight: '900', textAlign: 'right', color: '#dc2626', fontSize: '14px' }} className="px-3 py-0 font-black font-mono text-right text-red-600 text-sm">
                                {voucherAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
