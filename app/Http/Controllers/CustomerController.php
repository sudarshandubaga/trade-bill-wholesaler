<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * List customers for current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $query = Customer::where('tenant_id', $tenant->id)
            ->withCount('sales')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('mobile_no', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('gstin', 'like', "%{$search}%");
            });
        }

        $customers = $query->get();

        return response()->json($customers);
    }

    /**
     * Store new customer.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'mobile_no' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'gstin' => 'nullable|string|max:50',
            'state' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric',
            'vehicle_no' => 'nullable|string|max:50',
            'vehicle_model' => 'nullable|string|max:100',
        ]);

        $openingBal = (float)($validated['opening_balance'] ?? 0);

        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'mobile_no' => $validated['mobile_no'] ?? null,
            'email' => $validated['email'] ?? null,
            'gstin' => ! empty($validated['gstin']) ? strtoupper(trim($validated['gstin'])) : null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
            'opening_balance' => $openingBal,
            'current_balance' => $openingBal,
            'vehicle_no' => $validated['vehicle_no'] ?? null,
            'vehicle_model' => $validated['vehicle_model'] ?? null,
            'points' => 0.00,
        ]);

        return response()->json([
            'message' => 'Customer created successfully',
            'customer' => $customer,
        ], 201);
    }

    /**
     * Update existing customer.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $customer = Customer::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'mobile_no' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'gstin' => 'nullable|string|max:50',
            'state' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric',
            'current_balance' => 'nullable|numeric',
            'vehicle_no' => 'nullable|string|max:50',
            'vehicle_model' => 'nullable|string|max:100',
        ]);

        $customer->update([
            'name' => $validated['name'],
            'mobile_no' => $validated['mobile_no'] ?? null,
            'email' => $validated['email'] ?? null,
            'gstin' => ! empty($validated['gstin']) ? strtoupper(trim($validated['gstin'])) : null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
            'opening_balance' => $validated['opening_balance'] ?? $customer->opening_balance,
            'current_balance' => $validated['current_balance'] ?? $customer->current_balance,
            'vehicle_no' => $validated['vehicle_no'] ?? null,
            'vehicle_model' => $validated['vehicle_model'] ?? null,
        ]);

        return response()->json([
            'message' => 'Customer updated successfully',
            'customer' => $customer,
        ]);
    }

    /**
     * Delete customer.
     */
    public function destroy($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $customer = Customer::where('tenant_id', $tenant->id)->findOrFail($id);
        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully',
        ]);
    }
}
