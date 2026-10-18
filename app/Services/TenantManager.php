<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Http\Request;

class TenantManager
{
    protected ?Tenant $explicitTenant = null;

    /**
     * Resolve the active tenant from the domain / host / query parameter.
     * Returns null if no registered tenant matches the domain.
     */
    public function resolveTenant(Request $request): ?Tenant
    {
        if ($this->explicitTenant) {
            return $this->explicitTenant;
        }

        if ($request->attributes->has('_resolved_tenant')) {
            return $request->attributes->get('_resolved_tenant');
        }

        $tenant = null;

        // 1. Check explicit domain query parameter (?domain=speedy-motors) or X-Tenant-Domain header
        $explicitDomain = $request->query('domain') ?: $request->header('X-Tenant-Domain');
        if ($explicitDomain) {
            $tenant = Tenant::where('domain_name', $explicitDomain)->first();
            if ($tenant) {
                $request->attributes->set('_resolved_tenant', $tenant);
                return $tenant;
            }
        }

        // 2. Resolve from HTTP Host
        $host = strtolower($request->getHost());

        // A. Direct exact match with domain_name (e.g. "speedy-motors" or "speedy-motors.com")
        $tenant = Tenant::where('domain_name', $host)->first();
        if ($tenant) {
            $request->attributes->set('_resolved_tenant', $tenant);
            return $tenant;
        }

        // B. Subdomain match (e.g. "speedy-motors.localhost" or "speedy-motors.moterservice.com")
        $parts = explode('.', $host);
        if (count($parts) > 1) {
            $subdomain = $parts[0];
            if (! in_array($subdomain, ['www', 'app', 'admin', 'api'])) {
                $tenant = Tenant::where('domain_name', $subdomain)->first();
                if ($tenant) {
                    $request->attributes->set('_resolved_tenant', $tenant);
                    return $tenant;
                }
            }
        }

        // 3. Fallback to session domain if previously resolved on this browser
        if ($request->hasSession() && $request->session()->has('tenant_domain')) {
            $sessionDomain = $request->session()->get('tenant_domain');
            $tenant = Tenant::where('domain_name', $sessionDomain)->first();
            if ($tenant) {
                $request->attributes->set('_resolved_tenant', $tenant);
                return $tenant;
            }
        }

        // 4. Localhost / Loopback fallback for local development
        if (in_array($host, ['127.0.0.1', 'localhost', '::1'])) {
            $tenant = Tenant::where('domain_name', 'localhost')->first()
                ?? Tenant::first();
            if ($tenant) {
                $request->attributes->set('_resolved_tenant', $tenant);
                return $tenant;
            }
        }

        $request->attributes->set('_resolved_tenant', null);
        return null;
    }

    public function getTenant(): ?Tenant
    {
        return $this->explicitTenant;
    }

    public function setTenant(?Tenant $tenant): void
    {
        $this->explicitTenant = $tenant;
    }
}
