import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AdminDashboard.css';
import CustomDrawer from './CustomDrawer';

// Import Chart.js properly
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const AdminDashboard = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminName, setAdminName] = useState('');
  
  // Data states - using dashboardData from new analytics route
  const [dashboardData, setDashboardData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');

  // Chart refs
  const noiseLevelChartRef = useRef(null);
  const reportStatusChartRef = useRef(null);
  const dailyReportsChartRef = useRef(null);
  const noiseCategoryChartRef = useRef(null);
  
  // Chart instances
  const [noiseLevelChart, setNoiseLevelChart] = useState(null);
  const [reportStatusChart, setReportStatusChart] = useState(null);
  const [dailyReportsChart, setDailyReportsChart] = useState(null);
  const [noiseCategoryChart, setNoiseCategoryChart] = useState(null);
  const [noiseCategories, setNoiseCategories] = useState([]);

  // API URL - single source of truth
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Period options
  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' }
  ];

  // ========== FETCH DASHBOARD DATA ==========
  const fetchDashboardData = async () => {
    if (!apiConnected) return;
    
    try {
      setRefreshing(true);
      setFetchError(null);
      
      console.log(`📊 Fetching dashboard data for period: ${selectedPeriod}`);
      console.log(`Using API: ${API_BASE_URL}/analytics/dashboard?period=${selectedPeriod}`);
      
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard?period=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Dashboard data received:', data);
        setDashboardData(data);
        
        // Set noise categories for charts
        if (data.noiseCategories) {
          setNoiseCategories(data.noiseCategories);
        }
        
        // Set recent activity
        if (data.recentActivity) {
          setRecentActivity(data.recentActivity);
        }
        
        // Generate notifications from recent activity
        generateNotifications(data.recentActivity);
      } else {
        throw new Error(data.error || 'Failed to load data');
      }
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setFetchError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ========== GENERATE NOTIFICATIONS ==========
  const generateNotifications = (activities) => {
    if (!activities || activities.length === 0) return;
    
    const newNotifications = [];
    const now = new Date();
    const savedUnreadIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    
    activities
      .filter(activity => {
        const activityTime = new Date(activity.timestamp);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        return activityTime > twoHoursAgo;
      })
      .forEach((activity) => {
        let priority = 'low';
        let title = 'System Activity';
        
        if (activity.type === 'report') {
          title = 'New Noise Report';
          if (activity.noiseLevel === 'red') priority = 'emergency';
          else if (activity.noiseLevel === 'yellow') priority = 'high';
          else priority = 'medium';
        } else if (activity.type === 'registration') {
          title = 'New User Registered';
          priority = 'medium';
        }
        
        const notificationId = `notif-${activity.id}-${new Date(activity.timestamp).getTime()}`;
        const isRead = savedUnreadIds.includes(notificationId);
        
        newNotifications.push({
          id: notificationId,
          type: activity.type,
          title,
          message: `${activity.user} ${activity.action}`,
          time: activity.time,
          timestamp: activity.timestamp,
          read: isRead,
          priority,
          data: activity
        });
      });

    newNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setNotifications(newNotifications.slice(0, 30));
    setUnreadNotifications(newNotifications.filter(n => !n.read).length);
  };

  // ========== FORMAT TIME AGO ==========
  const formatTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return 'Just now';
    
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
  }, []);

  // ========== TEST API CONNECTION ==========
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log(`🔍 Testing connection to: ${API_BASE_URL}/reports/get-report`);
        const response = await fetch(`${API_BASE_URL}/reports/get-report`, { 
          method: 'HEAD',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors'
        });
        
        if (response.ok) {
          console.log(`✅ Connected to API at: ${API_BASE_URL}`);
          setApiConnected(true);
          setFetchError(null);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Failed to connect: ${error.message}`);
        setApiConnected(false);
        setFetchError('Cannot connect to server. Make sure backend is running on port 5000');
        setLoading(false);
      }
    };
    
    testConnection();
    
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(clockInterval);
    };
  }, []);

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    const storedAdmin = localStorage.getItem('adminName') || 'Administrator';
    setAdminName(storedAdmin);
    
    if (apiConnected) {
      fetchDashboardData();
    }
  }, [apiConnected]);

  // Fetch data when period changes
  useEffect(() => {
    if (apiConnected) {
      fetchDashboardData();
    }
  }, [selectedPeriod, apiConnected]);

  // Refresh every 30 seconds if connected
  useEffect(() => {
    if (!apiConnected) return;
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [apiConnected, selectedPeriod]);

  // ========== CREATE CHARTS ==========
  useEffect(() => {
    if (!loading && dashboardData) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        destroyAllCharts();
        createCharts();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [loading, dashboardData]);

  const destroyAllCharts = () => {
    if (noiseLevelChart) noiseLevelChart.destroy();
    if (reportStatusChart) reportStatusChart.destroy();
    if (dailyReportsChart) dailyReportsChart.destroy();
    if (noiseCategoryChart) noiseCategoryChart.destroy();
  };

  const drawEmptyChart = (canvas, message = 'No reports available for this period') => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 400;
    const height = canvas.height || 250;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw a subtle background
    ctx.fillStyle = '#FDF5E6';
    ctx.fillRect(0, 0, width, height);
    
    // Draw a dashed circle for visual interest
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 20, 60, 0, 2 * Math.PI);
    ctx.strokeStyle = '#D4B48C';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]); // Reset
    
    // Draw icon
    ctx.font = '48px "Material Icons"';
    ctx.fillStyle = '#D4B48C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊', width / 2, height / 2 - 20);
    
    // Draw message
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillStyle = '#8B7355';
    ctx.fillText('No Reports Yet', width / 2, height / 2 + 30);
    
    // Draw sub-message
    ctx.font = '13px "Inter", sans-serif';
    ctx.fillStyle = '#A39587';
    ctx.fillText(message, width / 2, height / 2 + 55);
    
    // Draw a small decorative element
    ctx.beginPath();
    ctx.moveTo(width / 2 - 40, height - 30);
    ctx.lineTo(width / 2 + 40, height - 30);
    ctx.strokeStyle = '#D4B48C';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const createCharts = () => {
    if (!dashboardData) return;
    
    const { reportStats } = dashboardData;
    const totalReports = reportStats?.totalReports || 0;

    // 1. Noise Level Chart (Doughnut) - FIXED COLOR MAPPING
    if (noiseLevelChartRef.current) {
      const ctx = noiseLevelChartRef.current.getContext('2d');
      if (noiseLevelChart) noiseLevelChart.destroy();
      
      const hasData = reportStats?.noiseLevels?.some(n => n.count > 0);
      
      if (hasData) {
        // Sort noise levels to ensure consistent order: red, yellow, green
        const noiseOrder = ['red', 'yellow', 'green'];
        const sortedNoiseLevels = [...reportStats.noiseLevels].sort((a, b) => 
          noiseOrder.indexOf(a.level) - noiseOrder.indexOf(b.level)
        );
        
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: sortedNoiseLevels.map(n => 
              n.level === 'red' ? '🔴 High Noise' : 
              n.level === 'yellow' ? '🟡 Medium Noise' : 
              '🟢 Low Noise'
            ),
            datasets: [{
              data: sortedNoiseLevels.map(n => n.count),
              backgroundColor: sortedNoiseLevels.map(n => 
                n.level === 'red' ? '#F44336' : 
                n.level === 'yellow' ? '#FFC107' : 
                '#4CAF50'
              ),
              borderColor: sortedNoiseLevels.map(n => 
                n.level === 'red' ? '#D32F2F' : 
                n.level === 'yellow' ? '#FFA000' : 
                '#388E3C'
              ),
              borderWidth: 2,
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
              legend: { 
                position: 'top',
                labels: {
                  color: '#3E2C23',
                  font: { weight: '600', size: 12, family: "'Inter', sans-serif" },
                  usePointStyle: true,
                  pointStyle: 'circle',
                  padding: 15
                }
              },
              title: {
                display: true,
                text: '🔊 Noise Level Distribution',
                color: '#3E2C23',
                font: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
                padding: { top: 10, bottom: 20 }
              },
              tooltip: {
                backgroundColor: '#3E2C23',
                titleColor: '#FDF5E6',
                bodyColor: '#FDF5E6',
                titleFont: { weight: 'bold', size: 13, family: "'Inter', sans-serif" },
                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                padding: 10,
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const percentage = totalReports > 0 ? Math.round((value / totalReports) * 100) : 0;
                    return `${label.replace(/[🔴🟡🟢]/g, '')}: ${value} reports (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
        setNoiseLevelChart(chart);
      } else {
        // Draw empty state
        drawEmptyChart(noiseLevelChartRef.current, 'No noise level data available');
      }
    }

    // 2. Report Status Chart (Pie) - FIXED COLOR MAPPING
    if (reportStatusChartRef.current) {
      const ctx = reportStatusChartRef.current.getContext('2d');
      if (reportStatusChart) reportStatusChart.destroy();
      
      const hasData = reportStats?.reportStatus?.some(s => s.count > 0);
      
      if (hasData) {
        // Sort statuses to ensure consistent order: pending, monitoring, action_required, resolved
        const statusOrder = ['pending', 'monitoring', 'action_required', 'resolved'];
        const sortedStatuses = [...reportStats.reportStatus].sort((a, b) => 
          statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
        );
        
        const chart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: sortedStatuses.map(s => 
              s.status === 'pending' ? '⏳ Pending' :
              s.status === 'monitoring' ? '👀 Monitoring' :
              s.status === 'action_required' ? '⚠️ Action Required' :
              '✅ Resolved'
            ),
            datasets: [{
              data: sortedStatuses.map(s => s.count),
              backgroundColor: sortedStatuses.map(s => 
                s.status === 'pending' ? '#FF9800' :
                s.status === 'monitoring' ? '#2196F3' :
                s.status === 'action_required' ? '#F44336' :
                '#4CAF50'
              ),
              borderColor: sortedStatuses.map(s => 
                s.status === 'pending' ? '#F57C00' :
                s.status === 'monitoring' ? '#1976D2' :
                s.status === 'action_required' ? '#D32F2F' :
                '#388E3C'
              ),
              borderWidth: 2,
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                position: 'top',
                labels: {
                  color: '#3E2C23',
                  font: { weight: '600', size: 12, family: "'Inter', sans-serif" },
                  usePointStyle: true,
                  pointStyle: 'circle',
                  padding: 15
                }
              },
              title: {
                display: true,
                text: '📋 Report Status',
                color: '#3E2C23',
                font: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
                padding: { top: 10, bottom: 20 }
              },
              tooltip: {
                backgroundColor: '#3E2C23',
                titleColor: '#FDF5E6',
                bodyColor: '#FDF5E6',
                titleFont: { weight: 'bold', size: 13, family: "'Inter', sans-serif" },
                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                padding: 10,
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const percentage = totalReports > 0 ? Math.round((value / totalReports) * 100) : 0;
                    return `${label.replace(/[⏳👀⚠️✅]/g, '')}: ${value} reports (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
        setReportStatusChart(chart);
      } else {
        // Draw empty state
        drawEmptyChart(reportStatusChartRef.current, 'No report status data available');
      }
    }

    // 3. Daily Reports Chart (Bar) - With data labels on bars
    if (dailyReportsChartRef.current) {
      const ctx = dailyReportsChartRef.current.getContext('2d');
      if (dailyReportsChart) dailyReportsChart.destroy();
      
      const hasData = reportStats?.reportTrend?.some(v => v > 0);
      
      if (hasData) {
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#D35400');
        gradient.addColorStop(0.5, '#E67E22');
        gradient.addColorStop(1, '#F39C12');
        
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: reportStats.trendLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: 'Reports',
              data: reportStats.reportTrend,
              backgroundColor: gradient,
              borderColor: '#D35400',
              borderWidth: 1,
              borderRadius: 6,
              barPercentage: 0.7,
              categoryPercentage: 0.8,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: `${selectedPeriod === 'daily' ? '⏰ Hourly Reports' : '📅 Daily Reports'}`,
                color: '#3E2C23',
                font: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
                padding: { top: 10, bottom: 20 }
              },
              tooltip: {
                backgroundColor: '#3E2C23',
                titleColor: '#FDF5E6',
                bodyColor: '#FDF5E6',
                titleFont: { weight: 'bold', size: 13, family: "'Inter', sans-serif" },
                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                padding: 10,
                callbacks: {
                  label: function(context) {
                    const value = context.raw || 0;
                    return `📊 Reports: ${value}`;
                  }
                }
              }
            },
            scales: {
              y: { 
                beginAtZero: true, 
                ticks: { 
                  stepSize: 1, 
                  precision: 0, 
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 11 },
                  callback: function(value) {
                    return value;
                  }
                },
                grid: { color: 'rgba(93, 74, 54, 0.1)' },
                title: {
                  display: true,
                  text: 'Number of Reports',
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 12, weight: '500' }
                }
              },
              x: { 
                ticks: { 
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
                  maxRotation: 45,
                  minRotation: 45
                },
                grid: { display: false },
                title: {
                  display: true,
                  text: selectedPeriod === 'daily' ? 'Hour of Day' : 'Day',
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 12, weight: '500' }
                }
              }
            }
          }
        });
        setDailyReportsChart(chart);
        
        // Add custom data labels after chart is drawn
        setTimeout(() => {
          const chartInstance = chart;
          const meta = chartInstance.getDatasetMeta(0);
          if (meta && meta.data) {
            meta.data.forEach((bar, index) => {
              const value = reportStats.reportTrend[index];
              if (value > 0) {
                const { x, y } = bar.tooltipPosition();
                ctx.font = 'bold 11px "Inter", sans-serif';
                ctx.fillStyle = '#3E2C23';
                ctx.textAlign = 'center';
                ctx.fillText(value, x, y - 8);
              }
            });
          }
        }, 100);
      } else {
        // Draw empty state
        drawEmptyChart(dailyReportsChartRef.current, 'No reports in this period');
      }
    }

    // 4. Noise Category Chart (Bar) - With data labels on bars
    if (noiseCategoryChartRef.current) {
      const ctx = noiseCategoryChartRef.current.getContext('2d');
      if (noiseCategoryChart) noiseCategoryChart.destroy();
      
      const hasData = noiseCategories.length > 0;
      
      if (hasData) {
        // Generate unique colors for each category
        const colors = [
          '#DAA520', // Music - Gold
          '#8B4513', // Vehicle - Brown
          '#B8860B', // Construction - Dark Golden
          '#8B7355', // Shouting - Light Brown
          '#CD853F', // Party - Peru
          '#D2B48C', // Animal - Tan
          '#654321', // Industrial - Dark Brown
          '#A0522D'  // Machinery - Sienna
        ];
        
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: noiseCategories.slice(0, 5).map(c => c.name),
            datasets: [{
              label: 'Number of Reports',
              data: noiseCategories.slice(0, 5).map(c => c.count),
              backgroundColor: colors.slice(0, 5),
              borderColor: colors.slice(0, 5).map(c => c),
              borderWidth: 1,
              borderRadius: 6,
              barPercentage: 0.6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: '🏷️ Top Noise Categories',
                color: '#3E2C23',
                font: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
                padding: { top: 10, bottom: 20 }
              },
              tooltip: {
                backgroundColor: '#3E2C23',
                titleColor: '#FDF5E6',
                bodyColor: '#FDF5E6',
                titleFont: { weight: 'bold', size: 13, family: "'Inter', sans-serif" },
                bodyFont: { size: 12, family: "'Inter', sans-serif" },
                padding: 10,
                callbacks: {
                  label: function(context) {
                    const value = context.raw || 0;
                    return `📊 Reports: ${value}`;
                  }
                }
              }
            },
            scales: {
              y: { 
                beginAtZero: true, 
                ticks: { 
                  stepSize: 1, 
                  precision: 0, 
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 11 },
                  callback: function(value) {
                    return value;
                  }
                },
                grid: { color: 'rgba(93, 74, 54, 0.1)' },
                title: {
                  display: true,
                  text: 'Number of Reports',
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 12, weight: '500' }
                }
              },
              x: { 
                ticks: { 
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
                  maxRotation: 45,
                  minRotation: 45
                },
                grid: { display: false },
                title: {
                  display: true,
                  text: 'Category',
                  color: '#5D4A36',
                  font: { family: "'Inter', sans-serif", size: 12, weight: '500' }
                }
              }
            }
          }
        });
        setNoiseCategoryChart(chart);
        
        // Add custom data labels after chart is drawn
        setTimeout(() => {
          const chartInstance = chart;
          const meta = chartInstance.getDatasetMeta(0);
          if (meta && meta.data) {
            meta.data.forEach((bar, index) => {
              const value = noiseCategories[index].count;
              if (value > 0) {
                const { x, y } = bar.tooltipPosition();
                ctx.font = 'bold 11px "Inter", sans-serif';
                ctx.fillStyle = '#3E2C23';
                ctx.textAlign = 'center';
                ctx.fillText(value, x, y - 8);
              }
            });
          }
        }, 100);
      } else {
        // Draw empty state
        drawEmptyChart(noiseCategoryChartRef.current, 'No category data available');
      }
    }
  };

  // ========== NOTIFICATION ACTIONS ==========
  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
    
    const savedUnreadIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!savedUnreadIds.includes(id)) {
      savedUnreadIds.push(id);
      localStorage.setItem('readNotifications', JSON.stringify(savedUnreadIds));
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadNotifications(0);
    localStorage.setItem('readNotifications', JSON.stringify(notifications.map(n => n.id)));
  };

  const clearAllNotifications = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
      setUnreadNotifications(0);
      localStorage.removeItem('readNotifications');
    }
  };

  // ========== UI ACTIONS ==========
  const openDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);
  
  const toggleNotificationModal = () => {
    setNotificationModalVisible(!notificationModalVisible);
  };

  const handleViewAllActivity = () => {
    setActivityModalVisible(true);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  // ========== RENDER METHODS ==========
  const renderStatCard = (title, value, icon, color) => (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-header">
        <span className="material-icons stat-icon" style={{ color }}>{icon}</span>
        <div className="stat-title">{title}</div>
      </div>
      <div className="stat-content">
        <div className="stat-value">{value || 0}</div>
      </div>
    </div>
  );

  const renderNoiseCategoryStats = () => (
    <div className="noise-category-stats">
      {noiseCategories.slice(0, 5).map((category, index) => (
        <div key={index} className="category-item">
          <div className="category-header">
            <div className="category-indicator" style={{ backgroundColor: category.color || '#D35400' }} />
            <div className="category-name">{category.name}</div>
          </div>
          <div className="category-count">{category.count}</div>
        </div>
      ))}
    </div>
  );

  const renderRecentActivityList = () => (
    <div className="activity-list">
      {recentActivity.length > 0 ? (
        recentActivity.slice(0, 8).map((activity, index) => (
          <div key={activity.id || index} className="activity-item">
            <div className="activity-icon">
              <span className="material-icons">
                {activity.type === 'report' ? 'volume_up' : 'person_add'}
              </span>
            </div>
            <div className="activity-content">
              <div className="activity-header">
                <div className="activity-user">{activity.user || 'Anonymous'}</div>
                <div className="activity-time">{activity.time}</div>
              </div>
              <div className="activity-action">
                {activity.user} {activity.action}
                {activity.reason && `: ${activity.reason}`}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="no-activity">
          <span className="material-icons" style={{ fontSize: '48px', color: '#D4B48C' }}>info</span>
          <h3 style={{ color: '#8B7355', margin: '10px 0', fontWeight: 600 }}>No Recent Activity</h3>
          <p style={{ color: '#A39587' }}>Activities will appear here when users submit reports or register</p>
        </div>
      )}
    </div>
  );

  const renderActivityModal = () => (
    <div className="notification-modal-overlay" onClick={() => setActivityModalVisible(false)}>
      <div className="notification-modal activity-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-modal-header">
          <h2 className="notification-modal-title">
            <span className="material-icons" style={{ color: '#D35400' }}>timeline</span>
            All Activity
          </h2>
          <button className="notification-close-btn" onClick={() => setActivityModalVisible(false)}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="notification-modal-content">
          {recentActivity.length > 0 ? (
            <div className="activity-list-full">
              {recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="activity-item-full">
                  <div className="activity-icon">
                    <span className="material-icons">
                      {activity.type === 'report' ? 'volume_up' : 'person_add'}
                    </span>
                  </div>
                  <div className="activity-info">
                    <div className="activity-user">{activity.user}</div>
                    <div className="activity-time">{activity.time}</div>
                    <div className="activity-action">{activity.action}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-notifications">
              <span className="material-icons large" style={{ fontSize: '64px', color: '#D4B48C' }}>list_alt</span>
              <h3 style={{ color: '#8B7355' }}>No Activity Found</h3>
              <p style={{ color: '#A39587' }}>There are no activity records to display.</p>
            </div>
          )}
        </div>
        <div className="notification-modal-footer">
          <button className="notification-close-footer-btn" onClick={() => setActivityModalVisible(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'report': return '📢';
      case 'registration': return '👤';
      default: return '📋';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return '#ff4444';
      case 'high': return '#ff8c00';
      case 'medium': return '#ffaa00';
      case 'low': return '#4CAF50';
      default: return '#8B7355';
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="dashboard-container">
        <div className="loading-container fullscreen">
          <div className="loading-spinner large"></div>
          <div className="loading-text">Loading admin dashboard...</div>
          {!apiConnected && (
            <div className="loading-text" style={{ color: '#F44336', marginTop: '10px' }}>
              Cannot connect to server. Make sure backend is running on port 5000
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-gradient">
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
                  <span>{formatTime(currentTime)}</span>
                </div>
              </div>
              <div className="header-right">
                <button onClick={toggleNotificationModal} className="header-button notification-button">
                  <span className="material-icons">notifications</span>
                  {unreadNotifications > 0 && (
                    <span className="notification-badge">{unreadNotifications}</span>
                  )}
                </button>
                <button onClick={handleLogout} className="header-button">
                  <span className="material-icons">logout</span>
                </button>
              </div>
            </div>
            <div className="header-title">
              <h1>NOISEWATCH</h1>
              <div className="header-subtitle">
                Admin Dashboard | {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        <div className="period-content">
          {periods.map((period) => (
            <button
              key={period.id}
              className={`period-button ${selectedPeriod === period.id ? 'period-button-active' : ''}`}
              onClick={() => handlePeriodChange(period.id)}
            >
              {period.label}
            </button>
          ))}
        </div>
        <button onClick={refreshData} className="refresh-button" disabled={refreshing || !apiConnected}>
          <span className="material-icons">{refreshing ? 'sync' : 'refresh'}</span>
        </button>
      </div>

      {/* Period Title */}
      <div className="period-title">
        <span className="period-title-label">Current View:</span>
        <span className="period-title-value">{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</span>
      </div>

      {/* Error Message */}
      {fetchError && (
        <div className="error-message">
          <span className="material-icons">error</span>
          <span>{fetchError}</span>
        </div>
      )}

      {!apiConnected && (
        <div className="error-message" style={{ backgroundColor: '#FFF3CD', borderLeftColor: '#FFC107', color: '#856404' }}>
          <span className="material-icons">warning</span>
          <span>Cannot connect to server. Please make sure your backend is running on port 5000</span>
        </div>
      )}

      {/* Main Content */}
      {apiConnected && dashboardData && (
        <div className="dashboard-content">
          {/* Summary Stats */}
          <div className="stats-grid">
            {renderStatCard('Total Users', dashboardData.userStats?.totalUsers, 'people', '#3E2C23')}
            {renderStatCard('Active Users', dashboardData.userStats?.activeUsers, 'person', '#5D4A36')}
            {renderStatCard('New Users', dashboardData.userStats?.newUsers, 'person_add', '#D35400')}
            {renderStatCard('Total Reports', dashboardData.reportStats?.totalReports, 'description', '#3E2C23')}
            {renderStatCard(`${selectedPeriod} Reports`, dashboardData.reportStats?.periodReports, 'assignment', '#D35400')}
            {renderStatCard('Resolved Reports', dashboardData.reportStats?.resolvedReports || 0, 'check_circle', '#4CAF50')}
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            <div className="charts-grid">
              {/* Noise Level Distribution Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <span className="material-icons">volume_up</span>
                    Noise Level Distribution
                  </div>
                </div>
                <div className="chart-container">
                  <canvas ref={noiseLevelChartRef} />
                </div>
              </div>

              {/* Report Status Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <span className="material-icons">assignment</span>
                    Report Status
                  </div>
                </div>
                <div className="chart-container">
                  <canvas ref={reportStatusChartRef} />
                </div>
              </div>

              {/* Daily Reports Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <span className="material-icons">bar_chart</span>
                    {selectedPeriod === 'daily' ? 'Hourly Reports' : 'Daily Reports'}
                  </div>
                </div>
                <div className="chart-container">
                  <canvas ref={dailyReportsChartRef} />
                </div>
              </div>

              {/* Noise Category Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <span className="material-icons">category</span>
                    Top Noise Categories
                  </div>
                </div>
                <div className="chart-container">
                  <canvas ref={noiseCategoryChartRef} />
                </div>
                <div className="chart-stats">
                  {renderNoiseCategoryStats()}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity-section">
            <div className="activity-card">
              <div className="activity-header">
                <div className="activity-title">
                  <span className="material-icons">history</span>
                  Recent Activity
                </div>
                <button className="view-all-button" onClick={handleViewAllActivity}>
                  <span>View All</span>
                  <span className="material-icons">arrow_forward</span>
                </button>
              </div>
              <div className="activity-content">
                {renderRecentActivityList()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notificationModalVisible && (
        <div className="notification-modal-overlay" onClick={() => setNotificationModalVisible(false)}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-header">
              <h2 className="notification-modal-title">
                <span className="material-icons" style={{ color: '#D35400' }}>notifications</span>
                Notifications
              </h2>
              <div className="notification-modal-actions">
                <button onClick={markAllAsRead} disabled={unreadNotifications === 0} className="mark-read-btn">
                  <span className="material-icons">check</span> Mark all read
                </button>
                <button onClick={clearAllNotifications} disabled={notifications.length === 0} className="clear-btn">
                  <span className="material-icons">delete</span> Clear all
                </button>
                <button onClick={() => setNotificationModalVisible(false)} className="notification-close-btn">
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
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="notification-icon" style={{
                        backgroundColor: `${getPriorityColor(notification.priority)}20`,
                        color: getPriorityColor(notification.priority)
                      }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-content">
                        <h3 className="notification-title">{notification.title}</h3>
                        <p className="notification-message">{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-notifications">
                  <span className="material-icons large" style={{ fontSize: '64px', color: '#D4B48C' }}>notifications_off</span>
                  <h3 style={{ color: '#8B7355' }}>No notifications</h3>
                  <p style={{ color: '#A39587' }}>You're all caught up!</p>
                </div>
              )}
            </div>
            <div className="notification-modal-footer">
              <div className="notification-stats">
                <span className="stat-number">{unreadNotifications}</span>
                <span className="stat-label">Unread</span>
                <span className="stat-divider">•</span>
                <span className="stat-number">{notifications.length}</span>
                <span className="stat-label">Total</span>
              </div>
              <button onClick={() => setNotificationModalVisible(false)} className="notification-close-footer-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {activityModalVisible && renderActivityModal()}

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