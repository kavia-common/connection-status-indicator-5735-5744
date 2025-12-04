import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ConnectionStatusBar from '../components/ConnectionStatusBar';

// Helper to dispatch window events
function dispatchWindowEvent(type) {
  const evt = new Event(type);
  window.dispatchEvent(evt);
}

describe('ConnectionStatusBar', () => {
  const originalNavigator = { ...navigator };

  beforeEach(() => {
    // Mock navigator.onLine with getter
    let isOnline = true;
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get() {
        return isOnline;
      },
      set(v) {
        isOnline = v;
      }
    });
    // Ensure env WS URL is not set to keep tests simple
    process.env.REACT_APP_WS_URL = '';
  });

  afterEach(() => {
    // Restore navigator
    try {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get() {
          return originalNavigator.onLine;
        }
      });
    } catch (_) {
      // ignore
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('renders with role=status and shows Online when navigator is online', () => {
    render(<ConnectionStatusBar />);
    const bar = screen.getByRole('status');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveTextContent(/Online/i);
  });

  test('transitions to Offline when offline event dispatched', () => {
    render(<ConnectionStatusBar />);
    const bar = screen.getByRole('status');

    // Simulate offline
    act(() => {
      // Set offline via setter defined in beforeEach
      window.navigator.onLine = false;
      dispatchWindowEvent('offline');
    });

    expect(bar).toHaveTextContent(/Offline/i);

    // Back online
    act(() => {
      window.navigator.onLine = true;
      dispatchWindowEvent('online');
    });

    expect(bar).toHaveTextContent(/Online/i);
  });

  test('accepts position prop bottom', () => {
    render(<ConnectionStatusBar position="bottom" />);
    const bar = screen.getByRole('status');
    expect(bar.className).toMatch(/csb--bottom/);
  });

  test('renders DB details when showDbDetails is true', () => {
    render(<ConnectionStatusBar showDbDetails />);
    const dbGroup = screen.getByRole('group', { name: /database details/i });
    expect(dbGroup).toBeInTheDocument();

    // labels present
    expect(dbGroup).toHaveTextContent(/Name:/i);
    expect(dbGroup).toHaveTextContent(/Type:/i);
    expect(dbGroup).toHaveTextContent(/Host:/i);
    expect(dbGroup).toHaveTextContent(/Region:/i);
    expect(dbGroup).toHaveTextContent(/Version:/i);

    // latency/status chips present
    const latencyNode = screen.getByTestId('db-latency');
    const statusNode = screen.getByTestId('db-status');
    expect(latencyNode).toBeInTheDocument();
    expect(statusNode).toBeInTheDocument();
    expect(latencyNode.textContent).toMatch(/Latency: \d+ ms/);
  });

  test('latency updates over time using fake timers', () => {
    jest.useFakeTimers();
    render(<ConnectionStatusBar showDbDetails />);

    const latencyNode = screen.getByTestId('db-latency');
    const firstText = latencyNode.textContent;

    // The interval is 10-15s; advance 16s to be safe
    act(() => {
      jest.advanceTimersByTime(16000);
    });

    const secondText = latencyNode.textContent;
    // Chance exists to match, but extremely low; if flaky, we still accept difference check
    expect(secondText).not.toBe(firstText);
  });
});
