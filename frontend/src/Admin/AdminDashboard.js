import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import CustomDrawer from './CustomDrawer';

const AdminDashboard = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [userStats, setUserStats] = useState(null);
  const [reportStats, setReportStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminName, setAdminName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // API endpoint
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Get admin name from localStorage or default
    const storedAdmin = localStorage.getItem('adminName') || 'Administrator';
    setAdminName(storedAdmin);
    
    fetchAllData();
    
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 30000);
    
    // Update clock every second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [selectedPeriod]);

  const fetchAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('📊 Fetching all data...');
      
      // Fetch all data in parallel
      const [userResponse, reportResponse, activityResponse, reportsResponse, usersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/users?period=${selectedPeriod}`),
        fetch(`${API_BASE_URL}/analytics/reports?period=${selectedPeriod}`),
        fetch(`${API_BASE_URL}/analytics/recent-activity`),
        fetch(`${API_BASE_URL}/reports/recent`),
        fetch(`${API_BASE_URL}/users/recent`)
      ]);

      if (!userResponse.ok) throw new Error('Failed to fetch user analytics');
      if (!reportResponse.ok) throw new Error('Failed to fetch report analytics');
      if (!activityResponse.ok) throw new Error('Failed to fetch recent activity');

      const userData = await userResponse.json();
      const reportData = await reportResponse.json();
      const activityData = await activityResponse.json();
      const reportsData = reportsResponse.ok ? await reportsResponse.json() : { success: false };
      const usersData = usersResponse.ok ? await usersResponse.json() : { success: false };
      
      setUserStats(userData);
      setReportStats(reportData);
      setRecentActivity(activityData);
      
      if (reportsData.success) {
        setRecentReports(reportsData.reports || []);
      }
      
      if (usersData.success) {
        setRecentUsers(usersData.users || []);
      }
      
      // Generate notifications from real data
      generateNotificationsFromData(activityData, reportsData, usersData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      // Generate notifications from available data
      generateNotificationsFromData(recentActivity, { success: false }, { success: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateNotificationsFromData = (activityData, reportsData, usersData) => {
    const newNotifications = [];
    
    // Generate notifications from recent reports (from database)
    if (reportsData.success && reportsData.reports && reportsData.reports.length > 0) {
      const recentReportsList = reportsData.reports.slice(0, 5); // Get latest 5 reports
      
      recentReportsList.forEach((report, index) => {
        const timeAgo = calculateTimeAgo(report.createdAt || report.timestamp || new Date().toISOString());
        
        let priority = 'medium';
        if (report.priority === 'high' || report.severity === 'high' || report.noiseLevel === 'high') {
          priority = 'high';
        } else if (report.priority === 'emergency' || report.severity === 'critical') {
          priority = 'emergency';
        } else if (report.priority === 'low' || report.noiseLevel === 'low') {
          priority = 'low';
        }

        newNotifications.push({
          id: `report-${report._id || report.id || index}`,
          type: 'report',
          title: 'New Noise Report',
          message: `Report #${report.reportId || report._id?.slice(-6) || index + 1}: ${report.description || 'Noise complaint'} at ${report.location || 'Unknown location'}`,
          time: timeAgo,
          read: false,
          priority: priority,
          data: report,
          category: 'report'
        });
      });
    }

    // Generate notifications from recent users (from database)
    if (usersData.success && usersData.users && usersData.users.length > 0) {
      const recentUsersList = usersData.users.slice(0, 3); // Get latest 3 users
      
      recentUsersList.forEach((user, index) => {
        const timeAgo = calculateTimeAgo(user.createdAt || user.registeredAt || new Date().toISOString());
        
        newNotifications.push({
          id: `user-${user._id || user.id || index}`,
          type: 'user',
          title: 'New User Registered',
          message: `New ${user.userType === 'admin' ? 'Administrator' : 'User'}: ${user.username || user.email || 'New user'} has joined the system`,
          time: timeAgo,
          read: false,
          priority: 'medium',
          data: user,
          category: 'user'
        });
      });
    }

    // Generate notifications from recent activities
    if (activityData && activityData.length > 0) {
      const recentActivities = activityData.slice(0, 5); // Get latest 5 activities
      
      recentActivities.forEach((activity, index) => {
        const timeAgo = activity.time || calculateTimeAgo(activity.timestamp || new Date().toISOString());
        
        let type = 'activity';
        let priority = 'low';
        
        if (activity.action?.includes('Reported')) {
          type = 'report';
          priority = 'medium';
        } else if (activity.action?.includes('Registered')) {
          type = 'user';
          priority = 'medium';
        } else if (activity.action?.includes('Resolved')) {
          type = 'system';
          priority = 'low';
        } else if (activity.action?.includes('Emergency') || activity.action?.includes('Critical')) {
          type = 'emergency';
          priority = 'emergency';
        }

        newNotifications.push({
          id: `activity-${index}`,
          type: type,
          title: 'System Activity',
          message: activity.action || 'Activity recorded',
          time: timeAgo,
          read: false,
          priority: priority,
          data: activity,
          category: 'activity'
        });
      });
    }

    // Add system notifications (for demo purposes)
    const systemNotifications = [
      {
        id: 'system-1',
        type: 'system',
        title: 'System Status',
        message: 'All systems are operational',
        time: '1 hour ago',
        read: true,
        priority: 'low',
        category: 'system'
      },
      {
        id: 'system-2',
        type: 'system',
        title: 'Database Update',
        message: 'Nightly backup completed successfully',
        time: '2 hours ago',
        read: true,
        priority: 'low',
        category: 'system'
      }
    ];

    // Merge all notifications
    const allNotifications = [...newNotifications, ...systemNotifications];
    
    // Sort by time (newest first)
    allNotifications.sort((a, b) => {
      const timeA = getTimeValue(a.time);
      const timeB = getTimeValue(b.time);
      return timeB - timeA;
    });
    
    setNotifications(allNotifications);
    
    // Count unread notifications
    const unreadCount = allNotifications.filter(n => !n.read).length;
    setUnreadNotifications(unreadCount);
    
    // Store notifications in localStorage for persistence
    localStorage.setItem('notifications', JSON.stringify({
      notifications: allNotifications,
      lastUpdated: new Date().toISOString()
    }));
  };

  const calculateTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  const getTimeValue = (timeString) => {
    if (!timeString) return 0;
    
    const now = new Date();
    if (timeString === 'Just now') return now.getTime();
    
    const match = timeString.match(/(\d+)\s*(minute|hour|day|week)s?\s*ago/);
    if (!match) return 0;
    
    const [, amount, unit] = match;
    const amountNum = parseInt(amount);
    
    switch(unit) {
      case 'minute':
        return now.getTime() - amountNum * 60 * 1000;
      case 'hour':
        return now.getTime() - amountNum * 60 * 60 * 1000;
      case 'day':
        return now.getTime() - amountNum * 24 * 60 * 60 * 1000;
      case 'week':
        return now.getTime() - amountNum * 7 * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    setNotifications(updatedNotifications);
    setUnreadNotifications(0);
    
    // Update localStorage
    localStorage.setItem('notifications', JSON.stringify({
      notifications: updatedNotifications,
      lastUpdated: new Date().toISOString()
    }));
  };

  const markAsRead = (id) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updatedNotifications);
    setUnreadNotifications(prev => Math.max(0, prev - 1));
    
    // Update localStorage
    localStorage.setItem('notifications', JSON.stringify({
      notifications: updatedNotifications,
      lastUpdated: new Date().toISOString()
    }));
  };

  const clearAllNotifications = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
      setUnreadNotifications(0);
      
      // Update localStorage
      localStorage.setItem('notifications', JSON.stringify({
        notifications: [],
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'report':
        return '📢';
      case 'user':
        return '👤';
      case 'system':
        return '⚙️';
      case 'activity':
        return '📈';
      case 'emergency':
        return '🚨';
      default:
        return '📋';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'emergency':
        return '#ff4444';
      case 'high':
        return '#ff8c00';
      case 'medium':
        return '#ffaa00';
      case 'low':
        return '#4CAF50';
      default:
        return '#8B7355';
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch(notification.category) {
      case 'report':
        // Navigate to reports page or specific report
        alert(`Opening report: ${notification.data?.reportId || notification.data?._id}`);
        // You can implement navigation here
        // window.location.href = `/admin/reports/${notification.data?._id}`;
        break;
      case 'user':
        // Navigate to users page or specific user
        alert(`Opening user profile: ${notification.data?.username || notification.data?.email}`);
        // window.location.href = `/admin/users/${notification.data?._id}`;
        break;
      default:
        // For other notifications, just close modal
        break;
    }
  };

  const generateHTMLReport = () => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    const noiseLevelReports = reportStats?.noiseLevels?.reduce((sum, level) => sum + level.count, 0) || 0;
    const noiseLevelsHTML = reportStats?.noiseLevels?.map((level, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${level.level}</td>
        <td style="padding: 8px; text-align: center;">${level.count}</td>
        <td style="padding: 8px; text-align: center;">${level.percentage || 0}%</td>
      </tr>
    `).join('') || '';

    const userTypesHTML = userStats?.userByType?.map((type, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${type.type}</td>
        <td style="padding: 8px; text-align: center;">${type.count}</td>
      </tr>
    `).join('') || '';

    const recentActivityHTML = recentActivity.slice(0, 10).map((activity, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px; text-align: left;">${activity.user || 'Anonymous'}</td>
        <td style="padding: 8px; text-align: left;">${activity.action || 'Activity'}</td>
        <td style="padding: 8px; text-align: left;">${activity.location || 'N/A'}</td>
        <td style="padding: 8px; text-align: left;">${activity.time || 'Just now'}</td>
      </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>NOISEWATCH - Analytics Dashboard Report</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #faf8f3;
          color: #3e2723;
        }
        .header {
          background: linear-gradient(135deg, #8B4513, #D2B48C);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .report-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(139,69,19,0.1);
          margin-bottom: 30px;
        }
        .report-info h2 {
          margin-top: 0;
          color: #8B4513;
          font-size: 20px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .stats-card {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(139,69,19,0.1);
          border-left: 4px solid #DAA520;
        }
        .stats-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #8B7355;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stats-card .value {
          font-size: 32px;
          font-weight: bold;
          color: #8B4513;
          margin: 0;
        }
        .section {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(139,69,19,0.1);
          margin-bottom: 30px;
        }
        .section h2 {
          margin: 0 0 20px 0;
          color: #8B4513;
          font-size: 20px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .table th {
          background-color: #faf8f3;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #5d4037;
          border-bottom: 2px solid #e8dcc6;
        }
        .table td {
          padding: 8px;
          border-bottom: 1px solid #e8dcc6;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          color: #8B7355;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NOISEWATCH</h1>
        <p>Analytics Dashboard Report - ${selectedPeriod.toUpperCase()}</p>
        <p><small>Generated by: ${adminName} on ${currentDate} at ${currentTime}</small></p>
      </div>

      <div class="report-info">
        <h2>Report Information</h2>
        <p><strong>Generated on:</strong> ${currentDate} at ${currentTime}</p>
        <p><strong>Time Period:</strong> ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</p>
        <p><strong>Report Type:</strong> Complete Analytics Overview</p>
        <p><strong>Generated by:</strong> ${adminName}</p>
      </div>

      <div class="stats-grid">
        <div class="stats-card">
          <h3>Total Users</h3>
          <div class="value">${userStats?.totalUsers || 0}</div>
        </div>
        <div class="stats-card">
          <h3>Active Users</h3>
          <div class="value">${userStats?.activeUsers || 0}</div>
        </div>
        <div class="stats-card">
          <h3>Total Reports</h3>
          <div class="value">${reportStats?.totalReports || 0}</div>
        </div>
        <div class="stats-card">
          <h3>Resolved Reports</h3>
          <div class="value">${reportStats?.reportStatus?.find(r => r.status === 'resolved')?.count || 0}</div>
        </div>
      </div>

      <div class="section">
        <h2>Noise Level Distribution</h2>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Noise Level</th>
              <th>Reports</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${noiseLevelsHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>User Distribution</h2>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>User Type</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${userTypesHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Recent Activity</h2>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Action</th>
              <th>Location</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${recentActivityHTML}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This report was automatically generated by the NOISEWATCH Analytics System</p>
        <p>For questions or support, please contact the system administrator</p>
      </div>
    </body>
    </html>
    `;
  };

  const handleExportReport = async () => {
    try {
      setExportLoading(true);
      const htmlContent = generateHTMLReport();
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NOISEWATCH_Analytics_Report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const toggleNotificationModal = () => {
    setNotificationModalVisible(!notificationModalVisible);
    if (!notificationModalVisible) {
      // Mark all as read when opening notification modal
      markAllAsRead();
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const refreshAnalytics = () => {
    fetchAllData(true);
  };

  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' }
  ];

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderSummaryCard = (title, value, icon, color, loading) => (
    <div className={`summary-card ${loading ? 'loading' : ''}`} style={{ borderLeftColor: color }}>
      <div className="summary-content">
        <div className="summary-info">
          <div className="summary-title">{title}</div>
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <div>
              <div className="summary-value" style={{ color }}>{value || 0}</div>
            </div>
          )}
        </div>
        <div className="summary-icon" style={{ backgroundColor: color + '20' }}>
          <span className="material-icons">{icon}</span>
        </div>
      </div>
    </div>
  );

  const renderStatSummaryCard = (title, items, icon, loading) => (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span className="material-icons" style={{ color: '#8B4513' }}>{icon}</span>
          {title}
        </div>
      </div>
      <div className="card-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
          </div>
        ) : items && items.length > 0 ? (
          <div className="stats-list">
            {items.map((item, index) => (
              <div key={index} className="stat-item">
                <div className="stat-info">
                  {'color' in item && (
                    <div className="stat-color" style={{ backgroundColor: item.color }} />
                  )}
                  <div className="stat-name">
                    {'level' in item 
                      ? item.level.charAt(0).toUpperCase() + item.level.slice(1)
                      : 'type' in item 
                        ? item.type === 'user' ? 'Regular Users' : 'Admin Users'
                        : item.status?.replace('_', ' ').charAt(0).toUpperCase() + item.status?.replace('_', ' ').slice(1)
                    }
                  </div>
                </div>
                <div className="stat-stats">
                  <div className="stat-count">{item.count || 0}</div>
                  {item.percentage && (
                    <div className="stat-percent">{item.percentage}%</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <span className="material-icons">info</span>
            <div>No data available</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDataTrendCard = (title, data, labels, icon, color, loading) => (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span className="material-icons" style={{ color: '#8B4513' }}>{icon}</span>
          {title}
        </div>
      </div>
      <div className="card-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
          </div>
        ) : data && data.length > 0 ? (
          <div className="trend-summary">
            <div className="trend-header">
              <div className="trend-total" style={{ color }}>
                Total: {data.reduce((sum, val) => sum + (val || 0), 0)}
              </div>
              <div className="trend-average">
                Avg: {Math.round(data.reduce((sum, val) => sum + (val || 0), 0) / data.length)}
              </div>
            </div>
            <div className="trend-items">
              {data.map((value, index) => (
                <div key={index} className="trend-item">
                  <div className="trend-label">{labels?.[index] || `Day ${index + 1}`}</div>
                  <div className="trend-value" style={{ color }}>{value || 0}</div>
                  <div className="trend-bar-container">
                    <div 
                      className="trend-bar" 
                      style={{ 
                        backgroundColor: color,
                        width: `${Math.min((value / Math.max(...data)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-data">
            <span className="material-icons">info</span>
            <div>No trend data available</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span className="material-icons" style={{ color: '#8B4513' }}>timeline</span>
          Recent Activity
        </div>
        <button className="view-all-btn">
          <div className="view-all-text">View All</div>
        </button>
      </div>
      <div className="card-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  <span className="material-icons">
                    {activity.action?.includes('Reported') ? 'volume_up' : 
                     activity.action?.includes('Updated') ? 'edit' :
                     activity.action?.includes('Registered') ? 'person_add' :
                     activity.action?.includes('Resolved') ? 'check_circle' : 'notifications'}
                  </span>
                </div>
                <div className="activity-info">
                  <div className="activity-header">
                    <div className="activity-user">{activity.user || 'Anonymous'}</div>
                    <div className="activity-time">{activity.time || 'Just now'}</div>
                  </div>
                  <div className="activity-action">{activity.action || 'Activity'}</div>
                  {activity.location && <div className="activity-location">{activity.location}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <span className="material-icons">info</span>
            <div>No recent activity</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard-container">
      {/* Page Header with Actions */}
      <div className="page-header">
        <div className="section-title">Admin Dashboard</div>
        <div className="header-actions">
          <button
            className={`btn btn-secondary ${refreshing ? 'btn-disabled' : ''}`}
            onClick={refreshAnalytics}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <div className="loading-spinner small"></div>
            ) : (
              <span className="material-icons">refresh</span>
            )}
            <div className="btn-secondary-text">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </div>
          </button>
          <button
            className={`btn btn-primary ${exportLoading ? 'btn-disabled' : ''}`}
            onClick={handleExportReport}
            disabled={exportLoading || loading}
          >
            {exportLoading ? (
              <div className="loading-spinner small"></div>
            ) : (
              <span className="material-icons">download</span>
            )}
            <div className="btn-primary-text">
              {exportLoading ? 'Generating...' : 'Export Report'}
            </div>
          </button>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className="period-selector">
        <div className="period-content">
          {periods.map((period) => (
            <button
              key={period.id}
              className={`period-button ${selectedPeriod === period.id ? 'period-button-active' : ''}`}
              onClick={() => setSelectedPeriod(period.id)}
              disabled={loading}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-grid">
        {renderSummaryCard('Total Users', userStats?.totalUsers, 'people', '#8B4513', loading)}
        {renderSummaryCard('Active Users', userStats?.activeUsers, 'person', '#DAA520', loading)}
        {renderSummaryCard('New Users', userStats?.newUsers, 'person_add', '#B8860B', loading)}
        {renderSummaryCard('Total Reports', reportStats?.totalReports, 'description', '#8B7355', loading)}
        {renderSummaryCard('Resolved Reports', reportStats?.reportStatus?.find(r => r.status === 'resolved')?.count, 'check_circle', '#4CAF50', loading)}
        {renderSummaryCard('High Noise Reports', reportStats?.noiseLevels?.find(n => n.level === 'high')?.count, 'warning', '#F44336', loading)}
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="grid-column">
          {renderStatSummaryCard('User Distribution', userStats?.userByType, 'people', loading)}
          {renderDataTrendCard(
            'User Growth Trend', 
            userStats?.userGrowth, 
            userStats?.activityLabels, 
            'trending_up', 
            '#8B4513', 
            loading
          )}
        </div>
        
        <div className="grid-column">
          {renderStatSummaryCard('Noise Level Distribution', reportStats?.noiseLevels, 'volume_up', loading)}
          {renderStatSummaryCard('Report Status', reportStats?.reportStatus, 'assignment', loading)}
        </div>
        
        <div className="grid-column">
          {renderDataTrendCard(
            'Active Users Trend', 
            userStats?.userActivity, 
            userStats?.activityLabels, 
            'person', 
            '#DAA520', 
            loading
          )}
          {renderDataTrendCard(
            'Report Filing Trend', 
            reportStats?.reportTrend, 
            reportStats?.trendLabels, 
            'timeline', 
            '#8B7355', 
            loading
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-section">
        {renderRecentActivity()}
      </div>
    </div>
  );

  if (loading && !refreshing) {
    return (
      <div className="container">
        <div className="loading-container fullscreen">
          <div className="loading-spinner large"></div>
          <div className="loading-text">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-top">
            <div className="header-left">
              <button onClick={openDrawer} className="header-button">
                <span className="material-icons">menu</span>
              </button>
              <div className="header-welcome">
                <span className="welcome-text">Welcome back,</span>
                <span className="admin-name">{adminName}</span>
              </div>
              <div className="real-time-clock">
                <span className="material-icons">schedule</span>
                <span className="clock-time">{formatTime(currentTime)}</span>
              </div>
            </div>
            <div className="header-right">
              <button 
                onClick={toggleNotificationModal} 
                className="header-button notification-button"
              >
                <span className="material-icons">notifications</span>
                {unreadNotifications > 0 && (
                  <div className="notification-badge">
                    <div className="notification-badge-text">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </div>
                  </div>
                )}
              </button>
              <button onClick={handleLogout} className="header-button">
                <span className="material-icons">logout</span>
              </button>
            </div>
          </div>
          <div className="header-title"><h1>NOISEWATCH</h1></div>
          <div className="header-subtitle">Admin Dashboard | {formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {renderDashboard()}
      </div>

      {/* Notification Modal */}
      {notificationModalVisible && (
        <div className="notification-modal-overlay" onClick={() => setNotificationModalVisible(false)}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-header">
              <h2 className="notification-modal-title">Notifications</h2>
              <div className="notification-modal-actions">
                <button 
                  className="notification-action-btn mark-read-btn"
                  onClick={markAllAsRead}
                  disabled={unreadNotifications === 0}
                >
                  <span className="material-icons">check</span>
                  <span>Mark all as read</span>
                </button>
                <button 
                  className="notification-action-btn clear-btn"
                  onClick={clearAllNotifications}
                  disabled={notifications.length === 0}
                >
                  <span className="material-icons">delete</span>
                  <span>Clear all</span>
                </button>
                <button 
                  className="notification-close-btn"
                  onClick={() => setNotificationModalVisible(false)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>
            
            <div className="notification-modal-content">
              {notifications.length > 0 ? (
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-icon" style={{ 
                        backgroundColor: `${getPriorityColor(notification.priority)}20`,
                        color: getPriorityColor(notification.priority)
                      }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h3 className="notification-title">{notification.title}</h3>
                          <span className="notification-time">{notification.time}</span>
                        </div>
                        <p className="notification-message">{notification.message}</p>
                        <div className="notification-tags">
                          <span className="notification-tag" style={{ 
                            backgroundColor: getPriorityColor(notification.priority),
                            color: 'white'
                          }}>
                            {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
                          </span>
                          <span className="notification-tag">
                            {notification.category?.charAt(0).toUpperCase() + notification.category?.slice(1)}
                          </span>
                          {notification.data?.noiseLevel && (
                            <span className="notification-tag noise-level-tag">
                              {notification.data.noiseLevel.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="notification-unread-indicator"></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-notifications">
                  <span className="material-icons large">notifications_off</span>
                  <h3>No notifications</h3>
                  <p>You're all caught up! Check back later for updates.</p>
                </div>
              )}
            </div>
            
            <div className="notification-modal-footer">
              <div className="notification-stats">
                <span className="stat-item">
                  <span className="stat-number">{unreadNotifications}</span>
                  <span className="stat-label">Unread</span>
                </span>
                <span className="stat-divider">•</span>
                <span className="stat-item">
                  <span className="stat-number">{notifications.length}</span>
                  <span className="stat-label">Total</span>
                </span>
                <span className="stat-divider">•</span>
                <span className="stat-item">
                  <span className="stat-number">
                    {notifications.filter(n => n.category === 'report').length}
                  </span>
                  <span className="stat-label">Reports</span>
                </span>
              </div>
              <button 
                className="notification-close-footer-btn"
                onClick={() => setNotificationModalVisible(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Drawer */}
      {drawerVisible && (
        <div className="modal-container">
          <div className="overlay" onClick={closeDrawer}></div>
          <div className="drawer-container">
            <CustomDrawer onClose={closeDrawer} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;