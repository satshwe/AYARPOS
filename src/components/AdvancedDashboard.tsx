import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useStore } from '../StoreContext';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Wallet,
  Calendar as CalendarIcon,
  ChevronDown,
  Download,
  Clock,
  BarChart3
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

type Timeframe = 'Today' | 'Yesterday' | 'This Week' | 'Last Week' | 'This Month' | 'Last Month' | 'This Year' | 'Custom';

// Mock data generator based on timeframe
const generateMockData = (timeframe: Timeframe) => {
  const data = [];
  let points = 7;
  let labelPrefix = 'Day ';

  if (timeframe.includes('Today') || timeframe.includes('Yesterday')) {
    points = 24;
    labelPrefix = '';
  } else if (timeframe.includes('Month')) {
    points = 30;
    labelPrefix = 'Day ';
  } else if (timeframe.includes('Year')) {
    points = 12;
    labelPrefix = 'Month ';
  }

  let currentBase = Math.random() * 1000 + 500;
  let previousBase = currentBase * (Math.random() * 0.4 + 0.8); // 80% to 120% of current

  for (let i = 1; i <= points; i++) {
    const currentVal = Math.max(0, currentBase + (Math.random() * 400 - 200));
    const previousVal = Math.max(0, previousBase + (Math.random() * 400 - 200));
    
    let label = `${labelPrefix}${i}`;
    if (points === 24) label = `${i - 1}:00`;
    if (points === 12) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      label = months[i - 1];
    }

    data.push({
      label,
      current: currentVal,
      previous: previousVal,
    });
    
    currentBase = currentVal;
    previousBase = previousVal;
  }

  // Calculate totals
  const currentTotal = data.reduce((sum, item) => sum + item.current, 0);
  const previousTotal = data.reduce((sum, item) => sum + item.previous, 0);
  const profitMargin = 0.35; // 35% profit margin
  
  const currentTransactions = Math.floor(currentTotal / 45); // Avg $45 per transaction
  const previousTransactions = Math.floor(previousTotal / 45);

  return {
    chartData: data,
    kpis: {
      grossSales: {
        current: currentTotal,
        previous: previousTotal,
        change: ((currentTotal - previousTotal) / previousTotal) * 100
      },
      netProfit: {
        current: currentTotal * profitMargin,
        previous: previousTotal * profitMargin,
        change: ((currentTotal - previousTotal) / previousTotal) * 100
      },
      transactions: {
        current: currentTransactions,
        previous: previousTransactions,
        change: ((currentTransactions - previousTransactions) / previousTransactions) * 100
      },
      cashInDrawer: {
        current: 450.00 + (Math.random() * 200), // Mock physical cash
        previous: 400.00,
        change: 0 // Not typically compared this way, but we can show a stable indicator
      }
    },
    cashMovement: {
      startingCash: 250.00,
      cashSales: currentTotal * 0.4, // Assume 40% are cash sales
      refunds: currentTotal * 0.02, // 2% refunds
      expectedEnding: 250.00 + (currentTotal * 0.4) - (currentTotal * 0.02)
    }
  };
};

