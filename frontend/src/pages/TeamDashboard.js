import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Tab, Tabs, Button, Alert, Breadcrumbs, Link } from '@mui/material';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import GroupIcon from '@mui/icons-material/Group';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

// Import components
import TeamPerformance from '../components/TeamPerformance';
import TeamChallengesList from '../components/TeamChallengesList';

const TeamDashboard = () => {
  const { teamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for each component's data
  const [teamData, setTeamData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [challenges, setChallenges] = useState([]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, we would make actual API calls
        // For now, we'll use mock data for development
        
        // Mock API calls:
        // const teamResponse = await apiService.teams.getTeamById(teamId);
        // const challengesResponse = await apiService.teams.getChallenges(teamId);
        
        // Create mock team data
        const mockTeam = {
          id: parseInt(teamId),
          name: "Sales Champions",
          region: "Europe",
          description: "A team of top sales professionals focused on European financial institutions.",
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          manager_id: 1
        };
        
        // Create mock team members
        const mockMembers = [
          {
            id: 1,
            team_id: parseInt(teamId),
            user_id: user.id, // Current user
            joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            user: {
              id: user.id,
              username: user.username,
              email: user.email
            }
          },
          {
            id: 2,
            team_id: parseInt(teamId),
            user_id: 2,
            joined_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 2,
              username: "john.doe",
              email: "john.doe@example.com"
            }
          },
          {
            id: 3,
            team_id: parseInt(teamId),
            user_id: 3,
            joined_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 3,
              username: "emma.smith",
              email: "emma.smith@example.com"
            }
          }
        ];
        
        // Create mock challenges
        const mockChallenges = [
          {
            id: 1,
            team_id: parseInt(teamId),
            title: "Digital Transformation Challenge",
            description: "Complete scenarios focused on selling digital payment solutions to traditional banks",
            pacer_focus: "C",
            target_score: 80,
            start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            is_active: true,
            created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            results: [
              {
                id: 1,
                challenge_id: 1,
                user_id: user.id,
                score: 75,
                completed_sessions: 3,
                completed_at: null,
                user: {
                  id: user.id,
                  username: user.username
                }
              },
              {
                id: 2,
                challenge_id: 1,
                user_id: 2,
                score: 82,
                completed_sessions: 4,
                completed_at: null,
                user: {
                  id: 2,
                  username: "john.doe"
                }
              },
              {
                id: 3,
                challenge_id: 1,
                user_id: 3,
                score: 68,
                completed_sessions: 2,
                completed_at: null,
                user: {
                  id: 3,
                  username: "emma.smith"
                }
              }
            ]
          },
          {
            id: 2,
            team_id: parseInt(teamId),
            title: "Prospecting Excellence",
            description: "Focus on improving prospecting techniques for new clients in the banking sector",
            pacer_focus: "P",
            target_score: 75,
            start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
            end_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(), // 16 days from now
            is_active: true,
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            results: [
              {
                id: 4,
                challenge_id: 2,
                user_id: user.id,
                score: 65,
                completed_sessions: 2,
                completed_at: null,
                user: {
                  id: user.id,
                  username: user.username
                }
              },
              {
                id: 5,
                challenge_id: 2,
                user_id: 2,
                score: 70,
                completed_sessions: 3,
                completed_at: null,
                user: {
                  id: 2,
                  username: "john.doe"
                }
              }
            ]
          },
          {
            id: 3,
            team_id: parseInt(teamId),
            title: "Competitive Positioning",
            description: "Practice differentiating My Company solutions from competitors",
            pacer_focus: "C",
            target_score: 85,
            start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
            is_active: true,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            results: []
          },
          {
            id: 4,
            team_id: parseInt(teamId),
            title: "Retention Mastery",
            description: "Focus on customer retention and relationship building",
            pacer_focus: "R",
            target_score: 80,
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
            end_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
            is_active: false,
            created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
            results: [
              {
                id: 6,
                challenge_id: 4,
                user_id: user.id,
                score: 78,
                completed_sessions: 4,
                completed_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                user: {
                  id: user.id,
                  username: user.username
                }
              },
              {
                id: 7,
                challenge_id: 4,
                user_id: 2,
                score: 85,
                completed_sessions: 5,
                completed_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
                user: {
                  id: 2,
                  username: "john.doe"
                }
              },
              {
                id: 8,
                challenge_id: 4,
                user_id: 3,
                score: 82,
                completed_sessions: 4,
                completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                user: {
                  id: 3,
                  username: "emma.smith"
                }
              }
            ]
          }
        ];
        
        // Set state with mock data
        setTeamData(mockTeam);
        setTeamMembers(mockMembers);
        setChallenges(mockChallenges);
        
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeamData();
  }, [teamId, user.id, user.username]);

  const refreshChallenges = () => {
    // In a real implementation, this would refresh challenges from the API
    console.log("Refreshing challenges");
  };

  const isTeamManager = teamData && teamData.manager_id === user.id;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/teams" color="inherit">
          Teams
        </Link>
        <Typography color="text.primary">
          {teamData ? teamData.name : `Team ${teamId}`}
        </Typography>
      </Breadcrumbs>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <GroupIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          {teamData ? teamData.name : `Team ${teamId}`}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {teamData && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1">
            {teamData.description}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Region: {teamData.region} • Members: {teamMembers.length} • {isTeamManager ? 'You are the manager' : ''}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ width: '100%', mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="team dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Team Performance" id="tab-0" />
            <Tab label="Challenges" id="tab-1" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <TeamPerformance 
            teamId={teamId}
            teamData={teamData}
            teamMembers={teamMembers}
            loading={loading}
            error={error}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <TeamChallengesList 
            teamId={teamId}
            challenges={challenges}
            teamMembers={teamMembers}
            loading={loading}
            error={error}
            refreshChallenges={refreshChallenges}
          />
        </TabPanel>
      </Box>
    </Container>
  );
};

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`team-dashboard-tabpanel-${index}`}
      aria-labelledby={`team-dashboard-tab-${index}`}
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

export default TeamDashboard; 