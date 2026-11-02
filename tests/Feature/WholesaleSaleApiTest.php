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

    public function test_can_create_wholesale_bill_with_floating_number_quantity(): void
    {
        $this->actingAs($this->tenant, 'web');

        // Item 1: 2.50 bags @ ₹1000 = ₹2500
        $payload = [
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'item_id' => $this->item1->id,
                    'item_name' => $this->item1->name,
                    'short_name' => $this->item1->short_name,
                    'unit_price' => 1000.00,
                    'quantity' => 2.50,
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'total_price' => 2500.00,
                ],
            ],
            'subtotal' => 2500.00,
            'discount_amount' => 0.00,
            'total_amount' => 2500.00,
            'payment_method' => 'Cash',
        ];

        $response = $this->postJson('/api/sales', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('sale_items', [
            'item_id' => $this->item1->id,
            'quantity' => 2.50,
            'unit_price' => 1000.00,
            'total_price' => 2500.00,
        ]);

        // Inventory should be deducted by exactly 2.50
        $this->assertEquals(97.50, (float)$this->item1->fresh()->stock_quantity);
    }

    public function test_can_update_wholesale_bill_and_reconcile_inventory(): void
    {
        $this->actingAs($this->tenant, 'web');

        // 1. Create a bill with 5 units of item1 (stock was 100 -> becomes 95)
        $createPayload = [
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'item_id' => $this->item1->id,
                    'item_name' => $this->item1->name,
                    'short_name' => $this->item1->short_name,
                    'unit_price' => 1000.00,
                    'quantity' => 5,
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'total_price' => 5000.00,
                ],
            ],
            'subtotal' => 5000.00,
            'discount_amount' => 0.00,
            'total_amount' => 5000.00,
            'payment_method' => 'Cash',
        ];

        $res = $this->postJson('/api/sales', $createPayload);
        $res->assertStatus(201);
        $saleId = $res->json('sale.id');
        $this->assertEquals(95.00, (float)$this->item1->fresh()->stock_quantity);

        // 2. Update the bill: change quantity of item1 to 2, and add 3 units of item2
        $updatePayload = [
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'item_id' => $this->item1->id,
                    'item_name' => $this->item1->name,
                    'short_name' => $this->item1->short_name,
                    'unit_price' => 1000.00,
                    'quantity' => 2,
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'total_price' => 2000.00,
                ],
                [
                    'item_id' => $this->item2->id,
                    'item_name' => $this->item2->name,
                    'short_name' => $this->item2->short_name,
                    'unit_price' => 1500.00,
                    'quantity' => 3,
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'total_price' => 4500.00,
                ],
            ],
            'subtotal' => 6500.00,
            'discount_amount' => 500.00,
            'total_amount' => 6000.00,
            'payment_method' => 'Credit',
            'notes' => 'Updated order details',
        ];

        $updateRes = $this->putJson("/api/sales/{$saleId}", $updatePayload);
        $updateRes->assertStatus(200);

        // Verify sale record updated
        $updatedSale = $updateRes->json('sale');
        $this->assertEquals(6500.00, (float)$updatedSale['subtotal']);
        $this->assertEquals(500.00, (float)$updatedSale['discount_amount']);
        $this->assertEquals(6000.00, (float)$updatedSale['total_amount']);
        $this->assertEquals('Credit', $updatedSale['payment_method']);

        // Verify inventory reconciled:
        // item1 stock: started 100, deducted 5 (95), rolled back (+5 -> 100), new deduction 2 -> 98
        $this->assertEquals(98.00, (float)$this->item1->fresh()->stock_quantity);
        // item2 stock: started 50, new deduction 3 -> 47
        $this->assertEquals(47.00, (float)$this->item2->fresh()->stock_quantity);
    }

    public function test_cannot_create_wholesale_bill_if_item_is_out_of_stock(): void
    {
        $this->actingAs($this->tenant, 'web');

        // Create an out of stock item
        $outOfStockItem = Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Empty Stock Item',
            'short_name' => 'OUT-01',
            'category' => 'General',
            'price' => 500.00,
            'stock_quantity' => 0.00,
            'unit' => 'Pcs',
        ]);

        $payload = [
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'item_id' => $outOfStockItem->id,
                    'item_name' => $outOfStockItem->name,
                    'short_name' => $outOfStockItem->short_name,
                    'unit_price' => 500.00,
                    'quantity' => 1,
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'total_price' => 500.00,
                ],
            ],
            'subtotal' => 500.00,
            'discount_amount' => 0.00,
            'total_amount' => 500.00,
            'payment_method' => 'Cash',
        ];

        $response = $this->postJson('/api/sales', $payload);
        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => "Item 'Empty Stock Item' is out of stock and cannot be billed.",
        ]);
    }

    public function test_cannot_create_wholesale_bill_if_quantity_exceeds_stock(): void
    {
        $this->actingAs($this->tenant, 'web');

        // item2 has stock 50.00. Attempt to sell 60.
        $payload = [
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'item_id' => $this->item2->id,
                    'item_name' => $this->item2->name,
                    'short_name' => $this->item2->short_name,
                    'unit_price' => 1500.00,
                    'quantity' => 60,
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'total_price' => 90000.00,
                ],
            ],
            'subtotal' => 90000.00,
            'discount_amount' => 0.00,
            'total_amount' => 90000.00,
            'payment_method' => 'Credit',
        ];

        $response = $this->postJson('/api/sales', $payload);
        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => "Requested quantity (60) exceeds available stock (50) for 'Refined Cooking Oil 15L Tin'.",
        ]);
    }
}
