import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { SalesOrder, Customer, Warehouse, Product } from '../../types/index.js';
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
  DollarSign,
  PackageCheck,
  CreditCard,
  Eye,
  Printer,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export function SalesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  // Form State for Sales Order creation
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; orderedQuantity: number; unitPrice: number }>>([
    { productId: '', orderedQuantity: 1, unitPrice: 0 },
  ]);

  // Form State for Payment recording
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await api.get('/sales-orders');
      return res.data.data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data.data.customers as Customer[];
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
      customerId: string;
      warehouseId: string;
      discountAmount: number;
      notes?: string;
      items: Array<{ productId: string; orderedQuantity: number; unitPrice: number }>;
    }) => {
      const res = await api.post('/sales-orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sales order & billing invoice created successfully');
      setShowCreateModal(false);
      setCustomerId('');
      setWarehouseId('');
      setDiscountAmount(0);
      setNotes('');
      setOrderItems([{ productId: '', orderedQuantity: 1, unitPrice: 0 }]);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create sales order');
    },
  });

  // Fulfill Mutation
  const fulfillMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-orders/${id}/fulfill`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Order fulfilled! Stock deducted and immutable ledger recorded.');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to fulfill order');
    },
  });

  // Record Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: string; payload: unknown }) => {
      const res = await api.post(`/sales-orders/${orderId}/payments`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setReferenceNumber('');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders & Fulfillment"
        description="Multi-warehouse dispatch, stock allocation, invoices, and settlement tracking."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Sales Order
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !salesData?.orders || salesData.orders.length === 0 ? (
          <EmptyState
            title="No sales orders"
            description="Create commercial customer orders to trigger inventory fulfillment and billing."
            actionText="Create Sales Order"
            onAction={() => setShowCreateModal(true)}
            icon={<DollarSign className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Fulfillment Facility</TableHead>
                <TableHead>Grand Total</TableHead>
                <TableHead>Fulfillment Status</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.orders.map((so: SalesOrder) => (
                <TableRow key={so.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {so.orderNumber}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-xs text-foreground block">{so.customer.name}</span>
                    <span className="text-muted-foreground text-[10px]">{so.customer.code}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {so.warehouse.name}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground">
                    {formatCurrency(so.grandTotal)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={so.status === 'FULFILLED' ? 'success' : 'secondary'}>
                      {so.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={so.paymentStatus === 'PAID' ? 'success' : so.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'outline'}>
                      {so.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(so.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {so.status !== 'FULFILLED' && (
                        <Button
                          size="sm"
                          onClick={() => fulfillMutation.mutate(so.id)}
                          isLoading={fulfillMutation.isPending}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <PackageCheck className="h-3.5 w-3.5 mr-1" />
                          Fulfill
                        </Button>
                      )}

                      {so.paymentStatus !== 'PAID' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const res = await api.get(`/sales-orders/${so.id}`);
                            setSelectedOrder(res.data.data);
                            const remaining = Math.max(0, Number(res.data.data.grandTotal) - Number(res.data.data.paidAmount));
                            setPaymentAmount(remaining.toString());
                            setShowPaymentModal(true);
                          }}
                          className="h-8 text-xs"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1 text-primary" />
                          Pay
                        </Button>
                      )}

                      <button
                        onClick={async () => {
                          const res = await api.get(`/sales-orders/${so.id}`);
                          setSelectedOrder(res.data.data);
                          setShowDetailModal(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="View Invoice & Details"
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

      {/* CREATE ORDER MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Customer Sales Order"
        description="Select customer account, origin warehouse, and products to sell."
        maxWidth="xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              customerId,
              warehouseId,
              discountAmount: Number(discountAmount),
              notes,
              items: orderItems.map((i) => ({
                productId: i.productId,
                orderedQuantity: Number(i.orderedQuantity),
                unitPrice: Number(i.unitPrice),
              })),
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Customer *</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select customer account...</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Fulfillment Warehouse *</label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select shipping warehouse...</option>
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
              <span className="text-xs font-semibold text-foreground">Sales Line Items</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOrderItems([...orderItems, { productId: '', orderedQuantity: 1, unitPrice: 0 }])}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Add SKU
              </Button>
            </div>

            {orderItems.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <select
                  required
                  value={item.productId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const prod = products?.find((p) => p.id === pId);
                    const updated = [...orderItems];
                    updated[idx].productId = pId;
                    if (prod) updated[idx].unitPrice = Number(prod.sellingPrice);
                    setOrderItems(updated);
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
                  min="1"
                  placeholder="Qty"
                  value={item.orderedQuantity}
                  onChange={(e) => {
                    const updated = [...orderItems];
                    updated[idx].orderedQuantity = parseInt(e.target.value, 10) || 1;
                    setOrderItems(updated);
                  }}
                  className="w-20 h-9 text-xs"
                />
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const updated = [...orderItems];
                    updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                    setOrderItems(updated);
                  }}
                  className="w-24 h-9 text-xs"
                />
                {orderItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Discount Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Notes / Reference</label>
              <Input
                placeholder="e.g. Purchase order PO-ACME-4402"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Sales Order & Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={`Record Payment: ${selectedOrder?.orderNumber}`}
        description="Post customer payment settlement against this invoice."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedOrder) return;
            paymentMutation.mutate({
              orderId: selectedOrder.id,
              payload: {
                amount: parseFloat(paymentAmount),
                paymentMethod,
                referenceNumber,
              },
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Payment Amount ($) *</label>
            <Input
              required
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="BANK_TRANSFER">Bank Wire / ACH</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Corporate Check</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Transaction Reference / Check #</label>
            <Input
              placeholder="e.g. WIRE-881928"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={paymentMutation.isPending}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE INVOICE DETAIL MODAL */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Invoice: ${selectedOrder?.invoices?.[0]?.invoiceNumber || selectedOrder?.orderNumber}`}
        description="Printable commercial tax invoice."
        maxWidth="2xl"
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs p-2 print:p-0">
            {/* Header / Invoice Branding */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">StockFlow Global</h2>
                <p className="text-[11px] text-muted-foreground">Commercial Distribution & Fulfillment</p>
                <p className="text-[10px] text-muted-foreground">Chicago, IL • support@stockflow.dev</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-bold text-foreground">
                  {selectedOrder.invoices?.[0]?.invoiceNumber || selectedOrder.orderNumber}
                </span>
                <p className="text-[11px] text-muted-foreground">Date: {formatDateTime(selectedOrder.createdAt)}</p>
                <div className="mt-1">
                  <Badge variant={selectedOrder.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                    Payment: {selectedOrder.paymentStatus}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Billed To / Shipped From */}
            <div className="grid grid-cols-2 gap-6 p-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Billed To
                </span>
                <span className="font-bold text-sm text-foreground block">{selectedOrder.customer.name}</span>
                <span className="text-muted-foreground block">{selectedOrder.customer.company}</span>
                <span className="text-muted-foreground block">{selectedOrder.customer.email}</span>
                <span className="text-muted-foreground block">{selectedOrder.customer.phone}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Dispatched From
                </span>
                <span className="font-bold text-sm text-foreground block">{selectedOrder.warehouse.name}</span>
                <span className="text-muted-foreground block">Facility: {selectedOrder.warehouse.code}</span>
                <span className="text-muted-foreground block">Fulfillment: {selectedOrder.status}</span>
              </div>
            </div>

            {/* Invoice Line Items Table */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item / SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-semibold text-foreground text-xs block">{item.product.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{item.product.sku}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {item.orderedQuantity} {item.product.unit}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-foreground">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Financial Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8.25%)</span>
                  <span>{formatCurrency(selectedOrder.taxAmount)}</span>
                </div>
                {Number(selectedOrder.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                  <span>Grand Total</span>
                  <span>{formatCurrency(selectedOrder.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Paid Settlement</span>
                  <span>{formatCurrency(selectedOrder.paidAmount)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5" />
                Print Invoice
              </Button>
              <Button type="button" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
