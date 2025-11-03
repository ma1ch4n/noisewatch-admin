import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Use environment variable or default to localhost:5000
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Refs for input focusing
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const showMessage = (type, message) => {
    if (type === 'error') {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  const validateForm = () => {
    if (!email.trim()) {
      showMessage('error', 'Please enter your email address');
      emailInputRef.current?.focus();
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showMessage('error', 'Please enter a valid email address');
      emailInputRef.current?.focus();
      return false;
    }

    if (!password.trim()) {
      showMessage('error', 'Please enter your password');
      passwordInputRef.current?.focus();
      return false;
    }

    if (password.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      passwordInputRef.current?.focus();
      return false;
    }

    return true;
  };

  // Test API connection first
  const testAPIConnection = async () => {
    try {
      console.log('Testing connection to:', `${API_BASE_URL}/api/test`);
      const response = await axios.get(`${API_BASE_URL}/api/test`, {
        timeout: 5000
      });
      console.log('API test response:', response.data);
      return response.status === 200;
    } catch (error) {
      console.log('API test failed:', error.message);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Starting login process...');
      
      // First test if server is reachable
      const isServerReachable = await testAPIConnection();
      if (!isServerReachable) {
        throw new Error(`Cannot connect to server at ${API_BASE_URL}. Please make sure the backend server is running.`);
      }

      console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
      console.log('Login data:', { email: email.trim().toLowerCase() });
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim().toLowerCase(),
        password: password.trim()
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('Login response:', response.data);

      const { data } = response;

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid response format from server');
      }

      // Check if user is admin
      if (data.user.userType !== 'admin') {
        throw new Error('Access denied. This portal is for administrators only.');
      }

      // Store authentication data
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userId', data.user.id || data.user._id);
      localStorage.setItem('userType', data.user.userType);

      showMessage('success', `Welcome back, ${data.user.username || data.user.email}!`);
      
      console.log('Login successful, redirecting to /dashboard');
      
      // Redirect to admin dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (error) {
      console.error('Login Error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'An error occurred during login';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.response.status === 403) {
          errorMessage = error.response.data?.message || 'Access denied. Please verify your email or contact administrator.';
        } else if (error.response.status === 404) {
          errorMessage = 'Login endpoint not found. Please check backend configuration.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = `Cannot connect to server at ${API_BASE_URL}. Please ensure:
        - Backend server is running on port 5000
        - No firewall blocking the connection
        - Server is accessible at ${API_BASE_URL}`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Server might be overloaded.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (e.target.type === 'email') {
        passwordInputRef.current?.focus();
      } else if (e.target.type === 'password') {
        handleLogin();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="login-container">
      <div className="gradient-container">
        <div className="scroll-container">
          {/* Logo Section - Left Side */}
          <div className="logo-section">
            <div className="logo-container">
              <img
                src="/logo.jpg"
                className="logo"
                alt="NoiseWatch Logo"
                onError={(e) => {
                  e.target.src = '/logo.png';
                  e.target.onerror = null;
                }}
              />
            </div>
            <h1 className="brand-text">NoiseWatch</h1>
            <div className="admin-notice">
              <div className="admin-badge">
                <span className="badge-icon">⚡</span>
                <span className="badge-text">Administrative Access</span>
              </div>
              <p className="admin-subtitle">Barangay Officials & System Administrators</p>
            </div>
            <p className="tagline">Monitor and manage noise levels in your environment with precision and ease</p>
            
            {/* Access Notice */}
            <div className="access-notice">
              <div className="notice-icon">🔒</div>
              <h3 className="notice-title">Restricted Access</h3>
              <p className="notice-text">
                This portal is exclusively for authorized Barangay Officials and System Administrators only. 
                Unauthorized access is strictly prohibited.
              </p>
            </div>
          </div>
          
          {/* Form Section - Right Side */}
          <div className="form-container">
            <form onSubmit={handleSubmit}>
              {/* Header Section inside Form */}
              <div className="header-section">
                <button 
                  type="button"
                  className="back-button" 
                  onClick={() => navigate('/')}
                >
                  <span className="back-arrow">←</span>
                </button>
                <h1 className="welcome-text">Official Login</h1>
                <p className="subtitle">Access the NoiseWatch Administrative Dashboard</p>
              </div>

              {/* Server Status */}
              <div className="server-status">
                <div className="server-status-text">
                  Server: {API_BASE_URL}
                </div>
                <div className="connection-status">
                  Status: {loading ? 'Connecting...' : 'Ready'}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  <span className="alert-text">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="alert alert-success">
                  <span className="alert-icon">✓</span>
                  <span className="alert-text">{success}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="input-container">
                <label className="input-label">Official Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon mail-icon">📧</span>
                  <input
                    ref={emailInputRef}
                    className="text-input"
                    type="email"
                    placeholder="Enter your official email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="input-container">
                <label className="input-label">Security Password</label>
                <div className="input-wrapper">
                  <span className="input-icon lock-icon">🔐</span>
                  <input
                    ref={passwordInputRef}
                    className="text-input password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button 
                    className="eye-button"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                    disabled={loading}
                  >
                    <span className="eye-icon">
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </span>
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className={`login-button ${loading ? 'button-disabled' : ''}`}
                disabled={loading}
              >
                <div className="button-gradient">
                  {loading ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <span className="loading-text">Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span className="login-button-text">Access Dashboard</span>
                      <span className="button-icon">🛡️</span>
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Security Notice */}
            <div className="security-notice">
              <div className="security-icon">⚠️</div>
              <p className="security-text">
                <strong>Security Reminder:</strong> This system contains sensitive barangay data. 
                Ensure you log out after each session and do not share your credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;