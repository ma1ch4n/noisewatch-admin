const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NoiseReport = require('../models/Report');

// ========== HELPER FUNCTIONS ==========

// Get date range based on period
const getDateRange = (period, date = new Date()) => {
  const start = new Date(date);
  const end = new Date(date);

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      // Start from Monday
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

// Format time ago
const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ========== MAIN DASHBOARD ENDPOINT ==========

/**
 * GET /api/analytics/dashboard
 * Returns all data needed for the admin dashboard based on period
 * Query params: period (daily, weekly, monthly, yearly)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const dateRange = getDateRange(period);
    
    console.log(`📊 Fetching dashboard data for period: ${period}`);
    console.log(`📅 Date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

    // ========== USER STATS ==========
    const totalUsers = await User.countDocuments();
    
    const activeUsers = await NoiseReport.distinct('userId', {
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    }).then(ids => ids.length);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

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
              { $divide: ['$count', totalUsers || 1] },
              100
            ]
          }
        }
      }
    ]);

    // ========== REPORT STATS ==========
    const totalReports = await NoiseReport.countDocuments();
    
    const periodReports = await NoiseReport.countDocuments({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Reports by status
    const reportStatus = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
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
              { $divide: ['$count', periodReports || 1] },
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

    // Resolved reports count
    const resolvedReports = reportStatus.find(s => s.status === 'resolved')?.count || 0;

    // Reports by noise level
    const noiseLevels = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
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
              { $divide: ['$count', periodReports || 1] },
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

    // ========== TREND DATA ==========
    let userGrowth = [];
    let userActivity = [];
    let activityLabels = [];
    let reportTrend = [];
    let trendLabels = [];

    // Generate trend data based on period
    if (period === 'daily') {
      // Hourly data for today
      activityLabels = Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        return hour === 0 ? '12 AM' :
          hour === 12 ? '12 PM' :
            hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
      });
      
      userGrowth = Array(24).fill(0);
      userActivity = Array(24).fill(0);
      reportTrend = Array(24).fill(0);
      trendLabels = activityLabels;

      // Get user registrations by hour
      const growthByHour = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        }
      ]);
      growthByHour.forEach(item => { 
        if (item._id < 24) userGrowth[item._id] = item.count; 
      });

      // Get reports by hour
      const activityByHour = await NoiseReport.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        }
      ]);
      activityByHour.forEach(item => { 
        if (item._id < 24) {
          userActivity[item._id] = item.count;
          reportTrend[item._id] = item.count;
        }
      });

    } else if (period === 'weekly') {
      // Daily data for the week
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      activityLabels = days;
      trendLabels = days;
      userGrowth = Array(7).fill(0);
      userActivity = Array(7).fill(0);
      reportTrend = Array(7).fill(0);

      // Get user registrations by day of week
      for (let i = 0; i < 7; i++) {
        const date = new Date(dateRange.start);
        date.setDate(dateRange.start.getDate() + i);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const userCount = await User.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });
        userGrowth[i] = userCount;

        const reportCount = await NoiseReport.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });
        userActivity[i] = reportCount;
        reportTrend[i] = reportCount;
      }

    } else if (period === 'monthly') {
      // Daily data for the month
      const daysInMonth = new Date(dateRange.end).getDate();
      activityLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
      trendLabels = activityLabels;
      userGrowth = Array(daysInMonth).fill(0);
      userActivity = Array(daysInMonth).fill(0);
      reportTrend = Array(daysInMonth).fill(0);

      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(dateRange.start);
        date.setDate(dateRange.start.getDate() + i);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const userCount = await User.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });
        userGrowth[i] = userCount;

        const reportCount = await NoiseReport.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });
        userActivity[i] = reportCount;
        reportTrend[i] = reportCount;
      }

    } else if (period === 'yearly') {
      // Monthly data for the year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      activityLabels = months;
      trendLabels = months;
      userGrowth = Array(12).fill(0);
      userActivity = Array(12).fill(0);
      reportTrend = Array(12).fill(0);

      for (let i = 0; i < 12; i++) {
        const startOfMonth = new Date(dateRange.start.getFullYear(), i, 1);
        const endOfMonth = new Date(dateRange.start.getFullYear(), i + 1, 0, 23, 59, 59, 999);

        const userCount = await User.countDocuments({
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        userGrowth[i] = userCount;

        const reportCount = await NoiseReport.countDocuments({
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        userActivity[i] = reportCount;
        reportTrend[i] = reportCount;
      }
    }

    // ========== NOISE CATEGORIES ==========
    const noiseCategories = await NoiseReport.aggregate([
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

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

    const formattedCategories = noiseCategories.map(cat => ({
      name: cat._id,
      count: cat.count,
      color: colorMap[cat._id] || '#8B7355'
    }));

    // ========== RECENT ACTIVITY ==========
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentReports = await NoiseReport.find({
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'username email')
      .lean();

    const recentUsers = await User.find({
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const activities = [];

    // Add report activities
    recentReports.forEach(report => {
      activities.push({
        id: report._id,
        type: 'report',
        user: report.userId?.username || 'Anonymous User',
        action: 'reported noise',
        reason: report.reason,
        noiseLevel: report.noiseLevel,
        location: report.location?.address || '',
        time: formatTimeAgo(report.createdAt),
        timestamp: report.createdAt
      });
    });

    // Add user registration activities
    recentUsers.forEach(user => {
      activities.push({
        id: user._id,
        type: 'registration',
        user: user.username || 'New User',
        action: 'registered as new user',
        time: formatTimeAgo(user.createdAt),
        timestamp: user.createdAt
      });
    });

    // Sort by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // ========== FINAL RESPONSE ==========
    const response = {
      success: true,
      period: period.charAt(0).toUpperCase() + period.slice(1),
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      userStats: {
        totalUsers,
        activeUsers,
        newUsers,
        userByType: userByType.map(item => ({
          type: item.type || 'user',
          count: item.count,
          percentage: Math.round(item.percentage)
        })),
        userGrowth,
        userActivity,
        activityLabels
      },
      reportStats: {
        totalReports,
        periodReports,
        resolvedReports,
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
        reportTrend,
        trendLabels
      },
      noiseCategories: formattedCategories,
      recentActivity: activities.slice(0, 10)
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ========== INDIVIDUAL ENDPOINTS (for backward compatibility) ==========

// Get user stats for specific period
router.get('/users', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const dateRange = getDateRange(period);
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await NoiseReport.distinct('userId', {
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    }).then(ids => ids.length);
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

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
              { $divide: ['$count', totalUsers || 1] },
              100
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      totalUsers,
      activeUsers,
      newUsers,
      userByType: userByType.map(item => ({
        type: item.type || 'user',
        count: item.count,
        percentage: Math.round(item.percentage)
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get report stats for specific period
router.get('/reports', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const dateRange = getDateRange(period);
    
    const totalReports = await NoiseReport.countDocuments();
    const periodReports = await NoiseReport.countDocuments({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const noiseLevels = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
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
              { $divide: ['$count', periodReports || 1] },
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

    const reportStatus = await NoiseReport.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
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
              { $divide: ['$count', periodReports || 1] },
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

    res.json({
      success: true,
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
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentReports = await NoiseReport.find({
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('userId', 'username email')
      .lean();

    const recentUsers = await User.find({
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const activities = [];

    recentReports.forEach(report => {
      activities.push({
        id: report._id,
        type: 'report',
        user: report.userId?.username || 'Anonymous User',
        action: 'reported noise',
        reason: report.reason,
        noiseLevel: report.noiseLevel,
        time: formatTimeAgo(report.createdAt),
        timestamp: report.createdAt
      });
    });

    recentUsers.forEach(user => {
      activities.push({
        id: user._id,
        type: 'registration',
        user: user.username || 'New User',
        action: 'registered as new user',
        time: formatTimeAgo(user.createdAt),
        timestamp: user.createdAt
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get noise categories
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
      name: cat._id,
      count: cat.count,
      color: colorMap[cat._id] || '#8B7355'
    }));

    res.json(formattedCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Analytics API is running'
  });
});

module.exports = router;