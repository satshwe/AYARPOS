import { useEffect, useState } from 'react';
import { Search, Package, CreditCard, ChevronDown, CheckCircle2, Clock, XCircle, Truck, Eye, X } from 'lucide-react';
import { useStore } from '../StoreContext';

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  unit: string;
}

interface Order {
  id: number;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  customer_name: string | null;
  customer_profile_name: string | null;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled' | 'completed';
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed';
  sale_type: 'store' | 'online';
  created_at: string;
  items: OrderItem[];
  slip_number: string | null;
  cashier_name: string | null;
}

export default function Orders() {
  const { formatCurrency, storeProfile } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = () => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  };

  const updateOrderStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status', error);
    }
  };

  const updatePaymentStatus = async (id: number, payment_status: string) => {
    try {
      await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status }),
      });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update payment status', error);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.id.toString().includes(searchQuery) ||
      (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_profile_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getSaleTypeBadge = (type: string) => {
    if (type === 'online') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">Online</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">Store</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'fulfilled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Truck className="w-3 h-3" /> Processing</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> Pending</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Failed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse text-slate-400">Loading orders...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Order Management</h2>
          <p className="text-slate-500 mt-1">Track and update customer orders and payments.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-8">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No orders found matching your criteria.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Order Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Order ID</span>
                    <span className="font-bold text-slate-900">{order.slip_number || `#${order.id}`}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Date</span>
                    <span className="text-sm font-medium text-slate-700">
                      {new Date(order.created_at).toLocaleDateString('en-US', { timeZone: storeProfile?.timezone || 'UTC' })} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: storeProfile?.timezone || 'UTC' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Customer</span>
                    <span className="text-sm font-medium text-slate-700">
                      {order.customer_profile_name || order.customer_name || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Total</span>
                    <span className="text-sm font-bold text-indigo-600">{formatCurrency(order.total_amount)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Type</span>
                    {getSaleTypeBadge(order.sale_type)}
                  </div>
                  <div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Fulfillment</span>
                    <div className="relative group">
                      <button className="flex items-center gap-1">
                        {getStatusBadge(order.status)}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                        <button onClick={() => updateOrderStatus(order.id, 'pending')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">Pending</button>
                        <button onClick={() => updateOrderStatus(order.id, 'processing')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">Processing</button>
                        <button onClick={() => updateOrderStatus(order.id, 'completed')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">Fulfilled</button>
                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 text-rose-600">Cancelled</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Payment</span>
                    <div className="relative group">
                      <button className="flex items-center gap-1">
                        {getPaymentBadge(order.payment_status)}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                        <button onClick={() => updatePaymentStatus(order.id, 'pending')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">Pending</button>
                        <button onClick={() => updatePaymentStatus(order.id, 'paid')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">Paid</button>
                        <button onClick={() => updatePaymentStatus(order.id, 'failed')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 text-rose-600">Failed</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-6">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 border-b border-slate-100 pb-2 flex justify-between">
                  <span>Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})</span>
                  <span className="text-right">Line Total</span>
                </div>
                <ul className="space-y-3">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-medium text-slate-900 block">
                            {item.product_name}
                          </span>
                          <span className="text-slate-500 text-xs mt-0.5 block">
                            {item.quantity} {item.unit || 'pc'} @ {formatCurrency(item.price)}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-700 font-medium">{formatCurrency(item.quantity * item.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CreditCard className="w-4 h-4" />
                    Payment Method: <span className="font-medium text-slate-700 capitalize">{order.payment_method}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Transaction Details</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedOrder.slip_number || `Order #${selectedOrder.id}`}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Date & Time</span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(selectedOrder.created_at).toLocaleString('en-US', { timeZone: storeProfile?.timezone || 'UTC' })}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Customer</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedOrder.customer_profile_name || selectedOrder.customer_name || 'Walk-in Customer'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Cashier</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedOrder.cashier_name || 'System'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Sale Type</span>
                  <div className="mt-1">{getSaleTypeBadge(selectedOrder.sale_type)}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-medium text-slate-900 block">
                            {item.product_name}
                          </span>
                          <span className="text-slate-500 text-xs mt-0.5 block">
                            {item.quantity} {item.unit || 'pc'} × {formatCurrency(item.price)}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-900 font-medium">{formatCurrency(item.quantity * item.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.total_amount - (selectedOrder.tax_amount || 0) + (selectedOrder.discount_amount || 0))}</span>
                </div>
                {(selectedOrder.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-rose-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedOrder.discount_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>{formatCurrency(selectedOrder.tax_amount || 0)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Grand Total</span>
                  <span className="text-xl font-bold text-indigo-600">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Payment Method</span>
                    <span className="font-medium text-slate-900 capitalize">{selectedOrder.payment_method}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Payment Status</span>
                  {getPaymentBadge(selectedOrder.payment_status)}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
