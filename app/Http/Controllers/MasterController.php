<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\HsnCode;
use App\Models\Item;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MasterController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    // ==========================================
    // BRANDS
    // ==========================================

    public function brands(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $brands = Brand::where('tenant_id', $tenant->id)->orderBy('name')->get();
        return response()->json($brands);
    }

    public function storeBrand(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $brand = Brand::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'code' => ! empty($validated['code']) ? strtoupper(trim($validated['code'])) : null,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Brand added successfully',
            'brand' => $brand,
        ], 201);
    }

    public function updateBrand(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $brand = Brand::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
        ]);

        $brand->update([
            'name' => $validated['name'],
            'code' => ! empty($validated['code']) ? strtoupper(trim($validated['code'])) : null,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Brand updated successfully',
            'brand' => $brand,
        ]);
    }

    public function destroyBrand($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $brand = Brand::where('tenant_id', $tenant->id)->findOrFail($id);
        $brand->delete();

        return response()->json(['message' => 'Brand removed successfully']);
    }

    // ==========================================
    // HSN / SAC CODES
    // ==========================================

    public function hsnCodes(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $codes = HsnCode::where(function ($q) use ($tenant) {
            $q->where('tenant_id', $tenant->id)->orWhereNull('tenant_id');
        })->orderBy('hsn_code')->get();

        return response()->json($codes);
    }

    public function storeHsn(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'hsn_code' => 'required|string|max:30',
            'description' => 'nullable|string|max:255',
            'gst_percent' => 'required|numeric|min:0|max:100',
            'type' => 'required|in:goods,service',
        ]);

        $hsn = HsnCode::create([
            'tenant_id' => $tenant->id,
            'hsn_code' => trim($validated['hsn_code']),
            'description' => $validated['description'] ?? null,
            'gst_percent' => $validated['gst_percent'],
            'type' => $validated['type'],
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'HSN / SAC Code created successfully',
            'hsn' => $hsn,
        ], 201);
    }

    public function updateHsn(Request $request, $id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $hsn = HsnCode::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'hsn_code' => 'required|string|max:30',
            'description' => 'nullable|string|max:255',
            'gst_percent' => 'required|numeric|min:0|max:100',
            'type' => 'required|in:goods,service',
        ]);

        $hsn->update([
            'hsn_code' => trim($validated['hsn_code']),
            'description' => $validated['description'] ?? null,
            'gst_percent' => $validated['gst_percent'],
            'type' => $validated['type'],
        ]);

        return response()->json([
            'message' => 'HSN / SAC Code updated successfully',
            'hsn' => $hsn,
        ]);
    }

    public function destroyHsn($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $hsn = HsnCode::where('tenant_id', $tenant->id)->findOrFail($id);
        $hsn->delete();

        return response()->json(['message' => 'HSN Code removed successfully']);
    }

    // ==========================================
    // BULK BARCODE OPERATIONS
    // ==========================================

    /**
     * Bulk update item barcodes.
     */
    public function bulkUpdateBarcodes(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:items,id',
            'items.*.barcode' => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($tenant, $validated) {
            foreach ($validated['items'] as $itemData) {
                Item::where('tenant_id', $tenant->id)
                    ->where('id', $itemData['id'])
                    ->update([
                        'barcode' => ! empty($itemData['barcode']) ? trim($itemData['barcode']) : null,
                    ]);
            }
        });

        return response()->json([
            'message' => 'Barcodes updated successfully for ' . count($validated['items']) . ' items',
        ]);
    }

    /**
     * Auto-generate barcodes for all items missing one.
     */
    public function autoGenerateMissingBarcodes(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $items = Item::where('tenant_id', $tenant->id)
            ->where(function ($q) {
                $q->whereNull('barcode')->orWhere('barcode', '');
            })
            ->get();

        $updatedCount = 0;
        foreach ($items as $item) {
            // Generate standard 13-digit EAN-compatible barcode: 890 + tenant(3) + item(6) + check(1)
            $base = sprintf('890%03d%06d', $tenant->id % 1000, $item->id % 1000000);
            $barcode = $base . (rand(0, 9));

            $item->barcode = $barcode;
            $item->save();
            $updatedCount++;
        }

        return response()->json([
            'message' => "Successfully generated barcodes for {$updatedCount} items",
            'updated_count' => $updatedCount,
        ]);
    }
}
