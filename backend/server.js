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

app.use(cors());
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
      analytics: '/analytics'
    }
  });
});

app.use('/auth', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/reports', require('./routes/reportRoute'));
app.use('/analytics', require('./routes/analytics'));

app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});