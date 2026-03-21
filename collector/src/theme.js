const lightColors = {
  primary: '#0f1623',
  primaryLight: '#1a2332',
  accent: '#22c55e',
  accentDark: '#16a34a',
  accentLight: '#dcfce7',
  accentMist: 'rgba(34,197,94,0.08)',
  critical: '#ef4444',
  criticalLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef9c3',
  background: '#f0f4f0',
  backgroundGreen: '#e8f5e8',
  card: '#ffffff',
  cardBorder: '#e2e6ef',
  cardGlass: 'rgba(255,255,255,0.85)',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  shadow: '#000',
};

const darkColors = {
  primary: '#e5e7eb',
  primaryLight: '#2a2d42',
  accent: '#22c55e',
  accentDark: '#16a34a',
  accentLight: 'rgba(34,197,94,0.15)',
  accentMist: 'rgba(34,197,94,0.08)',
  critical: '#ef4444',
  criticalLight: 'rgba(239,68,68,0.15)',
  warning: '#f59e0b',
  warningLight: 'rgba(245,158,11,0.15)',
  background: '#1a1d29',
  backgroundGreen: '#1e2a22',
  card: '#222536',
  cardBorder: '#2a2d3e',
  cardGlass: 'rgba(34,37,54,0.85)',
  text: '#f3f4f6',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  shadow: '#000',
};

export const getColors = (dark) => dark ? darkColors : lightColors;
export const colors = lightColors;

export const gradients = {
  greenButton: ['#22c55e', '#15803d'],
  greenBanner: ['#16a34a', '#166534'],
  greenSoft: ['#f0fdf4', '#dcfce7'],
  greenMist: ['rgba(34,197,94,0.06)', 'rgba(34,197,94,0.02)'],
  darkOverlay: ['rgba(15,22,35,0.85)', 'rgba(15,22,35,0.95)'],
  screenBg: ['#eef5ee', '#f5f9f5', '#fafcfa'],
  screenBgDark: ['#1a1d29', '#1e2130', '#222536'],
  screenBgWarm: ['#f0f7f0', '#f8faf8', '#ffffff'],
  profileHero: ['#1a3a2a', '#0f2318'],
  cardShine: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
  criticalPulse: ['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.05)'],
  warningPulse: ['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)'],
};

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
  bottom: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
};
