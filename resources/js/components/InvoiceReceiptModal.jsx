import React, { useEffect, useRef, useCallback } from 'react';
import { Printer, X, FileText } from 'lucide-react';

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

export default function InvoiceReceiptModal({ sale, tenant, customers = [], onClose }) {
  if (!sale) return null;

  // Resolve customer info
  const resolvedCustomer = (typeof sale.customer === 'object' && sale.customer !== null)
    ? sale.customer
    : (Array.isArray(customers) ? customers.find((c) => c.id === sale.customer_id) : null);

  const customerName = typeof sale.customer === 'string'
    ? sale.customer
    : (resolvedCustomer?.name || sale.customer_name || (sale.customer_id ? `Customer #${sale.customer_id}` : 'KRISHNA BOOK AGENCY'));

  const customerPhone = resolvedCustomer?.mobile_no || resolvedCustomer?.phone || sale.customer_phone || '9939175603';
  const customerAddress = [resolvedCustomer?.address, resolvedCustomer?.city, resolvedCustomer?.state].filter(Boolean).join(', ') || 'NARKATIAGANJ';

  const storeName = tenant?.name || sale.branch?.name || 'KRISHNA BOOK AGENCY';
  const storeAddress = tenant?.address || sale.branch?.address || 'Prakash Nagar, Narkatiyaganj (Bihar) - 845455';
  const storePhone = tenant?.phone || sale.branch?.phone || '9939175603, 9430472515';
  const storeGst = tenant?.gst_number || tenant?.gstin || '10AYSPP3209J1ZC';
  const storeEmail = tenant?.email || 'krishnabookagency@gmail.com';

  const items = Array.isArray(sale.items) ? sale.items : (sale.items?.data || []);
  const isPrintingRef = useRef(false);

  // Date format: 27-Oct-2026
  const formatDate = (dateObj) => {
    const d = dateObj ? new Date(dateObj) : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const invoiceDateStr = formatDate(sale.created_at);

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
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;
    setTimeout(() => {
      isPrintingRef.current = false;
    }, 1200);

    const printContent = document.getElementById('printable-receipt');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      let printFrame = document.getElementById('a4-print-iframe');
      if (printFrame) {
        printFrame.remove();
      }

      printFrame = document.createElement('iframe');
      printFrame.id = 'a4-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((tag) => tag.outerHTML)
        .join('\n');

      const docTitle = `Sale Invoice - ${sale.invoice_no}`;

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${docTitle}</title>
            ${styleTags}
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm 10mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              #printable-receipt {
                width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              .no-print {
                display: none !important;
              }
              .invoice-outer-box {
                border: 1.5px solid #000000 !important;
              }
              table.invoice-table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              table.invoice-table th, table.invoice-table td {
                border: 1px solid #000000 !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
            </style>
          </head>
          <body class="bg-white text-black font-sans antialiased">
            <div id="printable-receipt">
              ${printContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (err) {
          console.warn('Iframe print error, falling back to window.print:', err);
          window.print();
        }
      }, 300);
    } catch (e) {
      console.warn('Print initialization error, falling back to window.print:', e);
      window.print();
    }
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

          {/* Main Outer Box with Black Border */}
          <div className="invoice-outer-box border-2 border-black">

            {/* Top Grid: Store Information (Left) & Customer / Invoice Details (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-black">

              {/* Left Column: Store Details */}
              <div className="p-3.5 sm:p-4 text-center sm:text-left flex flex-col justify-center">
                <h1 className="text-xl sm:text-2xl font-black uppercase text-[#1e3a8a] tracking-tight mb-1 text-center">
                  {storeName}
                </h1>
                <div className="space-y-0.5 text-[11px] sm:text-xs text-slate-800 text-center font-medium">
                  {storeAddress && <div>{storeAddress}</div>}
                  {storePhone && <div>Mobile No: {storePhone}</div>}
                  {storeGst && <div className="font-mono">GST No. {storeGst}</div>}
                  {storeEmail && <div>Email: {storeEmail}</div>}
                </div>
              </div>

              {/* Right Column: Bill Meta & Customer Info */}
              <div className="p-3.5 sm:p-4 text-xs space-y-1">
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
                <div className="flex items-start">
                  <span className="w-24 font-bold text-black shrink-0">Address:-</span>
                  <span className="uppercase text-black">{customerAddress}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 font-bold text-black shrink-0">Mobile No:-</span>
                  <span className="font-mono text-black">{customerPhone}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 font-bold text-slate-600 shrink-0">Remarks:-</span>
                  <span className="text-slate-800">{sale.notes || ''}</span>
                </div>
              </div>

            </div>

            {/* Line Items Table with Complete Borders */}
            <div className="border-t-2 border-black">
              <table className="invoice-table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-black font-bold uppercase text-xs">
                    <th className="border border-black py-1.5 px-2 text-center w-12">SN</th>
                    <th className="border border-black py-1.5 px-3 text-left">Book Name</th>
                    <th className="border border-black py-1.5 px-3 text-right w-24">Rate</th>
                    <th className="border border-black py-1.5 px-3 text-center w-20">Qty</th>
                    <th className="border border-black py-1.5 px-3 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-black">
                  {items.map((item, idx) => {
                    const rate = Number(item.unit_price || 0);
                    const qty = Number(item.quantity || 0);
                    const lineAmount = qty * rate;

                    return (
                      <tr key={idx} className="leading-snug">
                        <td className="border border-black py-1 px-2 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-black py-1 px-3 font-semibold uppercase">
                          {item.item_name}
                        </td>
                        <td className="border border-black py-1 px-3 text-right font-mono">
                          {rate.toFixed(2)}
                        </td>
                        <td className="border border-black py-1 px-3 text-center font-mono">
                          {qty}
                        </td>
                        <td className="border border-black py-1 px-3 text-right font-mono">
                          {lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="border border-black py-4 text-center text-slate-400 text-xs">
                        No products listed on this invoice.
                      </td>
                    </tr>
                  )}

                  {/* Total Row */}
                  <tr className="font-bold text-xs bg-white border-t-2 border-black">
                    <td className="border border-black py-1 px-2"></td>
                    <td className="border border-black py-1 px-3 text-center font-bold uppercase tracking-wider">
                      Total
                    </td>
                    <td className="border border-black py-1 px-3"></td>
                    <td className="border border-black py-1 px-3 text-center font-mono font-bold">
                      {totalQty}
                    </td>
                    <td className="border border-black py-1 px-3 text-right font-mono font-bold">
                      {grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Amount in Words (Left) & Financial Summary Table (Right) */}
            <div className="border-t-2 border-black grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x-2 divide-black">

              {/* Amount in Words (Left Side - 7 cols) */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div className="border-b border-black px-3 py-1 font-bold text-xs uppercase text-black bg-slate-50 print:bg-transparent">
                  Amount in Words
                </div>
                <div className="p-3 font-bold text-xs uppercase leading-relaxed text-black my-auto">
                  {numberToWordsIndian(finalAmount)}
                </div>
              </div>

              {/* Gross Amount, Discount & Final Amount (Right Side - 5 cols) */}
              <div className="md:col-span-5">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="px-3 py-1.5 font-bold text-black">Gross Amount</td>
                      <td className="px-3 py-1.5 font-bold font-mono text-right text-black">
                        {grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="px-3 py-1.5 font-bold text-black">Discount</td>
                      <td className="px-3 py-1.5 font-bold font-mono text-right text-black">
                        {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-black text-red-600">Final Amount</td>
                      <td className="px-3 py-1.5 font-black font-mono text-right text-red-600 text-sm">
                        {finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

          </div>

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
