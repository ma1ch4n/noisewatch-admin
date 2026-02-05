import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const showToast = (type, title, message) => {
    alert(`${title}: ${message}`);
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        showToast('error', 'Authentication', 'Please login first');
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const userData = response.data.user;
        setProfileData(userData);
        setEditFormData({
          username: userData.username,
          email: userData.email,
        });
        // Store user data in localStorage for fallback
        localStorage.setItem('userData', JSON.stringify(userData));
      } else {
        throw new Error(response.data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      let errorMessage = 'Failed to load profile';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        if (error.response.status === 401) {
          localStorage.removeItem('userToken');
          navigate('/login');
        }
      }
      
      showToast('error', 'Profile Error', errorMessage);
      
      // Fallback to localStorage data
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setProfileData(userData);
          setEditFormData({
            username: userData.username,
            email: userData.email,
          });
        } catch (parseError) {
          console.error('Error parsing stored data:', parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageButtonClick = () => {
    setIsImageModalVisible(true);
  };

  const handleImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Invalid File', 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Image must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadProfilePhoto = async (file) => {
    try {
      setIsUploadingPhoto(true);
      const token = localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');
      
      if (!token) {
        showToast('error', 'Authentication', 'Please login first');
        navigate('/login');
        return;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      const formData = new FormData();
      formData.append('profilePhoto', file);
      
      if (profileData) {
        formData.append('username', profileData.username);
        formData.append('email', profileData.email);
        if (profileData.userType) {
          formData.append('userType', profileData.userType);
        }
      }

      const response = await axios.put(
        `${API_BASE_URL}/user/update/${userId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.user) {
        const updatedUser = response.data.user;
        setProfileData(updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setIsImageModalVisible(false);
        setSelectedImage(null);
        setImagePreview(null);
        showToast('success', 'Success', 'Profile photo updated successfully');
      } else {
        throw new Error('Failed to update profile photo');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      let errorMessage = 'Failed to upload photo';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        if (error.response.status === 401) {
          localStorage.removeItem('userToken');
          navigate('/login');
        }
      }
      
      showToast('error', 'Upload Failed', errorMessage);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const token = localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');
      
      if (!token) {
        showToast('error', 'Authentication', 'Please login first');
        navigate('/login');
        return;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Update user without profile photo
      const formData = new FormData();
      formData.append('username', profileData.username);
      formData.append('email', profileData.email);
      if (profileData.userType) {
        formData.append('userType', profileData.userType);
      }

      const response = await axios.put(
        `${API_BASE_URL}/user/update/${userId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.user) {
        const updatedUser = response.data.user;
        setProfileData(updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setIsImageModalVisible(false);
        showToast('success', 'Success', 'Profile photo removed successfully');
      } else {
        throw new Error('Failed to remove profile photo');
      }
    } catch (error) {
      console.error('Photo removal error:', error);
      let errorMessage = 'Failed to remove photo';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      }
      
      showToast('error', 'Removal Failed', errorMessage);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');
      
      if (!token) {
        showToast('error', 'Authentication', 'Please login first');
        navigate('/login');
        return;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      const formData = new FormData();
      formData.append('username', editFormData.username.trim());
      formData.append('email', editFormData.email.trim());
      
      if (profileData?.userType) {
        formData.append('userType', profileData.userType);
      }

      const response = await axios.put(
        `${API_BASE_URL}/user/update/${userId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.user) {
        const updatedUser = response.data.user;
        setProfileData(updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setIsEditModalVisible(false);
        showToast('success', 'Success', 'Profile updated successfully');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      let errorMessage = 'Failed to update profile';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        if (error.response.status === 401) {
          localStorage.removeItem('userToken');
          navigate('/login');
        }
      }
      
      showToast('error', 'Update Failed', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const validateForm = () => {
    if (!editFormData.username.trim()) {
      showToast('error', 'Validation Error', 'Username is required');
      return false;
    }
    
    if (!editFormData.email.trim()) {
      showToast('error', 'Validation Error', 'Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email.trim())) {
      showToast('error', 'Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    if (editFormData.username.trim().length < 3) {
      showToast('error', 'Validation Error', 'Username must be at least 3 characters long');
      return false;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(editFormData.username.trim())) {
      showToast('error', 'Validation Error', 'Username can only contain letters, numbers, and underscores');
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Profile...</div>
      </div>
    );
  }

  const user = profileData || {
    username: 'User',
    email: 'user@example.com',
    userType: 'user',
    profilePhoto: null
  };

  const getUserTypeDisplay = (userType) => {
    switch(userType?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'System Administrator';
      default:
        return 'Community Member';
    }
  };

  const getUserTypeColor = (userType) => {
    switch(userType?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return '#8B4513';
      default:
        return '#8B7355';
    }
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header-section">
        <div className="profile-header-top">
          <button
            onClick={() => navigate(-1)}
            className="profile-back-button"
          >
            ←
          </button>
          <div className="profile-header-title">My Profile</div>
          <div style={{ width: '40px' }} />
        </div>
      </div>

      <div className="profile-scroll-view">
        <div className="profile-scroll-content">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-image-section">
                <img
                  src={imagePreview || user.profilePhoto || '/default-profile.png'}
                  alt="Profile"
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.src = '/default-profile.png';
                  }}
                />
                <button
                  className="profile-camera-button"
                  onClick={handleImageButtonClick}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? (
                    <div className="uploading-spinner"></div>
                  ) : (
                    '📷'
                  )}
                </button>
              </div>
              
              <div className="profile-details">
                <div className="profile-username">@{user.username}</div>
                <div className="profile-user-email">{user.email}</div>
                <div 
                  className="profile-type-badge"
                  style={{ backgroundColor: getUserTypeColor(user.userType) }}
                >
                  {getUserTypeDisplay(user.userType)}
                </div>
              </div>
            </div>
            
            <button
              className="profile-edit-button"
              onClick={() => setIsEditModalVisible(true)}
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleImageSelect}
      />

      {/* Image Selection Modal */}
      {isImageModalVisible && (
        <div className="modal-overlay" onClick={() => {
          if (!isUploadingPhoto) {
            setIsImageModalVisible(false);
            setSelectedImage(null);
            setImagePreview(null);
          }
        }}>
          <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <div className="image-modal-title">Change Profile Photo</div>
              <button
                onClick={() => {
                  if (!isUploadingPhoto) {
                    setIsImageModalVisible(false);
                    setSelectedImage(null);
                    setImagePreview(null);
                  }
                }}
                className="image-modal-close-button"
                disabled={isUploadingPhoto}
              >
                ✕
              </button>
            </div>

            <div className="image-modal-content">
              {imagePreview ? (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                  <p className="image-preview-text">New Profile Photo Preview</p>
                </div>
              ) : (
                <div className="image-preview-container">
                  <img 
                    src={user.profilePhoto || '/default-profile.png'} 
                    alt="Current Profile" 
                    className="image-preview"
                  />
                  <p className="image-preview-text">Current Profile Photo</p>
                </div>
              )}

              <div className="image-options">
                <button
                  className="image-option-button upload-button"
                  onClick={handleImageUpload}
                  disabled={isUploadingPhoto}
                >
                  {selectedImage ? 'Change Photo' : 'Upload New Photo'}
                </button>
                
                {user.profilePhoto && (
                  <button
                    className="image-option-button remove-button"
                    onClick={removeProfilePhoto}
                    disabled={isUploadingPhoto}
                  >
                    Remove Current Photo
                  </button>
                )}
                
                {selectedImage && (
                  <button
                    className="image-option-button save-button"
                    onClick={() => uploadProfilePhoto(selectedImage)}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <div className="update-spinner"></div>
                    ) : (
                      'Save New Photo'
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="image-modal-footer">
              <button
                className="image-modal-cancel-button"
                onClick={() => {
                  setIsImageModalVisible(false);
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                disabled={isUploadingPhoto}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalVisible && (
        <div className="modal-overlay" onClick={() => setIsEditModalVisible(false)}>
          <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div className="profile-modal-title">Edit Profile</div>
              <button
                onClick={() => setIsEditModalVisible(false)}
                className="profile-modal-close-button"
              >
                ✕
              </button>
            </div>

            <div className="profile-modal-content">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div className="profile-modal-buttons">
              <button
                className="profile-cancel-button"
                onClick={() => setIsEditModalVisible(false)}
              >
                Cancel
              </button>
              
              <button
                className={`profile-save-button ${isUpdating ? 'save-button-disabled' : ''}`}
                onClick={() => {
                  if (validateForm()) {
                    handleProfileUpdate();
                  }
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <div className="update-spinner"></div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;