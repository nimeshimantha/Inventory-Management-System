import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Category } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Card } from '../../components/ui/card.js';
import { Modal } from '../../components/ui/modal.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { Plus, Search, Trash2, Layers, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');

  // Edit State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editParentId, setEditParentId] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', search],
    queryFn: async () => {
      const res = await api.get(`/categories${search ? `?search=${search}` : ''}`);
      return res.data.data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; parentId?: string }) => {
      const res = await api.post('/categories', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setParentId('');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; description?: string; parentId?: string }) => {
      const { id, ...data } = payload;
      const res = await api.put(`/categories/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
      setEditingCategory(null);
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to delete category');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createMutation.mutate({
      name,
      description,
      parentId: parentId || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName) return;
    updateMutation.mutate({
      id: editingCategory.id,
      name: editName,
      description: editDescription,
      parentId: editParentId || undefined,
    });
  };

  const startEdit = (c: Category) => {
    setEditingCategory(c);
    setEditName(c.name);
    setEditDescription(c.description || '');
    setEditParentId(c.parentId || '');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Categories"
        description="Organize your product catalogue with hierarchical taxonomy and parent groups."
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Category
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
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
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            title="No categories found."
            description="Create your first category to get started."
            actionText="Add Category"
            onAction={() => setShowCreateModal(true)}
            icon={<Layers className="h-7 w-7" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Assigned Products</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-foreground text-sm block">{c.name}</span>
                      {c.description && <span className="text-xs text-muted-foreground">{c.description}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-xs text-foreground">
                    {c.parent ? c.parent.name : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">
                    {c.productCount} SKUs
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete category "${c.name}"?`)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete category"
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
        title="Create Category"
        description="Add a new catalog category or subcategory."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Category Name *</label>
            <Input
              required
              placeholder="e.g. Storage & Networking"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Parent Category (Optional)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None (Top-Level Category)</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <Input
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title="Edit Category"
        description="Update category details and taxonomy."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Category Name *</label>
            <Input
              required
              placeholder="Category name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Parent Category</label>
            <select
              value={editParentId}
              onChange={(e) => setEditParentId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None (Top-Level Category)</option>
              {categories
                ?.filter((cat) => cat.id !== editingCategory?.id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <Input
              placeholder="Optional description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
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
