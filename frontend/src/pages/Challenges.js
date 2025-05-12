import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Tabs, Tab, Paper, 
  CircularProgress, Alert, Button, IconButton, Tooltip, AlertTitle 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import TeamChallengesList from '../components/TeamChallengesList';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const Challenges = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [allChallenges, setAllChallenges] = useState([]);
  const [teamData, setTeamData] = useState([]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchData = async () => {
    setLoading(true);
    console.log('Fetching team and challenge data...');
    try {
      // Fetch user's teams
      const teamsResponse = await apiService.teams.getAll();
      const teams = teamsResponse.data;
      console.log('Teams fetched:', teams);
      setTeamData(teams);
      
      // Fetch challenges for all teams the user is a member of
      let allTeamChallenges = [];
      
      for (const team of teams) {
        try {
          console.log(`Fetching challenges for team ${team.id}...`);
          const challengesResponse = await apiService.teams.getChallenges(team.id);
          console.log(`Challenges for team ${team.id}:`, challengesResponse.data);
          
          const challenges = challengesResponse.data.map(challenge => ({
            ...challenge,
            teamName: team.name,
            teamId: team.id
          }));
          allTeamChallenges = [...allTeamChallenges, ...challenges];
        } catch (err) {
          console.error(`Error fetching challenges for team ${team.id}:`, err);
        }
      }
      
      console.log('All challenges combined:', allTeamChallenges);
      setAllChallenges(allTeamChallenges);

      // Only if we received actual data but it was empty, then show a console message
      if (allTeamChallenges.length === 0 && teams.length > 0) {
        console.log("No challenges found for the user's teams");
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load challenges. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  // Only use mock data if no real data is available and no API request is in progress
  useEffect(() => {
    // Only apply mock data if:
    // 1. We're not currently loading
    // 2. We have no real challenges after trying to load them
    // 3. We have no teamData OR we have teamData but no challenges were found
    if (!loading && allChallenges.length === 0) {
      console.log("No real data available, using mock data for demonstration purposes");
      
      // Mock data for challenges
      const mockChallenges = [
        {
          id: 1,
          title: 'PACER Mastery Challenge',
          description: 'Complete 3 sales scenarios with a score of 90% or higher',
          status: 'active',
          teamName: 'Sales Team Alpha (Demo)',
          teamId: 1,
          created_at: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          participants: [
            { id: 1, username: 'john.doe', avatar: null },
            { id: 2, username: 'jane.smith', avatar: null },
          ],
          progress: 65,
          points: 500,
          is_demo: true // Mark as demo data
        },
        {
          id: 2,
          title: 'Client Rapport Challenge',
          description: 'Achieve high rapport scores across 5 different client personalities',
          status: 'upcoming',
          teamName: 'Sales Team Beta (Demo)',
          teamId: 2,
          created_at: new Date().toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          participants: [
            { id: 1, username: 'john.doe', avatar: null },
            { id: 3, username: 'bob.johnson', avatar: null },
          ],
          progress: 0,
          points: 750,
          is_demo: true // Mark as demo data
        },
        {
          id: 3,
          title: 'Deal Closing Marathon',
          description: 'Close 10 deals with at least 85% satisfaction rate',
          status: 'completed',
          teamName: 'Sales Team Alpha (Demo)',
          teamId: 1,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          participants: [
            { id: 1, username: 'john.doe', avatar: null },
            { id: 2, username: 'jane.smith', avatar: null },
            { id: 3, username: 'bob.johnson', avatar: null },
          ],
          progress: 100,
          points: 1000,
          is_demo: true // Mark as demo data
        }
      ];
      
      setAllChallenges(mockChallenges);
      
      if (teamData.length === 0) {
        setTeamData([
          { id: 1, name: 'Sales Team Alpha (Demo)', members: [], is_demo: true },
          { id: 2, name: 'Sales Team Beta (Demo)', members: [], is_demo: true }
        ]);
      }
    }
  }, [allChallenges.length, loading, teamData]);

  // Filter challenges by team if a specific tab is selected
  const getTeamChallenges = (teamId) => {
    if (!teamId) return allChallenges;
    return allChallenges.filter(challenge => challenge.teamId === teamId);
  };

  // Get the current team based on tab selection
  const getCurrentTeam = () => {
    if (tabValue === 0) return null;
    return teamData[tabValue - 1] || null;
  };

  const refreshChallenges = () => {
    setLoading(true);
    // In a real implementation, this would re-fetch challenges from the API
    fetchData();
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Team Challenges
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Collaborate with your team members to complete challenges and earn rewards. Track your progress and compete with other teams.
          </Typography>
        </Box>
        <Tooltip title="Refresh challenges">
          <IconButton 
            color="primary" 
            onClick={refreshChallenges}
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : (
        <>
          {teamData.length === 0 ? (
            // No teams case
            <Box sx={{ textAlign: 'center', my: 4, p: 4, border: '1px dashed #ccc', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                You're not a member of any team yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                You need to join or create a team before you can participate in challenges.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/teams')}
                sx={{ mt: 2 }}
              >
                Join or Create a Team
              </Button>
            </Box>
          ) : teamData.every(team => team.is_demo) ? (
            // Only demo teams case
            <>
              <Alert severity="info" sx={{ mb: 4 }}>
                <AlertTitle>Demo Mode</AlertTitle>
                You're currently viewing demo teams and challenges. To create real challenges, you need to first join or create a real team.
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate('/teams')}
                  sx={{ ml: 2, mt: 1 }}
                >
                  Go to Teams
                </Button>
              </Alert>
              
              <Paper sx={{ mb: 4 }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="All Challenges" />
                  {teamData.map((team) => (
                    <Tab key={team.id} label={team.name} />
                  ))}
                </Tabs>
              </Paper>

              <TeamChallengesList
                teamId={getCurrentTeam()?.id}
                challenges={getTeamChallenges(getCurrentTeam()?.id)}
                teamMembers={getCurrentTeam()?.members || []}
                loading={loading}
                error={error}
                refreshChallenges={refreshChallenges}
              />
            </>
          ) : (
            // Normal case with real teams
            <>
              <Paper sx={{ mb: 4 }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="All Challenges" />
                  {teamData.map((team) => (
                    <Tab key={team.id} label={team.name} />
                  ))}
                </Tabs>
              </Paper>

              <TeamChallengesList
                teamId={getCurrentTeam()?.id}
                challenges={getTeamChallenges(getCurrentTeam()?.id)}
                teamMembers={getCurrentTeam()?.members || []}
                loading={loading}
                error={error}
                refreshChallenges={refreshChallenges}
              />
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default Challenges; 