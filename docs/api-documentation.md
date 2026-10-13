# StockFlow — REST API Specification & Endpoint Catalog

Base URL: `/api/v1`

All JSON responses follow a standardized payload structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed / Resource not found",
  "errors": [
    { "field": "email", "message": "Invalid email address format" }
  ]
}
```

---

## Endpoint Catalog

### Authentication (`/api/v1/auth`)
- `POST /auth/login` — Authenticate user, return JWT access token, set refresh token cookie
- `POST /auth/refresh` — Issue rotated access and refresh tokens
- `POST /auth/logout` — Invalidate refresh session and clear cookie
- `GET  /auth/me` — Retrieve current authenticated user profile and permissions
- `POST /auth/change-password` — Change password with current credential validation
- `POST /auth/forgot-password` — Request password reset email token
- `POST /auth/reset-password` — Complete password reset with token

### Dashboard & Analytics (`/api/v1/dashboard`)
- `GET /dashboard/metrics` — Key statistics (total products, inventory valuation, sales, low stock count)
- `GET /dashboard/revenue-chart` — Historical sales and purchase trends
- `GET /dashboard/top-products` — Highest grossing/volume products
- `GET /dashboard/recent-activity` — Recent sales orders and inventory movements
- `GET /dashboard/low-stock` — Urgent items below reorder threshold

### Product Catalog (`/api/v1/products`)
- `GET    /products` — List products (search, category, brand, stock status, pagination)
- `POST   /products` — Create new product with variants and pricing
- `GET    /products/:id` — Retrieve product details with warehouse stock balances
- `PUT    /products/:id` — Update product details
- `DELETE /products/:id` — Archive product (soft deletion)
- `POST   /products/:id/images` — Upload product media
- `GET    /products/:id/movements` — Product stock history ledger
- `GET    /products/export/csv` — Export filtered products to CSV
- `POST   /products/import/csv` — Bulk import products from CSV with formula injection sanitization

### Categories & Brands
- `GET    /categories` / `POST /categories` / `PUT /categories/:id` / `DELETE /categories/:id`
- `GET    /brands` / `POST /brands` / `PUT /brands/:id` / `DELETE /brands/:id`

### Warehouses (`/api/v1/warehouses`)
- `GET    /warehouses` — List warehouses with capacity and active status
- `POST   /warehouses` — Register warehouse facility
- `GET    /warehouses/:id` — Warehouse profile and stock overview
- `PUT    /warehouses/:id` — Update warehouse details
- `GET    /warehouses/:id/stock` — Inventory breakdown by warehouse

### Inventory & Stock Movements (`/api/v1/inventory`)
- `GET  /inventory/balances` — Multi-warehouse inventory stock matrix
- `POST /inventory/adjustments` — Record physical count variance (reconcile surplus/deficit)
- `GET  /inventory/adjustments` — List past stock adjustment audits
- `POST /inventory/transfers` — Initiate warehouse-to-warehouse stock transfer
- `POST /inventory/transfers/:id/dispatch` — Dispatch stock transfer (deduct source warehouse)
- `POST /inventory/transfers/:id/receive` — Receive transfer (credit destination warehouse atomically)
- `GET  /inventory/movements` — Complete immutable stock movement ledger

### Procurement Lifecycle (`/api/v1/purchase-orders`)
- `GET    /purchase-orders` — List purchase orders with status filtering
- `POST   /purchase-orders` — Create purchase order draft with line items
- `GET    /purchase-orders/:id` — Purchase order detail and receiving progress
- `PUT    /purchase-orders/:id` — Update draft purchase order
- `POST   /purchase-orders/:id/approve` — Approve purchase order
- `POST   /purchase-orders/:id/receive` — Receive items (creates GoodsReceipt and increments inventory)
- `POST   /purchase-orders/:id/returns` — Record vendor return
- `GET    /suppliers` / `POST /suppliers` / `PUT /suppliers/:id` — Supplier management

### Sales & Order Fulfillment (`/api/v1/sales-orders`)
- `GET    /sales-orders` — List sales orders with status and customer filtering
- `POST   /sales-orders` — Create customer sales order
- `GET    /sales-orders/:id` — Sales order details, invoice, and payment history
- `POST   /sales-orders/:id/fulfill` — Fulfill order (atomic inventory reduction with concurrency lock)
- `POST   /sales-orders/:id/payments` — Record payment against order invoice
- `POST   /sales-orders/:id/returns` — Process customer return and optional restock
- `GET    /customers` / `POST /customers` / `PUT /customers/:id` — Customer management

### Reports (`/api/v1/reports`)
- `GET /reports/valuation` — Weighted average inventory valuation by warehouse/product
- `GET /reports/sales` — Revenue, discounts, taxes, and net margins
- `GET /reports/purchases` — Procurement spend and vendor breakdown
- `GET /reports/stock-movement` — Audit trail of movements over date range
- `GET /reports/low-stock` — Comprehensive reorder report

### Users, Roles & Settings
- `GET    /users` / `POST /users` / `PUT /users/:id` / `PATCH /users/:id/status`
- `GET    /roles` — View security roles and permission matrix
- `GET    /settings` / `PUT /settings` — Business profile, currency, taxes, prefixes
- `GET    /notifications` / `PATCH /notifications/:id/read` — In-app alert queue
- `GET    /audit-logs` — Immutable actor security and operation log
