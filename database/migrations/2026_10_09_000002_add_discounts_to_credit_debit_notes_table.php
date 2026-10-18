<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credit_debit_notes', function (Blueprint $table) {
            $table->decimal('discount_amount', 12, 2)->default(0.00)->after('subtotal');
        });

        Schema::table('credit_debit_note_items', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->default(0.00)->after('unit_price');
            $table->decimal('discount_amount', 12, 2)->default(0.00)->after('discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('credit_debit_notes', function (Blueprint $table) {
            $table->dropColumn(['discount_amount']);
        });

        Schema::table('credit_debit_note_items', function (Blueprint $table) {
            $table->dropColumn(['discount_percent', 'discount_amount']);
        });
    }
};
