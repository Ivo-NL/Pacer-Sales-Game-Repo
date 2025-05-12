import React, { useState } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Avatar, Divider, TextField,
  Button, FormControl, InputLabel, Select, MenuItem, Chip, Alert
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    region: user?.region || 'Global',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const regions = [
    "Global",
    "Europe",
    "North America",
    "Asia Pacific",
    "Middle East and Africa",
    "Latin America"
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setSuccess('');
    setError('');
    
    try {
      setLoading(true);
      
      // In a real implementation, call API to update profile
      // For MVP, simulate successful update
      setTimeout(() => {
        setSuccess('Profile updated successfully');
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setSuccess('');
    setError('');
    
    // Validate passwords
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setLoading(true);
      
      // In a real implementation, call API to change password
      // For MVP, simulate successful update
      setTimeout(() => {
        setSuccess('Password changed successfully');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AccountCircleIcon sx={{ fontSize: 36, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">
          My Profile
        </Typography>
      </Box>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mb: 2, 
                  bgcolor: 'primary.main',
                  fontSize: '2.5rem'
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h6" gutterBottom>
                {user?.username || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.email || 'user@example.com'}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip 
                  label={user?.region || 'Global'} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                {user?.is_manager && (
                  <Chip 
                    label="Manager" 
                    size="small" 
                    color="secondary"
                  />
                )}
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Account Information
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Account created:</strong> {new Date().toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Last login:</strong> {new Date().toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Sessions completed:</strong> 14
                </Typography>
                <Typography variant="body2">
                  <strong>Current rank:</strong> Advanced
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Edit Profile
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" onSubmit={handleProfileUpdate}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="region-label">Region</InputLabel>
                    <Select
                      labelId="region-label"
                      name="region"
                      value={formData.region}
                      label="Region"
                      onChange={handleChange}
                      disabled={loading}
                    >
                      {regions.map((region) => (
                        <MenuItem key={region} value={region}>
                          {region}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" onSubmit={handlePasswordChange}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={loading}
                    helperText="Must be at least 6 characters"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile; 