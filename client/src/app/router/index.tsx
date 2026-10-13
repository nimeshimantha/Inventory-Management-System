import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/authStore.js';
import { AppLayout } from '../../components/layout/AppLayout.js';

// Feature Pages
import { LoginPage } from '../../features/auth/LoginPage.js';
import { DashboardPage } from '../../features/dashboard/DashboardPage.js';
import { ProductsPage } from '../../features/products/ProductsPage.js';
import { CategoriesPage } from '../../features/categories/CategoriesPage.js';
import { BrandsPage } from '../../features/brands/BrandsPage.js';
import { WarehousesPage } from '../../features/warehouses/WarehousesPage.js';
import { InventoryPage } from '../../features/inventory/InventoryPage.js';
import { StockTransfersPage } from '../../features/transfers/StockTransfersPage.js';
import { PurchasesPage } from '../../features/purchases/PurchasesPage.js';
import { SuppliersPage } from '../../features/suppliers/SuppliersPage.js';
import { SalesPage } from '../../features/sales/SalesPage.js';
import { CustomersPage } from '../../features/customers/CustomersPage.js';
import { ReportsPage } from '../../features/reports/ReportsPage.js';
import { UsersPage } from '../../features/users/UsersPage.js';
import { SettingsPage } from '../../features/settings/SettingsPage.js';
import { AuditPage } from '../../features/audit/AuditPage.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'brands', element: <BrandsPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'warehouses', element: <WarehousesPage /> },
      { path: 'transfers', element: <StockTransfersPage /> },
      { path: 'purchases', element: <PurchasesPage /> },
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'sales', element: <SalesPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'audit', element: <AuditPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
