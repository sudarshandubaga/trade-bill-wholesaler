<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'mobile_no',
        'email',
        'gstin',
        'state',
        'city',
        'address',
        'opening_balance',
        'current_balance',
        'vehicle_no',
        'vehicle_model',
        'points',
    ];

    protected function casts(): array
    {
        return [
            'points' => 'decimal:2',
            'opening_balance' => 'decimal:2',
            'current_balance' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(Voucher::class, 'party_id')->where('party_type', 'customer');
    }

    public function creditDebitNotes(): HasMany
    {
        return $this->hasMany(CreditDebitNote::class, 'party_id')->where('party_type', 'customer');
    }
}
