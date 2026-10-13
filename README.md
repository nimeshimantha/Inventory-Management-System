# StockFlow — Enterprise Inventory Management System

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-v18.3+-61DAFB.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)

**StockFlow** is a complete, production-ready full-stack SaaS platform designed for enterprise inventory tracking, warehouse logistics, multi-channel procurement, and sales fulfillment.

---

## 🌟 Key Features

- **Double-Entry Stock Ledger**: Immutable inventory audit log preventing untracked stock modifications.
- **Concurrency & Transaction Safety**: PostgreSQL atomic transactions with row-level locks preventing overselling.
- **Multi-Warehouse Logistics**: Track stock balances across distinct facilities; dispatch and receive atomic stock transfers.
- **Procurement & Goods Receipt**: Purchase orders with approvals, partial receipts, and automated weighted-average costing updates.
- **Sales & Order Fulfillment**: Sales orders, invoice generation, payment tracking, fulfillment dispatch, and customer returns.
- **Role-Based Access Control (RBAC)**: Centralized permission matrix supporting `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`, and `VIEWER`.
- **Rotated Refresh Tokens & Argon2**: Secure HttpOnly cookies, token rotation, and brute-force resistant hashing.
- **Real-Time Analytics & Reporting**: Interactive Recharts visualizations, stock turnover, inventory valuation, and P&L metrics.
- **Export & Import**: Safe CSV import/export with sanitization against CSV formula injection.

---

## 🏗 System Architecture

StockFlow is structured as an npm workspaces monorepo:

- **`client/`**: React 18 SPA built with Vite, TypeScript, Tailwind CSS, Lucide Icons, TanStack Query, Zustand, React Hook Form, and Sonner.
- **`server/`**: REST API built with Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Zod, Argon2, Pino Logger, and Swagger UI.
- **`docs/`**: Detailed architecture diagrams, database documentation, API specifications, and setup instructions.

---

## 🚀 Getting Started

### 1. Requirements
- Node.js 18+ & npm 9+
- Docker Desktop (or local PostgreSQL 16)

### 2. Environment Configuration
Copy environment files:
```bash
cp .env.example .env
cp .env.example server/.env
```

### 3. Start Database
```bash
docker compose up -d
```

### 4. Install Dependencies & Seed
```bash
npm install
npm run db:migrate
npm run db:seed
```

### 5. Launch Development
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Swagger Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

### Default Demo Accounts
- Super Admin: `superadmin@stockflow.dev` / `Admin@12345`
- Operations Admin: `admin@stockflow.dev` / `Admin@12345`
- Inventory Manager: `manager@stockflow.dev` / `Admin@12345`
- Warehouse Staff: `staff@stockflow.dev` / `Admin@12345`
- Viewer: `viewer@stockflow.dev` / `Admin@12345`

---

## 🧪 Testing

```bash
# Run server test suite
npm run test:server

# Run client type checks
npm run build:client
```
