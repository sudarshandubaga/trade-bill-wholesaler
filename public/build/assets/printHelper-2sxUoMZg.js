function h(e){if(e==null||isNaN(e))return"";if(e=Math.round(Number(e)*100)/100,e===0)return"ZERO RUPEES ONLY";const p=["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"],u=["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"],l=o=>{if(o<20)return p[o];const d=u[Math.floor(o/10)],m=p[o%10];return d+(m?"-"+m:"")},E=o=>{let d="";const m=Math.floor(o/100),b=o%100;return m>0&&(d+=p[m]+" HUNDRED",b>0&&(d+=" ")),b>0&&(d+=l(b)),d},n=Math.floor(e),c=Math.round((e-n)*100);let t="";const f=Math.floor(n/1e7);let a=n%1e7;const s=Math.floor(a/1e5);a=a%1e5;const i=Math.floor(a/1e3),r=a%1e3;return f>0&&(t+=E(f)+" CRORE "),s>0&&(t+=l(s)+" LAKH "),i>0&&(t+=l(i)+" THOUSAND "),r>0&&(t+=E(r)+" "),t=t.trim()+" RUPEES",c>0&&(t+=" AND "+l(c)+" PAISE"),t+=" ONLY",t}function g(e,p={}){const{title:u="Document Print",pageMargin:l="8mm 10mm",customCss:E="",onAfterPrint:n=null}=p,c=typeof e=="string"?document.getElementById(e):e;if(!c){window.print(),n&&n();return}try{let t=document.getElementById("tradebill-universal-print-iframe");t&&t.remove(),t=document.createElement("iframe"),t.id="tradebill-universal-print-iframe",t.style.position="fixed",t.style.right="0",t.style.bottom="0",t.style.width="0",t.style.height="0",t.style.border="0",t.style.margin="0",t.style.padding="0",t.style.overflow="hidden",document.body.appendChild(t);let f="";try{Array.from(document.styleSheets).forEach(i=>{try{i.cssRules&&Array.from(i.cssRules).forEach(r=>{f+=r.cssText+`
`})}catch{}})}catch{}const a=Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(i=>i.outerHTML).join(`
`),s=t.contentWindow.document;s.open(),s.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <base href="${window.location.origin}/">
          <title>${u}</title>
          ${a}
          <style>
            ${f}

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
            tr {
              page-break-inside: avoid !important;
            }
            ${E}
          </style>
        </head>
        <body class="bg-white text-black font-sans antialiased p-0 m-0">
          <div id="print-root">
            ${c.innerHTML}
          </div>
        </body>
      </html>
    `),s.close(),setTimeout(()=>{let i=!1;const r=()=>{i||(i=!0,typeof n=="function"&&setTimeout(n,250))};try{if(typeof n=="function"){try{t.contentWindow.onafterprint=r,t.contentWindow.addEventListener("afterprint",r)}catch{}window.addEventListener("afterprint",r,{once:!0}),window.addEventListener("focus",()=>{setTimeout(r,400)},{once:!0})}t.contentWindow.focus(),t.contentWindow.print()}catch(o){console.warn("Iframe print failed, falling back to window.print():",o),typeof n=="function"&&window.addEventListener("afterprint",r,{once:!0}),window.print()}},250)}catch(t){console.warn("Print initialization error, falling back to window.print():",t),window.print(),n&&n()}}export{h as n,g as p};
