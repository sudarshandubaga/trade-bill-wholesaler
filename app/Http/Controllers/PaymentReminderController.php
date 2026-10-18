<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PaymentReminder;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PaymentReminderController extends Controller
{
    private function getCurrentTenant(): Tenant
    {
        return Auth::guard('web')->user()
            ?? request()->attributes->get('tenant')
            ?? app(\App\Services\TenantManager::class)->resolveTenant(request());
    }

    /**
     * Get all pending receivables, overdue invoices, and reminder summary.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();
        $now = Carbon::now();

        // 1. Fetch pending unpaid sales
        $salesQuery = Sale::where('tenant_id', $tenant->id)
            ->where(function ($q) {
                $q->where('total_amount', '>', DB::raw('paid_amount'))
                  ->orWhere('payment_status', '!=', 'paid');
            })
            ->with(['customer', 'branch'])
            ->orderBy('created_at', 'asc');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $salesQuery->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('mobile_no', 'like', "%{$search}%");
                  });
            });
        }

        $pendingSales = $salesQuery->get();

        // 2. Fetch customers with outstanding balances who may not have individual sale records
        $customersWithBalance = Customer::where('tenant_id', $tenant->id)
            ->where('current_balance', '>', 0)
            ->get();

        // Fetch past reminder logs mapped by sale_id and customer_id
        $reminderLogs = PaymentReminder::where('tenant_id', $tenant->id)
            ->orderBy('reminded_at', 'desc')
            ->get()
            ->groupBy(function ($r) {
                return $r->sale_id ? 'sale_' . $r->sale_id : 'cust_' . $r->customer_id;
            });

        $receivables = [];
        $saleCustomerIds = [];

        foreach ($pendingSales as $sale) {
            $dueAmount = max(0, round((float) $sale->total_amount - (float) $sale->paid_amount, 2));
            if ($dueAmount <= 0) continue;

            $saleCustomerIds[] = $sale->customer_id;
            $cust = $sale->customer;
            $custName = $cust ? $cust->name : 'Walk-in Customer';
            $custPhone = $cust ? $cust->mobile_no : '';
            $daysOverdue = max(0, (int) $sale->created_at->diffInDays($now));

            $cleanPhone = preg_replace('/[^0-9]/', '', $custPhone);
            if (strlen($cleanPhone) === 10) {
                $cleanPhone = '91' . $cleanPhone; // default India prefix if 10 digits
            }

            $reminderText = sprintf(
                "Dear %s, this is a gentle payment reminder from %s. You have an outstanding balance of Rs. %s on Invoice #%s dated %s. Kindly arrange the payment at your earliest convenience. Thank you!",
                $custName,
                $tenant->name,
                number_format($dueAmount, 2),
                $sale->invoice_no,
                $sale->created_at->format('d-M-Y')
            );

            $waUrl = $cleanPhone ? 'https://wa.me/' . $cleanPhone . '?text=' . urlencode($reminderText) : '';

            $logs = $reminderLogs->get('sale_' . $sale->id, collect());
            $lastReminder = $logs->first();

            $receivables[] = [
                'id' => 'sale_' . $sale->id,
                'type' => 'invoice',
                'sale_id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'customer_name' => $custName,
                'mobile_no' => $custPhone,
                'email' => $cust?->email ?? '',
                'invoice_no' => $sale->invoice_no,
                'invoice_date' => $sale->created_at->format('Y-m-d'),
                'total_amount' => (float) $sale->total_amount,
                'paid_amount' => (float) $sale->paid_amount,
                'due_amount' => $dueAmount,
                'days_overdue' => $daysOverdue,
                'branch_name' => $sale->branch?->name ?? 'Main Branch',
                'whatsapp_url' => $waUrl,
                'reminder_message' => $reminderText,
                'reminders_count' => $logs->count(),
                'last_reminded_at' => $lastReminder ? $lastReminder->reminded_at->format('d M Y, h:i A') : null,
                'last_channel' => $lastReminder?->channel ?? null,
            ];
        }

        // Add customers who have open balance without matching sale in pendingSales
        foreach ($customersWithBalance as $cust) {
            if (in_array($cust->id, $saleCustomerIds)) continue;

            $dueAmount = (float) $cust->current_balance;
            if ($dueAmount <= 0) continue;

            $cleanPhone = preg_replace('/[^0-9]/', '', $cust->mobile_no);
            if (strlen($cleanPhone) === 10) {
                $cleanPhone = '91' . $cleanPhone;
            }

            $reminderText = sprintf(
                "Dear %s, this is a polite payment reminder from %s. Your ledger balance of Rs. %s is currently outstanding. Kindly clear the pending dues at your earliest convenience. Thank you!",
                $cust->name,
                $tenant->name,
                number_format($dueAmount, 2)
            );

            $waUrl = $cleanPhone ? 'https://wa.me/' . $cleanPhone . '?text=' . urlencode($reminderText) : '';
            $logs = $reminderLogs->get('cust_' . $cust->id, collect());
            $lastReminder = $logs->first();

            $receivables[] = [
                'id' => 'cust_' . $cust->id,
                'type' => 'ledger_balance',
                'sale_id' => null,
                'customer_id' => $cust->id,
                'customer_name' => $cust->name,
                'mobile_no' => $cust->mobile_no,
                'email' => $cust->email ?? '',
                'invoice_no' => 'LEDGER-BAL',
                'invoice_date' => $cust->created_at ? $cust->created_at->format('Y-m-d') : Carbon::today()->format('Y-m-d'),
                'total_amount' => $dueAmount,
                'paid_amount' => 0.00,
                'due_amount' => $dueAmount,
                'days_overdue' => 15,
                'branch_name' => 'General Account',
                'whatsapp_url' => $waUrl,
                'reminder_message' => $reminderText,
                'reminders_count' => $logs->count(),
                'last_reminded_at' => $lastReminder ? $lastReminder->reminded_at->format('d M Y, h:i A') : null,
                'last_channel' => $lastReminder?->channel ?? null,
            ];
        }

        // Filter if requested
        if ($request->filled('filter')) {
            $f = $request->filter;
            if ($f === 'overdue_30') {
                $receivables = array_values(array_filter($receivables, fn($r) => $r['days_overdue'] >= 30));
            } elseif ($f === 'overdue_7') {
                $receivables = array_values(array_filter($receivables, fn($r) => $r['days_overdue'] >= 7));
            } elseif ($f === 'high_value') {
                $receivables = array_values(array_filter($receivables, fn($r) => $r['due_amount'] >= 500));
            }
        }

        // Summary Calculations
        $totalReceivables = array_sum(array_column($receivables, 'due_amount'));
        $pendingCount = count($receivables);
        $totalOverdue30 = array_sum(array_map(fn($r) => $r['days_overdue'] >= 30 ? $r['due_amount'] : 0, $receivables));
        $uniqueCustomers = count(array_unique(array_filter(array_column($receivables, 'customer_id'))));
        $totalRemindersSent = PaymentReminder::where('tenant_id', $tenant->id)->count();

        // Recent reminders log
        $recentReminders = PaymentReminder::where('tenant_id', $tenant->id)
            ->with(['customer', 'sale'])
            ->orderBy('reminded_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'summary' => [
                'total_receivables' => round($totalReceivables, 2),
                'pending_invoices_count' => $pendingCount,
                'unique_customers_count' => $uniqueCustomers,
                'overdue_30_amount' => round($totalOverdue30, 2),
                'total_reminders_sent' => $totalRemindersSent,
            ],
            'receivables' => $receivables,
            'recent_reminders' => $recentReminders,
        ]);
    }

    /**
     * Log that a reminder was sent.
     */
    public function log(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'customer_id' => 'nullable|integer',
            'sale_id' => 'nullable|integer',
            'channel' => 'required|in:whatsapp,sms,email,call,manual',
            'recipient' => 'nullable|string|max:100',
            'amount' => 'required|numeric',
            'notes' => 'nullable|string|max:500',
            'message' => 'nullable|string|max:1000',
        ]);

        $reminder = PaymentReminder::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $validated['customer_id'] ?? null,
            'sale_id' => $validated['sale_id'] ?? null,
            'channel' => $validated['channel'],
            'recipient' => $validated['recipient'] ?? null,
            'amount' => $validated['amount'],
            'status' => 'sent',
            'message' => $validated['message'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'reminded_at' => Carbon::now(),
        ]);

        return response()->json([
            'message' => 'Payment reminder logged successfully',
            'reminder' => $reminder,
        ]);
    }

    /**
     * Quick Settlement: Record a payment receipt for this invoice or customer.
     */
    public function settle(Request $request): JsonResponse
    {
        $tenant = $this->getCurrentTenant();

        $validated = $request->validate([
            'customer_id' => 'nullable|integer',
            'sale_id' => 'nullable|integer',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode' => 'required|in:cash,bank,upi,cheque',
            'reference_no' => 'nullable|string|max:100',
            'narration' => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($tenant, $validated) {
            $amount = (float) $validated['amount'];
            $cust = !empty($validated['customer_id']) ? Customer::where('tenant_id', $tenant->id)->find($validated['customer_id']) : null;
            $sale = !empty($validated['sale_id']) ? Sale::where('tenant_id', $tenant->id)->find($validated['sale_id']) : null;

            if ($sale) {
                $newPaid = (float) $sale->paid_amount + $amount;
                $sale->paid_amount = $newPaid;
                if ($newPaid >= (float) $sale->total_amount) {
                    $sale->payment_status = 'paid';
                } else {
                    $sale->payment_status = 'partial';
                }
                $sale->save();

                if (!$cust && $sale->customer_id) {
                    $cust = Customer::where('tenant_id', $tenant->id)->find($sale->customer_id);
                }
            }

            if ($cust) {
                $cust->current_balance = max(0, (float) $cust->current_balance - $amount);
                $cust->save();
            }

            // Create Voucher record
            $datePrefix = Carbon::now()->format('Ym');
            $countToday = Voucher::where('tenant_id', $tenant->id)->count() + 1;
            $voucherNo = sprintf('VCH-%s-%04d', $datePrefix, $countToday);

            $voucher = Voucher::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $sale?->branch_id ?? session('active_branch_id'),
                'voucher_no' => $voucherNo,
                'voucher_date' => Carbon::today()->format('Y-m-d'),
                'type' => 'receipt',
                'party_type' => 'customer',
                'party_id' => $cust?->id,
                'party_name' => $cust?->name ?? ($sale ? 'Customer of ' . $sale->invoice_no : 'Walk-in Customer'),
                'payment_mode' => $validated['payment_mode'],
                'reference_no' => $validated['reference_no'] ?? ($sale ? $sale->invoice_no : null),
                'amount' => $amount,
                'narration' => $validated['narration'] ?? ('Payment received against ' . ($sale ? $sale->invoice_no : 'pending dues')),
                'created_by' => session('logged_in_user_id'),
            ]);

            // Mark reminder as settled
            if (!empty($validated['sale_id'])) {
                PaymentReminder::where('tenant_id', $tenant->id)
                    ->where('sale_id', $validated['sale_id'])
                    ->update(['status' => 'settled']);
            }

            return response()->json([
                'message' => 'Payment settled and receipt voucher created successfully',
                'voucher' => $voucher,
                'sale' => $sale,
                'customer' => $cust,
            ]);
        });
    }
}