export default function AdvancedDashboard() {
  const { formatCurrency } = useStore();
  const [timeframe, setTimeframe] = useState<Timeframe>('Today');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [salesPerformance, setSalesPerformance] = useState<any>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/dashboard/sales-performance')
      .then(res => res.json())
      .then(data => setSalesPerformance(data))
      .catch(err => console.error('Failed to fetch sales performance', err));
  }, []);

  const timeframes: Timeframe[] = [
    'Today', 'Yesterday', 'This Week', 'Last Week', 
    'This Month', 'Last Month', 'This Year', 'Custom'
  ];

  const data = useMemo(() => generateMockData(timeframe), [timeframe]);

  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  const downloadDashboard = async () => {
    if (!dashboardRef.current) return;
    
    try {
      setIsDownloading(true);
      
      const node = dashboardRef.current;
      const originalStyle = node.getAttribute('style') || '';
      
      // Force desktop layout for the capture
      node.style.width = '1200px';
      node.style.padding = '24px';
      node.style.margin = '0';
      node.style.backgroundColor = '#f8fafc';
      
      // Wait for Recharts to resize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const scale = 2;
      
      const dataUrl = await htmlToImage.toPng(node, {
        height: node.offsetHeight,
        width: 1200,
        pixelRatio: scale,
        backgroundColor: '#f8fafc',
        filter: (el: any) => !el.classList?.contains('no-print')
      });
      
      // Restore original style
      node.setAttribute('style', originalStyle);
      
      const pdfWidth = 297; // A4 landscape width in mm
      const pdfHeight = (node.offsetHeight * pdfWidth) / 1200;
      
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`advanced_dashboard_${timeframe.toLowerCase().replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error('Error downloading dashboard:', error);
      alert('Failed to download dashboard. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderKPIBadge = (change: number, isCurrency = false) => {
    const isPositive = change >= 0;
    const absChange = Math.abs(change).toFixed(1);
    
    return (
      <div className={`flex items-center mt-2 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
        <span>{isPositive ? '+' : '-'}{absChange}%</span>
        <span className="text-slate-500 font-normal text-xs ml-2">vs previous period</span>
      </div>
    );
  };

  const renderPerformanceCard = (title: string, value: number, change: number, icon: React.ReactNode, comparisonText: string) => {
    const isPositive = change >= 0;
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <h4 className="text-slate-500 font-medium">{title}</h4>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
            {icon}
          </div>
        </div>
        <div className="mt-auto">
          <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(value)}</h3>
          <div className={`flex items-center mt-2 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
            <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
            <span className="text-slate-400 font-normal ml-2">vs {comparisonText}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={dashboardRef} className="space-y-8 animate-in fade-in duration-500">
      {/* Sales Performance Section */}
      {salesPerformance && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sales Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderPerformanceCard('Daily Sales', salesPerformance.daily.current, salesPerformance.daily.change, <Clock className="w-5 h-5" />, 'yesterday')}
            {renderPerformanceCard('Weekly Sales', salesPerformance.weekly.current, salesPerformance.weekly.change, <CalendarIcon className="w-5 h-5" />, 'last week')}
            {renderPerformanceCard('Monthly Sales', salesPerformance.monthly.current, salesPerformance.monthly.change, <BarChart3 className="w-5 h-5" />, 'last month')}
            {renderPerformanceCard('Yearly Sales', salesPerformance.yearly.current, salesPerformance.yearly.change, <TrendingUp className="w-5 h-5" />, 'last year')}
          </div>
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Analytics & Forecasting</h3>
          <p className="text-slate-500 text-sm mt-1">Detailed performance metrics and cash flow analysis.</p>
        </div>
        
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={downloadDashboard}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-slate-500" />
            {isDownloading ? 'Exporting...' : 'Export PDF'}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            {timeframe}
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    timeframe === tf ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="space-y-6 bg-slate-50 p-1 -m-1 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Gross Sales</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(data.kpis.grossSales.current)}</h3>
          {renderKPIBadge(data.kpis.grossSales.change)}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Net Profit</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(data.kpis.netProfit.current)}</h3>
          {renderKPIBadge(data.kpis.netProfit.change)}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Total Transactions</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatNumber(data.kpis.transactions.current)}</h3>
          {renderKPIBadge(data.kpis.transactions.change)}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Cash in Drawer</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(data.kpis.cashInDrawer.current)}</h3>
          <div className="flex items-center mt-2 text-sm font-medium text-slate-500">
            <span>Physical cash balance</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Sales Comparison</h3>
            <div className="flex items-center text-sm">
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></div>
                <span className="text-slate-600 font-medium">Current Period</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-slate-300 mr-2"></div>
                <span className="text-slate-600 font-medium">Previous Period</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dx={-10} 
                  tickFormatter={(value) => formatCurrency(value)} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'current' ? 'Current Period' : 'Previous Period'
                  ]}
                  labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="previous" 
                  stroke="#cbd5e1" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#cbd5e1', stroke: '#fff', strokeWidth: 2 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Movement Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Cash Movement Summary</h3>
          
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Starting Cash</span>
              <span className="font-bold text-slate-900">{formatCurrency(data.cashMovement.startingCash)}</span>
            </div>
            
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mr-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-slate-600">Cash Sales</span>
              </div>
              <span className="font-medium text-emerald-600">+{formatCurrency(data.cashMovement.cashSales)}</span>
            </div>
            
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center mr-2">
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                </div>
                <span className="text-slate-600">Refunds / Payouts</span>
              </div>
              <span className="font-medium text-rose-600">-{formatCurrency(data.cashMovement.refunds)}</span>
            </div>
            
              <div className="mt-auto pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <span className="text-indigo-900 font-semibold">Expected Ending Cash</span>
                  <span className="text-xl font-bold text-indigo-700">{formatCurrency(data.cashMovement.expectedEnding)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
