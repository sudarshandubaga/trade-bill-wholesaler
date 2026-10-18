<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->string('channel')->default('whatsapp'); // whatsapp, sms, email, manual
            $table->string('recipient')->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('status')->default('sent'); // sent, pending, settled
            $table->text('message')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('reminded_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_reminders');
    }
};
