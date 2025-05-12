import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, FormControl, Select, MenuItem, InputLabel, Grid,
  ToggleButtonGroup, ToggleButton, LinearProgress, CircularProgress, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`leaderboard-tabpanel-${index}`}
      aria-labelledby={`leaderboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('monthly');
  const [viewMode, setViewMode] = useState('teams');
  const [regionFilter, setRegionFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboardData, setLeaderboardData] = useState({
    teams: [],
    individuals: []
  });
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };
  
  const handleRegionFilterChange = (event) => {
    setRegionFilter(event.target.value);
  };
  
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        
        // Prepare request parameters
        const params = {
          time_range: timeRange,
          region: regionFilter !== 'all' ? regionFilter : undefined
        };
        
        // Fetch real leaderboard data from API
        const leaderboardResponse = await apiService.leaderboard.get(params);
        
        // Process the response into teams and individuals
        const data = leaderboardResponse.data || [];
        
        // The API might return different structures for teams vs individuals
        // Here we assume the API returns an array and we'll need to filter
        const teams = data.filter(item => item.type === 'team' || item.team_id == null);
        const individuals = data.filter(item => item.type === 'individual' || item.team_id != null);
        
        setLeaderboardData({
          teams,
          individuals
        });
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setError('Failed to load leaderboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboardData();
  }, [timeRange, regionFilter]);
  
  const renderTrendIcon = (trend) => {
    if (trend === 'up') {
      return <TrendingUpIcon color="success" />;
    } else if (trend === 'down') {
      return <TrendingDownIcon color="error" />;
    } else {
      return <TrendingFlatIcon color="warning" />;
    }
  };
  
  const renderRankChange = (current, previous) => {
    const change = previous - current; // negative means went down in rank (worse), positive means went up (better)
    
    if (change > 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
          <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" component="span">{`+${change}`}</Typography>
        </Box>
      );
    } else if (change < 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
          <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" component="span">{change}</Typography>
        </Box>
      );
    } else {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
          <TrendingFlatIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" component="span">0</Typography>
        </Box>
      );
    }
  };
  
  const isCurrentUser = (id) => id === user.id;
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <LeaderboardIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Leaderboard
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Compare Your Performance
        </Typography>
        <Typography variant="body2" paragraph>
          See how you and your team rank against others in the PACER sales training. Filter results by time period, region, or switch between team and individual views.
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
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
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="region-filter-label">Region</InputLabel>
              <Select
                labelId="region-filter-label"
                id="region-filter-select"
                value={regionFilter}
                label="Region"
                onChange={handleRegionFilterChange}
              >
                <MenuItem value="all">All Regions</MenuItem>
                <MenuItem value="europe">Europe</MenuItem>
                <MenuItem value="north-america">North America</MenuItem>
                <MenuItem value="asia-pacific">Asia-Pacific</MenuItem>
                <MenuItem value="global">Global</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
              size="small"
            >
              <ToggleButton value="teams" aria-label="teams view">
                <GroupsIcon sx={{ mr: 1 }} />
                Teams
              </ToggleButton>
              <ToggleButton value="individuals" aria-label="individuals view">
                <PersonIcon sx={{ mr: 1 }} />
                Individuals
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="leaderboard tabs"
            centered
          >
            <Tab 
              icon={<EmojiEventsIcon />} 
              iconPosition="start" 
              label="Top Performers" 
            />
            <Tab 
              icon={<PersonIcon />} 
              iconPosition="start" 
              label="Your Position" 
            />
          </Tabs>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              {viewMode === 'teams' ? (
                <TableContainer>
                  <Table aria-label="teams leaderboard table">
                    <TableHead>
                      <TableRow key="header">
                        <TableCell align="center">Rank</TableCell>
                        <TableCell>Team</TableCell>
                        <TableCell align="center">Region</TableCell>
                        <TableCell align="center">Score</TableCell>
                        <TableCell align="center">Challenges</TableCell>
                        <TableCell align="center">Badges</TableCell>
                        <TableCell align="center">Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaderboardData.teams.map((team) => (
                        <TableRow 
                          key={team.id} 
                          hover
                          onClick={() => navigate(`/teams/${team.id}`)}
                          sx={{ 
                            cursor: 'pointer',
                            bgcolor: team.id === user.team_id ? 'action.selected' : 'inherit'
                          }}
                        >
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography variant="h6">{team.rank}</Typography>
                              {renderRankChange(team.rank, team.previous_rank)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <GroupsIcon sx={{ mr: 2, color: 'primary.main' }} />
                              <Typography variant="body1" sx={{ fontWeight: team.id === user.team_id ? 'bold' : 'normal' }}>
                                {team.name}
                              </Typography>
                              {team.id === user.team_id && (
                                <Chip 
                                  label="Your Team" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">{team.region}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography variant="body1">{team.score}</Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={team.score} 
                                sx={{ width: '80%', mt: 0.5 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">{team.completed_challenges}</TableCell>
                          <TableCell align="center">{team.badge_count}</TableCell>
                          <TableCell align="center">{renderTrendIcon(team.trend)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <TableContainer>
                  <Table aria-label="individuals leaderboard table">
                    <TableHead>
                      <TableRow key="header">
                        <TableCell align="center">Rank</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell align="center">Team</TableCell>
                        <TableCell align="center">Region</TableCell>
                        <TableCell align="center">Score</TableCell>
                        <TableCell align="center">Badges</TableCell>
                        <TableCell align="center">Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaderboardData.individuals.map((individual) => (
                        <TableRow 
                          key={individual.id} 
                          hover
                          sx={{ 
                            cursor: 'pointer',
                            bgcolor: isCurrentUser(individual.id) ? 'action.selected' : 'inherit'
                          }}
                        >
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography variant="h6">{individual.rank}</Typography>
                              {renderRankChange(individual.rank, individual.previous_rank)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar src={individual.avatar} sx={{ mr: 2 }}>
                                {individual.name.charAt(0)}
                              </Avatar>
                              <Typography variant="body1" sx={{ fontWeight: isCurrentUser(individual.id) ? 'bold' : 'normal' }}>
                                {individual.name}
                              </Typography>
                              {isCurrentUser(individual.id) && (
                                <Chip 
                                  label="You" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={individual.team_name} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/teams/${individual.team_id}`);
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">{individual.region}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography variant="body1">{individual.score}</Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={individual.score} 
                                sx={{ width: '80%', mt: 0.5 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">{individual.badge_count}</TableCell>
                          <TableCell align="center">{renderTrendIcon(individual.trend)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {viewMode === 'teams' ? 'Your Team\'s Position' : 'Your Position'}
                </Typography>
                
                {viewMode === 'teams' ? (
                  <Box>
                    {leaderboardData.teams.find(team => team.id === user.team_id) ? (
                      <TableContainer>
                        <Table aria-label="your team position table">
                          <TableHead>
                            <TableRow key="header">
                              <TableCell align="center">Rank</TableCell>
                              <TableCell>Team</TableCell>
                              <TableCell align="center">Region</TableCell>
                              <TableCell align="center">Score</TableCell>
                              <TableCell align="center">Challenges</TableCell>
                              <TableCell align="center">Badges</TableCell>
                              <TableCell align="center">Trend</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {leaderboardData.teams
                              .filter(team => team.id === user.team_id)
                              .map((team) => (
                                <TableRow 
                                  key={team.id} 
                                  hover
                                  onClick={() => navigate(`/teams/${team.id}`)}
                                  sx={{ cursor: 'pointer', bgcolor: 'action.selected' }}
                                >
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <Typography variant="h6">{team.rank}</Typography>
                                      {renderRankChange(team.rank, team.previous_rank)}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <GroupsIcon sx={{ mr: 2, color: 'primary.main' }} />
                                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {team.name}
                                      </Typography>
                                      <Chip 
                                        label="Your Team" 
                                        size="small" 
                                        color="primary" 
                                        sx={{ ml: 1 }}
                                      />
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">{team.region}</TableCell>
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <Typography variant="body1">{team.score}</Typography>
                                      <LinearProgress 
                                        variant="determinate" 
                                        value={team.score} 
                                        sx={{ width: '80%', mt: 0.5 }}
                                      />
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">{team.completed_challenges}</TableCell>
                                  <TableCell align="center">{team.badge_count}</TableCell>
                                  <TableCell align="center">{renderTrendIcon(team.trend)}</TableCell>
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        You are not currently part of any team. Join a team to see their ranking on the leaderboard.
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box>
                    {leaderboardData.individuals.find(ind => ind.id === user.id) ? (
                      <TableContainer>
                        <Table aria-label="your position table">
                          <TableHead>
                            <TableRow key="header">
                              <TableCell align="center">Rank</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell align="center">Team</TableCell>
                              <TableCell align="center">Region</TableCell>
                              <TableCell align="center">Score</TableCell>
                              <TableCell align="center">Badges</TableCell>
                              <TableCell align="center">Trend</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {leaderboardData.individuals
                              .filter(ind => ind.id === user.id)
                              .map((individual) => (
                                <TableRow 
                                  key={individual.id} 
                                  hover
                                  sx={{ cursor: 'pointer', bgcolor: 'action.selected' }}
                                >
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <Typography variant="h6">{individual.rank}</Typography>
                                      {renderRankChange(individual.rank, individual.previous_rank)}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Avatar src={individual.avatar} sx={{ mr: 2 }}>
                                        {individual.name.charAt(0)}
                                      </Avatar>
                                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {individual.name}
                                      </Typography>
                                      <Chip 
                                        label="You" 
                                        size="small" 
                                        color="primary" 
                                        sx={{ ml: 1 }}
                                      />
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      label={individual.team_name} 
                                      size="small" 
                                      color="primary" 
                                      variant="outlined"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/teams/${individual.team_id}`);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">{individual.region}</TableCell>
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <Typography variant="body1">{individual.score}</Typography>
                                      <LinearProgress 
                                        variant="determinate" 
                                        value={individual.score} 
                                        sx={{ width: '80%', mt: 0.5 }}
                                      />
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">{individual.badge_count}</TableCell>
                                  <TableCell align="center">{renderTrendIcon(individual.trend)}</TableCell>
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        You don't appear on the leaderboard yet. Complete more practice sessions to earn a ranking.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </TabPanel>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Leaderboard; 