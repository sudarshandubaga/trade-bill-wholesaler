<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\HsnCode;
use App\Models\Item;
use App\Models\ItemStock;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Primary Tenant (Retail Store, Mall & Warehouse Company)
        $tenant = Tenant::updateOrCreate(
            ['email' => 'owner@tradebill.com'],
            [
                'name' => 'Metro SuperMall & Retail Mart',
                'domain_name' => 'localhost',
                'email' => 'owner@tradebill.com',
                'password' => Hash::make('password123'),
                'phone' => '+91 98765 43210',
                'address' => 'Floor 1-3, Phoenix Grand Mall, City Center',
                'currency' => '₹',
                'subscription_plan' => 'Enterprise Store & Warehouse ERP',
                'subscription_price' => 999.00,
                'point_percentage' => 2.00,
                'expires_at' => Carbon::now()->addYear(),
                'is_active' => true,
            ]
        );

        // Also update existing speedy-motors tenant domain fallback if exists
        Tenant::where('email', 'owner@speedywheels.com')->update([
            'name' => 'Speedy Mart & Warehouse'
        ]);

        // 2. Seed Branches / Stores / Warehouses
        $branchWarehouse = Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'WH-01'],
            [
                'name' => 'Central Logistics Warehouse',
                'type' => 'warehouse',
                'phone' => '+91 98765 11111',
                'email' => 'warehouse@tradebill.com',
                'address' => 'Plot 45, Industrial Zone Logistics Park',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400072',
                'is_active' => true,
            ]
        );

        $branchStore1 = Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'STR-01'],
            [
                'name' => 'City Center Mall Store (Counter 1)',
                'type' => 'store',
                'phone' => '+91 98765 22222',
                'email' => 'mallstore@tradebill.com',
                'address' => 'Shop 104, Phoenix Grand Mall, City Center',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400001',
                'is_active' => true,
            ]
        );

        $branchStore2 = Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'STR-02'],
            [
                'name' => 'West End Outlet Branch',
                'type' => 'branch',
                'phone' => '+91 98765 33333',
                'email' => 'westend@tradebill.com',
                'address' => '88 West Avenue, High Street Market',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400050',
                'is_active' => true,
            ]
        );

        $branchStore3 = Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'STR-03'],
            [
                'name' => 'North Point Hypermarket & Express Counter',
                'type' => 'store',
                'phone' => '+91 98765 44444',
                'email' => 'northpoint@tradebill.com',
                'address' => 'Unit 22, North Point Galleria, Link Road',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400064',
                'is_active' => true,
            ]
        );

        $branchWarehouse2 = Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'WH-02'],
            [
                'name' => 'Airport Cargo Hub & Fulfillment Depot',
                'type' => 'warehouse',
                'phone' => '+91 98765 55555',
                'email' => 'aircargohub@tradebill.com',
                'address' => 'Sahar Cargo Terminal, Andheri East',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400099',
                'is_active' => true,
            ]
        );

        // 3. Seed Roles with granular permissions
        $roleSuperAdmin = Role::updateOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'super_admin'],
            [
                'name' => 'Super Admin',
                'description' => 'Unrestricted access to all branches, stores, warehouses, settings and users',
                'permissions' => ['*'],
                'is_system' => true,
            ]
        );

        $roleBranchManager = Role::updateOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'branch_manager'],
            [
                'name' => 'Branch Manager',
                'description' => 'Manages branch POS sales, stock, challans, vouchers, purchases and reports',
                'permissions' => [
                    'pos', 'customers', 'suppliers', 'brands', 'hsn', 'categories',
                    'items', 'barcode_print', 'challan', 'vouchers', 'credit_debit_note',
                    'purchase', 'reports', 'stock_dump',
                ],
                'is_system' => true,
            ]
        );

        $roleSaleperson = Role::updateOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => 'saleperson'],
            [
                'name' => 'Saleperson',
                'description' => 'Handles POS billing counters, customers and barcode scanning',
                'permissions' => [
                    'pos', 'customers', 'barcode_print', 'daybook', 'sale_reports',
                ],
                'is_system' => true,
            ]
        );

        // 4. Seed Users for the Roles
        User::updateOrCreate(
            ['email' => 'admin@tradebill.com'],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branchStore1->id,
                'name' => 'Super Admin (Executive)',
                'phone' => '+91 98765 00001',
                'password' => Hash::make('password123'),
                'role' => 'super_admin',
                'role_id' => $roleSuperAdmin->id,
                'permissions' => ['*'],
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'manager@tradebill.com'],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branchStore1->id,
                'name' => 'Rahul Sharma (Branch Manager)',
                'phone' => '+91 98765 00002',
                'password' => Hash::make('password123'),
                'role' => 'branch_manager',
                'role_id' => $roleBranchManager->id,
                'permissions' => null,
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'sales@tradebill.com'],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branchStore1->id,
                'name' => 'Pooja Verma (Billing Staff)',
                'phone' => '+91 98765 00003',
                'password' => Hash::make('password123'),
                'role' => 'saleperson',
                'role_id' => $roleSaleperson->id,
                'permissions' => null,
                'is_active' => true,
            ]
        );

        // Users for Branch STR-03 (North Point Hypermarket & Express Counter)
        User::updateOrCreate(
            ['email' => 'north.manager@tradebill.com'],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branchStore3->id,
                'name' => 'Vikramaditya Joshi (Branch Manager)',
                'phone' => '+91 98765 00004',
                'password' => Hash::make('password123'),
                'role' => 'branch_manager',
                'role_id' => $roleBranchManager->id,
                'permissions' => null,
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'north.cashier@tradebill.com'],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branchStore3->id,
                'name' => 'Sneha Kulkarni (Senior Cashier)',
                'phone' => '+91 98765 00005',
                'password' => Hash::make('password123'),
                'role' => 'saleperson',
                'role_id' => $roleSaleperson->id,
                'permissions' => null,
                'is_active' => true,
            ]
        );

        // Users for Branch WH-02 (Airport Cargo Hub & Fulfillment Depot)
        User::updateOrCreate(
            ['email' => 'cargo.manager@tradebill.com'],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branchWarehouse2->id,
                'name' => 'Arun Mehra (Logistics Incharge)',
                'phone' => '+91 98765 00006',
                'password' => Hash::make('password123'),
                'role' => 'branch_manager',
                'role_id' => $roleBranchManager->id,
                'permissions' => null,
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'cargo.dispatch@tradebill.com'],
            [
                'tenant_id' => $tenant->id,
                'branch_id' => $branchWarehouse2->id,
                'name' => 'Karan Malhotra (Dispatch Officer)',
                'phone' => '+91 98765 00007',
                'password' => Hash::make('password123'),
                'role' => 'saleperson',
                'role_id' => $roleSaleperson->id,
                'permissions' => null,
                'is_active' => true,
            ]
        );

        // 5. Seed Categories Master (Stationery Categories Only)
        $categoriesList = [
            ['name' => 'Stationery & Office Supplies', 'type' => 'Both', 'description' => 'Notebooks, pens, registers, paper & desk supplies'],
            ['name' => 'Writing Instruments & Pens', 'type' => 'Part', 'description' => 'Ball pens, gel pens, highlighters & markers'],
            ['name' => 'Paper Products & Notebooks', 'type' => 'Part', 'description' => 'Spiral registers, copiers, diaries & letter pads'],
            ['name' => 'Desk Accessories & Binding', 'type' => 'Part', 'description' => 'Staplers, punches, tapes, scissors & clips'],
        ];

        foreach ($categoriesList as $cat) {
            Category::updateOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $cat['name']],
                ['type' => $cat['type'], 'description' => $cat['description'], 'is_active' => true]
            );
        }

        // 6. Seed Brands Master (Stationery Brands)
        $brandsList = [
            ['name' => 'Classmate', 'code' => 'CLS', 'description' => 'Premium notebooks and stationery paper'],
            ['name' => 'Reynolds', 'code' => 'RYN', 'description' => 'Classic ballpoint, roller and gel pens'],
            ['name' => 'Faber-Castell', 'code' => 'FBC', 'description' => 'Fine writing, art and coloring stationery'],
            ['name' => 'Camlin', 'code' => 'CML', 'description' => 'Geometry boxes, markers and art products'],
            ['name' => 'Doms', 'code' => 'DMS', 'description' => 'Graphite pencils, erasers and sharpeners'],
            ['name' => 'Kangaro', 'code' => 'KNG', 'description' => 'Desk staplers, paper punches and staple pins'],
            ['name' => 'JK Copier', 'code' => 'JKC', 'description' => 'A4 copier and multipurpose printing paper'],
            ['name' => 'Scotch 3M', 'code' => '3M', 'description' => 'Adhesive tapes and office essentials'],
            ['name' => 'Store Choice', 'code' => 'STC', 'description' => 'In-house store & mart brand'],
        ];

        foreach ($brandsList as $b) {
            Brand::updateOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $b['name']],
                ['code' => $b['code'], 'description' => $b['description'], 'is_active' => true]
            );
        }

        // 7. Seed HSN / SAC Master (Stationery HSN Codes)
        $hsnList = [
            ['hsn_code' => '4820', 'description' => 'Registers, notebooks, letter pads, diaries & stationery paper', 'gst_percent' => 12.00, 'type' => 'goods'],
            ['hsn_code' => '9608', 'description' => 'Ball point pens, gel pens, felt tipped markers & highlighters', 'gst_percent' => 18.00, 'type' => 'goods'],
            ['hsn_code' => '9609', 'description' => 'Graphite pencils, color pencils, crayons & pastels', 'gst_percent' => 12.00, 'type' => 'goods'],
            ['hsn_code' => '8305', 'description' => 'Staplers, paper clips, binder clips, base metal office supplies', 'gst_percent' => 18.00, 'type' => 'goods'],
            ['hsn_code' => '9017', 'description' => 'Mathematical drawing instruments, geometry boxes & rulers', 'gst_percent' => 18.00, 'type' => 'goods'],
            ['hsn_code' => '3919', 'description' => 'Self-adhesive tape, transparent packing tapes & dispensers', 'gst_percent' => 18.00, 'type' => 'goods'],
        ];

        foreach ($hsnList as $h) {
            HsnCode::updateOrCreate(
                ['tenant_id' => $tenant->id, 'hsn_code' => $h['hsn_code']],
                ['description' => $h['description'], 'gst_percent' => $h['gst_percent'], 'type' => $h['type'], 'is_active' => true]
            );
        }

        // 7. Seed Suppliers Master
        $suppliersList = [
            [
                'name' => 'Apex Wholesale Traders Pvt Ltd',
                'company_name' => 'Apex Logistics Corp',
                'mobile_no' => '+91 98200 12345',
                'email' => 'sales@apexwholesale.com',
                'gstin' => '27AABCA1234F1Z5',
                'state' => 'Maharashtra',
                'city' => 'Mumbai',
                'address' => 'Plot 12, APMC Market Yard, Vashi',
                'opening_balance' => 0.00,
            ],
            [
                'name' => 'National Electronics Distributors',
                'company_name' => 'National Electro Hub',
                'mobile_no' => '+91 98110 54321',
                'email' => 'contact@nationalelectro.in',
                'gstin' => '07AAACN5678M1ZQ',
                'state' => 'Delhi',
                'city' => 'New Delhi',
                'address' => 'Nehru Place Commercial Complex',
                'opening_balance' => 15000.00,
            ],
            [
                'name' => 'Southern Apparel & Cotton Mills',
                'company_name' => 'Southern Textiles Ltd',
                'mobile_no' => '+91 98450 99887',
                'email' => 'orders@southerntextiles.com',
                'gstin' => '33AAACS9012K1Z3',
                'state' => 'Tamil Nadu',
                'city' => 'Tirupur',
                'address' => 'Export Weaving Park, Avinashi Road',
                'opening_balance' => 0.00,
            ],
            [
                'name' => 'Kisan Fresh Farm Collective',
                'company_name' => 'Green Valley Agro',
                'mobile_no' => '+91 94220 33445',
                'email' => 'fresh@greenvalleyagro.in',
                'gstin' => null, // Unregistered Supplier
                'state' => 'Maharashtra',
                'city' => 'Nashik',
                'address' => 'Village Niphad, Nashik Rural',
                'opening_balance' => 0.00,
            ],
        ];

        foreach ($suppliersList as $s) {
            Supplier::updateOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $s['name']],
                [
                    'company_name' => $s['company_name'],
                    'mobile_no' => $s['mobile_no'],
                    'email' => $s['email'],
                    'gstin' => $s['gstin'],
                    'state' => $s['state'],
                    'city' => $s['city'],
                    'address' => $s['address'],
                    'opening_balance' => $s['opening_balance'],
                    'current_balance' => $s['opening_balance'],
                    'is_active' => true,
                ]
            );
        }

        // 8. Seed Store & Mall Customers
        $customersData = [
            [
                'name' => 'Aarav Mehta',
                'mobile_no' => '+91 98201 11223',
                'email' => 'aarav.m@example.com',
                'gstin' => '27AAAPM1234A1Z9',
                'state' => 'Maharashtra',
                'city' => 'Mumbai',
                'address' => 'Flat 502, Sky High Towers, Bandra West',
                'points' => 120.00,
            ],
            [
                'name' => 'Ananya Iyer',
                'mobile_no' => '+91 98202 22334',
                'email' => 'ananya.iyer@example.com',
                'gstin' => null,
                'state' => 'Maharashtra',
                'city' => 'Mumbai',
                'address' => '14 Palm Grove Avenue, Juhu',
                'points' => 85.00,
            ],
            [
                'name' => 'Vikram Singhania',
                'mobile_no' => '+91 98203 33445',
                'email' => 'vikram.s@example.com',
                'gstin' => '27AAACS9876C1Z4',
                'state' => 'Maharashtra',
                'city' => 'Mumbai',
                'address' => '72 Nariman Point Residency',
                'points' => 240.00,
            ],
            [
                'name' => 'Priya Nair',
                'mobile_no' => '+91 98204 44556',
                'email' => 'priya.nair@example.com',
                'gstin' => null,
                'state' => 'Maharashtra',
                'city' => 'Mumbai',
                'address' => '201 Sea Breeze Apt, Worli',
                'points' => 50.00,
            ],
        ];

        foreach ($customersData as $c) {
            Customer::updateOrCreate(
                ['tenant_id' => $tenant->id, 'mobile_no' => $c['mobile_no']],
                [
                    'name' => $c['name'],
                    'email' => $c['email'],
                    'gstin' => $c['gstin'],
                    'state' => $c['state'],
                    'city' => $c['city'],
                    'address' => $c['address'],
                    'points' => $c['points'],
                    'vehicle_no' => null,
                    'vehicle_model' => null,
                ]
            );
        }

        // 9. Seed Retail Items (Stationery Products Only)
        $itemsData = [
            [
                'name' => 'Classmate Pulse Spiral Notebook (A4, 300 Pages)',
                'short_name' => 'CLS-SPIRAL-A4',
                'hsn_sac' => '4820',
                'brand' => 'Classmate',
                'category' => 'Paper Products & Notebooks',
                'purchase_price' => 90.00,
                'price' => 150.00,
                'gst_percent' => 12.00,
                'barcode' => '8901030001015',
                'stock_quantity' => 200.00,
                'min_stock_alert' => 25.00,
                'unit' => 'Pcs',
                'type' => 'general',
                'description' => 'Premium 70 GSM elemental chlorine free paper with twin-wire binding.',
            ],
            [
                'name' => 'Reynolds 045 Fine Carbure Ball Pen (Pack of 10)',
                'short_name' => 'RYN-045-PEN10',
                'hsn_sac' => '9608',
                'brand' => 'Reynolds',
                'category' => 'Writing Instruments & Pens',
                'purchase_price' => 60.00,
                'price' => 100.00,
                'gst_percent' => 18.00,
                'barcode' => '8901030001022',
                'stock_quantity' => 350.00,
                'min_stock_alert' => 50.00,
                'unit' => 'Pack',
                'type' => 'general',
                'description' => 'Classic laser tip 0.45mm smooth flow ink ballpoint pen pack.',
            ],
            [
                'name' => 'Faber-Castell Connector Pen Marker Set (25 Shades)',
                'short_name' => 'FBC-CONN-25S',
                'hsn_sac' => '9608',
                'brand' => 'Faber-Castell',
                'category' => 'Stationery & Office Supplies',
                'purchase_price' => 130.00,
                'price' => 200.00,
                'gst_percent' => 18.00,
                'barcode' => '8901030001039',
                'stock_quantity' => 120.00,
                'min_stock_alert' => 15.00,
                'unit' => 'Set',
                'type' => 'general',
                'description' => 'Non-toxic, washable water color connector sketch pens.',
            ],
            [
                'name' => 'Camlin Kokuyo Premium Mathematical Geometry Box',
                'short_name' => 'CML-GEOM-BOX',
                'hsn_sac' => '9017',
                'brand' => 'Camlin',
                'category' => 'Stationery & Office Supplies',
                'purchase_price' => 95.00,
                'price' => 160.00,
                'gst_percent' => 18.00,
                'barcode' => '8901030001046',
                'stock_quantity' => 100.00,
                'min_stock_alert' => 20.00,
                'unit' => 'Box',
                'type' => 'general',
                'description' => 'Rust-free self-centering compass and divider with mechanical pencil.',
            ],
            [
                'name' => 'Doms Zoom Triangle Dark Pencils (Pack of 10)',
                'short_name' => 'DMS-TRI-PENCIL',
                'hsn_sac' => '9609',
                'brand' => 'Doms',
                'category' => 'Writing Instruments & Pens',
                'purchase_price' => 45.00,
                'price' => 75.00,
                'gst_percent' => 12.00,
                'barcode' => '8901030001053',
                'stock_quantity' => 250.00,
                'min_stock_alert' => 40.00,
                'unit' => 'Pack',
                'type' => 'general',
                'description' => 'Triangular ergonomic grip with soft wood and super dark 2B graphite core.',
            ],
            [
                'name' => 'Kangaro Desk Heavy Duty Stapler No. 10',
                'short_name' => 'KNG-STAPLER-10',
                'hsn_sac' => '8305',
                'brand' => 'Kangaro',
                'category' => 'Desk Accessories & Binding',
                'purchase_price' => 70.00,
                'price' => 120.00,
                'gst_percent' => 18.00,
                'barcode' => '8901030001060',
                'stock_quantity' => 90.00,
                'min_stock_alert' => 15.00,
                'unit' => 'Pcs',
                'type' => 'general',
                'description' => 'All-steel construction with built-in staple remover and reload indicator.',
            ],
            [
                'name' => 'JK Copier Premium A4 Multipurpose Paper Ream (500 Sheets)',
                'short_name' => 'JKC-A4-75GSM',
                'hsn_sac' => '4820',
                'brand' => 'JK Copier',
                'category' => 'Paper Products & Notebooks',
                'purchase_price' => 240.00,
                'price' => 360.00,
                'gst_percent' => 12.00,
                'barcode' => '8901030001077',
                'stock_quantity' => 180.00,
                'min_stock_alert' => 30.00,
                'unit' => 'Ream',
                'type' => 'general',
                'description' => 'Fast drying, jam-free high-brightness copypaper for laser & inkjet printers.',
            ],
            [
                'name' => 'Scotch 3M Transparent Adhesive Tape (Pack of 2)',
                'short_name' => '3M-TAPE-2P',
                'hsn_sac' => '3919',
                'brand' => 'Scotch 3M',
                'category' => 'Desk Accessories & Binding',
                'purchase_price' => 40.00,
                'price' => 70.00,
                'gst_percent' => 18.00,
                'barcode' => '8901030001084',
                'stock_quantity' => 160.00,
                'min_stock_alert' => 25.00,
                'unit' => 'Pack',
                'type' => 'general',
                'description' => 'Glossy finish strong holding clear tape for office sealing and repairs.',
            ],
        ];

        $createdGeneralItems = [];
        foreach ($itemsData as $it) {
            $created = Item::updateOrCreate(
                ['tenant_id' => $tenant->id, 'barcode' => $it['barcode']],
                [
                    'name' => $it['name'],
                    'short_name' => $it['short_name'],
                    'hsn_sac' => $it['hsn_sac'],
                    'brand' => $it['brand'],
                    'category' => $it['category'],
                    'purchase_price' => $it['purchase_price'],
                    'price' => $it['price'],
                    'gst_percent' => $it['gst_percent'],
                    'stock_quantity' => $it['stock_quantity'],
                    'min_stock_alert' => $it['min_stock_alert'],
                    'unit' => $it['unit'],
                    'type' => $it['type'],
                    'description' => $it['description'],
                    'is_active' => true,
                ]
            );
            $createdGeneralItems[$it['barcode']] = $created;

            // Seed stock allocation across all 5 branches
            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchWarehouse->id, 'item_id' => $created->id],
                ['quantity' => round($it['stock_quantity'] * 0.40, 2)]
            );
            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchStore1->id, 'item_id' => $created->id],
                ['quantity' => round($it['stock_quantity'] * 0.25, 2)]
            );
            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchStore2->id, 'item_id' => $created->id],
                ['quantity' => round($it['stock_quantity'] * 0.15, 2)]
            );
            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchStore3->id, 'item_id' => $created->id],
                ['quantity' => round($it['stock_quantity'] * 0.15, 2)]
            );
            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchWarehouse2->id, 'item_id' => $created->id],
                ['quantity' => round($it['stock_quantity'] * 0.05, 2)]
            );
        }

        // 10. Seed Grouped (Combo / Bundle) Items

        // Combo 2: Stationery Student Study Kit
        if (isset($createdGeneralItems['8901030001015']) && isset($createdGeneralItems['8901030001022']) && isset($createdGeneralItems['8901030001053'])) {
            $notebook = $createdGeneralItems['8901030001015'];
            $pens = $createdGeneralItems['8901030001022'];
            $pencils = $createdGeneralItems['8901030001053'];

            $groupedItem2 = Item::updateOrCreate(
                ['tenant_id' => $tenant->id, 'barcode' => '8901030001992'],
                [
                    'name' => 'Classmate & Reynolds Student Study Pack (Combo)',
                    'short_name' => 'STN-STUDY-KIT',
                    'hsn_sac' => '4820',
                    'brand' => 'Store Choice',
                    'category' => 'Stationery & Office Supplies',
                    'purchase_price' => 180.00,
                    'price' => 299.00,
                    'gst_percent' => 12.00,
                    'type' => 'grouped',
                    'stock_quantity' => 60.00,
                    'min_stock_alert' => 10.00,
                    'unit' => 'Kit',
                    'description' => 'Complete back-to-school student combo: 1x Classmate Spiral Notebook + 1x Reynolds Pens Pack + 1x Doms Pencils Pack',
                    'grouped_items' => [
                        [
                            'item_id' => $notebook->id,
                            'item_name' => $notebook->name,
                            'quantity' => 1,
                            'unit_price' => 150.00,
                        ],
                        [
                            'item_id' => $pens->id,
                            'item_name' => $pens->name,
                            'quantity' => 1,
                            'unit_price' => 100.00,
                        ],
                        [
                            'item_id' => $pencils->id,
                            'item_name' => $pencils->name,
                            'quantity' => 1,
                            'unit_price' => 75.00,
                        ],
                    ],
                    'is_active' => true,
                ]
            );

            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchStore1->id, 'item_id' => $groupedItem2->id],
                ['quantity' => 25.00]
            );
            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchStore2->id, 'item_id' => $groupedItem2->id],
                ['quantity' => 15.00]
            );
            ItemStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'branch_id' => $branchStore3->id, 'item_id' => $groupedItem2->id],
                ['quantity' => 20.00]
            );
        }
    }
}
