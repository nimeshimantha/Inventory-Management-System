import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { formatCurrency, formatDateTime } from '../../lib/utils.js';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Boxes,
  DollarSign,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  AlertOctagon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function DashboardPage() {
  const [days, setDays] = useState(30);

  // 1. Metrics query
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const res = await api.get('/dashboard/metrics');
      return res.data.data;
    },
  });

  // 2. Revenue Trends query
  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['dashboard', 'trends', days],
    queryFn: async () => {
      const res = await api.get(`/dashboard/revenue-trends?days=${days}`);
      return res.data.data;
    },
  });

  // 3. Top Products query
  const { data: topProducts, isLoading: loadingTop } = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: async () => {
      const res = await api.get('/dashboard/top-products?limit=5');
      return res.data.data;
    },
  });

  // 4. Low stock alerts
  const { data: lowStockAlerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: async () => {
      const res = await api.get('/dashboard/low-stock');
      return res.data.data;
    },
  });

  // 5. Recent Activity
  const { data: activity, isLoading: loadingActivity } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      const res = await api.get('/dashboard/recent-activity');
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Dashboard"
        description="Real-time multi-warehouse inventory status, financial velocity, and fulfillment health."
        actions={
          <div className="flex items-center space-x-2 bg-muted/40 p-1 rounded-lg border border-border">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  days === d
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d === 7 ? '7 Days' : d === 30 ? '30 Days' : 'Quarter'}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inventory Value */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Inventory Valuation</CardTitle>
            <Boxes className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(metrics?.totalInventoryValue || 0)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center">
                  <span className="text-emerald-500 font-medium mr-1 flex items-center">
                    <ArrowUpRight className="h-3 w-3" /> WAC
                  </span>
                  Across active warehouses
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Active Products */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Catalog SKUs</CardTitle>
            <Package className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {metrics?.totalProducts || 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Active across multi-facilities
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gross Sales Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div>
                <div className="text-2xl font-bold tracking-tight text-emerald-500">
                  {formatCurrency(metrics?.totalSales || 0)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center">
                  Purchases: {formatCurrency(metrics?.totalPurchases || 0)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low / Out of Stock alerts */}
        <Card className="hover:shadow-md transition-shadow border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-amber-500 dark:text-amber-400">Stock Reorder Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center space-x-3">
                <div>
                  <div className="text-2xl font-bold text-amber-500">
                    {metrics?.lowStockCount || 0}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Low stock items</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-destructive">
                    {metrics?.outOfStockCount || 0}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Out of stock</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Sales & Procurement Trajectory</CardTitle>
              <p className="text-xs text-muted-foreground">Daily transactional volume aggregated over time</p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center text-primary font-medium">
                <span className="h-2 w-2 rounded-full bg-primary mr-1.5" /> Sales
              </span>
              <span className="flex items-center text-amber-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5" /> Purchases
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTrends ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="purchasesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="purchases"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#purchasesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-primary" />
              Top Revenue Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingTop ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : topProducts?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No sales fulfillment logged yet</p>
            ) : (
              topProducts?.map((item: { product: { name: string; sku: string }; unitsSold: number; totalRevenue: number }, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs pb-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-semibold text-foreground truncate">{item.product.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.product.sku} • {item.unitsSold} units</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">{formatCurrency(item.totalRevenue)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Urgent Low Stock Alerts & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Low Stock */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center text-amber-500">
              <AlertOctagon className="h-4 w-4 mr-2" />
              Critical Reorder Threshold Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingAlerts ? (
              <Skeleton className="h-32 w-full" />
            ) : lowStockAlerts?.length === 0 ? (
              <p className="text-xs text-emerald-500 font-medium py-6 text-center">All inventory above minimum threshold</p>
            ) : (
              lowStockAlerts?.map((alert: { id: string; name: string; sku: string; currentStock: number; reorderLevel: number; unit: string; isOutOfStock: boolean }) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-foreground truncate">{alert.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      SKU: {alert.sku} • Min Reorder: {alert.reorderLevel} {alert.unit}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={alert.isOutOfStock ? 'destructive' : 'warning'}>
                      {alert.currentStock} {alert.unit} left
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions & Movements */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              <Boxes className="h-4 w-4 mr-2 text-primary" />
              Recent Immutable Inventory Movements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingActivity ? (
              <Skeleton className="h-32 w-full" />
            ) : activity?.recentMovements?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No inventory movements recorded yet</p>
            ) : (
              activity?.recentMovements?.map((m: { id: string; type: string; quantity: number; balanceAfter: number; createdAt: string; product: { name: string; sku: string }; warehouse: { name: string } }) => {
                const isPositive = ['PURCHASE_RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'INITIAL_STOCK', 'SALES_RETURN'].includes(m.type);
                return (
                  <div key={m.id} className="flex items-center justify-between text-xs pb-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-semibold text-foreground truncate">{m.product.name}</p>
                      <p className="text-[11px] text-muted-foreground">{m.warehouse.name} • {formatDateTime(m.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
                        {isPositive ? '+' : '-'}{Math.abs(Number(m.quantity))}
                      </span>
                      <p className="text-[10px] text-muted-foreground">Bal: {Number(m.balanceAfter)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
