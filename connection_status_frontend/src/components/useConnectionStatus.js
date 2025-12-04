import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * useConnectionStatus
 * Tracks connection status using navigator.onLine and optional WebSocket connection.
 * Exposes:
 *   { status, lastChangedAt, error, attempts }
 * 
 * States:
 *  - 'connecting': initial and when retrying socket
 *  - 'online': socket open (if WS enabled) or navigator.onLine true without WS
 *  - 'reconnecting': lost socket while navigator is online (if WS enabled)
 *  - 'offline': navigator offline
 */
export function useConnectionStatus() {
  const wsUrl = process.env.REACT_APP_WS_URL;
  const wsEnabled = typeof wsUrl === 'string' && wsUrl.trim().length > 0;

  const [status, setStatus] = useState(() => {
    if (!wsEnabled) {
      return navigator.onLine ? 'online' : 'offline';
    }
    return navigator.onLine ? 'connecting' : 'offline';
  });
  const [lastChangedAt, setLastChangedAt] = useState(Date.now());
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const wsRef = useRef(null);
  const retryTimerRef = useRef(null);
  const unmountedRef = useRef(false);

  // Compute next backoff with jitter; base delays cap around 10-15s
  const getDelay = useMemo(() => {
    const base = [1000, 2000, 4000, 8000, 12000, 15000]; // ms
    return (n) => {
      const idx = Math.min(n, base.length - 1);
      const max = base[idx];
      const jitter = Math.floor(Math.random() * Math.floor(max * 0.2)); // up to +20%
      return max + jitter;
    };
  }, []);

  const updateStatus = (next, err = null) => {
    setStatus((prev) => {
      if (prev !== next) {
        setLastChangedAt(Date.now());
      }
      return next;
    });
    if (err) setError(err);
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const closeSocket = () => {
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      } catch (_) {
        // ignore
      }
      wsRef.current = null;
    }
  };

  const scheduleReconnect = () => {
    clearRetryTimer();
    setAttempts((prev) => {
      const nextAttempt = prev + 1;
      const delay = getDelay(nextAttempt);
      if (!navigator.onLine) {
        // If offline, do not schedule yet; set to offline
        updateStatus('offline');
        return prev;
      }
      updateStatus('reconnecting');
      retryTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) {
          openSocket();
        }
      }, delay);
      return nextAttempt;
    });
  };

  const openSocket = () => {
    if (!wsEnabled || !navigator.onLine) {
      updateStatus(navigator.onLine ? (wsEnabled ? 'connecting' : 'online') : 'offline');
      return;
    }
    try {
      updateStatus('connecting');
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setAttempts(0);
        updateStatus('online');
      };

      socket.onclose = () => {
        // If navigator is offline, reflect that; else reconnect
        if (!navigator.onLine) {
          updateStatus('offline');
        } else {
          scheduleReconnect();
        }
      };

      socket.onerror = (evt) => {
        // Capture minimal error info
        setError('WebSocket error');
        try {
          // Some environments provide message on evt
          // eslint-disable-next-line no-unused-expressions
          evt && evt.message;
        } catch (_) {
          // ignore
        }
      };

      // We don't process messages; presence is sufficient
      socket.onmessage = () => {};
    } catch (e) {
      setError(e?.message || String(e));
      scheduleReconnect();
    }
  };

  useEffect(() => {
    unmountedRef.current = false;

    const handleOnline = () => {
      // When coming online, either consider online (no WS) or attempt to connect WS
      if (wsEnabled) {
        openSocket();
      } else {
        updateStatus('online');
      }
    };

    const handleOffline = () => {
      clearRetryTimer();
      closeSocket();
      updateStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connect if needed
    if (wsEnabled && navigator.onLine) {
      openSocket();
    }

    return () => {
      unmountedRef.current = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearRetryTimer();
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsEnabled, wsUrl]);

  return { status, lastChangedAt, error, attempts };
}
