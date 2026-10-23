export interface StoreProfile {
  id: number;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  logo_url?: string;
  tagline?: string;
  tax_id?: string;
  receipt_footer?: string;
  updated_at: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
}

export interface ReceiptData {
  slipNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  taxAmount: number;
  taxRate?: number;
  total: number;
  paymentMethod: string;
  saleType: string;
}


export interface Product {
  id: number;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  category: string;
  description?: string;
  image_url?: string;
  low_stock_threshold: number;
  unit?: string;
  expiration_date?: string;
  barcode?: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  cost_price: number;
  unit?: string;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  total_amount: number;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  notes?: string;
  created_at: string;
  received_at?: string;
  items?: PurchaseOrderItem[];
}

export interface SaleItem {
  product_id: number;
  quantity: number;
  price: number;
}

export interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  slip_number?: string;
  cashier_name?: string;
  customer_name?: string;
  payment_method?: string;
  items?: {
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    unit?: string;
  }[];
}

export interface SaleReturnItem {
  id: number;
  sale_return_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  refund_amount: number;
}

export interface SaleReturn {
  id: number;
  sale_id: number;
  slip_number?: string;
  customer_name?: string;
  total_refund: number;
  reason?: string;
  created_at: string;
  items?: SaleReturnItem[];
}

export interface DashboardStats {
  revenue: number;
  salesCount: number;
  lowStockCount: number;
  lowStockProducts?: Product[];
  expiringCount: number;
  expiringProducts?: Product[];
  profit: number;
  averageSale: number;
  recentSales: Sale[];
  salesByDay: { date: string; revenue: number; profit: number }[];
  todayRevenue: number;
  yesterdayRevenue: number;
  dailyComparison: number;
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  forecastedNextWeek: number;
  activeCustomersCount: number;
  totalInventoryItems: number;
  inventoryByCategory: { category: string; count: number }[];
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  payment_method?: string;
  description?: string;
  branch?: string;
  created_at: string;
}

export interface CustomerPayment {
  id: number;
  customer_id: number;
  sale_id?: number;
  amount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
}

export interface DashboardOverviewData {
  totalSales: number;
  salesCount: number;
  netFlow: number;
  receivables: number;
  totalExpenses: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  overdueCustomerCount: number;
  overdueCustomers: {
    sale_id: number;
    slip_number?: string;
    customer_name: string;
    customer_id?: number;
    total_amount: number;
    due_date?: string;
    created_at: string;
    phone?: string;
    address?: string;
    days_overdue: number;
  }[];
  overdueSupplierCount: number;
  overdueSuppliers: {
    po_id: number;
    supplier_id: number;
    total_amount: number;
    status: string;
    payment_status: string;
    due_date?: string;
    created_at: string;
    supplier_name: string;
    supplier_phone?: string;
  }[];
  pendingDeliveryCount: number;
  pendingDeliveries: {
    sale_id: number;
    slip_number?: string;
    customer_name: string;
    total_amount: number;
    delivery_status: string;
    delivery_address?: string;
    delivery_phone?: string;
    created_at: string;
    payment_method: string;
    payment_status: string;
  }[];
  recentExpenses: Expense[];
}

export interface ActivityItem {
  id: string;
  type: 'transaction' | 'inventory';
  title: string;
  subtitle?: string;
  amount?: number;
  quantity_change?: number;
  unit?: string;
  current_stock?: number;
  payment_method?: string;
  payment_status?: string;
  timestamp: string;
  status?: string;
  category?: string;
  customer_name?: string;
  slip_number?: string;
  reason?: string;
  sale_type?: string;
  cashier_name?: string;
}

