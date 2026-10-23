import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Banknote, 
  Wallet, 
  Receipt, 
  Plus, 
  PackagePlus, 
  Truck, 
  ArrowUpRight, 
  Calendar, 
  ChevronDown, 
  Info, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Search, 
  X, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  RefreshCw,
  Activity,
  Boxes,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useStore } from '../StoreContext';
import { DashboardOverviewData, DashboardStats, Product, Customer, Supplier, ActivityItem } from '../types';
import AdvancedDashboard from './AdvancedDashboard';

interface DashboardProps {
  onNavigateTab?: (tab: 'dashboard' | 'pos' | 'orders' | 'inventory' | 'reports' | 'customers' | 'cash' | 'users' | 'settings' | 'suppliers' | 'purchases' | 'returns') => void;
}

interface DailyRevenueItem {
  dateKey: string;
  displayDate: string;
  dayName: string;
  revenue: number;
  transactionCount: number;
}

export default function Dashboard({ onNavigateTab }: DashboardProps) {
  const { formatCurrency, storeProfile, lang } = useStore();
  
  // Data states
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyRevenueData, setDailyRevenueData] = useState<DailyRevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  // Real-time Recent Activity feed states
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'transaction' | 'inventory'>('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityRefreshing, setActivityRefreshing] = useState(false);
  const [isAutoPolling, setIsAutoPolling] = useState(true);
  const [lastActivitySync, setLastActivitySync] = useState<Date>(new Date());


  // Filters
  const [branch, setBranch] = useState<string>('ရတနာ (မော်လမြိုင်)');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month');
  const [dateRangeStr, setDateRangeStr] = useState<string>('01/10/2026 - 31/10/2026');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>('2026-10-31');

  // Modals
  const [activeModal, setActiveModal] = useState<
    'none' | 'new_product' | 'new_purchase' | 'customer_debt' | 'add_expense' | 'profit_loss' |
    'alert_low_stock' | 'alert_customer_debts' | 'alert_supplier_debts' | 'alert_deliveries'
  >('none');

  // Tooltip helper
  const [tooltipText, setTooltipText] = useState<string | null>(null);

  // Form states for modals
  const [expenseForm, setExpenseForm] = useState({
    category: 'ဆိုင်ခန်းခ',
    amount: '',
    payment_method: 'cash',
    description: ''
  });
  const [debtPaymentForm, setDebtPaymentForm] = useState({
    customer_id: '',
    sale_id: '',
    amount: '',
    payment_method: 'cash',
    notes: ''
  });
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'ဆေးဝါးများ',
    price: '',
    cost_price: '',
    stock: '',
    unit: 'ဗူး',
    low_stock_threshold: '10'
  });
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    product_id: '',
    quantity: '10',
    cost_price: '',
    notes: ''
  });

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);

  // Dedicated Low Stock Alert Notification Area states
  const [lowStockFilter, setLowStockFilter] = useState<'all' | 'out' | 'critical' | 'warning'>('all');
  const [lowStockCategory, setLowStockCategory] = useState<string>('all');
  const [lowStockSearch, setLowStockSearch] = useState<string>('');
  const [dismissedLowStockIds, setDismissedLowStockIds] = useState<number[]>([]);
  const [quickRestockProductId, setQuickRestockProductId] = useState<number | null>(null);
  const [quickRestockQty, setQuickRestockQty] = useState<string>('20');
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [lowStockRefreshing, setLowStockRefreshing] = useState<boolean>(false);
  const [showAllLowStock, setShowAllLowStock] = useState<boolean>(false);

  // Load data
  const fetchDashboardData = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (branch) queryParams.append('branch', branch);

      const [resOverview, resStats, resProducts] = await Promise.all([
        window.fetch(`/api/dashboard/overview?${queryParams.toString()}`),
        window.fetch('/api/dashboard/stats'),
        window.fetch('/api/products')
      ]);

      if (resOverview.ok) {
        const data = await resOverview.json();
        setOverview(data);
      }
      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data);
      }
      if (resProducts.ok) {
        const prods = await resProducts.json();
        if (Array.isArray(prods)) {
          setProductsList(prods);
        }
      }
      await fetchTransactionsRevenue();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh low stock items specifically
  const handleRefreshLowStockAlerts = async () => {
    setLowStockRefreshing(true);
    try {
      await fetchDashboardData();
      await fetchRecentActivities(true);
    } finally {
      setLowStockRefreshing(false);
    }
  };

  // Quick Restock directly from the Low Stock Alert Notification Card
  const handleQuickRestock = async (product: Product, addQty: number) => {
    if (!addQty || addQty <= 0) return;
    setRestockingId(product.id);
    try {
      const res = await window.fetch(`/api/products/${product.id}/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity_change: addQty,
          reason: `Dashboard Low Stock Alert မှ အမြန်ဖြည့်တင်းခြင်း (+${addQty} ${product.unit || 'pc'})`
        })
      });
      if (res.ok) {
        setQuickRestockProductId(null);
        await fetchDashboardData();
        await fetchRecentActivities(true);
      }
    } catch (err) {
      console.error('Quick restock failed:', err);
    } finally {
      setRestockingId(null);
    }
  };

  // Fetch transactions and aggregate past 7 days daily revenue for line chart
  const fetchTransactionsRevenue = async () => {
    try {
      setChartLoading(true);
      // Pull directly from transaction API endpoint
      let res = await window.fetch('/api/transactions');
      if (!res.ok) {
        res = await window.fetch('/api/orders');
      }
      const transactions = res.ok ? await res.json() : [];

      // Construct past 7 calendar days up to today
      const last7Days: DailyRevenueItem[] = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayName = dayNames[d.getDay()];
        last7Days.push({
          dateKey,
          displayDate: `${displayDate} (${dayName})`,
          dayName,
          revenue: 0,
          transactionCount: 0
        });
      }

      // Aggregate transactions revenue by day
      if (Array.isArray(transactions)) {
        transactions.forEach((tx: any) => {
          if (tx.status === 'cancelled' || tx.payment_status === 'refunded') return;
          if (!tx.created_at) return;
          const txDate = tx.created_at.split('T')[0].split(' ')[0];
          const match = last7Days.find(d => d.dateKey === txDate);
          if (match) {
            match.revenue += Number(tx.total_amount || 0);
            match.transactionCount += 1;
          }
        });
      }

      setDailyRevenueData(last7Days);
    } catch (err) {
      console.error("Failed to load transactions for line chart:", err);
    } finally {
      setChartLoading(false);
    }
  };

  // Fetch real-time recent activities (sales transactions and inventory updates)
  const fetchRecentActivities = async (isBackground = false) => {
    try {
      if (!isBackground) setActivityRefreshing(true);
      const params = new URLSearchParams();
      if (activityFilter !== 'all') {
        params.append('type', activityFilter);
      }
      params.append('limit', '30');
      const res = await window.fetch(`/api/dashboard/recent-activity?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
        setLastActivitySync(new Date());
      }
    } catch (err) {
      console.error("Failed to load recent activities:", err);
    } finally {
      setActivityRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, branch]);

  // Load activities on filter change
  useEffect(() => {
    fetchRecentActivities(false);
  }, [activityFilter]);

  // Real-time polling effect (polls every 8 seconds when auto-polling is active)
  useEffect(() => {
    if (!isAutoPolling) return;
    const interval = setInterval(() => {
      fetchRecentActivities(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [activityFilter, isAutoPolling]);

  // Listen to real-time Firestore Cloud DB product updates
  useEffect(() => {
    const onCloudSync = () => {
      fetchDashboardData();
    };
    window.addEventListener('pos-cloud-sync', onCloudSync);
    return () => window.removeEventListener('pos-cloud-sync', onCloudSync);
  }, [startDate, endDate, branch]);

  // Relative time helper
  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 45) return lang === 'my' ? 'ယခုလေးတင်' : 'Just now';
      if (diffMin < 60) return lang === 'my' ? `${diffMin} မိနစ် အရင်က` : `${diffMin}m ago`;
      if (diffHours < 24) return lang === 'my' ? `${diffHours} နာရီ အရင်က` : `${diffHours}h ago`;
      if (diffDays === 1) return lang === 'my' ? 'မနေ့က' : 'Yesterday';
      if (diffDays < 7) return lang === 'my' ? `${diffDays} ရက် အရင်က` : `${diffDays}d ago`;
      return date.toLocaleDateString('my-MM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };


  // Load supporting lists for modals
  useEffect(() => {
    window.fetch('/api/products').then(res => res.json()).then(setProductsList).catch(() => {});
    window.fetch('/api/customers').then(res => res.json()).then(setCustomersList).catch(() => {});
    window.fetch('/api/suppliers').then(res => res.json()).then(setSuppliersList).catch(() => {});
  }, []);

  // Preset date handling
  const applyDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    setShowDateDropdown(false);
    const now = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    const toDisplay = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    if (preset === 'today') {
      const todayStr = toISO(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setDateRangeStr(`${toDisplay(now)} (ယနေ့)`);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const str = toISO(yesterday);
      setStartDate(str);
      setEndDate(str);
      setDateRangeStr(`${toDisplay(yesterday)} (မနေ့က)`);
    } else if (preset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setStartDate(toISO(start));
      setEndDate(toISO(end));
      setDateRangeStr(`${toDisplay(start)} - ${toDisplay(end)}`);
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toISO(start));
      setEndDate(toISO(end));
      setDateRangeStr(`${toDisplay(start)} - ${toDisplay(end)}`);
    }
  };

  // Submit Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;
    try {
      const res = await window.fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          branch
        })
      });
      if (res.ok) {
        setActiveModal('none');
        setExpenseForm({ category: 'ဆိုင်ခန်းခ', amount: '', payment_method: 'cash', description: '' });
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Customer Debt Repayment
  const handleRecordCustomerDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtPaymentForm.customer_id || !debtPaymentForm.amount) return;
    try {
      const res = await window.fetch('/api/customer-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: Number(debtPaymentForm.customer_id),
          sale_id: debtPaymentForm.sale_id ? Number(debtPaymentForm.sale_id) : undefined,
          amount: Number(debtPaymentForm.amount),
          payment_method: debtPaymentForm.payment_method,
          notes: debtPaymentForm.notes
        })
      });
      if (res.ok) {
        setActiveModal('none');
        setDebtPaymentForm({ customer_id: '', sale_id: '', amount: '', payment_method: 'cash', notes: '' });
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit New Product
  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name || !newProductForm.price) return;
    try {
      const res = await window.fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductForm.name,
          category: newProductForm.category,
          price: Number(newProductForm.price),
          cost_price: Number(newProductForm.cost_price || 0),
          stock: Number(newProductForm.stock || 0),
          unit: newProductForm.unit || 'ဗူး',
          low_stock_threshold: Number(newProductForm.low_stock_threshold || 10)
        })
      });
      if (res.ok) {
        setActiveModal('none');
        setNewProductForm({ name: '', category: 'ဆေးဝါးများ', price: '', cost_price: '', stock: '', unit: 'ဗူး', low_stock_threshold: '10' });
        fetchDashboardData();
        const pRes = await window.fetch('/api/products');
        if (pRes.ok) setProductsList(await pRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit New Purchase Order
  const handleAddNewPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.supplier_id || !purchaseForm.product_id) return;
    try {
      const prod = productsList.find(p => p.id === Number(purchaseForm.product_id));
      const cost = Number(purchaseForm.cost_price || prod?.cost_price || 0);
      const qty = Number(purchaseForm.quantity || 1);
      const totalAmount = cost * qty;

      const res = await window.fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: Number(purchaseForm.supplier_id),
          total_amount: totalAmount,
          notes: purchaseForm.notes,
          items: [{
            product_id: Number(purchaseForm.product_id),
            quantity: qty,
            cost_price: cost
          }]
        })
      });
      if (res.ok) {
        setActiveModal('none');
        setPurchaseForm({ supplier_id: '', product_id: '', quantity: '10', cost_price: '', notes: '' });
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mark Delivery Completed
  const handleCompleteDelivery = async (saleId: number) => {
    try {
      const res = await window.fetch(`/api/deliveries/${saleId}/complete`, { method: 'POST' });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Mark Supplier PO Paid
  const handlePaySupplierPO = async (poId: number) => {
    try {
      const res = await window.fetch(`/api/purchase-orders/${poId}/pay`, { method: 'POST' });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !overview) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Dashboard အချက်အလက်များ ရယူနေပါသည်...</p>
        </div>
      </div>
    );
  }

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. Dashboard Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              လုပ်ငန်းအခြေအနေအကျဉ်းချုပ်
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {branch} ၏ အဓိကလုပ်ငန်းဆိုင်ရာ အချက်အလက်များ
          </p>
        </div>

        {/* Filters: Branch Selector & Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              <span>{branch}</span>
              <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
            </button>
            {showBranchDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95">
                {[
                  'ရတနာ (မော်လမြိုင်)',
                  'ပင်မဆိုင် (ရန်ကုန်)',
                  'မန္တလေးဆိုင်ခွဲ',
                  'အားလုံး (All Branches)'
                ].map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setBranch(b);
                      setShowBranchDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                      branch === b ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{b}</span>
                    {branch === b && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>{dateRangeStr}</span>
              <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
            </button>
            {showDateDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 animate-in fade-in zoom-in-95 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">ကာလ ရွေးချယ်ရန်</div>
                <button
                  onClick={() => applyDatePreset('today')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${datePreset === 'today' ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span>ယနေ့ (Today)</span>
                  {datePreset === 'today' && <Check className="w-4 h-4 text-sky-600" />}
                </button>
                <button
                  onClick={() => applyDatePreset('yesterday')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${datePreset === 'yesterday' ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span>မနေ့က (Yesterday)</span>
                  {datePreset === 'yesterday' && <Check className="w-4 h-4 text-sky-600" />}
                </button>
                <button
                  onClick={() => applyDatePreset('week')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${datePreset === 'week' ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span>ယခုအပတ် (This Week)</span>
                  {datePreset === 'week' && <Check className="w-4 h-4 text-sky-600" />}
                </button>
                <button
                  onClick={() => applyDatePreset('month')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${datePreset === 'month' ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span>ယခုလ (This Month)</span>
                  {datePreset === 'month' && <Check className="w-4 h-4 text-sky-600" />}
                </button>
                <div className="pt-2 border-t border-slate-100 px-2">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">စိတ်ကြိုက် ရက်စွဲ</span>
                  <div className="space-y-1.5">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDatePreset('custom');
                        setDateRangeStr(`${e.target.value} - ${endDate}`);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDatePreset('custom');
                        setDateRangeStr(`${startDate} - ${e.target.value}`);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Four Main KPI Metric Cards (Visual exact match from photo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* Card 1: Total Sales (ရောင်းအားစုစုပေါင်း) - Light Sky Blue */}
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              ရောင်းအားစုစုပေါင်း
              <button 
                onMouseEnter={() => setTooltipText('ရွေးချယ်ထားသော ကာလအတွင်း ပြီးစီးခဲ့သည့် စုစုပေါင်း အရောင်းပမာဏ')}
                onMouseLeave={() => setTooltipText(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">Ks</span>
              <h3 className="text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight truncate">
                {formatCurrency(overview.totalSales, true)}
              </h3>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-medium">
            အရောင်းဘောင်ချာ {overview.salesCount} စောင်
          </div>
        </div>

        {/* Card 2: Net Flow (ဝင်ငွေ - ထွက်ငွေ) - Light Green */}
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              ဝင်ငွေ - ထွက်ငွေ
              <button 
                onMouseEnter={() => setTooltipText('လက်ခံရရှိငွေ မှ အသုံးစရိတ် နှုတ်ပြီး အသားတင်ငွေ')}
                onMouseLeave={() => setTooltipText(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Banknote className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">Ks</span>
              <h3 className="text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight truncate">
                {formatCurrency(overview.netFlow, true)}
              </h3>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-medium truncate">
            အရောင်းလက်ခံငွေ - အသုံးစရိတ်
          </div>
        </div>

        {/* Card 3: Receivables (ရောင်းသူ ရရန်ကျန်ငွေ) - Light Amber */}
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              ရောင်းသူ ရရန်ကျန်ငွေ
              <button 
                onMouseEnter={() => setTooltipText('Customer များထံမှ ပြန်လည်ကောက်ခံရန် ကျန်ရှိသော အကြွေးကျန်ငွေ')}
                onMouseLeave={() => setTooltipText(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">Ks</span>
              <h3 className="text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight truncate">
                {formatCurrency(overview.receivables, true)}
              </h3>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-medium">
            Customer အကြွေးကျန်ငွေများ
          </div>
        </div>

        {/* Card 4: Total Expenses (ကုန်ကျစရိတ်) - Light Rose */}
        <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              ကုန်ကျစရိတ်
              <button 
                onMouseEnter={() => setTooltipText('ဆိုင်ခန်းခ၊ ဝန်ထမ်းလစာ၊ မီတာခ စသည့် စုစုပေါင်း အသုံးစရိတ်များ')}
                onMouseLeave={() => setTooltipText(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">Ks</span>
              <h3 className="text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight truncate">
                {formatCurrency(overview.totalExpenses, true)}
              </h3>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-medium">
            စုစုပေါင်း ကုန်ကျစရိတ်
          </div>
        </div>

      </div>

      {/* Floating Tooltip Helper */}
      {tooltipText && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg z-50 animate-in fade-in max-w-xs">
          {tooltipText}
        </div>
      )}

      {/* 3. Quick Actions Section (အမြန်လုပ်ဆောင်ချက်များ - 6 Buttons) */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          အမြန်လုပ်ဆောင်ချက်များ
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Button 1: + အရောင်းအသစ် */}
          <button
            onClick={() => onNavigateTab ? onNavigateTab('pos') : null}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">+ အရောင်းအသစ်</span>
          </button>

          {/* Button 2: ဝယ်ယူစာရင်းသွင်းရန် */}
          <button
            onClick={() => setActiveModal('new_purchase')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PackagePlus className="w-4 h-4 shrink-0" />
            <span className="truncate">ဝယ်ယူစာရင်းသွင်းရန်</span>
          </button>

          {/* Button 3: ကုန်ပစ္စည်းအသစ်ထည့်ရန် */}
          <button
            onClick={() => setActiveModal('new_product')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Package className="w-4 h-4 shrink-0" />
            <span className="truncate">ကုန်ပစ္စည်းအသစ်ထည့်ရန်</span>
          </button>

          {/* Button 4: Customer အကြွေးလက်ခံရန် */}
          <button
            onClick={() => setActiveModal('customer_debt')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#1e1b4b] hover:bg-[#0f172a] text-white font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">Customer အကြွေးလက်ခံရန်</span>
          </button>

          {/* Button 5: အသုံးစရိတ်ထည့်ရန် */}
          <button
            onClick={() => setActiveModal('add_expense')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span className="truncate">အသုံးစရိတ်ထည့်ရန်</span>
          </button>

          {/* Button 6: အရှုံးအမြတ်ကြည့်ရန် */}
          <button
            onClick={() => setActiveModal('profit_loss')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#d97706] hover:bg-[#b45309] text-white font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="truncate">အရှုံးအမြတ်ကြည့်ရန်</span>
          </button>

        </div>
      </div>

      {/* 4. Action Needed / Alerts Section (ကြည့်ရှုရန် လိုအပ်သောအရာများ) */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              ကြည့်ရှုရန် လိုအပ်သောအရာများ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ချက်ချင်းစစ်ဆေးသင့်သည့် အချက်များ
            </p>
          </div>
          <button 
            onClick={() => setActiveModal('alert_low_stock')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            <span>အားလုံးကြည့်ရန်</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Alert Pills/Badges in row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Alert 1: Stock နည်းနေသောအပစ္စည်း */}
          <div 
            onClick={() => setActiveModal('alert_low_stock')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></div>
              <span className="text-xs font-semibold text-slate-700">Stock နည်းနေသောပစ္စည်း</span>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full">
              {overview.lowStockCount} မျိုး
            </span>
          </div>

          {/* Alert 2: Customer အကြွေးရက်ကျော် */}
          <div 
            onClick={() => setActiveModal('alert_customer_debts')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></div>
              <span className="text-xs font-semibold text-slate-700">Customer အကြွေးရက်ကျော်</span>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-full">
              {overview.overdueCustomerCount} ခု
            </span>
          </div>

          {/* Alert 3: Supplier ပေးရန်ရက်ကျော် */}
          <div 
            onClick={() => setActiveModal('alert_supplier_debts')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/40 hover:bg-purple-50 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></div>
              <span className="text-xs font-semibold text-slate-700">Supplier ပေးရန်ရက်ကျော်</span>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-full">
              {overview.overdueSupplierCount} ခု
            </span>
          </div>

          {/* Alert 4: ပို့ဆောင်ရန်ကျန် */}
          <div 
            onClick={() => setActiveModal('alert_deliveries')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 hover:bg-blue-50 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></div>
              <span className="text-xs font-semibold text-slate-700">ပို့ဆောင်ရန်ကျန်</span>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full">
              {overview.pendingDeliveryCount} ခု
            </span>
          </div>

        </div>
      </div>

      {/* 4B. Dedicated Low-Stock Alert Notification Area (စတော့လက်ကျန်နည်းနေသော ပစ္စည်းများ သတိပေးချက်စင်တာ) */}
      {(() => {
        // Combine productsList and overview.lowStockProducts to ensure live, accurate low-stock items
        const sourceProducts = productsList.length > 0 ? productsList : (overview.lowStockProducts || []);
        const allLowStockItems = sourceProducts
          .filter(p => p.stock <= (p.low_stock_threshold ?? 10))
          .sort((a, b) => {
            if (a.stock === 0 && b.stock !== 0) return -1;
            if (b.stock === 0 && a.stock !== 0) return 1;
            const ratioA = a.stock / Math.max(1, a.low_stock_threshold ?? 10);
            const ratioB = b.stock / Math.max(1, b.low_stock_threshold ?? 10);
            return ratioA - ratioB;
          });

        const activeLowStockItems = allLowStockItems.filter(p => !dismissedLowStockIds.includes(p.id));
        const outOfStockCount = activeLowStockItems.filter(p => p.stock === 0).length;
        const criticalLowCount = activeLowStockItems.filter(p => {
          const threshold = p.low_stock_threshold ?? 10;
          return p.stock > 0 && p.stock <= Math.ceil(threshold * 0.4);
        }).length;
        const warningLowCount = activeLowStockItems.filter(p => {
          const threshold = p.low_stock_threshold ?? 10;
          return p.stock > Math.ceil(threshold * 0.4) && p.stock <= threshold;
        }).length;

        const categories = Array.from(
          new Set(allLowStockItems.map(p => p.category).filter(Boolean))
        ) as string[];

        const filteredLowStock = activeLowStockItems.filter(p => {
          const threshold = p.low_stock_threshold ?? 10;
          if (lowStockFilter === 'out' && p.stock !== 0) return false;
          if (lowStockFilter === 'critical' && !(p.stock > 0 && p.stock <= Math.ceil(threshold * 0.4))) return false;
          if (lowStockFilter === 'warning' && !(p.stock > Math.ceil(threshold * 0.4) && p.stock <= threshold)) return false;
          if (lowStockCategory !== 'all' && p.category !== lowStockCategory) return false;
          if (lowStockSearch.trim()) {
            const q = lowStockSearch.toLowerCase();
            const matchName = p.name?.toLowerCase().includes(q);
            const matchCat = p.category?.toLowerCase().includes(q);
            const matchBarcode = p.barcode?.toLowerCase().includes(q);
            if (!matchName && !matchCat && !matchBarcode) return false;
          }
          return true;
        });

        const displayedItems = showAllLowStock ? filteredLowStock : filteredLowStock.slice(0, 6);

        return (
          <div className="bg-white rounded-2xl border border-amber-200/90 shadow-sm overflow-hidden">
            {/* Top Banner Header */}
            <div className="p-5 md:p-6 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-rose-50/60 border-b border-amber-200/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  outOfStockCount > 0 || criticalLowCount > 0
                    ? 'bg-rose-600 text-white'
                    : activeLowStockItems.length > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-500 text-white'
                }`}>
                  {activeLowStockItems.length > 0 ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight">
                      {lang === 'my'
                        ? 'စတော့လက်ကျန်နည်းနေသော ပစ္စည်းများ သတိပေးချက် (Low Stock Inventory Alerts)'
                        : 'Low Stock Inventory Alert Notifications'}
                    </h2>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md border ${
                      activeLowStockItems.length > 0
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {activeLowStockItems.length} {lang === 'my' ? 'မျိုး' : 'Items'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {lang === 'my'
                      ? 'သတ်မှတ်ထားသော အနည်းဆုံးလက်ကျန် (Threshold) အောက် ရောက်ရှိနေသည့် ကုန်ပစ္စည်းများကို တိုက်ရိုက်စစ်ဆေးပြီး အမြန်ဖြည့်တင်းနိုင်ပါသည်'
                      : 'Items currently at or below their minimum stock threshold — restock or create a purchase order directly'}
                  </p>
                </div>
              </div>

              {/* Right Header Summary & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {dismissedLowStockIds.length > 0 && (
                  <button
                    onClick={() => setDismissedLowStockIds([])}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors"
                  >
                    {lang === 'my'
                      ? `ဖျောက်ထားသော (${dismissedLowStockIds.length}) မျိုး ပြန်ပြရန်`
                      : `Restore Dismissed (${dismissedLowStockIds.length})`}
                  </button>
                )}

                <button
                  onClick={handleRefreshLowStockAlerts}
                  disabled={lowStockRefreshing}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${lowStockRefreshing ? 'animate-spin' : ''}`} />
                  <span>{lang === 'my' ? 'စတော့ ပြန်စစ်ရန်' : 'Sync Stock'}</span>
                </button>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('inventory')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'စတော့စာရင်းသို့ သွားရန်' : 'Open Inventory'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Severity Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setLowStockFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    lowStockFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <span>{lang === 'my' ? 'အားလုံး' : 'All Low Stock'}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    lowStockFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {activeLowStockItems.length}
                  </span>
                </button>

                <button
                  onClick={() => setLowStockFilter('out')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    lowStockFilter === 'out'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>{lang === 'my' ? 'ပစ္စည်းပြတ်လပ် (0)' : 'Out of Stock'}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    lowStockFilter === 'out' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {outOfStockCount}
                  </span>
                </button>

                <button
                  onClick={() => setLowStockFilter('critical')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    lowStockFilter === 'critical'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>{lang === 'my' ? 'အရေးပေါ်ဖြည့်ရန်' : 'Critical Low'}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    lowStockFilter === 'critical' ? 'bg-orange-800 text-white' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {criticalLowCount}
                  </span>
                </button>

                <button
                  onClick={() => setLowStockFilter('warning')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    lowStockFilter === 'warning'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>{lang === 'my' ? 'သတိပေးအဆင့်' : 'Warning'}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    lowStockFilter === 'warning' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {warningLowCount}
                  </span>
                </button>
              </div>

              {/* Category Filter & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={lowStockCategory}
                  onChange={(e) => setLowStockCategory(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="all">{lang === 'my' ? 'အမျိုးအစား အားလုံး' : 'All Categories'}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={lowStockSearch}
                    onChange={(e) => setLowStockSearch(e.target.value)}
                    placeholder={lang === 'my' ? 'ပစ္စည်းအမည်၊ Barcode ရှာရန်...' : 'Search low-stock item...'}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  {lowStockSearch && (
                    <button
                      onClick={() => setLowStockSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notification Cards Grid / List */}
            <div className="p-5 md:p-6">
              {filteredLowStock.length === 0 ? (
                <div className="py-10 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {activeLowStockItems.length === 0
                      ? (lang === 'my' ? 'စတော့နည်းနေသော ကုန်ပစ္စည်း မရှိပါ' : 'All inventory items are well stocked!')
                      : (lang === 'my' ? 'ရွေးချယ်ထားသော စစ်ထုတ်မှုနှင့် ကိုက်ညီသည့် ပစ္စည်းမရှိပါ' : 'No low-stock items match your filter')}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeLowStockItems.length === 0
                      ? (lang === 'my' ? 'ကုန်ပစ္စည်းအားလုံးသည် သတ်မှတ်ထားသော အနည်းဆုံးလက်ကျန်အထက်တွင် ရှိနေပါသည်' : 'Every product is above its minimum stock threshold.')
                      : (lang === 'my' ? 'အခြား အမျိုးအစား သို့မဟုတ် အဆင့်ကို ရွေးချယ်ကြည့်ရှုပါ' : 'Try clearing the search query or selecting All Low Stock.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedItems.map((item) => {
                    const threshold = item.low_stock_threshold ?? 10;
                    const isOut = item.stock === 0;
                    const isCritical = item.stock > 0 && item.stock <= Math.ceil(threshold * 0.4);
                    const stockPercent = Math.min(100, Math.max(0, Math.round((item.stock / Math.max(1, threshold)) * 100)));
                    const shortageQty = Math.max(1, threshold - item.stock);
                    const recommendedOrderQty = Math.max(20, threshold * 2 - item.stock);
                    const isQuickRestockOpen = quickRestockProductId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-all relative flex flex-col justify-between gap-3 ${
                          isOut
                            ? 'bg-rose-50/40 border-rose-200/90 hover:border-rose-300'
                            : isCritical
                              ? 'bg-orange-50/40 border-orange-200/90 hover:border-orange-300'
                              : 'bg-amber-50/30 border-amber-200/80 hover:border-amber-300'
                        }`}
                      >
                        {/* Top row: Item Title, Category, Urgency Badge & Dismiss */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                isOut
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : isCritical
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {isOut
                                  ? (lang === 'my' ? 'ပစ္စည်းပြတ်လပ် (Out of Stock)' : 'Out of Stock')
                                  : isCritical
                                    ? (lang === 'my' ? 'အရေးပေါ်ဖြည့်ရန် (Critical)' : 'Critical Low')
                                    : (lang === 'my' ? 'လက်ကျန်နည်း (Low Stock)' : 'Low Stock')}
                              </span>

                              {item.category && (
                                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                                  {item.category}
                                </span>
                              )}

                              {item.barcode && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{item.barcode}
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm md:text-base font-extrabold text-slate-900 mt-1.5 truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {lang === 'my' ? 'ရောင်းဈေး:' : 'Price:'}{' '}
                              <span className="font-bold text-slate-700">{formatCurrency(item.price)}</span>
                              {item.cost_price ? (
                                <span className="ml-2 text-slate-400">
                                  • {lang === 'my' ? 'ဝယ်ရင်းဈေး:' : 'Cost:'} {formatCurrency(item.cost_price)}
                                </span>
                              ) : null}
                            </p>
                          </div>

                          {/* Dismiss notification button */}
                          <button
                            type="button"
                            onClick={() => setDismissedLowStockIds(prev => [...prev, item.id])}
                            title={lang === 'my' ? 'ဤသတိပေးချက်ကို ခေတ္တဖျောက်ထားရန်' : 'Dismiss alert'}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/80 transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Middle row: Stock Progress Bar & Threshold Numbers */}
                        <div className="bg-white/90 rounded-xl p-3 border border-slate-200/60 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600">
                              {lang === 'my' ? 'လက်ရှိ လက်ကျန်ပမာဏ:' : 'Current Stock Level:'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-black ${
                                isOut ? 'text-rose-600' : isCritical ? 'text-orange-600' : 'text-amber-700'
                              }`}>
                                {item.stock} {item.unit || 'ခု'}
                              </span>
                              <span className="text-slate-400">/</span>
                              <span className="text-xs font-semibold text-slate-500">
                                {lang === 'my' ? `သတိပေးအမှတ်: ${threshold} ${item.unit || 'ခု'}` : `Min: ${threshold} ${item.unit || 'pc'}`}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOut
                                  ? 'bg-rose-500'
                                  : isCritical
                                    ? 'bg-orange-500'
                                    : 'bg-amber-500'
                              }`}
                              style={{ width: `${ isOut ? 4 : stockPercent }%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              {item.stock < threshold
                                ? (lang === 'my'
                                    ? `သတ်မှတ်ချက်ပြည့်ရန် ${shortageQty} ${item.unit || 'ခု'} လိုအပ်နေပါသည်`
                                    : `${shortageQty} ${item.unit || 'pc'} below minimum threshold`)
                                : (lang === 'my'
                                    ? 'အနည်းဆုံးသတိပေးအမှတ်သို့ ရောက်ရှိနေပါသည်'
                                    : 'At minimum stock threshold')}
                            </span>
                            <span className="font-bold text-slate-700">
                              {stockPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Bottom row: Quick Restock & Purchase Order Actions */}
                        {isQuickRestockOpen ? (
                          <div className="bg-white p-3 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-700">
                                {lang === 'my' ? 'အမြန်ဖြည့်ရန်:' : 'Add Stock:'}
                              </span>
                              {[10, 20, 50].map(presetQty => (
                                <button
                                  key={presetQty}
                                  type="button"
                                  disabled={restockingId === item.id}
                                  onClick={() => handleQuickRestock(item, presetQty)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  +{presetQty}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                value={quickRestockQty}
                                onChange={(e) => setQuickRestockQty(e.target.value)}
                                className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center"
                              />
                              <button
                                type="button"
                                disabled={restockingId === item.id}
                                onClick={() => handleQuickRestock(item, Number(quickRestockQty))}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs disabled:opacity-50"
                              >
                                {restockingId === item.id
                                  ? '...'
                                  : (lang === 'my' ? 'ဖြည့်မည်' : 'Save')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickRestockProductId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={restockingId === item.id}
                                onClick={() => handleQuickRestock(item, 10)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{restockingId === item.id ? '...' : `+10 ${item.unit || ''}`}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setQuickRestockProductId(item.id);
                                  setQuickRestockQty(String(recommendedOrderQty));
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                              >
                                {lang === 'my' ? 'စိတ်ကြိုက်ဖြည့်ရန်' : 'Custom Qty'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveModal('new_purchase');
                                setPurchaseForm({
                                  supplier_id: '',
                                  product_id: String(item.id),
                                  quantity: String(recommendedOrderQty),
                                  cost_price: String(item.cost_price || item.price),
                                  notes: `Low Stock Restock Order for ${item.name} (Current: ${item.stock} ${item.unit || 'pc'})`
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>{lang === 'my' ? 'PO မှာယူရန်' : 'Order PO'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Show More / Show Less Toggle if more than 6 low-stock items */}
              {filteredLowStock.length > 6 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllLowStock(!showAllLowStock)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>
                      {showAllLowStock
                        ? (lang === 'my' ? 'အနည်းငယ်သာ ပြသရန် (Show Less)' : 'Show Less')
                        : (lang === 'my'
                            ? `ကျန်ရှိသော ပစ္စည်း (${filteredLowStock.length - 6}) မျိုးအားလုံး ကြည့်ရန်`
                            : `View All ${filteredLowStock.length} Low Stock Items`)}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllLowStock ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 5. Analytics & Charts Section */}
      <div className="space-y-6">
        
        {/* Daily Sales Revenue Line Chart (Past 7 Days - Pulled from Transaction API) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>{lang === 'my' ? 'လွန်ခဲ့သော ၇ ရက်အတွင်း နေ့စဉ်ရောင်းအား (Daily Sales Revenue)' : 'Daily Sales Revenue (Past 7 Days)'}</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Transaction API
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'my' 
                      ? 'အရောင်းပြေစာမှတ်တမ်း (Transaction API) မှ တိုက်ရိုက်ရယူတွက်ချက်ထားသော နေ့စဉ် အရောင်းဝင်ငွေ လိုင်းဇယား'
                      : 'Visualizing daily sales revenue trend pulled dynamically from transaction records'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Metric Highlights */}
            {(() => {
              const sevenDayTotal = dailyRevenueData.reduce((sum, d) => sum + d.revenue, 0);
              const sevenDayAvg = Math.round(sevenDayTotal / (dailyRevenueData.length || 7));
              const bestDay = dailyRevenueData.reduce((max, d) => d.revenue > max.revenue ? d : max, dailyRevenueData[0] || { revenue: 0, displayDate: '-' });

              return (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="px-3.5 py-2 rounded-xl bg-blue-50/70 border border-blue-100/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">၇ ရက် စုစုပေါင်း</span>
                    <span className="text-sm font-black text-blue-700">{formatCurrency(sevenDayTotal)}</span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">နေ့စဉ် ပျမ်းမျှ</span>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(sevenDayAvg)}</span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-100/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">အရောင်းအများဆုံးနေ့</span>
                    <span className="text-sm font-black text-emerald-700">{formatCurrency(bestDay.revenue)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Recharts Line Chart */}
          <div className="h-[320px] w-full pt-2">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-xs text-slate-400 font-medium animate-pulse flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Transaction ဒေတာများ ဆွဲယူနေပါသည်...</span>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenueData} margin={{ top: 20, right: 25, left: 15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }} 
                    dx={-10} 
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return `${val}`;
                    }} 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DailyRevenueItem;
                        return (
                          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 animate-in fade-in">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
                              <span className="font-bold text-slate-200">{data.displayDate}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{data.dateKey}</span>
                            </div>
                            <div className="pt-0.5">
                              <span className="text-[11px] text-slate-400 block">အရောင်းဝင်ငွေ (Sales Revenue):</span>
                              <span className="text-base font-black text-blue-400">
                                {formatCurrency(data.revenue)}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                              <span>ပြီးစီးခဲ့သော အရောင်း:</span>
                              <span className="font-bold">{data.transactionCount} transactions</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Daily Revenue" 
                    stroke="#2563eb" 
                    strokeWidth={3.5} 
                    dot={{ r: 5, fill: '#2563eb', strokeWidth: 2.5, stroke: '#ffffff' }} 
                    activeDot={{ r: 8, fill: '#1d4ed8', stroke: '#dbeafe', strokeWidth: 3 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Existing Secondary Charts (Weekly Bar & Category Distribution) */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Weekly Sales Performance Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">အပတ်စဉ် ရောင်းအားနှင့် အမြတ် (Weekly Bar Performance)</h3>
                  <p className="text-xs text-slate-500">ရက်အလိုက် ရောင်းအားနှင့် အမြတ်ခွဲခြမ်းမှု</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  7 Days
                </span>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.salesByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">အမျိုးအစားအလိုက် ကုန်ပစ္စည်းများ (Inventory by Category)</h3>
                  <p className="text-xs text-slate-500">လက်ကျန်ကုန်ပစ္စည်းအရေအတွက်</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {overview.totalSales ? 'Stock Active' : ''}
                </span>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.inventoryByCategory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stats.inventoryByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 6. Recent Activity Feed Widget (Real-time Transactions & Inventory Updates) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
        {/* Widget Header */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                  {lang === 'my' ? 'လတ်တလော လှုပ်ရှားမှုများ' : 'Recent Activity Feed'}
                </h3>
                {/* Live Real-time Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    {isAutoPolling && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>{isAutoPolling ? (lang === 'my' ? 'တိုက်ရိုက်လှုပ်ရှားမှု (Live)' : 'Live Feed') : (lang === 'my' ? 'ခေတ္တရပ်ထားသည်' : 'Paused')}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'my' 
                  ? 'အရောင်းပြေစာများနှင့် စတော့အပြောင်းအလဲများကို အချိန်နှင့်တပြေးညီ တိုက်ရိုက်ဖော်ပြပေးနေပါသည်'
                  : 'Real-time feed of latest sales transactions and inventory adjustments'}
              </p>
            </div>
          </div>

          {/* Right Controls: Auto-poll toggle, manual refresh, sync time */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Auto-poll toggle */}
            <button
              onClick={() => setIsAutoPolling(!isAutoPolling)}
              title={isAutoPolling ? 'Pause real-time auto updates' : 'Resume real-time auto updates'}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                isAutoPolling 
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isAutoPolling ? (lang === 'my' ? 'အလိုအလျောက်' : 'Auto 8s') : (lang === 'my' ? 'ရပ်ထားသည်' : 'Paused')}</span>
            </button>

            {/* Manual refresh button */}
            <button
              onClick={() => fetchRecentActivities(false)}
              disabled={activityRefreshing}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${activityRefreshing ? 'animate-spin' : ''}`} />
              <span>{lang === 'my' ? 'လန်းဆန်းစေရန်' : 'Refresh'}</span>
            </button>

            <span className="text-[11px] text-slate-400 hidden xl:inline-block ml-1">
              {lastActivitySync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-xl shadow-xs self-start">
            <button
              onClick={() => setActivityFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activityFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{lang === 'my' ? 'အားလုံး' : 'All'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                activityFilter === 'all' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {activities.length}
              </span>
            </button>
            <button
              onClick={() => setActivityFilter('transaction')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activityFilter === 'transaction'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'အရောင်းများ' : 'Transactions'}</span>
            </button>
            <button
              onClick={() => setActivityFilter('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activityFilter === 'inventory'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'စတော့အပြောင်းအလဲ' : 'Inventory Updates'}</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'my' ? 'ဘောင်ချာ၊ ဝယ်သူ၊ ကုန်ပစ္စည်း ရှာရန်...' : 'Search slip, customer, product...'}
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {activitySearch && (
              <button
                onClick={() => setActivitySearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Activity Feed List */}
        <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
          {(() => {
            const filteredActivities = activities.filter(item => {
              if (!activitySearch) return true;
              const q = activitySearch.toLowerCase();
              return (
                item.title?.toLowerCase().includes(q) ||
                item.subtitle?.toLowerCase().includes(q) ||
                item.customer_name?.toLowerCase().includes(q) ||
                item.slip_number?.toLowerCase().includes(q) ||
                item.reason?.toLowerCase().includes(q)
              );
            });

            if (filteredActivities.length === 0) {
              return (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">
                    {lang === 'my' ? 'မှတ်တမ်းမရှိသေးပါ' : 'No recent activities found'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {activitySearch 
                      ? (lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော မှတ်တမ်း မတွေ့ရှိပါ' : 'No activities matched your search criteria.')
                      : (lang === 'my' ? 'အရောင်းပြုလုပ်ခြင်း သို့မဟုတ် စတော့အပြောင်းအလဲများ ပြုလုပ်ပါက ဤနေရာတွင် တိုက်ရိုက်ပေါ်လာပါမည်' : 'Transactions and inventory adjustments will automatically stream here.')}
                  </p>
                </div>
              );
            }

            return filteredActivities.map((item) => {
              const isTx = item.type === 'transaction';
              return (
                <div 
                  key={item.id}
                  className="p-4 md:px-6 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Item Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isTx 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : (item.quantity_change && item.quantity_change > 0 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-amber-100 text-amber-700')
                    }`}>
                      {isTx ? (
                        <ShoppingCart className="w-5 h-5" />
                      ) : (
                        item.quantity_change && item.quantity_change > 0 ? (
                          <PackagePlus className="w-5 h-5" />
                        ) : (
                          <Package className="w-5 h-5" />
                        )
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                          {item.title}
                        </span>
                        
                        {/* Transaction badges */}
                        {isTx && (
                          <>
                            {item.customer_name && item.customer_name !== 'Walk-in Customer' && (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {item.customer_name}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              item.payment_method === 'kpay' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
                                : item.payment_method === 'wave' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : item.payment_method === 'credit'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            }`}>
                              {item.payment_method}
                            </span>
                            {item.sale_type === 'delivery' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                Delivery
                              </span>
                            )}
                          </>
                        )}

                        {/* Inventory Category badge */}
                        {!isTx && item.category && (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {item.category}
                          </span>
                        )}
                      </div>

                      {/* Reason or Item summary */}
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {isTx ? (
                          item.reason ? `ပစ္စည်းများ: ${item.reason}` : (item.subtitle || 'အရောင်းမှတ်တမ်း')
                        ) : (
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-600 font-medium">{item.reason}</span>
                            {item.current_stock != null && (
                              <span className="text-slate-400">• လက်ကျန်: {item.current_stock} {item.unit}</span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right side: Amount or Quantity change + Relative time */}
                  <div className="text-right shrink-0">
                    {isTx ? (
                      <div className="text-sm md:text-base font-black text-emerald-600 tracking-tight">
                        +{formatCurrency(item.amount || 0)}
                      </div>
                    ) : (
                      <div className={`text-xs md:text-sm font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                        (item.quantity_change || 0) >= 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                      }`}>
                        {(item.quantity_change || 0) >= 0 ? `+${item.quantity_change}` : item.quantity_change} {item.unit}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Footer actions */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium">
            {lang === 'my' 
              ? `စုစုပေါင်း လတ်တလော မှတ်တမ်း ${activities.length} ခုကို တိုက်ရိုက်ပြသထားပါသည်` 
              : `Displaying ${activities.length} real-time recent activities`}
          </span>

          <div className="flex items-center gap-3">
            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('orders')}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>{lang === 'my' ? 'အရောင်းမှတ်တမ်း အပြည့်အစုံ' : 'All Transactions'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => onNavigateTab('inventory')}
                  className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                >
                  <span>{lang === 'my' ? 'စတော့စာရင်း စီမံရန်' : 'Manage Inventory'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 7. Advanced Analytics & Forecasting Section */}
      <div className="border-t border-slate-200 pt-6">
        <AdvancedDashboard />
      </div>

      {/* ================= MODALS ================= */}

      {/* MODAL 1: Add New Product (ကုန်ပစ္စည်းအသစ်ထည့်ရန်) */}
      {activeModal === 'new_product' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-sky-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">ကုန်ပစ္စည်းအသစ် ထည့်သွင်းရန်</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddNewProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ကုန်ပစ္စည်းအမည် *</label>
                <input
                  type="text"
                  required
                  placeholder="ဥပမာ - Biogesic 500mg"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">အမျိုးအစား</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="ဆေးဝါးများ">ဆေးဝါးများ</option>
                    <option value="အားဆေးများ">အားဆေးများ</option>
                    <option value="လူသုံးကုန်">လူသုံးကုန်</option>
                    <option value="စားသောက်ကုန်">စားသောက်ကုန်</option>
                    <option value="အလှကုန်">အလှကုန်</option>
                    <option value="အထွေထွေ">အထွေထွေ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ယူနစ်</label>
                  <input
                    type="text"
                    placeholder="ဗူး / ကတ် / ထုပ်"
                    value={newProductForm.unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ရောင်းဈေး (Ks) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ဝယ်ရင်းဈေး (Ks)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProductForm.cost_price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, cost_price: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">လက်ကျန်အရေအတွက်</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">အနည်းဆုံး သတိပေးအရေအတွက်</label>
                  <input
                    type="number"
                    value={newProductForm.low_stock_threshold}
                    onChange={(e) => setNewProductForm({ ...newProductForm, low_stock_threshold: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  သိမ်းဆည်းမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Purchase (ဝယ်ယူစာရင်းသွင်းရန်) */}
      {activeModal === 'new_purchase' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">ဝယ်ယူမှု စာရင်းသွင်းရန် (Purchase Entry)</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddNewPurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier ရွေးချယ်ရန် *</label>
                <select
                  required
                  value={purchaseForm.supplier_id}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="">-- Supplier ရွေးပါ --</option>
                  {suppliersList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact_person || s.phone || 'Supplier'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">မှာယူမည့် ကုန်ပစ္စည်း *</label>
                <select
                  required
                  value={purchaseForm.product_id}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = productsList.find(p => p.id === Number(pid));
                    setPurchaseForm({
                      ...purchaseForm,
                      product_id: pid,
                      cost_price: prod ? String(prod.cost_price || prod.price) : ''
                    });
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="">-- ပစ္စည်း ရွေးပါ --</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (လက်ကျန်: {p.stock} {p.unit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">အရေအတွက် *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">တစ်ခုချင်း ဝယ်ရင်းဈေး (Ks) *</label>
                  <input
                    type="number"
                    required
                    value={purchaseForm.cost_price}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, cost_price: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">မှတ်ချက် / အော်ဒါအသေးစိတ်</label>
                <textarea
                  rows={2}
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  placeholder="ပစ္စည်းမှာယူမှု မှတ်ချက်"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800 font-semibold flex justify-between">
                <span>စုစုပေါင်း ကုန်ကျငွေ:</span>
                <span>{formatCurrency((Number(purchaseForm.quantity || 0)) * (Number(purchaseForm.cost_price || 0)))}</span>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  ဝယ်ယူမှု အတည်ပြုမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Receive Customer Debt Payment (Customer အကြွေးလက်ခံရန်) */}
      {activeModal === 'customer_debt' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-950 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-800 text-white flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Customer အကြွေး လက်ခံရန်</h3>
                  <p className="text-xs text-indigo-200">အကြွေးဆပ်ငွေ စာရင်းသွင်းခြင်း</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-indigo-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordCustomerDebt} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer ရွေးချယ်ရန် *</label>
                <select
                  required
                  value={debtPaymentForm.customer_id}
                  onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, customer_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="">-- Customer ရွေးပါ --</option>
                  {customersList.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ပြန်လည်ပေးဆပ်မည့်ငွေ (Ks) *</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={debtPaymentForm.amount}
                  onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ငွေပေးချေမှုစနစ်</label>
                  <select
                    value={debtPaymentForm.payment_method}
                    onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="cash">ငွေသား (Cash)</option>
                    <option value="kpay">KPay</option>
                    <option value="wave">WavePay</option>
                    <option value="aya">AYA Pay</option>
                    <option value="bank">ဘဏ်လွှဲငွေ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ပြေစာနံပါတ် (ရှိပါက)</label>
                  <input
                    type="text"
                    placeholder="SLP-..."
                    value={debtPaymentForm.sale_id}
                    onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, sale_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">မှတ်ချက်</label>
                <textarea
                  rows={2}
                  placeholder="အကြွေးဆပ်ပြေစာ မှတ်ချက်"
                  value={debtPaymentForm.notes}
                  onChange={(e) => setDebtPaymentForm({ ...debtPaymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  ငွေလက်ခံမှု သိမ်းဆည်းမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Expense (အသုံးစရိတ်ထည့်ရန်) */}
      {activeModal === 'add_expense' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">အသုံးစရိတ် ထည့်သွင်းရန် (Add Expense)</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ကုန်ကျစရိတ် အမျိုးအစား *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium"
                >
                  <option value="ဆိုင်ခန်းခ">ဆိုင်ခန်းခ (Shop Rent)</option>
                  <option value="ဝန်ထမ်းလစာ">ဝန်ထမ်းလစာ (Staff Salary)</option>
                  <option value="မီးဖိုး / ရေဖိုး">မီးဖိုး / ရေဖိုး (Electricity / Water)</option>
                  <option value="စက်သုံးဆီ / ပို့ဆောင်စရိတ်">စက်သုံးဆီ / ပို့ဆောင်စရိတ် (Logistics / Fuel)</option>
                  <option value="ထုပ်ပိုးပစ္စည်း">ထုပ်ပိုးပစ္စည်း (Packaging / Bags)</option>
                  <option value="ကြော်ငြာစရိတ်">ကြော်ငြာစရိတ် (Marketing / Ads)</option>
                  <option value="အထွေထွေ">အထွေထွေ အသုံးစရိတ် (General Expenses)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ကုန်ကျငွေ (Ks) *</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-rose-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ငွေပေးချေသည့် နည်းလမ်း</label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="cash">ငွေသား (Cash)</option>
                  <option value="kpay">KPay</option>
                  <option value="wave">WavePay</option>
                  <option value="bank_transfer">ဘဏ်လွှဲငွေ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">အသုံးစရိတ် အသေးစိတ် ဖော်ပြချက်</label>
                <textarea
                  rows={2}
                  placeholder="ဥပမာ - မော်လမြိုင်ဆိုင်ခွဲ လစဉ်မီတာခ ပေးချေခြင်း"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  အသုံးစရိတ် မှတ်သားမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Profit & Loss Overview (အရှုံးအမြတ်ကြည့်ရန်) */}
      {activeModal === 'profit_loss' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">အရှုံးအမြတ် အကျဉ်းချုပ် (Profit & Loss)</h3>
                  <p className="text-xs text-slate-500">{branch} &bull; {dateRangeStr}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">စုစုပေါင်း ရောင်းအား (Total Revenue)</span>
                  <span className="text-base font-bold text-slate-900">{formatCurrency(overview.totalSales)}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
                  <span className="text-sm font-medium text-slate-600">စုစုပေါင်း အသုံးစရိတ် (Total Expenses)</span>
                  <span className="text-base font-bold text-rose-600">- {formatCurrency(overview.totalExpenses)}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-sm font-medium text-slate-600">ရရန်ကျန်ငွေ (Receivables / Credit)</span>
                  <span className="text-base font-bold text-amber-600">{formatCurrency(overview.receivables)}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500 text-white shadow-md">
                  <div>
                    <span className="text-sm font-semibold opacity-90 block">အသားတင် ငွေလည်ပတ်မှု (Net Cash Flow)</span>
                    <span className="text-xs opacity-80">လက်ခံရရှိငွေ - ကုန်ကျစရိတ်</span>
                  </div>
                  <span className="text-2xl font-black">{formatCurrency(overview.netFlow)}</span>
                </div>
              </div>

              {/* Recent Expenses List in Modal */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">မကြာသေးမီက အသုံးစရိတ်များ</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                  {overview.recentExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-white rounded-lg border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800">{exp.category}</span>
                        {exp.description && <span className="text-slate-400 ml-2 text-[11px]">&bull; {exp.description}</span>}
                      </div>
                      <span className="font-bold text-rose-600">{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                  {overview.recentExpenses.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-3">အသုံးစရိတ် မရှိသေးပါ</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveModal('none')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  ပိတ်မည်
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL 1: Low Stock Items (Stock နည်းနေသောအပစ္စည်း) */}
      {activeModal === 'alert_low_stock' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Stock နည်းနေသော ကုန်ပစ္စည်းများ</h3>
                  <p className="text-xs text-amber-800 font-medium">စုစုပေါင်း {overview.lowStockCount} မျိုး ပြန်လည်ဖြည့်တင်းရန် လိုအပ်သည်</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-80 overflow-y-auto space-y-2">
                {overview.lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.category} &bull; ရောင်းဈေး: {formatCurrency(p.price)}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className={`text-sm font-extrabold ${p.stock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                          {p.stock} {p.unit || 'ခု'}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">သတိပေးသတ်မှတ်: {p.low_stock_threshold}</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveModal('new_purchase');
                          setPurchaseForm({
                            supplier_id: '',
                            product_id: String(p.id),
                            quantity: '20',
                            cost_price: String(p.cost_price || p.price),
                            notes: `Restock for ${p.name}`
                          });
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                      >
                        + မှာယူရန်
                      </button>
                    </div>
                  </div>
                ))}
                {overview.lowStockProducts.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Stock နည်းနေသော ပစ္စည်းမရှိပါ ✨
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                >
                  ပိတ်မည်
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL 2: Overdue Customer Debts (Customer အကြွေးရက်ကျော်) */}
      {activeModal === 'alert_customer_debts' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Customer အကြွေးရက်ကျော် စာရင်း</h3>
                  <p className="text-xs text-rose-800 font-medium">စုစုပေါင်း {overview.overdueCustomerCount} ခု ရက်ကျော်လွန်နေပါသည်</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-80 overflow-y-auto space-y-2">
                {overview.overdueCustomers.map(c => (
                  <div key={c.sale_id} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{c.customer_name}</span>
                        {c.slip_number && <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">{c.slip_number}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">ဖုန်း: {c.phone || 'မရှိ'} &bull; လိပ်စာ: {c.address || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-sm font-black text-rose-600 block">{formatCurrency(c.total_amount)}</span>
                        <span className="text-[11px] text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full font-semibold">
                          {c.days_overdue > 0 ? `${c.days_overdue} ရက်ကျော်` : 'ရက်ကျော်'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setActiveModal('customer_debt');
                          setDebtPaymentForm({
                            customer_id: String(c.customer_id || ''),
                            sale_id: String(c.sale_id),
                            amount: String(c.total_amount),
                            payment_method: 'cash',
                            notes: `Repayment for ${c.slip_number || `Sale #${c.sale_id}`}`
                          });
                        }}
                        className="px-3 py-1.5 bg-indigo-900 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm"
                      >
                        အကြွေးဆပ်ရန်
                      </button>
                    </div>
                  </div>
                ))}
                {overview.overdueCustomers.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    ရက်ကျော် Customer အကြွေးမရှိပါ ✨
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                >
                  ပိတ်မည်
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL 3: Overdue Supplier Payables (Supplier ပေးရန်ရက်ကျော်) */}
      {activeModal === 'alert_supplier_debts' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Supplier ပေးရန်ရက်ကျော် စာရင်း</h3>
                  <p className="text-xs text-purple-800 font-medium">ပေးချေရန်ကျန်ရှိသော အော်ဒါ {overview.overdueSupplierCount} ခု</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-80 overflow-y-auto space-y-2">
                {overview.overdueSuppliers.map(po => (
                  <div key={po.po_id} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{po.supplier_name}</span>
                        <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">PO #{po.po_id}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">မှာယူသည့်ရက်: {po.created_at?.split(' ')[0]} &bull; ဖုန်း: {po.supplier_phone || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-sm font-black text-purple-700 block">{formatCurrency(po.total_amount)}</span>
                        <span className="text-[10px] text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full font-semibold uppercase">
                          {po.payment_status}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePaySupplierPO(po.po_id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                      >
                        ငွေပေးချေပြီး
                      </button>
                    </div>
                  </div>
                ))}
                {overview.overdueSuppliers.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Supplier သို့ ပေးရန်ကျန် မရှိပါ ✨
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                >
                  ပိတ်မည်
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL 4: Pending Deliveries (ပို့ဆောင်ရန်ကျန်) */}
      {activeModal === 'alert_deliveries' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">ပို့ဆောင်ရန်ကျန် အော်ဒါများ (Deliveries)</h3>
                  <p className="text-xs text-blue-800 font-medium">စုစုပေါင်း {overview.pendingDeliveryCount} ခု ပို့ဆောင်ရန် စောင့်ဆိုင်းနေပါသည်</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-80 overflow-y-auto space-y-2">
                {overview.pendingDeliveries.map(del => (
                  <div key={del.sale_id} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{del.customer_name}</span>
                        {del.slip_number && <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">{del.slip_number}</span>}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">လိပ်စာ: {del.delivery_address || 'ဆိုင်မှ လာယူမည်'}</p>
                      <p className="text-[11px] text-slate-400">ဖုန်း: {del.delivery_phone || 'မရှိ'} &bull; ရက်စွဲ: {del.created_at}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-sm font-black text-blue-600 block">{formatCurrency(del.total_amount)}</span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold uppercase">
                          {del.delivery_status || 'Pending'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCompleteDelivery(del.sale_id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        ပို့ပြီး
                      </button>
                    </div>
                  </div>
                ))}
                {overview.pendingDeliveries.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    ပို့ဆောင်ရန်ကျန် အော်ဒါမရှိပါ ✨
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                >
                  ပိတ်မည်
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
