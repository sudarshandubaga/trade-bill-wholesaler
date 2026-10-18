<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        Tenant::create([
            'name' => 'Speedy Wheels Garage',
            'domain_name' => 'localhost',
            'email' => 'owner@speedywheels.com',
            'password' => bcrypt('password123'),
            'subscription_plan' => 'Annual Garage Pro (Yearly)',
            'subscription_price' => 499.00,
            'expires_at' => now()->addYear(),
        ]);

        $response = $this->get('/');

        $response->assertStatus(200);
    }
}
