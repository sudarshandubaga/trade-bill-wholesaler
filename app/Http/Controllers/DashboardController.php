<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Item;
use App\Models\Sale;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        $tenant = Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());

        return $tenant;
    }

    /**
     * Dashboard statistics for the active motor service tenant.
     */
    public function stats(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $totalRevenue = (float) Sale::where('tenant_id', $tenant->id)->sum('total_amount');
        $todayRevenue = (float) Sale::where('tenant_id', $tenant->id)
            ->whereDate('created_at', Carbon::today())
            ->sum('total_amount');

        $totalSalesCount = Sale::where('tenant_id', $tenant->id)->count();
        $todaySalesCount = Sale::where('tenant_id', $tenant->id)
            ->whereDate('created_at', Carbon::today())
            ->count();

        $totalCustomers = Customer::where('tenant_id', $tenant->id)->count();
        $totalItems = Item::where('tenant_id', $tenant->id)->count();

        $recentSales = Sale::where('tenant_id', $tenant->id)
            ->with(['customer', 'items'])
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'tenant' => $tenant->fresh(),
            'total_revenue' => $totalRevenue,
            'today_revenue' => $todayRevenue,
            'total_sales_count' => $totalSalesCount,
            'today_sales_count' => $todaySalesCount,
            'total_customers' => $totalCustomers,
            'total_items' => $totalItems,
            'subscription' => [
                'plan' => $tenant->subscription_plan,
                'price' => $tenant->subscription_price,
                'expires_at' => $tenant->expires_at ? $tenant->expires_at->toIso8601String() : null,
                'expires_at_formatted' => $tenant->expires_at ? $tenant->expires_at->toFormattedDateString() : 'N/A',
                'days_remaining' => $tenant->days_remaining,
                'is_expired' => $tenant->is_expired,
                'status' => $tenant->subscription_status,
            ],
            'recent_sales' => $recentSales,
        ]);
    }
}
