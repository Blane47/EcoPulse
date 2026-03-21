require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Bin = require('./models/Bin');
const Collector = require('./models/Collector');
const Activity = require('./models/Activity');
const Schedule = require('./models/Schedule');
const Report = require('./models/Report');

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
      Schedule.deleteMany({}),
      Report.deleteMany({}),
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
      { name: 'Emmanuel Ngwa', phone: '237670000001', pin: '123456', truck: 'Truck #204', zone: 'Molyko', status: 'active', binsAssigned: 32, collectionsToday: 8, collectionsMonth: 184, efficiency: 96 },
      { name: 'Samuel Tabi', phone: '237670000002', pin: '123456', truck: 'Truck #112', zone: 'Bonduma', status: 'on-leave', binsAssigned: 45, collectionsToday: 0, collectionsMonth: 142, efficiency: 88 },
      { name: 'Francis Bih', phone: '237670000003', pin: '123456', truck: 'Truck #305', zone: 'Buea Town', status: 'active', binsAssigned: 28, collectionsToday: 12, collectionsMonth: 210, efficiency: 94 },
      { name: 'Amadou Jallow', phone: '237670000004', pin: '123456', truck: 'Truck #201', zone: 'Molyko', status: 'active', binsAssigned: 30, collectionsToday: 0, collectionsMonth: 68, efficiency: 82 },
      { name: 'Kevin Besong', phone: '237670000005', pin: '123456', truck: 'Truck #108', zone: 'Great Soppo', status: 'active', binsAssigned: 25, collectionsToday: 5, collectionsMonth: 187, efficiency: 90 },
      { name: 'Abiba Lum', phone: '237670000006', pin: '123456', truck: 'Truck #402', zone: 'Great Soppo', status: 'active', binsAssigned: 36, collectionsToday: 15, collectionsMonth: 240, efficiency: 98 },
    ]);
    console.log(`${collectors.length} collectors created`);

    // Create bins — real Buea, Cameroon coordinates
    const bins = await Bin.insertMany([
      // Molyko Zone
      { binId: 'BIN-001', location: 'UB Main Gate, Molyko', zone: 'Molyko', type: 'General', fillLevel: 92, coordinates: { lat: 4.1548, lng: 9.2985 }, assignedCollector: collectors[0]._id, lastCollected: new Date(Date.now() - 2 * 3600000) },
      { binId: 'BIN-108', location: 'Molyko Junction (T-Junction)', zone: 'Molyko', type: 'General', fillLevel: 35, coordinates: { lat: 4.1562, lng: 9.2942 }, assignedCollector: collectors[3]._id, lastCollected: new Date(Date.now() - 3 * 3600000) },
      { binId: 'BIN-056', location: 'Molyko Market', zone: 'Molyko', type: 'Recyclable', fillLevel: 15, coordinates: { lat: 4.1570, lng: 9.2920 }, assignedCollector: collectors[0]._id, lastCollected: new Date(Date.now() - 1 * 3600000) },
      // Bonduma Zone
      { binId: 'BIN-042', location: 'Bonduma Junction', zone: 'Bonduma', type: 'Recyclable', fillLevel: 68, coordinates: { lat: 4.1585, lng: 9.2868 }, assignedCollector: collectors[1]._id, lastCollected: new Date(Date.now() - 4 * 3600000) },
      { binId: 'BIN-077', location: 'Bonduma Health Centre', zone: 'Bonduma', type: 'Organic', fillLevel: 88, coordinates: { lat: 4.1592, lng: 9.2845 }, assignedCollector: collectors[3]._id, lastCollected: new Date(Date.now() - 6 * 3600000) },
      // Great Soppo Zone
      { binId: 'BIN-023', location: 'Great Soppo Market', zone: 'Great Soppo', type: 'General', fillLevel: 78, coordinates: { lat: 4.1630, lng: 9.2790 }, assignedCollector: collectors[4]._id, lastCollected: new Date(Date.now() - 5 * 3600000) },
      { binId: 'BIN-033', location: 'Soppo Likoko Junction', zone: 'Great Soppo', type: 'General', fillLevel: 52, coordinates: { lat: 4.1645, lng: 9.2755 }, assignedCollector: collectors[1]._id, lastCollected: new Date(Date.now() - 3 * 3600000) },
      // Buea Town Zone
      { binId: 'BIN-015', location: 'Buea Town Council', zone: 'Buea Town', type: 'Organic', fillLevel: 45, coordinates: { lat: 4.1555, lng: 9.2415 }, assignedCollector: collectors[2]._id, lastCollected: new Date(Date.now() - 24 * 3600000) },
      { binId: 'BIN-091', location: 'Buea Town Market', zone: 'Buea Town', type: 'Recyclable', fillLevel: 95, coordinates: { lat: 4.1540, lng: 9.2430 }, assignedCollector: collectors[2]._id, lastCollected: new Date(Date.now() - 8 * 3600000) },
      { binId: 'BIN-064', location: 'Mile 17 Motor Park', zone: 'Buea Town', type: 'General', fillLevel: 22, coordinates: { lat: 4.1520, lng: 9.2390 }, assignedCollector: collectors[4]._id, lastCollected: new Date(Date.now() - 0.5 * 3600000) },
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

    // Create schedules for each zone
    const schedules = await Schedule.insertMany([
      { zone: 'Molyko', day: 'Monday', time: '7:00 AM - 11:00 AM', wasteTypes: ['General', 'Organic'] },
      { zone: 'Molyko', day: 'Wednesday', time: '7:00 AM - 11:00 AM', wasteTypes: ['Recyclable'] },
      { zone: 'Molyko', day: 'Friday', time: '7:00 AM - 12:00 PM', wasteTypes: ['General', 'Organic', 'Recyclable'] },
      { zone: 'Great Soppo', day: 'Tuesday', time: '7:00 AM - 11:00 AM', wasteTypes: ['General', 'Organic'] },
      { zone: 'Great Soppo', day: 'Thursday', time: '7:00 AM - 11:00 AM', wasteTypes: ['Recyclable'] },
      { zone: 'Great Soppo', day: 'Saturday', time: '8:00 AM - 12:00 PM', wasteTypes: ['General', 'Organic', 'Recyclable'] },
      { zone: 'Bonduma', day: 'Monday', time: '8:00 AM - 12:00 PM', wasteTypes: ['General', 'Organic'] },
      { zone: 'Bonduma', day: 'Thursday', time: '8:00 AM - 12:00 PM', wasteTypes: ['Recyclable'] },
      { zone: 'Bonduma', day: 'Saturday', time: '7:00 AM - 11:00 AM', wasteTypes: ['General', 'Organic', 'Recyclable'] },
      { zone: 'Buea Town', day: 'Tuesday', time: '6:00 AM - 10:00 AM', wasteTypes: ['General', 'Organic'] },
      { zone: 'Buea Town', day: 'Friday', time: '6:00 AM - 10:00 AM', wasteTypes: ['Recyclable'] },
      { zone: 'Buea Town', day: 'Saturday', time: '7:00 AM - 11:00 AM', wasteTypes: ['General', 'Organic', 'Recyclable'] },
    ]);
    console.log(`${schedules.length} schedules created`);

    // Create sample community report
    await Report.create({
      location: 'Near UB Main Gate, Molyko',
      coordinates: { lat: 4.1548, lng: 9.2985 },
      note: 'Bin overflowing since morning',
      zone: 'Molyko',
      status: 'pending',
      deviceId: 'seed_demo_device',
    });
    console.log('1 sample report created');

    console.log('\nSeed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
