<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('name'); // e.g. "Super Admin", "Branch Manager", "Saleperson"
            $table->string('slug');
            $table->string('description')->nullable();
            $table->json('permissions')->nullable(); // array of granted permissions
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'slug']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->after('tenant_id')->constrained('branches')->nullOnDelete();
            $table->string('role')->default('saleperson')->after('password'); // super_admin, branch_manager, saleperson, etc.
            $table->foreignId('role_id')->nullable()->after('role')->constrained('roles')->nullOnDelete();
            $table->json('permissions')->nullable()->after('role_id');
            $table->string('phone')->nullable()->after('email');
            $table->boolean('is_active')->default(true)->after('permissions');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['branch_id']);
            $table->dropForeign(['role_id']);
            $table->dropColumn(['tenant_id', 'branch_id', 'role', 'role_id', 'permissions', 'phone', 'is_active']);
        });

        Schema::dropIfExists('roles');
    }
};
