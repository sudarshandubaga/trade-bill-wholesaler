<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-100 text-slate-900">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>TradeBill OmniPOS - Store, Mall & Warehouse Billing Software</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        .font-mono {
            font-family: 'JetBrains Mono', monospace;
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(226, 232, 240, 0.6);
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.7);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.9);
        }

        /* Standardized A4 Print Layout */
        @media print {
            @page {
                size: A4 portrait;
                margin: 10mm 12mm 10mm 12mm;
            }

            html, body {
                width: 100% !important;
                height: auto !important;
                min-height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            /* Hide all regular app navigation & UI controls */
            header,
            nav,
            main,
            .no-print {
                display: none !important;
            }

            /* Reset React root & modal overlay to static document flow */
            #root,
            #root > div {
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: transparent !important;
                position: static !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .print-modal-overlay {
                position: static !important;
                inset: auto !important;
                background: #ffffff !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
            }

            .print-modal-container {
                position: static !important;
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                overflow: visible !important;
                animation: none !important;
                transform: none !important;
                display: block !important;
            }

            /* Make printable receipt flow naturally on the A4 page */
            #printable-receipt {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
            }
        }
    </style>

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="h-full antialiased bg-slate-100/75 text-slate-900 selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
    <div id="root"></div>
</body>
</html>
