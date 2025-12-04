import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useConnectionStatus } from './useConnectionStatus';

/**
 * PUBLIC_INTERFACE
 * ConnectionStatusBar
 * Accessible, fixed-position status bar indicating connection status.
 * Props:
 *  - position: "top" | "bottom" (default: "top")
 *  - className: optional additional class names
 *  - style: inline styles override
 *  - showDbDetails: boolean to toggle mock database details (default: true)
 *
 * Role: "status" with aria-live="polite" to announce non-intrusive updates.
 */
export default function ConnectionStatusBar({
  position = 'top',
  className = '',
  style = {},
  showDbDetails = true
}) {
  const { status, error, attempts } = useConnectionStatus();

  // Map status to icon and text
  const statusMap = {
    online: { text: 'Online', icon: '✓' },
    offline: { text: 'Offline', icon: '⚠' },
    reconnecting: { text: 'Reconnecting…', icon: '⟳' },
    connecting: { text: 'Connecting…', icon: '⟳' },
  };

  const { text, icon } = statusMap[status] || { text: 'Status', icon: '' };

  const variantClass = `csb--${status}`;
  const positionClass = position === 'bottom' ? 'csb--bottom' : 'csb--top';

  /**
   * Lightweight mock DB generator
   * - Deterministic per page load for static fields using a seeded RNG
   * - Latency and status update periodically
   */
  const seededRandom = (seed) => {
    // Simple LCG for deterministic randomness per load
    let _seed = seed >>> 0;
    return () => {
      _seed = (1664525 * _seed + 1013904223) >>> 0;
      return _seed / 0xffffffff;
    };
  };

  const makeStaticDbInfo = () => {
    // Seed based on time truncated to minute to keep same during a short session
    const seedBase = Math.floor(Date.now() / 60000);
    const rand = seededRandom(seedBase);

    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const dbTypes = [
      { type: 'Postgres', icon: '🐘' },
      { type: 'MySQL', icon: '🗄️' },
      { type: 'MongoDB', icon: '🍃' },
      { type: 'SQLite', icon: '🧩' },
      { type: 'MariaDB', icon: '🐬' },
    ];
    const regions = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-south-1', 'eu-west-1'];
    const hosts = ['db01.example.net', 'db-core.internal', 'cluster-a.local', 'db-node-7.lab', 'edge-db-2.site'];
    const versions = ['14.8', '8.0.36', '7.0.12', '3.45', '10.11'];
    const names = ['app_core', 'analytics', 'customers', 'events', 'session_store'];

    const chosen = pick(dbTypes);
    return {
      name: pick(names),
      type: chosen.type,
      typeIcon: chosen.icon,
      host: pick(hosts),
      region: pick(regions),
      version: pick(versions),
    };
  };

  const [dbStatic] = useState(makeStaticDbInfo);
  const [dbDynamic, setDbDynamic] = useState(() => ({
    latency: Math.floor(8 + Math.random() * 150),
    status: 'healthy',
    // Used to trigger screen reader updates
    updatedAt: Date.now(),
  }));

  const intervalRef = useRef(null);

  const nextLatency = useMemo(() => {
    return () => Math.floor(8 + Math.random() * 212); // 8–220 ms approx
  }, []);

  useEffect(() => {
    if (!showDbDetails) return undefined;

    // Update every 10–15 seconds
    const period = 10000 + Math.floor(Math.random() * 5000);

    intervalRef.current = setInterval(() => {
      setDbDynamic((prev) => {
        const flip = Math.random() < 0.15; // low probability status flip
        const nextStatus = flip
          ? (prev.status === 'healthy' ? 'degraded' : 'healthy')
          : prev.status;
        return {
          latency: nextLatency(),
          status: nextStatus,
          updatedAt: Date.now(),
        };
      });
    }, period);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [showDbDetails, nextLatency]);

  // Styling helpers for db status chip
  const dbStatusColor = dbDynamic.status === 'healthy' ? 'var(--csb-online-fg)' : '#FFD966';
  const dbStatusBg = dbDynamic.status === 'healthy' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';

  return (
    <div
      className={`csb ${variantClass} ${positionClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
      style={style}
      data-status={status}
    >
      <span className="csb__icon" aria-hidden="true">{icon}</span>
      <span className="csb__text">
        {text}
        {status !== 'online' && attempts > 0 ? ` (attempt ${attempts})` : ''}
      </span>
      {error ? (
        <span className="csb__sr-only" aria-live="polite">
          {` Last error: ${String(error)}`}
        </span>
      ) : null}

      {showDbDetails && (
        <div
          role="group"
          aria-label="Database details"
          style={{
            // Card-like surface integrated with current bar
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '8px 10px',
            marginLeft: 12,
            fontSize: 13,
            lineHeight: 1.2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            maxWidth: '90vw'
          }}
          data-testid="db-details"
        >
          <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true">🗄️</span>
            DB
          </span>
          <span><strong>Name:</strong> {dbStatic.name}</span>
          <span><strong>Type:</strong> <span aria-label={`${dbStatic.type} icon`} title={dbStatic.type}>{dbStatic.typeIcon}</span> {dbStatic.type}</span>
          <span><strong>Host:</strong> {dbStatic.host}</span>
          <span><strong>Region:</strong> {dbStatic.region}</span>
          <span><strong>Version:</strong> {dbStatic.version}</span>

          <span
            aria-live="polite"
            data-testid="db-latency"
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.06)',
              color: 'inherit'
            }}
          >
            ⏱️ Latency: {dbDynamic.latency} ms
          </span>

          <span
            aria-live="polite"
            data-testid="db-status"
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: dbStatusBg,
              color: dbStatusColor,
              border: '1px solid rgba(0,0,0,0.08)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {dbDynamic.status === 'healthy' ? '✅' : '🟡'} Status: {dbDynamic.status}
          </span>
        </div>
      )}
    </div>
  );
}

ConnectionStatusBar.propTypes = {
  position: PropTypes.oneOf(['top', 'bottom']),
  className: PropTypes.string,
  style: PropTypes.object,
  showDbDetails: PropTypes.bool,
};
