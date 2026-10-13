import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { StockBalance, StockMovement, Warehouse, Product } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Card } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { Modal } from '../../components/ui/modal.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { formatCurrency, formatDateTime } from '../../lib/utils.js';
import {
  Boxes,
  History,
  Sliders,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { toast } from 'sonner';

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState('');
  const [adjustProductId, setAdjustProductId] = useState('');
  const [countedQty, setCountedQty] = useState('');
  const [adjustType, setAdjustType] = useState('RECONCILIATION');
  const [adjustReason, setAdjustReason] = useState('');

  // 1. Warehouses query
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await api.get('/warehouses');
      return res.data.data as Warehouse[];
    },
  });

  // 2. Products query for adjustment modal
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100');
      return res.data.data as Product[];
    },
  });

  // 3. Balances query
  const { data: balancesData, isLoading: loadingBalances } = useQuery({
    queryKey: ['inventory', 'balances', warehouseId, search, lowStockOnly, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (warehouseId) params.append('warehouseId', warehouseId);
      if (search) params.append('search', search);
      if (lowStockOnly) params.append('lowStock', 'true');

      const res = await api.get(`/inventory/balances?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'balances',
  });

  // 4. Movements query
  const { data: movementsData, isLoading: loadingMovements } = useQuery({
    queryKey: ['inventory', 'movements', warehouseId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (warehouseId) params.append('warehouseId', warehouseId);

      const res = await api.get(`/inventory/movements?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'movements',
  });

  // Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: {
      warehouseId: string;
      type: string;
      reason: string;
      items: Array<{ productId: string; countedQuantity: number }>;
    }) => {
      const res = await api.post('/inventory/adjustments', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Physical count adjustment reconciled and logged');
      setShowAdjustModal(false);
      setAdjustWarehouseId('');
      setAdjustProductId('');
      setCountedQty('');
      setAdjustReason('');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to apply adjustment');
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustWarehouseId || !adjustProductId || countedQty === '') {
      toast.error('Please complete all required fields');
      return;
    }

    adjustMutation.mutate({
      warehouseId: adjustWarehouseId,
      type: adjustType,
      reason: adjustReason || 'Physical inventory cycle count',
      items: [
        {
          productId: adjustProductId,
          countedQuantity: parseFloat(countedQty),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Control & Ledger"
        description="Immutable double-entry inventory movements, physical counts, and facility balances."
        actions={
          <div className="flex items-center space-x-2.5">
            <Button size="sm" onClick={() => setShowAdjustModal(true)}>
              <Sliders className="h-4 w-4 mr-1.5" />
              Stock Adjustment
            </Button>
          </div>
        }
      />

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setActiveTab('balances');
              setPage(1);
            }}
            className={`flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'balances'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Boxes className="h-3.5 w-3.5 mr-1.5" />
            Stock Balances
          </button>
          <button
            onClick={() => {
              setActiveTab('movements');
              setPage(1);
            }}
            className={`flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'movements'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            Movement Ledger
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Facility Filter */}
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Warehouses</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          {activeTab === 'balances' && (
            <>
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter SKU or name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 pl-8 text-xs"
                />
              </div>

              <button
                onClick={() => {
                  setLowStockOnly(!lowStockOnly);
                  setPage(1);
                }}
                className={`flex items-center h-9 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  lowStockOnly
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Low Stock
              </button>
            </>
          )}
        </div>
      </div>

      {/* BALANCES TAB */}
      {activeTab === 'balances' && (
        <Card>
          {loadingBalances ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !balancesData?.data || balancesData.data.length === 0 ? (
            <EmptyState
              title="No inventory records"
              description="No balances found for the selected warehouse or criteria."
            />
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Product / SKU</TableHead>
                    <TableHead>On Hand</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Valuation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balancesData.data.map((b: StockBalance) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="flex items-center space-x-1.5 text-xs">
                          <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{b.warehouseName}</span>
                          <span className="text-muted-foreground font-mono text-[10px]">({b.warehouseCode})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-semibold text-foreground text-xs block">{b.productName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{b.productSku}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-sm text-foreground">
                          {b.quantityOnHand} {b.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.allocatedQuantity} {b.unit}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-500">
                        {b.availableQuantity} {b.unit}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatCurrency(b.costPrice)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {formatCurrency(b.inventoryValuation)}
                      </TableCell>
                      <TableCell>
                        {b.isOutOfStock ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : b.isLowStock ? (
                          <Badge variant="warning">Low Stock</Badge>
                        ) : (
                          <Badge variant="success">Healthy</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {balancesData.meta && balancesData.meta.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Page {balancesData.meta.page} of {balancesData.meta.totalPages}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= balancesData.meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* MOVEMENTS TAB */}
      {activeTab === 'movements' && (
        <Card>
          {loadingMovements ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !movementsData?.data || movementsData.data.length === 0 ? (
            <EmptyState
              title="No movements recorded"
              description="Inventory transactions will appear here as orders, purchases, and adjustments occur."
            />
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Product / SKU</TableHead>
                    <TableHead>Delta Qty</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsData.data.map((m: StockMovement) => {
                    const isPositive = ['PURCHASE_RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'INITIAL_STOCK', 'SALES_RETURN'].includes(m.type);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(m.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {m.warehouse.name}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-xs text-foreground block">{m.product.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{m.product.sku}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold text-sm ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
                            {isPositive ? '+' : '-'}{Math.abs(Number(m.quantity))} {m.product.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {Number(m.balanceAfter)} {m.product.unit}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {m.reason || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {movementsData.meta && movementsData.meta.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Page {movementsData.meta.page} of {movementsData.meta.totalPages}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= movementsData.meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Physical Inventory Adjustment"
        description="Reconcile variances between physical counts and system records."
        maxWidth="md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Warehouse Facility *</label>
            <select
              required
              value={adjustWarehouseId}
              onChange={(e) => setAdjustWarehouseId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select facility...</option>
              {warehouses?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Product SKU *</label>
            <select
              required
              value={adjustProductId}
              onChange={(e) => setAdjustProductId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select product SKU...</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">New Physical Count *</label>
              <Input
                required
                type="number"
                step="1"
                placeholder="Actual counted count"
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Adjustment Reason Type</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="RECONCILIATION">Cycle Count Reconciliation</option>
                <option value="DAMAGE">Damaged Goods</option>
                <option value="LOSS">Shrinkage / Loss</option>
                <option value="FOUND">Surplus Found Stock</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Audit Explanation / Notes</label>
            <Input
              placeholder="e.g. End of month physical verification audit"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={adjustMutation.isPending}>
              Commit Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
