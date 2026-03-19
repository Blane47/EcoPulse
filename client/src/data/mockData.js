// ============ ZONES ============
export const zones = ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'];

// ============ BINS ============
export const bins = [
  {
    id: 'BIN-001',
    location: 'University Entrance A',
    zone: 'Molyko',
    type: 'General',
    fillLevel: 92,
    lastCollected: '2hr ago',
    collector: 'John N.',
    lat: 4.1560,
    lng: 9.2965,
    status: 'critical',
  },
  {
    id: 'BIN-042',
    location: 'Market Square North',
    zone: 'Bonduma',
    type: 'Recyclable',
    fillLevel: 68,
    lastCollected: '4hr ago',
    collector: 'Samuel T.',
    lat: 4.1510,
    lng: 9.2410,
    status: 'warning',
  },
  {
    id: 'BIN-015',
    location: 'Council Chambers',
    zone: 'Buea Town',
    type: 'Organic',
    fillLevel: 45,
    lastCollected: '1d ago',
    collector: 'Francis B.',
    lat: 4.1555,
    lng: 9.2320,
    status: 'optimal',
  },
  {
    id: 'BIN-108',
    location: 'Police Station Row',
    zone: 'Molyko',
    type: 'General',
    fillLevel: 35,
    lastCollected: '3hr ago',
    collector: 'Abiba L.',
    lat: 4.1600,
    lng: 9.2900,
    status: 'optimal',
  },
  {
    id: 'BIN-023',
    location: 'Soppo Market',
    zone: 'Great Soppo',
    type: 'General',
    fillLevel: 78,
    lastCollected: '5hr ago',
    collector: 'Kevin B.',
    lat: 4.1480,
    lng: 9.2580,
    status: 'warning',
  },
  {
    id: 'BIN-056',
    location: 'Molyko Junction',
    zone: 'Molyko',
    type: 'Recyclable',
    fillLevel: 15,
    lastCollected: '1hr ago',
    collector: 'Emmanuel N.',
    lat: 4.1575,
    lng: 9.2850,
    status: 'empty',
  },
  {
    id: 'BIN-077',
    location: 'Bonduma Park',
    zone: 'Bonduma',
    type: 'Organic',
    fillLevel: 88,
    lastCollected: '6hr ago',
    collector: 'Amadou J.',
    lat: 4.1525,
    lng: 9.2450,
    status: 'critical',
  },
  {
    id: 'BIN-033',
    location: 'Great Soppo Road',
    zone: 'Great Soppo',
    type: 'General',
    fillLevel: 52,
    lastCollected: '3hr ago',
    collector: 'Samuel T.',
    lat: 4.1490,
    lng: 9.2550,
    status: 'optimal',
  },
  {
    id: 'BIN-091',
    location: 'Buea Town Hall',
    zone: 'Buea Town',
    type: 'Recyclable',
    fillLevel: 95,
    lastCollected: '8hr ago',
    collector: 'Francis B.',
    lat: 4.1545,
    lng: 9.2350,
    status: 'critical',
  },
  {
    id: 'BIN-064',
    location: 'Mile 17 Motor Park',
    zone: 'Buea Town',
    type: 'General',
    fillLevel: 22,
    lastCollected: '30min ago',
    collector: 'Kevin B.',
    lat: 4.1530,
    lng: 9.2380,
    status: 'empty',
  },
];

