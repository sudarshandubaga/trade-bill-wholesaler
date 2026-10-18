<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Challan extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'target_branch_id',
        'challan_no',
        'challan_date',
        'type', // 'inward', 'outward'
        'purpose', // 'transfer', 'delivery', 'job_work', 'sample', 'return'
        'party_name',
        'vehicle_no',
        'status', // 'completed', 'pending', 'in_transit'
        'total_quantity',
        'total_value',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'challan_date' => 'date',
            'total_quantity' => 'decimal:2',
            'total_value' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function targetBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'target_branch_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ChallanItem::class);
    }
}
