/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Settings, 
  BarChart3, 
  Users as UsersIcon, 
  ClipboardList, 
  DollarSign, 
  LogOut, 
  Shield, 
  Truck, 
  RotateCcw,
  Calculator,
  Bell,
  Globe,
  Plus,
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Transactions from './components/Transactions';
import CashDrawer from './components/CashDrawer';
import Login from './components/Login';
import Users from './components/Users';
import SettingsComponent from './components/Settings';
import Suppliers from './components/Suppliers';
import Purchases from './components/Purchases';
import SaleReturns from './components/SaleReturns';
import { useStore } from './StoreContext';
import { useOfflineSync } from './utils/offlineSync';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const { lang, setLang } = useStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'orders' | 'inventory' | 'reports' | 'customers' | 'cash' | 'users' | 'settings' | 'suppliers' | 'purchases' | 'returns'>('dashboard');
  const [user, setUser] = useState<{ id: number; username: string; role: string } | null>({
    id: 1,
    username: 'Yadanar',
    role: 'admin'
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGlobalSyncModal, setShowGlobalSyncModal] = useState(false);
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  // Fetch alert count for the top notification bell
  useEffect(() => {
    window.fetch('/api/dashboard/overview')
      .then(res => res.json())
      .then(data => {
        if (data) {
          const total = (data.lowStockCount || 0) + (data.overdueCustomerCount || 0) + (data.overdueSupplierCount || 0) + (data.pendingDeliveryCount || 0);
          setAlertCount(total);
        }
      })
      .catch(() => {});
  }, [activeTab]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  // Calculator button click
  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else if (val === '=') {
      try {
        // Safe evaluation for basic math
        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcResult(String(res));
      } catch {
        setCalcResult('Error');
      }
    } else {
      setCalcInput(prev => prev + val);
    }
  };

  const isMyanmar = lang === 'my';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shrink-0`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
              AP
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 truncate">
                  Ayar POS
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">ရတနာဆိုင်ခွဲ</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {sidebarOpen && (
          <div className="mx-4 mt-3 mb-1 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user.username}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user.role}</p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {(user.role === 'admin' || user.role === 'manager') && (
            <button
              onClick={() => setActiveTab('dashboard')}
              title={isMyanmar ? 'ပင်မ' : 'Dashboard'}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{isMyanmar ? 'ပင်မ' : 'Dashboard'}</span>}
            </button>
          )}

          <button
            onClick={() => setActiveTab('pos')}
            title={isMyanmar ? 'အရောင်းများ' : 'Point of Sale'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'pos'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{isMyanmar ? 'အရောင်းများ' : 'Point of Sale'}</span>}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            title={isMyanmar ? 'ဘောင်ချာများ' : 'Transactions'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{isMyanmar ? 'ဘောင်ချာများ' : 'Transactions'}</span>}
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            title={isMyanmar ? 'ပြန်အပ်စာရင်း' : 'Sale Returns'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'returns'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{isMyanmar ? 'ပြန်အပ်စာရင်း' : 'Sale Returns'}</span>}
          </button>

          <button
            onClick={() => setActiveTab('cash')}
            title={isMyanmar ? 'ငွေစာရင်း' : 'Cash Drawer'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'cash'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{isMyanmar ? 'ငွေစာရင်း' : 'Cash Drawer'}</span>}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            title={isMyanmar ? 'Customer များ' : 'Customers'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'customers'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <UsersIcon className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{isMyanmar ? 'Customer များ' : 'Customers'}</span>}
          </button>

          {(user.role === 'admin' || user.role === 'manager') && (
            <>
              <button
                onClick={() => setActiveTab('inventory')}
                title={isMyanmar ? 'ကုန်ပစ္စည်းများ' : 'Inventory'}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'inventory'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Package className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{isMyanmar ? 'ကုန်ပစ္စည်းများ' : 'Inventory'}</span>}
              </button>

              <button
                onClick={() => setActiveTab('purchases')}
                title={isMyanmar ? 'ဝယ်ယူမှုများ' : 'Purchases'}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'purchases'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Truck className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{isMyanmar ? 'ဝယ်ယူမှုများ' : 'Purchases'}</span>}
              </button>

              <button
                onClick={() => setActiveTab('suppliers')}
                title={isMyanmar ? 'Supplier များ' : 'Suppliers'}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'suppliers'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <UsersIcon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{isMyanmar ? 'Supplier များ' : 'Suppliers'}</span>}
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                title={isMyanmar ? 'အစီရင်ခံစာများ' : 'Reports'}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{isMyanmar ? 'အစီရင်ခံစာများ' : 'Reports'}</span>}
              </button>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                title={isMyanmar ? 'အသုံးပြုသူများ' : 'User Management'}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Shield className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{isMyanmar ? 'အသုံးပြုသူများ' : 'Users'}</span>}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                title={isMyanmar ? 'ဆက်တင်များ' : 'Settings'}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{isMyanmar ? 'ဆက်တင်များ' : 'Settings'}</span>}
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            title={isMyanmar ? 'ထွက်မည်' : 'Sign Out'}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{isMyanmar ? 'ထွက်မည်' : 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header Bar (Matching photo navbar) */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-3">
            {/* Quick POS button */}
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isMyanmar ? '+ အရောင်းအသစ်' : '+ New Sale'}</span>
            </button>
          </div>

          {/* Top Controls: Offline Status, PWA Install, Calculator, Language Toggle, Notification Bell, User Avatar */}
          <div className="flex items-center gap-2.5">
            {/* Global Offline / Sync Status Pill */}
            <button
              onClick={() => setShowGlobalSyncModal(true)}
              title="Offline Mode & Sync Queue"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                !isOnline
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                  : pendingCount > 0
                    ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                    : 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              )}
              <span className="hidden md:inline">
                {isOnline ? (isMyanmar ? 'အွန်လိုင်း' : 'Online') : (isMyanmar ? 'အော့ဖ်လိုင်း' : 'Offline')}
              </span>
              {pendingCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isOnline ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <PWAInstallButton compact />

            {/* Calculator Button */}
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              title="Calculator"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            >
              <Calculator className="w-5 h-5" />
            </button>

            {/* Language Switch [MM | EN] */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setLang('my')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'my' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                MM
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'en' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
            </div>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setActiveTab('dashboard')}
              title="Notifications / Alerts"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-800 hidden sm:inline">{user.username}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user.username}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{user.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('settings');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {isMyanmar ? 'ဆိုင်ဆက်တင်' : 'Store Settings'}
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    {isMyanmar ? 'အကောင့်ထွက်မည်' : 'Logout'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-slate-50">
          {activeTab === 'dashboard' && (user.role === 'admin' || user.role === 'manager') && (
            <Dashboard onNavigateTab={setActiveTab} />
          )}
          {activeTab === 'pos' && <POS user={user} />}
          {activeTab === 'orders' && <Transactions />}
          {activeTab === 'returns' && <SaleReturns />}
          {activeTab === 'cash' && <CashDrawer />}
          {activeTab === 'inventory' && (user.role === 'admin' || user.role === 'manager') && <Inventory />}
          {activeTab === 'suppliers' && (user.role === 'admin' || user.role === 'manager') && <Suppliers />}
          {activeTab === 'purchases' && (user.role === 'admin' || user.role === 'manager') && <Purchases />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'reports' && (user.role === 'admin' || user.role === 'manager') && <Reports />}
          {activeTab === 'users' && user.role === 'admin' && <Users />}
          {activeTab === 'settings' && user.role === 'admin' && <SettingsComponent />}
        </main>
      </div>

      {/* Floating Calculator Popup */}
      {showCalculator && (
        <div className="fixed top-20 right-6 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-blue-600" />
              တွက်ချက်စက် (Calculator)
            </span>
            <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-slate-100 p-3 rounded-xl mb-3 text-right">
            <div className="text-xs text-slate-400 h-4 font-mono truncate">{calcInput || '0'}</div>
            <div className="text-xl font-black text-slate-900 font-mono truncate">{calcResult || '0'}</div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm font-bold">
            {['C', '/', '*', '-'].map(btn => (
              <button
                key={btn}
                onClick={() => handleCalcBtn(btn)}
                className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl"
              >
                {btn}
              </button>
            ))}
            {['7', '8', '9', '+'].map(btn => (
              <button
                key={btn}
                onClick={() => handleCalcBtn(btn)}
                className={`py-2.5 rounded-xl ${btn === '+' ? 'bg-slate-200 hover:bg-slate-300' : 'bg-slate-50 hover:bg-slate-100'} text-slate-800`}
              >
                {btn}
              </button>
            ))}
            {['4', '5', '6', '='].map((btn, idx) => (
              <button
                key={btn}
                onClick={() => handleCalcBtn(btn)}
                className={`py-2.5 rounded-xl ${btn === '=' ? 'row-span-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'}`}
              >
                {btn}
              </button>
            ))}
            {['1', '2', '3'].map(btn => (
              <button
                key={btn}
                onClick={() => handleCalcBtn(btn)}
                className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl"
              >
                {btn}
              </button>
            ))}
            {['0', '.'].map((btn, idx) => (
              <button
                key={btn}
                onClick={() => handleCalcBtn(btn)}
                className={`py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl ${btn === '0' ? 'col-span-2' : ''}`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      <OfflineSyncModal
        isOpen={showGlobalSyncModal}
        onClose={() => setShowGlobalSyncModal(false)}
      />

    </div>
  );
}
