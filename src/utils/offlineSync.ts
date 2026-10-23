import { useState, useEffect, useCallback } from 'react';
import { Product, Customer } from '../types';

export interface OfflineSaleItem {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  cost_price?: number;
  unit?: string;
}

export interface OfflineSaleRecord {
  id: string;
  offlineSlipNumber: string;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  customerName?: string | null;
  customerId?: number | null;
  saleType: 'store' | 'online';
  cashierName: string;
  paymentMethod: string;
  items: OfflineSaleItem[];
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  syncedAt?: string;
  serverSaleId?: number;
  syncError?: string;
}

const DB_NAME = 'A_Yaung_POS_Offline_DB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_sales';
const STORAGE_BACKUP_KEY = 'pos_offline_sales_cache';
const PRODUCTS_CACHE_KEY = 'pos_cached_products_offline';
const CUSTOMERS_CACHE_KEY = 'pos_cached_customers_offline';
const SIMULATED_OFFLINE_KEY = 'pos_simulated_offline';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fallback to localStorage
function getLocalStorageBackup(): OfflineSaleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStorageBackup(sales: OfflineSaleRecord[]) {
  try {
    localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(sales));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

// Retrieve all offline sales from IndexedDB (or fallback)
export async function getOfflineSales(): Promise<OfflineSaleRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as OfflineSaleRecord[]) || [];
        // Sort newest first
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      request.onerror = () => {
        resolve(getLocalStorageBackup());
      };
    });
  } catch {
    return getLocalStorageBackup();
  }
}

