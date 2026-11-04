function k(r){if(r==null||isNaN(r))return"";if(r=Math.round(Number(r)*100)/100,r===0)return"ZERO RUPEES ONLY";const h=["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"],E=["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"],m=i=>{if(i<20)return h[i];const b=E[Math.floor(i/10)],o=h[i%10];return b+(o?"-"+o:"")},y=i=>{let b="";const o=Math.floor(i/100),l=i%100;return o>0&&(b+=h[o]+" HUNDRED",l>0&&(b+=" ")),l>0&&(b+=m(l)),b},a=Math.floor(r),u=Math.round((r-a)*100);let t="";const f=Math.floor(a/1e7);let c=a%1e7;const s=Math.floor(c/1e5);c=c%1e5;const e=Math.floor(c/1e3),n=c%1e3;return f>0&&(t+=y(f)+" CRORE "),s>0&&(t+=m(s)+" LAKH "),e>0&&(t+=m(e)+" THOUSAND "),n>0&&(t+=y(n)+" "),t=t.trim()+" RUPEES",u>0&&(t+=" AND "+m(u)+" PAISE"),t+=" ONLY",t}function M(r=[],h={}){const{singlePageMax:E=38,firstPageMax:m=38,middlePageMax:y=38,lastPageMax:a=38,qtyKey:u="quantity",rateKey:t="unit_price"}=h,f=Array.isArray(r)?r:[],c=f.length;if(c<=E){let o=0,l=0;const g=f.map((p,v)=>{const w=Number(p[u]??p.quantity??0),N=Number(p[t]??p.rate??p.purchase_price??p.price??0),T=Number(p.line_total??p.total_price??w*N);return o+=w,l+=T,{...p,originalIndex:v+1,resolvedQty:w,resolvedRate:N,resolvedAmount:T}});return[{pageNumber:1,totalPages:1,isFirstPage:!0,isLastPage:!0,hasBroughtForward:!1,hasCarriedForward:!1,broughtForwardQty:0,broughtForwardAmt:0,pageSubtotalQty:o,pageSubtotalAmt:l,carriedForwardQty:o,carriedForwardAmt:l,items:g}]}const s=[];let e=0,n=0,i=0;for(;e<c;){const o=s.length===0,l=c-e;let g;if(o)g=m,l-g===1&&(g=m-1);else if(l<=a)g=l;else{const d=l-y;d>0&&d<3?g=Math.ceil(l/2):g=y}const p=f.slice(e,e+g),v=n,w=i;let N=0,T=0;const P=p.map((d,R)=>{const S=e+R+1,x=Number(d[u]??d.quantity??0),F=Number(d[t]??d.rate??d.purchase_price??d.price??0),I=Number(d.line_total??d.total_price??x*F);return n+=x,i+=I,N+=x,T+=I,{...d,originalIndex:S,resolvedQty:x,resolvedRate:F,resolvedAmount:I}});e+=p.length;const A=e>=c;s.push({pageNumber:s.length+1,totalPages:0,isFirstPage:o,isLastPage:A,hasBroughtForward:!o,hasCarriedForward:!A,broughtForwardQty:v,broughtForwardAmt:w,pageSubtotalQty:N,pageSubtotalAmt:T,carriedForwardQty:n,carriedForwardAmt:i,items:P})}const b=s.length;return s.forEach(o=>{o.totalPages=b}),s}function L(r,h={}){const{title:E="Document Print",pageMargin:m="8mm 10mm",customCss:y="",onAfterPrint:a=null}=h,u=typeof r=="string"?document.getElementById(r):r;if(!u){window.print(),a&&a();return}try{let t=document.getElementById("tradebill-universal-print-iframe");t&&t.remove(),t=document.createElement("iframe"),t.id="tradebill-universal-print-iframe",t.style.position="fixed",t.style.right="0",t.style.bottom="0",t.style.width="0",t.style.height="0",t.style.border="0",t.style.margin="0",t.style.padding="0",t.style.overflow="hidden",document.body.appendChild(t);let f="";try{Array.from(document.styleSheets).forEach(e=>{try{e.cssRules&&Array.from(e.cssRules).forEach(n=>{f+=n.cssText+`
`})}catch{}})}catch{}const c=Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(e=>e.outerHTML).join(`
`),s=t.contentWindow.document;s.open(),s.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <base href="${window.location.origin}/">
          <title>${E}</title>
          ${c}
          <style>
            ${f}

            @page {
              size: A4 portrait;
              margin: ${m};
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
            ${y}
          </style>
        </head>
        <body class="bg-white text-black font-sans antialiased p-0 m-0">
          <div id="print-root">
            ${u.innerHTML}
          </div>
        </body>
      </html>
    `),s.close(),setTimeout(()=>{let e=!1;const n=()=>{e||(e=!0,typeof a=="function"&&setTimeout(a,250))};try{if(typeof a=="function"){try{t.contentWindow.onafterprint=n,t.contentWindow.addEventListener("afterprint",n)}catch{}window.addEventListener("afterprint",n,{once:!0}),window.addEventListener("focus",()=>{setTimeout(n,400)},{once:!0})}t.contentWindow.focus(),t.contentWindow.print()}catch(i){console.warn("Iframe print failed, falling back to window.print():",i),typeof a=="function"&&window.addEventListener("afterprint",n,{once:!0}),window.print()}},250)}catch(t){console.warn("Print initialization error, falling back to window.print():",t),window.print(),a&&a()}}export{L as a,k as n,M as p};
