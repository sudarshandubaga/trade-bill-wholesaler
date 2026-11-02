<?php

namespace Tests\Unit;

use App\Models\Branch;
use App\Models\CreditDebitNote;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\Voucher;
use App\Services\DocumentNumberService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DocumentNumberServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Test Tenant',
            'domain_name' => 'testdomain',
            'email' => 'tenant@test.com',
            'password' => Hash::make('secret'),
            'subscription_plan' => 'Enterprise',
            'expires_at' => now()->addYear(),
            'is_active' => true,
        ]);
    }

    public function test_financial_year_calculation(): void
    {
        // November 2026 -> FY 2026-2027 -> '2627'
        $nov2026 = Carbon::create(2026, 11, 2, 12, 0, 0);
        $this->assertEquals('2627', DocumentNumberService::getFinancialYearCode($nov2026));

        // March 2027 -> FY 2026-2027 -> '2627'
        $mar2027 = Carbon::create(2027, 3, 31, 23, 59, 59);
        $this->assertEquals('2627', DocumentNumberService::getFinancialYearCode($mar2027));

        // April 2027 -> FY 2027-2028 -> '2728'
        $apr2027 = Carbon::create(2027, 4, 1, 0, 0, 0);
        $this->assertEquals('2728', DocumentNumberService::getFinancialYearCode($apr2027));
    }

    public function test_invoice_numbers_do_not_reset_on_month_end_but_reset_on_fy_end(): void
    {
        // Sale in November 2026
        $novDate = Carbon::create(2026, 11, 15, 10, 0, 0);
        $inv1 = DocumentNumberService::generateInvoiceNo($this->tenant->id, $novDate);
        $this->assertEquals('INV/2627/0001', $inv1);
        Sale::create([
            'tenant_id' => $this->tenant->id,
            'invoice_no' => $inv1,
            'subtotal' => 100,
            'total_amount' => 100,
            'created_at' => $novDate,
        ]);

        // Sale in December 2026 (same FY, month changed): MUST NOT reset!
        $decDate = Carbon::create(2026, 12, 5, 10, 0, 0);
        $inv2 = DocumentNumberService::generateInvoiceNo($this->tenant->id, $decDate);
        $this->assertEquals('INV/2627/0002', $inv2);
        Sale::create([
            'tenant_id' => $this->tenant->id,
            'invoice_no' => $inv2,
            'subtotal' => 200,
            'total_amount' => 200,
            'created_at' => $decDate,
        ]);

        // Sale in March 2027 (same FY, last month): MUST NOT reset!
        $marDate = Carbon::create(2027, 3, 20, 10, 0, 0);
        $inv3 = DocumentNumberService::generateInvoiceNo($this->tenant->id, $marDate);
        $this->assertEquals('INV/2627/0003', $inv3);
        Sale::create([
            'tenant_id' => $this->tenant->id,
            'invoice_no' => $inv3,
            'subtotal' => 300,
            'total_amount' => 300,
            'created_at' => $marDate,
        ]);

        // Sale in April 2027 (NEW Financial Year): MUST reset to 0001 with new FY code!
        $aprDate = Carbon::create(2027, 4, 1, 10, 0, 0);
        $inv4 = DocumentNumberService::generateInvoiceNo($this->tenant->id, $aprDate);
        $this->assertEquals('INV/2728/0001', $inv4);
    }

    public function test_credit_debit_and_voucher_same_fy_format(): void
    {
        $now = Carbon::create(2026, 11, 2, 12, 0, 0);

        // Credit Note
        $cn = DocumentNumberService::generateNoteNo($this->tenant->id, 'credit_note', $now);
        $this->assertEquals('CN/2627/0001', $cn);

        // Debit Note
        $dn = DocumentNumberService::generateNoteNo($this->tenant->id, 'debit_note', $now);
        $this->assertEquals('DN/2627/0001', $dn);

        // Receipt Voucher
        $rv = DocumentNumberService::generateVoucherNo($this->tenant->id, 'receipt', $now);
        $this->assertEquals('RV/2627/0001', $rv);

        // Payment Voucher
        $pv = DocumentNumberService::generateVoucherNo($this->tenant->id, 'payment', $now);
        $this->assertEquals('PV/2627/0001', $pv);
    }
}

