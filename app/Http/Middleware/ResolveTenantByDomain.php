<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenantByDomain
{
    public function __construct(protected TenantManager $tenantManager)
    {
    }

    /**
     * Handle an incoming request and bind tenant from domain.
     * Shows a 404 page if domain does not match any registered tenant.
     * Unauthenticated visitors are NOT automatically logged in.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. If user is already authenticated via session, bind the authenticated tenant
        if (Auth::guard('web')->check()) {
            $authenticatedTenant = Auth::guard('web')->user();
            $request->attributes->set('tenant', $authenticatedTenant);
            $request->attributes->set('domain_tenant', $authenticatedTenant);

            if ($request->hasSession()) {
                $request->session()->put('tenant_id', $authenticatedTenant->id);
                $request->session()->put('tenant_domain', $authenticatedTenant->domain_name);
            }

            view()->share('currentTenant', $authenticatedTenant);

            return $next($request);
        }

        // 2. For unauthenticated guests, resolve the domain tenant for station branding
        $tenant = $this->tenantManager->resolveTenant($request);

        // If domain is not matched to any tenant in DB (and not public auth endpoints)
        if (! $tenant && ! $request->is('api/login') && ! $request->is('api/me') && ! $request->is('api/forgot-password') && ! $request->is('api/reset-password')) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => 'Garage Not Found',
                    'message' => 'No motor service tenant found for domain: ' . $request->getHost(),
                ], 404);
            }

            return response()->view('tenant_not_found', [
                'domain' => $request->getHost(),
                'registeredTenants' => Tenant::where('is_active', true)->select('name', 'domain_name')->get(),
            ], 404);
        }

        if ($tenant) {
            // Provide domain context for public station branding without authenticating
            $request->attributes->set('domain_tenant', $tenant);
            $request->attributes->set('tenant', $tenant);

            view()->share('currentTenant', $tenant);
        }

        // NOTE: We deliberately DO NOT call Auth::guard('web')->setUser($tenant) here!
        // Guests MUST supply valid email and password credentials to log in.

        return $next($request);
    }
}
