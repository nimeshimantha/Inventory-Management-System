import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Brand } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Card } from '../../components/ui/card.js';
import { Modal } from '../../components/ui/modal.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { Plus, Search, Trash2, Tag, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export function BrandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Edit State
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands', search],
    queryFn: async () => {
      const res = await api.get(`/brands${search ? `?search=${search}` : ''}`);
      return res.data.data as Brand[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const res = await api.post('/brands', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand created successfully');
      setShowCreateModal(false);
      setName('');
      setDescription('');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create brand');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; description?: string }) => {
      const { id, ...data } = payload;
      const res = await api.put(`/brands/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand updated successfully');
      setEditingBrand(null);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to update brand');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/brands/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand deleted successfully');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to delete brand');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createMutation.mutate({ name, description });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand || !editName) return;
    updateMutation.mutate({
      id: editingBrand.id,
      name: editName,
      description: editDescription,
    });
  };

  const startEdit = (b: Brand) => {
    setEditingBrand(b);
    setEditName(b.name);
    setEditDescription(b.description || '');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Management"
        description="Maintain manufacturer catalogue and branded product lines."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Brand
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
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
        ) : !brands || brands.length === 0 ? (
          <EmptyState
            title="No brands found"
            description="Register product manufacturers to sort and track inventory brands."
            actionText="Add Brand"
            onAction={() => setShowCreateModal(true)}
            icon={<Tag className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catalog Products</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="font-semibold text-foreground text-sm block">{b.name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{b.slug}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.description || '—'}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">
                    {b.productCount} SKUs
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => startEdit(b)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit brand"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete brand "${b.name}"?`)) {
                            deleteMutation.mutate(b.id);
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete brand"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
        title="Add New Brand"
        description="Register a manufacturer or branded product line."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Brand Name *</label>
            <Input
              required
              placeholder="e.g. Lenovo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <Input
              placeholder="Optional manufacturer details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Brand
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingBrand}
        onClose={() => setEditingBrand(null)}
        title="Edit Brand"
        description="Update manufacturer name and description."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Brand Name *</label>
            <Input
              required
              placeholder="Brand name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <Input
              placeholder="Optional manufacturer details"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditingBrand(null)}>
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
