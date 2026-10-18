<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChallanItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'challan_id',
        'item_id',
        'item_name',
        'barcode',
        'quantity',
        'rate',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'rate' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function challan(): BelongsTo
    {
        return $this->belongsTo(Challan::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
