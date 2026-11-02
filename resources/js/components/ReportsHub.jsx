import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  Search,
  Filter,
  Package,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Banknote,
  Building,
  Users,
  Warehouse,
  Plus,
  Trash2,
  X,
  MessageCircle,
  Edit
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import InvoiceReceiptModal from './InvoiceReceiptModal';
import CreditDebitNoteManager from './CreditDebitNoteManager';
import InventoryManager from './InventoryManager';
import { printElement, numberToWordsIndian } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';

export default function ReportsHub({
  initialSubTab = 'sale', // 'sale', 'daybook', 'cashbook', 'bank', 'stock', 'ledger', 'credit_notes', 'debit_notes', 'stock_in', 'stock_transfer'
  branches = [],
  customers = [],
  suppliers = [],
  items = [],
  tenant,
  creditDebitNotes = [],
  challans = [],
  onDataUpdated = () => {},
  onNavigateTab = () => {},
  addToast = () => { },
  onViewInvoice,
  onEditSale
}) {
  const currency = tenant?.currency || '₹';

  const normalizeTab = (tab) => {
    if (tab === 'purchases' || tab === 'purchase') return 'sale';
    if (tab === 'sales') return 'sale';
    if (tab === 'bank_entry') return 'bank';
    if (tab === 'stock_reports') return 'stock';
    return tab || 'sale';
  };

  const branchList = Array.isArray(branches) ? branches : (branches?.branches || branches?.data || []);
  const customerList = Array.isArray(customers) ? customers : (customers?.customers || customers?.data || []);
  const supplierList = Array.isArray(suppliers) ? suppliers : (suppliers?.suppliers || suppliers?.data || []);
  const itemList = Array.isArray(items) ? items : (items?.items || items?.data || []);

  const [activeTab, setActiveTab] = useState(normalizeTab(initialSubTab));

  // Date filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Loading & Data states
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseReportData, setPurchaseReportData] = useState(null);
  const [saleReportData, setSaleReportData] = useState(null);
  const [daybookData, setDaybookData] = useState(null);
  const [cashbookData, setCashbookData] = useState(null);
  const [bankData, setBankData] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handlePrintInvoice = (sale) => {
    if (onViewInvoice) {
      onViewInvoice(sale);
    } else {
      setSelectedInvoice(sale);
    }
  };

  // Ledger party selection
  const [ledgerPartyType, setLedgerPartyType] = useState('customer'); // 'customer' or 'supplier'
  const [ledgerPartyId, setLedgerPartyId] = useState(customerList[0]?.id || '');

  // Dump Modal state
  const [isDumpModalOpen, setIsDumpModalOpen] = useState(false);
  const [dumpFormData, setDumpFormData] = useState({
    branch_id: branchList[0]?.id || '',
    item_id: '',
    type: 'dump', // 'dump', 'damaged', 'expired', 'wastage'
    quantity: 1,
    reason: ''
  });

  // Sync tab change
  useEffect(() => {
    setActiveTab(normalizeTab(initialSubTab));
  }, [initialSubTab]);

  // Load report data based on active tab
  const fetchActiveReport = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'purchase') {
        const res = await axios.get(`/api/reports/purchases?start_date=${startDate}&end_date=${endDate}`);
        setPurchaseReportData(res.data);
      } else if (activeTab === 'sale') {
        const res = await axios.get(`/api/reports/sales?start_date=${startDate}&end_date=${endDate}`);
        setSaleReportData(res.data);
      } else if (activeTab === 'daybook') {
        const res = await axios.get(`/api/reports/daybook?date=${selectedDate}`);
        setDaybookData(res.data);
      } else if (activeTab === 'cashbook') {
        const res = await axios.get(`/api/reports/cashbook?start_date=${startDate}&end_date=${endDate}`);
        setCashbookData(res.data);
      } else if (activeTab === 'bank') {
        const res = await axios.get(`/api/reports/bank-entry?start_date=${startDate}&end_date=${endDate}`);
        setBankData(res.data);
      } else if (activeTab === 'stock') {
        const res = await axios.get('/api/reports/stock');
        setStockData(res.data);
      } else if (activeTab === 'ledger') {
        if (ledgerPartyId) {
          const res = await axios.get(`/api/reports/ledger?party_type=${ledgerPartyType}&party_id=${ledgerPartyId}`);
          setLedgerData(res.data);
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load report data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveReport();
  }, [activeTab, startDate, endDate, selectedDate, ledgerPartyType, ledgerPartyId]);

  const handleCreateDump = async (e) => {
    e.preventDefault();
    if (!dumpFormData.item_id) {
      addToast('Please select the item to dump / write off', 'error');
      return;
    }
    try {
      await axios.post('/api/stock-adjustments', dumpFormData);
      addToast('Stock dump / wastage logged. Inventory adjusted.', 'success');
      setIsDumpModalOpen(false);
      fetchActiveReport();
    } catch (err) {
      addToast(err.response?.data?.message || 'Error logging dump', 'error');
    }
  };

  const handleSendWhatsAppReminder = () => {
    const selectedParty = ledgerData?.party || (ledgerPartyType === 'customer'
      ? customerList.find((c) => String(c.id) === String(ledgerPartyId))
      : supplierList.find((s) => String(s.id) === String(ledgerPartyId)));

    if (!selectedParty) {
      addToast('Please select a customer first', 'error');
      return;
    }

    const rawPhone = selectedParty.mobile_no || selectedParty.phone;
    if (!rawPhone) {
      addToast('No mobile number available for this customer.', 'error');
      return;
    }

    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const dueAmount = Number(ledgerData?.closing_balance !== undefined ? ledgerData.closing_balance : (selectedParty.current_balance || 0));
    const storeName = tenant?.name || 'KRISHNA BOOK AGENCY';
    const partyName = selectedParty.name || 'Customer';

    const message = `Dear ${partyName},\n\nThis is a gentle payment reminder from *${storeName}*.\nYour current outstanding balance due is *₹${dueAmount > 0 ? dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}*.\n\nKindly arrange the payment at your earliest convenience.\n\nThank you!\n*${storeName}*`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    addToast(`WhatsApp payment reminder opened for ${partyName}!`, 'success');
  };

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Financial & Inventory Reports
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit sales, daybook journal, cash drawer, bank entries, stock valuation, and ledgers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto no-print">
          {activeTab === 'ledger' && ledgerPartyType === 'customer' && (
            <button
              type="button"
              onClick={handleSendWhatsAppReminder}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs cursor-pointer transition-all no-print"
              title="Send WhatsApp payment reminder for outstanding balance"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>WhatsApp Due Reminder</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const selectedParty = ledgerData?.party || customerList.find((c) => String(c.id) === String(ledgerPartyId));
              const partyTitle = selectedParty?.name ? `STATEMENT - ${selectedParty.name.toUpperCase()}` : `${activeTab.replace('_', ' ').toUpperCase()} STATEMENT`;
              printElement('reports-printable-panel', {
                title: activeTab === 'ledger' ? partyTitle : `${activeTab.replace('_', ' ').toUpperCase()} STATEMENT`
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4 text-slate-950" />
            <span>Print Current Statement</span>
          </button>
        </div>
      </div>

      {/* Reports Nav Pills */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto gap-1">
        {[
          { id: 'sale', label: 'Sale Reports' },
          { id: 'daybook', label: 'Daybook' },
          { id: 'cashbook', label: 'Cashbook' },
          { id: 'bank', label: 'Bank Entry' },
          { id: 'stock', label: 'Stock Valuation' },
          { id: 'credit_notes', label: 'Credit Notes Register' },
          { id: 'debit_notes', label: 'Debit Notes Register' },
          { id: 'stock_in', label: 'Stock In Register' },
          { id: 'stock_transfer', label: 'Stock Transfer Register' },
          { id: 'ledger', label: 'Party Ledger' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.id
              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Filter Bar */}
      {['purchase', 'sale', 'cashbook', 'bank'].includes(activeTab) && (
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-slate-600">Date Range Filter:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>
        </div>
      )}

      {activeTab === 'daybook' && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-bold text-slate-600">Audit Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:bg-white focus:border-amber-400 outline-none"
          />
        </div>
      )}

      {/* PRINTABLE REPORTS CONTENT CONTAINER */}
      <div id="reports-printable-panel" className="space-y-4">
        {/* Printable Statement Header (visible in print iframe for standard registers) */}
        {activeTab !== 'ledger' && (
          <div className="hidden print:block border-2 border-black p-4 mb-3">
            <div className="text-center">
              <h1 className="text-2xl font-black uppercase text-[#1e3a8a]">{tenant?.name || 'KRISHNA BOOK AGENCY'}</h1>
              <div className="text-xs text-slate-800 font-medium">
                {tenant?.address || 'Prakash Nagar, Narkatiyaganj (Bihar) - 845455'} • Mobile: {tenant?.phone || '9939175603'}
              </div>
              <div className="text-xs font-mono font-bold mt-0.5">GST No. {tenant?.tax_number || tenant?.gst_number || '10AYSPP3209J1ZC'}</div>
              <div className="text-sm font-black uppercase tracking-wider mt-2 border-t border-black pt-1">
                {activeTab.replace('_', ' ').toUpperCase()} AUDIT STATEMENT
              </div>
            </div>
          </div>
        )}

        {/* 1. PURCHASE REPORTS */}
        {activeTab === 'purchase' && (
        <div className="space-y-4">
          {purchaseReportData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Purchases Count</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">
                  {purchaseReportData.summary.count} bills
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Procurement</span>
                <div className="text-xl font-black text-amber-600 font-mono mt-1">
                  {currency} {Number(purchaseReportData.summary.total_amount).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Procurement Tax</span>
                <div className="text-xl font-black text-sky-600 font-mono mt-1">
                  {currency} {Number(purchaseReportData.summary.tax_total).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Unpaid / Payable</span>
                <div className="text-xl font-black text-red-600 font-mono mt-1">
                  {currency} {Number(purchaseReportData.summary.unpaid_amount).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Purchase #</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3 text-right">Taxable</th>
                  <th className="px-5 py-3 text-right">Tax</th>
                  <th className="px-5 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {(purchaseReportData?.purchases || []).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-bold text-amber-700">{p.purchase_no}</td>
                    <td className="px-5 py-3 text-slate-500">{p.purchase_date}</td>
                    <td className="px-5 py-3 uppercase text-[10px]">{p.purchase_type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 font-sans font-medium text-slate-900">{p.supplier_name}</td>
                    <td className="px-5 py-3 text-right">{currency} {Number(p.subtotal).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sky-600">{currency} {Number(p.tax_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-black text-amber-700">{currency} {Number(p.total_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SALE REPORTS */}
      {activeTab === 'sale' && (
        <div className="space-y-4">
          {saleReportData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Invoices Count</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">
                  {saleReportData.summary.count} bills
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Gross Sales</span>
                <div className="text-xl font-black text-emerald-600 font-mono mt-1">
                  {currency} {Number(saleReportData.summary.total_amount).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Net Settled Amount</span>
                <div className="text-xl font-black text-sky-600 font-mono mt-1">
                  {currency} {Number(saleReportData.summary.tax_amount || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Discounts Given</span>
                <div className="text-xl font-black text-amber-600 font-mono mt-1">
                  {currency} {Number(saleReportData.summary.discount_amount).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Payment Mode</th>
                  <th className="px-5 py-3 text-right">Taxable</th>
                  <th className="px-5 py-3 text-right">Tax</th>
                  <th className="px-5 py-3 text-right">Invoice Total</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {(saleReportData?.sales || []).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-bold text-amber-700">
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(s)}
                        className="text-amber-700 hover:text-amber-900 hover:underline font-bold text-left cursor-pointer inline-flex items-center gap-1.5"
                        title="Click to view & print invoice"
                      >
                        {s.invoice_no}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDateDMY(s.created_at)}</td>
                    <td className="px-5 py-3 font-sans font-medium text-slate-900">{s.customer?.name || 'Walk-in'}</td>
                    <td className="px-5 py-3 uppercase text-[10px]">{s.payment_method}</td>
                    <td className="px-5 py-3 text-right">{currency} {Number(s.subtotal).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sky-600">{currency} {Number(s.tax_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-black text-emerald-600">{currency} {Number(s.total_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        {onEditSale && (
                          <button
                            type="button"
                            onClick={() => onEditSale(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Edit Sale Bill"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title="Print Wholesale Bill / Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(saleReportData?.sales || []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No sale records found for the selected period / filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. DAYBOOK */}
      {activeTab === 'daybook' && (
        <div className="space-y-4">
          {daybookData && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
                <span className="text-[11px] font-semibold uppercase text-emerald-700">Daily Cash & Sales In</span>
                <div className="text-xl font-black font-mono mt-1 text-emerald-700">
                  +{currency} {Number(daybookData.total_in).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 shadow-xs">
                <span className="text-[11px] font-semibold uppercase text-red-700">Daily Cash & Purchases Out</span>
                <div className="text-xl font-black font-mono mt-1 text-red-700">
                  -{currency} {Number(daybookData.total_out).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-amber-700 shadow-xs">
                <span className="text-[11px] font-semibold uppercase text-slate-500">Net Daily Cashflow</span>
                <div className="text-xl font-black font-mono mt-1 text-amber-600">
                  {currency} {Number(daybookData.net_flow).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Transaction Type</th>
                  <th className="px-5 py-3">Ref #</th>
                  <th className="px-5 py-3">Particulars</th>
                  <th className="px-5 py-3">Mode</th>
                  <th className="px-5 py-3 text-right">Inflow ({currency})</th>
                  <th className="px-5 py-3 text-right">Outflow ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(daybookData?.entries || []).map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-500">{e.time}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{e.type}</td>
                    <td className="px-5 py-3 font-mono text-amber-700">{e.ref_no}</td>
                    <td className="px-5 py-3 text-slate-600">{e.particulars}</td>
                    <td className="px-5 py-3 font-mono text-[10px] uppercase text-slate-500">{e.mode}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">
                      {e.money_in > 0 ? `+${e.money_in.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-red-600">
                      {e.money_out > 0 ? `-${e.money_out.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CASHBOOK */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          {cashbookData && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-amber-800 uppercase font-bold">Closing Cash In Drawer</span>
                <div className="text-2xl font-black font-mono text-amber-700 mt-0.5">
                  {currency} {Number(cashbookData.net_cash_balance).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-6 text-xs font-mono">
                <div>Total Cash Receipts: <span className="text-emerald-700 font-bold">+{currency} {Number(cashbookData.total_cash_in).toLocaleString()}</span></div>
                <div>Total Cash Payments: <span className="text-red-700 font-bold">-{currency} {Number(cashbookData.total_cash_out).toLocaleString()}</span></div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Entry Type</th>
                  <th className="px-5 py-3">Ref #</th>
                  <th className="px-5 py-3">Particulars</th>
                  <th className="px-5 py-3 text-right">Cash IN (+)</th>
                  <th className="px-5 py-3 text-right">Cash OUT (-)</th>
                  <th className="px-5 py-3 text-right">Drawer Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {(cashbookData?.transactions || []).map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 text-slate-500">{t.date}</td>
                    <td className="px-5 py-3 font-sans font-bold text-slate-900">{t.type}</td>
                    <td className="px-5 py-3 text-amber-700 font-bold">{t.ref}</td>
                    <td className="px-5 py-3 font-sans text-slate-600">{t.particulars}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                      {t.in > 0 ? `+${t.in.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-red-600">
                      {t.out > 0 ? `-${t.out.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-amber-700">
                      {currency} {Number(t.balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. BANK ENTRY */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          {bankData && (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-sky-800 uppercase font-bold">Estimated Bank / Digital Balance</span>
                <div className="text-2xl font-black font-mono text-sky-700 mt-0.5">
                  {currency} {Number(bankData.net_bank_balance).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-6 text-xs font-mono">
                <div>Deposits / Card Sales: <span className="text-emerald-700 font-bold">+{currency} {Number(bankData.total_deposits).toLocaleString()}</span></div>
                <div>Withdrawals / Transfers: <span className="text-red-700 font-bold">-{currency} {Number(bankData.total_withdrawals).toLocaleString()}</span></div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Mode</th>
                  <th className="px-5 py-3">Ref / Transaction #</th>
                  <th className="px-5 py-3">Particulars</th>
                  <th className="px-5 py-3 text-right">Bank Deposit (+)</th>
                  <th className="px-5 py-3 text-right">Bank Withdrawal (-)</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {(bankData?.entries || []).map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 text-slate-500">{e.date}</td>
                    <td className="px-5 py-3 uppercase text-[10px] font-bold text-sky-700">{e.mode}</td>
                    <td className="px-5 py-3 text-amber-700 font-bold">{e.ref}</td>
                    <td className="px-5 py-3 font-sans text-slate-600">{e.particulars}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                      {e.deposit > 0 ? `+${e.deposit.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-red-600">
                      {e.withdrawal > 0 ? `-${e.withdrawal.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-sky-700">
                      {currency} {Number(e.balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. STOCK REPORTS (WITH VALUATION & DUMP) */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-semibold">
              Live inventory valuation across all stores and warehouses
            </div>
            <button
              onClick={() => setIsDumpModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Record Stock Dump / Wastage / Damage</span>
            </button>
          </div>

          {stockData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Stock Quantity</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">
                  {stockData.summary.total_stock_units} Units
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Valuation at Cost</span>
                <div className="text-xl font-black text-slate-700 font-mono mt-1">
                  {currency} {Number(stockData.summary.total_valuation_purchase).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Valuation at MRP</span>
                <div className="text-xl font-black text-amber-600 font-mono mt-1">
                  {currency} {Number(stockData.summary.total_valuation_sale).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Low Stock Alerts</span>
                <div className="text-xl font-black text-red-600 font-mono mt-1">
                  {stockData.summary.low_stock_count} Items
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">Item Code</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-center">Available Stock</th>
                  <th className="px-5 py-3 text-right">Cost Value</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="px-5 py-3 text-center">Branch Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(stockData?.items || []).map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-900">{it.name}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-amber-700 font-bold">{it.short_name || '-'}</td>
                    <td className="px-5 py-3 text-slate-500">{it.category}</td>
                    <td className="px-5 py-3 text-center font-mono font-bold">
                      <span className={it.is_low_stock ? 'text-red-600 font-black' : 'text-emerald-700 font-black'}>
                        {it.current_stock} {it.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500">
                      {currency} {Number(it.purchase_valuation).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-amber-700">
                      {currency} {Number(it.sale_valuation).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {(it.branch_distribution || []).map((bd, i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {bd.branch_name?.split(' ')[0]}: {bd.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. PARTY LEDGER */}
      {activeTab === 'ledger' && (() => {
        const ledgerTransactions = ledgerData?.transactions || [];
        const ledgerOpeningBal = Number(ledgerData?.opening_balance || 0);
        const ledgerClosingBal = Number(ledgerData?.closing_balance || 0);
        const ledgerTotalDebit = ledgerTransactions.reduce((acc, t) => acc + Number(t.debit || 0), 0);
        const ledgerTotalCredit = ledgerTransactions.reduce((acc, t) => acc + Number(t.credit || 0), 0);

        const selectedParty = ledgerData?.party || (ledgerPartyType === 'customer'
          ? customerList.find((c) => String(c.id) === String(ledgerPartyId))
          : supplierList.find((s) => String(s.id) === String(ledgerPartyId)));

        const partyName = selectedParty?.name || selectedParty?.company_name || (ledgerPartyType === 'customer' ? 'Customer Account' : 'Supplier Account');
        const partyPhone = selectedParty?.mobile_no || selectedParty?.phone || '—';
        const partyAddress = selectedParty?.address || '—';
        const partyEmail = selectedParty?.email || '';
        const partyGst = selectedParty?.gst_in || selectedParty?.gst_number || selectedParty?.tax_number || '';
        const storeName = tenant?.name || '';
        const storeAddress = tenant?.address || '';
        const storePhone = tenant?.phone || '';
        const storeGst = tenant?.tax_number || tenant?.gst_number || tenant?.gstin || '';
        const storeEmail = tenant?.email || '';

        return (
          <div className="space-y-4">
            {/* Filter Toolbar (no-print: hidden on paper/print iframe) */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs no-print">
              <div className="w-64">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ledger Type</label>
                <SearchableSelect
                  options={[
                    { value: 'customer', label: 'Customer Ledger (Receivable)' },
                    { value: 'supplier', label: 'Supplier Ledger (Payable)' }
                  ]}
                  value={ledgerPartyType}
                  onChange={(val) => {
                    setLedgerPartyType(val);
                    setLedgerPartyId(val === 'customer' ? customers[0]?.id : suppliers[0]?.id);
                  }}
                  placeholder="Select Ledger Type"
                  theme="light"
                />
              </div>

              <div className="w-72">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Select {ledgerPartyType === 'customer' ? 'Customer' : 'Supplier'}
                </label>
                <SearchableSelect
                  options={ledgerPartyType === 'customer'
                    ? customerList.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.mobile_no ? `Mob: ${c.mobile_no}` : '',
                      badge: c.current_balance !== undefined ? `Bal: ₹${c.current_balance}` : ''
                    }))
                    : supplierList.map((s) => ({
                      value: s.id,
                      label: s.name,
                      sublabel: s.company_name || s.phone || '',
                      badge: s.current_balance !== undefined ? `Payable: ₹${s.current_balance}` : ''
                    }))
                  }
                  value={ledgerPartyId}
                  onChange={(val) => setLedgerPartyId(val)}
                  placeholder={`Search & select ${ledgerPartyType}...`}
                  searchPlaceholder={`Search ${ledgerPartyType}...`}
                  size="sm"
                  theme="light"
                />
              </div>

              {ledgerData && (
                <div className="ml-auto flex items-center gap-4 font-mono text-xs">
                  <div className="text-slate-600">Opening Balance: <span className="font-bold text-slate-900">{currency} {ledgerOpeningBal.toFixed(2)}</span></div>
                  <div className="text-amber-700 font-black text-sm">
                    Closing Balance: {currency} {ledgerClosingBal.toFixed(2)}
                  </div>
                  {ledgerPartyType === 'customer' && (
                    <button
                      type="button"
                      onClick={handleSendWhatsAppReminder}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-black shadow-xs cursor-pointer transition-all no-print"
                      title="Send WhatsApp payment reminder to customer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-white" />
                      <span>WhatsApp Due</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sale-Invoice-Style Party Statement / Ledger Layout */}
            <div className="bg-white p-1 sm:p-2 border border-slate-200 sm:border-0 rounded-none shadow-none">
              {/* Document Header Title */}
              <div className="text-center font-bold text-xs uppercase tracking-wider pb-1.5 text-black">
                PARTY STATEMENT / LEDGER
              </div>

              {/* Master Box with 2px solid black border & sharp rectangular shape */}
              <table
                className="w-full border-collapse border-2 border-black"
                style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
              >
                <tbody>
                  {/* Row 1: Header (Store Details Left & Party Details Right) */}
                  <tr>
                    {/* Left Column: Store Details */}
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

                    {/* Right Column: Party Info & Statement Details */}
                    <td
                      style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderBottom: '2px solid black' }}
                      className="w-1/2 p-3 sm:p-4 align-top border-b-2 border-black text-xs space-y-1 print-header-cell"
                    >
                      <div className="flex items-start">
                        <span className="w-28 font-bold text-black shrink-0">Party Name:</span>
                        <span className="font-bold uppercase text-black text-sm">{partyName}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-28 font-bold text-black shrink-0">Address:-</span>
                        <span className="uppercase text-black">{partyAddress}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-28 font-bold text-black shrink-0">Mobile No:-</span>
                        <span className="font-mono text-black">{partyPhone}</span>
                      </div>
                      {partyEmail && (
                        <div className="flex items-center">
                          <span className="w-28 font-bold text-black shrink-0">Email:-</span>
                          <span className="font-mono text-black lowercase">{partyEmail}</span>
                        </div>
                      )}
                      {partyGst && (
                        <div className="flex items-center">
                          <span className="w-28 font-bold text-black shrink-0">GST No:-</span>
                          <span className="font-mono text-black">{partyGst}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="w-28 font-bold text-black shrink-0">Account Type:-</span>
                        <span className="font-bold uppercase text-slate-900">
                          {ledgerPartyType === 'customer' ? 'Customer (Receivable)' : 'Supplier (Payable)'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-28 font-bold text-red-600 shrink-0">Statement Date:-</span>
                        <span className="font-bold text-red-600 font-mono">
                          {formatDateDMY(new Date())}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 2: Transactions Table (full width spanning 2 columns) */}
                  <tr>
                    <td colSpan={2} style={{ padding: 0, borderBottom: '2px solid black' }} className="p-0 border-b-2 border-black">
                      <table
                        className="w-full text-left border-collapse invoice-table"
                        style={{ width: '100%', borderCollapse: 'collapse' }}
                      >
                        <thead>
                          <tr className="bg-white text-black font-bold uppercase text-xs">
                            <th style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center', width: '40px' }} className="border border-black py-0 px-2 text-center w-10">SN</th>
                            <th style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center', width: '85px' }} className="border border-black py-0 px-2 text-center w-20">Date</th>
                            <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'left', width: '130px' }} className="border border-black py-0 px-2.5 text-left w-32">Type</th>
                            <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center', width: '100px' }} className="border border-black py-0 px-2.5 text-center w-24">Ref #</th>
                            <th style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 text-left">Particulars</th>
                            <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right', width: '95px' }} className="border border-black py-0 px-2.5 text-right w-24">Debit ({currency})</th>
                            <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right', width: '95px' }} className="border border-black py-0 px-2.5 text-right w-24">Credit ({currency})</th>
                            <th style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right', width: '115px' }} className="border border-black py-0 px-2.5 text-right w-28">Balance ({currency})</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs text-black">
                          {/* Opening Balance Row */}
                          <tr className="leading-snug bg-slate-50/50">
                            <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">—</td>
                            <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">—</td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'left' }} className="border border-black py-0 px-2.5 font-bold uppercase" colSpan={3}>
                              Opening Balance
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono">
                              {ledgerOpeningBal > 0 ? ledgerOpeningBal.toFixed(2) : '-'}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono">
                              {ledgerOpeningBal < 0 ? Math.abs(ledgerOpeningBal).toFixed(2) : '-'}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold">
                              {ledgerOpeningBal.toFixed(2)}
                            </td>
                          </tr>

                          {/* Transactions Rows */}
                          {ledgerTransactions.map((t, idx) => (
                            <tr key={idx} className="leading-snug">
                              <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">{idx + 1}</td>
                              <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">{formatDateDMY(t.date)}</td>
                              <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'left' }} className="border border-black py-0 px-2.5 font-semibold uppercase">{t.type}</td>
                              <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center' }} className="border border-black py-0 px-2.5 text-center font-mono font-bold text-slate-900">{t.ref}</td>
                              <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3">{t.particulars}</td>
                              <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono">
                                {Number(t.debit) > 0 ? Number(t.debit).toFixed(2) : '-'}
                              </td>
                              <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono">
                                {Number(t.credit) > 0 ? Number(t.credit).toFixed(2) : '-'}
                              </td>
                              <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold text-slate-900">
                                {Number(t.running_balance).toFixed(2)}
                              </td>
                            </tr>
                          ))}

                          {ledgerTransactions.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }} className="border border-black py-2 text-center text-slate-400 text-xs">
                                No ledger transactions recorded for this account.
                              </td>
                            </tr>
                          )}

                          {/* Total Row */}
                          <tr className="font-bold text-xs bg-white">
                            <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                            <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'center' }} className="border border-black py-0 px-2.5 text-center font-bold uppercase tracking-wider">Total</td>
                            <td style={{ border: '1px solid black', padding: '0px 10px' }} className="border border-black py-0 px-2.5"></td>
                            <td style={{ border: '1px solid black', padding: '0px 12px' }} className="border border-black py-0 px-3"></td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold">
                              {ledgerTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold">
                              {ledgerTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 10px', textAlign: 'right' }} className="border border-black py-0 px-2.5 text-right font-mono font-bold">
                              {ledgerClosingBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* Row 3: Bottom Summary Section (Amount in Words Left & Financial Summary Right) */}
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
                              Closing Balance in Words
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', lineHeight: '1.4' }}
                              className="px-3 py-2 font-bold text-xs uppercase leading-relaxed text-black"
                            >
                              {numberToWordsIndian(Math.abs(ledgerClosingBal))} {ledgerClosingBal >= 0 ? '(DEBIT / RECEIVABLE)' : '(CREDIT / ADVANCE)'}
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
                            <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Opening Balance</td>
                            <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                              {ledgerOpeningBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Total Debit (Billed)</td>
                            <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                              {ledgerTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Total Credit (Paid)</td>
                            <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                              {ledgerTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0px 12px', fontWeight: '900', color: '#dc2626' }} className="px-3 py-0 font-black text-red-600">Net Closing Balance</td>
                            <td style={{ padding: '0px 12px', fontWeight: '900', textAlign: 'right', color: '#dc2626', fontSize: '14px' }} className="px-3 py-0 font-black font-mono text-right text-red-600 text-sm">
                              {currency} {ledgerClosingBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Footer below the box */}
              <div className="flex justify-end items-center pt-2 px-1 text-[11px] text-slate-700 font-medium">
                <span className="text-red-600 font-black text-sm tracking-wider">ACCOUNT STATEMENT</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stock Dump / Wastage Modal */}
      {isDumpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Write Off Stock (Dump / Wastage)</span>
              </h3>
              <button onClick={() => setIsDumpModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDump} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
                <SearchableSelect
                  options={itemList.map((it) => ({
                    value: it.id,
                    label: it.name,
                    sublabel: it.short_name ? `Code: ${it.short_name}` : '',
                    badge: `Stock: ${it.stock_quantity ?? 0}`
                  }))}
                  value={dumpFormData.item_id}
                  onChange={(val) => setDumpFormData({ ...dumpFormData, item_id: val })}
                  placeholder="-- Search & Choose Item --"
                  searchPlaceholder="Search product name or code..."
                  required
                  theme="light"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Deduct *</label>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    required
                    value={dumpFormData.quantity}
                    onChange={(e) => setDumpFormData({ ...dumpFormData, quantity: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deduction Reason</label>
                  <SearchableSelect
                    options={[
                      { value: 'dump', label: 'Dump / Discarded' },
                      { value: 'damaged', label: 'Damaged Goods' },
                      { value: 'expired', label: 'Expired Date' },
                      { value: 'wastage', label: 'Transit Wastage' },
                      { value: 'manual_adjustment', label: 'Physical Count Audit' }
                    ]}
                    value={dumpFormData.type}
                    onChange={(val) => setDumpFormData(prev => ({ ...prev, type: val }))}
                    placeholder="Select Reason"
                    theme="light"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Branch</label>
                <SearchableSelect
                  options={branchList.map((b) => ({
                    value: b.id,
                    label: b.name,
                    sublabel: b.address || '',
                    badge: b.type || ''
                  }))}
                  value={dumpFormData.branch_id}
                  onChange={(val) => setDumpFormData({ ...dumpFormData, branch_id: val })}
                  placeholder="Select Branch..."
                  searchPlaceholder="Search branch..."
                  theme="light"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Incident Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water damage during rain, packaging torn in shipment..."
                  value={dumpFormData.reason}
                  onChange={(e) => setDumpFormData({ ...dumpFormData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDumpModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Confirm & Write Off Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. CREDIT NOTES REGISTER REPORT */}
      {activeTab === 'credit_notes' && (
        <CreditDebitNoteManager
          fixedType="credit_note"
          notes={creditDebitNotes}
          customers={customers}
          suppliers={suppliers}
          branches={branches}
          items={items}
          tenant={tenant}
          onNoteUpdated={onDataUpdated}
          onOpenAdd={() => onNavigateTab('credit_note_entry')}
          addToast={addToast}
        />
      )}

      {/* 9. DEBIT NOTES REGISTER REPORT */}
      {activeTab === 'debit_notes' && (
        <CreditDebitNoteManager
          fixedType="debit_note"
          notes={creditDebitNotes}
          customers={customers}
          suppliers={suppliers}
          branches={branches}
          items={items}
          tenant={tenant}
          onNoteUpdated={onDataUpdated}
          onOpenAdd={() => onNavigateTab('debit_note_entry')}
          addToast={addToast}
        />
      )}

      {/* 10. STOCK IN REGISTER REPORT */}
      {activeTab === 'stock_in' && (
        <InventoryManager
          fixedType="stock_in"
          challans={challans}
          branches={branches}
          suppliers={suppliers}
          items={items}
          tenant={tenant}
          onChallanUpdated={onDataUpdated}
          onOpenAdd={() => onNavigateTab('stock_in_entry')}
          addToast={addToast}
        />
      )}

      {/* 11. STOCK TRANSFER REGISTER REPORT */}
      {activeTab === 'stock_transfer' && (
        <InventoryManager
          fixedType="stock_transfer"
          challans={challans}
          branches={branches}
          suppliers={suppliers}
          items={items}
          tenant={tenant}
          onChallanUpdated={onDataUpdated}
          onOpenAdd={() => onNavigateTab('stock_transfer_entry')}
          addToast={addToast}
        />
      )}
      </div>

      {/* Printable Invoice Modal Fallback */}
      <InvoiceReceiptModal
        sale={selectedInvoice}
        tenant={tenant}
        customers={customers}
        onClose={() => setSelectedInvoice(null)}
        onEditSale={onEditSale}
      />
    </div>
  );
}