// Save a new sale record created while offline
export async function saveOfflineSale(
  data: Omit<OfflineSaleRecord, 'id' | 'offlineSlipNumber' | 'createdAt' | 'status'>
): Promise<OfflineSaleRecord> {
  const timestamp = new Date().toISOString();
  const id = `off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const offlineSlipNumber = `OFF-${Date.now().toString().slice(-6)}`;

  const record: OfflineSaleRecord = {
    ...data,
    id,
    offlineSlipNumber,
    createdAt: timestamp,
    status: 'pending'
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Saving to IndexedDB failed, using localStorage fallback:', e);
  }

  // Always update fallback mirror
  const currentBackup = getLocalStorageBackup();
  currentBackup.unshift(record);
  setLocalStorageBackup(currentBackup);

  // Update cached offline stock
  deductOfflineStock(record.items);

  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('pos-offline-sales-changed', { detail: { record } }));

  return record;
}

// Update an offline sale status
export async function updateOfflineSale(record: OfflineSaleRecord): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB update failed:', e);
  }

  const currentBackup = getLocalStorageBackup();
  const idx = currentBackup.findIndex(s => s.id === record.id);
  if (idx !== -1) {
    currentBackup[idx] = record;
  } else {
    currentBackup.unshift(record);
  }
  setLocalStorageBackup(currentBackup);

  window.dispatchEvent(new CustomEvent('pos-offline-sales-changed'));
}

// Delete an offline sale
export async function deleteOfflineSale(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB delete failed:', e);
  }

  const currentBackup = getLocalStorageBackup().filter(s => s.id !== id);
  setLocalStorageBackup(currentBackup);

  window.dispatchEvent(new CustomEvent('pos-offline-sales-changed'));
}

// Clear all already synced offline records
export async function clearSyncedOfflineSales(): Promise<void> {
  const all = await getOfflineSales();
  const remaining = all.filter(s => s.status !== 'synced');

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      remaining.forEach(item => store.put(item));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.warn('IndexedDB clear synced failed:', e);
  }

  setLocalStorageBackup(remaining);
  window.dispatchEvent(new CustomEvent('pos-offline-sales-changed'));
}

// Cache products & customers locally for offline POS operations
export function cachePOSDataLocally(products: Product[], customers: Customer[]) {
  try {
    if (products && products.length > 0) {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
    }
    if (customers && customers.length > 0) {
      localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers));
    }
  } catch (e) {
    console.error('Failed to cache POS data locally:', e);
  }
}

export function getCachedPOSProducts(): Product[] | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCachedPOSCustomers(): Customer[] | null {
  try {
    const raw = localStorage.getItem(CUSTOMERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Deduct local offline stock so subsequent scans show updated counts
function deductOfflineStock(items: OfflineSaleItem[]) {
  try {
    const products = getCachedPOSProducts();
    if (!products) return;

    items.forEach(it => {
      const prod = products.find(p => p.id === it.product_id);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.quantity);
      }
    });

    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch (e) {
    console.error('Failed to deduct offline stock:', e);
  }
}

// Master synchronization function
export async function syncOfflineSalesToServer(): Promise<{
  success: boolean;
  syncedCount: number;
  totalPending: number;
  error?: string;
}> {
  const allSales = await getOfflineSales();
  const pendingSales = allSales.filter(s => s.status === 'pending' || s.status === 'failed');

  if (pendingSales.length === 0) {
    return { success: true, syncedCount: 0, totalPending: 0 };
  }

  // Mark status as 'syncing'
  for (const s of pendingSales) {
    s.status = 'syncing';
    await updateOfflineSale(s);
  }

  try {
    const payload = {
      sales: pendingSales.map(s => ({
        offline_id: s.id,
        offline_slip: s.offlineSlipNumber,
        total_amount: s.totalAmount,
        discount_amount: s.discountAmount,
        tax_amount: s.taxAmount,
        customer_name: s.customerName,
        customer_id: s.customerId,
        sale_type: s.saleType,
        cashier_name: s.cashierName,
        payment_method: s.paymentMethod,
        created_at: s.createdAt,
        items: s.items.map(it => ({
          product_id: it.product_id,
          quantity: it.quantity,
          price: it.price,
          cost_price: it.cost_price || 0
        }))
      }))
    };

    const res = await fetch('/api/sales/sync-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const syncedMap = new Map<string, { serverSaleId: number; slipNumber: string }>();
      (data.synced || []).forEach((item: any) => {
        syncedMap.set(item.offlineId, {
          serverSaleId: item.serverSaleId,
          slipNumber: item.slipNumber
        });
      });

      for (const s of pendingSales) {
        const syncInfo = syncedMap.get(s.id);
        s.status = 'synced';
        s.syncedAt = new Date().toISOString();
        if (syncInfo) {
          s.serverSaleId = syncInfo.serverSaleId;
        }
        await updateOfflineSale(s);
      }

      window.dispatchEvent(new CustomEvent('pos-offline-sync-completed', {
        detail: { count: pendingSales.length }
      }));

      return {
        success: true,
        syncedCount: pendingSales.length,
        totalPending: 0
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      const errorMsg = errData.error || 'Server rejected sync request';
      for (const s of pendingSales) {
        s.status = 'failed';
        s.syncError = errorMsg;
        await updateOfflineSale(s);
      }
      return {
        success: false,
        syncedCount: 0,
        totalPending: pendingSales.length,
        error: errorMsg
      };
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Network error during synchronization';
    for (const s of pendingSales) {
      s.status = 'failed';
      s.syncError = errorMsg;
      await updateOfflineSale(s);
    }
    return {
      success: false,
      syncedCount: 0,
      totalPending: pendingSales.length,
      error: errorMsg
    };
  }
}

// React Hook to access offline sync state and actions in components
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState(() => {
    try {
      return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [sales, setSales] = useState<OfflineSaleRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const effectiveIsOnline = isOnline && !simulatedOffline;

  const refreshSales = useCallback(async () => {
    const data = await getOfflineSales();
    setSales(data);
  }, []);

  const syncNow = useCallback(async () => {
    if (!effectiveIsOnline || isSyncing) return false;
    setIsSyncing(true);
    setSyncNotice(null);

    const result = await syncOfflineSalesToServer();
    await refreshSales();
    setIsSyncing(false);
    setLastSyncTime(new Date());

    if (result.success && result.syncedCount > 0) {
      setSyncNotice(`Synced ${result.syncedCount} offline transaction${result.syncedCount > 1 ? 's' : ''} to database!`);
      setTimeout(() => setSyncNotice(null), 4000);
      return true;
    } else if (!result.success) {
      setSyncNotice(`Sync failed: ${result.error || 'Network error'}`);
      setTimeout(() => setSyncNotice(null), 4000);
      return false;
    }
    return true;
  }, [effectiveIsOnline, isSyncing, refreshSales]);

  const toggleSimulatedOffline = useCallback(() => {
    setSimulatedOffline(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIMULATED_OFFLINE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // Set up listeners for online/offline & custom sync events
  useEffect(() => {
    refreshSales();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync when coming back online
      if (!simulatedOffline) {
        setTimeout(() => syncNow(), 800);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSalesChanged = () => {
      refreshSales();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pos-offline-sales-changed', handleSalesChanged);

    // Periodic check & auto-sync every 25 seconds when online
    const interval = setInterval(() => {
      if (effectiveIsOnline) {
        syncNow();
      }
    }, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pos-offline-sales-changed', handleSalesChanged);
      clearInterval(interval);
    };
  }, [effectiveIsOnline, simulatedOffline, refreshSales, syncNow]);

  const pendingSales = sales.filter(s => s.status === 'pending' || s.status === 'failed' || s.status === 'syncing');
  const pendingCount = pendingSales.length;

  return {
    isOnline: effectiveIsOnline,
    rawNavigatorOnline: isOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    pendingCount,
    pendingSales,
    allSales: sales,
    isSyncing,
    lastSyncTime,
    syncNotice,
    syncNow,
    refreshSales,
    removeSale: deleteOfflineSale,
    clearSynced: clearSyncedOfflineSales
  };
}
