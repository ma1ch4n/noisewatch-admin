import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import CustomDrawer from './CustomDrawer';

const UserManagement = ({ setShowUserModal }) => {
  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // Data state
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'deactivate' or 'activate'
  const [processing, setProcessing] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    userType: [],
    status: []
  });

  // FIXED: Use correct base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Drawer functions
  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching users from backend...');
      
      const endpoint = '/user/getAll';
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      console.log('🔗 Fetching from:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API response received');
      
      if (data.success && data.users) {
        // Transform API data
        const transformedUsers = data.users.map(user => ({
          _id: user._id || user.id,
          name: user.username || 'Unknown User',
          email: user.email || 'No email',
          userType: user.userType || 'user',
          status: user.isVerified ? 'active' : 'inactive',
          profilePhoto: user.profilePhoto || null,
          createdAt: user.createdAt || new Date().toISOString(),
          isVerified: user.isVerified || false
        }));
        
        console.log(`✅ Transformed ${transformedUsers.length} users`);
        setUsers(transformedUsers);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      setError(error.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle user status (activate/deactivate)
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      setProcessing(true);
      
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const endpoint = `/user/toggle-status/${userId}`;
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      
      console.log(`🔄 Toggling user ${userId} status to ${newStatus}`);
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization if needed
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId 
              ? { 
                  ...user, 
                  status: newStatus,
                  isVerified: newStatus === 'active'
                } 
              : user
          )
        );
        
        console.log(`✅ User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        alert(`User ${data.user.username} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        
        // Close confirmation modal
        setShowConfirmModal(false);
        setSelectedUser(null);
        setActionType('');
      } else {
        throw new Error(data.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('❌ Failed to toggle user status:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Handle deactivate/activate confirmation
  const handleStatusToggle = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setShowConfirmModal(true);
  };

  // Confirm action
  const confirmAction = () => {
    if (selectedUser) {
      toggleUserStatus(selectedUser._id, selectedUser.status);
    }
  };

  // Cancel action
  const cancelAction = () => {
    setShowConfirmModal(false);
    setSelectedUser(null);
    setActionType('');
  };

  // Simple test connection function
  const testBackendConnection = async () => {
    console.log('🧪 Testing backend connection...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      console.log('Root endpoint:', response.status, response.statusText);
      
      const userResponse = await fetch(`${API_BASE_URL}/user/getAll`);
      console.log('Users endpoint:', userResponse.status, userResponse.statusText);
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Refresh users function
  const refreshUsers = () => {
    fetchUsers();
  };

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(item => item !== value)
        : [...prev[filterType], value]
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      userType: [],
      status: []
    });
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesUserType = selectedFilters.userType.length === 0 || 
      selectedFilters.userType.includes(user.userType);
    
    const matchesStatus = selectedFilters.status.length === 0 || 
      selectedFilters.status.includes(user.status || 'active');
    
    return matchesSearch && matchesUserType && matchesStatus;
  });

  const hasActiveFilters = selectedFilters.userType.length > 0 || selectedFilters.status.length > 0;

  const getBadgeStyle = (type, value) => {
    const baseClass = 'badge';
    
    if (type === 'userType') {
      switch (value) {
        case 'admin':
          return `${baseClass} badge-purple`;
        case 'vet':
          return `${baseClass} badge-blue`;
        default:
          return `${baseClass} badge-gray`;
      }
    } else if (type === 'status') {
      return value === 'active' 
        ? `${baseClass} badge-green`
        : `${baseClass} badge-orange`;
    }
    
    return baseClass;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const FilterOption = ({ label, isSelected, onPress }) => (
    <button className="filter-option" onClick={onPress}>
      <div className={`checkbox ${isSelected ? 'checkbox-selected' : ''}`}>
        {isSelected && <span className="material-icons">check</span>}
      </div>
      <span className="filter-label">{label}</span>
    </button>
  );

  const FilterModal = () => (
    showFilterDropdown && (
      <div className="filter-modal-overlay" onClick={() => setShowFilterDropdown(false)}>
        <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="filter-content">
            <div className="filter-section">
              <div className="filter-section-title">User Type</div>
              {['user', 'admin'].map(type => (
                <FilterOption
                  key={type}
                  label={type}
                  isSelected={selectedFilters.userType.includes(type)}
                  onPress={() => handleFilterChange('userType', type)}
                />
              ))}
            </div>
            
            <div className="filter-section">
              <div className="filter-section-title">Status</div>
              {['active', 'inactive'].map(status => (
                <FilterOption
                  key={status}
                  label={status}
                  isSelected={selectedFilters.status.includes(status)}
                  onPress={() => handleFilterChange('status', status)}
                />
              ))}
            </div>
            
            <div className="filter-actions">
              <button className="btn-text" onClick={clearFilters}>
                Clear All
              </button>
              <button className="btn-primary" onClick={() => setShowFilterDropdown(false)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const renderActiveFilters = () => {
    if (!hasActiveFilters) return null;
    
    const allFilters = [
      ...selectedFilters.userType.map(type => ({ type: 'userType', value: type, label: `Type: ${type}` })),
      ...selectedFilters.status.map(status => ({ type: 'status', value: status, label: `Status: ${status}` }))
    ];

    return (
      <div className="active-filters-container">
        <div className="active-filters">
          {allFilters.map((filter, index) => (
            <div key={index} className="filter-tag">
              <span className="filter-tag-text">{filter.label}</span>
              <button 
                className="filter-tag-remove"
                onClick={() => handleFilterChange(filter.type, filter.value)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUserItem = (user) => (
    <div key={user._id} className="user-row">
      {/* Column 1: User Info */}
      <div className="user-info">
        <div className="user-avatar-container">
          {user.profilePhoto ? (
            <img 
              src={user.profilePhoto} 
              alt={user.name}
              className="user-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/40/cccccc/808080?text=U';
              }}
            />
          ) : (
            <div className="user-avatar-placeholder">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
          <div className="user-verified">
            {user.isVerified ? '✅ Verified' : '⭕ Not Verified'}
          </div>
        </div>
      </div>
      
      {/* Column 2: User Type */}
      <div className="user-type-column">
        <div className={getBadgeStyle('userType', user.userType)}>
          <span className="badge-text">{user.userType}</span>
        </div>
      </div>
      
      {/* Column 3: Status */}
      <div className="user-status-column">
        <div className={getBadgeStyle('status', user.status || 'active')}>
          <span className="badge-text">{user.status || 'active'}</span>
        </div>
      </div>
      
      {/* Column 4: Join Date */}
      <div className="user-date-column">
        <div className="join-date">
          {formatDate(user.createdAt)}
        </div>
      </div>
      
      {/* Column 5: Actions */}
      <div className="user-actions-container">
        <div className="user-actions">
          {user.status === 'active' ? (
            <button 
              className="action-btn deactivate-btn"
              onClick={() => handleStatusToggle(user, 'deactivate')}
              title="Deactivate User"
            >
              <span className="material-icons">block</span>
              Deactivate
            </button>
          ) : (
            <button 
              className="action-btn activate-btn"
              onClick={() => handleStatusToggle(user, 'activate')}
              title="Activate User"
            >
              <span className="material-icons">check_circle</span>
              Activate
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">
        <span className="material-icons">group_off</span>
      </div>
      <div className="empty-state-text">
        {error 
          ? `Error: ${error}` 
          : users.length === 0 
            ? 'No users found in the database' 
            : 'No users match your search/filters'
        }
      </div>
      <div className="empty-state-actions">
        <button className="btn-primary" onClick={refreshUsers}>
          Refresh Users
        </button>
        <button className="btn-text" onClick={testBackendConnection}>
          Test Connection
        </button>
      </div>
    </div>
  );

  // Confirmation Modal
  const ConfirmationModal = () => {
    if (!showConfirmModal || !selectedUser) return null;

    const isDeactivating = actionType === 'deactivate';
    const modalTitle = isDeactivating ? 'Deactivate User' : 'Activate User';
    const actionText = isDeactivating ? 'deactivate' : 'activate';
    const confirmButtonText = isDeactivating ? 'Deactivate User' : 'Activate User';
    const confirmButtonClass = isDeactivating ? 'btn-danger' : 'btn-success';

    return (
      <div className="modal-overlay">
        <div className="confirmation-modal">
          <div className="modal-header">
            <h3 className="modal-title">{modalTitle}</h3>
            <button className="modal-close" onClick={cancelAction}>
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="modal-content">
            <div className="warning-icon">
              <span className="material-icons">
                {isDeactivating ? 'warning' : 'check_circle'}
              </span>
            </div>
            
            <p className="modal-message">
              Are you sure you want to {actionText} <strong>{selectedUser.name}</strong>?
            </p>
            
            {isDeactivating && (
              <div className="warning-note">
                <span className="material-icons">info</span>
                <span>Deactivated users will not be able to log into the system.</span>
              </div>
            )}
          </div>
          
          <div className="modal-actions">
            <button 
              className="btn-text" 
              onClick={cancelAction}
              disabled={processing}
            >
              Cancel
            </button>
            <button 
              className={`btn-primary ${confirmButtonClass}`}
              onClick={confirmAction}
              disabled={processing}
            >
              {processing ? (
                <>
                  <span className="spinner-small"></span>
                  Processing...
                </>
              ) : (
                confirmButtonText
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner large"></div>
        <div className="loading-text">Loading users...</div>
        <button className="btn-text" onClick={testBackendConnection} style={{marginTop: '20px'}}>
          Test Backend Connection
        </button>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      {/* Debug info - remove in production */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="material-icons error-icon">error</span>
            <span className="error-text">Error: {error}</span>
            <button className="btn-text" onClick={refreshUsers}>
              Retry
            </button>
            <button className="btn-text" onClick={() => console.log('Current users:', users)}>
              Show Users Data
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="user-management-header">
        <div className="header-content">
          <div className="header-top">
            <button onClick={openDrawer} className="header-button">
              <span className="material-icons">menu</span>
            </button>
            <div className="header-title-section">
              <div className="header-title">User Management</div>
              <div className="header-subtitle">
                Total Users: {users.length} | Showing: {filteredUsers.length}
                {error && <span style={{color: 'red', marginLeft: '10px'}}>(Connection Error)</span>}
              </div>
            </div>
            <div className="header-right">
              <button 
                className="header-button"
                onClick={refreshUsers}
                title="Refresh Users"
              >
                <span className="material-icons">refresh</span>
              </button>
              <button className="header-button">
                <span className="material-icons">notifications</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="user-management-content">
        <div className="dashboard-container">
          <div className="search-container">
            <div className="search-input-container">
              <span className="material-icons search-icon">search</span>
              <input
                className="search-input"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  <span className="material-icons">clear</span>
                </button>
              )}
            </div>
            <button 
              className={`filter-button ${hasActiveFilters ? 'filter-button-active' : ''}`}
              onClick={() => setShowFilterDropdown(true)}
            >
              <span className="material-icons">filter_list</span>
              <span className={`filter-button-text ${hasActiveFilters ? 'filter-button-text-active' : ''}`}>
                Filter
              </span>
              {hasActiveFilters && (
                <div className="filter-count">
                  <span className="filter-count-text">
                    {selectedFilters.userType.length + selectedFilters.status.length}
                  </span>
                </div>
              )}
            </button>
          </div>
          
          {renderActiveFilters()}

          <div className="users-list">
            {filteredUsers.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="users-list-content">
                <div className="users-list-header">
                  <div className="header-name">User</div>
                  <div className="header-type">Type</div>
                  <div className="header-status">Status</div>
                  <div className="header-date">Joined</div>
                  <div className="header-actions">Actions</div>
                </div>
                {filteredUsers.map(user => renderUserItem(user))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FilterModal />
      <ConfirmationModal />

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

export default UserManagement;