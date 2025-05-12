import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Typography, Button, Card, CardContent, Box, Chip, 
  Grid, Alert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import apiService from '../services/api';

const EventSystem = ({ 
  sessionId, 
  scenario, 
  isOpen, 
  onClose, 
  onEventResponse,
  difficultyFactor = 1.0
}) => {
  const [loading, setLoading] = useState(true);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [responseOptions, setResponseOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [error, setError] = useState('');

  // Generate event when component opens
  useEffect(() => {
    if (isOpen && scenario?.id) {
      generateEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scenario?.id]);

  // Generate a random event
  const generateEvent = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get events for this scenario
      const eventsResponse = await apiService.events.getScenarioEvents(scenario.id);
      const events = eventsResponse.data;
      
      if (!events || events.length === 0) {
        setError('No events available for this scenario');
        setLoading(false);
        return;
      }
      
      // Filter events based on probability and difficulty factor
      // Higher difficulty factor means more challenging events are more likely
      const filteredEvents = events.filter(event => 
        Math.random() < (event.probability * difficultyFactor)
      );
      
      if (filteredEvents.length === 0) {
        // If no events passed the probability filter, pick a random one anyway
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        await triggerEvent(randomEvent);
      } else {
        // Pick a random event from filtered list, biased toward higher difficulty events
        // when difficultyFactor is higher
        const sortedEvents = [...filteredEvents].sort((a, b) => {
          if (difficultyFactor > 1.2) {
            // Bias toward harder events
            return b.difficulty_adjustment - a.difficulty_adjustment;
          } else if (difficultyFactor < 0.8) {
            // Bias toward easier events
            return a.difficulty_adjustment - b.difficulty_adjustment;
          }
          // Normal distribution
          return Math.random() - 0.5;
        });
        
        // Take one of the top 3 events or all if fewer than 3
        const topCount = Math.min(3, sortedEvents.length);
        const selectedEvent = sortedEvents[Math.floor(Math.random() * topCount)];
        await triggerEvent(selectedEvent);
      }
    } catch (error) {
      console.error('Error generating event:', error);
      setError('Failed to generate an event. Please try again.');
      setLoading(false);
    }
  };

  // Trigger an event on the backend
  const triggerEvent = async (event) => {
    try {
      // Trigger the event on the backend
      const eventResponse = await apiService.sessions.triggerEvent(sessionId, {
        game_event_id: event.id,
        game_session_id: parseInt(sessionId)
      });
      
      const eventOccurrence = eventResponse.data;
      
      // Generate response options based on event type
      const options = generateResponseOptions(event.event_type, event.difficulty_adjustment);
      
      // Set component state
      setCurrentEvent({
        ...event,
        occurrenceId: eventOccurrence.id
      });
      setResponseOptions(options);
      setLoading(false);
    } catch (error) {
      console.error('Error triggering event:', error);
      setError('Failed to process event. Please try again.');
      setLoading(false);
    }
  };

  // Generate options based on event type
  const generateResponseOptions = (eventType, difficultyAdjustment) => {
    const options = [];
    
    // Common options for all event types
    options.push({
      text: 'Ask for more information',
      difficulty: 'easy',
      strategy: 'gathering_information'
    });
    
    // Event-specific options
    if (eventType === 'competitor_intervention') {
      options.push({
        text: 'Highlight your unique value proposition',
        difficulty: 'medium',
        strategy: 'differentiation'
      });
      options.push({
        text: 'Request a side-by-side comparison',
        difficulty: 'hard',
        strategy: 'direct_competition'
      });
      options.push({
        text: 'Acknowledge the competitor and refocus on client needs',
        difficulty: 'medium',
        strategy: 'client_centric'
      });
    } else if (eventType === 'market_change') {
      options.push({
        text: 'Explain how your solution adapts to the change',
        difficulty: 'medium',
        strategy: 'adaptability'
      });
      options.push({
        text: 'Position your company as an industry leader in compliance',
        difficulty: 'medium',
        strategy: 'thought_leadership'
      });
      options.push({
        text: 'Propose a pilot program to test adaptability',
        difficulty: 'hard',
        strategy: 'risk_mitigation'
      });
    } else if (eventType === 'client_emergency') {
      options.push({
        text: 'Offer immediate assistance with the emergency',
        difficulty: 'hard',
        strategy: 'crisis_support'
      });
      options.push({
        text: 'Suggest how your solution could prevent similar issues',
        difficulty: 'medium',
        strategy: 'prevention'
      });
      options.push({
        text: 'Respectfully reschedule to allow them to handle the situation',
        difficulty: 'easy',
        strategy: 'respect'
      });
    } else {
      // Generic options for other event types
      options.push({
        text: 'Address the concern directly',
        difficulty: 'medium',
        strategy: 'direct_address'
      });
      options.push({
        text: 'Pivot to your core message',
        difficulty: 'hard',
        strategy: 'redirection'
      });
    }
    
    // Sort options by difficulty based on player skill level
    return options.sort((a, b) => {
      if (difficultyAdjustment > 0.3) {
        // Harder options first for skilled players
        return getDifficultyValue(b.difficulty) - getDifficultyValue(a.difficulty);
      } else if (difficultyAdjustment < -0.3) {
        // Easier options first for newer players
        return getDifficultyValue(a.difficulty) - getDifficultyValue(b.difficulty);
      }
      // Mixed options for average players
      return Math.random() - 0.5;
    });
  };

  // Convert difficulty string to numeric value
  const getDifficultyValue = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 2;
    }
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    setSelectedOption(option.text);
  };

  // Handle response submission
  const handleSubmit = async () => {
    if (!selectedOption || !currentEvent) return;
    
    try {
      // Send response to backend
      const eventData = {
        event_occurrence_id: currentEvent.occurrenceId,
        player_response: selectedOption,
        event_type: currentEvent.event_type
      };
      
      const response = await apiService.sessions.respondToEvent(sessionId, eventData);
      
      // Call parent component callback with event data
      if (onEventResponse) {
        onEventResponse({
          event: currentEvent,
          response: selectedOption,
          result: response.data
        });
      }
      
      // Reset state and close dialog
      setSelectedOption('');
      onClose();
    } catch (error) {
      console.error('Error submitting event response:', error);
      setError('Failed to submit your response. Please try again.');
    }
  };

  // Get color based on difficulty
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'primary';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          <Typography variant="h6">Unexpected Event</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Typography>Loading event...</Typography>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : currentEvent ? (
          <>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                {currentEvent.name}
              </Typography>
              <Typography variant="body1">
                {currentEvent.description}
              </Typography>
              {currentEvent.event_data && currentEvent.event_data.urgency_level && (
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    size="small" 
                    label={`Urgency: ${currentEvent.event_data.urgency_level}`} 
                    color={
                      currentEvent.event_data.urgency_level === 'high' ? 'error' :
                      currentEvent.event_data.urgency_level === 'medium' ? 'warning' : 'info'
                    }
                  />
                </Box>
              )}
            </Alert>
            
            <Typography variant="h6" gutterBottom>How will you respond?</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Select one of the following response strategies:
            </Typography>
            
            <Grid container spacing={2}>
              {responseOptions.map((option, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedOption === option.text ? '2px solid' : '1px solid',
                      borderColor: selectedOption === option.text ? 'primary.main' : 'divider',
                      bgcolor: selectedOption === option.text ? 'action.selected' : 'background.paper',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleOptionSelect(option)}
                  >
                    <CardContent>
                      <Typography variant="body1">{option.text}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Difficulty: 
                        </Typography>
                        <Chip 
                          size="small" 
                          label={option.difficulty} 
                          color={getDifficultyColor(option.difficulty)}
                          sx={{ ml: 1 }}
                        />
                        {option.strategy && (
                          <Chip 
                            size="small" 
                            label={option.strategy.replace('_', ' ')} 
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Alert severity="warning">No event data available</Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!selectedOption || loading}
          variant="contained"
          color="primary"
        >
          Respond
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventSystem; 