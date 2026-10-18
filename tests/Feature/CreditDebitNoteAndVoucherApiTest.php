<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CreditDebitNote;
use App\Models\Customer;
use App\Models\Item;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreditDebitNoteAndVoucherApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Branch $branch;
    private Customer $customer;
    private Supplier $supplier;
    private Item $item;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Wholesale Mart',
            'domain_name' => 'localhost',
            'email' => 'admin@wholesalemart.com',
            'password' => Hash::make('password123'),
            'subscription_plan' => 'Enterprise',
            'subscription_price' => 999.00,
            'expires_at' => now()->addYear(),
            'is_active' => true,
        ]);

        $this->branch = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Warehouse',
            'code' => 'MWH-01',
            'is_active' => true,
            'is_main' => true,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Omkar Stores',
            'mobile_no' => '9988776655',
            'opening_balance' => 5000,
            'current_balance' => 5000,
            'points' => 0,
        ]);

        $this->supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'National Mills',
            'phone' => '9123456780',
            'opening_balance' => 10000,
            'current_balance' => 10000,
        ]);

        $this->item = Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sugar 50kg Sack',
            'short_name' => 'SUGAR-50',
            'category' => 'Commodities',
            'price' => 2000.00,
            'stock_quantity' => 100.00,
            'unit' => 'Sack',
        ]);
    }

    public function test_can_create_credit_note_with_pos_style_discounts_and_zero_gst(): void
    {
        $this->actingAs($this->tenant, 'web');

        // Return 2 sacks @ 2000 = 4000
        // Line discount: 10% = 400 => Net line subtotal = 3600
        // Note-level discount: 100
        // Total credit note = 3500 (Zero GST)
        $payload = [
            'type' => 'credit_note',
            'branch_id' => $this->branch->id,
            'party_type' => 'customer',
            'party_id' => $this->customer->id,
            'party_name' => $this->customer->name,
            'note_date' => now()->toDateString(),
            'original_invoice_no' => 'INV-202610-001',
            'reason' => 'Customer excess stock return',
            'discount_amount' => 100.00,
            'items' => [
                [
                    'item_id' => $this->item->id,
                    'item_name' => $this->item->name,
                    'quantity' => 2,
                    'unit_price' => 2000.00,
                    'discount_percent' => 10,
                    'discount_amount' => 400.00,
                ],
            ],
        ];

        $response = $this->postJson('/api/credit-debit-notes', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'note' => ['id', 'note_no', 'total_amount', 'discount_amount', 'tax_amount'],
            ]);

        $note = CreditDebitNote::where('tenant_id', $this->tenant->id)->first();
        $this->assertNotNull($note);
        $this->assertEquals('credit_note', $note->type);
        $this->assertEquals(0.00, (float) $note->tax_amount);
        $this->assertEquals(100.00, (float) $note->discount_amount);
        $this->assertEquals(3500.00, (float) $note->total_amount);

        // Check line item discounts & zero GST
        $itemLine = $note->items()->first();
        $this->assertEquals(10.00, (float) $itemLine->discount_percent);
        $this->assertEquals(400.00, (float) $itemLine->discount_amount);
        $this->assertEquals(0.00, (float) $itemLine->gst_percent);
        $this->assertEquals(0.00, (float) $itemLine->tax_amount);
        $this->assertEquals(3600.00, (float) $itemLine->total_price);

        // Check stock quantity was incremented by 2 (return in)
        $this->item->refresh();
        $this->assertEquals(102.00, (float) $this->item->stock_quantity);

        // Check customer balance was reduced by 3500: 5000 - 3500 = 1500
        $this->customer->refresh();
        $this->assertEquals(1500.00, (float) $this->customer->current_balance);
        $this->assertEquals(0, $this->customer->points);
    }

    public function test_can_create_debit_note_with_zero_gst_and_deduct_inventory(): void
    {
        $this->actingAs($this->tenant, 'web');

        // Return 5 sacks to supplier @ 2000 = 10000
        // Line discount: 500 => Subtotal = 9500
        // Note-level discount: 0
        // Total debit note = 9500 (Zero GST)
        $payload = [
            'type' => 'debit_note',
            'branch_id' => $this->branch->id,
            'party_type' => 'supplier',
            'party_id' => $this->supplier->id,
            'party_name' => $this->supplier->name,
            'note_date' => now()->toDateString(),
            'original_invoice_no' => 'PUR-202610-001',
            'reason' => 'Damaged sacks returned to supplier',
            'discount_amount' => 0.00,
            'items' => [
                [
                    'item_id' => $this->item->id,
                    'item_name' => $this->item->name,
                    'quantity' => 5,
                    'unit_price' => 2000.00,
                    'discount_percent' => 0,
                    'discount_amount' => 500.00,
                ],
            ],
        ];

        $response = $this->postJson('/api/credit-debit-notes', $payload);

        $response->assertStatus(201);

        $note = CreditDebitNote::where('tenant_id', $this->tenant->id)
            ->where('type', 'debit_note')
            ->first();
        $this->assertNotNull($note);
        $this->assertEquals(0.00, (float) $note->tax_amount);
        $this->assertEquals(9500.00, (float) $note->total_amount);

        // Stock quantity should be deducted by 5: 100 - 5 = 95
        $this->item->refresh();
        $this->assertEquals(95.00, (float) $this->item->stock_quantity);

        // Supplier payable should be debited by 9500: 10000 - 9500 = 500
        $this->supplier->refresh();
        $this->assertEquals(500.00, (float) $this->supplier->current_balance);
    }

    public function test_can_create_receipt_voucher_and_payment_voucher(): void
    {
        $this->actingAs($this->tenant, 'web');

        // 1. Receipt Voucher (Money IN from customer)
        $receiptPayload = [
            'type' => 'receipt',
            'party_type' => 'customer',
            'party_id' => $this->customer->id,
            'party_name' => $this->customer->name,
            'branch_id' => $this->branch->id,
            'voucher_date' => now()->toDateString(),
            'amount' => 2000.00,
            'payment_mode' => 'cash',
            'reference_no' => 'CASH-REC-01',
            'narration' => 'Cash received from Omkar Stores',
        ];

        $res1 = $this->postJson('/api/vouchers', $receiptPayload);
        $res1->assertStatus(201);

        $rv = Voucher::where('tenant_id', $this->tenant->id)->where('type', 'receipt')->first();
        $this->assertNotNull($rv);
        $this->assertEquals(2000.00, (float) $rv->amount);

        // Customer balance was 5000, receipt 2000 reduces balance to 3000
        $this->customer->refresh();
        $this->assertEquals(3000.00, (float) $this->customer->current_balance);

        // 2. Payment Voucher (Money OUT to supplier)
        $paymentPayload = [
            'type' => 'payment',
            'party_type' => 'supplier',
            'party_id' => $this->supplier->id,
            'party_name' => $this->supplier->name,
            'branch_id' => $this->branch->id,
            'voucher_date' => now()->toDateString(),
            'amount' => 4000.00,
            'payment_mode' => 'bank',
            'reference_no' => 'NEFT-004812',
            'narration' => 'Payment transferred to National Mills',
        ];

        $res2 = $this->postJson('/api/vouchers', $paymentPayload);
        $res2->assertStatus(201);

        $pv = Voucher::where('tenant_id', $this->tenant->id)->where('type', 'payment')->first();
        $this->assertNotNull($pv);
        $this->assertEquals(4000.00, (float) $pv->amount);

        // Supplier balance was 10000, payment 4000 reduces payable to 6000
        $this->supplier->refresh();
        $this->assertEquals(6000.00, (float) $this->supplier->current_balance);
    }

    public function test_voucher_defaults_to_head_branch_and_infers_party_type(): void
    {
        $this->actingAs($this->tenant, 'web');

        // Designate a specific head branch
        $headBranch = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Central HQ Head Branch',
            'code' => 'HQ-01',
            'is_active' => true,
            'is_head' => true,
            'is_primary' => true,
        ]);

        // 1. Receipt without party_type or branch_id
        $receiptPayload = [
            'type' => 'receipt',
            'party_id' => $this->customer->id,
            'party_name' => $this->customer->name,
            'voucher_date' => now()->toDateString(),
            'amount' => 500.00,
            'payment_mode' => 'cash',
        ];

        $res1 = $this->postJson('/api/vouchers', $receiptPayload);
        $res1->assertStatus(201);

        $voucher1 = Voucher::where('tenant_id', $this->tenant->id)->latest('id')->first();
        $this->assertEquals($headBranch->id, $voucher1->branch_id);
        $this->assertEquals('customer', $voucher1->party_type);

        // 2. Payment without party_type or branch_id
        $paymentPayload = [
            'type' => 'payment',
            'party_id' => $this->supplier->id,
            'party_name' => $this->supplier->name,
            'voucher_date' => now()->toDateString(),
            'amount' => 750.00,
            'payment_mode' => 'upi',
        ];

        $res2 = $this->postJson('/api/vouchers', $paymentPayload);
        $res2->assertStatus(201);

        $voucher2 = Voucher::where('tenant_id', $this->tenant->id)->latest('id')->first();
        $this->assertEquals($headBranch->id, $voucher2->branch_id);
        $this->assertEquals('supplier', $voucher2->party_type);
    }
}
