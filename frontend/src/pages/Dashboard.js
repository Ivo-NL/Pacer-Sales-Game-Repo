import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box, Button, CircularProgress,
  Divider, List, ListItem, ListItemText, ListItemIcon, Chip, Card, CardContent, Alert,
  useTheme, CardHeader, CardActions, IconButton, Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimerIcon from '@mui/icons-material/Timer';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { 
  AssessmentOutlined as AssessmentIcon,
  EventNoteOutlined as EventIcon,
  GroupsOutlined as TeamsIcon,
  TrendingUpOutlined as TrendingUpIcon,
  FlagOutlined as FlagIcon,
  VideoLibraryOutlined as VideoIcon,
  SchoolOutlined as SchoolIcon,
  DateRangeOutlined as DateRangeIcon
} from '@mui/icons-material';
import ProgressCard from '../components/ProgressCard';
import RecentSessionsCard from '../components/RecentSessionsCard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch real data from the API
        const [progressRes, sessionsRes] = await Promise.all([
          apiService.progress.getProgress(),
          apiService.sessions.getAll({ limit: 10 }) // Fetch more sessions to ensure we have accurate data
        ]);
        
        // Process the data
        const allSessions = sessionsRes.data;
        // console.log("DASHBOARD SESSIONS DATA:", JSON.stringify(allSessions, null, 2));
        
        const completedSessions = allSessions.filter(session => 
          session.is_completed === true || session.end_time !== null
        );
        
        console.log("All sessions:", allSessions);
        console.log("Completed sessions:", completedSessions);
        
        // Update progress with calculated values if needed
        const progressData = progressRes.data;
        if (progressData.total_sessions_completed !== completedSessions.length) {
          console.log(`Progress data shows ${progressData.total_sessions_completed} completed sessions, but found ${completedSessions.length}`);
        }
        
        setUserProgress({
          ...progressData,
          // Use the greater of API-provided or calculated count
          total_sessions_completed: Math.max(
            progressData.total_sessions_completed || 0, 
            completedSessions.length
          )
        });
        
        // Take only the 5 most recent sessions for display
        setRecentSessions(allSessions.slice(0, 5));
        
        console.log("Sessions data from API:", sessionsRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up a refresh interval to keep dashboard data updated
    const refreshInterval = setInterval(() => {
      setLastRefresh(Date.now()); // Force refresh by updating the timestamp
    }, 60000); // Refresh every minute
    
    return () => {
      clearInterval(refreshInterval); // Clean up on unmount
    };
  }, [lastRefresh]); // Add lastRefresh to dependencies to trigger re-fetching

  const handleViewProgress = () => {
    navigate('/progress');
  };

  const handleViewSession = (sessionId) => {
    if (sessionId === 'all') {
      // Using existing sessions endpoint but with no limit
      navigate('/sessions');
    } else {
      navigate(`/game/${sessionId}`);
    }
  };

  const handleViewScenarios = () => {
    navigate('/scenarios');
  };

  const handleViewTeams = () => {
    navigate('/teams');
  };
  
  const handleViewLeaderboard = () => {
    navigate('/leaderboard');
  };

  const handleRefresh = () => {
    setLastRefresh(Date.now()); // Force refresh by updating the lastRefresh state
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

  const getPacerStageName = (stage) => {
    const stageMap = {
      'P': 'Prospect',
      'A': 'Assess',
      'C': 'Challenge',
      'E': 'Execute',
      'R': 'Retain'
    };
    return stageMap[stage] || stage;
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 'calc(100vh - 120px)' 
        }}
      >
        <CircularProgress 
          size={60} 
          thickness={4} 
          sx={{ 
            color: theme.palette.primary.main,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }} 
        />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, animation: 'fadeIn 0.5s ease-in-out' }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            boxShadow: '0 4px 8px rgba(244, 67, 54, 0.15)',
            '& .MuiAlert-icon': {
              color: theme.palette.error.main
            }
          }}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
            letterSpacing: 0.5
          }}
        >
          Welcome back, {user?.username || 'Sales Professional'}!
        </Typography>
        <Typography 
          variant="subtitle1" 
          color="textSecondary"
          sx={{ 
            maxWidth: '700px', 
            mx: 'auto', 
            mb: 2,
            opacity: 0.9 
          }}
        >
          Track your progress, practice scenarios, and improve your PACER sales methodology skills
        </Typography>
        <Box 
          sx={{ 
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            mt: 3
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<FlagIcon />}
            onClick={handleViewScenarios}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600
            }}
          >
            Practice Scenarios
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<BarChartIcon />}
            onClick={handleViewProgress}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600
            }}
          >
            View Progress
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            Your PACER Journey
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
            {/* Sessions Card */}
            <Box
              sx={{
                flex: 1, 
                minWidth: 150,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 1.5 
                }}
              >
                <PlayArrowIcon sx={{ color: 'primary.main', fontSize: 28, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Sessions</Typography>
              </Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 1,
                  color: theme.palette.primary.main
                }}
              >
                {recentSessions.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total gameplay sessions completed
              </Typography>
            </Box>
            
            {/* Score Card */}
            <Box
              sx={{
                flex: 1, 
                minWidth: 150,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 1.5 
                }}
              >
                <EmojiEventsIcon sx={{ color: 'secondary.main', fontSize: 28, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Score</Typography>
              </Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 1,
                  color: theme.palette.secondary.main 
                }}
              >
                {userProgress?.total_score ? Math.round(userProgress.total_score) : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your best scores (out of 100)
              </Typography>
            </Box>
            
            {/* Completed Card */}
            <Box
              sx={{
                flex: 1, 
                minWidth: 150,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 1.5 
                }}
              >
                <BarChartIcon sx={{ color: 'success.main', fontSize: 28, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Completed</Typography>
              </Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 1,
                  color: theme.palette.success.main 
                }}
              >
                {userProgress?.total_sessions_completed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sessions with the same scenario
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* PACER Methodology Proficiency */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%',
              borderRadius: 3,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 20px rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            <CardHeader
              title="PACER Methodology Proficiency"
              titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              action={
                <Tooltip title="View detailed breakdown">
                  <IconButton onClick={handleViewProgress}>
                    <MoreHorizIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{ 
                pb: 0,
                '& .MuiCardHeader-title': {
                  color: theme.palette.primary.main
                }
              }}
            />
            {userProgress?.pacerScores ? (
              <CardContent>
                <Grid container spacing={2}>
                  {['P', 'A', 'C', 'E', 'R'].map((letter) => {
                    const score = userProgress.pacerScores[letter] || 0;
                    const percentage = Math.min(100, Math.max(0, score * 10));
                    return (
                      <Grid item xs={12} key={letter}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              width: 36, 
                              height: 36, 
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                              color: 'white',
                              fontWeight: 'bold',
                              mr: 2,
                              boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            {letter}
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {letter === 'P' ? 'Prospect' : 
                                  letter === 'A' ? 'Assess' :
                                  letter === 'C' ? 'Challenge' :
                                  letter === 'E' ? 'Educate' : 'Realize'}
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {score.toFixed(1)}/10
                              </Typography>
                            </Box>
                            <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: '#f0f0f0', overflow: 'hidden' }}>
                              <Box 
                                sx={{ 
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  height: '100%',
                                  width: `${percentage}%`,
                                  background: `linear-gradient(to right, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                                  borderRadius: 4,
                                  transition: 'width 1s ease-in-out'
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    size="small"
                    color="primary"
                    onClick={handleViewProgress}
                    sx={{ mt: 1, borderRadius: 2 }}
                  >
                    View Detailed Breakdown
                  </Button>
                </Box>
              </CardContent>
            ) : (
              <CardContent>
                <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  Complete more sessions to view your PACER methodology proficiency
                </Typography>
              </CardContent>
            )}
          </Card>
        </Grid>
        
        {/* Recent Sessions */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: '100%',
              borderRadius: 3,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 20px rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            <CardHeader
              title="Recent Practice Sessions"
              titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              action={
                <Tooltip title="View all sessions">
                  <IconButton onClick={() => handleViewSession('all')}>
                    <MoreHorizIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{ 
                pb: 0,
                '& .MuiCardHeader-title': {
                  color: theme.palette.primary.main
                }
              }}
            />
            <CardContent>
              {recentSessions && recentSessions.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {recentSessions.map((session) => {
                    // Determine if session is completed (use same logic as Sessions.js)
                    const isCompleted = session.is_completed === true || session.end_time !== null;
                    
                    // Remove all zero numeric values that might be displayed
                    const cleanedSession = { ...session };
                    // Convert any 0 value to null to avoid rendering it
                    Object.keys(cleanedSession).forEach(key => {
                      if (cleanedSession[key] === 0 || cleanedSession[key] === '0') {
                        cleanedSession[key] = null;
                      }
                    });
                    
                    return (
                      <ListItem
                        key={session.id}
                        sx={{ 
                          px: 2, 
                          py: 1.5, 
                          borderRadius: 2, 
                          mb: 1,
                          '&:hover': { 
                            bgcolor: 'rgba(0, 0, 0, 0.03)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                          },
                          transition: 'all 0.2s'
                        }}
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            size="small" 
                            onClick={() => handleViewSession(session.id)}
                            sx={{ 
                              color: theme.palette.primary.main,
                              '&:hover': {
                                background: `rgba(${parseInt(theme.palette.primary.main.slice(1, 3), 16)}, ${parseInt(theme.palette.primary.main.slice(3, 5), 16)}, ${parseInt(theme.palette.primary.main.slice(5, 7), 16)}, 0.1)`,
                              }
                            }}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 42 }}>
                          <Chip 
                            label={isCompleted ? "✓" : "●"} 
                            size="small" 
                            sx={{ 
                              bgcolor: isCompleted ? theme.palette.success.light : theme.palette.info.light, 
                              color: isCompleted ? theme.palette.success.dark : theme.palette.info.dark,
                              fontWeight: 'bold',
                              height: 24,
                              width: 24
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {cleanedSession.scenario?.title || `Session #${cleanedSession.id}`}
                              </Typography>
                              
                              {/* PACER Stage */}
                              {cleanedSession.scenario?.pacer_stage && (
                                <Chip
                                  label={getPacerName(cleanedSession.scenario.pacer_stage)}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 24 }}
                                />
                              )}
                              
                              {/* Status Chip */}
                              <Chip
                                label={isCompleted ? 'Completed' : 'In progress'}
                                size="small"
                                color={isCompleted ? 'success' : 'warning'}
                                sx={{ height: 24 }}
                              />
                              
                              {/* Session Level */}
                              <Chip
                                label={`Level ${cleanedSession.difficulty || 1}`}
                                size="small"
                                sx={{ 
                                  height: 24,
                                  bgcolor: theme.palette.primary.lighter || '#e3f2fd',
                                  color: theme.palette.primary.dark || '#0277bd',
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 0.5, alignItems: 'center' }}>
                              {/* Date display */}
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DateRangeIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.text.secondary }} />
                                <Typography variant="caption" color="textSecondary">
                                  {formatDate(cleanedSession.start_time)}
                                </Typography>
                              </Box>
                              
                              {/* Only show score if it exists and is not zero */}
                              {cleanedSession.total_score && parseFloat(cleanedSession.total_score) > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <EmojiEventsIcon 
                                    sx={{ 
                                      fontSize: isCompleted ? 20 : 16, 
                                      mr: 0.5, 
                                      color: isCompleted ? theme.palette.success.main : theme.palette.text.secondary 
                                    }} 
                                  />
                                  <Typography 
                                    variant={isCompleted ? "body2" : "caption"}
                                    sx={{ 
                                      fontWeight: isCompleted ? 700 : 400,
                                      color: isCompleted ? theme.palette.success.dark : theme.palette.text.secondary
                                    }}
                                  >
                                    Score: {parseFloat(cleanedSession.total_score).toFixed(1)}
                                  </Typography>
                                </Box>
                              )}
                              
                              {/* Duration */}
                              {cleanedSession.duration && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <TimerIcon sx={{ fontSize: 16, mr: 0.5, color: theme.palette.text.secondary }} />
                                  <Typography variant="caption" color="textSecondary">
                                    {`${cleanedSession.duration} min`}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  No sessions found. Start practicing to see your recent sessions here.
                </Typography>
              )}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => handleViewSession('all')}
                  sx={{ borderRadius: 2 }}
                >
                  View All Sessions
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Start New Session */}
        <Grid item xs={12}>
          <Card 
            sx={{ 
              borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              boxShadow: '0 10px 20px rgba(26, 179, 148, 0.3)',
              transition: 'transform 0.3s, box-shadow 0.3s',
              overflow: 'hidden',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 15px 30px rgba(26, 179, 148, 0.4)'
              }
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '-30%',
                right: '-10%',
                width: '300px',
                height: '300px',
                background: `radial-gradient(circle, ${theme.palette.primary.light}33, transparent 70%)`,
                borderRadius: '50%',
                zIndex: 0
              }}
            />
            <CardContent sx={{ position: 'relative', zIndex: 1, py: 4 }}>
              <Grid container alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                    Ready to improve your sales skills?
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                    Practice PACER methodology with realistic sales scenarios and get instant feedback
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleViewScenarios}
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      boxShadow: '0 4px 10px rgba(255, 199, 44, 0.3)',
                      mt: { xs: 2, md: 0 }
                    }}
                  >
                    Start Practice
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 