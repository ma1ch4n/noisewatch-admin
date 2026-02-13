import React, { useState, useEffect, useRef } from 'react';
import './Analytics.css';
import CustomDrawer from './CustomDrawer';

// Import Chart.js properly
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const Analytics = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  
  // Refs for charts
  const userChartRef = useRef(null);
  const userTypeChartRef = useRef(null);
  const userActivityChartRef = useRef(null);
  const noiseLevelChartRef = useRef(null);
  const reportStatusChartRef = useRef(null);
  const reportTrendChartRef = useRef(null);
  const noiseCategoryChartRef = useRef(null);
  
  // Chart instances
  const [userChart, setUserChart] = useState(null);
  const [userTypeChart, setUserTypeChart] = useState(null);
  const [userActivityChart, setUserActivityChart] = useState(null);
  const [noiseLevelChart, setNoiseLevelChart] = useState(null);
  const [reportStatusChart, setReportStatusChart] = useState(null);
  const [reportTrendChart, setReportTrendChart] = useState(null);
  const [noiseCategoryChart, setNoiseCategoryChart] = useState(null);

  // API endpoint - WITHOUT /api prefix (base URL only)
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch available months for dropdown
  const fetchAvailableMonths = async () => {
    try {
      console.log('📅 Fetching available months...');
      const response = await fetch(`${API_BASE_URL}/reports/get-report`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      const reports = await response.json();
      console.log(`📊 Found ${reports.length} reports`);
      
      // Extract unique months from reports
      const monthsMap = new Map();
      
      reports.forEach(report => {
        if (report.createdAt) {
          const date = new Date(report.createdAt);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            });
            
            if (!monthsMap.has(monthKey)) {
              monthsMap.set(monthKey, {
                key: monthKey,
                label: monthLabel,
                year: year,
                month: month,
                timestamp: date.getTime()
              });
            }
          }
        }
      });

      const monthArray = Array.from(monthsMap.values());
      monthArray.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log('📅 Available months:', monthArray.map(m => m.label));
      setAvailableMonths(monthArray);
      
      if (monthArray.length > 0 && !selectedMonth) {
        setSelectedMonth(monthArray[0]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching months:', error);
      // Set fallback months (last 6 months)
      const fallbackMonths = [];
      const now = new Date();
      
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
        
        fallbackMonths.push({
          key: monthKey,
          label: monthLabel,
          year: year,
          month: month,
          timestamp: date.getTime()
        });
      }
      
      setAvailableMonths(fallbackMonths);
      if (!selectedMonth) {
        setSelectedMonth(fallbackMonths[0]);
      }
    }
  };

  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    return () => {
      destroyAllCharts();
    };
  }, [selectedPeriod, selectedMonth]);

  // NEW: Single function to fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      let url = `${API_BASE_URL}/analytics/dashboard?period=${selectedPeriod}`;
      
      // If monthly with custom month, use custom period
      if (selectedPeriod === 'monthly' && selectedMonth) {
        const year = selectedMonth.year;
        const month = selectedMonth.month;
        const startDate = new Date(year, month, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        
        url = `${API_BASE_URL}/analytics/dashboard?period=custom&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      }
      
      console.log(`📊 Fetching dashboard data from: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Dashboard data received:', data);
        setDashboardData(data);
      } else {
        throw new Error(data.error || 'Failed to load data');
      }
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && dashboardData) {
      destroyAllCharts();
      setTimeout(() => {
        createCharts();
      }, 100);
    }
  }, [loading, dashboardData, selectedPeriod, selectedMonth]);

  const destroyAllCharts = () => {
    if (userChart) userChart.destroy();
    if (userTypeChart) userTypeChart.destroy();
    if (userActivityChart) userActivityChart.destroy();
    if (noiseLevelChart) noiseLevelChart.destroy();
    if (reportStatusChart) reportStatusChart.destroy();
    if (reportTrendChart) reportTrendChart.destroy();
    if (noiseCategoryChart) noiseCategoryChart.destroy();
  };

  const createCharts = () => {
    if (!dashboardData) return;
    
    const { userStats, reportStats, noiseCategories } = dashboardData;

    // 1. User Growth Chart (Line)
    if (userChartRef.current && userStats.userGrowth) {
      const ctx = userChartRef.current.getContext('2d');
      if (userChart) userChart.destroy();
      
      const hasData = userStats.userGrowth.some(v => v > 0) || userStats.userActivity?.some(v => v > 0);
      
      if (hasData) {
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: userStats.activityLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
              {
                label: 'New Users',
                data: userStats.userGrowth || [],
                borderColor: '#8B4513',
                backgroundColor: 'rgba(139, 69, 19, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              },
              {
                label: 'Reports',
                data: userStats.userActivity || [],
                borderColor: '#DAA520',
                backgroundColor: 'rgba(218, 165, 32, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: '#333',
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: `Activity Overview - ${dashboardData.period}`,
                color: '#8B4513',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  precision: 0
                }
              }
            }
          }
        });
        setUserChart(chart);
      }
    }

    // 2. User Type Chart (Pie)
    if (userTypeChartRef.current && userStats.userByType) {
      const ctx = userTypeChartRef.current.getContext('2d');
      if (userTypeChart) userTypeChart.destroy();
      
      const hasData = userStats.userByType.some(u => u.count > 0);
      if (hasData) {
        const chart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: userStats.userByType.map(u => 
              u.type === 'user' ? 'Regular Users' : 'Admin Users'
            ),
            datasets: [{
              data: userStats.userByType.map(u => u.count),
              backgroundColor: ['#DAA520', '#8B4513'],
              borderColor: ['#C69500', '#6B3510'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: '#333',
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: `User Distribution - ${dashboardData.period}`,
                color: '#8B4513',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
        setUserTypeChart(chart);
      }
    }

    // 3. User Activity Chart (Bar)
    if (userActivityChartRef.current && userStats.userActivity) {
      const ctx = userActivityChartRef.current.getContext('2d');
      if (userActivityChart) userActivityChart.destroy();
      
      const hasData = userStats.userActivity.some(v => v > 0);
      if (hasData) {
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: userStats.activityLabels?.slice(0, 7) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: 'Reports',
              data: userStats.userActivity.slice(0, 7) || [],
              backgroundColor: 'rgba(139, 69, 19, 0.7)',
              borderColor: '#8B4513',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: true,
                text: `${selectedPeriod === 'daily' ? 'Hourly' : 'Daily'} Reports - ${dashboardData.period}`,
                color: '#8B4513',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  precision: 0
                }
              }
            }
          }
        });
        setUserActivityChart(chart);
      }
    }

    // 4. Noise Level Chart (Doughnut)
    if (noiseLevelChartRef.current && reportStats.noiseLevels) {
      const hasData = reportStats.noiseLevels.some(n => n.count > 0);
      if (hasData) {
        const ctx = noiseLevelChartRef.current.getContext('2d');
        if (noiseLevelChart) noiseLevelChart.destroy();
        
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: reportStats.noiseLevels.map(n => 
              n.level.charAt(0).toUpperCase() + n.level.slice(1)
            ),
            datasets: [{
              data: reportStats.noiseLevels.map(n => n.count),
              backgroundColor: reportStats.noiseLevels.map(n => n.color),
              borderColor: reportStats.noiseLevels.map(n => {
                if (n.level === 'green') return '#388E3C';
                if (n.level === 'yellow') return '#F57C00';
                return '#D32F2F';
              }),
              borderWidth: 1
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
                  color: '#333',
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: `Noise Level Distribution - ${dashboardData.period}`,
                color: '#8B4513',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} reports (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
        setNoiseLevelChart(chart);
      }
    }

    // 5. Report Status Chart (Pie)
    if (reportStatusChartRef.current && reportStats.reportStatus) {
      const hasData = reportStats.reportStatus.some(s => s.count > 0);
      if (hasData) {
        const ctx = reportStatusChartRef.current.getContext('2d');
        if (reportStatusChart) reportStatusChart.destroy();
        
        const chart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: reportStats.reportStatus.map(r => 
              r.status.replace('_', ' ').charAt(0).toUpperCase() + 
              r.status.replace('_', ' ').slice(1)
            ),
            datasets: [{
              data: reportStats.reportStatus.map(r => r.count),
              backgroundColor: reportStats.reportStatus.map(r => r.color),
              borderColor: reportStats.reportStatus.map(r => {
                if (r.status === 'resolved') return '#388E3C';
                if (r.status === 'monitoring') return '#1976D2';
                if (r.status === 'pending') return '#F57C00';
                return '#D32F2F';
              }),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: '#333',
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: `Report Status - ${dashboardData.period}`,
                color: '#8B4513',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} reports (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
        setReportStatusChart(chart);
      }
    }

    // 6. Report Trend Chart (Line)
    if (reportTrendChartRef.current && reportStats.reportTrend) {
      const hasData = reportStats.reportTrend.some(v => v > 0);
      if (hasData) {
        const ctx = reportTrendChartRef.current.getContext('2d');
        if (reportTrendChart) reportTrendChart.destroy();
        
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: reportStats.trendLabels?.slice(0, 7) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: 'Reports',
              data: reportStats.reportTrend.slice(0, 7) || [],
              borderColor: '#8B4513',
              backgroundColor: 'rgba(139, 69, 19, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: '#333',
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: `Report Trend - ${dashboardData.period}`,
                color: '#8B4513',
                font: {
                  size: 14,
                  weight: 'bold'
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  precision: 0
                }
              }
            }
          }
        });
        setReportTrendChart(chart);
      }
    }

    // 7. Noise Category Chart (Bar)
    if (noiseCategoryChartRef.current && noiseCategories.length > 0) {
      const ctx = noiseCategoryChartRef.current.getContext('2d');
      if (noiseCategoryChart) noiseCategoryChart.destroy();
      
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: noiseCategories.slice(0, 6).map(c => c.name),
          datasets: [{
            label: 'Number of Reports',
            data: noiseCategories.slice(0, 6).map(c => c.count),
            backgroundColor: noiseCategories.slice(0, 6).map(c => c.color || '#8B4513'),
            borderColor: noiseCategories.slice(0, 6).map(c => c.color || '#8B4513'),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Top Noise Categories',
              color: '#8B4513',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                precision: 0
              }
            }
          }
        }
      });
      setNoiseCategoryChart(chart);
    }
  };

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const refreshAnalytics = () => {
    fetchDashboardData();
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period !== 'monthly') {
      setSelectedMonth(null);
    } else {
      if (availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0]);
      }
    }
  };

  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' }
  ];

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

  const renderNoiseLevelStats = () => (
    <div className="noise-level-stats">
      {dashboardData?.reportStats?.noiseLevels?.map((level, index) => (
        <div key={index} className="noise-level-item">
          <div className="noise-level-header">
            <div className="noise-level-indicator" style={{ backgroundColor: level.color }} />
            <div className="noise-level-name">{level.level?.charAt(0).toUpperCase() + level.level?.slice(1)}</div>
          </div>
          <div className="noise-level-count">{level.count || 0}</div>
          <div className="noise-level-percent">{level.percentage || 0}%</div>
        </div>
      ))}
    </div>
  );

  const renderReportStatusStats = () => (
    <div className="report-status-stats">
      {dashboardData?.reportStats?.reportStatus?.map((status, index) => (
        <div key={index} className="status-item">
          <div className="status-header">
            <div className="status-indicator" style={{ backgroundColor: status.color }} />
            <div className="status-name">
              {status.status?.replace('_', ' ').charAt(0).toUpperCase() + status.status?.replace('_', ' ').slice(1)}
            </div>
          </div>
          <div className="status-count">{status.count || 0}</div>
          <div className="status-percent">{status.percentage || 0}%</div>
        </div>
      ))}
    </div>
  );

  const renderNoiseCategoryStats = () => (
    <div className="noise-category-stats">
      {dashboardData?.noiseCategories?.slice(0, 5).map((category, index) => (
        <div key={index} className="category-item">
          <div className="category-header">
            <div className="category-indicator" style={{ backgroundColor: category.color || '#8B4513' }} />
            <div className="category-name">{category.name}</div>
          </div>
          <div className="category-count">{category.count}</div>
        </div>
      ))}
    </div>
  );

  const renderRecentActivityList = () => (
    <div className="activity-list">
      {dashboardData?.recentActivity?.length > 0 ? (
        dashboardData.recentActivity.map((activity, index) => (
          <div key={activity.id || index} className="activity-item">
            <div className="activity-icon">
              <span className="material-icons">
                {activity.type === 'report' ? 'volume_up' : 'person_add'}
              </span>
            </div>
            <div className="activity-content">
              <div className="activity-header">
                <div className="activity-user">{activity.user || 'Anonymous'}</div>
                <div className="activity-time">{activity.time || 'Just now'}</div>
              </div>
              <div className="activity-action">
                {activity.user} {activity.action}
                {activity.reason && `: ${activity.reason}`}
              </div>
              {activity.location && <div className="activity-location">{activity.location}</div>}
            </div>
          </div>
        ))
      ) : (
        <div className="no-activity">
          <span className="material-icons">info</span>
          <div>No recent activity</div>
        </div>
      )}
    </div>
  );

  const getPeriodTitle = () => {
    if (selectedPeriod === 'monthly' && selectedMonth) {
      return selectedMonth.label;
    }
    return selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-container fullscreen">
          <div className="loading-spinner large"></div>
          <div className="loading-text">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-gradient">
          <div className="header-content">
            <div className="header-top">
              <button onClick={openDrawer} className="header-button">
                <span className="material-icons">menu</span>
              </button>
              <div className="header-actions">
                <button onClick={refreshAnalytics} className="header-button" disabled={loading}>
                  <span className="material-icons">refresh</span>
                </button>
              </div>
            </div>
            <div className="header-title">📈 Analytics Dashboard</div>
            <div className="header-subtitle">
              Comprehensive insights into user activity and report statistics
            </div>
          </div>
        </div>
      </div>

      {/* Time Period Selector with Month Dropdown */}
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
        
        {/* Month Dropdown - Only show when Monthly is selected */}
        {selectedPeriod === 'monthly' && (
          <div className="month-selector">
            <span className="material-icons month-icon">calendar_today</span>
            <select
              className="month-dropdown"
              value={selectedMonth?.key || ''}
              onChange={(e) => {
                const month = availableMonths.find(m => m.key === e.target.value);
                if (month) {
                  setSelectedMonth(month);
                }
              }}
              disabled={loading || availableMonths.length === 0}
            >
              {availableMonths.length === 0 ? (
                <option value="">No months available</option>
              ) : (
                availableMonths.map((month) => (
                  <option key={month.key} value={month.key}>
                    {month.label}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {/* Period Title */}
      <div className="period-title">
        <span className="period-title-label">Current View:</span>
        <span className="period-title-value">{getPeriodTitle()}</span>
      </div>

      {/* Main Content */}
      <div className="analytics-content">
        {!dashboardData ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
            <div className="loading-text">No data available</div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="stats-grid">
              {renderStatCard('Total Users', dashboardData.userStats?.totalUsers, 'people', '#8B4513')}
              {renderStatCard('Active Users', dashboardData.userStats?.activeUsers, 'person', '#DAA520')}
              {renderStatCard('New Users', dashboardData.userStats?.newUsers, 'person_add', '#B8860B')}
              {renderStatCard('Total Reports', dashboardData.reportStats?.totalReports, 'description', '#8B7355')}
              {renderStatCard('Period Reports', dashboardData.reportStats?.periodReports, 'assignment', '#E67E22')}
              {renderStatCard('Resolved Reports', dashboardData.reportStats?.resolvedReports || 0, 'check_circle', '#4CAF50')}
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <div className="charts-grid">
                {/* User Charts */}
                {dashboardData.userStats?.userGrowth && dashboardData.userStats?.userActivity && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">Activity Overview</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={userChartRef} />
                    </div>
                  </div>
                )}

                {dashboardData.userStats?.userByType && dashboardData.userStats.userByType.some(u => u.count > 0) && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">User Distribution</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={userTypeChartRef} />
                    </div>
                  </div>
                )}

                {/* Report Charts */}
                {dashboardData.reportStats?.noiseLevels && dashboardData.reportStats.noiseLevels.some(n => n.count > 0) && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">Noise Level Distribution</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={noiseLevelChartRef} />
                    </div>
                    <div className="chart-stats">
                      {renderNoiseLevelStats()}
                    </div>
                  </div>
                )}

                {dashboardData.reportStats?.reportStatus && dashboardData.reportStats.reportStatus.some(s => s.count > 0) && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">Report Status Distribution</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={reportStatusChartRef} />
                    </div>
                    <div className="chart-stats">
                      {renderReportStatusStats()}
                    </div>
                  </div>
                )}

                {/* Additional Charts */}
                {dashboardData.userStats?.userActivity && dashboardData.userStats.userActivity.some(v => v > 0) && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">
                        {selectedPeriod === 'daily' ? 'Hourly Reports' : 'Daily Reports'}
                      </div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={userActivityChartRef} />
                    </div>
                  </div>
                )}

                {dashboardData.reportStats?.reportTrend && dashboardData.reportStats.reportTrend.some(v => v > 0) && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">Report Trend</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={reportTrendChartRef} />
                    </div>
                  </div>
                )}

                {/* Noise Category Chart */}
                {dashboardData.noiseCategories?.length > 0 && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">Noise Categories</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={noiseCategoryChartRef} />
                    </div>
                    <div className="chart-stats">
                      {renderNoiseCategoryStats()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity-section">
              <div className="activity-card">
                <div className="activity-header">
                  <div className="activity-title">Recent Activity</div>
                  <button className="view-all-button">
                    <span>View All</span>
                    <span className="material-icons">arrow_forward</span>
                  </button>
                </div>
                <div className="activity-content">
                  {renderRecentActivityList()}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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

export default Analytics;