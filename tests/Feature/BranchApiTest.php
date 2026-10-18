<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BranchApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Speedy Wheels Garage',
            'domain_name' => 'localhost',
            'email' => 'owner@speedywheels.com',
            'password' => Hash::make('password123'),
            'subscription_plan' => 'Annual Garage Pro (Yearly)',
            'subscription_price' => 499.00,
            'expires_at' => now()->addYear(),
            'is_active' => true,
        ]);
    }

    public function test_branches_endpoint_returns_branches_and_data_keys(): void
    {
        $this->actingAs($this->tenant, 'web');

        $b1 = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Workshop',
            'code' => 'BR-01',
            'is_active' => true,
            'is_main' => true,
        ]);

        $response = $this->getJson('/api/branches');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'branches',
            'data',
            'active_branch_id',
        ]);

        $this->assertIsArray($response->json('branches'));
        $this->assertIsArray($response->json('data'));
        $this->assertCount(1, $response->json('branches'));
        $this->assertEquals($b1->id, $response->json('active_branch_id'));
    }

    public function test_can_switch_active_branch(): void
    {
        $this->actingAs($this->tenant, 'web');

        $b1 = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Workshop',
            'code' => 'BR-01',
            'is_active' => true,
            'is_main' => true,
        ]);

        $b2 = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Downtown Bay',
            'code' => 'BR-02',
            'is_active' => true,
            'is_main' => false,
        ]);

        $response = $this->postJson('/api/branches/switch', [
            'branch_id' => $b2->id,
        ]);
        $response->assertStatus(200);

        $getRes = $this->getJson('/api/branches');
        $getRes->assertStatus(200);
        $this->assertEquals($b2->id, $getRes->json('active_branch_id'));
    }

    public function test_can_set_head_branch(): void
    {
        $this->actingAs($this->tenant, 'web');

        $b1 = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Workshop',
            'code' => 'BR-01',
            'is_active' => true,
            'is_head' => true,
            'is_primary' => true,
        ]);

        $b2 = Branch::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sub Branch 2',
            'code' => 'BR-02',
            'is_active' => true,
            'is_head' => false,
            'is_primary' => false,
        ]);

        $response = $this->postJson("/api/branches/{$b2->id}/set-head");
        $response->assertStatus(200)
            ->assertJsonPath('branch.id', $b2->id)
            ->assertJsonPath('branch.is_head', true);

        $b1->refresh();
        $b2->refresh();

        $this->assertFalse((bool) $b1->is_head);
        $this->assertFalse((bool) $b1->is_primary);
        $this->assertTrue((bool) $b2->is_head);
        $this->assertTrue((bool) $b2->is_primary);
    }
}
