import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app and connection status bar', () => {
  render(<App />);
  const bar = screen.getByRole('status');
  expect(bar).toBeInTheDocument();
});
