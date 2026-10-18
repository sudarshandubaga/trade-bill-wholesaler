<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChallanController extends Controller
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

        $query = Challan::where('tenant_id', $tenant->id)
            ->with(['branch', 'targetBranch', 'items.item'])
            ->orderBy('id', 'desc');

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $challans = $query->paginate(min(250, (int) $request->query('per_page', 50)));

        return response()->json($challans);
    }

    public function show($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $challan = Challan::where('tenant_id', $tenant->id)
            ->with(['branch', 'targetBranch', 'items.item'])
            ->findOrFail($id);

        return response()->json($challan);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'target_branch_id' => 'nullable|exists:branches,id',
            'challan_date' => 'required|date',
            'type' => 'required|in:inward,outward',
            'purpose' => 'nullable|string|max:100',
            'party_name' => 'nullable|string|max:255',
            'vehicle_no' => 'nullable|string|max:50',
            'status' => 'required|in:completed,pending,in_transit',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'nullable|exists:items,id',
            'items.*.item_name' => 'required|string',
            'items.*.barcode' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.rate' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($tenant, $validated) {
            $datePrefix = Carbon::now()->format('Ym');
            $countToday = Challan::where('tenant_id', $tenant->id)
                ->where('challan_no', 'like', "CHL-{$datePrefix}-%")
                ->count() + 1;
            $challanNo = sprintf('CHL-%s-%04d', $datePrefix, $countToday);

            $totalQty = 0;
            $totalVal = 0;
            foreach ($validated['items'] as $it) {
                $q = (float)$it['quantity'];
                $r = (float)($it['rate'] ?? 0);
                $totalQty += $q;
                $totalVal += ($q * $r);
            }

            $user = Auth::guard('web')->user();

            $challan = Challan::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $validated['branch_id'],
                'target_branch_id' => $validated['target_branch_id'] ?? null,
                'challan_no' => $challanNo,
                'challan_date' => $validated['challan_date'],
                'type' => $validated['type'],
                'purpose' => $validated['purpose'] ?? 'transfer',
                'party_name' => $validated['party_name'] ?? null,
                'vehicle_no' => $validated['vehicle_no'] ?? null,
                'status' => $validated['status'],
                'total_quantity' => $totalQty,
                'total_value' => $totalVal,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user ? $user->name : 'Staff',
            ]);

            foreach ($validated['items'] as $it) {
                $q = (float)$it['quantity'];
                $r = (float)($it['rate'] ?? 0);

                ChallanItem::create([
                    'challan_id' => $challan->id,
                    'item_id' => $it['item_id'] ?? null,
                    'item_name' => $it['item_name'],
                    'barcode' => $it['barcode'] ?? null,
                    'quantity' => $q,
                    'rate' => $r,
                    'total' => round($q * $r, 2),
                ]);

                // Maintain Stock
                if (! empty($it['item_id']) && $validated['status'] === 'completed') {
                    $item = Item::where('tenant_id', $tenant->id)->find($it['item_id']);
                    if ($item) {
                        $sourceBranchId = $validated['branch_id'];
                        $targetBranchId = $validated['target_branch_id'] ?? null;

                        if ($validated['type'] === 'inward') {
                            // Inward: Add stock to branch
                            $item->stock_quantity = (float)$item->stock_quantity + $q;
                            $item->save();

                            $stock = ItemStock::firstOrNew([
                                'tenant_id' => $tenant->id,
                                'branch_id' => $sourceBranchId,
                                'item_id' => $item->id,
                            ]);
                            $stock->quantity = (float)($stock->quantity ?? 0) + $q;
                            $stock->save();
                        } elseif ($validated['type'] === 'outward') {
                            // Outward: Deduct stock from source branch
                            $item->stock_quantity = max(0, (float)$item->stock_quantity - $q);
                            $item->save();

                            $stock = ItemStock::firstOrNew([
                                'tenant_id' => $tenant->id,
                                'branch_id' => $sourceBranchId,
                                'item_id' => $item->id,
                            ]);
                            $stock->quantity = max(0, (float)($stock->quantity ?? 0) - $q);
                            $stock->save();

                            // If Inter-branch transfer, add to target branch!
                            if ($targetBranchId) {
                                $targetStock = ItemStock::firstOrNew([
                                    'tenant_id' => $tenant->id,
                                    'branch_id' => $targetBranchId,
                                    'item_id' => $item->id,
                                ]);
                                $targetStock->quantity = (float)($targetStock->quantity ?? 0) + $q;
                                $targetStock->save();
                            }
                        }
                    }
                }
            }

            return response()->json([
                'message' => "Challan {$challanNo} generated successfully",
                'challan' => $challan->load(['branch', 'targetBranch', 'items']),
            ], 201);
        });
    }
}
