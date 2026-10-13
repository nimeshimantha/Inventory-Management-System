import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { formatCurrency } from '../../lib/utils.js';
import {
  BarChart3,
  Boxes,
  DollarSign,
  TrendingUp,
  Printer,
  Download,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'valuation' | 'sales' | 'purchases' | 'margins'>('valuation');

  // Valuation Query
  const { data: valuationData, isLoading: loadingValuation } = useQuery({
    queryKey: ['reports', 'valuation'],
    queryFn: async () => {
      const res = await api.get('/reports/valuation');
      return res.data.data;
    },
    enabled: activeTab === 'valuation',
  });

  // Sales Query
  const { data: salesReportData, isLoading: loadingSales } = useQuery({
    queryKey: ['reports', 'sales'],
    queryFn: async () => {
      const res = await api.get('/reports/sales');
      return res.data.data;
    },
    enabled: activeTab === 'sales',
  });

  // Purchases Query
  const { data: purchasesReportData, isLoading: loadingPurchases } = useQuery({
    queryKey: ['reports', 'purchases'],
    queryFn: async () => {
      const res = await api.get('/reports/purchases');
      return res.data.data;
    },
    enabled: activeTab === 'purchases',
  });

  // Margins Query
  const { data: marginsData, isLoading: loadingMargins } = useQuery({
    queryKey: ['reports', 'profit-margin'],
    queryFn: async () => {
      const res = await api.get('/reports/profit-margin');
      return res.data.data;
    },
    enabled: activeTab === 'margins',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Intelligence & Reports"
        description="Costing audit trails, weighted average valuation, gross margins, and financial velocity."
        actions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print Report
            </Button>
          </div>
        }
      />

      {/* Report Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'valuation'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Boxes className="h-3.5 w-3.5 mr-1.5" />
          Inventory Valuation (WAC)
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'sales'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <DollarSign className="h-3.5 w-3.5 mr-1.5" />
          Sales & Tax Breakdown
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'purchases'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          Procurement Spend
        </button>
        <button
          onClick={() => setActiveTab('margins')}
          className={`flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'margins'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Percent className="h-3.5 w-3.5 mr-1.5" />
          Profit & Margin (COGS)
        </button>
      </div>

      {/* VALUATION REPORT */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Total Units In Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {valuationData?.summary?.totalUnits || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Cost Valuation (WAC)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(valuationData?.summary?.totalCostValuation || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Retail Sales Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(valuationData?.summary?.totalRetailValuation || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Weighted Gross Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {valuationData?.summary?.averageMarginPercent || 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            {loadingValuation ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Product / SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Retail Value</TableHead>
                    <TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuationData?.items?.map((item: { id: string; warehouse: string; name: string; sku: string; quantityOnHand: number; unit: string; unitCost: number; totalCost: number; totalRetail: number; marginPercent: number }) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-medium text-foreground">{item.warehouse}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-xs text-foreground block">{item.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{item.sku}</span>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground">
                        {item.quantityOnHand} {item.unit}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-xs font-semibold text-primary">{formatCurrency(item.totalCost)}</TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-500">{formatCurrency(item.totalRetail)}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{item.marginPercent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* SALES REPORT */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Gross Sales Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(salesReportData?.summary?.totalGrandTotal || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Collected Settlement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(salesReportData?.summary?.totalPaid || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Outstanding Receivables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">
                  {formatCurrency(salesReportData?.summary?.totalOutstanding || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            {loadingSales ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Grand Total</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReportData?.orders?.map((o: { id: string; orderNumber: string; customer: { name: string }; subtotal: number; taxAmount: number; grandTotal: number; paidAmount: number }) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                      <TableCell className="text-xs text-foreground">{o.customer.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatCurrency(o.subtotal)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatCurrency(o.taxAmount)}</TableCell>
                      <TableCell className="text-xs font-bold text-foreground">{formatCurrency(o.grandTotal)}</TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-500">{formatCurrency(o.paidAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* PROFIT & MARGIN REPORT */}
      {activeTab === 'margins' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Fulfilled Gross Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(marginsData?.grossRevenue || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Cost of Goods Sold (COGS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(marginsData?.costOfGoodsSold || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Net Gross Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(marginsData?.grossProfit || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Profit Margin %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {marginsData?.profitMargin || 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
