const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NoiseReport = require('../models/Report');

// ========== TEST ENDPOINT ==========
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Notification route is working!',
    timestamp: new Date().toISOString()
  });
});

// Helper function to format time ago
const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to get priority based on noise level
const getPriority = (noiseLevel) => {
  switch (noiseLevel) {
    case 'red': return 'emergency';
    case 'yellow': return 'high';
    case 'green': return 'medium';
    default: return 'low';
  }
};

// Helper function to get notification icon
const getNotificationIcon = (type, noiseLevel) => {
  if (type === 'report') {
    switch (noiseLevel) {
      case 'red': return '🚨';
      case 'yellow': return '⚠️';
      case 'green': return '🔊';
      default: return '📢';
    }
  }
  return '👤';
};

// ========== GET ALL NOTIFICATIONS ==========
router.get('/all', async (req, res) => {
  try {
    const { limit = 50, hours = 24 } = req.query;
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    console.log(`📋 Fetching notifications from last ${hours} hours...`);

    // Fetch recent user registrations
    const recentUsers = await User.find({
      createdAt: { $gte: timeAgo }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Fetch recent noise reports with user details
    const recentReports = await NoiseReport.find({
      createdAt: { $gte: timeAgo }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'username email profilePhoto')
      .lean();

    // Combine and format notifications
    const notifications = [];

    // Format user registrations
    recentUsers.forEach(user => {
      notifications.push({
        id: `user-${user._id}-${user.createdAt.getTime()}`,
        type: 'registration',
        title: 'New User Registration',
        message: `${user.username || 'A new user'} joined the platform`,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profilePhoto: user.profilePhoto
        },
        time: formatTimeAgo(user.createdAt),
        timestamp: user.createdAt,
        priority: 'medium',
        icon: '👤',
        read: false,
        data: {
          userId: user._id,
          userType: user.userType
        }
      });
    });

    // Format noise reports
    recentReports.forEach(report => {
      const username = report.userId?.username || 'Anonymous';
      const priority = getPriority(report.noiseLevel);
      const icon = getNotificationIcon('report', report.noiseLevel);
      
      let title = 'New Noise Report';
      if (report.noiseLevel === 'red') title = '🚨 CRITICAL: High Noise Report';
      else if (report.noiseLevel === 'yellow') title = '⚠️ Medium Noise Report';
      
      notifications.push({
        id: `report-${report._id}-${report.createdAt.getTime()}`,
        type: 'report',
        title,
        message: `${username} reported ${report.reason || 'noise'} (${report.noiseLevel} level)`,
        user: report.userId ? {
          id: report.userId._id,
          username: report.userId.username,
          email: report.userId.email
        } : null,
        location: report.location?.address || 'Unknown location',
        noiseLevel: report.noiseLevel,
        reason: report.reason,
        status: report.status,
        time: formatTimeAgo(report.createdAt),
        timestamp: report.createdAt,
        priority,
        icon,
        read: false,
        data: {
          reportId: report._id,
          mediaUrl: report.mediaUrl,
          coordinates: report.geoLocation?.coordinates
        }
      });
    });

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit the total number of notifications
    const limitedNotifications = notifications.slice(0, parseInt(limit));

    console.log(`✅ Found ${limitedNotifications.length} notifications`);

    res.json({
      success: true,
      count: limitedNotifications.length,
      total: notifications.length,
      hours: parseInt(hours),
      notifications: limitedNotifications
    });

  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ========== GET UNREAD COUNT ==========
router.get('/unread-count', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [newUsers, newReports] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: timeAgo } }),
      NoiseReport.countDocuments({ createdAt: { $gte: timeAgo } })
    ]);

    res.json({
      success: true,
      count: newUsers + newReports,
      details: {
        users: newUsers,
        reports: newReports
      }
    });

  } catch (error) {
    console.error('❌ Error counting unread notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ========== GET RECENT ACTIVITY ==========
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const recentReports = await NoiseReport.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'username')
      .lean();

    const activities = [];

    recentUsers.forEach(user => {
      activities.push({
        id: user._id,
        type: 'registration',
        user: user.username || 'New User',
        action: 'registered as new user',
        time: formatTimeAgo(user.createdAt),
        timestamp: user.createdAt,
        icon: 'person_add'
      });
    });

    recentReports.forEach(report => {
      const username = report.userId?.username || 'Anonymous';
      activities.push({
        id: report._id,
        type: 'report',
        user: username,
        action: 'reported noise',
        reason: report.reason,
        noiseLevel: report.noiseLevel,
        location: report.location?.address,
        time: formatTimeAgo(report.createdAt),
        timestamp: report.createdAt,
        icon: report.noiseLevel === 'red' ? 'warning' : 
               report.noiseLevel === 'yellow' ? 'volume_up' : 'notifications'
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = activities.slice(0, parseInt(limit));

    res.json(recentActivity);

  } catch (error) {
    console.error('❌ Error fetching recent activity:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;