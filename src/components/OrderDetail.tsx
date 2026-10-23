import { X, User, CreditCard, Calendar, Package, Receipt } from 'lucide-react';
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
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  sale_type: 'store' | 'online';
  created_at: string;
  items: OrderItem[];
  slip_number: string | null;
  cashier_name: string | null;
}

interface OrderDetailProps {
  order: Order;
  onClose: () => void;
}

export default function OrderDetail({ order, onClose }: OrderDetailProps) {
  const { formatCurrency, storeProfile } = useStore();

  const getStatusBadge = (status: string, payment_status: string) => {
    if (payment_status === 'refunded') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wider">Refunded</span>;
    }
    if (status === 'cancelled' || payment_status === 'failed') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">Voided</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wider">Completed</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const timezone = storeProfile?.timezone || 'UTC';
    return date.toLocaleString('en-US', { 
      dateStyle: 'full', 
      timeStyle: 'medium',
      timeZone: timezone 
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Order #{88000 + order.id}</h2>
              {getStatusBadge(order.status, order.payment_status)}
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(order.created_at)}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Customer & Payment Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                Customer Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-medium text-slate-900">{order.customer_profile_name || order.customer_name || 'Guest Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span className="font-medium text-slate-900">{order.cashier_name || 'System'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sale Type:</span>
                  <span className="font-medium text-slate-900 capitalize">{order.sale_type}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Payment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-medium text-slate-900 capitalize">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-medium capitalize ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {order.payment_status}
                  </span>
                </div>
                {order.slip_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Slip #:</span>
                    <span className="font-medium text-slate-900 font-mono">{order.slip_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Order Items
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.total_amount + order.discount_amount - order.tax_amount)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Total Amount</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
