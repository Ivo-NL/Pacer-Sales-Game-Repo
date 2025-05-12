import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Paper, Button, Divider, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GroupsIcon from '@mui/icons-material/Groups';
import { useAuth } from '../context/AuthContext';
import TeamsList from '../components/TeamsList';
import apiService from '../services/api';

const Teams = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [userTeams, setUserTeams] = useState([]);
  
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        
        // Fetch real teams data from API
        const teamsResponse = await apiService.teams.getAll();
        
        // In a real scenario, we would also fetch user's team memberships
        // For now, we'll filter the teams to identify user teams based on user ID
        // In a production environment, the API might have a dedicated endpoint for this
        
        // Set teams from API response
        const allTeams = teamsResponse.data || [];
        
        // Find user's teams (this is a simplified approach - in reality, you'd have a proper userTeams endpoint)
        const userTeamsData = allTeams.filter(team => 
          team.members && team.members.some(member => member.id === user.id)
        );
        
        setTeams(allTeams);
        setUserTeams(userTeamsData);
      } catch (err) {
        console.error('Error fetching teams data:', err);
        setError('Failed to load teams data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [user.id]);

  const handleViewTeam = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <GroupsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Teams
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Team Collaboration
            </Typography>
            <Typography variant="body1" paragraph>
              Teams allow you to collaborate with colleagues, participate in challenges, and benchmark your performance. 
              Join existing teams or create your own to start improving your PACER sales methodology skills together.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/leaderboard')}
              >
                View Leaderboard
              </Button>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => navigate('/challenges')}
              >
                Browse All Challenges
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TeamsList 
              teams={teams} 
              userTeams={userTeams}
              onViewTeam={handleViewTeam}
            />
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Teams; 