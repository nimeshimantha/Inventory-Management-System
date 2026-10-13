import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { PurchaseOrder, Supplier, Warehouse, Product } from '../../types/index.js';
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
  Plus,
  ShoppingCart,
  CheckCircle,
  PackageCheck,
  Eye,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function PurchasesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Form State for PO creation
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{ productId: string; orderedQuantity: number; unitCost: number }>>([
    { productId: '', orderedQuantity: 5, unitCost: 0 },
  ]);

  // Form State for Goods Receiving
  const [receivingQuantities, setReceivingQuantities] = useState<Record<string, number>>({});
  const [receivingNotes, setReceivingNotes] = useState('');

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await api.get('/purchase-orders');
      return res.data.data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers');
      return res.data.data.suppliers as Supplier[];
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await api.get('/warehouses');
      return res.data.data as Warehouse[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100');
      return res.data.data as Product[];
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      supplierId: string;
      warehouseId: string;
      notes?: string;
      items: Array<{ productId: string; orderedQuantity: number; unitCost: number }>;
    }) => {
      const res = await api.post('/purchase-orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase order created successfully');
      setShowCreateModal(false);
      setSupplierId('');
      setWarehouseId('');
      setNotes('');
      setPoItems([{ productId: '', orderedQuantity: 5, unitCost: 0 }]);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create purchase order');
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/purchase-orders/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase order approved for vendor fulfillment');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to approve purchase order');
    },
  });

  // Receive Goods Mutation
  const receiveMutation = useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: string; payload: unknown }) => {
      const res = await api.post(`/purchase-orders/${orderId}/receive`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Goods received and inventory balances incremented!');
      setShowReceiveModal(false);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to receive goods');
    },
  });

  const handleOpenReceive = async (order: PurchaseOrder) => {
    try {
      const res = await api.get(`/purchase-orders/${order.id}`);
      setSelectedOrder(res.data.data);
      // Prepopulate receiving quantities with remaining unreceived quantities
      const initial: Record<string, number> = {};
      res.data.data.items.forEach((item: { productId: string; orderedQuantity: number; receivedQuantity: number }) => {
        const remaining = Math.max(0, Number(item.orderedQuantity) - Number(item.receivedQuantity));
        initial[item.productId] = remaining;
      });
      setReceivingQuantities(initial);
      setShowReceiveModal(true);
    } catch {
      toast.error('Failed to load order details');
    }
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const itemsToReceive = Object.entries(receivingQuantities)
      .map(([productId, qty]) => ({ productId, receivedQuantity: Number(qty) }))
      .filter((i) => i.receivedQuantity > 0);

    if (itemsToReceive.length === 0) {
      toast.error('Specify a quantity greater than zero for at least one item');
      return;
    }

    receiveMutation.mutate({
      orderId: selectedOrder.id,
      payload: {
        items: itemsToReceive,
        notes: receivingNotes,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement & Purchase Orders"
        description="Vendor replenishment, approval workflows, and multi-stage goods receiving."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Purchase Order
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !purchasesData?.orders || purchasesData.orders.length === 0 ? (
          <EmptyState
            title="No purchase orders"
            description="Create procurement orders to replenish stock across your distribution centers."
            actionText="Create Purchase Order"
            onAction={() => setShowCreateModal(true)}
            icon={<ShoppingCart className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Grand Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchasesData.orders.map((po: PurchaseOrder) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {po.orderNumber}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {po.supplier.companyName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {po.warehouse.name}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground">
                    {formatCurrency(po.grandTotal)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        po.status === 'RECEIVED'
                          ? 'success'
                          : po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(po.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {po.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate(po.id)}
                          isLoading={approveMutation.isPending}
                          className="h-8 text-xs"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          Approve
                        </Button>
                      )}

                      {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenReceive(po)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <PackageCheck className="h-3.5 w-3.5 mr-1" />
                          Receive Goods
                        </Button>
                      )}

                      <button
                        onClick={async () => {
                          const res = await api.get(`/purchase-orders/${po.id}`);
                          setSelectedOrder(res.data.data);
                          setShowDetailModal(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="View PO Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* CREATE PO MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Purchase Order"
        description="Select vendor, destination facility, and replenishment line items."
        maxWidth="xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              supplierId,
              warehouseId,
              notes,
              items: poItems.map((i) => ({
                productId: i.productId,
                orderedQuantity: Number(i.orderedQuantity),
                unitCost: Number(i.unitCost),
              })),
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Supplier *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select supplier vendor...</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Destination Warehouse *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select receiving warehouse...</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Order Line Items</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPoItems([...poItems, { productId: '', orderedQuantity: 5, unitCost: 0 }])}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Line
              </Button>
            </div>

            {poItems.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <select
                  required
                  value={item.productId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const prod = products?.find((p) => p.id === pId);
                    const updated = [...poItems];
                    updated[idx].productId = pId;
                    if (prod) updated[idx].unitCost = Number(prod.costPrice);
                    setPoItems(updated);
                  }}
                  className="h-9 flex-1 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select product...</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                <Input
                  required
                  type="number"
                  placeholder="Qty"
                  value={item.orderedQuantity}
                  onChange={(e) => {
                    const updated = [...poItems];
                    updated[idx].orderedQuantity = parseInt(e.target.value, 10) || 1;
                    setPoItems(updated);
                  }}
                  className="w-20 h-9 text-xs"
                />
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="Unit Cost"
                  value={item.unitCost}
                  onChange={(e) => {
                    const updated = [...poItems];
                    updated[idx].unitCost = parseFloat(e.target.value) || 0;
                    setPoItems(updated);
                  }}
                  className="w-24 h-9 text-xs"
                />
                {poItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">PO Instructions / Notes</label>
            <Input
              placeholder="e.g. Standard Net 30 terms, dock delivery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Draft PO
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECEIVE GOODS MODAL */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title={`Receive Goods: ${selectedOrder?.orderNumber}`}
        description="Verify incoming physical delivery and record partial or full intake."
        maxWidth="lg"
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-4">
          <div className="space-y-3">
            {selectedOrder?.items?.map((item) => {
              const remaining = Math.max(0, Number(item.orderedQuantity) - Number(item.receivedQuantity));
              return (
                <div key={item.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground block">{item.product.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Ordered: {item.orderedQuantity} | Received so far: {item.receivedQuantity} {item.product.unit}
                      </span>
                    </div>
                    <Badge variant={remaining === 0 ? 'success' : 'outline'}>
                      {remaining === 0 ? 'Fulfilled' : `Pending: ${remaining}`}
                    </Badge>
                  </div>

                  {remaining > 0 && (
                    <div className="flex items-center space-x-3 pt-1">
                      <label className="text-[11px] font-semibold text-foreground">Intake Quantity:</label>
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        value={receivingQuantities[item.productId] ?? remaining}
                        onChange={(e) => {
                          const val = Math.min(remaining, Math.max(0, parseInt(e.target.value, 10) || 0));
                          setReceivingQuantities({
                            ...receivingQuantities,
                            [item.productId]: val,
                          });
                        }}
                        className="w-28 h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Goods Receipt Inspection Notes</label>
            <Input
              placeholder="e.g. Received via FedEx Freight, package intact"
              value={receivingNotes}
              onChange={(e) => setReceivingNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowReceiveModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={receiveMutation.isPending}>
              Confirm Intake & Update Inventory
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Purchase Order: ${selectedOrder?.orderNumber}`}
        description={`Status: ${selectedOrder?.status}`}
        maxWidth="lg"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Supplier Vendor</span>
                <span className="font-semibold text-foreground">{selectedOrder.supplier?.companyName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Destination Warehouse</span>
                <span className="font-semibold text-foreground">{selectedOrder.warehouse?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Grand Total</span>
                <span className="font-bold text-sm text-foreground">{formatCurrency(selectedOrder.grandTotal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Ordered Date</span>
                <span className="font-medium text-foreground">{formatDateTime(selectedOrder.createdAt)}</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 text-foreground">Line Items</h4>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <div>
                      <span className="font-semibold text-foreground">{item.product.name}</span>
                      <span className="text-muted-foreground text-[10px] block">
                        Ordered: {item.orderedQuantity} {item.product.unit} | Received: {item.receivedQuantity} {item.product.unit}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-foreground">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
