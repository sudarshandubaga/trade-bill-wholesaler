import React, { useEffect, useRef, useCallback } from 'react';
import { Printer, X, FileText, Edit } from 'lucide-react';
import { printElement } from '../utils/printHelper';
import { formatDateDMY } from '../utils/dateHelper';

/**
 * Converts numbers into Indian currency words format
 * e.g., 47194.05 -> "FORTY-SEVEN THOUSAND ONE HUNDRED NINETY-FOUR RUPEES ONLY"
 */
export function numberToWordsIndian(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  num = Math.round(Number(num) * 100) / 100;
  if (num === 0) return 'ZERO RUPEES ONLY';

  const a = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convertTwoDigits = (n) => {
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const ones = a[n % 10];
    return tens + (ones ? '-' + ones : '');
  };

  const convertThreeDigits = (n) => {
    let str = '';
    const hundred = Math.floor(n / 100);
    const rem = n % 100;
    if (hundred > 0) {
      str += a[hundred] + ' HUNDRED';
      if (rem > 0) str += ' ';
    }
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str;
  };

  const whole = Math.floor(num);
  const paise = Math.round((num - whole) * 100);

  let result = '';
  const crore = Math.floor(whole / 10000000);
  let rem = whole % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  const hundred = rem % 1000;

  if (crore > 0) {
    result += convertThreeDigits(crore) + ' CRORE ';
  }
  if (lakh > 0) {
    result += convertTwoDigits(lakh) + ' LAKH ';
  }
  if (thousand > 0) {
    result += convertTwoDigits(thousand) + ' THOUSAND ';
  }
  if (hundred > 0) {
    result += convertThreeDigits(hundred) + ' ';
  }

  result = result.trim() + ' RUPEES';

  if (paise > 0) {
    result += ' AND ' + convertTwoDigits(paise) + ' PAISE';
  }

  result += ' ONLY';
  return result;
}

