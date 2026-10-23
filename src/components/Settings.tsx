import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Store,
  Globe,
  Phone,
  MapPin,
  DollarSign,
  Coins,
  Clock,
  Database,
  Download,
  CheckCircle2,
  AlertCircle,
  Package,
  Receipt,
  Users,
  RefreshCw,
  FileJson,
  Eye,
  EyeOff,
  Copy,
  Check,
  HardDrive
} from 'lucide-react';
import { useStore } from '../StoreContext';

interface BackupPayload {
  metadata: {
    appName: string;
    backupVersion: string;
    exportedAt: string;
    storeName: string;
    currency: string;
  };
  summary: {
    totalProducts: number;
    totalStockUnits: number;
    totalTransactions: number;
    totalSaleLineItems: number;
    totalRevenue: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalPurchaseOrders: number;
    totalExpenses: number;
    totalStockAdjustments: number;
  };
  data: {
    store_profile: any;
    products: any[];
    transactions: any[];
    sales: any[];
    sale_items: any[];
    customers: any[];
    customer_payments: any[];
    suppliers: any[];
    purchase_orders: any[];
    purchase_order_items: any[];
    expenses: any[];
    stock_adjustments: any[];
    cash_movements: any[];
    sale_returns: any[];
    users: any[];
  };
}

