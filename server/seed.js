require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Bin = require('./models/Bin');
const Collector = require('./models/Collector');
const Activity = require('./models/Activity');
const Schedule = require('./models/Schedule');
const Report = require('./models/Report');
const Notification = require('./models/Notification');
const LeaveRequest = require('./models/LeaveRequest');
const Operator = require('./models/Operator');
const PickupRequest = require('./models/PickupRequest');
const { today, addDays } = require('./utils/dates');
const { computeFee } = require('./utils/pricing');

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
      Notification.deleteMany({}),
      LeaveRequest.deleteMany({}),
      Operator.deleteMany({}),
      PickupRequest.deleteMany({}),
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
    // create() (not insertMany) so the model hashes each password
    const collectors = await Collector.create([
      { name: 'Emmanuel Ngwa', email: 'emmanuel@ecopulse.cm', password: 'collector123', phone: '+237670000001', truck: 'Truck #204', zone: 'Molyko', status: 'active', binsAssigned: 32, collectionsToday: 8, collectionsMonth: 184, efficiency: 96 },
      { name: 'Samuel Tabi', email: 'samuel@ecopulse.cm', password: 'collector123', phone: '+237670000002', truck: 'Truck #112', zone: 'Bonduma', status: 'on-leave', binsAssigned: 45, collectionsToday: 0, collectionsMonth: 142, efficiency: 88 },
      { name: 'Francis Bih', email: 'francis@ecopulse.cm', password: 'collector123', phone: '+237670000003', truck: 'Truck #305', zone: 'Buea Town', status: 'active', binsAssigned: 28, collectionsToday: 12, collectionsMonth: 210, efficiency: 94 },
      { name: 'Amadou Jallow', email: 'amadou@ecopulse.cm', password: 'collector123', phone: '+237670000004', truck: 'Truck #201', zone: 'Molyko', status: 'active', binsAssigned: 30, collectionsToday: 0, collectionsMonth: 68, efficiency: 82 },
      { name: 'Kevin Besong', email: 'kevin@ecopulse.cm', password: 'collector123', phone: '+237670000005', truck: 'Truck #108', zone: 'Great Soppo', status: 'active', binsAssigned: 25, collectionsToday: 5, collectionsMonth: 187, efficiency: 90 },
      { name: 'Abiba Lum', email: 'abiba@ecopulse.cm', password: 'collector123', phone: '+237670000006', truck: 'Truck #402', zone: 'Great Soppo', status: 'active', binsAssigned: 36, collectionsToday: 15, collectionsMonth: 240, efficiency: 98 },
    ]);
    console.log(`${collectors.length} collectors created`);

    // Samuel's on-leave status comes from approved leave; Kevin is waiting for an answer
    const day = today();
    const samuel = collectors.find((c) => c.name === 'Samuel Tabi');
    const kevin = collectors.find((c) => c.name === 'Kevin Besong');
    await LeaveRequest.create([
      {
        collector: samuel._id, startDate: addDays(day, -2), endDate: addDays(day, 4), reason: 'Family funeral in Bamenda',
        status: 'approved', reviewedBy: admin._id, reviewedAt: new Date(), startedAt: new Date(),
      },
      { collector: kevin._id, startDate: addDays(day, 14), endDate: addDays(day, 16), reason: 'Sister’s wedding in Limbe' },
    ]);
    console.log('2 leave requests created');

    // Create bins — real Buea, Cameroon coordinates
    // create() (not insertMany) so the save hook sets each bin's status from its fill level
    const bins = await Bin.create([
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

    // ---- Private on-demand operators (Trash Vallet feature) ----
    // create() (not insertMany) so each operator-admin password is hashed.
    const [trashVallet, quickBin, ecoHaul] = await Operator.create([
      {
        businessName: 'Trash Vallet', ownerName: 'Ngwa Eric', email: 'ops@trashvallet.cm', password: 'operator123', phone: '+237680000001',
        description: 'On-demand household and bulky waste pickup across Buea.',
        zonesServed: ['Molyko', 'Great Soppo', 'Bonduma'], vehicleTypes: ['pickup', 'tricycle'], vehicleCount: 3,
        baseFee: 1500, commercialRate: 5000,
        pricing: { household: 1500, bulky: 3000, recyclables: 1000, garden: 2000 },
        loadSurcharge: { small: 0, medium: 500, large: 1500 },
        rccmNumber: 'RC/BUE/2025/A/123',
        status: 'approved', approvedAt: new Date(), approvedBy: admin._id, acceptingRequests: true,
        rating: 4.6, reviewCount: 18, pickupsCompleted: 57,
      },
      {
        businessName: 'QuickBin Services', ownerName: 'Besong Clara', email: 'hello@quickbin.cm', password: 'operator123', phone: '+237680000002',
        description: 'Fast, affordable waste collection for homes and shops.',
        zonesServed: ['Buea Town', 'Molyko'], vehicleTypes: ['van', 'pickup'], vehicleCount: 2,
        baseFee: 2000, commercialRate: 6000,
        pricing: { household: 2000, bulky: 3500, recyclables: 1200, garden: 2500 },
        rccmNumber: 'RC/BUE/2025/A/456',
        status: 'pending',
      },
      {
        businessName: 'EcoHaul', ownerName: 'Tabi Joseph', email: 'contact@ecohaul.cm', password: 'operator123', phone: '+237680000003',
        description: 'Neighbourhood tricycle waste runs in Great Soppo.',
        zonesServed: ['Great Soppo'], vehicleTypes: ['tricycle'], vehicleCount: 1,
        baseFee: 1200, commercialRate: 4000,
        pricing: { household: 1200, bulky: 2800, recyclables: 900, garden: 1800 },
        status: 'suspended', approvedAt: new Date(Date.now() - 30 * 86400000), approvedBy: admin._id, acceptingRequests: false,
        rating: 3.9, reviewCount: 6, pickupsCompleted: 11,
      },
    ]);
    console.log(`3 operators created (Trash Vallet=approved, QuickBin=pending, EcoHaul=suspended)`);
    console.log('Operator-admin login: ops@trashvallet.cm / operator123');

    // Private workers belonging to Trash Vallet (operatorId set = not municipal/HYSACAM).
    const privateCollectors = await Collector.create([
      { name: 'Peter Fon', email: 'peter@trashvallet.cm', password: 'collector123', phone: '+237681000001', zone: 'Molyko', status: 'active', operatorId: trashVallet._id, onDuty: true },
      { name: 'Grace Mbah', email: 'grace@trashvallet.cm', password: 'collector123', phone: '+237681000002', zone: 'Great Soppo', status: 'active', operatorId: trashVallet._id, onDuty: false },
    ]);
    console.log(`${privateCollectors.length} private collectors created (Trash Vallet workers)`);

    // On-demand pickup requests for Trash Vallet, spanning the lifecycle. Fees are
    // computed from the operator's pricing exactly as the API does.
    const peter = privateCollectors[0];
    const fee = (wasteType, loadSize) => computeFee(trashVallet, { wasteType, loadSize });
    const h = 3600000;
    const pickups = await PickupRequest.create([
      { operator: trashVallet._id, residentName: 'Linda A.', phone: '+237650000011', location: { zone: 'Molyko', address: 'Checkpoint, Molyko' }, wasteType: 'household', loadSize: 'medium', fee: fee('household', 'medium'), status: 'requested' },
      { operator: trashVallet._id, collector: peter._id, residentName: 'Daniel K.', phone: '+237650000012', location: { zone: 'Great Soppo', address: 'Soppo Market' }, wasteType: 'bulky', loadSize: 'large', fee: fee('bulky', 'large'), status: 'accepted', acceptedAt: new Date() },
      { operator: trashVallet._id, collector: peter._id, residentName: 'Marie T.', phone: '+237650000013', location: { zone: 'Molyko', address: 'UB Junction' }, wasteType: 'household', loadSize: 'small', fee: fee('household', 'small'), status: 'en_route', acceptedAt: new Date(Date.now() - h), enRouteAt: new Date() },
      { operator: trashVallet._id, collector: peter._id, residentName: 'Samuel N.', phone: '+237650000014', location: { zone: 'Bonduma', address: 'Bonduma Junction' }, wasteType: 'garden', loadSize: 'medium', fee: fee('garden', 'medium'), status: 'completed', acceptedAt: new Date(Date.now() - 2 * h), enRouteAt: new Date(Date.now() - 1.7 * h), pickedUpAt: new Date(Date.now() - 1.5 * h), completedAt: new Date(Date.now() - 1.4 * h), paymentStatus: 'paid', rating: { stars: 5, comment: 'Fast and friendly', tags: ['on-time'] } },
      { operator: trashVallet._id, residentName: 'Alice B.', phone: '+237650000015', location: { zone: 'Molyko', address: 'Dirty South' }, wasteType: 'recyclables', loadSize: 'small', fee: fee('recyclables', 'small'), status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'resident' },
    ]);
    console.log(`${pickups.length} pickup requests created (requested → accepted → en_route → completed → cancelled)`);

    console.log('\nSeed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
