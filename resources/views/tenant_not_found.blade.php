<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>404 - Garage Not Found | MotoService Pro</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">

    @vite(['resources/css/app.css'])
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="h-full flex items-center justify-center p-6 bg-slate-50 text-slate-800">
    <div class="max-w-lg w-full bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
        
        <!-- Warning Icon Badge -->
        <div class="w-16 h-16 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shadow-xs">
            🚗
        </div>

        <div>
            <div class="inline-block px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black tracking-wider uppercase mb-2">
                404 &bull; Domain Not Found
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Garage Not Registered
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                No motor service workshop is registered with the domain:
            </p>
            <div class="mt-2 inline-block font-mono text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                {{ $domain }}
            </div>
        </div>

        @if(isset($registeredTenants) && count($registeredTenants) > 0)
            <div class="pt-4 border-t border-slate-100 text-left space-y-3">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Available Registered Garages in Database:
                </span>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    @foreach($registeredTenants as $t)
                        <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                            <div>
                                <span class="font-bold text-slate-900 block">{{ $t->name }}</span>
                                <span class="font-mono text-slate-500 text-[11px]">domain_name: <strong class="text-amber-700">{{ $t->domain_name }}</strong></span>
                            </div>
                            <a
                                href="{{ url('/?domain=' . $t->domain_name) }}"
                                class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xs transition-colors shrink-0"
                            >
                                Open Garage &rarr;
                            </a>
                        </div>
                    @endforeach
                </div>
            </div>
        @endif

        <div class="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            MotoService Pro SaaS &bull; Domain-based Motor Service Multi-tenancy
        </div>

    </div>
</body>
</html>
