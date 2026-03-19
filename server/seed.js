require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Bin = require('./models/Bin');
const Collector = require('./models/Collector');
const Activity = require('./models/Activity');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Bin.deleteMany({}),
      Collector.deleteMany({}),
      Activity.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Alex Rivera',
      email: 'admin@ecopulse.cm',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Admin user created: admin@ecopulse.cm / admin123');

    // Create collectors
    const collectors = await Collector.insertMany([
      { name: 'Emmanuel Ngwa', truck: 'Truck #204', zone: 'Molyko', status: 'active', binsAssigned: 32, collectionsToday: 8, collectionsMonth: 184, efficiency: 96 },
      { name: 'Samuel Tabi', truck: 'Truck #107', zone: 'Bonduma', status: 'on-leave', binsAssigned: 45, collectionsToday: 0, collectionsMonth: 142, efficiency: 88 },
      { name: 'Francis Bih', truck: 'Truck #305', zone: 'Buea Town', status: 'active', binsAssigned: 28, collectionsToday: 12, collectionsMonth: 210, efficiency: 94 },
      { name: 'Amadou Jallow', truck: 'Truck #203', zone: 'Molyko', status: 'active', binsAssigned: 30, collectionsToday: 0, collectionsMonth: 68, efficiency: 82 },
      { name: 'Kevin Besong', truck: 'Truck #108', zone: 'Great Soppo', status: 'active', binsAssigned: 25, collectionsToday: 5, collectionsMonth: 187, efficiency: 90 },
      { name: 'Abiba Lum', truck: 'Truck #402', zone: 'Great Soppo', status: 'active', binsAssigned: 36, collectionsToday: 15, collectionsMonth: 240, efficiency: 98 },
    ]);
    console.log(`${collectors.length} collectors created`);

    // Create bins
    const bins = await Bin.insertMany([
      { binId: 'BIN-001', location: 'University Entrance A', zone: 'Molyko', type: 'General', fillLevel: 92, coordinates: { lat: 4.1560, lng: 9.2965 }, assignedCollector: collectors[0]._id, lastCollected: new Date(Date.now() - 2 * 3600000) },
      { binId: 'BIN-042', location: 'Market Square North', zone: 'Bonduma', type: 'Recyclable', fillLevel: 68, coordinates: { lat: 4.1510, lng: 9.2410 }, assignedCollector: collectors[1]._id, lastCollected: new Date(Date.now() - 4 * 3600000) },
      { binId: 'BIN-015', location: 'Council Chambers', zone: 'Buea Town', type: 'Organic', fillLevel: 45, coordinates: { lat: 4.1555, lng: 9.2320 }, assignedCollector: collectors[2]._id, lastCollected: new Date(Date.now() - 24 * 3600000) },
      { binId: 'BIN-108', location: 'Police Station Row', zone: 'Molyko', type: 'General', fillLevel: 35, coordinates: { lat: 4.1600, lng: 9.2900 }, assignedCollector: collectors[3]._id, lastCollected: new Date(Date.now() - 3 * 3600000) },
      { binId: 'BIN-023', location: 'Soppo Market', zone: 'Great Soppo', type: 'General', fillLevel: 78, coordinates: { lat: 4.1480, lng: 9.2580 }, assignedCollector: collectors[4]._id, lastCollected: new Date(Date.now() - 5 * 3600000) },
      { binId: 'BIN-056', location: 'Molyko Junction', zone: 'Molyko', type: 'Recyclable', fillLevel: 15, coordinates: { lat: 4.1575, lng: 9.2850 }, assignedCollector: collectors[0]._id, lastCollected: new Date(Date.now() - 1 * 3600000) },
      { binId: 'BIN-077', location: 'Bonduma Park', zone: 'Bonduma', type: 'Organic', fillLevel: 88, coordinates: { lat: 4.1525, lng: 9.2450 }, assignedCollector: collectors[3]._id, lastCollected: new Date(Date.now() - 6 * 3600000) },
      { binId: 'BIN-033', location: 'Great Soppo Road', zone: 'Great Soppo', type: 'General', fillLevel: 52, coordinates: { lat: 4.1490, lng: 9.2550 }, assignedCollector: collectors[1]._id, lastCollected: new Date(Date.now() - 3 * 3600000) },
      { binId: 'BIN-091', location: 'Buea Town Hall', zone: 'Buea Town', type: 'Recyclable', fillLevel: 95, coordinates: { lat: 4.1545, lng: 9.2350 }, assignedCollector: collectors[2]._id, lastCollected: new Date(Date.now() - 8 * 3600000) },
      { binId: 'BIN-064', location: 'Mile 17 Motor Park', zone: 'Buea Town', type: 'General', fillLevel: 22, coordinates: { lat: 4.1530, lng: 9.2380 }, assignedCollector: collectors[4]._id, lastCollected: new Date(Date.now() - 0.5 * 3600000) },
    ]);
    console.log(`${bins.length} bins created`);

    // Create sample activities
    const activities = [];
    for (let i = 0; i < 5; i++) {
      activities.push({
        collector: collectors[i]._id,
        bin: bins[i]._id,
        zone: bins[i].zone,
        action: 'collected',
        status: 'completed',
      });
    }
    await Activity.insertMany(activities);
    console.log(`${activities.length} activities created`);

    console.log('\nSeed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
