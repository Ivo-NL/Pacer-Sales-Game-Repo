import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Button,
  Chip, Grid, Divider, CircularProgress, Alert, Badge
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import apiService from '../services/api';

const SeasonalContent = ({ onSelectScenario }) => {
  const [seasonalContent, setSeasonalContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch seasonal content when component mounts
  useEffect(() => {
    const fetchSeasonalContent = async () => {
      try {
        setLoading(true);
        const response = await apiService.seasonal.getActive();
        setSeasonalContent(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching seasonal content:', error);
        setError('Failed to load seasonal content. Please try again later.');
        setLoading(false);
      }
    };

    fetchSeasonalContent();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate time remaining until end date
  const getTimeRemaining = (endDateString) => {
    const now = new Date();
    const endDate = new Date(endDateString);
    const differenceMs = endDate - now;
    
    // If expired, return 0 days
    if (differenceMs <= 0) {
      return '0 days';
    }
    
    const days = Math.floor(differenceMs / (1000 * 60 * 60 * 24));
    
    if (days > 30) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(differenceMs / (1000 * 60 * 60));
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  };

  // Handle scenario selection
  const handleSelectScenario = (contentItem) => {
    if (contentItem.content_type === 'scenario' && onSelectScenario) {
      // Get the first scenario from the content data
      const scenarioId = contentItem.content_data.scenario_ids?.[0];
      if (scenarioId) {
        onSelectScenario(scenarioId);
      }
    }
  };

  // Render content based on type
  const renderContentCard = (content) => {
    const timeRemaining = getTimeRemaining(content.end_date);
    const isChallenge = content.content_type === 'challenge';
    const isScenario = content.content_type === 'scenario';
    
    return (
      <Card 
        elevation={3} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)'
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {content.name}
            </Typography>
            <Chip 
              size="small" 
              label={content.content_type.toUpperCase()} 
              color={isChallenge ? 'secondary' : 'primary'} 
            />
          </Box>
          
          <Typography variant="body2" paragraph>
            {content.description}
          </Typography>
          
          <Divider sx={{ my: 1.5 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Available until: {formatDate(content.end_date)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Time remaining: {timeRemaining}
            </Typography>
          </Box>
          
          {/* Content-specific data */}
          {isScenario && content.content_data?.scenario_titles && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Included Scenarios:
              </Typography>
              {content.content_data.scenario_titles.map((title, i) => (
                <Typography key={i} variant="body2" sx={{ ml: 2 }}>
                  • {title}
                </Typography>
              ))}
            </Box>
          )}
          
          {isChallenge && content.content_data?.challenge_description && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Challenge Details:</Typography>
              <Typography variant="body2" paragraph sx={{ mt: 0.5 }}>
                {content.content_data.challenge_description}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {content.content_data.time_limit && (
                  <Chip 
                    size="small" 
                    label={`Time limit: ${Math.floor(content.content_data.time_limit / 60)} minutes`} 
                    variant="outlined"
                  />
                )}
                {content.content_data.bonus_points && (
                  <Chip 
                    size="small" 
                    label={`Bonus points: ${content.content_data.bonus_points}`} 
                    variant="outlined"
                    color="secondary"
                  />
                )}
              </Box>
            </Box>
          )}
        </CardContent>
        
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button 
            variant="contained"
            color={isChallenge ? 'secondary' : 'primary'}
            fullWidth
            endIcon={<DoubleArrowIcon />}
            onClick={() => handleSelectScenario(content)}
            disabled={!isScenario && !isChallenge}
          >
            {isScenario ? 'Start Scenario' : isChallenge ? 'Take Challenge' : 'View Details'}
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Badge badgeContent={seasonalContent.length} color="primary" sx={{ mr: 2 }}>
          <EventIcon fontSize="large" color="primary" />
        </Badge>
        <Typography variant="h5" component="h2">
          Seasonal & Limited-Time Content
        </Typography>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : seasonalContent.length === 0 ? (
        <Alert severity="info">
          No seasonal content is currently available. Check back later for special events and challenges!
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {seasonalContent.map((content) => (
            <Grid item xs={12} md={6} lg={4} key={content.id}>
              {renderContentCard(content)}
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SeasonalContent; 