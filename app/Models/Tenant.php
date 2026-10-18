<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Tenant extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'domain_name',
        'email',
        'password',
        'phone',
        'address',
        'currency',
        'point_percentage',
        'subscription_plan',
        'subscription_price',
        'expires_at',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'days_remaining',
        'is_expired',
        'subscription_status',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'subscription_price' => 'decimal:2',
            'point_percentage' => 'decimal:2',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function suppliers(): HasMany
    {
        return $this->hasMany(Supplier::class);
    }

    public function brands(): HasMany
    {
        return $this->hasMany(Brand::class);
    }

    public function hsnCodes(): HasMany
    {
        return $this->hasMany(HsnCode::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function challans(): HasMany
    {
        return $this->hasMany(Challan::class);
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(Voucher::class);
    }

    public function creditDebitNotes(): HasMany
    {
        return $this->hasMany(CreditDebitNote::class);
    }

    public function stockAdjustments(): HasMany
    {
        return $this->hasMany(StockAdjustment::class);
    }

    public function getDaysRemainingAttribute(): int
    {
        if (! $this->expires_at) {
            return 0;
        }

        $diff = Carbon::now()->diffInDays($this->expires_at, false);
        return (int) $diff;
    }

    public function getIsExpiredAttribute(): bool
    {
        if (! $this->expires_at) {
            return true;
        }

        return Carbon::now()->greaterThan($this->expires_at);
    }

    public function getSubscriptionStatusAttribute(): string
    {
        if ($this->is_expired) {
            return 'Expired';
        }

        if ($this->days_remaining <= 15) {
            return 'Expiring Soon';
        }

        return 'Active';
    }
}
