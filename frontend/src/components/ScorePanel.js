import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Chip, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import FlagIcon from '@mui/icons-material/Flag';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ScorePanel = ({ 
  currentScore = 0, 
  finalScore = 0, 
  executionScore = 0, 
  methodologyScore = 0, 
  progressScore = 0, 
  previousScore = null,
  timeRemaining = 0,
  goalTarget = 80,
  goalCurrent = 0,
  sessionComplete = false,
  sessionDuration = 0,
  showTimer = true,
  scoreLabel = null
}) => {
  const [showDelta, setShowDelta] = useState(false);
  const [deltaValue, setDeltaValue] = useState(0);
  
  // Calculate delta when currentScore changes
  useEffect(() => {
    if (previousScore !== null && previousScore !== currentScore) {
      const delta = currentScore - previousScore;
      setDeltaValue(delta);
      setShowDelta(true);
      
      // Hide delta after 5 seconds
      const timer = setTimeout(() => {
        setShowDelta(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentScore, previousScore]);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Determine goal status
  const getGoalStatus = () => {
    if (goalCurrent >= goalTarget) return 'full';
    if (goalCurrent >= goalTarget * 0.6) return 'partial';
    return 'none';
  };
  
  const goalStatus = getGoalStatus();
  
  // Get color based on score
  const getScoreColor = (score) => {
    if (!score && score !== 0) return 'info'; // Handle undefined
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };
  
  return (
    <Box sx={{ width: '100%', p: 1 }}>
      {/* Score Headers - Show different UI based on session completion */}
      {sessionComplete ? (
        // Final Score (for completed sessions)
        <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} /> 
            {scoreLabel || "Final Score (includes bonuses)"}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress
                variant="determinate"
                value={finalScore}
                color={getScoreColor(finalScore)}
                sx={{ 
                  height: 12, 
                  borderRadius: 6,
                  '& .MuiLinearProgress-bar': {
                    transition: 'transform 0.5s ease'
                  }
                }}
              />
            </Box>
            <Box sx={{ minWidth: 50 }}>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                {Math.round(finalScore)} / 100
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        // Current and Final scores (for active sessions)
        <>
          {/* Current Score Gauge */}
          <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              {scoreLabel || "Current Score (EMA)"}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={currentScore}
                  color={getScoreColor(currentScore)}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    '& .MuiLinearProgress-bar': {
                      transition: 'transform 0.5s ease'
                    }
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 50 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {Math.round(currentScore)} / 100
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {/* Final Score (so far) */}
          <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
            <Tooltip title="Final score includes quality score plus time, goal and difficulty bonuses">
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Projected Final Score
              </Typography>
            </Tooltip>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={finalScore}
                  color={getScoreColor(finalScore)}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    opacity: 0.8
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 50 }}>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(finalScore)} / 100
                </Typography>
              </Box>
            </Box>
          </Box>
        </>
      )}
      
      {/* Three Weighted Pillars */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Execution</Typography>
          <Typography variant="body2" color="text.secondary">{Math.round(executionScore)}%</Typography>
        </Box>
        <Tooltip title={`Execution: ${Math.round(executionScore)}% (Rapport)`}>
          <LinearProgress
            variant="determinate"
            value={executionScore}
            color="success"
            sx={{ height: 8, borderRadius: 4, mb: 1.5 }}
          />
        </Tooltip>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Methodology</Typography>
          <Typography variant="body2" color="text.secondary">{Math.round(methodologyScore)}%</Typography>
        </Box>
        <Tooltip title={`Methodology: ${Math.round(methodologyScore)}%`}>
          <LinearProgress
            variant="determinate"
            value={methodologyScore}
            color="primary"
            sx={{ height: 8, borderRadius: 4, mb: 1.5 }}
          />
        </Tooltip>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Progress</Typography>
          <Typography variant="body2" color="text.secondary">{Math.round(progressScore)}%</Typography>
        </Box>
        <Tooltip title={`Progress: ${Math.round(progressScore)}% (Progress + Outcome)`}>
          <LinearProgress
            variant="determinate"
            value={progressScore}
            color="info"
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Tooltip>
      </Box>
      
      {/* Last Turn Delta Badge - Only show if session is not complete */}
      {!sessionComplete && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <TrackChangesIcon fontSize="small" sx={{ mr: 0.5 }} /> Last turn
          </Typography>
          {showDelta ? (
            <Chip
              icon={deltaValue >= 0 ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
              label={`${deltaValue >= 0 ? '+' : ''}${deltaValue.toFixed(1)}`}
              color={deltaValue >= 0 ? 'success' : 'error'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 'bold' }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          )}
        </Box>
      )}
      
      {/* Countdown Timer / Session Time - Only show if showTimer is true */}
      {showTimer && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} /> 
            {sessionComplete ? "Session Duration" : "Time left"}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 'bold',
              color: sessionComplete ? 'text.primary' : 
                    (timeRemaining <= 60 ? 'error.main' : 
                     timeRemaining <= 180 ? 'warning.main' : 'text.primary')
            }}
          >
            {sessionComplete 
              ? (sessionDuration > 0 ? formatTime(sessionDuration) : "00:00") 
              : formatTime(timeRemaining)}
          </Typography>
        </Box>
      )}
      
      {/* Goal Tracker */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <FlagIcon fontSize="small" sx={{ mr: 0.5 }} /> Goal
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {goalCurrent} / {goalTarget} pts {goalStatus === 'full' && '(met)'}
        </Typography>
      </Box>
    </Box>
  );
};

export default ScorePanel; 