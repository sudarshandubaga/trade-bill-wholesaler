<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChallanController;
use App\Http\Controllers\CreditDebitNoteController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\MasterController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\EnsureTenantAuthenticated;
use Illuminate\Support\Facades\Route;

// API Endpoints for the React Single Page App
Route::prefix('api')->group(function () {
    // Public Auth & Password Recovery (Guests can access to authenticate)
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    // Protected Routes: Must be authenticated
    Route::middleware([EnsureTenantAuthenticated::class])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);

        // Tenant Module (SaaS Tenants & Yearly Subscription)
        Route::get('/tenants', [TenantController::class, 'index']);
        Route::post('/tenants', [TenantController::class, 'store']);
        Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
        Route::post('/tenants/{tenant}/renew', [TenantController::class, 'renewSubscription']);
        Route::post('/tenants/{tenant}/activate-license', [TenantController::class, 'activateLicense']);
        Route::post('/tenants/{tenant}/switch', [TenantController::class, 'switchTenant']);

        // Company & Loyalty Points Settings
        Route::get('/settings', [TenantController::class, 'getSettings']);
        Route::put('/settings', [TenantController::class, 'updateSettings']);

        // Dashboard Statistics
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

        // 1. Branch / Store / Warehouse Module
        Route::get('/branches', [BranchController::class, 'index']);
        Route::post('/branches/switch', [BranchController::class, 'switchBranch']);
        Route::middleware(['permission:branch_manage'])->group(function () {
            Route::post('/branches', [BranchController::class, 'store']);
            Route::put('/branches/{id}', [BranchController::class, 'update']);
            Route::post('/branches/{id}/set-head', [BranchController::class, 'setHeadBranch']);
            Route::delete('/branches/{id}', [BranchController::class, 'destroy']);
        });

        // 2. Users, Roles & Permissions Module
        Route::middleware(['permission:user_manage'])->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{id}', [UserController::class, 'update']);
            Route::delete('/users/{id}', [UserController::class, 'destroy']);
            Route::post('/roles', [UserController::class, 'storeRole']);
            Route::put('/roles/{id}', [UserController::class, 'updateRole']);
        });

        // 3. Masters: Account (Customer, Supplier)
        Route::get('/customers', [CustomerController::class, 'index']);
        Route::post('/customers', [CustomerController::class, 'store']);
        Route::put('/customers/{id}', [CustomerController::class, 'update']);
        Route::middleware(['permission:customers'])->group(function () {
            Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);
        });

        Route::middleware(['permission:suppliers'])->group(function () {
            Route::get('/suppliers', [SupplierController::class, 'index']);
            Route::post('/suppliers', [SupplierController::class, 'store']);
            Route::put('/suppliers/{id}', [SupplierController::class, 'update']);
            Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);
            Route::get('/suppliers/{id}/ledger', [SupplierController::class, 'ledger']);
        });

        // 3. Masters: Items (Brand, HSN/SAC, Category, Item, Barcode Printing)
        Route::get('/brands', [MasterController::class, 'brands']);
        Route::middleware(['permission:brands'])->group(function () {
            Route::post('/brands', [MasterController::class, 'storeBrand']);
            Route::put('/brands/{id}', [MasterController::class, 'updateBrand']);
            Route::delete('/brands/{id}', [MasterController::class, 'destroyBrand']);
        });

        Route::get('/hsn-codes', [MasterController::class, 'hsnCodes']);
        Route::middleware(['permission:hsn'])->group(function () {
            Route::post('/hsn-codes', [MasterController::class, 'storeHsn']);
            Route::put('/hsn-codes/{id}', [MasterController::class, 'updateHsn']);
            Route::delete('/hsn-codes/{id}', [MasterController::class, 'destroyHsn']);
        });

        Route::get('/categories', [CategoryController::class, 'index']);
        Route::middleware(['permission:categories'])->group(function () {
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{id}', [CategoryController::class, 'update']);
            Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
        });

        Route::get('/items', [ItemController::class, 'index']);
        Route::middleware(['permission:items'])->group(function () {
            Route::post('/items', [ItemController::class, 'store']);
            Route::put('/items/{id}', [ItemController::class, 'update']);
            Route::delete('/items/{id}', [ItemController::class, 'destroy']);
            Route::post('/items/bulk-barcodes', [MasterController::class, 'bulkUpdateBarcodes']);
            Route::post('/items/auto-generate-barcodes', [MasterController::class, 'autoGenerateMissingBarcodes']);
        });

        // 4. Voucher / Challan Module
        Route::middleware(['permission:challan'])->group(function () {
            Route::get('/challans', [ChallanController::class, 'index']);
            Route::post('/challans', [ChallanController::class, 'store']);
            Route::get('/challans/{id}', [ChallanController::class, 'show']);
        });

        Route::middleware(['permission:vouchers'])->group(function () {
            Route::get('/vouchers', [\App\Http\Controllers\VoucherController::class, 'index']);
            Route::post('/vouchers', [\App\Http\Controllers\VoucherController::class, 'store']);
        });

        // Payment Reminders Module
        Route::middleware(['permission:vouchers,customers,pos'])->group(function () {
            Route::get('/payment-reminders', [\App\Http\Controllers\PaymentReminderController::class, 'index']);
            Route::post('/payment-reminders/log', [\App\Http\Controllers\PaymentReminderController::class, 'log']);
            Route::post('/payment-reminders/settle', [\App\Http\Controllers\PaymentReminderController::class, 'settle']);
        });

        Route::middleware(['permission:credit_debit_note'])->group(function () {
            Route::get('/credit-debit-notes', [CreditDebitNoteController::class, 'index']);
            Route::post('/credit-debit-notes', [CreditDebitNoteController::class, 'store']);
        });

        Route::middleware(['permission:stock_dump'])->group(function () {
            Route::get('/stock-adjustments', [StockAdjustmentController::class, 'index']);
            Route::post('/stock-adjustments', [StockAdjustmentController::class, 'store']);
        });

        // 5. Purchase Module (Intra State, Inter State, Unregistered)
        Route::middleware(['permission:purchase'])->group(function () {
            Route::get('/purchases', [PurchaseController::class, 'index']);
            Route::post('/purchases', [PurchaseController::class, 'store']);
            Route::get('/purchases/{id}', [PurchaseController::class, 'show']);
        });

        // 6. POS & Sales Module
        Route::get('/sales', [SaleController::class, 'index']);
        Route::get('/sales/{id}', [SaleController::class, 'show']);
        Route::middleware(['permission:pos'])->group(function () {
            Route::post('/sales', [SaleController::class, 'store']);
        });

        // 7. Comprehensive Reports
        Route::middleware(['permission:reports,daybook,sale_reports'])->group(function () {
            Route::get('/reports/purchases', [ReportController::class, 'purchaseReports']);
            Route::get('/reports/sales', [ReportController::class, 'saleReports']);
            Route::get('/reports/daybook', [ReportController::class, 'daybook']);
            Route::get('/reports/cashbook', [ReportController::class, 'cashbook']);
            Route::get('/reports/bank-entry', [ReportController::class, 'bankEntry']);
            Route::get('/reports/stock', [ReportController::class, 'stockReports']);
            Route::get('/reports/ledger', [ReportController::class, 'partyLedger']);
        });
    });
});

// Single Page Application entrypoint
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
