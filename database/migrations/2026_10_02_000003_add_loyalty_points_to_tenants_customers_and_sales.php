<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->decimal('point_percentage', 5, 2)->default(0.00)->after('currency');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('points', 10, 2)->default(0.00)->after('vehicle_model');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('points_earned', 10, 2)->default(0.00)->after('discount_amount');
            $table->decimal('points_redeemed', 10, 2)->default(0.00)->after('points_earned');
            $table->decimal('points_discount', 10, 2)->default(0.00)->after('points_redeemed');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['points_earned', 'points_redeemed', 'points_discount']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('points');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('point_percentage');
        });
    }
};
