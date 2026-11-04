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
    if (num === null || num === undefined || isNaN(num)) return "";
    num = Math.round(Number(num) * 100) / 100;
    if (num === 0) return "ZERO RUPEES ONLY";

    const a = [
        "",
        "ONE",
        "TWO",
        "THREE",
        "FOUR",
        "FIVE",
        "SIX",
        "SEVEN",
        "EIGHT",
        "NINE",
        "TEN",
        "ELEVEN",
        "TWELVE",
        "THIRTEEN",
        "FOURTEEN",
        "FIFTEEN",
        "SIXTEEN",
        "SEVENTEEN",
        "EIGHTEEN",
        "NINETEEN",
    ];
    const b = [
        "",
        "",
        "TWENTY",
        "THIRTY",
        "FORTY",
        "FIFTY",
        "SIXTY",
        "SEVENTY",
        "EIGHTY",
        "NINETY",
    ];

    const convertTwoDigits = (n) => {
        if (n < 20) return a[n];
        const tens = b[Math.floor(n / 10)];
        const ones = a[n % 10];
        return tens + (ones ? "-" + ones : "");
    };

    const convertThreeDigits = (n) => {
        let str = "";
        const hundred = Math.floor(n / 100);
        const rem = n % 100;
        if (hundred > 0) {
            str += a[hundred] + " HUNDRED";
            if (rem > 0) str += " ";
        }
        if (rem > 0) {
            str += convertTwoDigits(rem);
        }
        return str;
    };

    const whole = Math.floor(num);
    const paise = Math.round((num - whole) * 100);

    let result = "";
    const crore = Math.floor(whole / 10000000);
    let rem = whole % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    const hundred = rem % 1000;

    if (crore > 0) {
        result += convertThreeDigits(crore) + " CRORE ";
    }
    if (lakh > 0) {
        result += convertTwoDigits(lakh) + " LAKH ";
    }
    if (thousand > 0) {
        result += convertTwoDigits(thousand) + " THOUSAND ";
    }
    if (hundred > 0) {
        result += convertThreeDigits(hundred) + " ";
    }

    result = result.trim() + " RUPEES";

    if (paise > 0) {
        result += " AND " + convertTwoDigits(paise) + " PAISE";
    }

    result += " ONLY";
    return result;
}

/**
 * Paginates an array of line items across A4 printed sheets with
 * running Carried Forward (C/F) and Brought Forward (B/F) totals.
 *
 * @param {Array} items - List of items (with quantity, rate/unit_price, line total)
 * @param {Object} options - Thresholds for single, first, middle, and last page capacities
 * @returns {Array} List of page objects
 */
export function paginateInvoiceItems(items = [], options = {}) {
    const {
        singlePageMax = 40,
        firstPageMax = 40,
        middlePageMax = 40,
        lastPageMax = 40,
        qtyKey = "quantity",
        rateKey = "unit_price",
    } = options;

    const list = Array.isArray(items) ? items : [];
    const totalItems = list.length;

    // Single page bill
    if (totalItems <= singlePageMax) {
        let runningQty = 0;
        let runningAmt = 0;
        const pageItems = list.map((it, idx) => {
            const q = Number(it[qtyKey] ?? it.quantity ?? 0);
            const r = Number(
                it[rateKey] ?? it.rate ?? it.purchase_price ?? it.price ?? 0,
            );
            const amt = Number(it.line_total ?? it.total_price ?? q * r);
            runningQty += q;
            runningAmt += amt;
            return {
                ...it,
                originalIndex: idx + 1,
                resolvedQty: q,
                resolvedRate: r,
                resolvedAmount: amt,
            };
        });

        return [
            {
                pageNumber: 1,
                totalPages: 1,
                isFirstPage: true,
                isLastPage: true,
                hasBroughtForward: false,
                hasCarriedForward: false,
                broughtForwardQty: 0,
                broughtForwardAmt: 0,
                pageSubtotalQty: runningQty,
                pageSubtotalAmt: runningAmt,
                carriedForwardQty: runningQty,
                carriedForwardAmt: runningAmt,
                items: pageItems,
            },
        ];
    }

    // Multi-page bill with Carried Forward & Brought Forward
    const pages = [];
    let currentIndex = 0;
    let runningQty = 0;
    let runningAmt = 0;

    while (currentIndex < totalItems) {
        const isFirst = pages.length === 0;
        const rem = totalItems - currentIndex;

        let size;
        if (isFirst) {
            size = firstPageMax;
            if (rem - size === 1) {
                size = firstPageMax - 1;
            }
        } else {
            if (rem <= lastPageMax) {
                size = rem;
            } else {
                const potRem = rem - middlePageMax;
                if (potRem > 0 && potRem < 3) {
                    size = Math.ceil(rem / 2);
                } else {
                    size = middlePageMax;
                }
            }
        }

        const pageSlice = list.slice(currentIndex, currentIndex + size);
        const bfQty = runningQty;
        const bfAmt = runningAmt;

        let pageSubtotalQty = 0;
        let pageSubtotalAmt = 0;

        const pageItems = pageSlice.map((it, i) => {
            const globalIdx = currentIndex + i + 1;
            const q = Number(it[qtyKey] ?? it.quantity ?? 0);
            const r = Number(
                it[rateKey] ?? it.rate ?? it.purchase_price ?? it.price ?? 0,
            );
            const amt = Number(it.line_total ?? it.total_price ?? q * r);
            runningQty += q;
            runningAmt += amt;
            pageSubtotalQty += q;
            pageSubtotalAmt += amt;
            return {
                ...it,
                originalIndex: globalIdx,
                resolvedQty: q,
                resolvedRate: r,
                resolvedAmount: amt,
            };
        });

        currentIndex += pageSlice.length;
        const isLast = currentIndex >= totalItems;

        pages.push({
            pageNumber: pages.length + 1,
            totalPages: 0,
            isFirstPage: isFirst,
            isLastPage: isLast,
            hasBroughtForward: !isFirst,
            hasCarriedForward: !isLast,
            broughtForwardQty: bfQty,
            broughtForwardAmt: bfAmt,
            pageSubtotalQty,
            pageSubtotalAmt,
            carriedForwardQty: runningQty,
            carriedForwardAmt: runningAmt,
            items: pageItems,
        });
    }

    const totalPages = pages.length;
    pages.forEach((p) => {
        p.totalPages = totalPages;
    });

    return pages;
}

