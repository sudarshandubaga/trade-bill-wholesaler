<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Challan;
use App\Models\Item;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseEntryAndPrintEnhancementsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'KUMAR WHOLESALE DISTRIBUTORS',
            'domain_name' => 'localhost',
            'email' => 'owner@kumar.test',
            'password' => bcrypt('secret123'),
            'phone' => '9876543210',
            'address' => 'Station Road, Patna<br /><strong>Bihar - 800001</strong>',
            'gst_number' => '10ABCDE1234F1Z5',
            'currency' => '₹',
            'subscription_plan' => 'yearly',
            'subscription_price' => 4999.00,
            'expires_at' => now()->addYear(),
            'is_active' => true,
        ]);

        $this->branch = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Warehouse',
            'code' => 'MW01',
            'type' => 'warehouse',
            'is_head' => true,
            'is_active' => true,
        ]);

        $this->actingAs($this->tenant, 'web');
    }

    public function test_can_save_direct_purchase_entry_without_items_and_update_supplier_balance(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Oxford University Press',
            'company_name' => 'OUP India',
            'phone' => '9988776655',
            'current_balance' => 1000.00,
        ]);

        $response = $this->postJson('/api/purchases', [
            'supplier_id' => $supplier->id,
            'amount' => 5500.50,
            'purchase_date' => now()->format('Y-m-d'),
            'purchase_invoice_no' => 'OUP/2026/991',
            'remarks' => 'Consignment of 500 books received via TCI Freight',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'purchase' => [
                'id',
                'purchase_no',
                'supplier_bill_no',
                'total_amount',
                'notes',
            ],
        ]);

        $this->assertEquals('OUP/2026/991', $response->json('purchase.supplier_bill_no'));
        $this->assertEquals(5500.50, (float)$response->json('purchase.total_amount'));
        $this->assertEquals('Consignment of 500 books received via TCI Freight', $response->json('purchase.notes'));

        // Supplier balance increased by 5500.50 (from 1000 to 6500.50)
        $supplier->refresh();
        $this->assertEquals(6500.50, (float)$supplier->current_balance);

        // Verify purchase listing returns recorded purchase
        $listResponse = $this->getJson('/api/purchases?per_page=100');
        $listResponse->assertStatus(200);
        $listResponse->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'purchase_no',
                    'supplier_bill_no',
                    'total_amount',
                ]
            ],
            'total',
        ]);
        $this->assertGreaterThanOrEqual(1, count($listResponse->json('data')));
        $this->assertEquals('OUP/2026/991', $listResponse->json('data.0.supplier_bill_no'));
    }

    public function test_can_update_store_settings_with_gst_number_and_html_address(): void
    {
        $response = $this->putJson('/api/settings', [
            'name' => 'MAA SHARDA TEXTBOOK DEPOT',
            'phone' => '9431234567',
            'address' => 'Shop #12, Market Complex<br />Near Clock Tower<br /><strong>Patna - 800001</strong>',
            'gst_number' => '10AABCT9988H1Z2',
            'currency' => '₹',
        ]);

        $response->assertStatus(200);
        $this->tenant->refresh();

        $this->assertEquals('10AABCT9988H1Z2', $this->tenant->gst_number);
        $this->assertEquals('MAA SHARDA TEXTBOOK DEPOT', $this->tenant->name);
        $this->assertStringContainsString('<br />', $this->tenant->address);
    }

    public function test_item_search_matches_by_short_name(): void
    {
        Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'NCERT Mathematics Class 10',
            'short_name' => 'MATH10',
            'price' => 180.00,
            'stock_quantity' => 50,
        ]);

        Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'NCERT Science Class 10',
            'short_name' => 'SCI10',
            'price' => 200.00,
            'stock_quantity' => 40,
        ]);

        // Search by short_name 'MATH'
        $response = $this->getJson('/api/items?search=MATH');

        $response->assertStatus(200);
        $items = $response->json('items');
        $mathItems = array_filter($items, fn($it) => str_contains($it['short_name'] ?? '', 'MATH'));
        $this->assertNotEmpty($mathItems);
        $this->assertEquals('MATH10', array_values($mathItems)[0]['short_name']);
    }

    public function test_challan_store_returns_challan_with_loaded_items_list(): void
    {
        $item = Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Physics Textbook Part 1',
            'short_name' => 'PHY11-1',
            'purchase_price' => 150.00,
            'price' => 195.00,
            'stock_quantity' => 10,
        ]);

        $response = $this->postJson('/api/challans', [
            'type' => 'inward',
            'branch_id' => $this->branch->id,
            'challan_date' => now()->format('Y-m-d'),
            'party_name' => 'National Book Trust',
            'status' => 'completed',
            'items' => [
                [
                    'item_id' => $item->id,
                    'item_name' => $item->name,
                    'quantity' => 25,
                    'rate' => 150.00,
                ],
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'challan' => [
                'id',
                'challan_no',
                'items' => [
                    '*' => [
                        'item_name',
                        'quantity',
                        'rate',
                        'total',
                    ],
                ],
            ],
        ]);

        $challanData = $response->json('challan');
        $this->assertNotEmpty($challanData['items']);
        $this->assertEquals('Physics Textbook Part 1', $challanData['items'][0]['item_name']);
        $this->assertEquals(25, (float)$challanData['items'][0]['quantity']);
    }

    public function test_party_ledger_includes_items_short_names_for_ledger_filtering(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'S Chand Publications',
            'phone' => '9123456780',
            'current_balance' => 0.00,
        ]);

        // Create purchase entry
        $this->postJson('/api/purchases', [
            'supplier_id' => $supplier->id,
            'amount' => 12500.00,
            'purchase_date' => now()->format('Y-m-d'),
            'purchase_invoice_no' => 'SCH/9821',
            'remarks' => 'Order for Reference Books',
        ]);

        $response = $this->getJson("/api/reports/ledger?party_type=supplier&party_id={$supplier->id}");

        $response->assertStatus(200);
        $txns = $response->json('transactions');
        $this->assertNotEmpty($txns);
        $this->assertEquals('Purchase Bill', $txns[0]['type']);
        $this->assertEquals(12500.00, (float)$txns[0]['credit']);
    }
}
