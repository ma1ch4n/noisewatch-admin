import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './Register.css';
import API_BASE_URL from './utils/api';

// Mock utilities for web (you'll need to implement these)
const showToast = (type, title, message) => {
  console.log(`Toast [${type}]: ${title} - ${message}`);
  // You can use a toast library like react-toastify here
};



// Enhanced InputField component for web
const InputField = React.memo(({
  name,
  icon,
  placeholder,
  value,
  onChange,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  required = false
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`input-wrapper ${isFocused ? 'input-wrapper-focused' : ''}`}>
      <span className={`input-icon ${icon}`}></span>
      <input
        className={`input ${isPassword ? 'password-input' : ''}`}
        placeholder={`${placeholder}${required ? ' *' : ''}`}
        value={value}
        onChange={onChange}
        type={isPassword && !showPassword ? 'password' : 'text'}
        autoCapitalize={autoCapitalize}
        autoCorrect="off"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isPassword && (
        <button
          className="eye-icon"
          onClick={onTogglePassword}
          type="button"
        >
          <span className={`eye-icon-${showPassword ? 'off' : 'on'}`}></span>
        </button>
      )}
    </div>
  );
});

const Register = ({ navigation }) => {
  // User Information
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const pickImage = async () => {
    try {
      // For web, create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setProfilePhoto({
              uri: event.target.result,
              file: file
            });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } catch (error) {
      console.error('Image picker error:', error);
      showToast('error', 'Image Error', 'Failed to select image. Please try again.');
    }
  };

  const validateForm = () => {
    if (!profilePhoto) {
      showToast('error', 'Profile Photo Required', 'Please select a profile photo');
      return false;
    }

    if (!username.trim()) {
      showToast('error', 'Username Required', 'Please enter your username');
      return false;
    }

    if (username.trim().length < 2) {
      showToast('error', 'Invalid Username', 'Username must be at least 2 characters long');
      return false;
    }

    if (!email.trim()) {
      showToast('error', 'Email Required', 'Please enter your email address');
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      showToast('error', 'Password Required', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      showToast('error', 'Password Too Short', 'Password must be at least 6 characters');
      return false;
    }

    if (!confirmPassword.trim()) {
      showToast('error', 'Confirm Password', 'Please confirm your password');
      return false;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Password Mismatch', "Passwords don't match!");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const formData = new FormData();
      
      formData.append('username', username.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password.trim());
      formData.append('userType', 'user');
      
      // Append the actual file for upload
      formData.append('profilePhoto', profilePhoto.file);

      const response = await axios.post(`${API_BASE_URL}/auth/register`, formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      const { data } = response;

      if (!data.user) {
        throw new Error('Invalid response format');
      }

      showToast('success', 'Check Your Email', data.message || 'Registration successful! Please check your email to verify your account.');
      
      // Navigate to login (you'll need to implement navigation)
      setTimeout(() => {
        // For web, you might use window.location or react-router
        window.location.href = '/login';
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An error occurred during registration';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try again with a smaller image.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      showToast('error', 'Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  return (
    <div className="register-container">
      <div className="gradient-container">
        <div className="scroll-container">
          {/* Header Section */}
          <div className="header-section">
            <button className="back-button" onClick={() => window.history.back()}>
              <span className="back-arrow">←</span>
            </button>
            
            <div className="profile-image-container" onClick={pickImage}>
              <img 
                src={profilePhoto ? profilePhoto.uri : '/default-profile.png'}
                className={`profile-image ${!profilePhoto ? 'profile-image-required' : ''}`}
                alt="Profile"
              />
              <div className="camera-icon">
                <span className="camera">📷</span>
              </div>
              <div className="photo-hint">
                <span className="photo-hint-text">
                  {profilePhoto ? 'Tap to change photo' : 'Tap to add photo *'}
                </span>
              </div>
            </div>
            
            <h1 className="welcome-text">Create Account</h1>
            <p className="subtitle">Join us and start your journey</p>
          </div>
          
          {/* Form Section */}
          <div className="form-container">
            {/* Personal Information */}
            <div className="section-container">
              <h2 className="section-header">
                <span className="person-icon">👤</span> Personal Information
              </h2>
              
              <InputField
                name="username"
                icon="person"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                required={true}
              />
              
              <InputField
                name="email"
                icon="mail"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                keyboardType="email"
                autoCapitalize="none"
                required={true}
              />
              
              <InputField
                name="password"
                icon="lock"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isPassword={true}
                secureTextEntry={!showPassword}
                showPassword={showPassword}
                onTogglePassword={toggleShowPassword}
                required={true}
              />
              
              <InputField
                name="confirmPassword"
                icon="checkmark"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                isPassword={true}
                secureTextEntry={!showConfirmPassword}
                showPassword={showConfirmPassword}
                onTogglePassword={toggleShowConfirmPassword}
                required={true}
              />
            </div>

            {/* Required Fields Notice */}
            <div className="required-notice">
              <span className="required-notice-text">
                <span className="asterisk">* </span>All fields are required
              </span>
            </div>

            {/* Terms and Privacy */}
            <div className="terms-container">
              <p className="terms-text">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="terms-link">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="terms-link">Privacy Policy</a>
              </p>
            </div>

            <button
              className={`register-button ${loading ? 'button-disabled' : ''}`}
              onClick={handleRegister}
              disabled={loading}
            >
              <div className="button-gradient">
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <>
                    <span className="register-button-text">Create Account</span>
                    <span className="button-icon">→</span>
                  </>
                )}
              </div>
            </button>

            {/* Social Registration Section */}
            <div className="social-section">
              <div className="divider-container">
                <div className="divider" />
                <span className="divider-text">or sign up with</span>
                <div className="divider" />
              </div>
              
              <div className="social-buttons">
                <button className="social-button">
                  <span className="google-icon">G</span>
                </button>
                <button className="social-button">
                  <span className="facebook-icon">f</span>
                </button>
                <button className="social-button">
                  <span className="apple-icon"></span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              <span className="footer-text">Already have an account? </span>
              <a href="/login" className="login-text">Sign In</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;