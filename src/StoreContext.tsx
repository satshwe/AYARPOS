import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StoreProfile } from './types';

interface StoreContextType {
  storeProfile: StoreProfile | null;
  refreshStoreProfile: () => Promise<void>;
  formatCurrency: (amount: number, hideSymbol?: boolean) => string;
  lang: 'my' | 'en';
  setLang: (lang: 'my' | 'en') => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [lang, setLang] = useState<'my' | 'en'>('my'); // Default to Myanmar as requested

  const refreshStoreProfile = async (retries = 3) => {
    try {
      const res = await window.fetch('/api/store-profile');
      if (res.ok) {
        const data = await res.json();
        setStoreProfile(data);
      } else if (retries > 0) {
        setTimeout(() => refreshStoreProfile(retries - 1), 1000);
      }
    } catch (error) {
      console.error('Failed to fetch store profile:', error);
      if (retries > 0) {
        setTimeout(() => refreshStoreProfile(retries - 1), 1000);
      }
    }
  };

  useEffect(() => {
    refreshStoreProfile();
  }, []);

  const formatCurrency = (amount: number, hideSymbol = false) => {
    const symbol = storeProfile?.currency_symbol || 'Ks';
    const num = Math.round(amount || 0);
    const formattedNum = new Intl.NumberFormat('en-US').format(num);
    if (hideSymbol) return formattedNum;
    return `${symbol} ${formattedNum}`;
  };

  return (
    <StoreContext.Provider value={{ storeProfile, refreshStoreProfile, formatCurrency, lang, setLang }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
