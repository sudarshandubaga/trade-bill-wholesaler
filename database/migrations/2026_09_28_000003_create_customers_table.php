<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('vehicle_no');
            $table->string('mobile_no')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('vehicle_model')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'vehicle_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
