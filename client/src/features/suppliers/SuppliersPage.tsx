import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Supplier } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Card } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { Modal } from '../../components/ui/modal.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { formatCurrency } from '../../lib/utils.js';
import { Plus, Search, Truck, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'United States',
    taxId: '',
    paymentTerms: 'Net 30',
  });

  const [editFormData, setEditFormData] = useState({
    code: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'United States',
    taxId: '',
    paymentTerms: 'Net 30',
  });

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      const res = await api.get(`/suppliers${search ? `?search=${search}` : ''}`);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/suppliers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier profile created in PostgreSQL');
      setShowCreateModal(false);
      setFormData({
        code: '',
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'United States',
        taxId: '',
        paymentTerms: 'Net 30',
      });
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create supplier');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string } & typeof editFormData) => {
      const { id, ...body } = payload;
      const res = await api.put(`/suppliers/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier details updated in PostgreSQL');
      setEditingSupplier(null);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to update supplier');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    updateMutation.mutate({
      id: editingSupplier.id,
      ...editFormData,
    });
  };

  const startEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setEditFormData({
      code: s.code,
      companyName: s.companyName,
      contactPerson: s.contactPerson || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      city: s.city || '',
      country: s.country || 'United States',
      taxId: s.taxId || '',
      paymentTerms: s.paymentTerms || 'Net 30',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier & Vendor Directory"
        description="Vendor relationships, terms, contact profiles, and historical procurement volume."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Supplier
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !suppliersData?.suppliers || suppliersData.suppliers.length === 0 ? (
          <EmptyState
            title="No suppliers found"
            description="Add vendors to start generating procurement orders and replenishing inventory."
            actionText="Add Supplier"
            onAction={() => setShowCreateModal(true)}
            icon={<Truck className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Code</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Lead</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Cumulative Spend</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersData.suppliers.map((s: Supplier) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {s.code}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground text-sm block">{s.companyName}</span>
                    <span className="text-muted-foreground text-xs">{s.city ? `${s.city}, ${s.country}` : s.country}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="text-foreground font-medium">{s.contactPerson || '—'}</span>
                      <div className="flex items-center space-x-2 text-muted-foreground mt-0.5">
                        {s.email && <span>{s.email}</span>}
                        {s.phone && <span>• {s.phone}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    {s.paymentTerms || 'Net 30'}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {s.totalOrdersCount} POs
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground">
                    {formatCurrency(s.totalPurchasesAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => startEdit(s)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit supplier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* CREATE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Vendor Profile"
        description="Register a new procurement supplier with commercial terms."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Vendor Code *</label>
              <Input
                required
                placeholder="e.g. SUP-004"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Company Name *</label>
              <Input
                required
                placeholder="e.g. Global Tech Components"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Person</label>
              <Input
                placeholder="Account Representative"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="vendor@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone</label>
              <Input
                placeholder="+1 800-555-0199"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">City</label>
              <Input
                placeholder="Seattle"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tax Identifier</label>
              <Input
                placeholder="EIN / VAT"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Immediate">Due on Receipt</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Vendor
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingSupplier}
        onClose={() => setEditingSupplier(null)}
        title="Edit Vendor Profile"
        description="Update supplier contact information and payment terms."
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Vendor Code *</label>
              <Input
                required
                placeholder="Vendor code"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Company Name *</label>
              <Input
                required
                placeholder="Company name"
                value={editFormData.companyName}
                onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Person</label>
              <Input
                placeholder="Account Representative"
                value={editFormData.contactPerson}
                onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="vendor@company.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone</label>
              <Input
                placeholder="Phone number"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">City</label>
              <Input
                placeholder="City"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tax Identifier</label>
              <Input
                placeholder="EIN / VAT"
                value={editFormData.taxId}
                onChange={(e) => setEditFormData({ ...editFormData, taxId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Payment Terms</label>
              <select
                value={editFormData.paymentTerms}
                onChange={(e) => setEditFormData({ ...editFormData, paymentTerms: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Immediate">Due on Receipt</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
