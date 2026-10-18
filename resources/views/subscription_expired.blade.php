<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50 text-slate-800">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Subscription Expired &bull; {{ $tenant->name ?? 'TradeBill Wholesaler' }}</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet">

    <!-- Tailwind CSS (via Vite with CDN fallback) -->
    @vite(['resources/css/app.css'])
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    }
                }
            }
        }
    </script>

    <style>
        body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }

        .font-mono {
            font-family: 'JetBrains Mono', monospace;
        }

        @keyframes pulse-glow {

            0%,
            100% {
                opacity: 0.4;
                transform: scale(1);
            }

            50% {
                opacity: 0.7;
                transform: scale(1.06);
            }
        }

        .animate-pulse-glow {
            animation: pulse-glow 4s ease-in-out infinite;
        }
    </style>
</head>

<body
    class="min-h-full flex flex-col justify-between bg-gradient-to-b from-slate-50 via-slate-100/70 to-rose-50/40 text-slate-800 selection:bg-rose-500 selection:text-white relative overflow-x-hidden antialiased">

    <!-- Background Subtle Ambient Glows -->
    <div
        class="fixed top-8 left-1/2 -translate-x-1/2 w-[680px] h-[400px] bg-rose-200/40 rounded-full blur-[130px] pointer-events-none animate-pulse-glow">
    </div>
    <div
        class="fixed bottom-0 right-10 w-[450px] h-[450px] bg-amber-200/35 rounded-full blur-[140px] pointer-events-none">
    </div>
    <div class="fixed top-1/3 left-10 w-[320px] h-[320px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none">
    </div>

    <!-- Main Container (Light Theme) -->
    <main class="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 z-10">
        <div
            class="max-w-3xl w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/60 space-y-7 relative overflow-hidden">

            <!-- Subtle decorative top rim light -->
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent">
            </div>

            <!-- Lock Icon Badge & Main Status Header -->
            <div class="flex flex-col items-center text-center space-y-3 pt-2">
                <div class="relative">
                    <div
                        class="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/25 ring-4 ring-rose-100">
                        <svg class="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" stroke-width="2.2"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002A11.959 11.959 0 0112 2.714zm0 13.036h.008v.008H12v-.008z" />
                        </svg>
                    </div>
                    <span class="absolute -top-1.5 -right-1.5 flex h-5 w-5">
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span
                            class="relative inline-flex rounded-full h-5 w-5 bg-rose-500 border-2 border-white"></span>
                    </span>
                </div>

                <div class="space-y-1.5 max-w-xl">
                    <div
                        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wider">
                        <svg class="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" stroke-width="2.5"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <span>Subscription Expired &bull; 403 Forbidden</span>
                    </div>

                    <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Annual Subscription Expired
                    </h1>

                    <div class="text-xs sm:text-sm font-bold text-rose-600 uppercase tracking-wider">
                        Wholesale ERP Operations Locked
                    </div>

                    <p class="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                        All wholesale ERP operations for <strong
                            class="text-slate-900 font-bold">{{ $tenant->name ?? 'this store' }}</strong> are
                        temporarily paused
                        because the yearly software subscription has expired.
                    </p>
                </div>
            </div>

            <!-- Locked Modules Warning Matrix (Light Theme) -->
            <div class="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                <div class="flex items-center gap-2 text-rose-800 text-xs sm:text-sm font-extrabold">
                    <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2"
                        viewBox="0 0 24 24">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Locked Wholesale Operations (Safe Mode Active)</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                    <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                        <span class="text-rose-500 font-bold text-sm">🔒</span>
                        <span class="font-medium">POS Billing & Customer Invoice Printing</span>
                    </div>
                    <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                        <span class="text-rose-500 font-bold text-sm">🔒</span>
                        <span class="font-medium">Stock-in & Inward Supplier Challans</span>
                    </div>
                    <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                        <span class="text-rose-500 font-bold text-sm">🔒</span>
                        <span class="font-medium">Payment & Receipt Vouchers</span>
                    </div>
                    <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                        <span class="text-rose-500 font-bold text-sm">🔒</span>
                        <span class="font-medium">Financial Ledgers & Tax Reports</span>
                    </div>
                </div>

                <p class="text-[11px] text-slate-500 leading-normal pt-1">
                    Your database records, customer balances, product inventory, and historical bills remain securely
                    archived and will be fully unlocked immediately upon license renewal.
                </p>
            </div>

            <!-- Platform Administration & Contact Support (Light Theme) -->
            <div class="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" stroke-width="2"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        Platform Administration Renewal Helpdesk
                    </span>
                    <span
                        class="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Support
                        Active (9 AM - 8 PM IST)</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <a href="tel:+919636150842"
                        class="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs hover:border-slate-300 flex items-center gap-3 transition group">
                        <div
                            class="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 transition">
                            📞
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-500 block font-medium">Billing Hotline</span>
                            <span class="font-mono font-bold text-slate-900">+91 (963) 615-0842</span>
                        </div>
                    </a>

                    <a href="mailto:contact@xpertcoders.in"
                        class="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs hover:border-slate-300 flex items-center gap-3 transition group">
                        <div
                            class="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 group-hover:scale-105 transition">
                            ✉️
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-500 block font-medium">License Support Email</span>
                            <span class="font-mono font-bold text-slate-900">contact@xpertcoders.in</span>
                        </div>
                    </a>
                </div>
            </div>

            <!-- Action Buttons Row (Dark Buttons) -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button onclick="window.location.reload()"
                    class="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer border border-slate-700 shadow-md">
                    <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" stroke-width="2.5"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Check License Status</span>
                </button>
            </div>

            <!-- Optional: Other Registered Tenants / Switch Store list (Light Theme) -->
            @if(isset($registeredTenants) && count($registeredTenants) > 0)
                <div class="pt-5 border-t border-slate-200 text-left space-y-3">
                    <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Switch To Other Active Stores:
                    </span>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        @foreach($registeredTenants as $t)
                            <a href="{{ url('/?domain=' . $t->domain_name) }}"
                                class="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 flex items-center justify-between text-xs transition group">
                                <span class="font-bold text-slate-800 group-hover:text-amber-800">{{ $t->name }}</span>
                                <span
                                    class="font-mono text-[11px] text-slate-500 group-hover:text-amber-700">{{ $t->domain_name }}
                                    &rarr;</span>
                            </a>
                        @endforeach
                    </div>
                </div>
            @endif

        </div>
    </main>

    <!-- Footer (Light Theme) -->
    <footer class="border-t border-slate-200/80 bg-white/80 px-6 py-4 text-center text-xs text-slate-500 z-10">
        <span>TradeBill Wholesaler &bull; Enterprise Multi-Branch B2B Billing &amp; Inventory ERP</span>
    </footer>

    <!-- Interactive License Renewal Script -->
    <script>
        async function renewLicense(tenantId) {
            const btn = document.getElementById('btn-renew-license');
            const text = document.getElementById('btn-renew-text');
            if (!btn || !text) return;

            btn.disabled = true;
            btn.classList.add('opacity-70', 'cursor-not-allowed');
            text.textContent = 'Renewing License (+1 Year)...';

            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                const response = await fetch(`/api/tenants/${tenantId}/activate-license`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    },
                    body: JSON.stringify({
                        action: 'renew_one_year'
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    text.textContent = 'License Activated! Unlocking...';
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 800);
                } else {
                    alert(data.message || 'Failed to activate license. Please contact administration.');
                    btn.disabled = false;
                    btn.classList.remove('opacity-70', 'cursor-not-allowed');
                    text.textContent = 'Activate License (+1 Year)';
                }
            } catch (err) {
                console.error(err);
                alert('Connection error. Please check your network and try again.');
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
                text.textContent = 'Activate License (+1 Year)';
            }
        }
    </script>
</body>

</html>