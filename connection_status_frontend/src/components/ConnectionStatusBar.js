import React from 'react';
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
 * 
 * Role: "status" with aria-live="polite" to announce non-intrusive updates.
 */
export default function ConnectionStatusBar({ position = 'top', className = '', style = {} }) {
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
    </div>
  );
}

ConnectionStatusBar.propTypes = {
  position: PropTypes.oneOf(['top', 'bottom']),
  className: PropTypes.string,
  style: PropTypes.object,
};
