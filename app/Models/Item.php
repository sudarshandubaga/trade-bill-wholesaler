<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'short_name',
        'hsn_sac',
        'brand',
        'category',
        'purchase_price',
        'price',
        'gst_percent',
        'barcode',
        'image_url',
        'type', // 'general', 'grouped'
        'grouped_items', // json array of [{item_id, item_name, quantity, price}]
        'stock_quantity',
        'min_stock_alert',
        'unit',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'purchase_price' => 'decimal:2',
            'price' => 'decimal:2',
            'gst_percent' => 'decimal:2',
            'stock_quantity' => 'decimal:2',
            'min_stock_alert' => 'decimal:2',
            'grouped_items' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function itemStocks(): HasMany
    {
        return $this->hasMany(ItemStock::class);
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function stockAdjustments(): HasMany
    {
        return $this->hasMany(StockAdjustment::class);
    }
}
