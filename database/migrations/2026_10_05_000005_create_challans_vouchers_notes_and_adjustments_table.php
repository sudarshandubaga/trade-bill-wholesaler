<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Challans & Challan Items (Inward / Outward / Warehouse Transfer)
        Schema::create('challans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete(); // Source or Receiving branch
            $table->foreignId('target_branch_id')->nullable()->constrained('branches')->nullOnDelete(); // For branch-to-warehouse or warehouse-to-store
            $table->string('challan_no'); // e.g. "CHL-202610-0001"
            $table->date('challan_date');
            $table->enum('type', ['inward', 'outward'])->default('inward');
            $table->string('purpose', 100)->default('transfer'); // transfer, delivery, job_work, sample, return
            $table->string('party_name')->nullable(); // Customer / Vendor / Transport
            $table->string('vehicle_no')->nullable();
            $table->string('status', 30)->default('completed'); // completed, pending, in_transit
            $table->decimal('total_quantity', 12, 2)->default(0.00);
            $table->decimal('total_value', 12, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'challan_no']);
            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'challan_date']);
        });

        Schema::create('challan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('challan_id')->constrained('challans')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->string('item_name');
            $table->string('barcode')->nullable();
            $table->decimal('quantity', 12, 2)->default(1.00);
            $table->decimal('rate', 12, 2)->default(0.00);
            $table->decimal('total', 12, 2)->default(0.00);
            $table->timestamps();
        });

        // 2. Vouchers (Payment / Receipt)
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('voucher_no'); // e.g. "VCH-202610-0001"
            $table->date('voucher_date');
            $table->enum('type', ['payment', 'receipt'])->default('receipt');
            $table->enum('party_type', ['customer', 'supplier', 'expense', 'other'])->default('customer');
            $table->unsignedBigInteger('party_id')->nullable();
            $table->string('party_name');
            $table->string('payment_mode', 30)->default('cash'); // cash, bank, upi, cheque
            $table->string('reference_no')->nullable(); // Cheque/UTR/Txn ID
            $table->decimal('amount', 12, 2)->default(0.00);
            $table->text('narration')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'voucher_no']);
            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'voucher_date']);
        });

        // 3. Credit Note & Debit Note
        Schema::create('credit_debit_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('note_no'); // e.g. "CN-202610-0001", "DN-202610-0001"
            $table->date('note_date');
            $table->enum('type', ['credit_note', 'debit_note'])->default('credit_note'); // credit_note (Sales Return / Customer), debit_note (Purchase Return / Supplier)
            $table->enum('party_type', ['customer', 'supplier'])->default('customer');
            $table->unsignedBigInteger('party_id')->nullable();
            $table->string('party_name');
            $table->string('original_invoice_no')->nullable();
            $table->string('reason')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->boolean('affects_stock')->default(true); // Return goods to/from inventory
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'note_no']);
            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'note_date']);
        });

        Schema::create('credit_debit_note_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->constrained('credit_debit_notes')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->string('item_name');
            $table->string('barcode')->nullable();
            $table->decimal('quantity', 12, 2)->default(1.00);
            $table->decimal('unit_price', 12, 2)->default(0.00);
            $table->decimal('gst_percent', 5, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('total_price', 12, 2)->default(0.00);
            $table->timestamps();
        });

        // 4. Stock Adjustments (Dump / Damaged / Expired / Wastage)
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->string('item_name');
            $table->enum('type', ['dump', 'damaged', 'expired', 'wastage', 'manual_adjustment'])->default('dump');
            $table->decimal('quantity', 12, 2)->default(1.00); // Amount to adjust / reduce
            $table->decimal('item_cost', 12, 2)->default(0.00);
            $table->text('reason')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'created_at']);
        });

        // 5. Enhance Sales Table
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained('branches')->nullOnDelete();
            $table->string('created_by')->nullable()->after('notes');
            $table->decimal('cgst_amount', 12, 2)->default(0.00)->after('tax_amount');
            $table->decimal('sgst_amount', 12, 2)->default(0.00)->after('cgst_amount');
            $table->decimal('igst_amount', 12, 2)->default(0.00)->after('sgst_amount');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['branch_id', 'created_by', 'cgst_amount', 'sgst_amount', 'igst_amount']);
        });

        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('credit_debit_note_items');
        Schema::dropIfExists('credit_debit_notes');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('challan_items');
        Schema::dropIfExists('challans');
    }
};
