import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Chip,
  Divider,
  Button
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  Score as ScoreIcon
} from '@mui/icons-material';

/**
 * RecentSessionsCard component displays a list of recent practice sessions
 * 
 * @param {Array} sessions - Array of session objects containing session details
 * @param {Function} onViewSession - Callback function when a session is clicked
 * @returns {JSX.Element} List of recent sessions with details
 */
const RecentSessionsCard = ({ sessions, onViewSession }) => {
  // Add debugging
  console.log("RecentSessionsCard received sessions:", sessions);
  
  // Format date to a readable string
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Get relative time (today, yesterday, or actual date)
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };
  
  // Map PACER stage code to full name
  const getPacerStageName = (stage) => {
    if (!stage) return 'Unknown';
    
    const stageMap = {
      'P': 'Prospect',
      'A': 'Assess',
      'C': 'Challenge',
      'E': 'Execute',
      'R': 'Retain'
    };
    
    return stageMap[stage] || stage;
  };
  
  // Get appropriate color for PACER stage
  const getPacerStageColor = (stage) => {
    if (!stage) return 'default';
    
    const colorMap = {
      'P': 'primary',
      'A': 'secondary',
      'C': 'warning',
      'E': 'info',
      'R': 'success'
    };
    
    return colorMap[stage] || 'default';
  };
  
  // If no sessions are available
  if (!sessions || sessions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No recent activity. Start a new scenario to practice your PACER sales skills!
        </Typography>
      </Box>
    );
  }
  
  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {sessions.map((session, index) => {
        // Debug individual session
        console.log(`Session ${session.id} is_completed:`, session.is_completed, 
                    "end_time:", session.end_time);
        
        // Determine completed status using both flags
        const isCompleted = session.is_completed || (session.end_time !== null);
                
        return (
          <React.Fragment key={session.id || index}>
            <ListItem 
              button 
              alignItems="flex-start"
              onClick={() => onViewSession(session.id)}
              sx={{ py: 2 }}
            >
              <ListItemIcon>
                <PlayArrowIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle1" component="span">
                      {session.scenario?.title || 'Unnamed Scenario'}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={getPacerStageName(session.scenario?.pacer_stage)} 
                      color={getPacerStageColor(session.scenario?.pacer_stage)} 
                      variant="outlined" 
                    />
                  </Box>
                }
                secondary={
                  <React.Fragment>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography component="div" variant="body2" color="text.secondary">
                          {formatDate(session.start_time)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScoreIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography component="div" variant="body2" color="text.secondary">
                          Score: {session.total_score ? Number(session.total_score).toFixed(1) : 0}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        size="small" 
                        label={isCompleted ? 'Completed' : 'In Progress'} 
                        color={isCompleted ? 'success' : 'warning'} 
                        variant="outlined"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                  </React.Fragment>
                }
              />
            </ListItem>
            {index < sessions.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        );
      })}
      
      {sessions.length > 3 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            variant="text" 
            color="primary" 
            onClick={() => onViewSession('all')}
          >
            View All Sessions
          </Button>
        </Box>
      )}
    </List>
  );
};

export default RecentSessionsCard; 