<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Item;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WholesaleSaleApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Branch $branch;
    private Customer $customer;
    private Item $item1;
    private Item $item2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Apex Wholesale Traders',
            'domain_name' => 'localhost',
            'email' => 'admin@apexwholesale.com',
            'password' => Hash::make('password123'),
            'subscription_plan' => 'Wholesale Enterprise',
            'subscription_price' => 999.00,
            'expires_at' => now()->addYear(),
            'is_active' => true,
        ]);

        $this->branch = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Central Warehouse',
            'code' => 'WH-01',
            'is_active' => true,
            'is_main' => true,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Metro Retailers',
            'mobile_no' => '9876543210',
            'city' => 'Pune',
            'opening_balance' => 0,
            'current_balance' => 0,
        ]);

        $this->item1 = Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Basmati Rice 25kg Bag',
            'short_name' => 'BR-25',
            'category' => 'Grains',
            'price' => 1000.00,
            'stock_quantity' => 100.00,
            'unit' => 'Bag',
        ]);

        $this->item2 = Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Refined Cooking Oil 15L Tin',
            'short_name' => 'OIL-15',
            'category' => 'Edible Oil',
            'price' => 1500.00,
            'stock_quantity' => 50.00,
            'unit' => 'Tin',
        ]);
    }

    public function test_can_create_wholesale_bill_with_item_row_discounts_and_zero_gst(): void
    {
        $this->actingAs($this->tenant, 'web');

        // Item 1: 5 bags @ ₹1000 = ₹5000 with 10% discount (-₹500) = ₹4500
        // Item 2: 2 tins @ ₹1500 = ₹3000 with flat discount ₹200 = ₹2800
        // Net subtotal = ₹4500 + ₹2800 = ₹7300
        // Bill discount = ₹100
        // Total payable = ₹7200
        // GST tax = 0.00
        $payload = [
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'item_id' => $this->item1->id,
                    'item_name' => $this->item1->name,
                    'short_name' => $this->item1->short_name,
                    'unit_price' => 1000.00,
                    'quantity' => 5,
                    'discount_percent' => 10,
                    'discount_amount' => 500.00,
                    'total_price' => 4500.00,
                ],
                [
                    'item_id' => $this->item2->id,
                    'item_name' => $this->item2->name,
                    'short_name' => $this->item2->short_name,
                    'unit_price' => 1500.00,
                    'quantity' => 2,
                    'discount_percent' => 6.67,
                    'discount_amount' => 200.00,
                    'total_price' => 2800.00,
                ],
            ],
            'subtotal' => 7300.00,
            'discount_amount' => 100.00,
            'total_amount' => 7200.00,
            'payment_method' => 'Credit',
            'notes' => 'Transport LR #9821, Delivery by VRL Logistics',
        ];

        $response = $this->postJson('/api/sales', $payload);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'sale' => [
                'id',
                'invoice_no',
                'subtotal',
                'tax_amount',
                'total_amount',
                'items',
            ],
        ]);

        $sale = $response->json('sale');
        $this->assertEquals(7300.00, (float)$sale['subtotal']);
        $this->assertEquals(0.00, (float)$sale['tax_amount']);
        $this->assertEquals(7200.00, (float)$sale['total_amount']);
        $this->assertEquals('Credit', $sale['payment_method']);

        // Check line items in database
        $this->assertDatabaseHas('sale_items', [
            'item_id' => $this->item1->id,
            'unit_price' => 1000.00,
            'discount_percent' => 10.00,
            'discount_amount' => 500.00,
            'total_price' => 4500.00,
            'gst_percent' => 0.00,
            'tax_amount' => 0.00,
        ]);

        $this->assertDatabaseHas('sale_items', [
            'item_id' => $this->item2->id,
            'unit_price' => 1500.00,
            'discount_amount' => 200.00,
            'total_price' => 2800.00,
            'gst_percent' => 0.00,
            'tax_amount' => 0.00,
        ]);

        // Inventory should be deducted
        $this->assertEquals(95.00, (float)$this->item1->fresh()->stock_quantity);
        $this->assertEquals(48.00, (float)$this->item2->fresh()->stock_quantity);
    }
}
