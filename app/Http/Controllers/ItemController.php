<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ItemController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * List items for the current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $query = Item::where('tenant_id', $tenant->id)->with('itemStocks');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->query('category') !== 'All') {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('brand') && $request->query('brand') !== 'All') {
            $query->where('brand', $request->query('brand'));
        }

        if ($request->filled('type') && $request->query('type') !== 'all') {
            $query->where('type', $request->query('type'));
        }

        $items = $query->orderBy('name')->get();

        $categories = Item::where('tenant_id', $tenant->id)
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category');

        $brands = Item::where('tenant_id', $tenant->id)
            ->whereNotNull('brand')
            ->distinct()
            ->pluck('brand');

        return response()->json([
            'items' => $items,
            'categories' => $categories,
            'brands' => $brands,
        ]);
    }

    /**
     * Store new Item.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'hsn_sac' => 'nullable|string|max:30',
            'brand' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
            'purchase_price' => 'nullable|numeric|min:0',
            'price' => 'required|numeric|min:0',
            'gst_percent' => 'nullable|numeric|min:0|max:100',
            'barcode' => 'nullable|string|max:100',
            'image_url' => 'nullable|string',
            'type' => 'nullable|in:general,grouped',
            'grouped_items' => 'nullable|array',
            'stock_quantity' => 'nullable|numeric|min:0',
            'min_stock_alert' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:30',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'nullable|boolean',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $shortName = ! empty($validated['short_name']) ? strtoupper(trim($validated['short_name'])) : null;
        $barcode = ! empty($validated['barcode']) ? trim($validated['barcode']) : null;

        $item = Item::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'short_name' => $shortName,
            'hsn_sac' => $validated['hsn_sac'] ?? null,
            'brand' => $validated['brand'] ?? null,
            'category' => $validated['category'] ?? 'General',
            'purchase_price' => $validated['purchase_price'] ?? 0.00,
            'price' => $validated['price'],
            'gst_percent' => $validated['gst_percent'] ?? 0.00,
            'barcode' => $barcode,
            'image_url' => $validated['image_url'] ?? null,
            'type' => $validated['type'] ?? 'general',
            'grouped_items' => $validated['grouped_items'] ?? null,
            'stock_quantity' => $validated['stock_quantity'] ?? 0.00,
            'min_stock_alert' => $validated['min_stock_alert'] ?? 5.00,
            'unit' => $validated['unit'] ?? 'Pcs',
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // If initial stock was provided, assign to default branch
        if (! empty($validated['stock_quantity']) && (float)$validated['stock_quantity'] > 0) {
            $branchId = $validated['branch_id'] ?? Branch::where('tenant_id', $tenant->id)->first()?->id;
            if ($branchId) {
                ItemStock::updateOrCreate(
                    ['tenant_id' => $tenant->id, 'branch_id' => $branchId, 'item_id' => $item->id],
                    ['quantity' => $validated['stock_quantity']]
                );
            }
        }

        return response()->json([
            'message' => 'Item added successfully',
            'item' => $item->load('itemStocks'),
        ], 201);
    }

    /**
     * Update Item.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $item = Item::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'hsn_sac' => 'nullable|string|max:30',
            'brand' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
            'purchase_price' => 'nullable|numeric|min:0',
            'price' => 'required|numeric|min:0',
            'gst_percent' => 'nullable|numeric|min:0|max:100',
            'barcode' => 'nullable|string|max:100',
            'image_url' => 'nullable|string',
            'type' => 'nullable|in:general,grouped',
            'grouped_items' => 'nullable|array',
            'stock_quantity' => 'nullable|numeric',
            'min_stock_alert' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:30',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'nullable|boolean',
        ]);

        $shortName = ! empty($validated['short_name']) ? strtoupper(trim($validated['short_name'])) : null;
        $barcode = ! empty($validated['barcode']) ? trim($validated['barcode']) : null;

        $item->update([
            'name' => $validated['name'],
            'short_name' => $shortName,
            'hsn_sac' => $validated['hsn_sac'] ?? $item->hsn_sac,
            'brand' => $validated['brand'] ?? $item->brand,
            'category' => $validated['category'] ?? $item->category,
            'purchase_price' => $validated['purchase_price'] ?? $item->purchase_price,
            'price' => $validated['price'],
            'gst_percent' => $validated['gst_percent'] ?? $item->gst_percent ?? 0.00,
            'barcode' => $barcode,
            'image_url' => array_key_exists('image_url', $validated) ? $validated['image_url'] : $item->image_url,
            'type' => $validated['type'] ?? $item->type,
            'grouped_items' => $validated['grouped_items'] ?? $item->grouped_items,
            'stock_quantity' => array_key_exists('stock_quantity', $validated) ? $validated['stock_quantity'] : $item->stock_quantity,
            'min_stock_alert' => $validated['min_stock_alert'] ?? $item->min_stock_alert,
            'unit' => $validated['unit'] ?? $item->unit,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Item updated successfully',
            'item' => $item->fresh()->load('itemStocks'),
        ]);
    }

    /**
     * Delete Item.
     */
    public function destroy($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $item = Item::where('tenant_id', $tenant->id)->findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Item removed successfully',
        ]);
    }
}