// ============ COLLECTORS ============
export const collectors = [
  {
    id: 1,
    name: 'Emmanuel Ngwa',
    truck: 'Truck #204',
    zone: 'Molyko',
    status: 'active',
    avatar: null,
    bins: 32,
    today: 8,
    month: 184,
    efficiency: 96,
  },
  {
    id: 2,
    name: 'Samuel Tabi',
    truck: 'Truck #107',
    zone: 'Bonduma',
    status: 'on-leave',
    avatar: null,
    bins: 45,
    today: 0,
    month: 142,
    efficiency: 88,
  },
  {
    id: 3,
    name: 'Francis Bih',
    truck: 'Truck #305',
    zone: 'Buea Town',
    status: 'active',
    avatar: null,
    bins: 28,
    today: 12,
    month: 210,
    efficiency: 94,
  },
  {
    id: 4,
    name: 'Amadou Jallow',
    truck: 'Truck #203',
    zone: 'Molyko',
    status: 'active',
    avatar: null,
    bins: 30,
    today: 0,
    month: 68,
    efficiency: 82,
  },
  {
    id: 5,
    name: 'Kevin Besong',
    truck: 'Truck #108',
    zone: 'Great Soppo',
    status: 'active',
    avatar: null,
    bins: 25,
    today: 5,
    month: 187,
    efficiency: 90,
  },
  {
    id: 6,
    name: 'Abiba Lum',
    truck: 'Truck #402',
    zone: 'Great Soppo',
    status: 'active',
    avatar: null,
    bins: 36,
    today: 15,
    month: 240,
    efficiency: 98,
  },
];

// ============ RECENT ACTIVITY ============
export const recentActivity = [
  { collector: 'Emmanuel N.', binId: 'BIN-001', time: '10:45 AM Today', zone: 'Molyko', status: 'completed' },
  { collector: 'Samuel T.', binId: 'BIN-042', time: '09:32 AM Today', zone: 'Bonduma', status: 'completed' },
  { collector: 'Francis B.', binId: 'BIN-015', time: '08:25 AM Today', zone: 'Great Soppo', status: 'completed' },
  { collector: 'Amadou J.', binId: 'BIN-108', time: '07:42 PM Today', zone: 'Molyko', status: 'completed' },
  { collector: 'Kevin B.', binId: 'BIN-023', time: 'Yesterday, 8:30 PM', zone: 'Buea Town', status: 'completed' },
];

// ============ CHART DATA ============
export const collectionsPerZone = [
  { zone: 'Molyko', collections: 45 },
  { zone: 'Great Soppo', collections: 32 },
  { zone: 'Bonduma', collections: 28 },
  { zone: 'Buea Town', collections: 38 },
];

export const dailyCollectionTrends = [
  { day: 'Mon', actual: 42, scheduled: 50 },
  { day: 'Tue', actual: 48, scheduled: 50 },
  { day: 'Wed', actual: 35, scheduled: 50 },
  { day: 'Thu', actual: 55, scheduled: 50 },
  { day: 'Fri', actual: 60, scheduled: 50 },
  { day: 'Sat', actual: 38, scheduled: 45 },
  { day: 'Sun', actual: 20, scheduled: 30 },
];

export const binTypeDistribution = [
  { name: 'Recyclable', value: 35, color: '#22c55e' },
  { name: 'Organic', value: 32, color: '#f59e0b' },
  { name: 'General', value: 33, color: '#6b7280' },
];

export const overdueBinsByZone = [
  { zone: 'Molyko', bins: 8 },
  { zone: 'Bonduma', bins: 6 },
  { zone: 'Great Soppo', bins: 3 },
  { zone: 'Buea Town', bins: 1 },
];

// ============ KPI DATA ============
export const dashboardKPIs = {
  totalBins: 1240,
  collectedToday: 185,
  overdueBins: 12,
  activeCollectors: 42,
};

export const reportKPIs = {
  totalCollections: 1842,
  avgFill: 67,
  zonesAtRisk: 3,
  totalCollected: '48.2t',
};

// ============ ZONE OVERVIEW (MAP) ============
export const zoneOverview = [
  { name: 'Molyko', totalBins: 142, status: 'critical', alertCount: 5, efficiency: 82 },
  { name: 'Great Soppo', totalBins: 98, status: 'warning', alertCount: 4, efficiency: 84 },
  { name: 'Bonduma', totalBins: 56, status: 'optimal', alertCount: 1, efficiency: 88 },
  { name: 'Buea Town', totalBins: 110, status: 'optimal', alertCount: 2, efficiency: 91 },
];
