<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->boolean('is_head')->default(false)->after('type');
            $table->boolean('is_primary')->default(false)->after('is_head');
        });

        // Ensure for every existing tenant, at least one branch is marked as head/primary
        $tenants = DB::table('branches')->select('tenant_id')->distinct()->pluck('tenant_id');
        foreach ($tenants as $tenantId) {
            $firstBranch = DB::table('branches')->where('tenant_id', $tenantId)->orderBy('id')->first();
            if ($firstBranch) {
                DB::table('branches')->where('id', $firstBranch->id)->update([
                    'is_head' => true,
                    'is_primary' => true,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['is_head', 'is_primary']);
        });
    }
};
