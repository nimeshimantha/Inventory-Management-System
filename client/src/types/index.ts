export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  reorderLevel: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  totalStock: number;
  isLowStock: boolean;
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  images?: Array<{ id: string; url: string; isPrimary: boolean }>;
  variants?: Array<{ id: string; sku: string; name: string; costPrice?: number; sellingPrice?: number }>;
  stockBalances?: Array<{
    id: string;
    warehouseId: string;
    quantityOnHand: number;
    warehouse: { id: string; code: string; name: string };
  }>;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  productCount: number;
  parent?: { id: string; name: string } | null;
  children?: Array<{ id: string; name: string; slug: string }>;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  productCount: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  isDefault: boolean;
  isActive: boolean;
  stockBalances?: Array<{
    quantityOnHand: number;
    product: { id: string; name: string; sku: string; costPrice: number };
  }>;
}

export interface StockBalance {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  category?: string;
  quantityOnHand: number;
  allocatedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  inventoryValuation: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  productId: string;
  type: string;
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: string | null;
  reason?: string | null;
  createdAt: string;
  warehouse: { code: string; name: string };
  product: { sku: string; name: string; unit: string };
  user?: { firstName: string; lastName: string; email: string } | null;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: 'DRAFT' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  sourceWarehouse: { id: string; code: string; name: string };
  destinationWarehouse: { id: string; code: string; name: string };
  createdBy?: { firstName: string; lastName: string } | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    receivedQuantity: number;
    product: { id: string; sku: string; name: string; unit: string };
  }>;
}

export interface Supplier {
  id: string;
  code: string;
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
  paymentTerms?: string | null;
  isActive: boolean;
  totalOrdersCount: number;
  totalPurchasesAmount: number;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  city?: string | null;
  creditLimit: number;
  outstandingBalance: number;
  isActive: boolean;
  totalOrdersCount: number;
  totalSalesAmount: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  warehouseId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  notes?: string | null;
  orderedAt?: string | null;
  expectedAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  supplier: { id: string; code: string; companyName: string };
  warehouse: { id: string; code: string; name: string };
  createdBy?: { firstName: string; lastName: string } | null;
  approvedBy?: { firstName: string; lastName: string } | null;
  items?: Array<{
    id: string;
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitCost: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    product: { sku: string; name: string; unit: string };
  }>;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  notes?: string | null;
  fulfilledAt?: string | null;
  createdAt: string;
  customer: { id: string; code: string; name: string; email?: string; phone?: string; company?: string | null };
  warehouse: { id: string; code: string; name: string };
  createdBy?: { firstName: string; lastName: string } | null;
  items?: Array<{
    id: string;
    productId: string;
    orderedQuantity: number;
    fulfilledQuantity: number;
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    product: { sku: string; name: string; unit: string };
  }>;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    dueDate: string;
    status: string;
    grandTotal: number;
    paidAmount: number;
    payments?: Array<{
      id: string;
      paymentNumber: string;
      amount: number;
      paymentMethod: string;
      paymentDate: string;
    }>;
  }>;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  businessLogoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  taxRateDefault: number;
  invoicePrefix: string;
  purchaseOrderPrefix: string;
  salesOrderPrefix: string;
  transferPrefix: string;
  adjustmentPrefix: string;
  lowStockDefaultThreshold: number;
  allowNegativeStock: boolean;
  costingMethod: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}
