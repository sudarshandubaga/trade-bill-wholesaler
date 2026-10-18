<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voucher extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'voucher_no',
        'voucher_date',
        'type', // 'payment', 'receipt'
        'party_type', // 'customer', 'supplier', 'expense', 'other'
        'party_id',
        'party_name',
        'payment_mode', // 'cash', 'bank', 'upi', 'cheque'
        'reference_no',
        'amount',
        'narration',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'voucher_date' => 'date',
            'amount' => 'decimal:2',
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
}
