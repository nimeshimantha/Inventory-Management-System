import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { AuditLogItem } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { Button } from '../../components/ui/button.js';
import { formatDateTime } from '../../lib/utils.js';
import { ShieldAlert, ChevronLeft, ChevronRight, User } from 'lucide-react';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityType, action],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (entityType) params.append('entityType', entityType);
      if (action) params.append('action', action);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Operational Audit Logs"
        description="Immutable chronological record of business events, security mutations, and inventory adjustments."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Entities</option>
            <option value="AUTH">Authentication / Security</option>
            <option value="PRODUCT">Products</option>
            <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
            <option value="STOCK_TRANSFER">Stock Transfer</option>
            <option value="PURCHASE_ORDER">Purchase Orders</option>
            <option value="GOODS_RECEIPT">Goods Receipts</option>
            <option value="SALES_ORDER">Sales Orders</option>
            <option value="PAYMENT">Payments</option>
            <option value="USER">User Accounts</option>
          </select>

          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="PRODUCT_CREATED">Product Created</option>
            <option value="STOCK_ADJUSTED">Stock Adjusted</option>
            <option value="GOODS_RECEIVED">Goods Received</option>
            <option value="SALES_ORDER_FULFILLED">Order Fulfilled</option>
            <option value="PAYMENT_RECORDED">Payment Recorded</option>
          </select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !auditData?.data || auditData.data.length === 0 ? (
          <EmptyState
            title="No audit events found"
            description="System operations and security events will be appended to this immutable audit ledger."
            icon={<ShieldAlert className="h-7 w-7" />}
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details / Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditData.data.map((log: AuditLogItem) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1.5 text-xs font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System Agent'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-primary font-mono">
                      {log.entityType} {log.entityId ? `(${log.entityId.slice(0, 8)})` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-sm truncate font-mono text-[11px]">
                      {log.details || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {auditData.meta && auditData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {auditData.meta.page} of {auditData.meta.totalPages} ({auditData.meta.total} events)
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= auditData.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
