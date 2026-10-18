<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantAuthenticated
{
    /**
     * Handle an incoming request.
     * Ensures that only authenticated tenants can access protected routes.
     * Unauthenticated API calls will receive a 401 Unauthorized response.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::guard('web')->check()) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated. You must be logged in to access this garage resource.',
                    'authenticated' => false,
                ], 401);
            }

            return redirect('/');
        }

        $tenant = Auth::guard('web')->user();
        $request->attributes->set('tenant', $tenant);

        return $next($request);
    }
}
