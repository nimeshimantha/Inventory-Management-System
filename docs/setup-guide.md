# StockFlow — Local Development & Deployment Setup Guide

## 1. Prerequisites

Ensure your development environment meets the following specifications:
- **Node.js**: v18.0.0 or higher (Tested with Node.js v24)
- **npm**: v9.0.0 or higher (Tested with npm v11)
- **Docker & Docker Compose**: Docker Desktop active or a PostgreSQL 16 server
- **Git**

---

## 2. Quick Start (Step-by-Step)

### Step 1: Clone and Configure Environment
Clone the repository and copy the environment variables:
```bash
cp .env.example .env
cp .env.example server/.env
cp client/.env.example client/.env
```

Review database credentials in `.env`:
```env
POSTGRES_USER=stockflow
POSTGRES_PASSWORD=stockflow_secret
POSTGRES_DB=stockflow_db
POSTGRES_PORT=5433
DATABASE_URL="postgresql://stockflow:stockflow_secret@localhost:5433/stockflow_db?schema=public"
```

### Step 2: Start PostgreSQL Database
If using Docker:
```bash
npm run docker:up
```
This runs PostgreSQL 16 on port 5433 with healthchecks enabled.

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Apply Database Migrations & Seed Demo Data
```bash
# Push schema or apply migrations to PostgreSQL
npm run db:migrate

# Seed with enterprise demo dataset
npm run db:seed
```

### Step 5: Start Development Servers
Run both backend API (port 5000) and frontend client (port 5173):
```bash
npm run dev
```

Or run them individually in separate terminals:
```bash
# Backend server (http://localhost:5000)
npm run dev:server

# Frontend client (http://localhost:5173)
npm run dev:client
```

---

## 3. Demo Credentials

After seeding, test accounts for each role are ready:
| Role | Email | Password | Access Level |
|---|---|---|---|
| **SUPER_ADMIN** | `superadmin@stockflow.dev` | `Admin@12345` | Unrestricted full system control |
| **ADMIN** | `admin@stockflow.dev` | `Admin@12345` | Operations, users, settings |
| **MANAGER** | `manager@stockflow.dev` | `Admin@12345` | Inventory, approvals, reporting |
| **STAFF** | `staff@stockflow.dev` | `Admin@12345` | Daily fulfillment & receipts |
| **VIEWER** | `viewer@stockflow.dev` | `Admin@12345` | Read-only dashboards & products |

---

## 4. Testing & Verification

```bash
# Run backend test suite
npm run test:server

# Run frontend test suite & type checks
npm run test:client

# Prisma Studio for GUI database inspection
npm run db:studio
```
