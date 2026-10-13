import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Customer } from '../../types/index.js';
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
import { Plus, Search, Users2 } from 'lucide-react';
import { toast } from 'sonner';

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    billingAddress: '',
    shippingAddress: '',
    city: '',
    creditLimit: 25000,
  });

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await api.get(`/customers${search ? `?search=${search}` : ''}`);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/customers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer account registered successfully');
      setShowCreateModal(false);
      setFormData({
        code: '',
        name: '',
        email: '',
        phone: '',
        company: '',
        billingAddress: '',
        shippingAddress: '',
        city: '',
        creditLimit: 25000,
      });
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create customer');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      creditLimit: Number(formData.creditLimit),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory & Accounts"
        description="Commercial client accounts, credit limits, sales histories, and receivables."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Customer
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer name, account code, company..."
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
        ) : !customersData?.customers || customersData.customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Register clients to place commercial orders and manage invoices."
            actionText="Add Customer"
            onAction={() => setShowCreateModal(true)}
            icon={<Users2 className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Code</TableHead>
                <TableHead>Name / Organization</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Outstanding Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersData.customers.map((c: Customer) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {c.code}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground text-sm block">{c.name}</span>
                    <span className="text-muted-foreground text-xs">{c.company || 'Individual Account'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="text-foreground">{c.email || '—'}</span>
                      <span className="text-muted-foreground block text-[11px]">{c.phone || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatCurrency(c.creditLimit)}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {c.totalOrdersCount} SOs
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-bold ${
                        Number(c.outstandingBalance) > 0 ? 'text-amber-500' : 'text-foreground'
                      }`}
                    >
                      {formatCurrency(c.outstandingBalance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? 'success' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
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
        title="Add Customer Account"
        description="Register an enterprise customer profile with credit facilities."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Customer Code *</label>
              <Input
                required
                placeholder="e.g. CUST-005"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact / Account Name *</label>
              <Input
                required
                placeholder="e.g. Robert Sterling"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Company Name</label>
              <Input
                placeholder="Sterling Media Group"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="robert@sterling.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone</label>
              <Input
                placeholder="+1 312-555-0199"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Billing Address</label>
              <Input
                placeholder="400 Michigan Ave"
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Credit Limit ($)</label>
              <Input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Register Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
