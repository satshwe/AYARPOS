import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  X, 
  Database, 
  ShieldCheck, 
  ArrowRight,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useOfflineSync, OfflineSaleRecord } from '../utils/offlineSync';
import { useStore } from '../StoreContext';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt?: (record: OfflineSaleRecord) => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  onViewReceipt
}) => {
  const { 
    isOnline, 
    simulatedOffline, 
    toggleSimulatedOffline, 
    pendingCount, 
    pendingSales, 
    allSales, 
    isSyncing, 
    lastSyncTime, 
    syncNotice, 
    syncNow, 
    removeSale, 
    clearSynced 
  } = useOfflineSync();

  const { formatCurrency } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isOnline ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
            }`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Offline Sales & Auto-Sync
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isOnline 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
                  {isOnline ? 'Online (အွန်လိုင်း)' : 'Offline Mode (အော့ဖ်လိုင်း)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Service Worker active • Transactions cached locally during outages & synced automatically
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Notification Banner */}
        {syncNotice && (
          <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 text-indigo-900 text-xs flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {/* Offline Simulation / Diagnostic Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Simulate Offline Mode (အော့ဖ်လိုင်းစနစ် စမ်းသပ်ခြင်း)
              </span>
              <p className="text-[11px] text-slate-500">
                Toggle this to test caching offline transactions without turning off your actual WiFi/Ethernet connection.
              </p>
            </div>
            <button
              onClick={toggleSimulatedOffline}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                simulatedOffline
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
            >
              {simulatedOffline ? 'Simulating Offline (Active)' : 'Normal Online Mode'}
            </button>
          </div>

          {/* Sync Stats Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">Pending to Sync</span>
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                <span>{pendingCount}</span>
                <span className="text-[11px] font-normal text-slate-400">sales</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">Synced Records</span>
              <div className="text-xl font-bold text-emerald-600 mt-1 flex items-baseline gap-1">
                <span>{allSales.filter(s => s.status === 'synced').length}</span>
                <span className="text-[11px] font-normal text-slate-400">sales</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">Last Sync Attempt</span>
              <div className="text-xs font-semibold text-slate-700 mt-2 truncate">
                {lastSyncTime ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Ready'}
              </div>
            </div>
          </div>

          {/* Pending Sales List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Offline Queue ({pendingCount} pending)
              </h4>
              {allSales.some(s => s.status === 'synced') && (
                <button
                  onClick={clearSynced}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear synced history
                </button>
              )}
            </div>

            {allSales.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                <p className="text-xs font-medium text-slate-600">All transactions are fully synchronized with the server.</p>
                <p className="text-[11px] text-slate-400">Any transactions made while offline will appear here and sync automatically.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {allSales.map((sale) => (
                  <div 
                    key={sale.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-indigo-300"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {sale.offlineSlipNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.status === 'synced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.status === 'syncing'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : sale.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sale.status === 'synced' ? 'Synced (သိမ်းဆည်းပြီး)' :
                           sale.status === 'syncing' ? 'Syncing...' :
                           sale.status === 'failed' ? 'Failed' : 'Pending Sync'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(sale.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {sale.customerName || 'Walk-in Customer'}
                        </span>
                        <span>•</span>
                        <span>{sale.items.length} item{sale.items.length > 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{sale.cashierName || 'Cashier'}</span>
                      </div>

                      {sale.syncError && (
                        <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {sale.syncError}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block sm:hidden">Total:</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onViewReceipt && (
                          <button
                            onClick={() => onViewReceipt(sale)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-xs"
                            title="View Receipt Preview"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        {sale.status !== 'synced' && (
                          <button
                            onClick={() => removeSale(sale.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                            title="Discard offline record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offline Architecture Info Note */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong>Offline Resilience Engine:</strong> The POS automatically catches connection drops, writes sales to encrypted IndexedDB on your device, and prints receipts with zero interruption. Once reconnected, transactions are synced immediately without losing sales data or inventory counts.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>IndexedDB + ServiceWorker Cache</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
            <button
              onClick={() => syncNow()}
              disabled={isSyncing || pendingCount === 0 || !isOnline}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now (ချက်ချင်းဆင့်ခ်လုပ်ရန်)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
