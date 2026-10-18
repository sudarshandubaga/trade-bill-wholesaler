<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class VoucherController extends Controller
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

        $query = Voucher::where('tenant_id', $tenant->id)->with('branch')->orderBy('id', 'desc');

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('party_type') && $request->party_type !== 'all') {
            $query->where('party_type', $request->party_type);
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('voucher_no', 'like', "%{$search}%")
                  ->orWhere('party_name', 'like', "%{$search}%")
                  ->orWhere('reference_no', 'like', "%{$search}%");
            });
        }

        $vouchers = $query->paginate(min(250, (int) $request->query('per_page', 50)));

        return response()->json($vouchers);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'voucher_date' => 'required|date',
            'type' => 'required|in:payment,receipt',
            'party_type' => 'nullable|in:customer,supplier,expense,other',
            'party_id' => 'nullable|integer',
            'party_name' => 'required|string|max:255',
            'payment_mode' => 'nullable|in:cash,bank,upi,cheque',
            'reference_no' => 'nullable|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'narration' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($tenant, $validated) {
            $datePrefix = Carbon::now()->format('Ym');
            $countToday = Voucher::where('tenant_id', $tenant->id)
                ->where('voucher_no', 'like', "VCH-{$datePrefix}-%")
                ->count() + 1;
            $voucherNo = sprintf('VCH-%s-%04d', $datePrefix, $countToday);

            $user = Auth::guard('web')->user();
            $amount = (float)$validated['amount'];

            $partyType = $validated['party_type'] ?? ($validated['type'] === 'receipt' ? 'customer' : 'supplier');

            // Default branch to main/head branch if not explicitly given
            $headBranch = \App\Models\Branch::where('tenant_id', $tenant->id)
                ->where(function ($q) {
                    $q->where('is_head', true)->orWhere('is_primary', true);
                })->first() ?? \App\Models\Branch::where('tenant_id', $tenant->id)->first();
            $branchId = ! empty($validated['branch_id']) ? $validated['branch_id'] : $headBranch?->id;

            $voucher = Voucher::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branchId,
                'voucher_no' => $voucherNo,
                'voucher_date' => $validated['voucher_date'],
                'type' => $validated['type'],
                'party_type' => $partyType,
                'party_id' => $validated['party_id'] ?? null,
                'party_name' => $validated['party_name'],
                'payment_mode' => $validated['payment_mode'] ?? 'cash',
                'reference_no' => $validated['reference_no'] ?? null,
                'amount' => $amount,
                'narration' => $validated['narration'] ?? null,
                'created_by' => $user ? $user->name : 'Staff',
            ]);

            // Adjust party ledger balances
            if ($partyType === 'supplier' && ! empty($validated['party_id'])) {
                $supplier = Supplier::where('tenant_id', $tenant->id)->find($validated['party_id']);
                if ($supplier) {
                    if ($validated['type'] === 'payment') {
                        // Payment to supplier reduces amount owed
                        $supplier->current_balance = (float)$supplier->current_balance - $amount;
                    } elseif ($validated['type'] === 'receipt') {
                        // Refund from supplier
                        $supplier->current_balance = (float)$supplier->current_balance + $amount;
                    }
                    $supplier->save();
                }
            } elseif ($partyType === 'customer' && ! empty($validated['party_id'])) {
                $customer = Customer::where('tenant_id', $tenant->id)->find($validated['party_id']);
                if ($customer) {
                    if ($validated['type'] === 'receipt') {
                        // Customer paid money: reduces receivable balance
                        $customer->current_balance = (float)$customer->current_balance - $amount;
                    } elseif ($validated['type'] === 'payment') {
                        // Refund to customer
                        $customer->current_balance = (float)$customer->current_balance + $amount;
                    }
                    $customer->save();
                }
            }

            return response()->json([
                'message' => "Voucher {$voucherNo} created successfully",
                'voucher' => $voucher->load('branch'),
            ], 201);
        });
    }
}
