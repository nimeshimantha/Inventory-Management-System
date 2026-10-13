import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { StockTransfer, Warehouse, Product } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Card } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { Modal } from '../../components/ui/modal.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { formatDateTime } from '../../lib/utils.js';
import { Plus, ArrowLeftRight, Truck, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function StockTransfersPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 },
  ]);

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const res = await api.get('/inventory/transfers');
      return res.data.data;
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

  // Create Transfer Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      sourceWarehouseId: string;
      destinationWarehouseId: string;
      notes?: string;
      items: Array<{ productId: string; quantity: number }>;
    }) => {
      const res = await api.post('/inventory/transfers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('Transfer draft created successfully');
      setShowCreateModal(false);
      setSourceWarehouseId('');
      setDestinationWarehouseId('');
      setNotes('');
      setTransferItems([{ productId: '', quantity: 1 }]);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create transfer');
    },
  });

  // Dispatch Mutation
  const dispatchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/inventory/transfers/${id}/dispatch`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Transfer dispatched! Source warehouse stock deducted.');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to dispatch transfer');
    },
  });

  // Receive Mutation
  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/inventory/transfers/${id}/receive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Transfer received! Destination inventory updated.');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to receive transfer');
    },
  });

  const handleAddItem = () => {
    setTransferItems([...transferItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updated = [...transferItems];
    // @ts-expect-error dynamic assign
    updated[index][field] = value;
    setTransferItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWarehouseId || !destinationWarehouseId) {
      toast.error('Select both source and destination facilities');
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      toast.error('Source and destination warehouse cannot be identical');
      return;
    }
    if (transferItems.some((i) => !i.productId || i.quantity <= 0)) {
      toast.error('Please specify valid products and quantities');
      return;
    }

    createMutation.mutate({
      sourceWarehouseId,
      destinationWarehouseId,
      notes,
      items: transferItems.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Stock Transfers"
        description="Cross-docking and inter-facility stock movements with atomic dispatch and receipt validation."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Transfer
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !transfersData?.transfers || transfersData.transfers.length === 0 ? (
          <EmptyState
            title="No transfers logged"
            description="Move stock safely between distribution centers and fulfillment facilities."
            actionText="Initiate Transfer"
            onAction={() => setShowCreateModal(true)}
            icon={<ArrowLeftRight className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>Route (Source → Destination)</TableHead>
                <TableHead>Items Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfersData.transfers.map((t: StockTransfer) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {t.transferNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-semibold text-foreground">{t.sourceWarehouse.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-primary">{t.destinationWarehouse.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    {t.items?.length || 0} line items
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === 'COMPLETED'
                          ? 'success'
                          : t.status === 'DISPATCHED'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(t.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {t.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dispatchMutation.mutate(t.id)}
                          isLoading={dispatchMutation.isPending}
                          className="h-8 text-xs"
                        >
                          <Truck className="h-3.5 w-3.5 mr-1" />
                          Dispatch
                        </Button>
                      )}
                      {t.status === 'DISPATCHED' && (
                        <Button
                          size="sm"
                          onClick={() => receiveMutation.mutate(t.id)}
                          isLoading={receiveMutation.isPending}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Receive Stock
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* CREATE TRANSFER MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Initiate Inter-Warehouse Transfer"
        description="Verify source availability before committing transfer dispatch."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Source Warehouse (Origin) *</label>
              <select
                required
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select origin facility...</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Destination Warehouse *</label>
              <select
                required
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select target facility...</option>
                {warehouses
                  ?.filter((w) => w.id !== sourceWarehouseId)
                  .map((w) => (
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
              <span className="text-xs font-semibold text-foreground">Items to Transfer</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add SKU
              </Button>
            </div>

            {transferItems.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <select
                  required
                  value={item.productId}
                  onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
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
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                  className="w-24 h-9 text-xs"
                />
                {transferItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Transfer Notes</label>
            <Input
              placeholder="e.g. Expedited transfer for Q4 corporate fulfillment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Transfer Draft
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
