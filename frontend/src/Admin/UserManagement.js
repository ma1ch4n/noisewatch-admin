import React, { useState, useEffect, useRef } from 'react';
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
  const [selectedFilters, setSelectedFilters] = useState({
    userType: [],
    status: []
  });

  // Drawer functions
  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Mock data - replace with actual API call
        const mockUsers = [
          {
            _id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            userType: 'admin',
            status: 'active',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            _id: '2',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            userType: 'user',
            status: 'active',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            _id: '3',
            name: 'Mike Johnson',
            email: 'mike.johnson@example.com',
            userType: 'vet',
            status: 'inactive',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            _id: '4',
            name: 'Sarah Wilson',
            email: 'sarah.wilson@example.com',
            userType: 'user',
            status: 'active',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        setUsers(mockUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        alert('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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
              {['user', 'admin', 'vet'].map(type => (
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
                <span className="btn-text-label">Clear All</span>
              </button>
              <button className="btn-primary" onClick={() => setShowFilterDropdown(false)}>
                <span className="btn-primary-label">Apply</span>
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
      ...selectedFilters.userType.map(type => ({ type: 'userType', value: type, label: `User Type: ${type}` })),
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
      <div className="user-info">
        <div className="user-name">{user.name}</div>
        <div className="user-email">{user.email}</div>
      </div>
      <div className="user-meta">
        <div className={getBadgeStyle('userType', user.userType)}>
          <span className="badge-text">{user.userType}</span>
        </div>
        <div className={getBadgeStyle('status', user.status || 'active')}>
          <span className="badge-text">{user.status || 'active'}</span>
        </div>
        <div className="join-date">
          {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-text">
        {users.length === 0 ? 'No users found' : 'No users found matching your criteria'}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner large"></div>
        <div className="loading-text">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      {/* Header */}
      <div className="user-management-header">
        <div className="header-content">
          <div className="header-top">
            <button onClick={openDrawer} className="header-button">
              <span className="material-icons">menu</span>
            </button>
            <div className="header-title-section">
              <div className="header-title">User Management</div>
              <div className="header-subtitle">Manage your users and roles</div>
            </div>
            <div className="header-right">
              <button className="header-button">
                <span className="material-icons">notifications</span>
              </button>
              <button className="header-button">
                <span className="material-icons">settings</span>
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                {filteredUsers.map(user => renderUserItem(user))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FilterModal />

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