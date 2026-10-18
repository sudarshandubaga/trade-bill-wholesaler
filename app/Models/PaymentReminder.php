<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentReminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'sale_id',
        'channel',
        'recipient',
        'amount',
        'status',
        'message',
        'notes',
        'reminded_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'reminded_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
