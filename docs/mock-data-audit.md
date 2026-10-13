# Mock & Demo Data Audit Report

**Project:** StockFlow Enterprise — Inventory Management System  
**Audit Date:** October 2026  
**Objective:** Identify all sources of mock, fake, placeholder, and automatically generated demo business data across the frontend, backend, and database initialization pipelines.

---

## 1. Executive Summary

A comprehensive architectural and source-level audit was conducted across the entire StockFlow codebase.
The application architecture is already properly connected end-to-end via REST APIs (`/api/v1`) using TanStack Query, Axios, Express controllers, and Prisma ORM.

The presence of "demo data" currently comes from two distinct layers:
1. **Database Initialization (`server/prisma/seed.ts`)**: The default seed script currently mixes essential system data (Roles, Permissions, System Settings, Admin user) with sample enterprise records (7 products, 6 categories, 6 brands, 3 warehouses, 3 suppliers, 3 customers, initial stock balances, sample POs, and sample Sales Orders).
2. **UI Demo Conveniences & Gaps**:
   - `client/src/features/auth/LoginPage.tsx`: Contains a "Quick Demo Accounts" button section with hardcoded demo emails.
   - `client/src/features/categories/CategoriesPage.tsx`: Empty state text did not match the required `"No categories found. Create your first category to get started."` and lacked an inline Edit Category modal.
   - `client/src/features/products/ProductsPage.tsx`, `BrandsPage.tsx`, `WarehousesPage.tsx`: Lacked direct Edit modals for updating existing PostgreSQL records from the table action rows.
   - `client/src/features/warehouses/WarehousesPage.tsx`: Lacked the `EmptyState` component when 0 warehouses exist.

---

## 2. Itemized Audit Findings

| File Path | Mock / Demo Data Source | Module Affected | Current Behavior | Required Minimal Correction |
| :--- | :--- | :--- | :--- | :--- |
| `server/prisma/seed.ts` | Hardcoded demo business data arrays (products, categories, brands, suppliers, customers, warehouses, stock, orders) | Whole System / Database | Seeding inserts 7 demo products, 6 categories, 6 brands, 3 warehouses, 3 suppliers, 3 customers, 21 stock ledger entries, 1 PO, 1 SO. | Separate seed script: keep `seed.ts` strictly for essential system bootstrapping (Roles, Permissions, System Settings, Initial Admin account). Move sample demo records to an optional, explicit `seed.demo.ts`. |
| `client/src/features/auth/LoginPage.tsx` | Hardcoded demo email strings (`handleQuickLogin`) | Authentication | Displays quick login buttons with demo emails (`superadmin@stockflow.dev`, etc.). | Remove the Quick Demo Accounts section from the login UI so that it acts as a standard production login form. |
| `client/src/features/products/ProductsPage.tsx` | Missing Edit Product interaction | Products | Has Create, Detail, Movement History, and Archive, but lacked an Update/Edit product modal for updating existing database records. | Add Edit Product button and Edit Modal connected to `PUT /api/v1/products/:id` with query invalidation. |
| `client/src/features/categories/CategoriesPage.tsx` | Empty state text & missing Edit modal | Categories | Empty state text differed from prompt specification; lacked an Edit Category modal. | Update empty state text to `"No categories found. Create your first category to get started."` and add Edit Category modal calling `PUT /api/v1/categories/:id`. |
| `client/src/features/brands/BrandsPage.tsx` | Missing Edit Brand modal | Brands | Has Create and Delete, but lacked an Edit Brand modal. | Add Edit Brand modal calling `PUT /api/v1/brands/:id` to allow editing persisted brands. |
| `client/src/features/warehouses/WarehousesPage.tsx` | Missing EmptyState rendering & Edit modal | Warehouses | If 0 warehouses exist, an empty grid was rendered without an EmptyState card; lacked Edit modal. | Add `EmptyState` when `warehouses.length === 0` and add Edit Warehouse modal calling `PUT /api/v1/warehouses/:id`. |
| `client/src/features/suppliers/SuppliersPage.tsx` | Missing Edit Supplier modal | Suppliers | Has Create and List, but lacked an Edit modal. | Add Edit Supplier modal calling `PUT /api/v1/suppliers/:id`. |
| `client/src/features/customers/CustomersPage.tsx` | Missing Edit Customer modal | Customers | Has Create and List, but lacked an Edit modal. | Add Edit Customer modal calling `PUT /api/v1/customers/:id`. |

---

## 3. Database Inventory & Cleanup Analysis

Current PostgreSQL record counts:
- **Roles:** 5 (System: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`, `VIEWER`) — *Preserve*
- **Permissions:** 19 (System access control definitions) — *Preserve*
- **BusinessSettings:** 1 (Default system configuration: currency, tax, prefixes) — *Preserve*
- **Users:** 5 (Admin & role accounts created during setup) — *Preserve primary admin, manage others*
- **Categories:** 6 (Originated from `seed.ts`)
- **Brands:** 6 (Originated from `seed.ts`)
- **Warehouses:** 3 (Originated from `seed.ts`)
- **Suppliers:** 3 (Originated from `seed.ts`)
- **Customers:** 3 (Originated from `seed.ts`)
- **Products:** 8 (7 from `seed.ts`, 1 from automated integration test `TEST-SKU-1791905171443`)
- **StockBalances:** 21 (Originated from `seed.ts`)
- **StockMovements:** 21 (Originated from `seed.ts`)
- **PurchaseOrders:** 1 (Originated from `seed.ts`)
- **SalesOrders:** 1 (Originated from `seed.ts`)

Per Section 8 of the requirements:
> "Only remove database demo records when their origin is reliably identified and I explicitly approve the cleanup.
> Before any approved cleanup:
> 1. Create a database backup.
> 2. Identify affected records and relationships.
> 3. Show record counts.
> 4. Explain dependencies.
> 5. Preserve real user-created records.
> 6. Use safe database transactions."

A dedicated database cleanup plan has been drafted to safely clean only demo business records upon user approval, without dropping tables or truncating schema.
