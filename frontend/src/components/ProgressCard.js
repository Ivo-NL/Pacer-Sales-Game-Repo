import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  CircularProgress, 
  Chip, 
  Divider
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material';

/**
 * ProgressCard component displays a user's progress across PACER methodology stages
 * 
 * @param {Object} progress - User progress data containing levels for each PACER stage
 * @param {Function} onViewDetails - Callback function when "View Details" is clicked
 * @returns {JSX.Element} Progress card with circular indicators for each PACER stage
 */
const ProgressCard = ({ progress, onViewDetails }) => {
  // Track which stage the user is hovering over for potential tooltip or highlight effect
  const [hoveredStage, setHoveredStage] = React.useState(null);
  
  // Helper function to determine which stage needs the most attention (lowest score)
  const getFocusArea = () => {
    if (!progress) return null;
    
    const stages = [
      { key: 'prospect', name: 'Prospect', level: progress.prospect_level || 0 },
      { key: 'assess', name: 'Assess', level: progress.assess_level || 0 },
      { key: 'challenge', name: 'Challenge', level: progress.challenge_level || 0 },
      { key: 'execute', name: 'Execute', level: progress.execute_level || 0 },
      { key: 'retain', name: 'Retain', level: progress.retain_level || 0 }
    ];
    
    // Sort by level ascending to find the lowest
    return stages.sort((a, b) => a.level - b.level)[0];
  };
  
  // Get the stage that needs most improvement
  const focusArea = getFocusArea();
  
  return (
    <Box sx={{ width: '100%' }}>
      {progress ? (
        <>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ mr: 1 }}>Current Rank:</Typography>
              <Chip 
                label={progress.rank || 'Beginner'} 
                color="primary" 
                size="small"
              />
            </Box>
            {focusArea && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  Focus Area:
                </Typography>
                <Chip 
                  label={focusArea.name} 
                  color="secondary" 
                  size="small" 
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Prospect Stage */}
            <Grid item xs={6} sm={4} md={2.4}>
              <Box 
                sx={{ 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  transform: hoveredStage === 'prospect' ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredStage('prospect')}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <Typography variant="body2" color="text.secondary">Prospect</Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={progress.prospect_level * 10 || 0} 
                    color="primary"
                    size={60}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                    >{progress.prospect_level || 0}/10</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            
            {/* Assess Stage */}
            <Grid item xs={6} sm={4} md={2.4}>
              <Box 
                sx={{ 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  transform: hoveredStage === 'assess' ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredStage('assess')}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <Typography variant="body2" color="text.secondary">Assess</Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={progress.assess_level * 10 || 0} 
                    color="secondary"
                    size={60}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                    >{progress.assess_level || 0}/10</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            
            {/* Challenge Stage */}
            <Grid item xs={4} sm={4} md={2.4}>
              <Box 
                sx={{ 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  transform: hoveredStage === 'challenge' ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredStage('challenge')}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <Typography variant="body2" color="text.secondary">Challenge</Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={progress.challenge_level * 10 || 0} 
                    color="warning"
                    size={60}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                    >{progress.challenge_level || 0}/10</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            
            {/* Execute Stage */}
            <Grid item xs={4} sm={4} md={2.4}>
              <Box 
                sx={{ 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  transform: hoveredStage === 'execute' ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredStage('execute')}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <Typography variant="body2" color="text.secondary">Execute</Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={progress.execute_level * 10 || 0} 
                    color="info"
                    size={60}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                    >{progress.execute_level || 0}/10</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            
            {/* Retain Stage */}
            <Grid item xs={4} sm={4} md={2.4}>
              <Box 
                sx={{ 
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  transform: hoveredStage === 'retain' ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredStage('retain')}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <Typography variant="body2" color="text.secondary">Retain</Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={progress.retain_level * 10 || 0} 
                    color="success"
                    size={60}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                    >{progress.retain_level || 0}/10</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Sessions Completed
              </Typography>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
                {progress.total_sessions_completed || 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Score
              </Typography>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <EmojiEventsIcon sx={{ mr: 1, color: 'secondary.main' }} />
                {progress.total_score ? Number(progress.total_score).toFixed(1) : 0}
              </Typography>
            </Box>
          </Box>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No progress data available yet. Start practicing to track your improvement!
        </Typography>
      )}
    </Box>
  );
};

export default ProgressCard; 