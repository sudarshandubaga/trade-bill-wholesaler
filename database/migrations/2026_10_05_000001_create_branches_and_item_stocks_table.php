<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name'); // e.g. "City Mall Store", "Central Warehouse"
            $table->string('code')->nullable(); // e.g. "STR-01", "WH-01"
            $table->enum('type', ['store', 'warehouse', 'branch'])->default('store');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'type']);
        });

        Schema::create('item_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2)->default(0.00);
            $table->timestamps();

            $table->unique(['tenant_id', 'branch_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_stocks');
        Schema::dropIfExists('branches');
    }
};