export function printElement(elementOrId, options = {}) {
    const {
        title = "Document Print",
        pageMargin = "8mm 10mm",
        customCss = "",
        onAfterPrint = null,
    } = options;

    const printContent =
        typeof elementOrId === "string"
            ? document.getElementById(elementOrId)
            : elementOrId;

    if (!printContent) {
        window.print();
        if (onAfterPrint) onAfterPrint();
        return;
    }

    try {
        let printFrame = document.getElementById(
            "tradebill-universal-print-iframe",
        );
        if (printFrame) {
            printFrame.remove();
        }

        printFrame = document.createElement("iframe");
        printFrame.id = "tradebill-universal-print-iframe";
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "0";
        printFrame.style.margin = "0";
        printFrame.style.padding = "0";
        printFrame.style.overflow = "hidden";
        document.body.appendChild(printFrame);

        // Extract all inlined CSS rules from stylesheets to ensure production Tailwind styles are available synchronously
        let inlinedRules = "";
        try {
            Array.from(document.styleSheets).forEach((sheet) => {
                try {
                    if (sheet.cssRules) {
                        Array.from(sheet.cssRules).forEach((rule) => {
                            inlinedRules += rule.cssText + "\n";
                        });
                    }
                } catch (_) {
                    // Cross-origin stylesheet restriction (Google Fonts, etc.)
                }
            });
        } catch (_) {}

        const styleTags = Array.from(
            document.querySelectorAll('link[rel="stylesheet"], style'),
        )
            .map((tag) => tag.outerHTML)
            .join("\n");

        const frameDoc = printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <base href="${window.location.origin}/">
          <title>${title}</title>
          ${styleTags}
          <style>
            ${inlinedRules}

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
            .text-center {
              text-align: center !important;
            }
            .font-bold {
              font-weight: 700 !important;
            }
            .font-black {
              font-weight: 900 !important;
            }
            .tracking-widest {
              letter-spacing: 0.1em !important;
            }
            .uppercase {
              text-transform: uppercase !important;
            }
            .text-black {
              color: #000000 !important;
            }
            .text-sm {
              font-size: 14px !important;
            }
            .pb-1 {
              padding-bottom: 4px !important;
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
            .invoice-page {
              page-break-after: always !important;
              break-after: page !important;
              display: block !important;
              width: 100% !important;
            }
            .invoice-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
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
                if (typeof onAfterPrint === "function") {
                    setTimeout(onAfterPrint, 250);
                }
            };

            try {
                if (typeof onAfterPrint === "function") {
                    try {
                        printFrame.contentWindow.onafterprint =
                            triggerAfterPrint;
                        printFrame.contentWindow.addEventListener(
                            "afterprint",
                            triggerAfterPrint,
                        );
                    } catch (_) {}
                    window.addEventListener("afterprint", triggerAfterPrint, {
                        once: true,
                    });
                    window.addEventListener(
                        "focus",
                        () => {
                            setTimeout(triggerAfterPrint, 400);
                        },
                        { once: true },
                    );
                }

                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (err) {
                console.warn(
                    "Iframe print failed, falling back to window.print():",
                    err,
                );
                if (typeof onAfterPrint === "function") {
                    window.addEventListener("afterprint", triggerAfterPrint, {
                        once: true,
                    });
                }
                window.print();
            }
        }, 250);
    } catch (e) {
        console.warn(
            "Print initialization error, falling back to window.print():",
            e,
        );
        window.print();
        if (onAfterPrint) onAfterPrint();
    }
}
