<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SubscriptionExpiredTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $activeTenant;
    private Tenant $expiredTenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->activeTenant = Tenant::create([
            'name' => 'Active Wholesaler Mart',
            'domain_name' => 'active-wholesaler',
            'email' => 'active@wholesaler.com',
            'password' => Hash::make('password123'),
            'subscription_plan' => 'Wholesale Enterprise',
            'subscription_price' => 999.00,
            'expires_at' => Carbon::now()->addMonths(6),
            'is_active' => true,
        ]);

        $this->expiredTenant = Tenant::create([
            'name' => 'Expired Trading Corp',
            'domain_name' => 'expired-corp',
            'email' => 'expired@corp.com',
            'password' => Hash::make('password123'),
            'subscription_plan' => 'Wholesale Enterprise',
            'subscription_price' => 999.00,
            'expires_at' => Carbon::now()->subDays(10),
            'is_active' => true,
        ]);
    }

    public function test_active_tenant_can_load_spa_home_view(): void
    {
        $response = $this->get('/?domain=active-wholesaler');

        $response->assertStatus(200);
        $response->assertViewIs('app');
    }

    public function test_expired_tenant_browser_request_renders_subscription_expired_screen_instead_of_json(): void
    {
        // Simulate normal browser visit
        $response = $this->get('/?domain=expired-corp');

        // Must return 403 HTTP status
        $response->assertStatus(403);

        // Must render the subscription_expired Blade view rather than returning raw JSON
        $response->assertViewIs('subscription_expired');

        // Verify page content contains the design strings
        $response->assertSee('Annual Subscription Expired');
        $response->assertSee('Wholesale ERP Operations Locked');
        $response->assertSee('Expired Trading Corp');
        $response->assertSee('expired-corp');
        $response->assertSee('Activate License (+1 Year)');
        $response->assertSee('contact@xpertcoders.in');
    }

    public function test_expired_tenant_api_request_returns_json_403_with_is_expired_flag(): void
    {
        // When React SPA calls protected API while expired
        $response = $this->actingAs($this->expiredTenant)
            ->getJson('/api/items?domain=expired-corp');

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'Subscription Expired',
            'is_expired' => true,
            'domain' => 'expired-corp',
        ]);
    }

    public function test_expired_tenant_can_activate_license_and_regain_access(): void
    {
        // 1. Initial browser visit shows expired screen
        $this->get('/?domain=expired-corp')->assertViewIs('subscription_expired');

        // 2. Platform / admin activates 1 year license
        $renewResponse = $this->actingAs($this->expiredTenant)
            ->postJson("/api/tenants/{$this->expiredTenant->id}/activate-license", [
                'action' => 'renew_one_year',
            ]);

        $renewResponse->assertStatus(200);
        $renewResponse->assertJson(['message' => 'Subscription renewed for 1 full year!']);

        // 3. Expiration is now 1 year in the future
        $this->expiredTenant->refresh();
        $this->assertFalse($this->expiredTenant->is_expired);
        $this->assertGreaterThan(300, $this->expiredTenant->days_remaining);

        // 4. Subsequent browser visit now loads the app view normally!
        $this->get('/?domain=expired-corp')->assertStatus(200)->assertViewIs('app');
    }
}
