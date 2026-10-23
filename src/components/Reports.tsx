import { useEffect, useState } from 'react';
import { BarChart3, Calendar, Package, Users, Download, ClipboardList, DollarSign, Archive, LineChart, ShieldCheck, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useStore } from '../StoreContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportTab = 'sales' | 'audit' | 'management';
type SalesReportType = 'date' | 'product' | 'customer' | 'inventory' | 'transactions' | 'cash';
type AuditReportType = 'stock_adjustments' | 'voids_refunds' | 'cash_movements' | 'returns';

interface ReportData {
  label: string;
  orders: number;
  revenue: number;
  quantity?: number;
  cost?: number;
  date?: string;
  payment_method?: string;
  status?: string;
  cashier_name?: string;
}

export default function Reports() {
  const { formatCurrency, storeProfile } = useStore();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  
  // Sales Report State
  const [salesReportType, setSalesReportType] = useState<SalesReportType>('date');
  const [salesData, setSalesData] = useState<ReportData[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [cashier, setCashier] = useState<string>('all');
  const [cashiersList, setCashiersList] = useState<any[]>([]);
  
  // Audit Report State
  const [auditReportType, setAuditReportType] = useState<AuditReportType>('stock_adjustments');
  const [auditData, setAuditData] = useState<any[]>([]);

  // Management Report State
  const [managementData, setManagementData] = useState<any>(null);
  const [managementView, setManagementView] = useState<'overview' | 'top100' | 'noSale'>('overview');

  const [loading, setLoading] = useState(true);

  // Helper to get date range
  const getDateRange = () => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    if (timeRange === 'today') {
      startDate = formatDate(now);
      endDate = formatDate(now);
    } else if (timeRange === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startDate = formatDate(startOfWeek);
      endDate = formatDate(now);
    } else if (timeRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = formatDate(startOfMonth);
      endDate = formatDate(now);
    } else if (timeRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      startDate = formatDate(startOfYear);
      endDate = formatDate(now);
    }
    
    return { startDate, endDate };
  };

  // Fetch Users for Cashier Filter
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setCashiersList(data))
      .catch(err => console.error('Failed to fetch users', err));
  }, []);

  // Fetch Sales Data
  useEffect(() => {
    if (activeTab === 'sales') {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      let url = `/api/reports/sales?groupBy=${salesReportType}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (paymentMethod !== 'all') url += `&paymentMethod=${paymentMethod}`;
      if (cashier !== 'all') url += `&cashier=${cashier}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          setSalesData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch sales report', err);
          setLoading(false);
        });
    }
  }, [activeTab, salesReportType, timeRange, paymentMethod, cashier]);

  // Fetch Audit Data
  useEffect(() => {
    if (activeTab === 'audit') {
      setLoading(true);
      fetch(`/api/reports/audit?type=${auditReportType}`)
        .then((res) => res.json())
        .then((data) => {
          setAuditData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch audit report', err);
          setLoading(false);
        });
    }
  }, [activeTab, auditReportType]);

  // Fetch Management Data
  useEffect(() => {
    if (activeTab === 'management') {
      setLoading(true);
      fetch(`/api/reports/management`)
        .then((res) => res.json())
        .then((data) => {
          setManagementData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch management report', err);
          setLoading(false);
        });
    }
  }, [activeTab]);

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = 'report.csv';

    if (activeTab === 'sales') {
      filename = `sales_report_${salesReportType}_${new Date().toISOString().split('T')[0]}.csv`;
      if (salesReportType === 'transactions') {
        headers = ['Label', 'Date', 'Payment', 'Cashier', 'Orders/Qty', 'Revenue'];
        rows = salesData.map(item => [
          item.label,
          item.date ? new Date(item.date).toLocaleString() : '-',
          item.payment_method?.replace('_', ' ') || '-',
          item.cashier_name || 'System',
          item.orders,
          item.revenue
        ]);
      } else {
        headers = ['Label', 'Orders/Qty', 'Revenue'];
        rows = salesData.map(item => [
          item.label,
          salesReportType === 'product' || salesReportType === 'inventory' ? item.quantity : item.orders,
          item.revenue
        ]);
      }
    } else if (activeTab === 'audit') {
      filename = `audit_report_${auditReportType}_${new Date().toISOString().split('T')[0]}.csv`;
      if (auditReportType === 'stock_adjustments') {
        headers = ['Date', 'Product', 'Change', 'Reason'];
        rows = auditData.map(item => [
          new Date(item.created_at).toLocaleString(),
          item.product_name,
          item.quantity_change,
          item.reason
        ]);
      } else if (auditReportType === 'voids_refunds') {
        headers = ['Sale ID', 'Customer', 'Status', 'Amount'];
        rows = auditData.map(item => [
          item.id,
          item.customer_name || 'Guest',
          item.status,
          item.total_amount
        ]);
      } else if (auditReportType === 'returns') {
        headers = ['Return ID', 'Sale Slip', 'Reason', 'Refund Amount'];
        rows = auditData.map(item => [
          item.id,
          item.slip_number,
          item.reason,
          item.total_refund
        ]);
      } else if (auditReportType === 'cash_movements') {
        headers = ['Type', 'Description', 'Amount'];
        rows = auditData.map(item => [
          item.type,
          item.description,
          item.amount
        ]);
      }
    } else if (activeTab === 'management') {
      if (!managementData) return;
      filename = `management_report_${managementView}_${new Date().toISOString().split('T')[0]}.csv`;
      if (managementView === 'top100') {
        headers = ['Rank', 'Product Name', 'Category', 'Qty Sold', 'Total Revenue'];
        rows = managementData.top100Items?.map((item: any, idx: number) => [
          idx + 1,
          item.name,
          item.category,
          item.total_sold,
          item.revenue
        ]) || [];
      } else if (managementView === 'noSale') {
        headers = ['Product Name', 'Category', 'Current Stock', 'Retail Price', 'Potential Revenue'];
        rows = managementData.noSaleItems?.map((item: any) => [
          item.name,
          item.category,
          item.stock,
          item.price,
          item.stock * item.price
        ]) || [];
      } else {
        // Overview export
        if (managementData.profitLoss && managementData.inventoryValuation) {
          headers = ['Metric', 'Value'];
          rows = [
            ['Total Revenue', managementData.profitLoss.total_revenue],
            ['Total COGS', managementData.profitLoss.total_cogs],
            ['Gross Profit', managementData.profitLoss.gross_profit],
            ['Inventory Retail Value', managementData.inventoryValuation.total_retail_value],
            ['Inventory Cost Value', managementData.inventoryValuation.total_cost_value],
            ['Total Inventory Items', managementData.inventoryValuation.total_items]
          ];
        }
      }
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report`;
    const subtitle = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(subtitle, 14, 30);

    let head: any[] = [];
    let body: any[] = [];

    if (activeTab === 'sales') {
      if (salesReportType === 'transactions') {
        head = [['Label', 'Date', 'Payment', 'Cashier', 'Orders/Qty', 'Revenue']];
        body = salesData.map(item => [
          item.label,
          item.date ? new Date(item.date).toLocaleString() : '-',
          item.payment_method?.replace('_', ' ') || '-',
          item.cashier_name || 'System',
          item.orders,
          formatCurrency(item.revenue)
        ]);
      } else {
        head = [['Label', 'Orders/Qty', 'Revenue']];
        body = salesData.map(item => [
          item.label,
          salesReportType === 'product' || salesReportType === 'inventory' ? item.quantity : item.orders,
          formatCurrency(item.revenue)
        ]);
      }
    } else if (activeTab === 'audit') {
      if (auditReportType === 'stock_adjustments') {
        head = [['Date', 'Product', 'Change', 'Reason']];
        body = auditData.map(item => [
          new Date(item.created_at).toLocaleString(),
          item.product_name,
          item.quantity_change,
          item.reason
        ]);
      } else if (auditReportType === 'voids_refunds') {
        head = [['Sale ID', 'Customer', 'Status', 'Amount']];
        body = auditData.map(item => [
          item.id,
          item.customer_name || 'Guest',
          item.status,
          formatCurrency(item.total_amount)
        ]);
      } else if (auditReportType === 'returns') {
        head = [['Return ID', 'Sale Slip', 'Reason', 'Refund Amount']];
        body = auditData.map(item => [
          item.id,
          item.slip_number,
          item.reason,
          formatCurrency(item.total_refund)
        ]);
      } else if (auditReportType === 'cash_movements') {
        head = [['Type', 'Description', 'Amount']];
        body = auditData.map(item => [
          item.type,
          item.description,
          formatCurrency(item.amount)
        ]);
      }
    } else if (activeTab === 'management') {
      if (!managementData) return;
      if (managementView === 'top100') {
        head = [['Rank', 'Product Name', 'Category', 'Qty Sold', 'Total Revenue']];
        body = managementData.top100Items?.map((item: any, idx: number) => [
          idx + 1,
          item.name,
          item.category,
          item.total_sold,
          formatCurrency(item.revenue)
        ]) || [];
      } else if (managementView === 'noSale') {
        head = [['Product Name', 'Category', 'Current Stock', 'Retail Price', 'Potential Revenue']];
        body = managementData.noSaleItems?.map((item: any) => [
          item.name,
          item.category,
          item.stock,
          formatCurrency(item.price),
          formatCurrency(item.stock * item.price)
        ]) || [];
      } else {
         // Overview export
         if (managementData.profitLoss && managementData.inventoryValuation) {
           head = [['Metric', 'Value']];
           body = [
             ['Total Revenue', formatCurrency(managementData.profitLoss.total_revenue)],
             ['Total COGS', formatCurrency(managementData.profitLoss.total_cogs)],
             ['Gross Profit', formatCurrency(managementData.profitLoss.gross_profit)],
             ['Inventory Retail Value', formatCurrency(managementData.inventoryValuation.total_retail_value)],
             ['Inventory Cost Value', formatCurrency(managementData.inventoryValuation.total_cost_value)],
             ['Total Inventory Items', managementData.inventoryValuation.total_items]
           ];
         }
      }
    }

    autoTable(doc, {
      head: head,
      body: body,
      startY: 35,
    });

    doc.save(`${activeTab}_report.pdf`);
  };

  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const renderSalesTab = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Time Range Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'all', label: 'All Time' },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                timeRange === range.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Additional Filters */}
        <div className="flex gap-2">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_payment">Mobile Payment</option>
          </select>

          <select
            value={cashier}
            onChange={(e) => setCashier(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Cashiers</option>
            {cashiersList.map((user: any) => (
              <option key={user.id} value={user.username}>{user.username}</option>
            ))}
            <option value="System">System</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { id: 'date', icon: Calendar, label: 'By Date', color: 'indigo' },
          { id: 'product', icon: Package, label: 'By Product', color: 'emerald' },
          { id: 'customer', icon: Users, label: 'By Customer', color: 'amber' },
          { id: 'inventory', icon: Archive, label: 'Inventory', color: 'blue' },
          { id: 'transactions', icon: ClipboardList, label: 'Transactions', color: 'purple' },
          { id: 'cash', icon: DollarSign, label: 'Cash Flow', color: 'rose' },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setSalesReportType(type.id as SalesReportType)}
            className={`p-4 rounded-xl border text-left transition-all ${
              salesReportType === type.id
                ? `bg-${type.color}-50 border-${type.color}-200 shadow-sm ring-1 ring-${type.color}-200`
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg bg-${type.color}-100 flex items-center justify-center mb-3`}>
              <type.icon className={`w-4 h-4 text-${type.color}-600`} />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">{type.label}</h3>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Report Visualization
          </h3>
        </div>
        <div className="p-6 h-80">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Data Table */}
      {!loading && salesData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Label</th>
                {salesReportType === 'transactions' && (
                  <>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Cashier</th>
                  </>
                )}
                <th className="px-6 py-4 text-right">Orders/Qty</th>
                <th className="px-6 py-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.label}</td>
                  {salesReportType === 'transactions' && (
                    <>
                      <td className="px-6 py-4 text-slate-500">{item.date ? new Date(item.date).toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 text-slate-500 capitalize">{item.payment_method?.replace('_', ' ') || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{item.cashier_name || 'System'}</td>
                    </>
                  )}
                  <td className="px-6 py-4 text-right text-slate-500">
                    {salesReportType === 'product' || salesReportType === 'inventory' ? item.quantity : item.orders}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderAuditTab = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex gap-4 border-b border-slate-200 pb-4 overflow-x-auto">
        {[
          { id: 'stock_adjustments', label: 'Stock Adjustments' },
          { id: 'voids_refunds', label: 'Voids & Refunds' },
          { id: 'returns', label: 'Sale Returns' },
          { id: 'cash_movements', label: 'Cash Movements' },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setAuditReportType(type.id as AuditReportType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              auditReportType === type.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Date</th>
                {auditReportType === 'stock_adjustments' && (
                  <>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4 text-right">Change</th>
                    <th className="px-6 py-4">Reason</th>
                  </>
                )}
                {auditReportType === 'voids_refunds' && (
                  <>
                    <th className="px-6 py-4">Sale ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </>
                )}
                {auditReportType === 'returns' && (
                  <>
                    <th className="px-6 py-4">Return ID</th>
                    <th className="px-6 py-4">Sale Slip</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4 text-right">Refund Amount</th>
                  </>
                )}
                {auditReportType === 'cash_movements' && (
                  <>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading audit data...</td></tr>
              ) : auditData.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No records found.</td></tr>
              ) : (
                auditData.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    {auditReportType === 'stock_adjustments' && (
                      <>
                        <td className="px-6 py-4 font-medium text-slate-900">{item.product_name}</td>
                        <td className={`px-6 py-4 text-right font-bold ${item.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{item.reason}</td>
                      </>
                    )}
                    {auditReportType === 'voids_refunds' && (
                      <>
                        <td className="px-6 py-4 font-medium text-slate-900">#{item.id}</td>
                        <td className="px-6 py-4 text-slate-500">{item.customer_name || 'Guest'}</td>
                        <td className="px-6 py-4 capitalize">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'voided' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.total_amount)}</td>
                      </>
                    )}
                    {auditReportType === 'returns' && (
                      <>
                        <td className="px-6 py-4 font-medium text-slate-900">RET-{item.id}</td>
                        <td className="px-6 py-4 text-slate-500">{item.slip_number}</td>
                        <td className="px-6 py-4 text-slate-500">{item.reason || '-'}</td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600">{formatCurrency(item.total_refund)}</td>
                      </>
                    )}
                    {auditReportType === 'cash_movements' && (
                      <>
                        <td className="px-6 py-4 capitalize font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'pay_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {item.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{item.description}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.amount)}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderManagementTab = () => {
    if (!managementData) return <div className="p-8 text-center text-slate-400">Loading management data...</div>;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex gap-4 border-b border-slate-200 pb-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'top100', label: 'Top 100 Selling Items' },
            { id: 'noSale', label: 'No Sale Items' },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setManagementView(view.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                managementView === view.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {managementView === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Gross Profit</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Revenue</span>
                    <span className="font-medium">{formatCurrency(managementData.profitLoss.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">COGS</span>
                    <span className="font-medium text-rose-600">-{formatCurrency(managementData.profitLoss.total_cogs)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
                    <span className="font-semibold text-slate-900">Profit</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(managementData.profitLoss.gross_profit)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Archive className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Inventory Valuation</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Total Retail Value</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(managementData.inventoryValuation.total_retail_value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Cost Value</p>
                    <p className="text-xl font-bold text-slate-700">{formatCurrency(managementData.inventoryValuation.total_cost_value)}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    Across {managementData.inventoryValuation.total_items} unique products
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Top Categories</h3>
                </div>
                <div className="space-y-3">
                  {managementData.topCategories.map((cat: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{cat.category || 'Uncategorized'}</span>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(cat.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-6">Customer Acquisition Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={managementData.customerGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                    <Tooltip cursor={{ stroke: '#4f46e5', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="new_customers" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCustomers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {managementView === 'top100' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Top 100 Selling Items</h3>
              <p className="text-sm text-slate-500">Ranked by total quantity sold.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 w-16">Rank</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Qty Sold</th>
                    <th className="px-6 py-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managementData.top100Items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-500 font-mono">#{idx + 1}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-slate-500">{item.category}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">{item.total_sold}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                  {(!managementData.top100Items || managementData.top100Items.length === 0) && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No sales data available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {managementView === 'noSale' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">No Sale Items</h3>
              <p className="text-sm text-slate-500">Products with zero sales history (Dead Stock).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Current Stock</th>
                    <th className="px-6 py-4 text-right">Retail Price</th>
                    <th className="px-6 py-4 text-right">Potential Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managementData.noSaleItems?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-slate-500">{item.category}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">{item.stock}</td>
                      <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(item.price)}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(item.stock * item.price)}</td>
                    </tr>
                  ))}
                  {(!managementData.noSaleItems || managementData.noSaleItems.length === 0) && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">All items have been sold at least once!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500 mt-1">Comprehensive insights for all departments.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'sales' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Sales Department
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Audit Side
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'management' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Management Side
        </button>
      </div>

      {activeTab === 'sales' && renderSalesTab()}
      {activeTab === 'audit' && renderAuditTab()}
      {activeTab === 'management' && renderManagementTab()}
    </div>
  );
}
