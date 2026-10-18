<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('supplier_name')->nullable();
            $table->string('purchase_no'); // e.g. "PUR-202610-0001"
            $table->string('supplier_bill_no')->nullable();
            $table->date('purchase_date');
            $table->enum('purchase_type', ['intra_state', 'inter_state', 'unregistered'])->default('intra_state');
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('cgst_amount', 12, 2)->default(0.00);
            $table->decimal('sgst_amount', 12, 2)->default(0.00);
            $table->decimal('igst_amount', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->decimal('paid_amount', 12, 2)->default(0.00);
            $table->string('payment_status', 30)->default('Paid'); // Paid, Partial, Unpaid
            $table->string('payment_method', 50)->default('Bank Transfer'); // Cash, Bank Transfer, UPI, Credit
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'purchase_no']);
            $table->index(['tenant_id', 'purchase_date']);
            $table->index(['tenant_id', 'purchase_type']);
        });

        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('purchases')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->string('item_name');
            $table->string('barcode')->nullable();
            $table->decimal('quantity', 12, 2)->default(1.00);
            $table->decimal('purchase_price', 12, 2);
            $table->decimal('gst_percent', 5, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('total_price', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
    }
};
