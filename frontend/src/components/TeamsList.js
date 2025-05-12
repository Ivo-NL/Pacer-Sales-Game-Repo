import React, { useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Grid, Card, CardContent,
  CardActionArea, Button, Chip, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, List, ListItem, ListItemText,
  ListItemAvatar, ListItemButton, ListItemSecondaryAction, IconButton,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert, Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GroupIcon from '@mui/icons-material/Group';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

const TeamsList = ({ teams, loading, error, refreshTeams }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    region: 'Global',
    description: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Handle open join dialog
  const handleOpenJoinDialog = () => {
    setJoinDialogOpen(true);
  };

  // Handle close join dialog
  const handleCloseJoinDialog = () => {
    setJoinDialogOpen(false);
  };

  // Handle open create dialog
  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  // Handle close create dialog
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateFormData({
      name: '',
      region: 'Global',
      description: ''
    });
  };

  // Handle create form change
  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle create team
  const handleCreateTeam = async () => {
    try {
      setActionLoading(true);
      
      // In a real implementation, call API to create team
      // For now, mock successful creation
      
      // const response = await apiService.teams.createTeam({
      //   ...createFormData,
      //   manager_id: user.id
      // });

      // Mock successful response
      setTimeout(() => {
        handleCloseCreateDialog();
        setSnackbar({
          open: true,
          message: 'Team created successfully!',
          severity: 'success'
        });
        
        // Refresh teams list
        if (refreshTeams) refreshTeams();
        
        setActionLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error creating team:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create team. Please try again.',
        severity: 'error'
      });
      setActionLoading(false);
    }
  };

  // Handle join team
  const handleJoinTeam = async (teamId) => {
    try {
      setActionLoading(true);
      
      // In a real implementation, call API to join team
      // For now, mock successful join
      
      // const response = await apiService.teams.addTeamMember(teamId, {
      //   team_id: teamId,
      //   user_id: user.id
      // });

      // Mock successful response
      setTimeout(() => {
        handleCloseJoinDialog();
        setSnackbar({
          open: true,
          message: 'Successfully joined team!',
          severity: 'success'
        });
        
        // Refresh teams list
        if (refreshTeams) refreshTeams();
        
        setActionLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error joining team:', error);
      setSnackbar({
        open: true,
        message: 'Failed to join team. Please try again.',
        severity: 'error'
      });
      setActionLoading(false);
    }
  };

  // Handle leave team
  const handleLeaveTeam = async (teamId) => {
    try {
      setActionLoading(true);
      
      // In a real implementation, call API to leave team
      // For now, mock successful leave
      
      // const response = await apiService.teams.removeTeamMember(teamId, user.id);

      // Mock successful response
      setTimeout(() => {
        setSnackbar({
          open: true,
          message: 'Successfully left team!',
          severity: 'success'
        });
        
        // Refresh teams list
        if (refreshTeams) refreshTeams();
        
        setActionLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error leaving team:', error);
      setSnackbar({
        open: true,
        message: 'Failed to leave team. Please try again.',
        severity: 'error'
      });
      setActionLoading(false);
    }
  };

  // Handle team details
  const handleOpenTeamDetails = (team) => {
    setSelectedTeam(team);
    setDetailsDialogOpen(true);
  };

  // Handle close team details
  const handleCloseTeamDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedTeam(null);
  };

  // Handle view team
  const handleViewTeam = (teamId) => {
    navigate(`/teams/${teamId}`);
  };

  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  // Helper to check if user is a member of a team
  const isTeamMember = (team) => {
    return team.members && team.members.some(member => member.user_id === user.id);
  };

  // Helper to check if user is the manager of a team
  const isTeamManager = (team) => {
    return team.manager_id === user.id;
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

  // Get user's teams
  const userTeams = teams ? teams.filter(team => isTeamMember(team)) : [];
  
  // Get teams user is not a member of
  const otherTeams = teams ? teams.filter(team => !isTeamMember(team)) : [];

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5">
            Teams
          </Typography>
        </Box>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<GroupAddIcon />}
            onClick={handleOpenJoinDialog}
            sx={{ mr: 1 }}
          >
            Join Team
          </Button>
          {user && user.is_manager && (
            <Button 
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create Team
            </Button>
          )}
        </Box>
      </Box>
      
      {/* User's Teams Section */}
      <Typography variant="h6" gutterBottom>
        My Teams
      </Typography>
      
      {userTeams.length > 0 ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {userTeams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <Card>
                <CardActionArea onClick={() => handleOpenTeamDetails(team)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                        {team.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="h6" noWrap>
                        {team.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {team.description || 'No description provided.'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip 
                        label={team.region} 
                        size="small" 
                        variant="outlined"
                      />
                      
                      <Box>
                        {isTeamManager(team) && (
                          <Chip
                            label="Manager"
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        )}
                        <Chip
                          label={`${team.members ? team.members.length : 0} Members`}
                          size="small"
                          color="default"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ py: 2, mb: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            You are not a member of any team yet. Join a team to collaborate with others!
          </Typography>
        </Box>
      )}
      
      {/* Available Teams Section */}
      <Typography variant="h6" gutterBottom>
        Available Teams
      </Typography>
      
      {otherTeams.length > 0 ? (
        <Grid container spacing={2}>
          {otherTeams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: 'grey.400', mr: 1 }}>
                      {team.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6" noWrap>
                      {team.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {team.description || 'No description provided.'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Chip 
                      label={team.region} 
                      size="small" 
                      variant="outlined"
                    />
                    
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<GroupAddIcon />}
                      onClick={() => handleJoinTeam(team.id)}
                    >
                      Join
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No other teams available at the moment.
          </Typography>
        </Box>
      )}
      
      {/* Join Team Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={handleCloseJoinDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Join a Team</DialogTitle>
        <DialogContent>
          <List>
            {otherTeams.map((team) => (
              <ListItem key={team.id} disablePadding>
                <ListItemButton onClick={() => handleJoinTeam(team.id)} disabled={actionLoading}>
                  <ListItemAvatar>
                    <Avatar>
                      {team.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={team.name} 
                    secondary={`${team.region} • ${team.members ? team.members.length : 0} Members`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {otherTeams.length === 0 && (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No teams available to join at the moment.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseJoinDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
      
      {/* Create Team Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create a New Team</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Team Name"
              name="name"
              value={createFormData.name}
              onChange={handleCreateFormChange}
              margin="normal"
              required
              disabled={actionLoading}
            />
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="team-region-label">Region</InputLabel>
              <Select
                labelId="team-region-label"
                name="region"
                value={createFormData.region}
                label="Region"
                onChange={handleCreateFormChange}
                disabled={actionLoading}
              >
                <MenuItem value="Global">Global</MenuItem>
                <MenuItem value="Europe">Europe</MenuItem>
                <MenuItem value="North America">North America</MenuItem>
                <MenuItem value="APAC">APAC</MenuItem>
                <MenuItem value="LATAM">LATAM</MenuItem>
                <MenuItem value="MEA">Middle East & Africa</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={createFormData.description}
              onChange={handleCreateFormChange}
              margin="normal"
              multiline
              rows={3}
              disabled={actionLoading}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog} disabled={actionLoading}>Cancel</Button>
          <Button 
            onClick={handleCreateTeam} 
            variant="contained"
            disabled={actionLoading || !createFormData.name || !createFormData.region}
          >
            {actionLoading ? 'Creating...' : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Team Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseTeamDetails}
        maxWidth="sm"
        fullWidth
      >
        {selectedTeam && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                  {selectedTeam.name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h6">
                  {selectedTeam.name}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedTeam.description || 'No description provided.'}
              </Typography>
              
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Chip 
                  label={`Region: ${selectedTeam.region}`} 
                  size="small" 
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                {isTeamManager(selectedTeam) && (
                  <Chip
                    label="You are the manager"
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                Team Members ({selectedTeam.members ? selectedTeam.members.length : 0})
              </Typography>
              
              <List>
                {selectedTeam.members && selectedTeam.members.map((member) => (
                  <ListItem key={member.id}>
                    <ListItemAvatar>
                      <Avatar>
                        {member.user?.username?.charAt(0).toUpperCase() || 'U'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={member.user?.username || 'Unknown User'} 
                      secondary={member.user_id === selectedTeam.manager_id ? 'Team Manager' : 'Member'}
                    />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseTeamDetails}>Close</Button>
              {isTeamMember(selectedTeam) && !isTeamManager(selectedTeam) && (
                <Button 
                  onClick={() => handleLeaveTeam(selectedTeam.id)} 
                  color="error"
                  disabled={actionLoading}
                  startIcon={<ExitToAppIcon />}
                >
                  Leave Team
                </Button>
              )}
              <Button 
                onClick={() => handleViewTeam(selectedTeam.id)} 
                variant="contained"
                startIcon={<VisibilityIcon />}
              >
                View Team Dashboard
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default TeamsList; 