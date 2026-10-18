<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * List purchases.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $query = Purchase::where('tenant_id', $tenant->id)
            ->with(['branch', 'supplier', 'items'])
            ->orderBy('id', 'desc');

        if ($request->filled('purchase_type') && $request->purchase_type !== 'all') {
            $query->where('purchase_type', $request->purchase_type);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('purchase_no', 'like', "%{$search}%")
                  ->orWhere('supplier_bill_no', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%");
            });
        }

        $purchases = $query->paginate(min(250, (int) $request->query('per_page', 50)));

        return response()->json($purchases);
    }

    /**
     * Show single purchase.
     */
    public function show($id): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $purchase = Purchase::where('tenant_id', $tenant->id)
            ->with(['branch', 'supplier', 'items.item'])
            ->findOrFail($id);

        return response()->json($purchase);
    }

    /**
     * Store new Purchase with stock & ledger auto-update.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'supplier_name' => 'nullable|string|max:255',
            'supplier_bill_no' => 'nullable|string|max:100',
            'purchase_date' => 'required|date',
            'purchase_type' => 'required|in:intra_state,inter_state,unregistered',
            'payment_status' => 'required|in:Paid,Partial,Unpaid',
            'payment_method' => 'required|string',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'nullable|exists:items,id',
            'items.*.item_name' => 'required|string',
            'items.*.barcode' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.purchase_price' => 'required|numeric|min:0',
            'items.*.gst_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        return DB::transaction(function () use ($tenant, $validated) {
            $branchId = $validated['branch_id'] ?? Branch::where('tenant_id', $tenant->id)->first()?->id;

            $subtotal = 0;
            $totalTax = 0;
            $cgst = 0;
            $sgst = 0;
            $igst = 0;

            $purchaseType = $validated['purchase_type'];

            foreach ($validated['items'] as $it) {
                $lineSubtotal = (float)$it['quantity'] * (float)$it['purchase_price'];
                $subtotal += $lineSubtotal;

                $gstRate = ($purchaseType === 'unregistered') ? 0.00 : (float)($it['gst_percent'] ?? 0);
                $lineTax = ($lineSubtotal * $gstRate) / 100;
                $totalTax += $lineTax;

                if ($purchaseType === 'intra_state') {
                    $cgst += ($lineTax / 2);
                    $sgst += ($lineTax / 2);
                } elseif ($purchaseType === 'inter_state') {
                    $igst += $lineTax;
                }
            }

            $discount = (float)($validated['discount_amount'] ?? 0);
            $totalAmount = max(0, round($subtotal - $discount + $totalTax, 2));
            $paidAmount = isset($validated['paid_amount']) ? (float)$validated['paid_amount'] : ($validated['payment_status'] === 'Paid' ? $totalAmount : 0);

            // Generate sequence purchase number: PUR-YYYYMM-XXXX
            $datePrefix = Carbon::now()->format('Ym');
            $countToday = Purchase::where('tenant_id', $tenant->id)
                ->where('purchase_no', 'like', "PUR-{$datePrefix}-%")
                ->count() + 1;
            $purchaseNo = sprintf('PUR-%s-%04d', $datePrefix, $countToday);

            // Get supplier name
            $supplierName = $validated['supplier_name'] ?? null;
            $supplier = null;
            if (! empty($validated['supplier_id'])) {
                $supplier = Supplier::where('tenant_id', $tenant->id)->find($validated['supplier_id']);
                if ($supplier) {
                    $supplierName = $supplier->name;
                }
            }

            $user = Auth::guard('web')->user();
            $createdByName = $user ? $user->name : 'Super Admin';

            $purchase = Purchase::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branchId,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'supplier_name' => $supplierName,
                'purchase_no' => $purchaseNo,
                'supplier_bill_no' => $validated['supplier_bill_no'] ?? null,
                'purchase_date' => $validated['purchase_date'],
                'purchase_type' => $purchaseType,
                'subtotal' => $subtotal,
                'cgst_amount' => round($cgst, 2),
                'sgst_amount' => round($sgst, 2),
                'igst_amount' => round($igst, 2),
                'tax_amount' => round($totalTax, 2),
                'discount_amount' => $discount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'payment_status' => $validated['payment_status'],
                'payment_method' => $validated['payment_method'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $createdByName,
            ]);

            // Save line items & INCREMENT STOCK
            foreach ($validated['items'] as $it) {
                $lineSubtotal = (float)$it['quantity'] * (float)$it['purchase_price'];
                $gstRate = ($purchaseType === 'unregistered') ? 0.00 : (float)($it['gst_percent'] ?? 0);
                $lineTax = ($lineSubtotal * $gstRate) / 100;

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'item_id' => $it['item_id'] ?? null,
                    'item_name' => $it['item_name'],
                    'barcode' => $it['barcode'] ?? null,
                    'quantity' => $it['quantity'],
                    'purchase_price' => $it['purchase_price'],
                    'gst_percent' => $gstRate,
                    'tax_amount' => round($lineTax, 2),
                    'total_price' => round($lineSubtotal + $lineTax, 2),
                ]);

                // Maintain Stock: Increase item stock
                if (! empty($it['item_id'])) {
                    $itemModel = Item::where('tenant_id', $tenant->id)->find($it['item_id']);
                    if ($itemModel) {
                        $itemModel->stock_quantity = (float)$itemModel->stock_quantity + (float)$it['quantity'];
                        // Also update purchase price if newer
                        $itemModel->purchase_price = (float)$it['purchase_price'];
                        $itemModel->save();

                        // Update branch stock in item_stocks
                        if ($branchId) {
                            $stockRec = ItemStock::firstOrNew([
                                'tenant_id' => $tenant->id,
                                'branch_id' => $branchId,
                                'item_id' => $itemModel->id,
                            ]);
                            $stockRec->quantity = (float)($stockRec->quantity ?? 0) + (float)$it['quantity'];
                            $stockRec->save();
                        }
                    }
                }
            }

            // Adjust supplier balance for unpaid / credit portion
            $unpaidBalance = $totalAmount - $paidAmount;
            if ($supplier && $unpaidBalance > 0) {
                $supplier->current_balance = (float)$supplier->current_balance + $unpaidBalance;
                $supplier->save();
            }

            return response()->json([
                'message' => "Purchase {$purchaseNo} saved successfully. Inventory updated.",
                'purchase' => $purchase->load(['branch', 'supplier', 'items']),
            ], 201);
        });
    }
}
