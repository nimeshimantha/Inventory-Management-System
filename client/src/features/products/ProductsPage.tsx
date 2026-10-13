import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Product, Category, Brand, StockMovement } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Badge } from '../../components/ui/badge.js';
import { Card } from '../../components/ui/card.js';
import { Modal } from '../../components/ui/modal.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { formatCurrency, formatDateTime } from '../../lib/utils.js';
import {
  Plus,
  Search,
  Download,
  Upload,
  AlertTriangle,
  History,
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    brandId: '',
    unit: 'pcs',
    costPrice: 0,
    sellingPrice: 0,
    taxRate: 8.25,
    reorderLevel: 10,
  });

  // Query: Products
  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryId, brandId, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (categoryId) params.append('categoryId', categoryId);
      if (brandId) params.append('brandId', brandId);
      if (lowStockOnly) params.append('lowStock', 'true');

      const res = await api.get(`/products?${params.toString()}`);
      return res.data;
    },
  });

  // Query: Categories & Brands for dropdowns
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data as Category[];
    },
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get('/brands');
      return res.data.data as Brand[];
    },
  });

  // Mutation: Create Product
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/products', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        categoryId: '',
        brandId: '',
        unit: 'pcs',
        costPrice: 0,
        sellingPrice: 0,
        taxRate: 8.25,
        reorderLevel: 10,
      });
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create product');
    },
  });

  // Mutation: Archive Product
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product archived successfully');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to archive product');
    },
  });

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stockflow-products.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Product catalogue exported to CSV');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handleViewMovements = async (product: Product) => {
    setSelectedProduct(product);
    try {
      const res = await api.get(`/products/${product.id}/movements`);
      setProductMovements(res.data.data || []);
      setShowMovementsModal(true);
    } catch {
      toast.error('Failed to fetch stock movements');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      costPrice: Number(formData.costPrice),
      sellingPrice: Number(formData.sellingPrice),
      taxRate: Number(formData.taxRate),
      reorderLevel: Number(formData.reorderLevel),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Master Catalog"
        description="Comprehensive SKU management, multi-warehouse stock visibility, and pricing controls."
        actions={
          <div className="flex items-center space-x-2.5">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Product
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU, product name, barcode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Brand Filter */}
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Brands</option>
              {brands?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Low stock toggle */}
            <button
              onClick={() => {
                setLowStockOnly(!lowStockOnly);
                setPage(1);
              }}
              className={`flex items-center h-10 px-3 rounded-lg border text-xs font-semibold transition-all ${
                lowStockOnly
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Low Stock Only
            </button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try adjusting your search criteria or add your first product to inventory."
            actionText="Add Product"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product / SKU</TableHead>
                  <TableHead>Category & Brand</TableHead>
                  <TableHead>Total Stock</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((product: Product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-foreground text-sm block">{product.name}</span>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{product.sku}</span>
                          {product.barcode && <span>• Barcode: {product.barcode}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-foreground">{product.category?.name || '—'}</span>
                        <span className="text-muted-foreground block">{product.brand?.name || 'Unbranded'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-sm ${product.isLowStock ? 'text-amber-500' : 'text-foreground'}`}>
                          {product.totalStock} {product.unit}
                        </span>
                        {product.isLowStock && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                            Reorder ≤{product.reorderLevel}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-xs text-muted-foreground">
                      {formatCurrency(product.costPrice)}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {formatCurrency(product.sellingPrice)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewMovements(product)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Stock Movement Ledger"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Archive product "${product.name}"?`)) {
                              archiveMutation.mutate(product.id);
                            }
                          }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Archive Product"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {data.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} products)
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* CREATE PRODUCT MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Product"
        description="Add a new catalog item with warehouse tracking and pricing rules."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Product Name *</label>
              <Input
                required
                placeholder="e.g. Dell XPS 15 9530"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">SKU (Unique) *</label>
              <Input
                required
                placeholder="e.g. DELL-XPS-15"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Barcode / EAN</label>
              <Input
                placeholder="e.g. 884116410291"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select category...</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Brand</label>
              <select
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select brand...</option>
                {brands?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Unit</label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Cost Price ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Selling Price ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Reorder Level</label>
              <Input
                type="number"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value, 10) || 10 })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed specifications, warranty notes, etc."
              className="w-full rounded-lg border border-input bg-card p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedProduct?.name || 'Product Details'}
        description={`SKU: ${selectedProduct?.sku}`}
        maxWidth="lg"
      >
        {selectedProduct && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Category</span>
                <span className="font-semibold text-foreground">{selectedProduct.category?.name || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Brand</span>
                <span className="font-semibold text-foreground">{selectedProduct.brand?.name || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Unit</span>
                <span className="font-semibold text-foreground">{selectedProduct.unit}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Cost Price</span>
                <span className="font-semibold text-foreground">{formatCurrency(selectedProduct.costPrice)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Selling Price</span>
                <span className="font-semibold text-foreground">{formatCurrency(selectedProduct.sellingPrice)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Reorder Threshold</span>
                <span className="font-semibold text-foreground">{selectedProduct.reorderLevel} units</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 text-foreground">Warehouse Stock Breakdown</h4>
              {selectedProduct.stockBalances && selectedProduct.stockBalances.length > 0 ? (
                <div className="space-y-2">
                  {selectedProduct.stockBalances.map((sb) => (
                    <div key={sb.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                      <div>
                        <span className="font-semibold text-foreground">{sb.warehouse.name}</span>
                        <span className="text-muted-foreground text-[10px] block">Facility Code: {sb.warehouse.code}</span>
                      </div>
                      <span className="font-bold text-sm text-foreground">{sb.quantityOnHand} {selectedProduct.unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No warehouse stock allocated yet.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MOVEMENTS MODAL */}
      <Modal
        isOpen={showMovementsModal}
        onClose={() => setShowMovementsModal(false)}
        title={`Stock Movement Ledger: ${selectedProduct?.name}`}
        description="Immutable double-entry transaction history recorded for this SKU."
        maxWidth="xl"
      >
        <div className="max-h-96 overflow-y-auto space-y-2">
          {productMovements.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No transaction history recorded yet.</p>
          ) : (
            productMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {m.type}
                    </Badge>
                    <span className="text-muted-foreground">{m.warehouse.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{m.reason || 'Transaction'}</p>
                  <p className="text-[10px] text-muted-foreground/80">{formatDateTime(m.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-foreground">
                    {Number(m.quantity)} {selectedProduct?.unit}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Balance After: {Number(m.balanceAfter)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
