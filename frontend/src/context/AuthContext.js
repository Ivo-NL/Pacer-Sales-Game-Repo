import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import apiService from '../services/api';

// Create context
const AuthContext = createContext(null);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    // Prevent multiple checks
    if (authChecked) return;
    
    const checkLoggedIn = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          // Set default headers for all axios requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          try {
            // Try to get stored user data first for immediate UI update
            const storedUserData = localStorage.getItem('user');
            if (storedUserData) {
              const userData = JSON.parse(storedUserData);
              setUser(userData);
              setIsAuthenticated(true);
            }
            
            // Verify token with backend in background
            const response = await apiService.auth.getProfile();
            
            // Update with fresh data from server
            setUser(response.data);
            setIsAuthenticated(true);
            
            // Update stored user data
            localStorage.setItem('user', JSON.stringify(response.data));
          } catch (apiError) {
            console.error('API call failed:', apiError);
            // Clear invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          // No token found
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    checkLoggedIn();
  }, [authChecked]);

  // Login function with retry mechanism
  const login = async (email, password) => {
    setError(null);
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptLogin = async () => {
      try {
        // Disable service worker before attempting login
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          } catch (err) {
            console.error('Error unregistering service workers:', err);
          }
        }
        
        const response = await apiService.auth.login(email, password);
        const { access_token, user_id, username, is_manager } = response.data;
        
        // Store token in localStorage
        localStorage.setItem('token', access_token);
        
        // Store user info
        const user = { id: user_id, username, email, is_manager };
        localStorage.setItem('user', JSON.stringify(user));
        
        // Set default headers for all axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
        // Set user data
        setUser(user);
        setIsAuthenticated(true);
        
        return true;
      } catch (err) {
        console.error(`Login attempt ${retryCount + 1} failed:`, err);
        
        // Network-specific errors that might be retryable
        if (
          err.message.includes('Network Error') ||
          err.message.includes('ERR_NETWORK') ||
          err.message.includes('ERR_CONNECTION') ||
          !err.response // No response typically means network issue
        ) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying login (${retryCount}/${maxRetries})...`);
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            return attemptLogin();
          }
        }
        
        // Set appropriate error message
        if (err.message.includes('Network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          const errorDetail = err.response?.data?.detail;
          // Check if errorDetail is an object and convert to string if needed
          if (errorDetail && typeof errorDetail === 'object') {
            setError(JSON.stringify(errorDetail));
          } else {
            setError(errorDetail || 'Login failed');
          }
        }
        return false;
      }
    };
    
    return attemptLogin();
  };

  // Register function
  const register = async (username, email, password, region) => {
    setError(null);
    try {
      await apiService.auth.register({ username, email, password, region });
      return true;
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      // Check if errorDetail is an object and convert to string if needed
      if (errorDetail && typeof errorDetail === 'object') {
        setError(JSON.stringify(errorDetail));
      } else {
        setError(errorDetail || 'Registration failed');
      }
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  // Context value
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 