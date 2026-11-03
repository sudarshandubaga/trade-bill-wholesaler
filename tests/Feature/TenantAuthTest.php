<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TenantAuthTest extends TestCase
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

        Item::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Synthetic Oil Change',
            'short_name' => 'OIL-SYN',
            'category' => 'Engine & Lube',
            'price' => 60.00,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_protected_apis(): void
    {
        // Must return 401 for protected endpoints
        $this->getJson('/api/items')->assertStatus(401);
        $this->getJson('/api/customers')->assertStatus(401);
        $this->getJson('/api/dashboard/stats')->assertStatus(401);
        $this->getJson('/api/settings')->assertStatus(401);
        $this->postJson('/api/sales', [])->assertStatus(401);
    }

    public function test_me_endpoint_returns_unauthenticated_when_guest(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(200);
        $response->assertJson([
            'authenticated' => false,
            'tenant' => null,
        ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'owner@speedywheels.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'Invalid email or password credentials.',
        ]);
        $this->assertGuest('web');
    }

    public function test_login_fails_with_unknown_email(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@garage.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'Invalid email or password credentials for this garage.',
        ]);
        $this->assertGuest('web');
    }

    public function test_tenant_can_login_with_email_and_password(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'owner@speedywheels.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Login successful',
            'authenticated' => true,
        ]);
        $this->assertAuthenticatedAs($this->tenant, 'web');

        // Once authenticated, protected endpoints work
        $itemsResponse = $this->getJson('/api/items');
        $itemsResponse->assertStatus(200);
        $itemsResponse->assertJsonStructure(['items']);

        // Me endpoint returns authenticated true and tenant data
        $meResponse = $this->getJson('/api/me');
        $meResponse->assertStatus(200);
        $meResponse->assertJson([
            'authenticated' => true,
            'tenant' => [
                'id' => $this->tenant->id,
                'email' => 'owner@speedywheels.com',
            ],
        ]);
    }

    public function test_login_fails_when_accessing_different_garage_url(): void
    {
        Tenant::create([
            'name' => 'Prime Auto & Performance',
            'domain_name' => 'prime-auto',
            'email' => 'admin@primeauto.com',
            'password' => Hash::make('password123'),
            'subscription_plan' => 'Annual Garage Pro (Yearly)',
            'subscription_price' => 499.00,
            'expires_at' => now()->addYear(),
            'is_active' => true,
        ]);

        // Access login on prime-auto URL using speedywheels email
        $response = $this->postJson('http://prime-auto.localhost/api/login', [
            'email' => 'owner@speedywheels.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => "The email 'owner@speedywheels.com' belongs to garage domain 'localhost'. You cannot log in from the 'prime-auto' URL.",
        ]);
        $this->assertGuest('web');
    }

    public function test_tenant_can_login_without_entering_domain_taken_from_url(): void
    {
        // User does not provide domain in body, only email & password
        $response = $this->withServerVariables(['HTTP_HOST' => 'localhost'])
            ->postJson('/api/login', [
                'email' => 'owner@speedywheels.com',
                'password' => 'password123',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Login successful',
            'authenticated' => true,
        ]);
        $this->assertAuthenticatedAs($this->tenant, 'web');
    }

    public function test_tenant_can_logout_and_subsequent_requests_are_unauthorized(): void
    {
        // Login first
        $this->actingAs($this->tenant, 'web');

        $this->getJson('/api/items')->assertStatus(200);

        // Logout
        $logoutResponse = $this->postJson('/api/logout');
        $logoutResponse->assertStatus(200);
        $this->assertGuest('web');

        // Now protected endpoints are blocked again
        $this->getJson('/api/items')->assertStatus(401);
    }

    public function test_login_does_not_change_tenant_expiry_date(): void
    {
        $fixedExpiry = Carbon::parse('2028-06-15 10:00:00');
        $this->tenant->update(['expires_at' => $fixedExpiry]);

        $response = $this->postJson('/api/login', [
            'email' => 'owner@speedywheels.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);

        $this->tenant->refresh();
        $this->assertEquals(
            '2028-06-15 10:00:00',
            $this->tenant->expires_at->toDateTimeString()
        );
    }

    public function test_updating_store_settings_does_not_change_tenant_expiry_date(): void
    {
        $fixedExpiry = Carbon::parse('2029-01-15 14:30:00');
        $this->tenant->update(['expires_at' => $fixedExpiry]);

        $this->actingAs($this->tenant, 'web');

        $response = $this->putJson('/api/settings', [
            'name' => 'Updated Wholesale Center',
            'phone' => '+91 9876543210',
            'address' => 'Plot 45, Industrial Area, Pune',
            'currency' => '₹',
            'point_percentage' => 2.5,
            'expires_at' => '2035-12-31 23:59:59', // should never override
        ]);

        $response->assertStatus(200);

        $this->tenant->refresh();
        $this->assertEquals(
            '2029-01-15 14:30:00',
            $this->tenant->expires_at->toDateTimeString()
        );
        $this->assertEquals('Updated Wholesale Center', $this->tenant->name);
    }

    public function test_updating_tenant_without_expires_at_preserves_existing_expiry_date(): void
    {
        $fixedExpiry = Carbon::parse('2029-05-20 18:00:00');
        $this->tenant->update(['expires_at' => $fixedExpiry]);

        $this->actingAs($this->tenant, 'web');

        $response = $this->putJson("/api/tenants/{$this->tenant->id}", [
            'name' => 'Renamed Wholesale Enterprise',
            'domain_name' => 'speedywheels',
            'email' => 'owner@speedywheels.com',
            'phone' => '+91 9999999999',
            // expires_at omitted
        ]);

        $response->assertStatus(200);

        $this->tenant->refresh();
        $this->assertEquals(
            '2029-05-20 18:00:00',
            $this->tenant->expires_at->toDateTimeString()
        );
    }
}
