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
  X
} from 'lucide-react';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import InvoiceReceiptModal from './InvoiceReceiptModal';

export default function ReportsHub({
  initialSubTab = 'sale', // 'sale', 'daybook', 'cashbook', 'bank', 'stock', 'ledger'
  branches = [],
  customers = [],
  suppliers = [],
  items = [],
  tenant,
  addToast = () => { },
  onViewInvoice
}) {
  const currency = tenant?.currency || '₹';

  const normalizeTab = (tab) => {
    if (tab === 'purchases' || tab === 'purchase') return 'sale';
    if (tab === 'sales') return 'sale';
    if (tab === 'bank_entry') return 'bank';
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

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-all self-start md:self-auto"
        >
          <Printer className="w-4 h-4 text-amber-600" />
          <span>Print Current Statement</span>
        </button>
      </div>

      {/* Reports Nav Pills */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto gap-1">
        {[
          { id: 'sale', label: 'Sale Reports' },
          { id: 'daybook', label: 'Daybook' },
          { id: 'cashbook', label: 'Cashbook' },
          { id: 'bank', label: 'Bank Entry' },
          { id: 'stock', label: 'Stock Reports' },
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
                    <td className="px-5 py-3 text-slate-500">{s.created_at?.split('T')[0]}</td>
                    <td className="px-5 py-3 font-sans font-medium text-slate-900">{s.customer?.name || 'Walk-in'}</td>
                    <td className="px-5 py-3 uppercase text-[10px]">{s.payment_method}</td>
                    <td className="px-5 py-3 text-right">{currency} {Number(s.subtotal).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-sky-600">{currency} {Number(s.tax_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-black text-emerald-600">{currency} {Number(s.total_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="Print Wholesale Bill / Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
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
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ledger Type</label>
              <select
                value={ledgerPartyType}
                onChange={(e) => {
                  setLedgerPartyType(e.target.value);
                  setLedgerPartyId(e.target.value === 'customer' ? customers[0]?.id : suppliers[0]?.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:bg-white focus:border-amber-400 outline-none"
              >
                <option value="customer">Customer Ledger (Receivable)</option>
                <option value="supplier">Supplier Ledger (Payable)</option>
              </select>
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
              <div className="ml-auto flex items-center gap-6 font-mono text-xs">
                <div className="text-slate-600">Opening Balance: <span className="font-bold text-slate-900">{currency} {ledgerData.opening_balance}</span></div>
                <div className="text-amber-700 font-black text-sm">
                  Closing Balance: {currency} {ledgerData.closing_balance}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Voucher / Bill Type</th>
                  <th className="px-5 py-3">Reference #</th>
                  <th className="px-5 py-3">Transaction Particulars</th>
                  <th className="px-5 py-3 text-right">Debit ({currency})</th>
                  <th className="px-5 py-3 text-right">Credit ({currency})</th>
                  <th className="px-5 py-3 text-right">Running Balance ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {(ledgerData?.transactions || []).map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 text-slate-500">{t.date}</td>
                    <td className="px-5 py-3 font-sans font-bold text-slate-900">{t.type}</td>
                    <td className="px-5 py-3 text-amber-700 font-bold">{t.ref}</td>
                    <td className="px-5 py-3 font-sans text-slate-600">{t.particulars}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      {t.debit > 0 ? Number(t.debit).toLocaleString() : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      {t.credit > 0 ? Number(t.credit).toLocaleString() : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-amber-700">
                      {currency} {Number(t.running_balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <select
                    value={dumpFormData.type}
                    onChange={(e) => setDumpFormData({ ...dumpFormData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-amber-400 outline-none"
                  >
                    <option value="dump">Dump / Discarded</option>
                    <option value="damaged">Damaged Goods</option>
                    <option value="expired">Expired Date</option>
                    <option value="wastage">Transit Wastage</option>
                    <option value="manual_adjustment">Physical Count Audit</option>
                  </select>
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
                <textarea
                  rows={2}
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

      {/* Printable Invoice Modal Fallback */}
      <InvoiceReceiptModal
        sale={selectedInvoice}
        tenant={tenant}
        customers={customers}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
