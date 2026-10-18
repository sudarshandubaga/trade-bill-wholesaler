<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_id',
        'item_id',
        'item_name',
        'barcode',
        'quantity',
        'purchase_price',
        'gst_percent',
        'tax_amount',
        'total_price',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'purchase_price' => 'decimal:2',
            'gst_percent' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
