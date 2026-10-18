<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantController extends Controller
{
    /**
     * List all tenants for SaaS administration & tenant switcher.
     */
    public function index(): JsonResponse
    {
        $tenants = Tenant::withCount(['items', 'customers', 'sales'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($tenants);
    }

    /**
     * Create new Tenant with yearly subscription.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain_name' => 'required|string|max:100|unique:tenants,domain_name',
            'email' => 'required|email|max:255|unique:tenants,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'currency' => 'nullable|string|max:10',
            'subscription_plan' => 'nullable|string|max:100',
            'subscription_price' => 'nullable|numeric|min:0',
            'expires_at' => 'nullable|date',
        ]);

        // Standardize domain_name slug
        $validated['domain_name'] = Str::slug($validated['domain_name']);

        // Default expires_at to 1 year from now if not provided
        $expiresAt = ! empty($validated['expires_at'])
            ? Carbon::parse($validated['expires_at'])
            : Carbon::now()->addYear();

        $tenant = Tenant::create([
            'name' => $validated['name'],
            'domain_name' => $validated['domain_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'currency' => $validated['currency'] ?? '$',
            'subscription_plan' => $validated['subscription_plan'] ?? 'Annual Garage Pro (Yearly)',
            'subscription_price' => $validated['subscription_price'] ?? 499.00,
            'expires_at' => $expiresAt,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Tenant registered successfully with a 1-year subscription!',
            'tenant' => $tenant->fresh(),
        ], 201);
    }

    protected function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * Get current tenant settings including loyalty point percentage.
     */
    public function getSettings(): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        return response()->json([
            'tenant' => $tenant->fresh(),
        ]);
    }

    /**
     * Update current tenant settings (Business info & Point Percentage).
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'currency' => 'nullable|string|max:10',
            'point_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $tenant->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'currency' => $validated['currency'] ?? '₹',
            'point_percentage' => isset($validated['point_percentage']) ? (float)$validated['point_percentage'] : 0.00,
        ]);

        return response()->json([
            'message' => 'Settings saved successfully!',
            'tenant' => $tenant->fresh(),
        ]);
    }

    /**
     * Update tenant details.
     */
    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain_name' => ['required', 'string', 'max:100', Rule::unique('tenants')->ignore($tenant->id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('tenants')->ignore($tenant->id)],
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'currency' => 'nullable|string|max:10',
            'point_percentage' => 'nullable|numeric|min:0|max:100',
            'subscription_plan' => 'nullable|string|max:100',
            'expires_at' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['domain_name'] = Str::slug($validated['domain_name']);

        if (! empty($validated['expires_at'])) {
            $validated['expires_at'] = Carbon::parse($validated['expires_at']);
        }

        $tenant->update($validated);

        return response()->json([
            'message' => 'Tenant updated successfully',
            'tenant' => $tenant->fresh(),
        ]);
    }

    /**
     * Renew yearly subscription: Self-activation on click is disabled.
     */
    public function renewSubscription(Tenant $tenant): JsonResponse
    {
        return response()->json([
            'message' => 'Subscription self-activation is disabled. Please contact platform administration to renew your yearly subscription.',
            'status' => 'locked',
        ], 403);
    }

    /**
     * Switch active session to this tenant.
     */
    public function switchTenant(Tenant $tenant): JsonResponse
    {
        Auth::guard('web')->login($tenant);

        return response()->json([
            'message' => 'Switched to tenant: ' . $tenant->name,
            'tenant' => $tenant->fresh(),
        ]);
    }

    /**
     * Admin/License Activation: Renew or toggle subscription status.
     */
    public function activateLicense(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|string|in:renew_one_year,set_expired',
        ]);

        if ($validated['action'] === 'renew_one_year') {
            $tenant->update([
                'expires_at' => Carbon::now()->addYear(),
                'is_active' => true,
            ]);
            $msg = 'Subscription renewed for 1 full year!';
        } else {
            $tenant->update([
                'expires_at' => Carbon::now()->subDays(5),
            ]);
            $msg = 'Subscription marked as expired for testing.';
        }

        return response()->json([
            'message' => $msg,
            'tenant' => $tenant->fresh(),
        ]);
    }
}
