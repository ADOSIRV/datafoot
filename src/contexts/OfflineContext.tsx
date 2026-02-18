import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncOfflineActions, refreshLocalCache } from '../services/sync';
import { getPendingActions } from '../services/offline';

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  triggerSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = async () => {
    const actions = await getPendingActions();
    setPendingCount(actions.length);
  };

  const triggerSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      await syncOfflineActions();
      await refreshLocalCache();
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    refreshPending();

    const onOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncing, triggerSync }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used inside OfflineProvider');
  return ctx;
}
