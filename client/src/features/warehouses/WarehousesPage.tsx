import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Warehouse } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { Modal } from '../../components/ui/modal.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { Plus, Warehouse as WarehouseIcon, MapPin, Mail, Phone, UserCheck, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export function WarehousesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    contactName: '',
    phone: '',
    email: '',
    isDefault: false,
  });

  const [editFormData, setEditFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    contactName: '',
    phone: '',
    email: '',
    isDefault: false,
    isActive: true,
  });

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await api.get('/warehouses');
      return res.data.data as Warehouse[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/warehouses', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse facility registered in PostgreSQL');
      setShowCreateModal(false);
      setFormData({
        code: '',
        name: '',
        address: '',
        city: '',
        state: '',
        contactName: '',
        phone: '',
        email: '',
        isDefault: false,
      });
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to register warehouse');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string } & typeof editFormData) => {
      const { id, ...body } = payload;
      const res = await api.put(`/warehouses/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse details updated in PostgreSQL');
      setEditingWarehouse(null);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to update warehouse');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    updateMutation.mutate({
      id: editingWarehouse.id,
      ...editFormData,
    });
  };

  const startEdit = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setEditFormData({
      code: wh.code,
      name: wh.name,
      address: wh.address || '',
      city: wh.city || '',
      state: wh.state || '',
      contactName: wh.contactName || '',
      phone: wh.phone || '',
      email: wh.email || '',
      isDefault: wh.isDefault || false,
      isActive: wh.isActive,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Fulfillment Centers"
        description="Multi-facility inventory storage, address routing, and operational status."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Warehouse
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !warehouses || warehouses.length === 0 ? (
        <EmptyState
          title="No warehouses found"
          description="Register a warehouse facility to start tracking inventory by location."
          actionText="Add Warehouse"
          onAction={() => setShowCreateModal(true)}
          icon={<WarehouseIcon className="h-7 w-7" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
            <Card key={wh.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {wh.code}
                  </Badge>
                  <div className="flex items-center space-x-1.5">
                    {wh.isDefault && (
                      <Badge variant="info" className="text-[10px]">
                        Default Hub
                      </Badge>
                    )}
                    <Badge variant={wh.isActive ? 'success' : 'secondary'}>
                      {wh.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      onClick={() => startEdit(wh)}
                      className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ml-1"
                      title="Edit warehouse"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <CardTitle className="text-base font-bold mt-2 flex items-center">
                  <WarehouseIcon className="h-4 w-4 mr-2 text-primary" />
                  {wh.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs text-muted-foreground pt-0">
                {wh.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">
                      {wh.address}, {wh.city} {wh.state}
                    </span>
                  </div>
                )}
                {wh.contactName && (
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>Manager: {wh.contactName}</span>
                  </div>
                )}
                {wh.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{wh.email}</span>
                  </div>
                )}
                {wh.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{wh.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register Warehouse"
        description="Add a new logistics facility or distribution hub."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Facility Code *</label>
              <Input
                required
                placeholder="e.g. WH-SOUTH"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Facility Name *</label>
              <Input
                required
                placeholder="e.g. Austin Regional Hub"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Street Address</label>
              <Input
                placeholder="100 Logistics Blvd"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">City</label>
              <Input
                placeholder="Austin"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">State</label>
              <Input
                placeholder="TX"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Person</label>
              <Input
                placeholder="Warehouse Lead"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone</label>
              <Input
                placeholder="+1 512-555-0100"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="austin@stockflow.dev"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded border-input text-primary focus:ring-ring h-4 w-4"
            />
            <label htmlFor="isDefault" className="text-xs font-medium text-foreground">
              Set as primary default warehouse for incoming orders
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Register Warehouse
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingWarehouse}
        onClose={() => setEditingWarehouse(null)}
        title="Edit Warehouse"
        description="Update logistics facility details and active status."
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Facility Code *</label>
              <Input
                required
                placeholder="e.g. WH-SOUTH"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Facility Name *</label>
              <Input
                required
                placeholder="e.g. Austin Regional Hub"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Street Address</label>
              <Input
                placeholder="100 Logistics Blvd"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">City</label>
              <Input
                placeholder="Austin"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">State</label>
              <Input
                placeholder="TX"
                value={editFormData.state}
                onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Person</label>
              <Input
                placeholder="Warehouse Lead"
                value={editFormData.contactName}
                onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone</label>
              <Input
                placeholder="+1 512-555-0100"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="austin@stockflow.dev"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsDefault"
                checked={editFormData.isDefault}
                onChange={(e) => setEditFormData({ ...editFormData, isDefault: e.target.checked })}
                className="rounded border-input text-primary focus:ring-ring h-4 w-4"
              />
              <label htmlFor="editIsDefault" className="text-xs font-medium text-foreground">
                Default Hub
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="rounded border-input text-primary focus:ring-ring h-4 w-4"
              />
              <label htmlFor="editIsActive" className="text-xs font-medium text-foreground">
                Active Facility
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditingWarehouse(null)}>
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
