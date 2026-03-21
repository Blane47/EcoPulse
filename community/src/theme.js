const lightColors = {
  primary: '#0f1623',
  accent: '#22c55e',
  accentDark: '#16a34a',
  accentLight: '#dcfce7',
  critical: '#ef4444',
  criticalLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef9c3',
  background: '#f0f2f8',
  card: '#ffffff',
  cardBorder: '#e2e6ef',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
};

const darkColors = {
  primary: '#e5e7eb',
  accent: '#22c55e',
  accentDark: '#16a34a',
  accentLight: 'rgba(34,197,94,0.15)',
  critical: '#ef4444',
  criticalLight: 'rgba(239,68,68,0.15)',
  warning: '#f59e0b',
  warningLight: 'rgba(245,158,11,0.15)',
  background: '#1a1d29',
  card: '#222536',
  cardBorder: '#2a2d3e',
  text: '#f3f4f6',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
};

export const getColors = (dark) => dark ? darkColors : lightColors;
export const colors = lightColors;

export const shadows = {
  card: {
    shadowColor: '#6454a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  cardHover: {
    shadowColor: '#6454a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  soft: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};
