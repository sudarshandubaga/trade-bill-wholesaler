<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * List sales/invoices for the current tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $query = Sale::where('tenant_id', $tenant->id)
            ->with(['customer', 'branch', 'items'])
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('mobile_no', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('payment_method') && $request->query('payment_method') !== 'All') {
            $query->where('payment_method', $request->query('payment_method'));
        }

        $perPage = min(250, (int) $request->query('per_page', 100));
        $sales = $query->paginate($perPage);

        return response()->json($sales);
    }

    /**
     * Get single sale/invoice with full itemized breakdown.
     */
    public function show($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $sale = Sale::where('tenant_id', $tenant->id)
            ->with(['customer', 'branch', 'items', 'tenant'])
            ->findOrFail($id);

        return response()->json($sale);
    }

    /**
     * Store new POS Sale & Billing.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'nullable|exists:items,id',
            'items.*.item_name' => 'required|string',
            'items.*.short_name' => 'nullable|string',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.gst_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.total_price' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'points_redeemed' => 'nullable|numeric|min:0',
            'points_discount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|string',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($tenant, $validated) {
            $branchId = $validated['branch_id']
                ?? session('active_branch_id')
                ?? Branch::where('tenant_id', $tenant->id)->first()?->id;

            $subtotal = 0;

            foreach ($validated['items'] as $it) {
                $lineGross = ((float)$it['unit_price'] * (float)$it['quantity']);
                $lineDiscPct = isset($it['discount_percent']) ? (float)$it['discount_percent'] : 0;
                $lineDiscAmt = isset($it['discount_amount'])
                    ? (float)$it['discount_amount']
                    : round(($lineGross * $lineDiscPct) / 100, 2);
                $lineNet = max(0, $lineGross - $lineDiscAmt);
                $subtotal += $lineNet;
            }

            $manualDiscount = (float) ($validated['discount_amount'] ?? 0);
            $totalDiscount = $manualDiscount;
            $pointsRedeemed = 0.00;
            $pointsDiscount = 0.00;
            $pointsEarned = 0.00;

            // Zero GST for wholesale billing
            $tax = 0.00;
            $cgst = 0.00;
            $sgst = 0.00;
            $igst = 0.00;

            $taxableSubtotalAfterDiscount = max(0, $subtotal - $totalDiscount);
            $totalAmount = round($taxableSubtotalAfterDiscount, 2);

            $customer = null;
            if (! empty($validated['customer_id'])) {
                $customer = Customer::where('tenant_id', $tenant->id)->find($validated['customer_id']);
            }

            // Sequence Invoice Number: INV-YYYYMM-XXXX
            $datePrefix = Carbon::now()->format('Ym');
            $countToday = Sale::where('tenant_id', $tenant->id)
                ->where('invoice_no', 'like', "INV-{$datePrefix}-%")
                ->count() + 1;
            $invoiceNo = sprintf('INV-%s-%04d', $datePrefix, $countToday);

            $user = Auth::guard('web')->user();
            $createdByName = $user ? $user->name : 'POS Counter';

            $sale = Sale::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branchId,
                'customer_id' => $validated['customer_id'] ?? null,
                'invoice_no' => $invoiceNo,
                'subtotal' => $subtotal,
                'tax_amount' => 0.00,
                'cgst_amount' => 0.00,
                'sgst_amount' => 0.00,
                'igst_amount' => 0.00,
                'discount_amount' => $totalDiscount,
                'points_earned' => $pointsEarned,
                'points_redeemed' => $pointsRedeemed,
                'points_discount' => $pointsDiscount,
                'total_amount' => $totalAmount,
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'Paid',
                'paid_amount' => $validated['paid_amount'] ?? $totalAmount,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $createdByName,
            ]);

            // Save Sale Items and DEDUCT INVENTORY
            foreach ($validated['items'] as $it) {
                $lineGross = ((float)$it['unit_price'] * (float)$it['quantity']);
                $lineDiscPct = isset($it['discount_percent']) ? (float)$it['discount_percent'] : 0;
                $lineDiscAmt = isset($it['discount_amount'])
                    ? (float)$it['discount_amount']
                    : round(($lineGross * $lineDiscPct) / 100, 2);
                $lineNet = max(0, $lineGross - $lineDiscAmt);

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'item_id' => $it['item_id'] ?? null,
                    'item_name' => $it['item_name'],
                    'short_name' => $it['short_name'] ?? null,
                    'unit_price' => $it['unit_price'],
                    'discount_percent' => $lineDiscPct,
                    'discount_amount' => $lineDiscAmt,
                    'quantity' => $it['quantity'],
                    'gst_percent' => 0.00,
                    'tax_amount' => 0.00,
                    'total_price' => $lineNet,
                ]);

                // Maintain Stock: Deduct from inventory
                if (! empty($it['item_id'])) {
                    $itemModel = Item::where('tenant_id', $tenant->id)->find($it['item_id']);
                    if ($itemModel) {
                        $soldQty = (float)$it['quantity'];

                        if ($itemModel->type === 'grouped' && ! empty($itemModel->grouped_items)) {
                            // Deduct inventory for all child items in combo
                            foreach ($itemModel->grouped_items as $child) {
                                $childItemId = $child['item_id'] ?? null;
                                $childQtyPerBundle = (float)($child['quantity'] ?? 1);
                                $totalDeduct = $soldQty * $childQtyPerBundle;

                                if ($childItemId) {
                                    $childItem = Item::where('tenant_id', $tenant->id)->find($childItemId);
                                    if ($childItem) {
                                        $childItem->stock_quantity = max(0, (float)$childItem->stock_quantity - $totalDeduct);
                                        $childItem->save();

                                        if ($branchId) {
                                            $cStock = ItemStock::firstOrNew([
                                                'tenant_id' => $tenant->id,
                                                'branch_id' => $branchId,
                                                'item_id' => $childItem->id,
                                            ]);
                                            $cStock->quantity = max(0, (float)($cStock->quantity ?? 0) - $totalDeduct);
                                            $cStock->save();
                                        }
                                    }
                                }
                            }
                        } else {
                            // Standard general item deduction
                            $itemModel->stock_quantity = max(0, (float)$itemModel->stock_quantity - $soldQty);
                            $itemModel->save();

                            if ($branchId) {
                                $stockRec = ItemStock::firstOrNew([
                                    'tenant_id' => $tenant->id,
                                    'branch_id' => $branchId,
                                    'item_id' => $itemModel->id,
                                ]);
                                $stockRec->quantity = max(0, (float)($stockRec->quantity ?? 0) - $soldQty);
                                $stockRec->save();
                            }
                        }
                    }
                }
            }

            $freshSale = $sale->load(['customer', 'branch', 'items', 'tenant']);

            return response()->json([
                'message' => 'Invoice ' . $invoiceNo . ' generated successfully!',
                'sale' => $freshSale,
            ], 201);
        });
    }
}
