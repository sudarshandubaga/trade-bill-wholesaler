<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Brands Master
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'name']);
        });

        // 2. HSN / SAC Master
        Schema::create('hsn_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('hsn_code');
            $table->string('description')->nullable();
            $table->decimal('gst_percent', 5, 2)->default(18.00);
            $table->enum('type', ['goods', 'service'])->default('goods');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'hsn_code']);
        });

        // 3. Suppliers Master
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->string('mobile_no')->nullable();
            $table->string('email')->nullable();
            $table->string('gstin')->nullable();
            $table->string('state')->nullable();
            $table->string('city')->nullable();
            $table->text('address')->nullable();
            $table->decimal('opening_balance', 12, 2)->default(0.00);
            $table->decimal('current_balance', 12, 2)->default(0.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'name']);
            $table->index(['tenant_id', 'mobile_no']);
        });

        // 4. Update Customers Table
        Schema::table('customers', function (Blueprint $table) {
            $table->string('vehicle_no')->nullable()->change();
            $table->string('gstin')->nullable()->after('email');
            $table->string('state')->nullable()->after('gstin');
            $table->string('city')->nullable()->after('state');
            $table->decimal('opening_balance', 12, 2)->default(0.00)->after('address');
            $table->decimal('current_balance', 12, 2)->default(0.00)->after('opening_balance');
        });

        // 5. Update Items Table
        Schema::table('items', function (Blueprint $table) {
            $table->string('hsn_sac')->nullable()->after('short_name');
            $table->string('brand')->nullable()->after('hsn_sac');
            $table->decimal('purchase_price', 10, 2)->default(0.00)->after('category');
            $table->string('barcode')->nullable()->after('gst_percent');
            $table->longText('image_url')->nullable()->after('barcode');
            $table->enum('type', ['general', 'grouped'])->default('general')->after('image_url');
            $table->json('grouped_items')->nullable()->after('type');
            $table->decimal('stock_quantity', 12, 2)->default(0.00)->after('grouped_items');
            $table->decimal('min_stock_alert', 12, 2)->default(5.00)->after('stock_quantity');
            $table->string('unit', 30)->default('Pcs')->after('min_stock_alert');

            $table->index(['tenant_id', 'barcode']);
            $table->index(['tenant_id', 'brand']);
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'barcode']);
            $table->dropIndex(['tenant_id', 'brand']);
            $table->dropColumn([
                'hsn_sac',
                'brand',
                'purchase_price',
                'barcode',
                'image_url',
                'type',
                'grouped_items',
                'stock_quantity',
                'min_stock_alert',
                'unit',
            ]);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['gstin', 'state', 'city', 'opening_balance', 'current_balance']);
        });

        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('hsn_codes');
        Schema::dropIfExists('brands');
    }
};
