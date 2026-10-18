<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * List users and roles for tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $users = User::where('tenant_id', $tenant->id)
            ->with(['branch', 'roleModel'])
            ->orderBy('id', 'asc')
            ->get();

        $roles = Role::where(function ($q) use ($tenant) {
            $q->where('tenant_id', $tenant->id)->orWhereNull('tenant_id');
        })->get();

        $branches = Branch::where('tenant_id', $tenant->id)->where('is_active', true)->get();

        // Available standard permissions matrix for UI
        $availablePermissions = [
            ['key' => 'pos', 'label' => 'POS Billing', 'group' => 'Sales & Billing'],
            ['key' => 'customers', 'label' => 'Customer Management', 'group' => 'Accounts'],
            ['key' => 'suppliers', 'label' => 'Supplier Management', 'group' => 'Accounts'],
            ['key' => 'items', 'label' => 'Items & Catalog', 'group' => 'Inventory'],
            ['key' => 'brands', 'label' => 'Brand Master', 'group' => 'Inventory'],
            ['key' => 'categories', 'label' => 'Category Master', 'group' => 'Inventory'],
            ['key' => 'hsn', 'label' => 'HSN / SAC Master', 'group' => 'Inventory'],
            ['key' => 'barcode_print', 'label' => 'Barcode Printing', 'group' => 'Inventory'],
            ['key' => 'challan', 'label' => 'Challans (Inward/Outward)', 'group' => 'Voucher / Challan'],
            ['key' => 'vouchers', 'label' => 'Payment & Receipt Vouchers', 'group' => 'Voucher / Challan'],
            ['key' => 'credit_debit_note', 'label' => 'Credit & Debit Notes', 'group' => 'Voucher / Challan'],
            ['key' => 'purchase', 'label' => 'Purchase Management', 'group' => 'Purchases'],
            ['key' => 'reports', 'label' => 'All Accounting & Stock Reports', 'group' => 'Reports'],
            ['key' => 'stock_dump', 'label' => 'Stock Dump & Adjustments', 'group' => 'Inventory'],
            ['key' => 'branch_manage', 'label' => 'Manage Branches / Warehouses', 'group' => 'Administration'],
            ['key' => 'user_manage', 'label' => 'Manage Users & Permissions', 'group' => 'Administration'],
        ];

        return response()->json([
            'users' => $users,
            'roles' => $roles,
            'branches' => $branches,
            'available_permissions' => $availablePermissions,
        ]);
    }

    /**
     * Store new User.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:50',
            'password' => 'required|string|min:6',
            'role' => 'required|string', // super_admin, branch_manager, saleperson, or custom role slug
            'role_id' => 'nullable|exists:roles,id',
            'branch_id' => 'nullable|exists:branches,id',
            'permissions' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $roleObj = null;
        if (! empty($validated['role_id'])) {
            $roleObj = Role::find($validated['role_id']);
        } elseif (! empty($validated['role'])) {
            $roleObj = Role::where('slug', $validated['role'])->first();
        }

        $user = User::create([
            'tenant_id' => $tenant->id,
            'branch_id' => $validated['branch_id'] ?? null,
            'name' => $validated['name'],
            'email' => strtolower(trim($validated['email'])),
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'role_id' => $roleObj?->id ?? null,
            'permissions' => $validated['permissions'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load(['branch', 'roleModel']),
        ], 201);
    }

    /**
     * Update existing User.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $user = User::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:50',
            'password' => 'nullable|string|min:6',
            'role' => 'required|string',
            'role_id' => 'nullable|exists:roles,id',
            'branch_id' => 'nullable|exists:branches,id',
            'permissions' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $roleObj = null;
        if (! empty($validated['role_id'])) {
            $roleObj = Role::find($validated['role_id']);
        } elseif (! empty($validated['role'])) {
            $roleObj = Role::where('slug', $validated['role'])->first();
        }

        $updateData = [
            'name' => $validated['name'],
            'email' => strtolower(trim($validated['email'])),
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'role_id' => $roleObj?->id ?? $user->role_id,
            'branch_id' => $validated['branch_id'] ?? null,
            'permissions' => $validated['permissions'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh()->load(['branch', 'roleModel']),
        ]);
    }

    /**
     * Delete User.
     */
    public function destroy($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $user = User::where('tenant_id', $tenant->id)->findOrFail($id);

        if ($user->role === 'super_admin' && User::where('tenant_id', $tenant->id)->where('role', 'super_admin')->count() <= 1) {
            return response()->json([
                'message' => 'Cannot delete the only Super Admin user.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Store new custom Role with permissions.
     */
    public function storeRole(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'permissions' => 'required|array',
        ]);

        $slug = Str::slug($validated['name'], '_');

        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'permissions' => $validated['permissions'],
            'is_system' => false,
        ]);

        return response()->json([
            'message' => 'Role created successfully',
            'role' => $role,
        ], 201);
    }

    /**
     * Update custom Role permissions.
     */
    public function updateRole(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $role = Role::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'permissions' => 'required|array',
        ]);

        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'permissions' => $validated['permissions'],
        ]);

        return response()->json([
            'message' => 'Role updated successfully',
            'role' => $role,
        ]);
    }
}
