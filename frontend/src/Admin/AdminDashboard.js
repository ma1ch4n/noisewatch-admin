import React, { useState, useEffect } from 'react'; // Removed unused useRef
import './AdminDashboard.css';
import CustomDrawer from './CustomDrawer'; // Import CustomDrawer


const AdminDashboard = () => {
  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // Data state
  const [data, setData] = useState({
    reportsToday: 0,
    flaggedAreas: 0,
    totalReports: 0,
    resolvedReports: 0,
    recentReports: [],
    noiseCategories: [
      { type: 'traffic', count: 45, color: '#D2B48C' },
      { type: 'music', count: 32, color: '#DAA520' },
      { type: 'construction', count: 28, color: '#B8860B' },
      { type: 'shouting', count: 15, color: '#8B7355' },
      { type: 'machinery', count: 12, color: '#CD853F' }
    ],
    topNoiseSources: [
      { location: 'Main Street & 5th Ave', reports: 18, level: 'high' },
      { location: 'Central Park Area', reports: 14, level: 'medium' },
      { location: 'Industrial Zone', reports: 12, level: 'high' },
      { location: 'University District', reports: 9, level: 'medium' },
      { location: 'Downtown Plaza', reports: 7, level: 'low' }
    ],
    alerts: [
      { id: 1, type: 'repeated', location: 'Main Street', message: '5 reports in 2 hours', severity: 'high' },
      { id: 2, type: 'threshold', location: 'Industrial Zone', message: 'Noise level above 85dB', severity: 'critical' },
      { id: 3, type: 'pattern', location: 'University District', message: 'Late night disturbances', severity: 'medium' }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Mock data - replace with actual API calls
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock recent reports data
      const mockRecentReports = [
        {
          id: 1,
          type: 'traffic',
          location: 'Main Street & 5th Ave',
          reporter: 'John Doe',
          time: '2 min ago',
          level: 'high',
          status: 'pending'
        },
        {
          id: 2,
          type: 'music',
          location: 'Central Park',
          reporter: 'Jane Smith',
          time: '5 min ago',
          level: 'medium',
          status: 'investigating'
        },
        {
          id: 3,
          type: 'construction',
          location: 'Industrial Zone',
          reporter: 'Mike Johnson',
          time: '8 min ago',
          level: 'high',
          status: 'resolved'
        },
        {
          id: 4,
          type: 'shouting',
          location: 'University District',
          reporter: 'Sarah Wilson',
          time: '12 min ago',
          level: 'low',
          status: 'pending'
        },
        {
          id: 5,
          type: 'machinery',
          location: 'Downtown Plaza',
          reporter: 'David Brown',
          time: '15 min ago',
          level: 'medium',
          status: 'resolved'
        }
      ];

      setData(prevData => ({
        ...prevData,
        reportsToday: 47,
        flaggedAreas: 3,
        totalReports: 132,
        resolvedReports: 85,
        recentReports: mockRecentReports
      }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // PDF Report Generation for noise monitoring
  const generateHTMLReport = () => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    const totalCategoryReports = data.noiseCategories.reduce((sum, cat) => sum + cat.count, 0);

    const categoryListHTML = data.noiseCategories.map((category, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${category.type}</td>
        <td style="padding: 8px; text-align: center;">${category.count}</td>
        <td style="padding: 8px; text-align: center;">${((category.count / totalCategoryReports) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    const recentReportsHTML = data.recentReports.slice(0, 10).map((report, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${report.type}</td>
        <td style="padding: 8px; text-align: left;">${report.location}</td>
        <td style="padding: 8px; text-align: left;">${report.reporter}</td>
        <td style="padding: 8px; text-align: left;">${report.time}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; color: white; background-color: ${
            report.status === 'resolved' ? '#8B7355' : report.status === 'investigating' ? '#DAA520' : '#B8860B'
          };">
            ${report.status}
          </span>
        </td>
      </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>NOISEWATCH - Admin Dashboard Report</title>
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
        <p>Admin Dashboard Report</p>
      </div>

      <div class="report-info">
        <h2>Report Information</h2>
        <p><strong>Generated on:</strong> ${currentDate} at ${currentTime}</p>
        <p><strong>Report Type:</strong> Complete Dashboard Overview</p>
        <p><strong>Data Source:</strong> Live NOISEWATCH</p>
      </div>

      <div class="stats-grid">
        <div class="stats-card">
          <h3>Reports Today</h3>
          <div class="value">${data.reportsToday}</div>
        </div>
        <div class="stats-card">
          <h3>Flagged Areas</h3>
          <div class="value">${data.flaggedAreas}</div>
        </div>
        <div class="stats-card">
          <h3>Total Reports</h3>
          <div class="value">${data.totalReports}</div>
        </div>
        <div class="stats-card">
          <h3>Resolved Reports</h3>
          <div class="value">${data.resolvedReports}</div>
        </div>
      </div>

      <div class="section">
        <h2>Noise Categories Breakdown</h2>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>Reports</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${categoryListHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Recent Reports</h2>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Location</th>
              <th>Reporter</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentReportsHTML}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This report was automatically generated by the Noise Monitoring Admin System</p>
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
      
      // Create a blob and download the file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Noise_Monitoring_Report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Could not generate report.');
    } finally {
      setExportLoading(false);
    }
  };

  // Drawer functions
  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Clear storage and redirect
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  // Render functions
  const renderSummaryCard = (title, value, icon, color, trend, loading) => (
    <div className={`summary-card ${loading ? 'loading' : ''}`} style={{ borderLeftColor: color }}>
      <div className="summary-content">
        <div className="summary-info">
          <div className="summary-title">{title}</div>
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <div>
              <div className="summary-value" style={{ color }}>{value}</div>
              {trend && <div className="summary-trend">↗ {trend}</div>}
            </div>
          )}
        </div>
        <div className="summary-icon" style={{ backgroundColor: color + '20' }}>
          <span className="material-icons">{icon}</span>
        </div>
      </div>
    </div>
  );

  const renderNoiseCategoryChart = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Top Noise Categories</div>
      </div>
      <div className="card-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
          </div>
        ) : (
          <div className="chart-container">
            {data.noiseCategories.map((category, index) => {
              const total = data.noiseCategories.reduce((sum, cat) => sum + cat.count, 0);
              const percentage = ((category.count / total) * 100).toFixed(1);
              return (
                <div key={index} className="category-item">
                  <div className="category-info">
                    <div className="category-color" style={{ backgroundColor: category.color }} />
                    <div className="category-name">{category.type}</div>
                  </div>
                  <div className="category-stats">
                    <div className="category-count">{category.count}</div>
                    <div className="category-percent">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderRecentReports = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Recent Reports</div>
        <button className="view-all-btn">
          <div className="view-all-text">View All</div>
        </button>
      </div>
      <div className="card-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner large"></div>
          </div>
        ) : (
          <div className="reports-list">
            {data.recentReports.slice(0, 5).map((report, index) => (
              <div key={report.id} className="report-item">
                <div className="report-icon">
                  <span className="material-icons">{getNoiseIcon(report.type)}</span>
                </div>
                <div className="report-info">
                  <div className="report-header">
                    <div className="report-type">{report.type.toUpperCase()}</div>
                    <div className="report-time">{report.time}</div>
                  </div>
                  <div className="report-location">{report.location}</div>
                  <div className="report-reporter">Reported by {report.reporter}</div>
                </div>
                <div className="status-badge" style={{ 
                  backgroundColor: getStatusColor(report.status) + '20',
                  color: getStatusColor(report.status)
                }}>
                  {report.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAlertsAndFlags = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Alerts & Flags</div>
        <div className="alert-count">
          <div className="alert-count-text">{data.alerts.length}</div>
        </div>
      </div>
      <div className="card-content">
        <div className="alerts-list">
          {data.alerts.map((alert) => (
            <div key={alert.id} className="alert-item">
              <div className="alert-indicator" style={{ backgroundColor: getAlertSeverityColor(alert.severity) }} />
              <div className="alert-content">
                <div className="alert-header">
                  <div className="alert-location">{alert.location}</div>
                  <div className="alert-severity" style={{ color: getAlertSeverityColor(alert.severity) }}>
                    {alert.severity.toUpperCase()}
                  </div>
                </div>
                <div className="alert-message">{alert.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTopNoiseSources = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Top Noise Sources</div>
      </div>
      <div className="card-content">
        <div className="sources-list">
          {data.topNoiseSources.map((source, index) => (
            <div key={index} className="source-item">
              <div className="source-rank">
                <div className="source-rank-text">{index + 1}</div>
              </div>
              <div className="source-info">
                <div className="source-location">{source.location}</div>
                <div className="source-reports">{source.reports} reports</div>
              </div>
              <div className="level-indicator" style={{ backgroundColor: getReportLevelColor(source.level) }}>
                <div className="level-text">{source.level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Helper functions
  const getNoiseIcon = (type) => {
    const icons = {
      traffic: 'directions_car',
      music: 'music_note',
      construction: 'construction',
      shouting: 'record_voice_over',
      machinery: 'settings'
    };
    return icons[type] || 'volume_up';
  };

  const getReportLevelColor = (level) => {
    const colors = {
      high: '#8B4513',
      medium: '#DAA520',
      low: '#D2B48C'
    };
    return colors[level] || '#8B7355';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#B8860B',
      investigating: '#DAA520',
      resolved: '#8B7355'
    };
    return colors[status] || '#8B7355';
  };

  const getAlertSeverityColor = (severity) => {
    const colors = {
      critical: '#8B0000',
      high: '#B8860B',
      medium: '#DAA520'
    };
    return colors[severity] || '#8B7355';
  };

  const renderDashboard = () => (
    <div className="dashboard-container">
      {/* Header Actions */}
      <div className="page-header">
        <div className="section-title">Noise Monitoring</div>
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
      
      {/* Summary Cards */}
      <div className="summary-grid">
        {renderSummaryCard('Reports Today', data.reportsToday, 'today', '#DAA520', '+15%', loading)}
        {renderSummaryCard('Flagged Areas', data.flaggedAreas, 'warning', '#B8860B', null, loading)}
        {renderSummaryCard('Total Reports', data.totalReports, 'bar_chart', '#8B4513', '+8%', loading)}
        {renderSummaryCard('Resolved', data.resolvedReports, 'check_circle', '#8B7355', '64%', loading)}
      </div>

      {/* Noise Categories Chart */}
      {renderNoiseCategoryChart()}

      {/* Recent Reports */}
      {renderRecentReports()}

      {/* Top Noise Sources */}
      {renderTopNoiseSources()}

      {/* Alerts & Flags */}
      {renderAlertsAndFlags()}
    </div>
  );

  if (error) {
    return (
      <div className="container">
        <div className="error-container">
          <div className="error-card">
            <span className="material-icons">error</span>
            <div className="error-title">Unable to load dashboard</div>
            <div className="error-message">{error}</div>
            <button className="retry-button" onClick={() => fetchData()}>
              <div className="retry-button-text">Try Again</div>
            </button>
          </div>
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
            <button onClick={openDrawer} className="header-button">
              <span className="material-icons">menu</span>
            </button>
            <div className="header-right">
              <button className="header-button">
                <span className="material-icons">notifications</span>
                <div className="notification-badge">
                  <div className="notification-badge-text">3</div>
                </div>
              </button>
              <button onClick={handleLogout} className="header-button">
                <span className="material-icons">logout</span>
              </button>
            </div>
          </div>
          <div className="header-title"><h1>NOISEWATCH</h1></div>
          <div className="header-subtitle">Admin Dashboard</div>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {renderDashboard()}
      </div>

      {/* Custom Drawer */}
      {drawerVisible && (
        <div className="modal-container">
          <div className="overlay" onClick={closeDrawer}></div>
          <div className="drawer-container">
            <CustomDrawer onClose={closeDrawer} /> {/* Fixed: Using actual CustomDrawer component */}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;