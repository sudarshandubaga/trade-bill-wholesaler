<?php

namespace App\Http\Controllers;

use App\Models\CreditDebitNote;
use App\Models\CreditDebitNoteItem;
use App\Models\Customer;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\Supplier;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreditDebitNoteController extends Controller
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

        $query = CreditDebitNote::where('tenant_id', $tenant->id)
            ->with(['branch', 'items.item'])
            ->orderBy('id', 'desc');

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('note_no', 'like', "%{$search}%")
                  ->orWhere('party_name', 'like', "%{$search}%")
                  ->orWhere('original_invoice_no', 'like', "%{$search}%");
            });
        }

        $notes = $query->paginate(min(250, (int) $request->query('per_page', 50)));

        return response()->json($notes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'note_date' => 'required|date',
            'type' => 'required|in:credit_note,debit_note',
            'party_type' => 'required|in:customer,supplier',
            'party_id' => 'nullable|integer',
            'party_name' => 'required|string|max:255',
            'original_invoice_no' => 'nullable|string|max:100',
            'reason' => 'nullable|string|max:255',
            'discount_amount' => 'nullable|numeric|min:0',
            'affects_stock' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'nullable|exists:items,id',
            'items.*.item_name' => 'required|string',
            'items.*.barcode' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.gst_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        return DB::transaction(function () use ($tenant, $validated) {
            $datePrefix = Carbon::now()->format('Ym');
            $prefix = ($validated['type'] === 'credit_note') ? 'CN' : 'DN';

            $countToday = CreditDebitNote::where('tenant_id', $tenant->id)
                ->where('note_no', 'like', "{$prefix}-{$datePrefix}-%")
                ->count() + 1;
            $noteNo = sprintf('%s-%s-%04d', $prefix, $datePrefix, $countToday);

            $subtotal = 0;
            foreach ($validated['items'] as $it) {
                $lineGross = (float)$it['quantity'] * (float)$it['unit_price'];
                $discAmt = 0.00;
                $discPct = 0.00;
                if (isset($it['discount_amount']) && (float)$it['discount_amount'] > 0) {
                    $discAmt = min($lineGross, (float)$it['discount_amount']);
                    $discPct = $lineGross > 0 ? round(($discAmt / $lineGross) * 100, 2) : 0;
                } elseif (isset($it['discount_percent']) && (float)$it['discount_percent'] > 0) {
                    $discPct = min(100, (float)$it['discount_percent']);
                    $discAmt = round(($lineGross * $discPct) / 100, 2);
                }
                $lineNet = max(0, round($lineGross - $discAmt, 2));
                $subtotal += $lineNet;
            }

            $manualDiscount = (float)($validated['discount_amount'] ?? 0);
            $totalAmount = max(0, round($subtotal - $manualDiscount, 2));
            $affectsStock = $validated['affects_stock'] ?? true;
            $user = Auth::guard('web')->user();

            $note = CreditDebitNote::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $validated['branch_id'] ?? null,
                'note_no' => $noteNo,
                'note_date' => $validated['note_date'],
                'type' => $validated['type'],
                'party_type' => $validated['party_type'],
                'party_id' => $validated['party_id'] ?? null,
                'party_name' => $validated['party_name'],
                'original_invoice_no' => $validated['original_invoice_no'] ?? null,
                'reason' => $validated['reason'] ?? null,
                'subtotal' => round($subtotal, 2),
                'discount_amount' => $manualDiscount,
                'tax_amount' => 0.00,
                'total_amount' => $totalAmount,
                'affects_stock' => $affectsStock,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user ? $user->name : 'Staff',
            ]);

            $branchId = $validated['branch_id'];

            foreach ($validated['items'] as $it) {
                $lineGross = (float)$it['quantity'] * (float)$it['unit_price'];
                $discAmt = 0.00;
                $discPct = 0.00;
                if (isset($it['discount_amount']) && (float)$it['discount_amount'] > 0) {
                    $discAmt = min($lineGross, (float)$it['discount_amount']);
                    $discPct = $lineGross > 0 ? round(($discAmt / $lineGross) * 100, 2) : 0;
                } elseif (isset($it['discount_percent']) && (float)$it['discount_percent'] > 0) {
                    $discPct = min(100, (float)$it['discount_percent']);
                    $discAmt = round(($lineGross * $discPct) / 100, 2);
                }
                $lineNet = max(0, round($lineGross - $discAmt, 2));

                CreditDebitNoteItem::create([
                    'note_id' => $note->id,
                    'item_id' => $it['item_id'] ?? null,
                    'item_name' => $it['item_name'],
                    'barcode' => $it['barcode'] ?? null,
                    'quantity' => $it['quantity'],
                    'unit_price' => $it['unit_price'],
                    'discount_percent' => $discPct,
                    'discount_amount' => $discAmt,
                    'gst_percent' => 0.00,
                    'tax_amount' => 0.00,
                    'total_price' => $lineNet,
                ]);

                // Maintain Stock
                if ($affectsStock && ! empty($it['item_id'])) {
                    $item = Item::where('tenant_id', $tenant->id)->find($it['item_id']);
                    if ($item) {
                        $qty = (float)$it['quantity'];

                        if ($validated['type'] === 'credit_note') {
                            // Sales Return: Goods return back to store -> INCREASE stock!
                            $item->stock_quantity = (float)$item->stock_quantity + $qty;
                            $item->save();

                            if ($branchId) {
                                $stock = ItemStock::firstOrNew([
                                    'tenant_id' => $tenant->id,
                                    'branch_id' => $branchId,
                                    'item_id' => $item->id,
                                ]);
                                $stock->quantity = (float)($stock->quantity ?? 0) + $qty;
                                $stock->save();
                            }
                        } elseif ($validated['type'] === 'debit_note') {
                            // Purchase Return: Goods sent back to supplier -> DECREASE stock!
                            $item->stock_quantity = max(0, (float)$item->stock_quantity - $qty);
                            $item->save();

                            if ($branchId) {
                                $stock = ItemStock::firstOrNew([
                                    'tenant_id' => $tenant->id,
                                    'branch_id' => $branchId,
                                    'item_id' => $item->id,
                                ]);
                                $stock->quantity = max(0, (float)($stock->quantity ?? 0) - $qty);
                                $stock->save();
                            }
                        }
                    }
                }
            }

            // Adjust party ledger balance
            if ($validated['party_type'] === 'customer' && ! empty($validated['party_id'])) {
                $customer = Customer::where('tenant_id', $tenant->id)->find($validated['party_id']);
                if ($customer) {
                    // Credit Note reduces customer receivable
                    $customer->current_balance = (float)$customer->current_balance - $totalAmount;
                    $customer->save();
                }
            } elseif ($validated['party_type'] === 'supplier' && ! empty($validated['party_id'])) {
                $supplier = Supplier::where('tenant_id', $tenant->id)->find($validated['party_id']);
                if ($supplier) {
                    // Debit Note reduces amount payable to supplier
                    $supplier->current_balance = (float)$supplier->current_balance - $totalAmount;
                    $supplier->save();
                }
            }

            $label = ($validated['type'] === 'credit_note') ? 'Credit Note' : 'Debit Note';

            return response()->json([
                'message' => "{$label} {$noteNo} created successfully",
                'note' => $note->load(['branch', 'items']),
            ], 201);
        });
    }
}