export default function InvoiceReceiptModal({ sale, tenant, customers = [], onClose, onEditSale }) {
  if (!sale) return null;

  // Resolve customer info
  const resolvedCustomer = (typeof sale.customer === 'object' && sale.customer !== null)
    ? sale.customer
    : (Array.isArray(customers) ? customers.find((c) => c.id === sale.customer_id) : null);

  const customerName = typeof sale.customer === 'string'
    ? sale.customer
    : (resolvedCustomer?.name || sale.customer_name || (sale.customer_id ? `Customer #${sale.customer_id}` : 'Walk-in Customer'));

  const customerPhone = resolvedCustomer?.mobile_no || resolvedCustomer?.phone || sale.customer_phone || '';
  const customerAddress = [resolvedCustomer?.address, resolvedCustomer?.city, resolvedCustomer?.state].filter(Boolean).join(', ') || '';
  const customerEmail = resolvedCustomer?.email || sale.customer_email || '';

  const storeName = tenant?.name || sale.branch?.name || '';
  const storeAddress = tenant?.address || sale.branch?.address || '';
  const storePhone = tenant?.phone || sale.branch?.phone || '';
  const storeGst = tenant?.gst_number || tenant?.gstin || '';
  const storeEmail = tenant?.email || sale.branch?.email || '';

  const items = Array.isArray(sale.items) ? sale.items : (sale.items?.data || []);
  const isPrintingRef = useRef(false);

  // Strict Date format: DD/MM/YYYY (no time)
  const invoiceDateStr = formatDateDMY(sale.created_at || sale.invoice_date || sale.date);

  // Financial calculations matching image
  let calculatedGross = 0;
  let totalQty = 0;

  items.forEach((it) => {
    const q = Number(it.quantity || 0);
    const r = Number(it.unit_price || 0);
    totalQty += q;
    calculatedGross += (q * r);
  });

  const grossAmount = calculatedGross > 0 ? calculatedGross : Number(sale.subtotal || sale.total_amount || 0);
  const finalAmount = Number(sale.total_amount || (grossAmount - Number(sale.discount_amount || 0)));
  const totalDiscount = Math.max(0, Math.round((grossAmount - finalAmount) * 100) / 100);

  const handlePrint = useCallback(() => {
    printElement('printable-receipt', {
      title: `Sale Invoice - ${sale.invoice_no}`,
      pageMargin: '8mm 10mm',
      onAfterPrint: () => {
        const path = window.location.pathname;
        if (path.startsWith('/reports')) {
          window.location.href = '/reports';
        } else if (path.startsWith('/dashboard')) {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/pos';
        }
      }
    });
  }, [sale]);

  // Keyboard shortcut listener: Enter to print, Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-4 animate-in fade-in zoom-in-95">

        {/* Top Control Bar (Modal Header - Hidden in Print) */}
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between no-print text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm tracking-tight">
                  Sale Invoice #{sale.invoice_no}
                </span>
                <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {customerName}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Official Wholesale Invoice Preview</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditSale && (
              <button
                type="button"
                onClick={() => {
                  onEditSale(sale);
                  onClose?.();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer ring-1 ring-blue-400"
                title="Edit Bill in POS terminal"
              >
                <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Edit Bill</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer ring-1 ring-amber-300"
              title="Print Invoice (Enter)"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print Invoice <kbd className="ml-1 px-1.5 py-0.5 rounded bg-slate-950/15 font-mono text-[10px]">Enter</kbd></span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Close <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd></span>
            </button>
          </div>
        </div>

        {/* Printable Container matching image */}
        <div
          id="printable-receipt"
          className="p-6 sm:p-8 text-black bg-white max-w-full font-sans print:p-0 print:m-0"
        >
          {/* Header Title Centered above the box */}
          <div className="text-center font-bold text-sm tracking-widest uppercase pb-1 text-black">
            SALE - INVOICE
          </div>

          {/* Main Master Table with Black Border */}
          <table
            className="w-full border-collapse border-2 border-black"
            style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}
          >
            <tbody>
              {/* Row 1: Header (Store Info Left & Bill Meta Right) */}
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

                {/* Right Column: Bill Meta & Customer Info */}
                <td
                  style={{ width: '50%', verticalAlign: 'top', padding: '12px 14px', borderBottom: '2px solid black' }}
                  className="w-1/2 p-3 sm:p-4 align-top border-b-2 border-black text-xs space-y-1 print-header-cell"
                >
                  <div className="flex items-center">
                    <span className="w-24 text-red-600 font-bold shrink-0">Bill No:-</span>
                    <span className="font-bold text-red-600 font-mono text-sm">{sale.invoice_no}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 font-bold text-black shrink-0">Bill Date:-</span>
                    <span className="font-medium text-black font-mono">{invoiceDateStr}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-24 font-bold text-black shrink-0">Party Name:</span>
                    <span className="font-bold uppercase text-black">{customerName}</span>
                  </div>
                  {customerAddress && (
                    <div className="flex items-start">
                      <span className="w-24 font-bold text-black shrink-0">Address:-</span>
                      <span className="uppercase text-black">{customerAddress}</span>
                    </div>
                  )}
                  {customerPhone && (
                    <div className="flex items-center">
                      <span className="w-24 font-bold text-black shrink-0">Mobile No:-</span>
                      <span className="font-mono text-black">{customerPhone}</span>
                    </div>
                  )}
                  {customerEmail && (
                    <div className="flex items-center">
                      <span className="w-24 font-bold text-black shrink-0">Email:-</span>
                      <span className="font-mono text-black lowercase">{customerEmail}</span>
                    </div>
                  )}
                </td>
              </tr>

              {/* Row 2: Line Items Table (full width spanning 2 columns) */}
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
                      {items.map((item, idx) => {
                        const rate = Number(item.unit_price || 0);
                        const qty = Number(item.quantity || 0);
                        const lineAmount = qty * rate;

                        return (
                          <tr key={idx} className="leading-snug">
                            <td style={{ border: '1px solid black', padding: '0px 8px', textAlign: 'center' }} className="border border-black py-0 px-2 text-center font-mono">
                              {idx + 1}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'left' }} className="border border-black py-0 px-3 font-semibold uppercase">
                              {item.item_name}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono">
                              {rate.toFixed(2)}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-mono">
                              {qty}
                            </td>
                            <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono">
                              {lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}

                      {items.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }} className="border border-black py-2 text-center text-slate-400 text-xs">
                            No products listed on this invoice.
                          </td>
                        </tr>
                      )}

                      {/* Total Row */}
                      <tr className="font-bold text-xs bg-white">
                        <td style={{ border: '1px solid black', padding: '0px 8px' }} className="border border-black py-0 px-2"></td>
                        <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-bold uppercase tracking-wider">
                          Total
                        </td>
                        <td style={{ border: '1px solid black', padding: '0px 12px' }} className="border border-black py-0 px-3"></td>
                        <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'center' }} className="border border-black py-0 px-3 text-center font-mono font-bold">
                          {totalQty}
                        </td>
                        <td style={{ border: '1px solid black', padding: '0px 12px', textAlign: 'right' }} className="border border-black py-0 px-3 text-right font-mono font-bold">
                          {grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Row 3: Bottom Section (Amount in Words Left & Financial Summary Right) */}
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
                          {numberToWordsIndian(finalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>

                {/* Gross Amount, Discount & Final Amount (Right Side - 42%) */}
                <td
                  style={{ width: '42%', verticalAlign: 'top', padding: 0 }}
                  className="w-[42%] align-top p-0"
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }} className="w-full text-xs border-collapse">
                    <tbody>
                      <tr>
                        <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Gross Amount</td>
                        <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                          {grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold' }} className="border-b border-black px-3 py-0 font-bold text-black">Discount</td>
                        <td style={{ borderBottom: '1px solid black', padding: '0px 12px', fontWeight: 'bold', textAlign: 'right' }} className="border-b border-black px-3 py-0 font-bold font-mono text-right text-black">
                          {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '0px 12px', fontWeight: '900', color: '#dc2626' }} className="px-3 py-0 font-black text-red-600">Final Amount</td>
                        <td style={{ padding: '0px 12px', fontWeight: '900', textAlign: 'right', color: '#dc2626', fontSize: '14px' }} className="px-3 py-0 font-black font-mono text-right text-red-600 text-sm">
                          {finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer below the box */}
          <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center pt-2 px-1 text-[11px] text-slate-700 font-medium gap-1">
            <div className="sm:text-right">
              <span className="text-red-600 font-black text-sm tracking-wider">TAX FREE</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
