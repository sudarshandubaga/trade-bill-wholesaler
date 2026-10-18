<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HsnCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'hsn_code',
        'description',
        'gst_percent',
        'type', // 'goods', 'service'
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'gst_percent' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
