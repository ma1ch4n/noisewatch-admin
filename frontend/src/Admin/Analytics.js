import React, { useState, useEffect, useRef } from 'react';
import './Analytics.css';
import CustomDrawer from './CustomDrawer';

// Import Chart.js properly
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const Analytics = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [userStats, setUserStats] = useState(null);
  const [reportStats, setReportStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Refs for charts
  const userChartRef = useRef(null);
  const userTypeChartRef = useRef(null);
  const userActivityChartRef = useRef(null);
  const noiseLevelChartRef = useRef(null);
  const reportStatusChartRef = useRef(null);
  const reportTrendChartRef = useRef(null);
  
  // Chart instances
  const [userChart, setUserChart] = useState(null);
  const [userTypeChart, setUserTypeChart] = useState(null);
  const [userActivityChart, setUserActivityChart] = useState(null);
  const [noiseLevelChart, setNoiseLevelChart] = useState(null);
  const [reportStatusChart, setReportStatusChart] = useState(null);
  const [reportTrendChart, setReportTrendChart] = useState(null);

  // API endpoint
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchAnalytics();
    return () => {
      // Clean up charts
      destroyAllCharts();
    };
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching analytics...');
      
      // Fetch all data in parallel
      const [userResponse, reportResponse, activityResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/users?period=${selectedPeriod}`),
        fetch(`${API_BASE_URL}/analytics/reports?period=${selectedPeriod}`),
        fetch(`${API_BASE_URL}/analytics/recent-activity`)
      ]);

      if (!userResponse.ok) throw new Error('Failed to fetch user analytics');
      if (!reportResponse.ok) throw new Error('Failed to fetch report analytics');
      if (!activityResponse.ok) throw new Error('Failed to fetch recent activity');

      const userData = await userResponse.json();
      const reportData = await reportResponse.json();
      const activityData = await activityResponse.json();
      
      setUserStats(userData);
      setReportStats(reportData);
      setRecentActivity(activityData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      alert('Could not load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && userStats && reportStats) {
      destroyAllCharts();
      setTimeout(() => {
        createCharts();
      }, 100);
    }
  }, [loading, userStats, reportStats, selectedPeriod]);

  const destroyAllCharts = () => {
    if (userChart) userChart.destroy();
    if (userTypeChart) userTypeChart.destroy();
    if (userActivityChart) userActivityChart.destroy();
    if (noiseLevelChart) noiseLevelChart.destroy();
    if (reportStatusChart) reportStatusChart.destroy();
    if (reportTrendChart) reportTrendChart.destroy();
  };

  const createCharts = () => {
    if (!userStats || !reportStats) return;

    // User Growth Chart (Line)
    if (userChartRef.current && userStats.userGrowth) {
      const ctx = userChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: userStats.activityLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Total Users',
              data: userStats.userGrowth || [],
              borderColor: '#8B4513',
              backgroundColor: 'rgba(139, 69, 19, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            },
            {
              label: 'Active Users',
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
              text: 'User Growth & Activity',
              color: '#8B4513',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                color: '#666'
              }
            },
            y: {
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                color: '#666'
              },
              beginAtZero: true
            }
          }
        }
      });
      setUserChart(chart);
    }

    // User Type Chart (Pie)
    if (userTypeChartRef.current && userStats.userByType) {
      const ctx = userTypeChartRef.current.getContext('2d');
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
              text: 'User Distribution by Type',
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

    // User Activity Chart (Bar)
    if (userActivityChartRef.current && userStats.userActivity) {
      const ctx = userActivityChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: userStats.activityLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Active Users',
            data: userStats.userActivity || [],
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
              text: 'Daily Active Users',
              color: '#8B4513',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#666'
              }
            },
            y: {
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                color: '#666',
                stepSize: 20
              },
              beginAtZero: true
            }
          }
        }
      });
      setUserActivityChart(chart);
    }

    // Noise Level Chart (Doughnut)
    if (noiseLevelChartRef.current && reportStats.noiseLevels) {
      const ctx = noiseLevelChartRef.current.getContext('2d');
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
              if (n.level === 'low') return '#388E3C';
              if (n.level === 'medium') return '#F57C00';
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
              text: 'Noise Level Distribution',
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

    // Report Status Chart (Pie)
    if (reportStatusChartRef.current && reportStats.reportStatus) {
      const ctx = reportStatusChartRef.current.getContext('2d');
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
              text: 'Report Status Distribution',
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

    // Report Trend Chart (Line)
    if (reportTrendChartRef.current && reportStats.reportTrend) {
      const ctx = reportTrendChartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: reportStats.trendLabels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [{
            label: 'Reports Filed',
            data: reportStats.reportTrend || [],
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
              text: 'Monthly Report Trend',
              color: '#8B4513',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                color: '#666'
              }
            },
            y: {
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                color: '#666',
                stepSize: 10
              },
              beginAtZero: true
            }
          }
        }
      });
      setReportTrendChart(chart);
    }
  };

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const refreshAnalytics = () => {
    fetchAnalytics();
  };

  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' }
  ];

  const renderStatCard = (title, value, icon, color, change) => (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-header">
        <span className="material-icons stat-icon" style={{ color }}>{icon}</span>
        <div className="stat-title">{title}</div>
      </div>
      <div className="stat-content">
        <div className="stat-value">{value || 0}</div>
        {change !== undefined && (
          <div className="stat-change" style={{ color: change > 0 ? '#4CAF50' : '#F44336' }}>
            {change > 0 ? '↗' : '↘'} {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );

  const renderNoiseLevelStats = () => (
    <div className="noise-level-stats">
      {reportStats?.noiseLevels?.map((level, index) => (
        <div key={index} className="noise-level-item">
          <div className="noise-level-header">
            <div className="noise-level-indicator" style={{ backgroundColor: level.color }} />
            <div className="noise-level-name">{level.level.charAt(0).toUpperCase() + level.level.slice(1)}</div>
          </div>
          <div className="noise-level-count">{level.count || 0} reports</div>
          <div className="noise-level-percent">{level.percentage || 0}%</div>
        </div>
      ))}
    </div>
  );

  const renderReportStatusStats = () => (
    <div className="report-status-stats">
      {reportStats?.reportStatus?.map((status, index) => (
        <div key={index} className="status-item">
          <div className="status-header">
            <div className="status-indicator" style={{ backgroundColor: status.color }} />
            <div className="status-name">
              {status.status.replace('_', ' ').charAt(0).toUpperCase() + status.status.replace('_', ' ').slice(1)}
            </div>
          </div>
          <div className="status-count">{status.count || 0}</div>
          <div className="status-percent">{status.percentage || 0}%</div>
        </div>
      ))}
    </div>
  );

  const renderRecentActivityList = () => (
    <div className="activity-list">
      {recentActivity.map((activity, index) => (
        <div key={index} className="activity-item">
          <div className="activity-icon">
            <span className="material-icons">
              {activity.action?.includes('Reported') ? 'volume_up' : 
               activity.action?.includes('Updated') ? 'edit' :
               activity.action?.includes('Registered') ? 'person_add' :
               activity.action?.includes('Resolved') ? 'check_circle' : 'notifications'}
            </span>
          </div>
          <div className="activity-content">
            <div className="activity-header">
              <div className="activity-user">{activity.user || 'Anonymous'}</div>
              <div className="activity-time">{activity.time || 'Just now'}</div>
            </div>
            <div className="activity-action">{activity.action || 'Activity'}</div>
            {activity.location && <div className="activity-location">{activity.location}</div>}
            {activity.report && <div className="activity-report">Report #{activity.report}</div>}
          </div>
        </div>
      ))}
    </div>
  );

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

      {/* Time Period Selector */}
      <div className="period-selector">
        <div className="period-content">
          {periods.map((period) => (
            <button
              key={period.id}
              className={`period-button ${selectedPeriod === period.id ? 'period-button-active' : ''}`}
              onClick={() => setSelectedPeriod(period.id)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="analytics-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
            <div className="loading-text">Loading analytics...</div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="stats-grid">
              {renderStatCard('Total Users', userStats?.totalUsers, 'people', '#8B4513')}
              {renderStatCard('Active Users', userStats?.activeUsers, 'person', '#DAA520')}
              {renderStatCard('New Users', userStats?.newUsers, 'person_add', '#B8860B')}
              {renderStatCard('Total Reports', reportStats?.totalReports, 'description', '#8B7355')}
              {renderStatCard('Resolved Reports', reportStats?.reportStatus?.find(r => r.status === 'resolved')?.count, 'check_circle', '#4CAF50')}
              {renderStatCard('High Noise Reports', reportStats?.noiseLevels?.find(n => n.level === 'high')?.count, 'warning', '#F44336')}
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <div className="charts-grid">
                {/* User Charts */}
                {userStats?.userGrowth && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">User Growth & Activity</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={userChartRef} />
                    </div>
                  </div>
                )}

                {userStats?.userByType && (
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
                {reportStats?.noiseLevels && (
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

                {reportStats?.reportStatus && (
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
                {userStats?.userActivity && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">Daily Active Users</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={userActivityChartRef} />
                    </div>
                  </div>
                )}

                {reportStats?.reportTrend && (
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title">Monthly Report Trend</div>
                    </div>
                    <div className="chart-container">
                      <canvas ref={reportTrendChartRef} />
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
                  {recentActivity.length > 0 ? (
                    renderRecentActivityList()
                  ) : (
                    <div className="no-activity">
                      <span className="material-icons">info</span>
                      <div>No recent activity</div>
                    </div>
                  )}
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