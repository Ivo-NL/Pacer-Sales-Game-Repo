import React, { useState, useEffect } from 'react';
import { 
  Avatar, Button, TextField, Link, Grid, Box, Typography, Container, Paper, Alert, Divider,
  CircularProgress, Snackbar
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const [showRetrySnackbar, setShowRetrySnackbar] = useState(false);
  
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;
  
  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(true);
      setShowRetrySnackbar(true);
    };
    
    const handleOffline = () => {
      setNetworkStatus(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Unregister any service workers that might interfere
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister().then(success => {
            console.log('ServiceWorker unregistered:', success);
          });
        }
      });
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Use auth error when available
  useEffect(() => {
    if (authError) {
      // Ensure error is a string
      if (typeof authError === 'object') {
        setError(JSON.stringify(authError));
      } else {
        setError(authError);
      }
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    if (!networkStatus) {
      setError('You are currently offline. Please check your network connection and try again.');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Call the actual login function from the auth context
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        // Error is set by the auth context
        if (!error) {
          setError('Failed to sign in. Please check your credentials.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.message && err.message.includes('Network')) {
        setError('Network error during login. Please check your connection and try again.');
      } else {
        // Handle object errors
        const errorMsg = typeof err === 'object' ? 
          (err.message || JSON.stringify(err)) : 
          err;
        setError(`Failed to sign in: ${errorMsg || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    // Development-only quick login
    if (!networkStatus) {
      setError('You are currently offline. Please check your network connection and try again.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // We'll use a development account that should be in the system
      const testEmail = 'testuser@example.com';
      const testPassword = 'Password123!';
      
      // Call the actual login function
      const success = await login(testEmail, testPassword);
      if (success) {
        navigate('/');
      } else {
        console.error('Login failed - please check backend API is running');
        setError('Login failed - please check if the backend API is running at http://localhost:8001');
      }
    } catch (err) {
      console.error('Dev login error:', err);
      
      if (err.message && err.message.includes('Network')) {
        setError('Network error during login. Please check your connection and try again.');
      } else {
        setError(`Login error: ${err.message || 'Unknown error'}. Please check if the backend API is running at http://localhost:8001`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleRetryAfterOnline = () => {
    setShowRetrySnackbar(false);
    handleSubmit({ preventDefault: () => {} });
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        
        {!networkStatus && (
          <Alert 
            severity="warning" 
            icon={<WifiOffIcon />}
            sx={{ mt: 2, width: '100%' }}
          >
            You are currently offline. Please check your network connection.
          </Alert>
        )}
        
        {message && (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            {message}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {typeof error === 'object' ? JSON.stringify(error) : error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || !networkStatus}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !networkStatus}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !networkStatus}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link component={RouterLink} to="/register" variant="body2">
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
        
        <Divider sx={{ width: '100%', my: 2 }} />
        
        {/* Development mode quick login */}
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Development Mode Only
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleDevLogin}
            size="small"
            disabled={loading || !networkStatus}
          >
            Bypass Login (Dev Mode)
          </Button>
        </Box>
      </Paper>
      <Box mt={4}>
        <Typography variant="body2" color="text.secondary" align="center">
          PACER Sales Methodology Game - A training platform for My Company
        </Typography>
      </Box>
      
      {/* Reconnection snackbar */}
      <Snackbar
        open={showRetrySnackbar}
        autoHideDuration={6000}
        onClose={() => setShowRetrySnackbar(false)}
        message="Network connection restored. Try signing in again."
        action={
          <Button 
            color="primary" 
            size="small" 
            onClick={handleRetryAfterOnline}
          >
            Retry
          </Button>
        }
      />
    </Container>
  );
};

export default Login; 