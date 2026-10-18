<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CreditDebitNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'note_no',
        'note_date',
        'type', // 'credit_note', 'debit_note'
        'party_type', // 'customer', 'supplier'
        'party_id',
        'party_name',
        'original_invoice_no',
        'reason',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'affects_stock',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'note_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'affects_stock' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CreditDebitNoteItem::class, 'note_id');
    }
}
