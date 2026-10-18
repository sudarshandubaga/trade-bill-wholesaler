<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Challan;
use App\Models\CreditDebitNote;
use App\Models\Customer;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockAdjustment;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * 1. Purchase Reports
     */
    public function purchaseReports(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $startDate = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        $query = Purchase::where('tenant_id', $tenant->id)
            ->whereBetween('purchase_date', [$startDate, $endDate])
            ->with(['branch', 'supplier', 'items'])
            ->orderBy('purchase_date', 'desc');

        if ($request->filled('purchase_type') && $request->purchase_type !== 'all') {
            $query->where('purchase_type', $request->purchase_type);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $purchases = $query->get();

        $summary = [
            'count' => $purchases->count(),
            'subtotal' => $purchases->sum('subtotal'),
            'cgst' => $purchases->sum('cgst_amount'),
            'sgst' => $purchases->sum('sgst_amount'),
            'igst' => $purchases->sum('igst_amount'),
            'tax_total' => $purchases->sum('tax_amount'),
            'discount' => $purchases->sum('discount_amount'),
            'total_amount' => $purchases->sum('total_amount'),
            'paid_amount' => $purchases->sum('paid_amount'),
            'unpaid_amount' => $purchases->sum('total_amount') - $purchases->sum('paid_amount'),
        ];

        return response()->json([
            'purchases' => $purchases,
            'summary' => $summary,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * 2. Sale Reports
     */
    public function saleReports(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $startDate = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        $query = Sale::where('tenant_id', $tenant->id)
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->with(['customer', 'branch', 'items'])
            ->orderBy('id', 'desc');

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('payment_method') && $request->payment_method !== 'all') {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        $sales = $query->get();

        $summary = [
            'count' => $sales->count(),
            'subtotal' => $sales->sum('subtotal'),
            'tax_amount' => $sales->sum('tax_amount'),
            'discount_amount' => $sales->sum('discount_amount'),
            'total_amount' => $sales->sum('total_amount'),
            'by_payment_method' => $sales->groupBy('payment_method')->map(fn($g) => $g->sum('total_amount')),
        ];

        return response()->json([
            'sales' => $sales,
            'summary' => $summary,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * 3. Daybook: Chronological journal of all events on a specific date
     */
    public function daybook(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $date = $request->query('date', Carbon::now()->toDateString());

        // 1. Sales
        $sales = Sale::where('tenant_id', $tenant->id)
            ->whereDate('created_at', $date)
            ->with('customer')
            ->get()
            ->map(function ($s) {
                return [
                    'time' => $s->created_at->format('H:i'),
                    'type' => 'Sale',
                    'ref_no' => $s->invoice_no,
                    'particulars' => 'Sale to ' . ($s->customer?->name ?? 'Walk-in Customer'),
                    'mode' => $s->payment_method,
                    'money_in' => (float)$s->total_amount,
                    'money_out' => 0.00,
                    'user' => $s->created_by ?? 'Staff',
                ];
            });

        // 2. Purchases
        $purchases = Purchase::where('tenant_id', $tenant->id)
            ->whereDate('purchase_date', $date)
            ->get()
            ->map(function ($p) {
                return [
                    'time' => $p->created_at->format('H:i'),
                    'type' => 'Purchase',
                    'ref_no' => $p->purchase_no,
                    'particulars' => 'Purchase from ' . ($p->supplier_name ?? 'Vendor'),
                    'mode' => $p->payment_method,
                    'money_in' => 0.00,
                    'money_out' => (float)$p->paid_amount,
                    'user' => $p->created_by ?? 'Staff',
                ];
            });

        // 3. Vouchers
        $vouchers = Voucher::where('tenant_id', $tenant->id)
            ->whereDate('voucher_date', $date)
            ->get()
            ->map(function ($v) {
                return [
                    'time' => $v->created_at->format('H:i'),
                    'type' => ucfirst($v->type) . ' Voucher',
                    'ref_no' => $v->voucher_no,
                    'particulars' => ucfirst($v->type) . ' - ' . $v->party_name . ($v->narration ? " ({$v->narration})" : ''),
                    'mode' => strtoupper($v->payment_mode),
                    'money_in' => ($v->type === 'receipt') ? (float)$v->amount : 0.00,
                    'money_out' => ($v->type === 'payment') ? (float)$v->amount : 0.00,
                    'user' => $v->created_by ?? 'Staff',
                ];
            });

        // 4. Notes
        $notes = CreditDebitNote::where('tenant_id', $tenant->id)
            ->whereDate('note_date', $date)
            ->get()
            ->map(function ($n) {
                return [
                    'time' => $n->created_at->format('H:i'),
                    'type' => ($n->type === 'credit_note') ? 'Credit Note' : 'Debit Note',
                    'ref_no' => $n->note_no,
                    'particulars' => $n->party_name . ' (' . ($n->reason ?? 'Return') . ')',
                    'mode' => 'Ledger',
                    'money_in' => 0.00,
                    'money_out' => 0.00,
                    'user' => $n->created_by ?? 'Staff',
                ];
            });

        $entries = $sales->concat($purchases)->concat($vouchers)->concat($notes)->sortBy('time')->values();

        $totalIn = $entries->sum('money_in');
        $totalOut = $entries->sum('money_out');

        return response()->json([
            'date' => $date,
            'entries' => $entries,
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'net_flow' => $totalIn - $totalOut,
        ]);
    }

    /**
     * 4. Cashbook: All Cash IN & OUT
     */
    public function cashbook(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        // Cash Sales
        $cashSales = Sale::where('tenant_id', $tenant->id)
            ->where('payment_method', 'Cash')
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->with('customer')
            ->get()
            ->map(function ($s) {
                return [
                    'date' => $s->created_at->format('Y-m-d H:i'),
                    'type' => 'Cash Sale',
                    'ref' => $s->invoice_no,
                    'particulars' => 'Sale to ' . ($s->customer?->name ?? 'Walk-in Customer'),
                    'in' => (float)$s->total_amount,
                    'out' => 0.00,
                ];
            });

        // Cash Purchases
        $cashPurchases = Purchase::where('tenant_id', $tenant->id)
            ->where('payment_method', 'Cash')
            ->whereBetween('purchase_date', [$startDate, $endDate])
            ->get()
            ->map(function ($p) {
                return [
                    'date' => $p->purchase_date->format('Y-m-d'),
                    'type' => 'Cash Purchase',
                    'ref' => $p->purchase_no,
                    'particulars' => 'Purchase from ' . ($p->supplier_name ?? 'Vendor'),
                    'in' => 0.00,
                    'out' => (float)$p->paid_amount,
                ];
            });

        // Cash Vouchers
        $cashVouchers = Voucher::where('tenant_id', $tenant->id)
            ->where('payment_mode', 'cash')
            ->whereBetween('voucher_date', [$startDate, $endDate])
            ->get()
            ->map(function ($v) {
                return [
                    'date' => $v->voucher_date->format('Y-m-d'),
                    'type' => ucfirst($v->type) . ' Voucher',
                    'ref' => $v->voucher_no,
                    'particulars' => $v->party_name . ($v->narration ? " ({$v->narration})" : ''),
                    'in' => ($v->type === 'receipt') ? (float)$v->amount : 0.00,
                    'out' => ($v->type === 'payment') ? (float)$v->amount : 0.00,
                ];
            });

        $transactions = $cashSales->concat($cashPurchases)->concat($cashVouchers)->sortBy('date')->values();

        $running = 0;
        $withRunning = $transactions->map(function ($t) use (&$running) {
            $running += ($t['in'] - $t['out']);
            $t['balance'] = round($running, 2);
            return $t;
        });

        return response()->json([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'transactions' => $withRunning,
            'total_cash_in' => $transactions->sum('in'),
            'total_cash_out' => $transactions->sum('out'),
            'net_cash_balance' => round($running, 2),
        ]);
    }

    /**
     * 5. Bank Entry: Bank, UPI, Card transactions register
     */
    public function bankEntry(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $startDate = $request->query('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', Carbon::now()->endOfMonth()->toDateString());

        // Card & UPI Sales
        $digitalSales = Sale::where('tenant_id', $tenant->id)
            ->whereIn('payment_method', ['Card', 'UPI', 'Bank Transfer'])
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->with('customer')
            ->get()
            ->map(function ($s) {
                return [
                    'date' => $s->created_at->format('Y-m-d H:i'),
                    'mode' => $s->payment_method,
                    'ref' => $s->invoice_no,
                    'particulars' => 'POS Bill: ' . ($s->customer?->name ?? 'Customer'),
                    'deposit' => (float)$s->total_amount,
                    'withdrawal' => 0.00,
                ];
            });

        // Bank Purchases
        $bankPurchases = Purchase::where('tenant_id', $tenant->id)
            ->whereIn('payment_method', ['Bank Transfer', 'UPI'])
            ->whereBetween('purchase_date', [$startDate, $endDate])
            ->get()
            ->map(function ($p) {
                return [
                    'date' => $p->purchase_date->format('Y-m-d'),
                    'mode' => $p->payment_method,
                    'ref' => $p->purchase_no,
                    'particulars' => 'Supplier Bill: ' . ($p->supplier_name ?? 'Vendor'),
                    'deposit' => 0.00,
                    'withdrawal' => (float)$p->paid_amount,
                ];
            });

        // Bank Vouchers
        $bankVouchers = Voucher::where('tenant_id', $tenant->id)
            ->whereIn('payment_mode', ['bank', 'upi', 'cheque'])
            ->whereBetween('voucher_date', [$startDate, $endDate])
            ->get()
            ->map(function ($v) {
                return [
                    'date' => $v->voucher_date->format('Y-m-d'),
                    'mode' => strtoupper($v->payment_mode),
                    'ref' => $v->voucher_no . ($v->reference_no ? " (Txn: {$v->reference_no})" : ''),
                    'particulars' => ucfirst($v->type) . ' - ' . $v->party_name,
                    'deposit' => ($v->type === 'receipt') ? (float)$v->amount : 0.00,
                    'withdrawal' => ($v->type === 'payment') ? (float)$v->amount : 0.00,
                ];
            });

        $entries = $digitalSales->concat($bankPurchases)->concat($bankVouchers)->sortBy('date')->values();

        $running = 0;
        $withRunning = $entries->map(function ($e) use (&$running) {
            $running += ($e['deposit'] - $e['withdrawal']);
            $e['balance'] = round($running, 2);
            return $e;
        });

        return response()->json([
            'entries' => $withRunning,
            'total_deposits' => $entries->sum('deposit'),
            'total_withdrawals' => $entries->sum('withdrawal'),
            'net_bank_balance' => round($running, 2),
        ]);
    }

    /**
     * 6. Stock Reports: Branch-wise inventory, valuation, low stock alerts, dump history
     */
    public function stockReports(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $items = Item::where('tenant_id', $tenant->id)
            ->with('itemStocks.branch')
            ->orderBy('name')
            ->get();

        $branchId = $request->query('branch_id');

        $stockList = $items->map(function ($it) use ($branchId) {
            $totalStock = (float)$it->stock_quantity;
            $branchStock = null;

            if ($branchId) {
                $b = $it->itemStocks->firstWhere('branch_id', $branchId);
                $branchStock = $b ? (float)$b->quantity : 0;
            }

            $currentStock = $branchId ? $branchStock : $totalStock;
            $purchaseValuation = $currentStock * (float)$it->purchase_price;
            $saleValuation = $currentStock * (float)$it->price;
            $isLowStock = $currentStock <= (float)$it->min_stock_alert;

            return [
                'id' => $it->id,
                'name' => $it->name,
                'barcode' => $it->barcode,
                'category' => $it->category,
                'brand' => $it->brand,
                'hsn_sac' => $it->hsn_sac,
                'unit' => $it->unit,
                'type' => $it->type,
                'purchase_price' => (float)$it->purchase_price,
                'sale_price' => (float)$it->price,
                'current_stock' => $currentStock,
                'min_stock_alert' => (float)$it->min_stock_alert,
                'purchase_valuation' => round($purchaseValuation, 2),
                'sale_valuation' => round($saleValuation, 2),
                'is_low_stock' => $isLowStock,
                'branch_distribution' => $it->itemStocks->map(fn($s) => [
                    'branch_id' => $s->branch_id,
                    'branch_name' => $s->branch?->name,
                    'branch_type' => $s->branch?->type,
                    'quantity' => (float)$s->quantity,
                ]),
            ];
        });

        // Summary valuation
        $totalValuationPurchase = $stockList->sum('purchase_valuation');
        $totalValuationSale = $stockList->sum('sale_valuation');
        $lowStockCount = $stockList->where('is_low_stock', true)->count();

        // Recent stock movements (Challans & Adjustments/Dump)
        $recentChallans = Challan::where('tenant_id', $tenant->id)->with(['branch', 'targetBranch'])->latest()->take(10)->get();
        $recentDumps = StockAdjustment::where('tenant_id', $tenant->id)->with(['branch', 'item'])->latest()->take(10)->get();

        return response()->json([
            'items' => $stockList,
            'summary' => [
                'total_items' => $stockList->count(),
                'total_stock_units' => $stockList->sum('current_stock'),
                'total_valuation_purchase' => round($totalValuationPurchase, 2),
                'total_valuation_sale' => round($totalValuationSale, 2),
                'potential_gross_profit' => round($totalValuationSale - $totalValuationPurchase, 2),
                'low_stock_count' => $lowStockCount,
            ],
            'recent_challans' => $recentChallans,
            'recent_dumps' => $recentDumps,
        ]);
    }

    /**
     * 7. Party Ledger: Customer and Supplier account statements
     */
    public function partyLedger(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $partyType = $request->query('party_type', 'customer'); // 'customer' or 'supplier'
        $partyId = $request->query('party_id');

        if (! $partyId) {
            return response()->json(['message' => 'Please select an account party'], 422);
        }

        if ($partyType === 'customer') {
            $customer = Customer::where('tenant_id', $tenant->id)->findOrFail($partyId);

            // Invoices (Debit to customer)
            $invoices = Sale::where('tenant_id', $tenant->id)
                ->where('customer_id', $customer->id)
                ->get()
                ->map(fn($s) => [
                    'date' => $s->created_at->format('Y-m-d'),
                    'type' => 'Sale Invoice',
                    'ref' => $s->invoice_no,
                    'particulars' => 'POS Bill (' . count($s->items ?? []) . ' items)',
                    'debit' => (float)$s->total_amount,
                    'credit' => 0.00,
                ]);

            // Receipts (Credit to customer)
            $receipts = Voucher::where('tenant_id', $tenant->id)
                ->where('party_id', $customer->id)
                ->where('party_type', 'customer')
                ->where('type', 'receipt')
                ->get()
                ->map(fn($v) => [
                    'date' => $v->voucher_date->format('Y-m-d'),
                    'type' => 'Payment Receipt',
                    'ref' => $v->voucher_no,
                    'particulars' => 'Receipt via ' . strtoupper($v->payment_mode),
                    'debit' => 0.00,
                    'credit' => (float)$v->amount,
                ]);

            // Credit Notes (Credit to customer)
            $creditNotes = CreditDebitNote::where('tenant_id', $tenant->id)
                ->where('party_id', $customer->id)
                ->where('party_type', 'customer')
                ->where('type', 'credit_note')
                ->get()
                ->map(fn($n) => [
                    'date' => $n->note_date->format('Y-m-d'),
                    'type' => 'Credit Note',
                    'ref' => $n->note_no,
                    'particulars' => 'Sales Return / Discount: ' . ($n->reason ?? ''),
                    'debit' => 0.00,
                    'credit' => (float)$n->total_amount,
                ]);

            $txns = $invoices->concat($receipts)->concat($creditNotes)->sortBy('date')->values();

            $bal = (float)$customer->opening_balance;
            $calculated = $txns->map(function ($t) use (&$bal) {
                $bal += ($t['debit'] - $t['credit']);
                $t['running_balance'] = round($bal, 2);
                return $t;
            });

            return response()->json([
                'party' => $customer,
                'party_type' => 'customer',
                'opening_balance' => (float)$customer->opening_balance,
                'transactions' => $calculated,
                'closing_balance' => round($bal, 2),
            ]);
        } else {
            $supplier = Supplier::where('tenant_id', $tenant->id)->findOrFail($partyId);

            // Purchases (Credit to supplier)
            $purchases = Purchase::where('tenant_id', $tenant->id)
                ->where('supplier_id', $supplier->id)
                ->get()
                ->map(fn($p) => [
                    'date' => $p->purchase_date->format('Y-m-d'),
                    'type' => 'Purchase Bill',
                    'ref' => $p->purchase_no,
                    'particulars' => 'Supplier Bill #' . ($p->supplier_bill_no ?? '-'),
                    'debit' => 0.00,
                    'credit' => (float)$p->total_amount,
                ]);

            // Payments (Debit to supplier)
            $payments = Voucher::where('tenant_id', $tenant->id)
                ->where('party_id', $supplier->id)
                ->where('party_type', 'supplier')
                ->where('type', 'payment')
                ->get()
                ->map(fn($v) => [
                    'date' => $v->voucher_date->format('Y-m-d'),
                    'type' => 'Payment Voucher',
                    'ref' => $v->voucher_no,
                    'particulars' => 'Paid via ' . strtoupper($v->payment_mode),
                    'debit' => (float)$v->amount,
                    'credit' => 0.00,
                ]);

            // Debit Notes (Debit to supplier)
            $debitNotes = CreditDebitNote::where('tenant_id', $tenant->id)
                ->where('party_id', $supplier->id)
                ->where('party_type', 'supplier')
                ->where('type', 'debit_note')
                ->get()
                ->map(fn($n) => [
                    'date' => $n->note_date->format('Y-m-d'),
                    'type' => 'Debit Note',
                    'ref' => $n->note_no,
                    'particulars' => 'Purchase Return: ' . ($n->reason ?? ''),
                    'debit' => (float)$n->total_amount,
                    'credit' => 0.00,
                ]);

            $txns = $purchases->concat($payments)->concat($debitNotes)->sortBy('date')->values();

            $bal = (float)$supplier->opening_balance;
            $calculated = $txns->map(function ($t) use (&$bal) {
                $bal += ($t['credit'] - $t['debit']);
                $t['running_balance'] = round($bal, 2);
                return $t;
            });

            return response()->json([
                'party' => $supplier,
                'party_type' => 'supplier',
                'opening_balance' => (float)$supplier->opening_balance,
                'transactions' => $calculated,
                'closing_balance' => round($bal, 2),
            ]);
        }
    }
}
