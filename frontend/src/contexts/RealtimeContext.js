import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getWsUrl, getToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((cb) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);

  useEffect(() => {
    if (!user || !getToken()) return;
    let stopped = false;
    let retry = 0;
    const connect = () => {
      if (stopped) return;
      try {
        const ws = new WebSocket(getWsUrl());
        wsRef.current = ws;
        ws.onopen = () => { setConnected(true); retry = 0; };
        ws.onclose = () => {
          setConnected(false);
          if (stopped) return;
          retry = Math.min(retry + 1, 5);
          setTimeout(connect, 500 * retry);
        };
        ws.onerror = () => { try { ws.close(); } catch {} };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            listenersRef.current.forEach((cb) => cb(data));
          } catch {}
        };
      } catch { setTimeout(connect, 1000); }
    };
    connect();
    return () => { stopped = true; try { wsRef.current?.close(); } catch {} };
  }, [user]);

  return <RealtimeContext.Provider value={{ connected, subscribe }}>{children}</RealtimeContext.Provider>;
}
export const useRealtime = () => useContext(RealtimeContext);