export default function Settings() {
  const { storeProfile, refreshStoreProfile } = useStore();
  const [loading, setLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    phone: '',
    address: '',
    currency: 'MMK',
    currency_symbol: 'MMK',
    timezone: 'UTC'
  });

  // Database Backup states
  const [backupPreview, setBackupPreview] = useState<BackupPayload | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [backupScope, setBackupScope] = useState<'full' | 'products_transactions'>('full');
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pos_last_backup_at');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (storeProfile) {
      setFormData({
        name: storeProfile.name || '',
        website: storeProfile.website || '',
        phone: storeProfile.phone || '',
        address: storeProfile.address || '',
        currency: storeProfile.currency || 'MMK',
        currency_symbol: storeProfile.currency_symbol || 'MMK',
        timezone: storeProfile.timezone || 'UTC'
      });
    }
  }, [storeProfile]);

  const fetchDatabaseSnapshot = useCallback(async (): Promise<BackupPayload | null> => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/database/backup');
      if (res.ok) {
        const payload: BackupPayload = await res.json();
        setBackupPreview(payload);
        return payload;
      }

      // Fallback assembly if /api/database/backup is not reachable
      const [productsRes, ordersRes, customersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders'),
        fetch('/api/customers')
      ]);
      const products = productsRes.ok ? await productsRes.json() : [];
      const transactions = ordersRes.ok ? await ordersRes.json() : [];
      const customers = customersRes.ok ? await customersRes.json() : [];

      const fallbackPayload: BackupPayload = {
        metadata: {
          appName: 'A_Yaung POS System',
          backupVersion: '1.0',
          exportedAt: new Date().toISOString(),
          storeName: formData.name || storeProfile?.name || 'ရတနာ (မော်လမြိုင်)',
          currency: formData.currency || 'MMK'
        },
        summary: {
          totalProducts: Array.isArray(products) ? products.length : 0,
          totalStockUnits: Array.isArray(products)
            ? products.reduce((sum: number, p: any) => sum + (Number(p.stock) || 0), 0)
            : 0,
          totalTransactions: Array.isArray(transactions) ? transactions.length : 0,
          totalSaleLineItems: Array.isArray(transactions)
            ? transactions.reduce((sum: number, t: any) => sum + (Array.isArray(t.items) ? t.items.length : 0), 0)
            : 0,
          totalRevenue: Array.isArray(transactions)
            ? transactions
                .filter((t: any) => t.status === 'completed')
                .reduce((sum: number, t: any) => sum + (Number(t.total_amount) || 0), 0)
            : 0,
          totalCustomers: Array.isArray(customers) ? customers.length : 0,
          totalSuppliers: 0,
          totalPurchaseOrders: 0,
          totalExpenses: 0,
          totalStockAdjustments: 0
        },
        data: {
          store_profile: storeProfile || formData,
          products: Array.isArray(products) ? products : [],
          transactions: Array.isArray(transactions) ? transactions : [],
          sales: Array.isArray(transactions) ? transactions : [],
          sale_items: [],
          customers: Array.isArray(customers) ? customers : [],
          customer_payments: [],
          suppliers: [],
          purchase_orders: [],
          purchase_order_items: [],
          expenses: [],
          stock_adjustments: [],
          cash_movements: [],
          sale_returns: [],
          users: []
        }
      };
      setBackupPreview(fallbackPayload);
      return fallbackPayload;
    } catch (error) {
      console.error('Failed to fetch database snapshot:', error);
      return null;
    } finally {
      setLoadingStats(false);
    }
  }, [formData, storeProfile]);

  useEffect(() => {
    fetchDatabaseSnapshot();
  }, [fetchDatabaseSnapshot]);

  const buildScopedBackupObject = (snapshot: BackupPayload) => {
    const exportedAt = new Date().toISOString();
    if (backupScope === 'products_transactions') {
      return {
        metadata: {
          ...snapshot.metadata,
          exportedAt,
          backupScope: 'products_and_transactions'
        },
        summary: {
          totalProducts: snapshot.summary.totalProducts,
          totalStockUnits: snapshot.summary.totalStockUnits,
          totalTransactions: snapshot.summary.totalTransactions,
          totalSaleLineItems: snapshot.summary.totalSaleLineItems,
          totalRevenue: snapshot.summary.totalRevenue
        },
        data: {
          products: snapshot.data.products,
          transactions: snapshot.data.transactions,
          sales: snapshot.data.sales,
          sale_items: snapshot.data.sale_items
        }
      };
    }

    return {
      ...snapshot,
      metadata: {
        ...snapshot.metadata,
        exportedAt,
        backupScope: 'full_database'
      }
    };
  };

  const handleBackupDatabase = async () => {
    setIsDownloadingBackup(true);
    setStatusBanner(null);
    try {
      const freshSnapshot = (await fetchDatabaseSnapshot()) || backupPreview;
      if (!freshSnapshot) {
        setStatusBanner({
          type: 'error',
          message: 'Failed to generate database backup. Please try again.'
        });
        return;
      }

      const finalBackupObject = buildScopedBackupObject(freshSnapshot);
      const jsonString = JSON.stringify(finalBackupObject, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const dateStamp = now.toISOString().split('T')[0];
      const timeStamp = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const scopeSuffix = backupScope === 'full' ? 'full' : 'products-transactions';
      const fileName = `ayaung-pos-backup-${scopeSuffix}-${dateStamp}_${timeStamp}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const savedTimestamp = now.toISOString();
      setLastBackupAt(savedTimestamp);
      try {
        localStorage.setItem('pos_last_backup_at', savedTimestamp);
      } catch {}

      setStatusBanner({
        type: 'success',
        message: `Database backup downloaded (${fileName}) — ${freshSnapshot.summary.totalProducts} products & ${freshSnapshot.summary.totalTransactions} transactions saved.`
      });
    } catch (error) {
      console.error('Database backup error:', error);
      setStatusBanner({
        type: 'error',
        message: 'An error occurred while creating the backup file.'
      });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleCopyBackupJson = async () => {
    if (!backupPreview) return;
    try {
      const scoped = buildScopedBackupObject(backupPreview);
      await navigator.clipboard.writeText(JSON.stringify(scoped, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const currency = e.target.value;
    let symbol = '$';
    if (currency === 'EUR') symbol = '€';
    else if (currency === 'GBP') symbol = '£';
    else if (currency === 'JPY') symbol = '¥';
    else if (currency === 'MMK') symbol = 'MMK';
    else if (currency === 'INR') symbol = '₹';
    else if (currency === 'AUD') symbol = 'A$';
    else if (currency === 'CAD') symbol = 'C$';
    
    setFormData(prev => ({ ...prev, currency, currency_symbol: symbol }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/store-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await refreshStoreProfile();
        setStatusBanner({
          type: 'success',
          message: 'Store profile updated successfully!'
        });
      } else {
        setStatusBanner({
          type: 'error',
          message: 'Failed to update store profile.'
        });
      }
    } catch (error) {
      console.error('Failed to update store profile:', error);
      setStatusBanner({
        type: 'error',
        message: 'An error occurred while updating store settings.'
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedSizeKb = backupPreview
    ? Math.max(
        1,
        Math.round(
          new Blob([JSON.stringify(buildScopedBackupObject(backupPreview), null, 2)]).size / 1024
        )
      )
    : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Store Settings & Database Backup</h2>
          <p className="text-slate-500 mt-1">Manage your store profile, regional preferences, and manual JSON database backups.</p>
        </div>
        <button
          type="button"
          onClick={handleBackupDatabase}
          disabled={isDownloadingBackup}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {isDownloadingBackup ? 'Preparing Backup...' : 'Backup Database (.JSON)'}
        </button>
      </header>

      {statusBanner && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Manual Database Backup Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-emerald-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Database Backup & Export (ဒေတာဘေ့စ် အရန်သိမ်းဆည်းခြင်း)
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Download a complete JSON snapshot of your current product catalog, inventory stock, and sales transaction history.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDatabaseSnapshot}
            disabled={loadingStats}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh Counts
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Live Database Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                <span>Products (ကုန်ပစ္စည်း)</span>
                <Package className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {backupPreview ? backupPreview.summary.totalProducts.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {backupPreview ? `${backupPreview.summary.totalStockUnits.toLocaleString()} total stock units` : 'Loading...'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                <span>Transactions (အရောင်းဘောင်ချာ)</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {backupPreview ? backupPreview.summary.totalTransactions.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {backupPreview ? `${backupPreview.summary.totalSaleLineItems.toLocaleString()} line items recorded` : 'Loading...'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                <span>Customers & Suppliers</span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {backupPreview
                  ? (backupPreview.summary.totalCustomers + backupPreview.summary.totalSuppliers).toLocaleString()
                  : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {backupPreview
                  ? `${backupPreview.summary.totalCustomers} customers • ${backupPreview.summary.totalSuppliers} suppliers`
                  : 'Loading...'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                <span>Estimated Backup Size</span>
                <HardDrive className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {backupPreview ? `~${estimatedSizeKb} KB` : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                {lastBackupAt
                  ? `Last: ${new Date(lastBackupAt).toLocaleString()}`
                  : 'No manual backup yet'}
              </div>
            </div>
          </div>

          {/* Scope selector & Action controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-indigo-900 block">
                Backup Content Scope
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="backupScope"
                    value="full"
                    checked={backupScope === 'full'}
                    onChange={() => setBackupScope('full')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium">Full Database</span>
                  <span className="text-xs text-slate-500">(Products, Transactions, Customers, POs, Expenses & Settings)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="backupScope"
                    value="products_transactions"
                    checked={backupScope === 'products_transactions'}
                    onChange={() => setBackupScope('products_transactions')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium">Products & Transactions Only</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowJsonPreview(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {showJsonPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showJsonPreview ? 'Hide Preview' : 'Preview JSON'}
              </button>

              <button
                type="button"
                onClick={handleBackupDatabase}
                disabled={isDownloadingBackup}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <FileJson className="w-4 h-4" />
                {isDownloadingBackup ? 'Creating JSON...' : 'Backup Database'}
              </button>
            </div>
          </div>

          {/* Optional Collapsible JSON Preview */}
          {showJsonPreview && backupPreview && (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 text-xs text-slate-300">
                <span className="font-mono">
                  ayaung-pos-backup-{backupScope === 'full' ? 'full' : 'products-transactions'}.json
                </span>
                <button
                  type="button"
                  onClick={handleCopyBackupJson}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto max-h-80 leading-relaxed text-emerald-300">
                {JSON.stringify(buildScopedBackupObject(backupPreview), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Store Profile Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            Store Profile
          </h3>
          <p className="text-sm text-slate-500 mt-1">This information will be displayed on receipts and reports.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-400" />
                Store Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="e.g. My Awesome Store"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="https://www.example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
                placeholder="123 Main St, City, Country"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-md font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Currency & Regional
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-slate-400" />
                  Primary Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleCurrencyChange}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="JPY">JPY (¥) - Japanese Yen</option>
                  <option value="MMK">MMK - Myanmar Kyat</option>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="AUD">AUD (A$) - Australian Dollar</option>
                  <option value="CAD">CAD (C$) - Canadian Dollar</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  name="currency_symbol"
                  required
                  value={formData.currency_symbol}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  placeholder="$"
                />
                <p className="text-xs text-slate-500 mt-1">This symbol will be used across the application.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Time Zone
                </label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Asia/Yangon">Asia/Yangon (MMT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Used for POS and reports.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

