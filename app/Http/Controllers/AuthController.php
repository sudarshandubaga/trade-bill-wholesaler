<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Authenticate tenant or staff user via email and password.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $resolvedTenant = $request->attributes->get('domain_tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant($request);

        $domain = $resolvedTenant?->domain_name;

        // Check domain mismatch across Tenant or Staff account
        $targetTenant = Tenant::where('email', $credentials['email'])->first();
        $targetStaff = User::where('email', $credentials['email'])->first();
        $actualTenantId = $targetTenant?->id ?? $targetStaff?->tenant_id;
        $actualTenant = $targetTenant ?? ($actualTenantId ? Tenant::find($actualTenantId) : null);

        if ($actualTenant && $resolvedTenant && $actualTenant->id !== $resolvedTenant->id) {
            return response()->json([
                'message' => "The email '{$credentials['email']}' belongs to garage domain '{$actualTenant->domain_name}'. You cannot log in from the '{$resolvedTenant->domain_name}' URL.",
                'errors' => ['email' => ['Domain mismatch for this account.']],
            ], 422);
        }

        if (! $actualTenant && ! $targetStaff) {
            $msg = $resolvedTenant ? 'Invalid email or password credentials for this garage.' : 'Invalid email or password credentials.';
            return response()->json([
                'message' => $msg,
                'errors' => ['email' => ['Login failed! Incorrect email or password.']],
            ], 422);
        }

        // 1. First, check if credentials belong to a staff User
        $staffUser = $targetStaff;

        if ($staffUser && Hash::check($credentials['password'], $staffUser->password)) {
            $tenant = $staffUser->tenant ?? Tenant::find($staffUser->tenant_id) ?? $resolvedTenant;

            if ($tenant && ! $tenant->is_active) {
                return response()->json([
                    'message' => 'Your organization account is suspended or inactive.',
                ], 403);
            }

            if (! $staffUser->is_active) {
                return response()->json([
                    'message' => 'Your staff user account has been disabled. Please contact your administrator.',
                ], 403);
            }

            Auth::guard('web')->login($tenant, $request->boolean('remember'));
            $request->session()->regenerate();

            $request->session()->put('tenant_id', $tenant->id);
            $request->session()->put('tenant_domain', $tenant->domain_name);
            $request->session()->put('logged_in_user_id', $staffUser->id);

            if ($staffUser->branch_id) {
                $request->session()->put('active_branch_id', $staffUser->branch_id);
            } else {
                $defaultBranch = Branch::where('tenant_id', $tenant->id)->first();
                if ($defaultBranch) {
                    $request->session()->put('active_branch_id', $defaultBranch->id);
                }
            }

            $activeBranch = Branch::find(session('active_branch_id')) ?? Branch::where('tenant_id', $tenant->id)->first();

            return response()->json([
                'message' => 'Login successful',
                'tenant' => $tenant->fresh(),
                'user' => $staffUser->load(['branch', 'roleModel']),
                'active_branch' => $activeBranch,
                'authenticated' => true,
            ]);
        }

        // 2. Second, check if credentials belong to Tenant Owner directly
        $tenant = $targetTenant;

        if (! $tenant || ! Hash::check($credentials['password'], $tenant->password)) {
            return response()->json([
                'message' => 'Invalid email or password credentials.',
                'errors' => ['email' => ['Login failed! Incorrect email or password.']],
            ], 422);
        }

        if (! $tenant->is_active) {
            return response()->json([
                'message' => 'Your store / organization account is suspended or inactive.',
            ], 403);
        }

        Auth::guard('web')->login($tenant, $request->boolean('remember'));
        $request->session()->regenerate();

        $request->session()->put('tenant_id', $tenant->id);
        $request->session()->put('tenant_domain', $tenant->domain_name);

        // Find or create Super Admin User record for the owner
        $ownerUser = User::firstOrCreate(
            ['tenant_id' => $tenant->id, 'email' => $tenant->email],
            [
                'name' => $tenant->name . ' (Owner)',
                'password' => $tenant->password,
                'role' => 'super_admin',
                'permissions' => ['*'],
                'is_active' => true,
            ]
        );

        $request->session()->put('logged_in_user_id', $ownerUser->id);

        $defaultBranch = Branch::where('tenant_id', $tenant->id)->first();
        if ($defaultBranch) {
            $request->session()->put('active_branch_id', $defaultBranch->id);
        }

        return response()->json([
            'message' => 'Login successful',
            'tenant' => $tenant->fresh(),
            'user' => $ownerUser->load(['branch', 'roleModel']),
            'active_branch' => $defaultBranch,
            'authenticated' => true,
        ]);
    }

    /**
     * Log out current session.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->forget(['logged_in_user_id', 'active_branch_id', 'tenant_id']);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully',
            'authenticated' => false,
        ]);
    }

    /**
     * Get current authenticated session info.
     */
    public function me(Request $request): JsonResponse
    {
        $tenant = Auth::guard('web')->user();

        if (!$tenant) {
            $domainTenant = $request->attributes->get('domain_tenant')
                ?? $request->attributes->get('tenant')
                ?? app(\App\Services\TenantManager::class)->resolveTenant($request);

            return response()->json([
                'authenticated' => false,
                'tenant' => null,
                'user' => null,
                'active_branch' => null,
                'domain_info' => $domainTenant ? [
                    'name' => $domainTenant->name,
                    'domain_name' => $domainTenant->domain_name,
                    'currency' => $domainTenant->currency,
                    'email' => $domainTenant->email,
                ] : null,
            ]);
        }

        // Load active User
        $userId = session('logged_in_user_id');
        $user = null;
        if ($userId) {
            $user = User::where('tenant_id', $tenant->id)
                ->with(['branch', 'roleModel'])
                ->find($userId);
        }

        if (!$user) {
            // Default Super Admin representation
            $user = User::where('tenant_id', $tenant->id)->where('role', 'super_admin')->first()
                ?? new User([
                    'tenant_id' => $tenant->id,
                    'name' => $tenant->name . ' Admin',
                    'email' => $tenant->email,
                    'role' => 'super_admin',
                    'permissions' => ['*'],
                    'is_active' => true,
                ]);
        }

        // Load active Branch
        $activeBranchId = session('active_branch_id');
        $activeBranch = null;
        if ($activeBranchId) {
            $activeBranch = Branch::where('tenant_id', $tenant->id)->find($activeBranchId);
        }

        if (!$activeBranch) {
            $activeBranch = Branch::where('tenant_id', $tenant->id)->first();
            if ($activeBranch) {
                session(['active_branch_id' => $activeBranch->id]);
            }
        }

        return response()->json([
            'authenticated' => true,
            'tenant' => $tenant->fresh(),
            'user' => $user,
            'active_branch' => $activeBranch,
        ]);
    }

    /**
     * Change Password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $tenant = Auth::guard('web')->user();

        if (!$tenant) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $userId = session('logged_in_user_id');
        $user = $userId ? User::find($userId) : null;

        $checkModel = $user ?? $tenant;

        if (!Hash::check($validated['current_password'], $checkModel->password)) {
            return response()->json([
                'errors' => ['current_password' => ['The provided current password does not match our records.']],
            ], 422);
        }

        $newHash = Hash::make($validated['new_password']);
        if ($user) {
            $user->password = $newHash;
            $user->save();
        }
        $tenant->password = $newHash;
        $tenant->save();

        return response()->json([
            'message' => 'Password updated successfully!',
        ]);
    }

    /**
     * Forgot Password using email.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $validated['email']],
            [
                'token' => Hash::make($token),
                'created_at' => Carbon::now(),
            ]
        );

        return response()->json([
            'message' => 'Password reset instructions and token have been generated for ' . $validated['email'],
            'demo_token' => $token,
            'email' => $validated['email'],
        ]);
    }

    /**
     * Reset Password using email token.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (!$record) {
            return response()->json([
                'message' => 'Invalid or expired password reset token.',
            ], 422);
        }

        $tokenValid = Hash::check($validated['token'], $record->token) || $validated['token'] === $record->token;

        if (!$tokenValid) {
            return response()->json([
                'message' => 'The provided reset token is incorrect.',
            ], 422);
        }

        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            return response()->json([
                'message' => 'This password reset token has expired. Please request a new one.',
            ], 422);
        }

        $newHash = Hash::make($validated['password']);

        $user = User::where('email', $validated['email'])->first();
        if ($user) {
            $user->password = $newHash;
            $user->save();
        }

        $tenant = Tenant::where('email', $validated['email'])->first();
        if ($tenant) {
            $tenant->password = $newHash;
            $tenant->save();
            Auth::guard('web')->login($tenant);
        }

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        return response()->json([
            'message' => 'Password reset successfully! You are now logged in.',
            'authenticated' => true,
        ]);
    }
}
