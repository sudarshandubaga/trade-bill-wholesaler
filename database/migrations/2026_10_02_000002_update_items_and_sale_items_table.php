<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('short_name')->nullable()->change();
            $table->decimal('gst_percent', 5, 2)->default(18.00)->after('price');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('gst_percent', 5, 2)->default(0.00)->after('quantity');
            $table->decimal('tax_amount', 10, 2)->default(0.00)->after('gst_percent');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('gst_percent');
            $table->string('short_name')->nullable(false)->change();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['gst_percent', 'tax_amount']);
        });
    }
};
