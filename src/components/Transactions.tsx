import { useEffect, useState } from 'react';
import { Search, Download, ChevronDown, CheckCircle2, XCircle, CreditCard, Banknote, SplitSquareHorizontal, ChevronLeft, ChevronRight, RotateCcw, Eye, FileSpreadsheet, Check, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { useStore } from '../StoreContext';
import OrderDetail from './OrderDetail';

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
  sale_type: 'store' | 'online' | 'delivery';
  created_at: string;
  items: OrderItem[];
  slip_number: string | null;
  cashier_name: string | null;
  branch?: string | null;
}

export default function Transactions() {
  const { formatCurrency, storeProfile, lang } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [paymentMethod, setPaymentMethod] = useState('All Methods');
  const [register, setRegister] = useState('All Registers');
  const [cashier, setCashier] = useState('All Staff');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [resalable, setResalable] = useState(true);

  // CSV Export states
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      `TX-${88000 + o.id}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.slip_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_profile_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.items || []).some(item => (item.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPayment = paymentMethod === 'All Methods' || o.payment_method.toLowerCase() === paymentMethod.toLowerCase();
    const matchesCashier = cashier === 'All Staff' || (o.cashier_name || 'System') === cashier;
    
    let matchesDate = true;
    if (o.created_at) {
      const orderDate = new Date(o.created_at);
      const now = new Date();
      if (dateRange === 'Today') {
        matchesDate = orderDate.toDateString() === now.toDateString();
      } else if (dateRange === 'Last 7 Days') {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        matchesDate = orderDate >= past7;
      } else if (dateRange === 'Last 30 Days') {
        const past30 = new Date();
        past30.setDate(now.getDate() - 30);
        matchesDate = orderDate >= past30;
      } else if (dateRange === 'This Year') {
        matchesDate = orderDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesPayment && matchesCashier && matchesDate;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-slate-400" />;
      case 'split':
        return <SplitSquareHorizontal className="w-4 h-4 text-slate-400" />;
      default:
        return <CreditCard className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string, payment_status: string) => {
    if (payment_status === 'refunded') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wider">Refunded</span>;
    }
    if (status === 'cancelled' || payment_status === 'failed') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">Voided</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wider">Completed</span>;
  };

  // Export transactions list to CSV for external accounting
  const handleExportCSV = (type: 'summary' | 'detailed' = 'summary') => {
    if (filteredOrders.length === 0) {
      alert('ထုတ်ယူရန် အရောင်းပြေစာ (Transactions) မရှိသေးပါ / No transactions found to export.');
      return;
    }

    const timezone = storeProfile?.timezone || 'UTC';
    const currency = storeProfile?.currency || 'MMK';
    const timestampStr = new Date().toISOString().split('T')[0];

    let csvData: any[] = [];
    let filename = '';

    if (type === 'summary') {
      filename = `sales_transactions_${timestampStr}.csv`;
      csvData = filteredOrders.map(o => {
        const dateObj = new Date(o.created_at);
        const formattedDate = dateObj.toLocaleDateString('en-US', { timeZone: timezone });
        const formattedTime = dateObj.toLocaleTimeString('en-US', { timeZone: timezone });
        const totalItemsQty = (o.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const itemsSummary = (o.items || []).map(i => `${i.product_name} x ${i.quantity} ${i.unit || 'pc'}`).join('; ');

        return {
          'Slip / Voucher No': o.slip_number || `SLP-${o.id.toString().padStart(6, '0')}`,
          'Transaction ID': `TX-${88000 + o.id}`,
          'Date': formattedDate,
          'Time': formattedTime,
          'Branch': (o as any).branch || storeProfile?.name || 'ရတနာ (မော်လမြိုင်)',
          'Customer Name': o.customer_profile_name || o.customer_name || 'Guest',
          'Cashier / Staff': o.cashier_name || 'System',
          'Sale Type': (o.sale_type || 'store').toUpperCase(),
          'Items Count': (o.items || []).length,
          'Total Qty Sold': totalItemsQty,
          'Items Summary': itemsSummary,
          'Subtotal Amount': Number(o.total_amount + (o.discount_amount || 0) - (o.tax_amount || 0)).toFixed(2),
          'Discount Amount': Number(o.discount_amount || 0).toFixed(2),
          'Tax Amount': Number(o.tax_amount || 0).toFixed(2),
          'Net Total Amount': Number(o.total_amount || 0).toFixed(2),
          'Currency': currency,
          'Payment Method': (o.payment_method || 'cash').toUpperCase(),
          'Payment Status': (o.payment_status || 'paid').toUpperCase(),
          'Transaction Status': (o.payment_status === 'refunded' ? 'REFUNDED' : o.status === 'cancelled' ? 'VOIDED' : 'COMPLETED')
        };
      });
    } else {
      // Detailed itemized CSV for external accounting ledgers (ERP, QuickBooks, Xero)
      filename = `sales_transactions_itemized_${timestampStr}.csv`;
      filteredOrders.forEach(o => {
        const dateObj = new Date(o.created_at);
        const formattedDate = dateObj.toLocaleDateString('en-US', { timeZone: timezone });
        const formattedTime = dateObj.toLocaleTimeString('en-US', { timeZone: timezone });

        if (!o.items || o.items.length === 0) {
          csvData.push({
            'Slip / Voucher No': o.slip_number || `SLP-${o.id.toString().padStart(6, '0')}`,
            'Transaction ID': `TX-${88000 + o.id}`,
            'Date': formattedDate,
            'Time': formattedTime,
            'Branch': (o as any).branch || storeProfile?.name || 'ရတနာ (မော်လမြိုင်)',
            'Customer Name': o.customer_profile_name || o.customer_name || 'Guest',
            'Cashier / Staff': o.cashier_name || 'System',
            'Product Name': 'General Sale',
            'Quantity': 1,
            'Unit': 'pc',
            'Unit Price': Number(o.total_amount || 0).toFixed(2),
            'Line Total Amount': Number(o.total_amount || 0).toFixed(2),
            'Currency': currency,
            'Payment Method': (o.payment_method || 'cash').toUpperCase(),
            'Payment Status': (o.payment_status || 'paid').toUpperCase(),
            'Transaction Status': (o.payment_status === 'refunded' ? 'REFUNDED' : o.status === 'cancelled' ? 'VOIDED' : 'COMPLETED')
          });
        } else {
          o.items.forEach(item => {
            csvData.push({
              'Slip / Voucher No': o.slip_number || `SLP-${o.id.toString().padStart(6, '0')}`,
              'Transaction ID': `TX-${88000 + o.id}`,
              'Date': formattedDate,
              'Time': formattedTime,
              'Branch': (o as any).branch || storeProfile?.name || 'ရတနာ (မော်လမြိုင်)',
              'Customer Name': o.customer_profile_name || o.customer_name || 'Guest',
              'Cashier / Staff': o.cashier_name || 'System',
              'Product Name': item.product_name,
              'Quantity': item.quantity,
              'Unit': item.unit || 'pc',
              'Unit Price': Number(item.price || 0).toFixed(2),
              'Line Total Amount': (Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2),
              'Currency': currency,
              'Payment Method': (o.payment_method || 'cash').toUpperCase(),
              'Payment Status': (o.payment_status || 'paid').toUpperCase(),
              'Transaction Status': (o.payment_status === 'refunded' ? 'REFUNDED' : o.status === 'cancelled' ? 'VOIDED' : 'COMPLETED')
            });
          });
        }
      });
    }

    const csvContent = Papa.unparse(csvData, {
      quotes: true,
      header: true
    });

    // Prepend UTF-8 BOM (\uFEFF) so Excel and external accounting software render Burmese & UTF-8 text perfectly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportMenu(false);
    setExportNotice(`Exported ${filteredOrders.length} transactions to CSV (${type === 'summary' ? 'Summary' : 'Itemized'})!`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const clearFilters = () => {
    setDateRange('Last 30 Days');
    setPaymentMethod('All Methods');
    setRegister('All Registers');
    setCashier('All Staff');
    setSearchQuery('');
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const timezone = storeProfile?.timezone || 'UTC';
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: timezone });
    const day = date.toLocaleString('en-US', { day: 'numeric', timeZone: timezone });
    const year = date.toLocaleString('en-US', { year: 'numeric', timeZone: timezone });
    const time = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone });
    return (
      <div className="text-sm text-slate-600">
        <div>{month} {day},</div>
        <div>{year} -</div>
        <div>{time}</div>
      </div>
    );
  };

  const handleRefund = () => {
    if (!selectedOrder) return;
    
    fetch(`/api/orders/${selectedOrder.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: refundReason, resalable })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          fetchOrders();
          setShowRefundModal(false);
          setSelectedOrder(null);
          setRefundReason('');
        }
      });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col bg-white">
      {/* Toast Notification */}
      {exportNotice && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-emerald-500 hover:text-emerald-700">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transaction History</h2>
          <p className="text-xs text-slate-500 mt-1">Manage and audit all store sales transactions.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-1 max-w-xl sm:ml-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Slip No, Customer, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Export Dropdown for External Accounting */}
          <div className="relative">
            <div className="flex items-center rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700 transition-colors">
              <button
                onClick={() => handleExportCSV('summary')}
                title="Export filtered transactions to CSV"
                className="flex items-center gap-2 px-3.5 py-2 text-white text-sm font-semibold border-r border-indigo-500/80"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2 py-2 text-white hover:bg-indigo-700 rounded-r-xl transition-colors"
                title="More accounting export options"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Accounting Export Dropdown Options */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 py-2 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Export for Accounting</span>
                </div>
                
                <button
                  onClick={() => handleExportCSV('summary')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 transition-colors flex items-start gap-2.5 group"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">
                      Summary Transactions CSV
                    </span>
                    <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                      One row per voucher with subtotal, tax, net total, and payment method. Ideal for General Ledger.
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleExportCSV('detailed')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 transition-colors flex items-start gap-2.5 group border-t border-slate-100"
                >
                  <FileText className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-emerald-600">
                      Itemized Accounting CSV
                    </span>
                    <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                      Line-by-line product items sold. Ideal for COGS calculation and inventory reconciliation in ERPs.
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none w-40 pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Year</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
          <div className="relative">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="appearance-none w-40 pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option>All Methods</option>
              {Array.from(new Set(orders.map(o => o.payment_method))).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Register/Station</label>
          <div className="relative">
            <select
              value={register}
              onChange={(e) => setRegister(e.target.value)}
              className="appearance-none w-40 pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option>All Registers</option>
              <option>Register 1</option>
              <option>Register 2</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cashier</label>
          <div className="relative">
            <select
              value={cashier}
              onChange={(e) => setCashier(e.target.value)}
              className="appearance-none w-40 pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option>All Staff</option>
              {Array.from(new Set(orders.map(o => o.cashier_name || 'System'))).map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <button
          onClick={clearFilters}
          className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-2"
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading transactions...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Transaction ID</th>
                <th className="pb-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Timestamp</th>
                <th className="pb-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="pb-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Customer</th>
                <th className="pb-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Payment</th>
                <th className="pb-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Status</th>
                <th className="pb-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-6 px-4">
                    <span className="text-sm font-bold text-indigo-600">TX-{88000 + order.id}</span>
                  </td>
                  <td className="py-6 px-4">
                    {formatTimestamp(order.created_at)}
                  </td>
                  <td className="py-6 px-4">
                    <div className="text-sm font-bold text-slate-900">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
                      {order.items.map(i => i.product_name).join(', ')}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className={`text-sm font-bold ${order.customer_profile_name || order.customer_name ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                      {order.customer_profile_name || order.customer_name || 'Guest'}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 capitalize">
                      {getPaymentIcon(order.payment_method)}
                      {order.payment_method}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    {getStatusBadge(order.status, order.payment_status)}
                  </td>
                  <td className="py-6 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedDetailOrder(order)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {order.payment_status !== 'refunded' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowRefundModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Refund"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredOrders.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{currentPage} of {totalPages} pages</span>
            <span className="w-px h-4 bg-slate-300"></span>
            <span>{filteredOrders.length} total records</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                      currentPage === pageNum
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-slate-400 px-1">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center text-slate-600 hover:bg-slate-50 border border-transparent transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Process Refund</h3>
              <p className="text-sm text-slate-500 mt-1">Order TX-{88000 + selectedOrder.id}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-sm text-amber-800">
                  Refunding this order will mark it as <strong>Voided/Refunded</strong>.
                  {selectedOrder.payment_method === 'cash' && " A pay-out will be recorded in the cash drawer."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Reason for Refund</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="e.g. Defective item, Customer changed mind..."
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  id="resalable"
                  checked={resalable}
                  onChange={(e) => setResalable(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="resalable" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Items are resalable (restock inventory)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                >
                  Confirm Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedDetailOrder && (
        <OrderDetail 
          order={selectedDetailOrder} 
          onClose={() => setSelectedDetailOrder(null)} 
        />
      )}
    </div>
  );
}
