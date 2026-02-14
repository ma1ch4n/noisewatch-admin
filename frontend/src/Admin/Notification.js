import React, { useState, useEffect, useRef } from 'react';
import './Notification.css';
import CustomDrawer from './CustomDrawer';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    reports: 0,
    registrations: 0,
    critical: 0
  });
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState(24);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminName, setAdminName] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const navigate = useNavigate();
  const modalRef = useRef(null);

  // API URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // ========== TEST API CONNECTION ==========
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🔍 Testing connection to:', `${API_BASE_URL}/notification/test`);
        const response = await fetch(`${API_BASE_URL}/notification/test`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Connected to notification route:', data);
          setApiConnected(true);
          fetchNotifications();
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Failed to connect:', error);
        setApiConnected(false);
        setFetchError('Cannot connect to notification server');
        setLoading(false);
      }
    };

    const storedAdmin = localStorage.getItem('adminName') || 'Administrator';
    setAdminName(storedAdmin);
    testConnection();

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Close modal on escape key
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && modalVisible) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscKey);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener('keydown', handleEscKey);
    };
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!apiConnected || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [apiConnected, autoRefresh, timeRange]);

  // Apply filters when notifications or filter changes
  useEffect(() => {
    applyFilter();
  }, [notifications, filter]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && modalVisible) {
        closeModal();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modalVisible]);

  // Load read status from localStorage on initial load
  useEffect(() => {
    const savedReadIds = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
    if (savedReadIds.length > 0 && notifications.length > 0) {
      setNotifications(prev => 
        prev.map(n => ({
          ...n,
          read: savedReadIds.includes(n.id) ? true : n.read
        }))
      );
    }
  }, [notifications.length]);

  // ========== FETCH NOTIFICATIONS ==========
  const fetchNotifications = async (isRefresh = false) => {
    if (!apiConnected) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log(`📊 Fetching notifications from: ${API_BASE_URL}/notification/all?hours=${timeRange}`);
      
      const response = await fetch(
        `${API_BASE_URL}/notification/all?hours=${timeRange}&limit=100`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Found ${data.notifications.length} notifications`);
        
        // Get saved read IDs from localStorage
        const savedReadIds = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
        
        // Mark notifications as read if they're in savedReadIds
        const markedNotifications = data.notifications.map(n => ({
          ...n,
          read: savedReadIds.includes(n.id) ? true : n.read
        }));
        
        setNotifications(markedNotifications);
        
        // Calculate stats
        const unread = markedNotifications.filter(n => !n.read).length;
        const reports = markedNotifications.filter(n => n.type === 'report').length;
        const registrations = markedNotifications.filter(n => n.type === 'registration').length;
        const critical = markedNotifications.filter(n => n.priority === 'emergency').length;

        setStats({
          total: markedNotifications.length,
          unread,
          reports,
          registrations,
          critical
        });

        setFetchError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setFetchError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ========== APPLY FILTER ==========
  const applyFilter = () => {
    let filtered = [...notifications];

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'reports':
        filtered = filtered.filter(n => n.type === 'report');
        break;
      case 'registrations':
        filtered = filtered.filter(n => n.type === 'registration');
        break;
      case 'critical':
        filtered = filtered.filter(n => n.priority === 'emergency');
        break;
      default:
        break;
    }

    setFilteredNotifications(filtered);
  };

  // ========== MARK AS READ ==========
  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      
      // Update stats
      const unreadCount = updated.filter(n => !n.read).length;
      setStats(prevStats => ({
        ...prevStats,
        unread: unreadCount
      }));
      
      return updated;
    });

    // Save to localStorage
    const savedReadIds = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
    if (!savedReadIds.includes(id)) {
      savedReadIds.push(id);
      localStorage.setItem('readNotificationIds', JSON.stringify(savedReadIds));
    }
  };

  // ========== MARK ALL AS READ ==========
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      
      setStats(prevStats => ({
        ...prevStats,
        unread: 0
      }));

      // Save all IDs to localStorage
      const allIds = updated.map(n => n.id);
      localStorage.setItem('readNotificationIds', JSON.stringify(allIds));
      
      return updated;
    });
  };

  // ========== CLEAR ALL ==========
  const clearAllNotifications = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
      setFilteredNotifications([]);
      setSelectedNotification(null);
      setStats({
        total: 0,
        unread: 0,
        reports: 0,
        registrations: 0,
        critical: 0
      });
      localStorage.removeItem('readNotificationIds');
    }
  };

  // ========== HANDLE NOTIFICATION CLICK ==========
  const handleNotificationClick = (notification) => {
    // Mark as read immediately when clicked
    markAsRead(notification.id);
    setSelectedNotification(notification);
    setModalVisible(true);
  };

  // ========== CLOSE MODAL ==========
  const closeModal = () => {
    setModalVisible(false);
    setSelectedNotification(null);
  };

  // ========== VIEW FULL REPORT ==========
  const viewFullReport = () => {
    if (selectedNotification?.type === 'report' && selectedNotification.data?.reportId) {
      closeModal();
      // Navigate to the reports page with the report ID as a query parameter or state
      navigate('/admin/reports', { 
        state: { 
          reportId: selectedNotification.data.reportId,
          fromNotification: true 
        } 
      });
    }
  };

  // ========== VIEW USER PROFILE ==========
  const viewUserProfile = () => {
    if (selectedNotification?.user?.id) {
      closeModal();
      // Navigate to the users page
      navigate('/users', { 
        state: { 
          userId: selectedNotification.user.id,
          fromNotification: true 
        } 
      });
    }
  };

  // ========== GO BACK ==========
  const goBack = () => {
    closeModal();
  };

  // ========== HELPER: GET LOCATION STRING ==========
  const getLocationString = (location) => {
    if (!location) return null;
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      return location.formattedAddress || 
             location.address || 
             location.name || 
             `${location.city || ''} ${location.street || ''}`.trim() || 
             'Unknown location';
    }
    return 'Unknown location';
  };

  // ========== GET NOTIFICATION STYLE ==========
  const getNotificationStyle = (notification) => {
    if (notification.priority === 'emergency') return 'emergency';
    if (notification.priority === 'high') return 'high';
    if (notification.priority === 'medium') return 'medium';
    return 'low';
  };

  // ========== FORMAT TIME ==========
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

  const formatFullDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // ========== UI ACTIONS ==========
  const openDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const refreshData = () => {
    fetchNotifications(true);
  };

  const handleTimeRangeChange = (hours) => {
    setTimeRange(hours);
    setTimeout(() => fetchNotifications(), 100);
  };

  // ========== RENDER FILTER BUTTON ==========
  const FilterButton = ({ value, label, count }) => (
    <button
      className={`filter-button ${filter === value ? 'active' : ''}`}
      onClick={() => setFilter(value)}
    >
      <span className="filter-label">{label}</span>
      {count > 0 && <span className="filter-count">{count}</span>}
    </button>
  );

  // ========== RENDER NOTIFICATION ITEM ==========
  const renderNotificationItem = (notification) => {
    const locationString = getLocationString(notification.location);
    
    return (
      <div
        key={notification.id}
        className={`notification-item ${notification.read ? 'read' : 'unread'} ${getNotificationStyle(notification)}`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="notification-icon-wrapper">
          <span className="notification-icon">{notification.icon || '📋'}</span>
          {!notification.read && <span className="unread-dot" />}
        </div>

        <div className="notification-content">
          <div className="notification-header">
            <h3 className="notification-title">{notification.title}</h3>
            <span className="notification-time">{notification.time}</span>
          </div>

          <p className="notification-message">{notification.message}</p>

          {locationString && (
            <div className="notification-location">
              <span className="material-icons">location_on</span>
              <span>{locationString}</span>
            </div>
          )}

          {notification.reason && (
            <div className="notification-reason">
              <span className="material-icons">category</span>
              <span>{notification.reason}</span>
            </div>
          )}

          {notification.noiseLevel && (
            <div className={`notification-badge ${notification.noiseLevel}`}>
              {notification.noiseLevel === 'red' && '🔴 High'}
              {notification.noiseLevel === 'yellow' && '🟡 Medium'}
              {notification.noiseLevel === 'green' && '🟢 Low'}
            </div>
          )}
        </div>

        <button
          className="notification-mark-read"
          onClick={(e) => {
            e.stopPropagation();
            markAsRead(notification.id);
          }}
          title="Mark as read"
        >
          <span className="material-icons">check_circle</span>
        </button>
      </div>
    );
  };

  // ========== RENDER DETAIL MODAL ==========
  const renderDetailModal = () => {
    if (!selectedNotification) return null;

    const isReport = selectedNotification.type === 'report';
    const locationString = getLocationString(selectedNotification.location);
    const priority = selectedNotification.priority;

    return (
      <div className="notification-modal-overlay">
        <div className="notification-detail-modal" ref={modalRef}>
          <div className="modal-header">
            <h2 className="modal-title">
              <span className="modal-icon">{selectedNotification.icon || '📋'}</span>
              Notification Details
            </h2>
            <button className="modal-close-btn" onClick={closeModal}>
              <span className="material-icons">close</span>
            </button>
          </div>

          <div className="modal-content">
            <div className={`detail-priority-badge ${priority}`}>
              {priority === 'emergency' && '🚨 EMERGENCY'}
              {priority === 'high' && '⚠️ HIGH PRIORITY'}
              {priority === 'medium' && '📢 MEDIUM PRIORITY'}
              {priority === 'low' && 'ℹ️ LOW PRIORITY'}
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Notification Type</h3>
              <div className="detail-info">
                <span className="detail-label">Type:</span>
                <span className="detail-value">
                  {isReport ? 'Noise Report' : 'User Registration'}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Time Information</h3>
              <div className="detail-info">
                <span className="detail-label">Time ago:</span>
                <span className="detail-value">{selectedNotification.time}</span>
              </div>
              <div className="detail-info">
                <span className="detail-label">Exact time:</span>
                <span className="detail-value">{formatFullDateTime(selectedNotification.timestamp)}</span>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Message</h3>
              <div className="detail-message">{selectedNotification.message}</div>
            </div>

            {selectedNotification.user && (
              <div className="detail-section">
                <h3 className="detail-section-title">User Information</h3>
                <div className="detail-user-info">
                  {selectedNotification.user.profilePhoto && (
                    <img 
                      src={selectedNotification.user.profilePhoto} 
                      alt={selectedNotification.user.username}
                      className="detail-user-avatar"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyNSIgZmlsbD0iI0QzNTQwMCIvPjxwYXRoIGQ9Ik0yNSAyOEMyMi4yNCAyOCAyMCAyNS43NiAyMCAyM0MyMCAyMC4yNCAyMi4yNCAxOCAyNSAxOEMyNy43NiAxOCAzMCAyMC4yNCAzMCAyM0MzMCAyNS43NiAyNy43NiAyOCAyNSAyOFpNMjUgMzJDMzAuNTIgMzIgMzUgMzQuNzYgMzUgMzhWNDBIMTVWMzhDMTUgMzQuNzYgMTkuNDggMzIgMjUgMzJaIiBmaWxsPSIjRkZGRkZGIi8+PC9zdmc+';
                      }}
                    />
                  )}
                  <div className="detail-user-details">
                    <div className="detail-info">
                      <span className="detail-label">Username:</span>
                      <span className="detail-value">{selectedNotification.user.username}</span>
                    </div>
                    {selectedNotification.user.email && (
                      <div className="detail-info">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{selectedNotification.user.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isReport && (
              <>
                <div className="detail-section">
                  <h3 className="detail-section-title">Report Details</h3>
                  {selectedNotification.reason && (
                    <div className="detail-info">
                      <span className="detail-label">Reason:</span>
                      <span className="detail-value">{selectedNotification.reason}</span>
                    </div>
                  )}
                  {selectedNotification.noiseLevel && (
                    <div className="detail-info">
                      <span className="detail-label">Noise Level:</span>
                      <span className={`detail-value noise-level-badge ${selectedNotification.noiseLevel}`}>
                        {selectedNotification.noiseLevel === 'red' && '🔴 High'}
                        {selectedNotification.noiseLevel === 'yellow' && '🟡 Medium'}
                        {selectedNotification.noiseLevel === 'green' && '🟢 Low'}
                      </span>
                    </div>
                  )}
                  {selectedNotification.status && (
                    <div className="detail-info">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value status-badge">{selectedNotification.status}</span>
                    </div>
                  )}
                </div>

                {locationString && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Location</h3>
                    <div className="detail-location">
                      <span className="material-icons">location_on</span>
                      <span>{locationString}</span>
                    </div>
                  </div>
                )}

                {selectedNotification.data?.mediaUrl && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Media</h3>
                    <a 
                      href={selectedNotification.data.mediaUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="detail-media-link"
                    >
                      <span className="material-icons">visibility</span>
                      View Attached Media
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button className="modal-btn secondary" onClick={goBack}>
              <span className="material-icons">arrow_back</span>
              Back
            </button>
            
            {isReport ? (
              <button className="modal-btn primary" onClick={viewFullReport}>
                <span className="material-icons">description</span>
               Go to Report
              </button>
            ) : (
              <button className="modal-btn primary" onClick={viewUserProfile}>
                <span className="material-icons">person</span>
                View User Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && !refreshing) {
    return (
      <div className="notifications-container">
        <div className="loading-container fullscreen">
          <div className="loading-spinner large"></div>
          <div className="loading-text">Loading notifications...</div>
          {!apiConnected && (
            <div className="loading-text" style={{ color: '#F44336', marginTop: '10px' }}>
              Cannot connect to server. Make sure backend is running.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      {/* Header */}
      <div className="notifications-header">
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
                <button onClick={handleLogout} className="header-button">
                  <span className="material-icons">logout</span>
                </button>
              </div>
            </div>
            <div className="header-title">
              <h1>🔔 Real-Time Notifications</h1>
              <div className="header-subtitle">
                Live activity feed | {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="notifications-controls">
        <div className="controls-left">
          <div className="time-range-selector">
            <button
              className={`time-button ${timeRange === 1 ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(1)}
            >
              Last Hour
            </button>
            <button
              className={`time-button ${timeRange === 6 ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(6)}
            >
              6 Hours
            </button>
            <button
              className={`time-button ${timeRange === 12 ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(12)}
            >
              12 Hours
            </button>
            <button
              className={`time-button ${timeRange === 24 ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(24)}
            >
              24 Hours
            </button>
            <button
              className={`time-button ${timeRange === 48 ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(48)}
            >
              48 Hours
            </button>
            <button
              className={`time-button ${timeRange === 168 ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(168)}
            >
              Week
            </button>
          </div>
        </div>

        <div className="controls-right">
          <div className="auto-refresh-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">Auto-refresh (10s)</span>
          </div>

          <button
            className="refresh-button"
            onClick={refreshData}
            disabled={refreshing}
          >
            <span className="material-icons">{refreshing ? 'sync' : 'refresh'}</span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {fetchError && (
        <div className="error-message">
          <span className="material-icons">error</span>
          <span>Error: {fetchError}</span>
        </div>
      )}

      {!apiConnected && (
        <div className="error-message warning">
          <span className="material-icons">warning</span>
          <span>Cannot connect to server. Please check your connection.</span>
        </div>
      )}

      {/* Stats Cards */}
      {apiConnected && (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
            <div className="stat-card unread">
              <div className="stat-icon">🔔</div>
              <div className="stat-info">
                <div className="stat-value">{stats.unread}</div>
                <div className="stat-label">Unread</div>
              </div>
            </div>
            <div className="stat-card reports">
              <div className="stat-icon">📢</div>
              <div className="stat-info">
                <div className="stat-value">{stats.reports}</div>
                <div className="stat-label">Reports</div>
              </div>
            </div>
            <div className="stat-card registrations">
              <div className="stat-icon">👤</div>
              <div className="stat-info">
                <div className="stat-value">{stats.registrations}</div>
                <div className="stat-label">Registrations</div>
              </div>
            </div>
            <div className="stat-card critical">
              <div className="stat-icon">🚨</div>
              <div className="stat-info">
                <div className="stat-value">{stats.critical}</div>
                <div className="stat-label">Critical</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <FilterButton value="all" label="All" count={stats.total} />
              <FilterButton value="unread" label="Unread" count={stats.unread} />
              <FilterButton value="reports" label="Reports" count={stats.reports} />
              <FilterButton value="registrations" label="Registrations" count={stats.registrations} />
              <FilterButton value="critical" label="Critical" count={stats.critical} />
            </div>

            <div className="action-group">
              <button
                className="action-button mark-read"
                onClick={markAllAsRead}
                disabled={stats.unread === 0}
              >
                <span className="material-icons">done_all</span>
                <span>Mark All Read</span>
              </button>
              <button
                className="action-button clear"
                onClick={clearAllNotifications}
                disabled={notifications.length === 0}
              >
                <span className="material-icons">delete_sweep</span>
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="notifications-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map(notification => renderNotificationItem(notification))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🔔</span>
                <h3>No Notifications</h3>
                <p>There are no notifications to display at this time.</p>
                {filter !== 'all' && (
                  <button className="clear-filter-button" onClick={() => setFilter('all')}>
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {refreshing && (
              <div className="refreshing-overlay">
                <div className="loading-spinner"></div>
                <span>Refreshing...</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {modalVisible && renderDetailModal()}

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

export default Notifications;