function h(e){if(e==null||isNaN(e))return"";if(e=Math.round(Number(e)*100)/100,e===0)return"ZERO RUPEES ONLY";const s=["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"],u=["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"],l=a=>{if(a<20)return s[a];const d=u[Math.floor(a/10)],f=s[a%10];return d+(f?"-"+f:"")},m=a=>{let d="";const f=Math.floor(a/100),b=a%100;return f>0&&(d+=s[f]+" HUNDRED",b>0&&(d+=" ")),b>0&&(d+=l(b)),d},n=Math.floor(e),p=Math.round((e-n)*100);let t="";const E=Math.floor(n/1e7);let i=n%1e7;const r=Math.floor(i/1e5);i=i%1e5;const o=Math.floor(i/1e3),c=i%1e3;return E>0&&(t+=m(E)+" CRORE "),r>0&&(t+=l(r)+" LAKH "),o>0&&(t+=l(o)+" THOUSAND "),c>0&&(t+=m(c)+" "),t=t.trim()+" RUPEES",p>0&&(t+=" AND "+l(p)+" PAISE"),t+=" ONLY",t}function g(e,s={}){const{title:u="Document Print",pageMargin:l="8mm 10mm",customCss:m="",onAfterPrint:n=null}=s,p=typeof e=="string"?document.getElementById(e):e;if(!p){window.print(),n&&n();return}try{let t=document.getElementById("tradebill-universal-print-iframe");t&&t.remove(),t=document.createElement("iframe"),t.id="tradebill-universal-print-iframe",t.style.position="fixed",t.style.left="-9999px",t.style.top="0",t.style.width="800px",t.style.height="1120px",t.style.border="0",t.style.opacity="1",t.style.pointerEvents="none",document.body.appendChild(t);const E=Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(r=>r.outerHTML).join(`
`),i=t.contentWindow.document;i.open(),i.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${u}</title>
          ${E}
          <style>
            @page {
              size: A4 portrait;
              margin: ${l};
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
            ${m}
          </style>
        </head>
        <body class="bg-white text-black font-sans antialiased p-0 m-0">
          <div id="print-root">
            ${p.innerHTML}
          </div>
        </body>
      </html>
    `),i.close(),setTimeout(()=>{let r=!1;const o=()=>{r||(r=!0,typeof n=="function"&&setTimeout(n,250))};try{if(typeof n=="function"){try{t.contentWindow.onafterprint=o,t.contentWindow.addEventListener("afterprint",o)}catch{}window.addEventListener("afterprint",o,{once:!0}),window.addEventListener("focus",()=>{setTimeout(o,400)},{once:!0})}t.contentWindow.focus(),t.contentWindow.print()}catch(c){console.warn("Iframe print failed, falling back to window.print():",c),typeof n=="function"&&window.addEventListener("afterprint",o,{once:!0}),window.print()}},300)}catch(t){console.warn("Print initialization error, falling back to window.print():",t),window.print(),n&&n()}}export{h as n,g as p};
