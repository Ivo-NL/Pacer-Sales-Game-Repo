import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, IconButton,
  Chip, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, LinearProgress, Snackbar, Alert, Tooltip
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FlagIcon from '@mui/icons-material/Flag';
import GroupIcon from '@mui/icons-material/Group';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ShareIcon from '@mui/icons-material/Share';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const TeamChallengesList = ({ teamId, challenges, teamMembers, loading, error, refreshChallenges }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  // Form data for creating a new challenge
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    pacer_focus: 'P',
    target_score: 75,
    start_date: new Date(),
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
  });
  
  // Add a state to track if we're using mock data
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Detect if we're using mock data
  useEffect(() => {
    const hasDemoChallenge = challenges?.some(challenge => challenge.is_demo);
    const missingTeamId = !teamId && challenges && challenges.length > 0;
    
    if (hasDemoChallenge || missingTeamId) {
      console.log("Using demo data - real team ID is required for creating challenges");
      setUsingMockData(true);
    } else {
      setUsingMockData(false);
    }
  }, [teamId, challenges]);
  
  const handleOpenCreateDialog = () => {
    if (!teamId) {
      setSnackbarMessage('You need to join or create a real team before creating challenges.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    setCreateDialogOpen(true);
  };
  
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };
  
  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleDateChange = (name, date) => {
    setCreateFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };
  
  const handleCreateChallenge = async () => {
    try {
      // Call the real API endpoint to create a challenge
      console.log('Creating challenge with data:', createFormData);
      
      if (!teamId) {
        throw new Error('Team ID is required to create a challenge');
      }
      
      // Add any missing required fields
      const challengeData = {
        ...createFormData,
        pacer_focus: createFormData.pacer_focus || 'General', // Default if not set
        target_score: createFormData.target_score || 80, // Default if not set
      };
      
      // Call the API to create the challenge
      await apiService.teams.createChallenge(teamId, challengeData);
      
      // Show success message
      setSnackbarMessage('Challenge created successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Close dialog
      setCreateDialogOpen(false);
      
      // Reset form data
      setCreateFormData({
        title: '',
        description: '',
        pacer_focus: 'General',
        target_score: 80,
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
      });
      
      // Refresh challenges
      if (refreshChallenges) {
        refreshChallenges();
      }
      
    } catch (error) {
      console.error('Error creating challenge:', error);
      setSnackbarMessage(`Failed to create challenge: ${error.message || 'Please try again'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  const handleViewResults = (challenge) => {
    setSelectedChallenge(challenge);
    setResultsDialogOpen(true);
  };
  
  const handleCloseResultsDialog = () => {
    setResultsDialogOpen(false);
    setSelectedChallenge(null);
  };
  
  const handleShareChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setShareDialogOpen(true);
  };
  
  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedChallenge(null);
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  // Helper functions
  
  const getPacerStageName = (stage) => {
    switch (stage) {
      case 'P': return 'Prospect';
      case 'A': return 'Assess';
      case 'C': return 'Challenge';
      case 'E': return 'Execute';
      case 'R': return 'Retain';
      default: return stage;
    }
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const isChallengeActive = (challenge) => {
    if (!challenge || !challenge.start_date || !challenge.end_date) return false;
    
    const now = new Date();
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    
    return startDate <= now && now <= endDate;
  };
  
  const isChallengeUpcoming = (challenge) => {
    if (!challenge || !challenge.start_date) return false;
    
    const now = new Date();
    const startDate = new Date(challenge.start_date);
    
    return startDate > now;
  };
  
  const isChallengeCompleted = (challenge) => {
    if (!challenge || !challenge.end_date) return false;
    
    const now = new Date();
    const endDate = new Date(challenge.end_date);
    
    return endDate < now || challenge.status === 'completed';
  };
  
  const getChallengeStatusLabel = (challenge) => {
    if (isChallengeActive(challenge)) {
      return <Chip icon={<TimelapseIcon />} label="Active" color="primary" size="small" />;
    } else if (isChallengeUpcoming(challenge)) {
      return <Chip icon={<HourglassEmptyIcon />} label="Upcoming" color="info" size="small" />;
    } else {
      return <Chip icon={<CheckCircleOutlineIcon />} label="Completed" color="success" size="small" />;
    }
  };
  
  const calculateProgress = (challenge) => {
    if (!challenge.results || challenge.results.length === 0) return 0;
    
    const totalScore = challenge.results.reduce((sum, result) => sum + result.score, 0);
    const averageScore = totalScore / challenge.results.length;
    
    return (averageScore / challenge.target_score) * 100;
  };
  
  const getProgressColor = (progress) => {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'primary';
    if (progress >= 50) return 'warning';
    return 'error';
  };
  
  // Group challenges by status
  const activeTeamChallenges = challenges ? challenges.filter(isChallengeActive) : [];
  const upcomingTeamChallenges = challenges ? challenges.filter(isChallengeUpcoming) : [];
  const completedTeamChallenges = challenges ? challenges.filter(isChallengeCompleted) : [];
  
  // Render the Add Challenge button with appropriate state
  const renderAddChallengeButton = () => {
    if (usingMockData) {
      return (
        <Tooltip title="You need to join or create a real team first">
          <span>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setSnackbarMessage('You need to join or create a real team before creating challenges.');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
              }}
            >
              Create Challenge
            </Button>
          </span>
        </Tooltip>
      );
    }
    
    return (
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleOpenCreateDialog}
      >
        Create Challenge
      </Button>
    );
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Team Challenges</Typography>
        {renderAddChallengeButton()}
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <LinearProgress variant="indeterminate" sx={{ width: '100%' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <>
          {/* Active Challenges */}
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Active Challenges ({activeTeamChallenges.length})
          </Typography>
          
          {activeTeamChallenges.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No active challenges found.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {activeTeamChallenges.map((challenge) => (
                <Grid item xs={12} sm={6} md={4} key={challenge.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                          {challenge.title}
                        </Typography>
                        {getChallengeStatusLabel(challenge)}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {challenge.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          icon={<FlagIcon />}
                          label={`Focus: ${getPacerStageName(challenge.pacer_focus)}`}
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          icon={<CalendarTodayIcon />}
                          label={`Ends: ${formatDate(challenge.end_date)}`}
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="body2" gutterBottom>
                        Progress: {challenge.results ? challenge.results.length : 0} participants
                      </Typography>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(calculateProgress(challenge), 100)} 
                        color={getProgressColor(calculateProgress(challenge))}
                        sx={{ height: 8, borderRadius: 4, mb: 2 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleViewResults(challenge)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleShareChallenge(challenge)}
                        >
                          <ShareIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Upcoming Challenges */}
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Upcoming Challenges ({upcomingTeamChallenges.length})
          </Typography>
          
          {upcomingTeamChallenges.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No upcoming challenges found.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {upcomingTeamChallenges.map((challenge) => (
                <Grid item xs={12} sm={6} md={4} key={challenge.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                          {challenge.title}
                        </Typography>
                        {getChallengeStatusLabel(challenge)}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {challenge.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          icon={<FlagIcon />}
                          label={`Focus: ${getPacerStageName(challenge.pacer_focus)}`}
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          icon={<CalendarTodayIcon />}
                          label={`Starts: ${formatDate(challenge.start_date)}`}
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                        <GroupIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Target: {challenge.target_score}% mastery
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Completed Challenges */}
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Completed Challenges ({completedTeamChallenges.length})
          </Typography>
          
          {completedTeamChallenges.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No completed challenges found.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {completedTeamChallenges.map((challenge) => (
                <Grid item xs={12} sm={6} md={4} key={challenge.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: 0.8 }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                          {challenge.title}
                        </Typography>
                        {getChallengeStatusLabel(challenge)}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {challenge.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          icon={<FlagIcon />}
                          label={`Focus: ${getPacerStageName(challenge.pacer_focus)}`}
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="body2" gutterBottom>
                        Final Result: {challenge.results ? challenge.results.length : 0} participants
                      </Typography>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(calculateProgress(challenge), 100)} 
                        color={getProgressColor(calculateProgress(challenge))}
                        sx={{ height: 8, borderRadius: 4, mb: 2 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleViewResults(challenge)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
      
      {/* Create Challenge Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Team Challenge</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Challenge Title"
              name="title"
              value={createFormData.title}
              onChange={handleCreateFormChange}
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Description"
              name="description"
              value={createFormData.description}
              onChange={handleCreateFormChange}
              multiline
              rows={3}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="pacer-focus-label">PACER Focus</InputLabel>
              <Select
                labelId="pacer-focus-label"
                name="pacer_focus"
                value={createFormData.pacer_focus}
                onChange={handleCreateFormChange}
                label="PACER Focus"
              >
                <MenuItem value="P">Prospect</MenuItem>
                <MenuItem value="A">Assess</MenuItem>
                <MenuItem value="C">Challenge</MenuItem>
                <MenuItem value="E">Execute</MenuItem>
                <MenuItem value="R">Retain</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              margin="normal"
              label="Target Score (%)"
              name="target_score"
              type="number"
              value={createFormData.target_score}
              onChange={handleCreateFormChange}
              inputProps={{ min: 0, max: 100 }}
            />
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <DateTimePicker
                  label="Start Date"
                  value={createFormData.start_date}
                  onChange={(date) => handleDateChange('start_date', date)}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                />
                
                <DateTimePicker
                  label="End Date"
                  value={createFormData.end_date}
                  onChange={(date) => handleDateChange('end_date', date)}
                  slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                  minDate={createFormData.start_date}
                />
              </Box>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            onClick={handleCreateChallenge}
            variant="contained"
            color="primary"
            disabled={!createFormData.title || !createFormData.description}
          >
            Create Challenge
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Results Dialog */}
      <Dialog 
        open={resultsDialogOpen} 
        onClose={handleCloseResultsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Challenge Results: {selectedChallenge?.title}
        </DialogTitle>
        <DialogContent>
          {selectedChallenge && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Focus: {getPacerStageName(selectedChallenge.pacer_focus)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedChallenge.description}
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Chip 
                  icon={<CalendarTodayIcon />}
                  label={`Start: ${formatDate(selectedChallenge.start_date)}`}
                  size="small" 
                />
                <Chip 
                  icon={<CalendarTodayIcon />}
                  label={`End: ${formatDate(selectedChallenge.end_date)}`}
                  size="small" 
                />
                <Chip 
                  icon={<FlagIcon />}
                  label={`Target: ${selectedChallenge.target_score}%`}
                  size="small" 
                />
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Participant Results
              </Typography>
              
              {selectedChallenge.results && selectedChallenge.results.length > 0 ? (
                <Box>
                  {selectedChallenge.results.map((result) => (
                    <Card key={result.id} sx={{ mb: 2, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          {result.user.username}{' '}
                          {result.user.id === user.id && (
                            <Chip label="You" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="h6" color={result.score >= selectedChallenge.target_score ? 'success.main' : 'warning.main'}>
                          {result.score}%
                        </Typography>
                      </Box>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min((result.score / selectedChallenge.target_score) * 100, 100)} 
                        color={result.score >= selectedChallenge.target_score ? 'success' : 'warning'}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Sessions completed: {result.completed_sessions}
                        </Typography>
                        {result.completed_at && (
                          <Typography variant="body2" color="text.secondary">
                            Completed: {formatDate(result.completed_at)}
                          </Typography>
                        )}
                      </Box>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No results available yet.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResultsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Challenge Dialog */}
      <Dialog 
        open={shareDialogOpen} 
        onClose={handleCloseShareDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Challenge</DialogTitle>
        <DialogContent>
          {selectedChallenge && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {selectedChallenge.title}
              </Typography>
              
              <TextField
                fullWidth
                margin="normal"
                label="Share Link"
                value={`https://example.com/challenges/${selectedChallenge.id}`}
                InputProps={{
                  readOnly: true,
                }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Share this challenge with your team members to invite them to participate.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog}>Close</Button>
          <Button variant="contained" color="primary">
            Copy Link
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamChallengesList; 