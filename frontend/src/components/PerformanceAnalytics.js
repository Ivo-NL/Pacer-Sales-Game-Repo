import React, { useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Grid,
  Card, CardContent, Tabs, Tab, Divider, Select,
  MenuItem, FormControl, InputLabel, LinearProgress,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

const PerformanceAnalytics = ({ performance, loading, error }) => {
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('all');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ my: 2 }}>
        <Typography color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!performance || Object.keys(performance).length === 0) {
    return (
      <Box sx={{ my: 2 }}>
        <Typography>
          Complete more scenarios to view your performance analytics.
        </Typography>
      </Box>
    );
  }

  // Function to get trend indicator
  const getTrendIndicator = (trend) => {
    if (trend > 0) {
      return <TrendingUpIcon sx={{ color: 'success.main', fontSize: '1rem' }} />;
    } else if (trend < 0) {
      return <TrendingDownIcon sx={{ color: 'error.main', fontSize: '1rem' }} />;
    }
    return <RemoveIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />;
  };

  // Generate mock data for the component
  const getMetricData = () => {
    const metrics = performance.metrics || {
      methodology_score: { value: 75, trend: 2.5 },
      rapport_score: { value: 82, trend: -1.2 },
      progress_score: { value: 68, trend: 5.3 },
      outcome_score: { value: 77, trend: 1.8 },
      total_score: { value: 75.5, trend: 2.1 },
      total_sessions: { value: 12, trend: 0 },
      completion_rate: { value: 88, trend: 3.7 }
    };
    
    return metrics;
  };

  // Generate recent sessions table data
  const getRecentSessions = () => {
    return performance.recent_sessions || [];
  };

  // Get skill breakdown data
  const getSkillBreakdown = () => {
    return performance.skill_breakdown || {};
  };

  // Get performance by category data
  const getCategoryPerformance = () => {
    return performance.category_performance || {};
  };

  const metrics = getMetricData();
  const recentSessions = getRecentSessions();
  const skillBreakdown = getSkillBreakdown();
  const categoryPerformance = getCategoryPerformance();

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5">
            Performance Analytics
          </Typography>
        </Box>
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            id="time-range-select"
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
            size="small"
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="3months">Last 3 Months</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Overall Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h4" component="div">
                  {metrics.total_score.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  / 100
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(metrics.total_score.trend)}
                  <Typography 
                    variant="body2" 
                    color={metrics.total_score.trend > 0 ? 'success.main' : metrics.total_score.trend < 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(metrics.total_score.trend)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Methodology Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h4" component="div">
                  {metrics.methodology_score.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  / 100
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(metrics.methodology_score.trend)}
                  <Typography 
                    variant="body2" 
                    color={metrics.methodology_score.trend > 0 ? 'success.main' : metrics.methodology_score.trend < 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(metrics.methodology_score.trend)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Scenarios Completed
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h4" component="div">
                  {metrics.total_sessions.value}
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(metrics.total_sessions.trend)}
                  <Typography 
                    variant="body2" 
                    color={metrics.total_sessions.trend > 0 ? 'success.main' : metrics.total_sessions.trend < 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {metrics.total_sessions.trend === 0 ? '-' : `${Math.abs(metrics.total_sessions.trend)}`}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Completion Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h4" component="div">
                  {metrics.completion_rate.value}%
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(metrics.completion_rate.trend)}
                  <Typography 
                    variant="body2" 
                    color={metrics.completion_rate.trend > 0 ? 'success.main' : metrics.completion_rate.trend < 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(metrics.completion_rate.trend)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tabs for different views */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="performance analytics tabs"
          >
            <Tab label="PACER Breakdown" id="tab-0" />
            <Tab label="Recent Sessions" id="tab-1" />
            <Tab label="Skill Progress" id="tab-2" />
          </Tabs>
        </Box>
        
        {/* PACER Breakdown Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  PACER Stage Performance
                </Typography>
                
                <Box>
                  {Object.entries(skillBreakdown).map(([stage, { score, name }]) => (
                    <Box key={stage} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {name}
                        </Typography>
                        <Typography variant="body2">
                          {score}/100
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={score} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: getScoreColor(score)
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Score Components
                </Typography>
                
                <Box>
                  {[
                    { name: 'Methodology', score: metrics.methodology_score.value, tooltip: 'How well you apply the PACER methodology principles' },
                    { name: 'Rapport', score: metrics.rapport_score.value, tooltip: 'How effectively you build relationships with clients' },
                    { name: 'Progress', score: metrics.progress_score.value, tooltip: 'How efficiently you advance the sales cycle' },
                    { name: 'Outcome', score: metrics.outcome_score.value, tooltip: 'The business results of your sales interactions' }
                  ].map((component) => (
                    <Box key={component.name} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {component.name}
                          </Typography>
                          <Tooltip title={component.tooltip} placement="top">
                            <IconButton size="small">
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Typography variant="body2">
                          {component.score}/100
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={component.score} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: getScoreColor(component.score)
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Performance by Context
                </Typography>
                
                <Box>
                  {Object.entries(categoryPerformance).map(([category, { name, score }]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {name}
                        </Typography>
                        <Typography variant="body2">
                          {score}/100
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={score} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: getScoreColor(score)
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Recent Sessions Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Scenario</TableCell>
                  <TableCell>PACER Stage</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {new Date(session.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {session.scenario_title}
                    </TableCell>
                    <TableCell>
                      {getPacerStageName(session.pacer_stage)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {session.score}
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: getScoreColor(session.score),
                            ml: 1
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {session.is_completed ? 'Completed' : 'In Progress'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {recentSessions.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No recent sessions found.
              </Typography>
            </Box>
          )}
        </TabPanel>
        
        {/* Skill Progress Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Skill Growth Over Time
              </Typography>
              
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Detailed skill growth charts will be shown here, tracking your progress in each PACER competency area over time.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>
    </Paper>
  );
};

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
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

// Function to get PACER stage name
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

// Function to get color based on score
const getScoreColor = (score) => {
  if (score >= 80) return '#4caf50';
  if (score >= 60) return '#ff9800';
  return '#f44336';
};

export default PerformanceAnalytics; 