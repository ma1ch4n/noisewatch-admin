const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NoiseReport = require('../models/Report');

// Helper function to calculate time ranges
const getTimeRange = (period) => {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      start.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setDate(now.getDate() - 7); // Default to weekly
  }

  return { start, end: now };
};

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

// ========== DASHBOARD SPECIFIC ENDPOINTS ==========

// Get noise categories breakdown for AdminDashboard
router.get('/noise-categories', async (req, res) => {
  try {
    const categories = await NoiseReport.aggregate([
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Map to color scheme
    const colorMap = {
      'Music': '#DAA520',
      'Vehicle': '#8B4513',
      'Traffic': '#8B4513',
      'Construction': '#B8860B',
      'Shouting': '#8B7355',
      'Party': '#CD853F',
      'Animal': '#D2B48C',
      'Industrial': '#654321',
      'Machinery': '#A0522D'
    };

    const formattedCategories = categories.map(cat => ({
      type: cat._id,
      name: cat._id,
      count: cat.count,
      color: colorMap[cat._id] || '#8B7355'
    }));

    // If no categories found, return some default ones
    if (formattedCategories.length === 0) {
      formattedCategories.push(
        { type: 'Music', name: 'Music', count: 0, color: '#DAA520' },
        { type: 'Vehicle', name: 'Vehicle', count: 0, color: '#8B4513' },
        { type: 'Construction', name: 'Construction', count: 0, color: '#B8860B' }
      );
    }

    res.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching noise categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top noise sources (locations) for AdminDashboard
router.get('/top-sources', async (req, res) => {
  try {
    const topSources = await NoiseReport.aggregate([
      {
        $match: {
          $or: [
            { 'location.address': { $exists: true, $ne: '' } },
            { 'location.latitude': { $exists: true } },
            { 'location.longitude': { $exists: true } }
          ]
        }
      },
      {
        $group: {
          _id: {
            address: '$location.address',
            lat: { $ifNull: [{ $round: ['$location.latitude', 2] }, 'unknown'] },
            lng: { $ifNull: [{ $round: ['$location.longitude', 2] }, 'unknown'] }
          },
          reports: { $sum: 1 },
          avgLevel: { $avg: {
            $switch: {
              branches: [
                { case: { $eq: ['$noiseLevel', 'red'] }, then: 3 },
                { case: { $eq: ['$noiseLevel', 'yellow'] }, then: 2 },
                { case: { $eq: ['$noiseLevel', 'green'] }, then: 1 }
              ],
              default: 2
            }
          }}
        }
      },
      { $sort: { reports: -1 } },
      { $limit: 5 },
      {
        $project: {
          location: {
            $cond: {
              if: { $ne: ['$_id.address', ''] },
              then: '$_id.address',
              else: { 
                $concat: [
                  'Lat: ',
                  { $toString: '$_id.lat' },
                  ', Lon: ',
                  { $toString: '$_id.lng' }
                ]
              }
            }
          },
          reports: 1,
          level: {
            $switch: {
              branches: [
                { case: { $gte: ['$avgLevel', 2.5] }, then: 'high' },
                { case: { $gte: ['$avgLevel', 1.5] }, then: 'medium' },
                { case: { $lt: ['$avgLevel', 1.5] }, then: 'low' }
              ],
              default: 'medium'
            }
          }
        }
      }
    ]);

    // If no sources found, return default data
    if (topSources.length === 0) {
      topSources.push(
        { location: 'Main Street Area', reports: 0, level: 'medium' },
        { location: 'Park District', reports: 0, level: 'low' },
        { location: 'Downtown', reports: 0, level: 'medium' }
      );
    }

    res.json(topSources);
  } catch (error) {
    console.error('Error fetching top sources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alerts (recent issues needing attention) for AdminDashboard
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get repeated reports in same area
    const repeatedReports = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: oneHourAgo },
          'location.latitude': { $exists: true, $ne: null },
          'location.longitude': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            lat: { $round: ['$location.latitude', 2] },
            lng: { $round: ['$location.longitude', 2] }
          },
          count: { $sum: 1 },
          reasons: { $push: '$reason' },
          location: { $first: '$location.address' }
        }
      },
      {
        $match: {
          count: { $gte: 3 }
        }
      },
      { $limit: 3 }
    ]);

    // Get high noise level reports
    const highNoiseReports = await NoiseReport.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
      noiseLevel: 'red'
    });

    // Get pending reports older than 24 hours
    const oldPendingReports = await NoiseReport.countDocuments({
      status: 'pending',
      createdAt: { $lt: twentyFourHoursAgo }
    });

    // Get action required reports
    const actionRequiredReports = await NoiseReport.countDocuments({
      status: 'action_required'
    });

    // Format alerts
    const alerts = [];

    // Add repeated report alerts
    repeatedReports.forEach(report => {
      alerts.push({
        id: `repeat-${report._id.lat}-${report._id.lng}`,
        type: 'repeated',
        location: report.location || 'Unknown location',
        message: `${report.count} reports in the last hour`,
        severity: report.count >= 5 ? 'critical' : 'high'
      });
    });

    // Add high noise alert
    if (highNoiseReports > 0) {
      alerts.push({
        id: 'high-noise',
        type: 'threshold',
        location: 'Multiple locations',
        message: `${highNoiseReports} high noise level reports in last 24 hours`,
        severity: highNoiseReports >= 10 ? 'critical' : 'medium'
      });
    }

    // Add old pending reports alert
    if (oldPendingReports > 0) {
      alerts.push({
        id: 'old-pending',
        type: 'pending',
        location: 'System',
        message: `${oldPendingReports} reports pending for more than 24 hours`,
        severity: oldPendingReports >= 5 ? 'high' : 'medium'
      });
    }

    // Add action required alert
    if (actionRequiredReports > 0) {
      alerts.push({
        id: 'action-required',
        type: 'action',
        location: 'System',
        message: `${actionRequiredReports} reports require action`,
        severity: 'high'
      });
    }

    // If no alerts, add a system status alert
    if (alerts.length === 0) {
      alerts.push({
        id: 'system-ok',
        type: 'status',
        location: 'System',
        message: 'All systems operational',
        severity: 'low'
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get summary stats (for AdminDashboard)
router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, totalReports, activeUsers, resolvedReports] = await Promise.all([
      User.countDocuments(),
      NoiseReport.countDocuments(),
      NoiseReport.distinct('userId', {
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).then(ids => ids.length),
      NoiseReport.countDocuments({ status: 'resolved' })
    ]);

    const reportsToday = await NoiseReport.countDocuments({
      createdAt: { $gte: today }
    });

    // Calculate flagged areas (locations with 3+ reports in last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flaggedAreasAgg = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: twentyFourHoursAgo },
          'location.latitude': { $exists: true, $ne: null },
          'location.longitude': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            lat: { $round: ['$location.latitude', 2] },
            lng: { $round: ['$location.longitude', 2] }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: 3 }
        }
      },
      {
        $count: "flaggedAreas"
      }
    ]);

    const flaggedAreas = flaggedAreasAgg[0]?.flaggedAreas || 0;

    const response = {
      totalUsers,
      totalReports,
      activeUsers,
      resolvedReports,
      reportsToday,
      flaggedAreas,
      resolutionRate: totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== EXISTING ANALYTICS ENDPOINTS ==========

// Get user analytics
router.get('/users', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    
    // Total users count
    const totalUsers = await User.countDocuments();
    
    // Active users (users who submitted reports in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get users who have created reports in last 30 days
    const activeUserIds = await NoiseReport.distinct('userId', {
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const activeUsers = activeUserIds.length;

    // New users in selected period
    const { start } = getTimeRange(period);
    const newUsers = await User.countDocuments({
      createdAt: { $gte: start }
    });

    // Users by type
    const userByType = await User.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          percentage: {
            $multiply: [
              { $divide: ['$count', totalUsers] },
              100
            ]
          }
        }
      }
    ]);

    // User growth over time (last 7 days)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 7 }
    ]);

    // User activity (reports per day for last 7 days)
    const userActivity = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 7 }
    ]);

    // Format data for charts
    const activityLabels = userActivity.map(item => {
      const date = new Date(item._id);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    const growthData = userGrowth.map(item => item.count);
    const activityData = userActivity.map(item => item.count);

    // Fill missing data with zeros
    while (growthData.length < 7) growthData.push(0);
    while (activityData.length < 7) activityData.push(0);
    while (activityLabels.length < 7) {
      const date = new Date(Date.now() - (7 - activityLabels.length - 1) * 24 * 60 * 60 * 1000);
      activityLabels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const response = {
      totalUsers,
      activeUsers,
      newUsers,
      adminUsers: userByType.find(u => u.type === 'admin')?.count || 0,
      userByType: userByType.map(item => ({
        type: item.type,
        count: item.count,
        percentage: Math.round(item.percentage)
      })),
      userGrowth: growthData,
      userActivity: activityData,
      activityLabels
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get report analytics
router.get('/reports', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const { start } = getTimeRange(period);
    
    // Total reports count
    const totalReports = await NoiseReport.countDocuments();
    
    // Reports in selected period
    const periodReports = await NoiseReport.countDocuments({
      createdAt: { $gte: start }
    });
    
    // Reports by noise level
    const noiseLevels = await NoiseReport.aggregate([
      {
        $group: {
          _id: '$noiseLevel',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          level: '$_id',
          count: 1,
          percentage: {
            $multiply: [
              { $divide: ['$count', totalReports] },
              100
            ]
          },
          color: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'green'] }, then: '#4CAF50' },
                { case: { $eq: ['$_id', 'yellow'] }, then: '#FFC107' },
                { case: { $eq: ['$_id', 'red'] }, then: '#F44336' }
              ],
              default: '#999999'
            }
          }
        }
      }
    ]);

    // Reports by status
    const reportStatus = await NoiseReport.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          percentage: {
            $multiply: [
              { $divide: ['$count', totalReports] },
              100
            ]
          },
          color: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'resolved'] }, then: '#4CAF50' },
                { case: { $eq: ['$_id', 'monitoring'] }, then: '#2196F3' },
                { case: { $eq: ['$_id', 'pending'] }, then: '#FF9800' },
                { case: { $eq: ['$_id', 'action_required'] }, then: '#F44336' }
              ],
              default: '#999999'
            }
          }
        }
      }
    ]);

    // Report trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const reportTrend = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format trend data
    const trendLabels = [];
    const trendData = [];

    // Generate labels for last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      trendLabels.push(monthLabel);
      
      // Find corresponding data
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const trendItem = reportTrend.find(item => item._id === yearMonth);
      trendData.push(trendItem ? trendItem.count : 0);
    }

    const response = {
      totalReports,
      periodReports,
      noiseLevels: noiseLevels.map(item => ({
        level: item.level,
        count: item.count,
        percentage: Math.round(item.percentage),
        color: item.color
      })),
      reportStatus: reportStatus.map(item => ({
        status: item.status,
        count: item.count,
        percentage: Math.round(item.percentage),
        color: item.color
      })),
      reportTrend: trendData,
      trendLabels
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching report analytics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    // Get recent reports (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentReports = await NoiseReport.find({
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('userId', 'username email')
      .lean();

    // Get recent user registrations (last 24 hours)
    const recentUsers = await User.find({
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // Format activity data
    const activities = [];

    // Add report activities
    recentReports.forEach(report => {
      activities.push({
        user: report.userId?.username || 'Anonymous User',
        action: 'Reported noise',
        location: report.reason,
        time: formatTimeAgo(report.createdAt),
        report: report._id.toString().slice(-4)
      });
    });

    // Add user registration activities
    recentUsers.forEach(user => {
      activities.push({
        user: user.username || 'New User',
        action: 'Registered account',
        time: formatTimeAgo(user.createdAt)
      });
    });

    // Add admin actions if any reports were updated recently
    const updatedReports = await NoiseReport.find({
      updatedAt: { $gte: oneDayAgo },
      status: { $ne: 'pending' }
    })
      .sort({ updatedAt: -1 })
      .limit(3)
      .populate('userId', 'username')
      .lean();

    updatedReports.forEach(report => {
      if (report.status !== 'pending') {
        activities.push({
          user: 'Admin',
          action: `Updated report to ${report.status.replace('_', ' ')}`,
          time: formatTimeAgo(report.updatedAt),
          report: report._id.toString().slice(-4)
        });
      }
    });

    // Sort by time (newest first) and limit
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivity = activities.slice(0, 10);

    // If no recent activity, return some sample data
    if (recentActivity.length === 0) {
      recentActivity.push({
        user: 'System',
        action: 'No recent activity',
        time: 'Just now'
      });
    }

    res.json(recentActivity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Analytics API is running'
  });
});

module.exports = router;