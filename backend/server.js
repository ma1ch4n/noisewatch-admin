const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Better logging
console.log('🔄 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (error) => console.error('❌ MongoDB connection error:', error));
db.once('open', () => console.log('✅ Database Connected'));

// CORS - USE THIS ONCE ONLY
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running',
    endpoints: {
      auth: '/auth',
      users: '/user', 
      reports: '/reports',
      analytics: '/analytics',
      notifications: '/notification'
    }
  });
});

// Import routes with error handling
try {
  console.log('📦 Loading routes...');
  
  const authRoute = require('./routes/auth');
  const userRoute = require('./routes/user');
  const reportRoute = require('./routes/reportRoute');
  const analyticsRoute = require('./routes/analytics');
  const notificationRoute = require('./routes/notification');

  // Check if routes are properly exported
  console.log('✅ Auth route loaded:', !!authRoute);
  console.log('✅ User route loaded:', !!userRoute);
  console.log('✅ Report route loaded:', !!reportRoute);
  console.log('✅ Analytics route loaded:', !!analyticsRoute);
  console.log('✅ Notification route loaded:', !!notificationRoute);

  // Mount routes
  app.use('/auth', authRoute);
  app.use('/user', userRoute);
  app.use('/reports', reportRoute);
  app.use('/analytics', analyticsRoute);
  app.use('/notification', notificationRoute);

  console.log('✅ All routes mounted successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error('Stack trace:', error.stack);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`
  });
});