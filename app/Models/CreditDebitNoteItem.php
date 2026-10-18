<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditDebitNoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'note_id',
        'item_id',
        'item_name',
        'barcode',
        'quantity',
        'unit_price',
        'discount_percent',
        'discount_amount',
        'gst_percent',
        'tax_amount',
        'total_price',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'discount_percent' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'gst_percent' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function note(): BelongsTo
    {
        return $this->belongsTo(CreditDebitNote::class, 'note_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
