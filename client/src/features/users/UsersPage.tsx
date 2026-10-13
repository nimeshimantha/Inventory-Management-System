import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { User } from '../../types/index.js';
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
import { Plus, Search, UserCheck, Shield, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleCodes: ['STAFF'],
  });

  const { data: usersData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const res = await api.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      return res.data;
    },
  });

  const users: User[] = Array.isArray(usersData?.data)
    ? usersData.data
    : Array.isArray(usersData)
    ? usersData
    : Array.isArray(usersData?.users)
    ? usersData.users
    : [];

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User account registered successfully');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleCodes: ['STAFF'],
      });
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create user');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/toggle-status`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Role-Based Access Control"
        description="User provisioning, credential policies, active states, and RBAC matrix roles."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add User
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email..."
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
        ) : isError ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Failed to load users</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mb-5">
              {(error as any)?.response?.data?.message || (error as Error)?.message || 'An unexpected error occurred while loading users.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title={search ? 'No matching users found' : 'No users found'}
            description={search ? `No user accounts match "${search}". Try searching with another name or email.` : 'Invite teammates and configure access roles.'}
            actionText={search ? undefined : 'Add User'}
            onAction={search ? undefined : () => setShowCreateModal(true)}
            icon={<UserCheck className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Security Role</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: User) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
                        {u.firstName?.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground text-xs block">
                          {u.firstName} {u.lastName}
                        </span>
                        {u.phone && <span className="text-[10px] text-muted-foreground">{u.phone}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.map((r, i) => {
                        const roleCode = typeof r === 'string' ? r : (r as unknown as { code?: string })?.code || '';
                        return (
                          <Badge
                            key={i}
                            variant={roleCode === 'SUPER_ADMIN' ? 'destructive' : roleCode === 'ADMIN' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {roleCode}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(u.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'success' : 'secondary'}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => toggleMutation.mutate(u.id)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title={u.isActive ? 'Deactivate User' : 'Activate User'}
                    >
                      {u.isActive ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
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
        title="Provision User Account"
        description="Create credentials and assign role permissions."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">First Name *</label>
              <Input
                required
                placeholder="Marcus"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Last Name *</label>
              <Input
                required
                placeholder="Brody"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Email Address *</label>
            <Input
              required
              type="email"
              placeholder="mbrody@stockflow.dev"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Temporary Password *</label>
            <Input
              required
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Assigned Role</label>
            <select
              value={formData.roleCodes[0]}
              onChange={(e) => setFormData({ ...formData, roleCodes: [e.target.value] })}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="SUPER_ADMIN">Super Administrator (Unrestricted)</option>
              <option value="ADMIN">Operations Administrator</option>
              <option value="MANAGER">Inventory Manager</option>
              <option value="STAFF">Warehouse Staff</option>
              <option value="VIEWER">Read-Only Viewer</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
