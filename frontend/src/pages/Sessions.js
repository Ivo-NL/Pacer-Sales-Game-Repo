import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, 
  Button, CircularProgress, Pagination, Stack,
  Alert, List, ListItem, ListItemIcon, ListItemText,
  Chip, Card, CardContent, Divider, useTheme, Grid,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon,
  DateRange as DateRangeIcon,
  Score as ScoreIcon,
  Assessment as AssessmentIcon,
  Timer as TimerIcon,
  EmojiEvents as EmojiEventsIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import apiService from '../services/api';

/**
 * Sessions page component displays all game sessions for the current user
 * with pagination and filtering options
 */
const Sessions = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  
  // State for delete and restart confirmation dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        
        // Get sessions from API with pagination
        const response = await apiService.sessions.getAll({
          page: page,
          limit: pageSize
        });
        
        // Use data directly from the API
        console.log("DETAILED SESSIONS DATA:", JSON.stringify(response.data, null, 2));
        setSessions(response.data);
        
        // Calculate total pages
        const total = response.total || response.data.length;
        setTotalPages(Math.ceil(total / pageSize));
        
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Failed to load sessions. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
    
    // Set up a refresh interval to keep session data updated
    const refreshInterval = setInterval(fetchSessions, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(refreshInterval); // Clean up on unmount
    };
  }, [page]);
  
  const handleViewSession = (sessionId) => {
    navigate(`/game/${sessionId}`);
  };
  
  // Function to open delete confirmation dialog
  const handleDeleteClick = (e, session) => {
    e.stopPropagation(); // Prevent triggering ListItem click
    setSelectedSession(session);
    setDeleteDialogOpen(true);
  };
  
  // Function to open restart confirmation dialog
  const handleRestartClick = (e, session) => {
    e.stopPropagation(); // Prevent triggering ListItem click
    setSelectedSession(session);
    setRestartDialogOpen(true);
  };
  
  // Function to delete a session
  const handleDeleteSession = async () => {
    try {
      if (!selectedSession) return;
      
      // Backend endpoint needs to be implemented
      await apiService.sessions.delete(selectedSession.id);
      
      // Refresh the list after deletion
      const response = await apiService.sessions.getAll({
        page: page,
        limit: pageSize
      });
      
      setSessions(response.data);
      setDeleteDialogOpen(false);
      setSelectedSession(null);
      
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete session. Please try again.');
    }
  };
  
  // Function to restart a session
  const handleRestartSession = async () => {
    try {
      if (!selectedSession) return;
      
      // Backend endpoint needs to be implemented
      // This would create a new session with the same scenario
      const response = await apiService.sessions.restart(selectedSession.id);
      
      // Navigate to the new session
      navigate(`/game/${response.data.id}`);
      
    } catch (error) {
      console.error('Error restarting session:', error);
      setError('Failed to restart session. Please try again.');
    } finally {
      setRestartDialogOpen(false);
      setSelectedSession(null);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date)) return 'Invalid Date';
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };
  
  // Get full name based on PACER letter
  const getPacerName = (letter) => {
    switch(letter) {
      case 'P': return 'Prospect';
      case 'A': return 'Assess';
      case 'C': return 'Challenge';
      case 'E': return 'Execute';
      case 'R': return 'Retain';
      default: return letter;
    }
  };

  // Get session status label and color
  const getSessionStatus = (session) => {
    // A session is considered completed if it has is_completed flag or an end_time
    const isCompleted = session.is_completed === true || session.end_time !== null;
    
    // Add debugging to understand session status and properties
    console.log(`Session ${session.id} status check:`, {
      id: session.id,
      is_completed: session.is_completed,
      end_time: session.end_time,
      duration: session.duration,
      calculated_isCompleted: isCompleted,
      fullSessionData: session
    });
    
    return {
      label: isCompleted ? 'Completed' : 'In progress',
      color: isCompleted ? 'success' : 'warning',
      isCompleted: isCompleted
    };
  };

  if (loading && sessions.length === 0) {
    return (
      <Container sx={{ my: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          All Practice Sessions
        </Typography>
        <Button 
          variant="contained"
          color="primary"
          sx={{ ml: 'auto' }}
          onClick={() => navigate('/scenarios')}
        >
          Start New Session
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && sessions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No sessions found
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            You haven't started any practice sessions yet.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/scenarios')}
            startIcon={<PlayArrowIcon />}
          >
            Start Practicing
          </Button>
        </Paper>
      ) : (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <List>
              {sessions.map((session) => {
                // Process session status
                const status = getSessionStatus(session);
                
                // Remove all zero numeric values that might be displayed
                const cleanedSession = { ...session };
                // Convert any 0 value to null to avoid rendering it
                Object.keys(cleanedSession).forEach(key => {
                  if (cleanedSession[key] === 0 || cleanedSession[key] === '0') {
                    cleanedSession[key] = null;
                  }
                });
                
                return (
                  <React.Fragment key={session.id}>
                    <ListItem 
                      button
                      onClick={() => handleViewSession(session.id)}
                      alignItems="flex-start"
                      sx={{ py: 2 }}
                      secondaryAction={
                        <Box>
                          <Tooltip title="Restart session from scratch">
                            <IconButton 
                              edge="end" 
                              aria-label="restart" 
                              onClick={(e) => handleRestartClick(e, session)}
                              sx={{ ml: 1, color: theme.palette.info.main }}
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete session">
                            <IconButton 
                              edge="end" 
                              aria-label="delete" 
                              onClick={(e) => handleDeleteClick(e, session)}
                              sx={{ ml: 1, color: theme.palette.error.main }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <PlayArrowIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="h6" component="span">
                              {cleanedSession.scenario?.title || 'Unnamed Scenario'}
                            </Typography>
                            <Chip
                              label={getPacerName(cleanedSession.scenario?.pacer_stage)}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 2 }}
                            />
                            <Chip
                              label={status.label}
                              size="small"
                              color={status.color}
                              sx={{ ml: 2 }}
                            />
                            <Chip
                              label={`Level ${cleanedSession.difficulty || 1}`}
                              size="small"
                              sx={{ 
                                ml: 2,
                                bgcolor: theme.palette.primary.lighter || '#e3f2fd',
                                color: theme.palette.primary.dark || '#0277bd',
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <DateRangeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2">
                                    {formatDate(cleanedSession.start_time)}
                                  </Typography>
                                </Box>
                              </Grid>
                              
                              {/* Only show score if it exists and is not zero */}
                              {cleanedSession.total_score && parseFloat(cleanedSession.total_score) > 0 && (
                                <Grid item xs={12} sm={6}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <ScoreIcon 
                                      fontSize={status.isCompleted ? "medium" : "small"} 
                                      sx={{ 
                                        mr: 1, 
                                        color: status.isCompleted ? 'success.main' : 'text.secondary' 
                                      }} 
                                    />
                                    <Typography 
                                      variant={status.isCompleted ? "subtitle2" : "body2"}
                                      sx={{ 
                                        fontWeight: status.isCompleted ? 700 : 400,
                                        color: status.isCompleted ? 'success.dark' : 'text.primary'
                                      }}
                                    >
                                      Score: {parseFloat(cleanedSession.total_score).toFixed(1)}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              
                              {/* Show duration for sessions with no score or zero score - without in-progress icon if already shown as chip */}
                              {(!cleanedSession.total_score || parseFloat(cleanedSession.total_score) === 0) && (
                                <Grid item xs={12} sm={6}>
                                  {cleanedSession.duration ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <TimerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                      <Typography variant="body2">
                                        {`${cleanedSession.duration} min`}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Box sx={{ height: 24 }} /> 
                                  )}
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Stack spacing={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(event, value) => setPage(value)}
                color="primary"
              />
            </Stack>
          </Box>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Session
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this session? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteSession} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restart Confirmation Dialog */}
      <Dialog
        open={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        aria-labelledby="restart-dialog-title"
        aria-describedby="restart-dialog-description"
      >
        <DialogTitle id="restart-dialog-title">
          Restart Session
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="restart-dialog-description">
            Are you sure you want to restart this session from scratch? A new session will be created with the same scenario.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestartDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleRestartSession} color="primary" variant="contained">
            Restart
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Sessions; 