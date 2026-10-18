<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPermission
{
    /**
     * Handle an incoming request.
     * Checks if current staff user has the requested permission.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $tenant = Auth::guard('web')->user();
        if (! $tenant) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'authenticated' => false,
            ], 401);
        }

        $userId = session('logged_in_user_id');
        $user = null;

        if ($userId) {
            $user = User::where('tenant_id', $tenant->id)->with(['branch', 'roleModel'])->find($userId);
        }

        if (! $user) {
            // Default to owner super-admin
            $user = User::where('tenant_id', $tenant->id)->where('role', 'super_admin')->first();
        }

        // If no user record found, or user is super_admin, grant full access
        if (! $user || $user->is_super_admin) {
            $request->attributes->set('current_user', $user);
            return $next($request);
        }

        // If user is inactive
        if (! $user->is_active) {
            return response()->json([
                'message' => 'Your staff user account has been disabled.',
            ], 403);
        }

        // Check if user has ANY of the specified permissions
        $hasAny = false;
        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                $hasAny = true;
                break;
            }
        }

        if (! $hasAny) {
            $required = implode(', ', $permissions);
            return response()->json([
                'message' => "Access Denied: You do not have permission ({$required}) to perform this action.",
                'permission_required' => $permissions,
            ], 403);
        }

        $request->attributes->set('current_user', $user);
        return $next($request);
    }
}
