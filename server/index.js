const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const binRoutes = require('./routes/bins');
const collectorRoutes = require('./routes/collectors');
const activityRoutes = require('./routes/activity');
const reportRoutes = require('./routes/reports');
const scheduleRoutes = require('./routes/schedule');
const chatRoutes = require('./routes/chat');
const communityRoutes = require('./routes/community');
const announcementRoutes = require('./routes/announcements');
const applicationRoutes = require('./routes/applications');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const searchRoutes = require('./routes/search');
const leaveRoutes = require('./routes/leave');
const { startLeaveScheduler } = require('./utils/leaveStatus');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/collectors', collectorRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/leave', leaveRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  // Every sign-in would fail without it, so stop here with a clear message instead
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set. Copy server/.env.example to server/.env and fill it in.');
    process.exit(1);
  }
  await connectDB();
  startLeaveScheduler();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoPulse server running on http://0.0.0.0:${PORT}`);
  });
};

start();
