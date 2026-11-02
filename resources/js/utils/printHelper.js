/**
 * Universal High-Fidelity Printing Utility for TradeBill ERP
 * 
 * Creates an isolated, clean A4 print iframe, injects exact styles,
 * and triggers window.print() on the isolated frame without page clutter.
 */

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

export function printElement(elementOrId, options = {}) {
  const {
    title = 'Document Print',
    pageMargin = '8mm 10mm',
    customCss = '',
    onAfterPrint = null,
  } = options;

  const printContent = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!printContent) {
    window.print();
    if (onAfterPrint) onAfterPrint();
    return;
  }

  try {
    let printFrame = document.getElementById('tradebill-universal-print-iframe');
    if (printFrame) {
      printFrame.remove();
    }

    printFrame = document.createElement('iframe');
    printFrame.id = 'tradebill-universal-print-iframe';
    printFrame.style.position = 'fixed';
    printFrame.style.left = '-9999px';
    printFrame.style.top = '0';
    printFrame.style.width = '800px';
    printFrame.style.height = '1120px';
    printFrame.style.border = '0';
    printFrame.style.opacity = '1';
    printFrame.style.pointerEvents = 'none';
    document.body.appendChild(printFrame);

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: ${pageMargin};
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
            .no-print {
              display: none !important;
            }
            .print-grid-2 {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
            }
            .print-grid-split {
              display: grid !important;
              grid-template-columns: 7fr 5fr !important;
            }
            .print-border-box, .invoice-outer-box {
              border: 2px solid #000000 !important;
            }
            table.print-table, table.invoice-table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            table.print-table th, table.print-table td,
            table.invoice-table th, table.invoice-table td {
              border: 1px solid #000000 !important;
            }
            table td, table th {
              padding-top: 0 !important;
              padding-bottom: 0 !important;
            }
            .print-header-cell {
              padding-top: 8px !important;
              padding-bottom: 8px !important;
            }
            tr {
              page-break-inside: avoid !important;
            }
            ${customCss}
          </style>
        </head>
        <body class="bg-white text-black font-sans antialiased p-0 m-0">
          <div id="print-root">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      let afterPrintTriggered = false;
      const triggerAfterPrint = () => {
        if (afterPrintTriggered) return;
        afterPrintTriggered = true;
        if (typeof onAfterPrint === 'function') {
          setTimeout(onAfterPrint, 250);
        }
      };

      try {
        if (typeof onAfterPrint === 'function') {
          try {
            printFrame.contentWindow.onafterprint = triggerAfterPrint;
            printFrame.contentWindow.addEventListener('afterprint', triggerAfterPrint);
          } catch (_) {}
          window.addEventListener('afterprint', triggerAfterPrint, { once: true });
          window.addEventListener('focus', () => {
            setTimeout(triggerAfterPrint, 400);
          }, { once: true });
        }

        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print():', err);
        if (typeof onAfterPrint === 'function') {
          window.addEventListener('afterprint', triggerAfterPrint, { once: true });
        }
        window.print();
      }
    }, 300);
  } catch (e) {
    console.warn('Print initialization error, falling back to window.print():', e);
    window.print();
    if (onAfterPrint) onAfterPrint();
  }
}
