import React from 'react';
import { Printer, X, FileText } from 'lucide-react';

export default function InvoiceReceiptModal({ sale, tenant, onClose }) {
  if (!sale) return null;

  const currency = tenant?.currency || '₹';
  const customer = sale.customer;
  const items = Array.isArray(sale.items) ? sale.items : (sale.items?.data || []);

  const handlePrint = () => {
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

      const storeName = tenant?.name || sale.branch?.name || 'Wholesale Store';

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${storeName} - ${sale.invoice_no}</title>
            ${styleTags}
            <style>
              @page {
                size: A4 portrait;
                margin: 5mm 6mm;
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
                overflow: visible !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              #printable-receipt {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
              }
              .no-print {
                display: none !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              th {
                font-size: 9px !important;
                padding: 3px 4px !important;
                line-height: 1.2 !important;
                border-top: 1px solid #000000 !important;
                border-bottom: 1px solid #000000 !important;
                background-color: #f1f5f9 !important;
              }
              td {
                font-size: 9px !important;
                padding: 2px 4px !important;
                line-height: 1.2 !important;
                border-bottom: 1px solid #e2e8f0 !important;
              }
              tfoot td {
                font-size: 9.5px !important;
                padding: 3px 4px !important;
                font-weight: bold !important;
                border-top: 2px solid #000000 !important;
                border-bottom: 2px solid #000000 !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
            </style>
          </head>
          <body class="bg-white text-slate-900 font-sans antialiased">
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
  };

  const invoiceDate = sale.created_at ? new Date(sale.created_at) : new Date();

  // Financial summary
  const subtotalAmount = Number(sale.subtotal || 0);
  const discountAmount = Number(sale.discount_amount || 0);
  const totalAmount = Number(sale.total_amount || 0);
  const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);

  const storeName = tenant?.name || sale.branch?.name || 'Wholesale Store';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print-modal-overlay">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-4 animate-in fade-in zoom-in-95 print-modal-container">

        {/* Top Control Bar (Modal Header - Hidden in Print) */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between no-print text-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                  Bill #{sale.invoice_no}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  • {storeName}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Compact A4 Invoice Print</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print A4 Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Container */}
        <div
          id="printable-receipt"
          className="p-4 sm:p-6 text-black bg-white max-w-full font-sans print:p-0 print:m-0"
        >
          {/* Header: Store Name & Bill Meta (Single Line to Save Space) */}
          <div className="flex items-baseline justify-between border-b-2 border-black pb-1 mb-1.5 print:pb-0.5 print:mb-1">
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-black">
                {storeName}
              </h1>
            </div>
            <div className="text-[10px] font-mono font-medium text-black flex items-center gap-3">
              <span><strong>Bill #:</strong> {sale.invoice_no}</span>
              <span><strong>Date:</strong> {invoiceDate.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Line Items Table (Optimized for Maximum Product Rows on A4) */}
          <div className="w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200 text-black font-bold uppercase text-[9px] tracking-wider border-y border-black">
                  <th className="py-1 px-1.5 w-8 text-center border-r border-slate-300 print:border-black">#</th>
                  <th className="py-1 px-1.5 border-r border-slate-300 print:border-black">Product / Item Description</th>
                  <th className="py-1 px-1.5 w-14 text-center border-r border-slate-300 print:border-black">Qty</th>
                  <th className="py-1 px-1.5 w-16 text-right border-r border-slate-300 print:border-black">Rate</th>
                  <th className="py-1 px-1.5 w-16 text-right border-r border-slate-300 print:border-black">Discount</th>
                  <th className="py-1 px-1.5 w-20 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300 text-[9px] text-black">
                {items.map((item, idx) => {
                  const lineGross = Number(item.unit_price) * Number(item.quantity);
                  const discAmt = Number(item.discount_amount || 0);
                  const lineTotal = Number(item.total_price || (lineGross - discAmt));
                  const discPct = Number(item.discount_percent || 0);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 leading-tight">
                      <td className="py-0.5 px-1.5 text-center text-slate-500 font-mono border-r border-slate-200 print:border-slate-300">
                        {idx + 1}
                      </td>
                      <td className="py-0.5 px-1.5 font-medium border-r border-slate-200 print:border-slate-300">
                        <span>{item.item_name}</span>
                        {item.short_name && (
                          <span className="text-[8px] text-slate-500 font-mono ml-1">
                            [{item.short_name}]
                          </span>
                        )}
                      </td>
                      <td className="py-0.5 px-1.5 text-center font-mono font-bold border-r border-slate-200 print:border-slate-300">
                        {item.quantity}
                      </td>
                      <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-200 print:border-slate-300">
                        {currency}{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-0.5 px-1.5 text-right font-mono border-r border-slate-200 print:border-slate-300">
                        {discAmt > 0 ? (
                          <span>-{currency}{discAmt.toFixed(2)}{discPct > 0 ? ` (${discPct}%)` : ''}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-0.5 px-1.5 text-right font-mono font-bold">
                        {currency}{lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400 text-xs">
                      No products listed on this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-black font-bold text-[9.5px]">
                <tr className="bg-slate-50 print:bg-transparent">
                  <td colSpan={2} className="py-1 px-1.5 text-left uppercase">
                    Total Items: {items.length}
                  </td>
                  <td className="py-1 px-1.5 text-center font-mono font-bold">
                    {totalQty}
                  </td>
                  <td className="py-1 px-1.5"></td>
                  <td className="py-1 px-1.5 text-right font-mono">
                    {discountAmount > 0 && `-${currency}${discountAmount.toFixed(2)}`}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono font-black text-[10px]">
                    {currency}{totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
