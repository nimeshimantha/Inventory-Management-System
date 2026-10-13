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
import { Plus, Search, Truck, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      toast.success('Supplier profile created successfully');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

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
              <label className="text-xs font-semibold text-foreground">Supplier Code *</label>
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
                placeholder="e.g. Continental Electronics Corp"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Person</label>
              <Input
                placeholder="e.g. Jennifer Smith"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="jsmith@continental.com"
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
              <label className="text-xs font-semibold text-foreground">Street Address</label>
              <Input
                placeholder="500 Industrial Pkwy"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">City</label>
              <Input
                placeholder="Chicago"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Payment Terms</label>
              <Input
                placeholder="Net 30, Net 60, COD"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Register Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
