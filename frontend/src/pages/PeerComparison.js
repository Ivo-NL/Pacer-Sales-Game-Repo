import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, FormControl, InputLabel, Select, MenuItem,
  Button, Tabs, Tab, CircularProgress, Alert, Card, CardContent, Divider, Chip,
  Autocomplete, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, List, ListItem, ListItemAvatar, ListItemText, Rating, LinearProgress, IconButton,
  Tooltip
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import GroupIcon from '@mui/icons-material/Group';
import SkillsIcon from '@mui/icons-material/Architecture';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PeerComparison = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedPeers, setSelectedPeers] = useState([]);
  const [availablePeers, setAvailablePeers] = useState([]);
  const [userData, setUserData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonMetric, setComparisonMetric] = useState('overall');
  const [timeRange, setTimeRange] = useState('monthly');
  
  // Colors for charts
  const colors = ['#1976d2', '#4CAF50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's detailed progress from API
        const userProgressResponse = await apiService.progress.getDetailedProgress();
        const apiUserData = userProgressResponse.data;
        
        // Fetch leaderboard data to get potential peers
        const leaderboardResponse = await apiService.leaderboard.get({
          time_range: timeRange
        });
        
        // Extract peers from leaderboard, excluding current user
        const leaderboardData = leaderboardResponse.data || [];
        const peers = leaderboardData
          .filter(item => item.type === 'individual' && item.id !== user.id)
          .map(peer => ({
            id: peer.id,
            name: peer.name || peer.username,
            team: peer.team_name,
            region: peer.region,
            avatar: peer.avatar || `https://i.pravatar.cc/150?u=${peer.id}`
          }));
        
        // Create formatted user data object
        const userDataObj = {
          id: user.id,
          name: user.username,
          avatar: user.avatar,
          team: apiUserData.team_name,
          region: apiUserData.region,
          overall_score: apiUserData.overall_score || 0,
          pacer_scores: {
            P: apiUserData.prospect_score || 0,
            A: apiUserData.assess_score || 0,
            C: apiUserData.challenge_score || 0,
            E: apiUserData.execute_score || 0,
            R: apiUserData.retain_score || 0
          },
          skill_scores: apiUserData.skills || {},
          badges: apiUserData.badge_count || 0,
          challenges_completed: apiUserData.completed_challenges || 0,
          improvement_rate: apiUserData.improvement_rate || 0,
          strengths: apiUserData.strengths || [],
          areas_for_improvement: apiUserData.areas_for_improvement || []
        };
        
        // Set user data in state
        setUserData(userDataObj);
        
        // Set available peers
        setAvailablePeers(peers);
        
        // Default to comparing with the first two peers if available
        const initialSelectedPeers = peers.slice(0, 2);
        setSelectedPeers(initialSelectedPeers);
        
        // For each selected peer, we need to fetch their detailed progress
        const peerDataPromises = initialSelectedPeers.map(peer => 
          apiService.progress.getDetailedProgress({ user_id: peer.id })
        );
        
        const peerResponses = await Promise.all(peerDataPromises);
        const peersData = {};
        
        // Process peer data
        initialSelectedPeers.forEach((peer, index) => {
          const peerData = peerResponses[index].data;
          peersData[peer.id] = {
            overall_score: peerData.overall_score || 0,
            pacer_scores: {
              P: peerData.prospect_score || 0,
              A: peerData.assess_score || 0,
              C: peerData.challenge_score || 0,
              E: peerData.execute_score || 0,
              R: peerData.retain_score || 0
            },
            skill_scores: peerData.skills || {},
            badges: peerData.badge_count || 0,
            challenges_completed: peerData.completed_challenges || 0,
            improvement_rate: peerData.improvement_rate || 0,
            strengths: peerData.strengths || [],
            areas_for_improvement: peerData.areas_for_improvement || []
          };
        });
        
        // Generate comparison data using the userDataObj directly
        generateComparisonData(userDataObj, initialSelectedPeers, peersData);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load comparison data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user.id, user.username, user.avatar, timeRange]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleComparisonMetricChange = (event) => {
    setComparisonMetric(event.target.value);
  };
  
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  const handlePeerSelection = async (event, newValue) => {
    try {
      setLoading(true);
      setSelectedPeers(newValue);
      
      // Fetch detailed progress for newly selected peers
      const peerDataPromises = newValue.map(peer => 
        apiService.progress.getDetailedProgress({ user_id: peer.id })
      );
      
      const peerResponses = await Promise.all(peerDataPromises);
      const peersData = {};
      
      // Process peer data
      newValue.forEach((peer, index) => {
        const peerData = peerResponses[index].data;
        peersData[peer.id] = {
          overall_score: peerData.overall_score || 0,
          pacer_scores: {
            P: peerData.prospect_score || 0,
            A: peerData.assess_score || 0,
            C: peerData.challenge_score || 0,
            E: peerData.execute_score || 0,
            R: peerData.retain_score || 0
          },
          skill_scores: peerData.skills || {},
          badges: peerData.badge_count || 0,
          challenges_completed: peerData.completed_challenges || 0,
          improvement_rate: peerData.improvement_rate || 0,
          strengths: peerData.strengths || [],
          areas_for_improvement: peerData.areas_for_improvement || []
        };
      });
      
      // Generate comparison data with selected peers
      generateComparisonData(userData, newValue, peersData);
    } catch (err) {
      console.error('Error fetching peer data:', err);
      setError('Failed to load peer comparison data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to generate comparison data based on selected peers
  const generateComparisonData = (user, peers, peersData) => {
    if (!user || !peers || !peersData) return;
    
    // Generate PACER radar chart data
    const pacerRadarData = [
      { subject: 'Prospect', A: user.pacer_scores.P },
      { subject: 'Assess', A: user.pacer_scores.A },
      { subject: 'Challenge', A: user.pacer_scores.C },
      { subject: 'Execute', A: user.pacer_scores.E },
      { subject: 'Retain', A: user.pacer_scores.R }
    ];
    
    // Add data for each selected peer
    peers.forEach((peer, index) => {
      const peerData = peersData[peer.id];
      if (peerData) {
        pacerRadarData[0][`B${index}`] = peerData.pacer_scores.P;
        pacerRadarData[1][`B${index}`] = peerData.pacer_scores.A;
        pacerRadarData[2][`B${index}`] = peerData.pacer_scores.C;
        pacerRadarData[3][`B${index}`] = peerData.pacer_scores.E;
        pacerRadarData[4][`B${index}`] = peerData.pacer_scores.R;
      }
    });
    
    // Generate skills comparison data
    const skillsComparisonData = Object.keys(user.skill_scores).map(skill => {
      const skillData = { name: skill, User: user.skill_scores[skill] };
      
      peers.forEach((peer, index) => {
        const peerData = peersData[peer.id];
        if (peerData && peerData.skill_scores[skill] !== undefined) {
          skillData[peer.name] = peerData.skill_scores[skill];
        }
      });
      
      return skillData;
    });
    
    // Generate overall metrics comparison
    const overallComparisonData = [
      {
        name: 'Overall Score',
        User: user.overall_score,
      },
      {
        name: 'Badges Earned',
        User: user.badges,
      },
      {
        name: 'Challenges Completed',
        User: user.challenges_completed,
      },
      {
        name: 'Improvement Rate',
        User: user.improvement_rate,
      }
    ];
    
    // Add data for each selected peer
    peers.forEach(peer => {
      const peerData = peersData[peer.id];
      if (peerData) {
        overallComparisonData[0][peer.name] = peerData.overall_score;
        overallComparisonData[1][peer.name] = peerData.badges;
        overallComparisonData[2][peer.name] = peerData.challenges_completed;
        overallComparisonData[3][peer.name] = peerData.improvement_rate;
      }
    });
    
    // Set comparison data
    setComparisonData({
      pacerRadarData,
      skillsComparisonData,
      overallComparisonData,
      peersData
    });
  };
  
  // Generate labels for radar chart
  const generateRadarChartLegend = () => {
    const legendItems = [{ name: "You", color: colors[0] }];
    
    selectedPeers.forEach((peer, index) => {
      legendItems.push({ name: peer.name, color: colors[index + 1] });
    });
    
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        {legendItems.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color, mr: 1 }} />
            <Typography variant="caption">{item.name}</Typography>
          </Box>
        ))}
      </Box>
    );
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <CompareArrowsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Peer Comparison
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Select Peers to Compare</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Autocomplete
                  multiple
                  options={availablePeers}
                  getOptionLabel={(option) => `${option.name} (${option.team})`}
                  value={selectedPeers}
                  onChange={handlePeerSelection}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Select peers to compare with"
                      placeholder="Search by name or team"
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={option.avatar} sx={{ width: 24, height: 24, mr: 1 }} />
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          ({option.team})
                        </Typography>
                      </Box>
                    </li>
                  )}
                  limitTags={3}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="time-range-label">Time Period</InputLabel>
                  <Select
                    labelId="time-range-label"
                    id="time-range-select"
                    value={timeRange}
                    label="Time Period"
                    onChange={handleTimeRangeChange}
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                    <MenuItem value="all-time">All Time</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          <Paper sx={{ mb: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="peer comparison tabs">
                <Tab icon={<EqualizerIcon />} iconPosition="start" label="Performance Overview" />
                <Tab icon={<SkillsIcon />} iconPosition="start" label="Skills Breakdown" />
                <Tab icon={<PersonIcon />} iconPosition="start" label="Peer Details" />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">PACER Skills Comparison</Typography>
                      <Tooltip title="Compare your proficiency in each PACER stage against selected peers">
                        <IconButton size="small">
                          <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {comparisonData && (
                      <>
                        <Box sx={{ flex: 1, minHeight: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonData.pacerRadarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar name="You" dataKey="A" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
                              {selectedPeers.map((peer, index) => (
                                <Radar
                                  key={peer.id}
                                  name={peer.name}
                                  dataKey={`B${index}`}
                                  stroke={colors[index + 1]}
                                  fill={colors[index + 1]}
                                  fillOpacity={0.6}
                                />
                              ))}
                              <RechartsTooltip />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </Box>
                        {generateRadarChartLegend()}
                      </>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Overall Metrics</Typography>
                      <Tooltip title="Compare key performance metrics with selected peers">
                        <IconButton size="small">
                          <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {comparisonData && (
                      <Box sx={{ flex: 1, minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={comparisonData.overallComparisonData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="User" name="You" fill={colors[0]} />
                            {selectedPeers.map((peer, index) => (
                              <Bar key={peer.id} dataKey={peer.name} fill={colors[index + 1]} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl sx={{ mb: 3, minWidth: 200 }}>
                    <InputLabel id="comparison-metric-label">Comparison Metric</InputLabel>
                    <Select
                      labelId="comparison-metric-label"
                      id="comparison-metric-select"
                      value={comparisonMetric}
                      label="Comparison Metric"
                      onChange={handleComparisonMetricChange}
                    >
                      <MenuItem value="overall">Overall Skills</MenuItem>
                      <MenuItem value="strengths">Strengths</MenuItem>
                      <MenuItem value="improvements">Areas for Improvement</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Detailed Skills Analysis
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {comparisonData && (
                      <Box sx={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={comparisonData.skillsComparisonData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="User" name="You" fill={colors[0]} />
                            {selectedPeers.map((peer, index) => (
                              <Bar key={peer.id} dataKey={peer.name} fill={colors[index + 1]} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Your Key Strengths:
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        {userData && userData.strengths && userData.strengths.length > 0 ? (
                          userData.strengths.map((strength, index) => (
                            <Chip 
                              key={index} 
                              label={strength} 
                              color="success" 
                              size="small" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Complete more sessions to identify your strengths.
                          </Typography>
                        )}
                      </Box>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Your Areas for Improvement:
                      </Typography>
                      <Box>
                        {userData && userData.areas_for_improvement && userData.areas_for_improvement.length > 0 ? (
                          userData.areas_for_improvement.map((area, index) => (
                            <Chip 
                              key={index} 
                              label={area} 
                              color="primary" 
                              size="small" 
                              sx={{ mr: 1, mb: 1 }} 
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Complete more sessions to identify your improvement areas.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                {selectedPeers.map((peer, index) => {
                  const peerData = comparisonData?.peersData[peer.id];
                  if (!peerData) return null;
                  
                  return (
                    <Grid item xs={12} key={peer.id}>
                      <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar src={peer.avatar} sx={{ width: 56, height: 56, mr: 2 }} />
                          <Box>
                            <Typography variant="h6">{peer.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {peer.team} • {peer.region}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              PACER Stage Proficiency
                            </Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Stage</TableCell>
                                    <TableCell align="center">Score</TableCell>
                                    <TableCell align="center">Compared to You</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {['P', 'A', 'C', 'E', 'R'].map((stage, i) => {
                                    const stageName = ['Prospect', 'Assess', 'Challenge', 'Execute', 'Retain'][i];
                                    const peerScore = peerData.pacer_scores[stage];
                                    const userScore = userData?.pacer_scores[stage] || 0;
                                    const diff = peerScore - userScore;
                                    
                                    return (
                                      <TableRow key={stage}>
                                        <TableCell>{stageName}</TableCell>
                                        <TableCell align="center">{peerScore}</TableCell>
                                        <TableCell align="center">
                                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {diff > 0 ? (
                                              <TrendingUpIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                                            ) : diff < 0 ? (
                                              <TrendingDownIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                                            ) : (
                                              <TrendingFlatIcon color="action" fontSize="small" sx={{ mr: 0.5 }} />
                                            )}
                                            <Typography 
                                              variant="body2" 
                                              color={diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.secondary'}
                                            >
                                              {diff > 0 ? `+${diff}` : diff}
                                            </Typography>
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Performance Overview
                            </Typography>
                            <List dense>
                              <ListItem>
                                <ListItemText 
                                  primary="Overall Score" 
                                  secondary={peerData.overall_score} 
                                />
                                <Chip 
                                  label={`${peerData.overall_score > userData.overall_score ? '+' : ''}${peerData.overall_score - userData.overall_score}`} 
                                  color={peerData.overall_score >= userData.overall_score ? 'success' : 'error'} 
                                  size="small" 
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText 
                                  primary="Badges Earned" 
                                  secondary={peerData.badges} 
                                />
                                <Chip 
                                  label={`${peerData.badges > userData.badges ? '+' : ''}${peerData.badges - userData.badges}`} 
                                  color={peerData.badges >= userData.badges ? 'success' : 'error'} 
                                  size="small" 
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText 
                                  primary="Challenges Completed" 
                                  secondary={peerData.challenges_completed} 
                                />
                                <Chip 
                                  label={`${peerData.challenges_completed > userData.challenges_completed ? '+' : ''}${peerData.challenges_completed - userData.challenges_completed}`} 
                                  color={peerData.challenges_completed >= userData.challenges_completed ? 'success' : 'error'} 
                                  size="small" 
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText 
                                  primary="Improvement Rate" 
                                  secondary={`${peerData.improvement_rate}%`} 
                                />
                                <Chip 
                                  label={`${peerData.improvement_rate > userData.improvement_rate ? '+' : ''}${peerData.improvement_rate - userData.improvement_rate}%`} 
                                  color={peerData.improvement_rate >= userData.improvement_rate ? 'success' : 'error'} 
                                  size="small" 
                                />
                              </ListItem>
                            </List>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" gutterBottom>
                              Strengths & Areas for Improvement
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" sx={{ mb: 1 }}>Strengths:</Typography>
                                <Box>
                                  {peerData.strengths && peerData.strengths.length > 0 ? (
                                    peerData.strengths.map((strength, i) => (
                                      <Chip 
                                        key={i} 
                                        label={strength} 
                                        color="success" 
                                        size="small" 
                                        sx={{ mr: 1, mb: 1 }} 
                                      />
                                    ))
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No data available
                                    </Typography>
                                  )}
                                </Box>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" sx={{ mb: 1 }}>Areas for Improvement:</Typography>
                                <Box>
                                  {peerData.areas_for_improvement && peerData.areas_for_improvement.length > 0 ? (
                                    peerData.areas_for_improvement.map((area, i) => (
                                      <Chip 
                                        key={i} 
                                        label={area} 
                                        color="primary" 
                                        size="small" 
                                        sx={{ mr: 1, mb: 1 }} 
                                      />
                                    ))
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No data available
                                    </Typography>
                                  )}
                                </Box>
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  );
                })}
                
                {selectedPeers.length === 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom color="text.secondary">
                        No Peers Selected
                      </Typography>
                      <Typography variant="body1" paragraph>
                        Select peers from the dropdown above to see their detailed performance information.
                      </Typography>
                      <Button 
                        variant="contained" 
                        onClick={() => {
                          setSelectedPeers(availablePeers.slice(0, 2));
                        }}
                      >
                        Select Top Performers
                      </Button>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </TabPanel>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default PeerComparison;

 