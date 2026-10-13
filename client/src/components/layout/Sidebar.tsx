import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Tag,
  Warehouse,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  Truck,
  DollarSign,
  Users2,
  BarChart3,
  UserCheck,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../features/auth/authStore.js';
import { cn } from '../../lib/utils.js';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
  const { user } = useAuthStore();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Categories', path: '/categories', icon: Layers },
    { label: 'Brands', path: '/brands', icon: Tag },
    { label: 'Inventory', path: '/inventory', icon: Boxes },
    { label: 'Warehouses', path: '/warehouses', icon: Warehouse },
    { label: 'Transfers', path: '/transfers', icon: ArrowLeftRight },
    { label: 'Purchases', path: '/purchases', icon: ShoppingCart },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Sales Orders', path: '/sales', icon: DollarSign },
    { label: 'Customers', path: '/customers', icon: Users2 },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Users & Roles', path: '/users', icon: UserCheck },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Audit Logs', path: '/audit', icon: ShieldAlert },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border bg-card transition-all duration-300 z-30',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
              SF
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-foreground text-base">StockFlow</span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Enterprise</span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
            SF
          </div>
        )}

        <button
          onClick={toggleCollapse}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            isCollapsed && 'absolute -right-3.5 top-5 bg-card shadow-md z-40'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors group relative',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', !isCollapsed && 'mr-3')} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-border">
        <div
          className={cn(
            'flex items-center rounded-lg p-2 bg-muted/40',
            isCollapsed ? 'justify-center' : 'space-x-3'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-xs flex-shrink-0">
            {user?.firstName?.charAt(0) || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate uppercase font-medium">
                {user?.roles?.[0] || 'Staff'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
