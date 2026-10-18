<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SupplierController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * List suppliers.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $query = Supplier::where('tenant_id', $tenant->id)
            ->withCount('purchases')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('mobile_no', 'like', "%{$search}%")
                  ->orWhere('gstin', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->get();

        return response()->json($suppliers);
    }

    /**
     * Store new Supplier.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'mobile_no' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'gstin' => 'nullable|string|max:50',
            'state' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric',
            'is_active' => 'nullable|boolean',
        ]);

        $openingBal = (float) ($validated['opening_balance'] ?? 0);

        $supplier = Supplier::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'company_name' => $validated['company_name'] ?? null,
            'mobile_no' => $validated['mobile_no'] ?? null,
            'email' => $validated['email'] ?? null,
            'gstin' => ! empty($validated['gstin']) ? strtoupper(trim($validated['gstin'])) : null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
            'opening_balance' => $openingBal,
            'current_balance' => $openingBal,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Supplier added successfully',
            'supplier' => $supplier,
        ], 201);
    }

    /**
     * Update existing Supplier.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $supplier = Supplier::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'mobile_no' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'gstin' => 'nullable|string|max:50',
            'state' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric',
            'current_balance' => 'nullable|numeric',
            'is_active' => 'nullable|boolean',
        ]);

        $supplier->update([
            'name' => $validated['name'],
            'company_name' => $validated['company_name'] ?? null,
            'mobile_no' => $validated['mobile_no'] ?? null,
            'email' => $validated['email'] ?? null,
            'gstin' => ! empty($validated['gstin']) ? strtoupper(trim($validated['gstin'])) : null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
            'opening_balance' => $validated['opening_balance'] ?? $supplier->opening_balance,
            'current_balance' => $validated['current_balance'] ?? $supplier->current_balance,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Supplier updated successfully',
            'supplier' => $supplier,
        ]);
    }

    /**
     * Delete Supplier.
     */
    public function destroy($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $supplier = Supplier::where('tenant_id', $tenant->id)->findOrFail($id);

        $supplier->delete();

        return response()->json([
            'message' => 'Supplier removed successfully',
        ]);
    }

    /**
     * Get detailed ledger / statement for supplier.
     */
    public function ledger($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $supplier = Supplier::where('tenant_id', $tenant->id)->findOrFail($id);

        $purchases = Purchase::where('tenant_id', $tenant->id)
            ->where('supplier_id', $supplier->id)
            ->orderBy('purchase_date', 'asc')
            ->get();

        $vouchers = Voucher::where('tenant_id', $tenant->id)
            ->where('party_id', $supplier->id)
            ->where('party_type', 'supplier')
            ->orderBy('voucher_date', 'asc')
            ->get();

        return response()->json([
            'supplier' => $supplier,
            'purchases' => $purchases,
            'vouchers' => $vouchers,
        ]);
    }
}
