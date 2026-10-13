import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { BusinessSettings } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { Save, Building2, Sliders, DollarSign, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    currencyCode: 'USD',
    currencySymbol: '$',
    timezone: 'UTC',
    taxRateDefault: 8.25,
    invoicePrefix: 'INV-',
    purchaseOrderPrefix: 'PO-',
    salesOrderPrefix: 'SO-',
    transferPrefix: 'TR-',
    adjustmentPrefix: 'ADJ-',
    lowStockDefaultThreshold: 10,
    allowNegativeStock: false,
    costingMethod: 'WEIGHTED_AVERAGE',
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.data as BusinessSettings;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        businessName: settings.businessName || '',
        email: settings.email || '',
        phone: settings.phone || '',
        address: settings.address || '',
        city: settings.city || '',
        country: settings.country || 'United States',
        currencyCode: settings.currencyCode || 'USD',
        currencySymbol: settings.currencySymbol || '$',
        timezone: settings.timezone || 'UTC',
        taxRateDefault: Number(settings.taxRateDefault) || 8.25,
        invoicePrefix: settings.invoicePrefix || 'INV-',
        purchaseOrderPrefix: settings.purchaseOrderPrefix || 'PO-',
        salesOrderPrefix: settings.salesOrderPrefix || 'SO-',
        transferPrefix: settings.transferPrefix || 'TR-',
        adjustmentPrefix: settings.adjustmentPrefix || 'ADJ-',
        lowStockDefaultThreshold: Number(settings.lowStockDefaultThreshold) || 10,
        allowNegativeStock: !!settings.allowNegativeStock,
        costingMethod: settings.costingMethod || 'WEIGHTED_AVERAGE',
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.put('/settings', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Business settings saved successfully');
    },
    onError: (err: unknown) => {
      // @ts-expect-error error handle
      toast.error(err.response?.data?.message || 'Failed to update settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Business & System Settings" description="Loading system configuration..." />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business & System Settings"
        description="Global company profile, currency formatting, invoice numbering sequences, and stock policies."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-primary" />
              Company Profile & Location
            </CardTitle>
            <CardDescription className="text-xs">
              Primary entity information printed on purchase orders and customer invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Organization Name *</label>
                <Input
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Official Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Headquarters City</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Country</label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency & Financial Standards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-primary" />
              Financial & Tax Configurations
            </CardTitle>
            <CardDescription className="text-xs">
              Monetary precision, default sales tax rate, and standard inventory costing method.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Currency Code</label>
                <Input
                  value={formData.currencyCode}
                  onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Currency Symbol</label>
                <Input
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Default Tax Rate (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.taxRateDefault}
                  onChange={(e) => setFormData({ ...formData, taxRateDefault: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Valuation Costing Method</label>
              <select
                value={formData.costingMethod}
                onChange={(e) => setFormData({ ...formData, costingMethod: e.target.value })}
                className="h-10 w-full sm:w-80 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="WEIGHTED_AVERAGE">Weighted Average Costing (WAC) — Standard</option>
                <option value="FIFO">First-In, First-Out (FIFO)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Document Numbering Prefixes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Sliders className="h-4 w-4 mr-2 text-primary" />
              Document Numbering Sequences
            </CardTitle>
            <CardDescription className="text-xs">
              Conventions for generating purchase orders, sales orders, invoices, and transfers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Purchase Orders</label>
                <Input
                  value={formData.purchaseOrderPrefix}
                  onChange={(e) => setFormData({ ...formData, purchaseOrderPrefix: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Sales Orders</label>
                <Input
                  value={formData.salesOrderPrefix}
                  onChange={(e) => setFormData({ ...formData, salesOrderPrefix: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Invoices</label>
                <Input
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Transfers</label>
                <Input
                  value={formData.transferPrefix}
                  onChange={(e) => setFormData({ ...formData, transferPrefix: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Negative Stock Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" />
              Inventory Integrity & Negative Stock Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Enforce transaction boundaries and prevent overselling below zero physical inventory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="allowNegative"
                checked={formData.allowNegativeStock}
                onChange={(e) => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <label htmlFor="allowNegative" className="text-xs font-medium text-foreground">
                Allow negative inventory during sales fulfillment (Default: Disabled for audit integrity)
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={updateMutation.isPending} className="shadow-md">
            <Save className="h-4 w-4 mr-1.5" />
            Save Configuration Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
