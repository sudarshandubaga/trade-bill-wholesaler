<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionActive
{
    public function __construct(protected TenantManager $tenantManager)
    {
    }

    /**
     * Handle an incoming request.
     * Blocks all functionality if the tenant's yearly subscription has expired.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Auth::guard('web')->user()
            ?? $request->attributes->get('tenant')
            ?? $this->tenantManager->resolveTenant($request);

        if (! $tenant instanceof Tenant) {
            return $next($request);
        }

        // Whitelisted routes that must work even when expired (auth & subscription status)
        $whitelistedPaths = [
            'api/me',
            'api/login',
            'api/logout',
            'api/change-password',
            'api/forgot-password',
            'api/reset-password',
            'api/tenants',
        ];

        foreach ($whitelistedPaths as $path) {
            if ($request->is($path) || $request->is($path . '/*')) {
                return $next($request);
            }
        }

        // Check subscription expiration
        if ($tenant->is_expired) {
            return response()->json([
                'error' => 'Subscription Expired',
                'message' => 'Your yearly garage subscription has expired. All operations are locked. Please contact platform administration to renew your annual subscription.',
                'is_expired' => true,
                'domain' => $tenant->domain_name,
                'expires_at' => $tenant->expires_at?->toIso8601String(),
                'days_remaining' => $tenant->days_remaining,
            ], 403);
        }

        return $next($request);
    }
}
