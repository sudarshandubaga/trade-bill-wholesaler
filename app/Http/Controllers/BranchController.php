<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BranchController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * List all branches, stores and warehouses for tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $query = Branch::where('tenant_id', $tenant->id)->withCount(['sales', 'purchases']);

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        $branches = $query->orderByDesc('is_head')->orderBy('type')->orderBy('name')->get();

        // If no branch is marked as head branch, designate the first branch as head
        if ($branches->isNotEmpty() && $branches->where('is_head', true)->isEmpty()) {
            $first = $branches->first();
            $first->update(['is_head' => true, 'is_primary' => true]);
            $first->is_head = true;
            $first->is_primary = true;
        }

        $headBranch = $branches->firstWhere('is_head', true) ?? $branches->first();
        $activeBranchId = session('active_branch_id', $headBranch?->id);

        return response()->json([
            'branches' => $branches,
            'data' => $branches,
            'head_branch' => $headBranch,
            'active_branch_id' => $activeBranchId,
        ]);
    }

    /**
     * Store a new branch / store / warehouse.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'type' => 'required|in:store,warehouse,branch',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'is_head' => 'nullable|boolean',
        ]);

        $code = ! empty($validated['code'])
            ? strtoupper(trim($validated['code']))
            : strtoupper(substr($validated['type'], 0, 3) . '-' . rand(10, 99));

        $isFirst = Branch::where('tenant_id', $tenant->id)->count() === 0;
        $isHead = ! empty($validated['is_head']) || $isFirst;

        if ($isHead) {
            Branch::where('tenant_id', $tenant->id)->update(['is_head' => false, 'is_primary' => false]);
        }

        $branch = Branch::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'code' => $code,
            'type' => $validated['type'],
            'is_head' => $isHead,
            'is_primary' => $isHead,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'pincode' => $validated['pincode'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => ucfirst($branch->type) . ' created successfully',
            'branch' => $branch,
        ], 201);
    }

    /**
     * Update an existing branch.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $branch = Branch::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'type' => 'required|in:store,warehouse,branch',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'is_head' => 'nullable|boolean',
        ]);

        if (! empty($validated['is_head'])) {
            Branch::where('tenant_id', $tenant->id)->where('id', '!=', $branch->id)->update(['is_head' => false, 'is_primary' => false]);
            $branch->is_head = true;
            $branch->is_primary = true;
        }

        $branch->update([
            'name' => $validated['name'],
            'code' => ! empty($validated['code']) ? strtoupper(trim($validated['code'])) : $branch->code,
            'type' => $validated['type'],
            'is_head' => $branch->is_head,
            'is_primary' => $branch->is_primary,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'pincode' => $validated['pincode'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => ucfirst($branch->type) . ' updated successfully',
            'branch' => $branch,
        ]);
    }

    /**
     * Designate a branch as the Head Branch / Main Branch.
     */
    public function setHeadBranch($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $branch = Branch::where('tenant_id', $tenant->id)->findOrFail($id);

        Branch::where('tenant_id', $tenant->id)->update(['is_head' => false, 'is_primary' => false]);
        $branch->update(['is_head' => true, 'is_primary' => true]);

        return response()->json([
            'message' => $branch->name . ' is now designated as the Head Branch',
            'branch' => $branch,
        ]);
    }

    /**
     * Switch active operating branch in session.
     */
    public function switchBranch(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
        ]);

        $branch = Branch::where('tenant_id', $tenant->id)->findOrFail($validated['branch_id']);
        session(['active_branch_id' => $branch->id]);

        return response()->json([
            'message' => 'Switched to ' . $branch->name,
            'active_branch' => $branch,
        ]);
    }

    /**
     * Delete branch.
     */
    public function destroy($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $branch = Branch::where('tenant_id', $tenant->id)->findOrFail($id);

        if (Branch::where('tenant_id', $tenant->id)->count() <= 1) {
            return response()->json([
                'message' => 'Cannot delete the only branch. You must maintain at least one store or warehouse.',
            ], 422);
        }

        $branch->delete();

        return response()->json([
            'message' => 'Branch deleted successfully',
        ]);
    }
}
