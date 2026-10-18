<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'name',
        'email',
        'phone',
        'password',
        'role', // super_admin, branch_manager, saleperson, etc.
        'role_id',
        'permissions',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'is_super_admin',
        'effective_permissions',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
            'is_active' => 'boolean',
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

    public function roleModel(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function getIsSuperAdminAttribute(): bool
    {
        return $this->role === 'super_admin' || $this->role === 'admin';
    }

    public function getEffectivePermissionsAttribute(): array
    {
        if ($this->is_super_admin) {
            return ['*'];
        }

        if (! empty($this->permissions) && is_array($this->permissions)) {
            return $this->permissions;
        }

        if ($this->roleModel && ! empty($this->roleModel->permissions)) {
            return $this->roleModel->permissions;
        }

        // Standard role fallback defaults
        if ($this->role === 'branch_manager') {
            return [
                'pos', 'customers', 'suppliers', 'brands', 'hsn', 'categories',
                'items', 'barcode_print', 'challan', 'vouchers', 'credit_debit_note',
                'purchase', 'reports', 'stock_dump',
            ];
        }

        if ($this->role === 'saleperson') {
            return ['pos', 'customers', 'barcode_print', 'daybook', 'sale_reports'];
        }

        return ['pos'];
    }

    public function hasPermission(string $perm): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        $perms = $this->effective_permissions;
        if (in_array('*', $perms) || in_array($perm, $perms)) {
            return true;
        }

        $aliases = [
            'purchases' => 'purchase',
            'purchase' => 'purchases',
            'challans' => 'challan',
            'challan' => 'challans',
            'vouchers' => 'voucher',
            'voucher' => 'vouchers',
            'notes' => 'credit_debit_note',
            'credit_debit_note' => 'notes',
            'adjustments' => 'stock_dump',
            'stock_dump' => 'adjustments',
            'items' => 'item',
            'item' => 'items',
            'sale_reports' => 'reports',
            'daybook' => 'reports',
        ];

        if (isset($aliases[$perm]) && in_array($aliases[$perm], $perms)) {
            return true;
        }

        return false;
    }
}
