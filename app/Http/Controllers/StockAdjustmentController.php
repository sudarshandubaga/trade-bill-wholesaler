<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\StockAdjustment;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StockAdjustmentController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $query = StockAdjustment::where('tenant_id', $tenant->id)
            ->with(['branch', 'item'])
            ->orderBy('id', 'desc');

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $adjustments = $query->paginate(min(250, (int) $request->query('per_page', 50)));

        return response()->json($adjustments);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'item_id' => 'required|exists:items,id',
            'type' => 'required|in:dump,damaged,expired,wastage,manual_adjustment',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:500',
        ]);

        return DB::transaction(function () use ($tenant, $validated) {
            $item = Item::where('tenant_id', $tenant->id)->findOrFail($validated['item_id']);
            $branchId = $validated['branch_id'];
            $qty = (float)$validated['quantity'];
            $user = Auth::guard('web')->user();

            $adjustment = StockAdjustment::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branchId,
                'item_id' => $item->id,
                'item_name' => $item->name,
                'type' => $validated['type'],
                'quantity' => $qty,
                'item_cost' => (float)($item->purchase_price ?? 0),
                'reason' => $validated['reason'],
                'created_by' => $user ? $user->name : 'Staff',
            ]);

            // Deduct stock from item and branch
            $item->stock_quantity = max(0, (float)$item->stock_quantity - $qty);
            $item->save();

            $branchStock = ItemStock::firstOrNew([
                'tenant_id' => $tenant->id,
                'branch_id' => $branchId,
                'item_id' => $item->id,
            ]);
            $branchStock->quantity = max(0, (float)($branchStock->quantity ?? 0) - $qty);
            $branchStock->save();

            return response()->json([
                'message' => "Stock adjustment logged. {$qty} units deducted from inventory.",
                'adjustment' => $adjustment->load(['branch', 'item']),
            ], 201);
        });
    }
}
