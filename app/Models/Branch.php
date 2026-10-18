<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'type', // 'store', 'warehouse', 'branch'
        'phone',
        'email',
        'address',
        'city',
        'state',
        'pincode',
        'is_active',
        'is_head',
        'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_head' => 'boolean',
            'is_primary' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function itemStocks(): HasMany
    {
        return $this->hasMany(ItemStock::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }
}
