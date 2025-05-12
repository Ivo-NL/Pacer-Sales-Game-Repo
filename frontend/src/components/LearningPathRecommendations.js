import React from 'react';
import {
  Box, Typography, Paper, CircularProgress, Grid,
  Card, CardContent, CardActionArea, Button, Chip,
  List, ListItem, ListItemText, ListItemIcon, Divider
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import StarIcon from '@mui/icons-material/Star';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNavigate } from 'react-router-dom';

const LearningPathRecommendations = ({ recommendations, loading, error }) => {
  const navigate = useNavigate();

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

  if (!recommendations || Object.keys(recommendations).length === 0) {
    return (
      <Box sx={{ my: 2 }}>
        <Typography>
          Complete more scenarios to receive personalized learning path recommendations.
        </Typography>
      </Box>
    );
  }

  // Function to map PACER stage to label
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

  const handleScenarioClick = (scenarioId) => {
    // Navigate to the scenario page
    navigate(`/scenarios/${scenarioId}`);
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5">
          Your Learning Path
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Personalized recommendations based on your current skills and performance to help you master the PACER methodology.
      </Typography>
      
      {/* Focus Areas Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <PriorityHighIcon sx={{ mr: 1, color: 'warning.main' }} />
          Priority Focus Areas
        </Typography>
        
        <Grid container spacing={2}>
          {recommendations.focus_areas && recommendations.focus_areas.map((focus, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      label={getPacerStageName(focus.pacer_stage)} 
                      size="small" 
                      color="primary" 
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Current Level: {focus.current_level}/10
                    </Typography>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    {focus.skill_name}
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    {focus.improvement_suggestion}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* Recommended Scenarios */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <StarIcon sx={{ mr: 1, color: 'success.main' }} />
          Recommended Scenarios
        </Typography>
        
        <Grid container spacing={2}>
          {recommendations.recommended_scenarios && recommendations.recommended_scenarios.map((scenario) => (
            <Grid item xs={12} sm={6} md={4} key={scenario.id}>
              <Card>
                <CardActionArea onClick={() => handleScenarioClick(scenario.id)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={getPacerStageName(scenario.pacer_stage)} 
                        size="small" 
                        color="primary"
                      />
                      <Chip 
                        label={`Level ${scenario.difficulty}`} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      {scenario.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {scenario.description}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      {scenario.region} • {scenario.industry} • {scenario.product_type}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button 
                        size="small" 
                        endIcon={<PlayArrowIcon />}
                        sx={{ textTransform: 'none' }}
                      >
                        Start Scenario
                      </Button>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* Learning Path Progression */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 1, color: 'info.main' }} />
          Your PACER Journey
        </Typography>
        
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ position: 'relative' }}>
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 14, 
                  left: 28, 
                  right: 28, 
                  height: 4, 
                  bgcolor: 'grey.300',
                  zIndex: 0
                }}
              />
              
              <Grid container spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
                {recommendations.learning_path && recommendations.learning_path.map((stage, index) => (
                  <Grid item xs key={index} sx={{ textAlign: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 30, 
                        height: 30, 
                        borderRadius: '50%', 
                        bgcolor: stage.completed ? 'success.main' : 'grey.300',
                        color: stage.completed ? 'white' : 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        margin: '0 auto',
                        mb: 1
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: stage.current ? 'bold' : 'regular' }}>
                      {stage.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stage.completed ? 'Completed' : stage.current ? 'In Progress' : 'Not Started'}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Next Steps
              </Typography>
              
              <List dense>
                {recommendations.next_steps && recommendations.next_steps.map((step, index) => (
                  <ListItem key={index}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <ArrowForwardIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={step} 
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Paper>
  );
};

export default LearningPathRecommendations; 