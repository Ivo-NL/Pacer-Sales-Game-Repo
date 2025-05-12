import React, { useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Grid, Card, CardContent,
  Tabs, Tab, Divider, FormControl, InputLabel, Select, MenuItem,
  LinearProgress, List, ListItem, ListItemText, ListItemAvatar, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { useAuth } from '../context/AuthContext';

const TeamPerformance = ({ teamId, teamData, teamMembers, loading, error }) => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('all');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  // Function to get trend indicator
  const getTrendIndicator = (trend) => {
    if (trend > 0) {
      return <TrendingUpIcon sx={{ color: 'success.main', fontSize: '1rem' }} />;
    } else if (trend < 0) {
      return <TrendingDownIcon sx={{ color: 'error.main', fontSize: '1rem' }} />;
    }
    return <RemoveIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />;
  };

  // Function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

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

  // Mock team performance data (in a real app, this would come from the API)
  const mockTeamPerformance = {
    metrics: {
      overall_score: { value: 72, trend: 3.5 },
      completion_rate: { value: 85, trend: 2.1 },
      sessions_completed: { value: 87, trend: 12 },
      avg_time_per_session: { value: "18:42", trend: -1.2 }
    },
    pacer_breakdown: {
      P: { score: 76, trend: 4.3 },
      A: { score: 68, trend: 2.7 },
      C: { score: 62, trend: 5.9 },
      E: { score: 59, trend: 2.0 },
      R: { score: 54, trend: 1.5 }
    },
    skill_gaps: [
      { skill: "Competitive Differentiation", score: 52, pacer_stage: "C" },
      { skill: "Deal Structuring", score: 54, pacer_stage: "E" },
      { skill: "Stakeholder Mapping", score: 55, pacer_stage: "A" }
    ],
    top_skills: [
      { skill: "Lead Qualification", score: 81, pacer_stage: "P" },
      { skill: "Value Proposition", score: 79, pacer_stage: "P" },
      { skill: "Relationship Building", score: 76, pacer_stage: "R" }
    ],
    member_performance: teamMembers ? teamMembers.map(member => ({
      user_id: member.user_id,
      name: member.user?.username || 'Unknown User',
      score: Math.floor(Math.random() * 30) + 60, // Random score between 60-90
      sessions: Math.floor(Math.random() * 10) + 3, // Random sessions between 3-12
      top_skill: ["Prospecting", "Assessment", "Challenge", "Execution", "Retention"][Math.floor(Math.random() * 5)]
    })).sort((a, b) => b.score - a.score) : []
  };

  const teamPerformance = mockTeamPerformance;

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5">
            Team Performance
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
      
      {/* Team Metrics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Team Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h4" component="div">
                  {teamPerformance.metrics.overall_score.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  / 100
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(teamPerformance.metrics.overall_score.trend)}
                  <Typography 
                    variant="body2" 
                    color={teamPerformance.metrics.overall_score.trend > 0 ? 'success.main' : teamPerformance.metrics.overall_score.trend < 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(teamPerformance.metrics.overall_score.trend)}%
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
                  {teamPerformance.metrics.completion_rate.value}%
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(teamPerformance.metrics.completion_rate.trend)}
                  <Typography 
                    variant="body2" 
                    color={teamPerformance.metrics.completion_rate.trend > 0 ? 'success.main' : teamPerformance.metrics.completion_rate.trend < 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(teamPerformance.metrics.completion_rate.trend)}%
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
                Sessions Completed
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h4" component="div">
                  {teamPerformance.metrics.sessions_completed.value}
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(teamPerformance.metrics.sessions_completed.trend)}
                  <Typography 
                    variant="body2" 
                    color={teamPerformance.metrics.sessions_completed.trend > 0 ? 'success.main' : teamPerformance.metrics.sessions_completed.trend < 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(teamPerformance.metrics.sessions_completed.trend)}
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
                Avg. Time per Session
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                <Typography variant="h4" component="div">
                  {teamPerformance.metrics.avg_time_per_session.value}
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  {getTrendIndicator(teamPerformance.metrics.avg_time_per_session.trend)}
                  <Typography 
                    variant="body2" 
                    color={teamPerformance.metrics.avg_time_per_session.trend < 0 ? 'success.main' : teamPerformance.metrics.avg_time_per_session.trend > 0 ? 'error.main' : 'text.secondary'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(teamPerformance.metrics.avg_time_per_session.trend)}%
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
            aria-label="team performance tabs"
          >
            <Tab label="PACER Breakdown" id="tab-0" />
            <Tab label="Member Performance" id="tab-1" />
            <Tab label="Skill Analysis" id="tab-2" />
          </Tabs>
        </Box>
        
        {/* PACER Breakdown Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="subtitle1" gutterBottom>
            PACER Stage Performance
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 3 }}>
                {Object.entries(teamPerformance.pacer_breakdown).map(([stage, data]) => (
                  <Box key={stage} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body1">
                        {getPacerStageName(stage)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {data.score}/100
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          {getTrendIndicator(data.trend)}
                          <Typography 
                            variant="body2" 
                            color={data.trend > 0 ? 'success.main' : data.trend < 0 ? 'error.main' : 'text.secondary'}
                            sx={{ ml: 0.5 }}
                          >
                            {Math.abs(data.trend)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={data.score} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                          bgcolor: getScoreColor(data.score)
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Team Strengths
                  </Typography>
                  <List dense>
                    {teamPerformance.top_skills.map((skill, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getScoreColor(skill.score) }}>
                            {skill.pacer_stage}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={skill.skill}
                          secondary={`${getPacerStageName(skill.pacer_stage)} - ${skill.score}/100`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Improvement Areas
                  </Typography>
                  <List dense>
                    {teamPerformance.skill_gaps.map((skill, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getScoreColor(skill.score) }}>
                            {skill.pacer_stage}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={skill.skill}
                          secondary={`${getPacerStageName(skill.pacer_stage)} - ${skill.score}/100`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Member Performance Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell align="center">Overall Score</TableCell>
                  <TableCell align="center">Sessions Completed</TableCell>
                  <TableCell>Top Skill</TableCell>
                  <TableCell align="center">Relative Performance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamPerformance.member_performance.map((member, index) => (
                  <TableRow key={member.user_id} sx={{ bgcolor: member.user_id === user.id ? 'rgba(0, 0, 0, 0.04)' : 'inherit' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2">
                          {member.name} {member.user_id === user.id && '(You)'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {member.score}
                        </Typography>
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: getScoreColor(member.score),
                            ml: 1
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {member.sessions}
                    </TableCell>
                    <TableCell>
                      {member.top_skill}
                    </TableCell>
                    <TableCell align="center">
                      <LinearProgress 
                        variant="determinate" 
                        value={member.score} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          width: '100%',
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: getScoreColor(member.score)
                          }
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        
        {/* Skill Analysis Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Skill Distribution
                  </Typography>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Skill distribution chart will be displayed here, showing the distribution of skills across the team.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Comparative Analysis
                  </Typography>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Comparative analysis chart will be displayed here, comparing this team's performance against other teams.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Recommendations for Team Improvement
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Focus on Competitive Differentiation"
                        secondary="Team members should practice scenarios that emphasize differentiation from competitors, particularly in the Challenge stage."
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Improve Deal Structuring Skills"
                        secondary="Arrange training sessions focused on structuring complex deals, leveraging the experience of top performers in this area."
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Enhance Stakeholder Mapping"
                        secondary="Practice multi-stakeholder scenarios to improve the team's ability to navigate complex organizational structures."
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
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
      id={`team-performance-tabpanel-${index}`}
      aria-labelledby={`team-performance-tab-${index}`}
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

export default TeamPerformance; 