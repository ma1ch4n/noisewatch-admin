import React, { useState, useEffect } from 'react';
import './CustomDrawer.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CustomDrawer = ({ onClose }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('user');
  const navigate = useNavigate();

  // Regular user menu items for noise monitoring
  const userMenuItems = [
    { id: '1', title: 'Dashboard', icon: 'home', route: '/dashboard' },
    { id: '2', title: 'Noise Map', icon: 'map', route: '/map' },
    { id: '3', title: 'Report Noise', icon: 'mic', route: '/report' },
    { id: '4', title: 'My History', icon: 'history', route: '/history' },
    { id: '5', title: 'Notifications', icon: 'notifications', route: '/notifications' },
    { id: '6', title: 'Analytics (Personal)', icon: 'analytics', route: '/analytics' },
  ];

  // Admin menu items for noise monitoring - USING REAL ROUTES
  const adminMenuItems = [
    { id: '1', title: 'Dashboard', icon: 'speedometer', route: '/dashboard' },
    { id: '2', title: 'Noise Reports', icon: 'description', route: '/admin/reports' },
    { id: '3', title: 'Heatmap & Analytics', icon: 'bar_chart', route: '/admin/analytics' },
    { id: '4', title: 'Users & Contributors', icon: 'people', route: '/admin/users' },
    { id: '5', title: 'Export Reports', icon: 'download', route: '/admin/export' },
    { id: '6', title: 'Notifications & Alerts', icon: 'warning', route: '/admin/notifications' },
  ];

  const bottomItems = [
    { id: '7', title: 'Settings', icon: 'settings', route: '/settings' },
    { id: '8', title: 'Help & About', icon: 'help', route: '/help' },
  ];

  // Admin bottom items
  const adminBottomItems = [
    { id: '7', title: 'Settings', icon: 'settings', route: '/admin/settings' },
    { id: '8', title: 'Help & Documentation', icon: 'menu_book', route: '/admin/help' },
  ];

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        console.warn('No authentication token found');
        // Use stored user data as fallback
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setProfileData(userData);
          setUserType(userData.userType || 'user');
          setLoading(false);
          return;
        }
        throw new Error('No authentication token found');
      }

      console.log('Fetching profile from:', `${API_BASE_URL}/user/profile`);
      
      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('Profile response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Profile fetch failed');
      }

      const userData = response.data.user;
      setProfileData(userData);
      setUserType(userData.userType || userData.role || 'user');
      
      // Update localStorage with fresh data
      localStorage.setItem('userData', JSON.stringify(userData));
      
    } catch (error) {
      console.error('Profile fetch error:', error);
      
      // Fallback to stored user data
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setProfileData(userData);
          setUserType(userData.userType || 'user');
          console.log('Using stored user data as fallback');
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
          setFallbackUserData();
        }
      } else {
        setFallbackUserData();
      }
    } finally {
      setLoading(false);
    }
  };

  const setFallbackUserData = () => {
    // Ultimate fallback
    const fallbackUser = {
      username: 'User',
      email: 'user@example.com',
      profilePhoto: null,
      userType: 'user'
    };
    setProfileData(fallbackUser);
    setUserType('user');
  };

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token || (userType !== 'admin' && userType !== 'administrator')) return;

      // You can add API calls here to fetch real admin stats
      console.log('Fetching admin stats...');
      
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profileData && (userType === 'admin' || userType === 'administrator')) {
      fetchAdminStats();
    }
  }, [profileData, userType]);

  const handleNavigation = (route) => {
    if (onClose) {
      onClose();
    }
    
    setTimeout(() => {
      try {
        console.log('Navigating to:', route);
        
        // Use React Router's navigate function
        navigate(route);
        
      } catch (error) {
        console.error('Navigation error:', error);
        alert('Unable to navigate to the selected screen');
      }
    }, 300);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      performLogout();
    }
  };

  const performLogout = async () => {
    try {
      // Clear all authentication data
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userId');
      localStorage.removeItem('userType');

      // Show logout message
      alert('You have been successfully logged out');
      
      // Redirect to login page using React Router
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const renderMenuItem = (item, isBottom = false) => (
    <button
      key={item.id}
      className={`menu-item ${isBottom ? 'bottom-menu-item' : ''}`}
      onClick={() => handleNavigation(item.route)}
    >
      <span className="material-icons menu-icon">{item.icon}</span>
      <span className="menu-text">{item.title}</span>
      <span className="material-icons chevron-icon">chevron_right</span>
    </button>
  );

  if (loading) {
    return (
      <div className="drawer-container loading">
        <div className="loading-spinner large"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  const user = profileData || {
    username: 'User',
    email: 'user@example.com',
    profilePhoto: null
  };

  // Determine which menu items to show based on user type
  const getMenuItems = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return adminMenuItems;
      default:
        return userMenuItems;
    }
  };

  const getBottomItems = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return adminBottomItems;
      default:
        return bottomItems;
    }
  };

  const getSectionTitle = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'Admin Panel';
      default:
        return 'Noise Monitoring';
    }
  };

  const getGradientColors = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return ['#8B4513', '#654321', '#4A2C17'];
      default:
        return ['#D4AC0D', '#B7950B', '#8B4513'];
    }
  };

  const getStats = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return [
          { number: '1,247', label: 'Reports' },
          { number: '89', label: 'Users' },
          { number: '23', label: 'Hotspots' }
        ];
      default:
        return [
          { number: '42', label: 'Reports' },
          { number: '158', label: 'Hours' },
          { number: '73', label: 'dB Avg' }
        ];
    }
  };

  const currentMenuItems = getMenuItems();
  const currentBottomItems = getBottomItems();
  const sectionTitle = getSectionTitle();
  const gradientColors = getGradientColors();
  const stats = getStats();

  return (
    <div className="drawer-container">
      <div className="drawer-content">
        {/* Header Section */}
        <div 
          className="drawer-header"
          style={{ 
            background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2]} 100%)` 
          }}
        >
          <button
            className="close-button"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>

          <button 
            className="profile-section"
            onClick={() => handleNavigation('/profile')}
          >
            <img
              src={user.profilePhoto || '/default-profile.png'}
              alt="Profile"
              className="profile-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCA3MCA3MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzUiIGN5PSIzNSIgcj0iMzUiIGZpbGw9IiNGRjhENDAiLz4KPHBhdGggZD0iTTM1IDM3LjVDMzEuOTYyNCAzNy41IDI5LjUgMzUuMDM3NiAyOS41IDMyQzI5LjUgMjguOTYyNCAzMS45NjI0IDI2LjUgMzUgMjYuNUMzOC4wMzc2IDI2LjUgNDAuNSAyOC45NjI0IDQwLjUgMzJDNDAuNSAzNS4wMzc2IDM4LjAzNzYgMzcuNSAzNSAzNy41Wk0zNSA0M0M0MC41MjI4IDQzIDQ1IDQ1LjIzODcgNDUgNDhWNTBIMjVWNDhDMjUgNDUuMjM4NyAyOS40NzcyIDQzIDM1IDQzWiIgZmlsbD0iIzhCNDUxMyIvPgo8L3N2Zz4K';
              }}
            />
            <div className="profile-info">
              <div className="profile-name">{user.username}</div>
              <div className="profile-email">{user.email}</div>
              {(userType.toLowerCase() === 'admin' || userType.toLowerCase() === 'administrator') && (
                <div className="admin-badge">
                  <span className="admin-badge-text">System Administrator</span>
                </div>
              )}
            </div>
            <span className="material-icons profile-chevron">chevron_right</span>
          </button>

          {/* Stats Container */}
          <div className="stats-container">
            {stats.map((stat, index) => (
              <React.Fragment key={index}>
                <div className="stat-item">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
                {index < stats.length - 1 && <div className="stat-divider" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="menu-container">
          <div className="menu-section">
            <div className="section-title">{sectionTitle}</div>
            {currentMenuItems.map(item => renderMenuItem(item))}
          </div>

          {/* Quick Actions for Users */}
          {userType.toLowerCase() === 'user' && (
            <div className="quick-actions-container">
              <div className="quick-actions-title">Quick Actions</div>
              <div className="quick-actions-grid">
                <button 
                  className="quick-action-button"
                  onClick={() => handleNavigation('/quick-record')}
                >
                  <span className="material-icons">mic</span>
                  <span className="quick-action-text">Quick Record</span>
                </button>
                <button 
                  className="quick-action-button emergency-button"
                  onClick={() => handleNavigation('/emergency')}
                >
                  <span className="material-icons">warning</span>
                  <span className="quick-action-text">Emergency</span>
                </button>
                <button 
                  className="quick-action-button"
                  onClick={() => handleNavigation('/nearby')}
                >
                  <span className="material-icons">location_on</span>
                  <span className="quick-action-text">Nearby</span>
                </button>
                <button 
                  className="quick-action-button"
                  onClick={() => handleNavigation('/stats')}
                >
                  <span className="material-icons">insert_chart</span>
                  <span className="quick-action-text">My Stats</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin Quick Actions */}
          {(userType.toLowerCase() === 'admin' || userType.toLowerCase() === 'administrator') && (
            <div className="quick-actions-container">
              <div className="quick-actions-title">Admin Quick Actions</div>
              <div className="quick-actions-grid">
                <button 
                  className="quick-action-button"
                  onClick={() => handleNavigation('/admin/monitoring')}
                >
                  <span className="material-icons">monitor_heart</span>
                  <span className="quick-action-text">Live Monitor</span>
                </button>
                <button 
                  className="quick-action-button emergency-button"
                  onClick={() => handleNavigation('/admin/alerts')}
                >
                  <span className="material-icons">warning</span>
                  <span className="quick-action-text">System Alerts</span>
                </button>
                <button 
                  className="quick-action-button"
                  onClick={() => handleNavigation('/admin/generate-report')}
                >
                  <span className="material-icons">description</span>
                  <span className="quick-action-text">Generate Report</span>
                </button>
                <button 
                  className="quick-action-button"
                  onClick={() => handleNavigation('/admin/thresholds')}
                >
                  <span className="material-icons">tune</span>
                  <span className="quick-action-text">Thresholds</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Menu Items */}
          <div className="bottom-section">
            <div className="divider" />
            {currentBottomItems.map(item => renderMenuItem(item, true))}
          </div>

          {/* Logout Button */}
          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <span className="material-icons">logout</span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomDrawer;