require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import Route Handlers
const authRoutes = require('./routes/auth');
const jobsRoutes = require('./routes/jobs');
const proposalsRoutes = require('./routes/proposals');
const contractRoutes = require('./routes/contracts');
const adminRoutes = require('./routes/admin');
const disputesRoutes = require('./routes/disputes');
const reviewsRoutes = require('./routes/reviews');
const topUsersRoutes = require('./routes/topUsers');
const messagesRoutes = require('./routes/messages');
const ratesRoutes = require('./routes/rates');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const activityRoutes = require('./routes/activity');
const offersRoutes = require('./routes/offers');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount Feature Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/proposals', proposalsRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/disputes', disputesRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/top-users', topUsersRoutes);
app.use('/api/v1/conversations', messagesRoutes);
app.use('/api/v1/rates', ratesRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/offers', offersRoutes);

// 404 for anything unmatched (Must stay AFTER all route mounts)
app.use((req, res) => {
  res.status(404).json({ status: 404, message: 'Not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 500, message: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = app;