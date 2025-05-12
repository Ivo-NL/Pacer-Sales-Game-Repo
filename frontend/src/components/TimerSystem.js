import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import apiService from '../services/api';

const TimerSystem = ({ 
  sessionId, 
  initialTime, 
  initialRunning = false,
  onTimeUp,
  disabled = false
}) => {
  const [remainingTime, setRemainingTime] = useState(initialTime || 0);
  const [isRunning, setIsRunning] = useState(initialRunning);
  const [timerInterval, setTimerInterval] = useState(null);
  const [timeWarning, setTimeWarning] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  // Format time in minutes:seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate percentage of time remaining
  const getTimePercentage = () => {
    if (!initialTime) return 0;
    return (remainingTime / initialTime) * 100;
  };

  // Get color based on remaining time
  const getTimeColor = () => {
    const percentage = getTimePercentage();
    if (percentage > 50) return 'success';
    if (percentage > 20) return 'warning';
    return 'error';
  };

  // Start the timer countdown
  const startTimer = useCallback(async () => {
    try {
      // Call API to start/resume timer
      // If timer was previously paused (remainingTime < initialTime), use resume endpoint
      if (remainingTime < initialTime && remainingTime > 0) {
        await apiService.sessions.resumeTimer(sessionId);
      } else {
        await apiService.sessions.startTimer(sessionId);
      }
      
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Start new countdown
      const interval = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            if (onTimeUp) onTimeUp();
            return 0;
          }
          
          // Show warning at 30 seconds if session is longer than 2 minutes
          if (prevTime === 30 && initialTime > 120 && !timeWarning) {
            setTimeWarning(true);
            setShowWarningModal(true);
          }
          
          return prevTime - 1;
        });
      }, 1000);
      
      setTimerInterval(interval);
      setIsRunning(true);
      
      return true;
    } catch (error) {
      console.error('Error starting timer:', error);
      return false;
    }
  }, [sessionId, timerInterval, onTimeUp, initialTime, timeWarning]);

  // Pause the timer
  const pauseTimer = async () => {
    try {
      // Call API to pause timer
      await apiService.sessions.pauseTimer(sessionId);
      
      // Clear interval
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      setIsRunning(false);
      return true;
    } catch (error) {
      console.error('Error pausing timer:', error);
      return false;
    }
  };

  // Check timer status periodically to ensure sync with server
  useEffect(() => {
    const checkTimerStatus = async () => {
      try {
        const response = await apiService.sessions.timerStatus(sessionId);
        const status = response.data;
        
        // Update local state if it's different from server state
        if (status.is_running !== isRunning) {
          if (status.is_running) {
            startTimer();
          } else if (isRunning) {
            pauseTimer();
          }
        }
        
        // Update remaining time if significantly different (>5 seconds)
        if (Math.abs(status.remaining_time_seconds - remainingTime) > 5) {
          setRemainingTime(status.remaining_time_seconds);
        }
      } catch (error) {
        console.error('Error checking timer status:', error);
      }
    };
    
    // Check timer status every 10 seconds
    const statusInterval = setInterval(checkTimerStatus, 10000);
    
    return () => {
      clearInterval(statusInterval);
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [sessionId, isRunning, remainingTime, startTimer]);

  // Start timer on component mount if initialRunning is true
  useEffect(() => {
    if (initialRunning && !isRunning && remainingTime > 0) {
      startTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <AccessTimeIcon 
          sx={{ 
            mr: 1, 
            color: isRunning ? `${getTimeColor()}.main` : 'text.secondary'
          }} 
        />
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 'bold',
            color: isRunning ? `${getTimeColor()}.main` : 'text.primary'
          }}
        >
          {formatTime(remainingTime)}
        </Typography>
        
        <Box sx={{ ml: 'auto' }}>
          {isRunning ? (
            <Button
              startIcon={<PauseIcon />}
              size="small"
              variant="outlined"
              color={getTimeColor()}
              onClick={pauseTimer}
              disabled={disabled || remainingTime <= 0}
            >
              Pause
            </Button>
          ) : (
            <Button
              startIcon={<PlayArrowIcon />}
              size="small"
              variant="contained"
              color={remainingTime > 0 ? getTimeColor() : 'primary'}
              onClick={startTimer}
              disabled={disabled || remainingTime <= 0}
            >
              {remainingTime > 0 ? 'Resume' : 'Time Up'}
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Progress bar */}
      <LinearProgress 
        variant="determinate" 
        value={getTimePercentage()} 
        color={getTimeColor()}
        sx={{ height: 4, borderRadius: 2, mb: 2 }}
      />
      
      {/* Time warning dialog */}
      <Dialog
        open={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      >
        <DialogTitle>Time Warning</DialogTitle>
        <DialogContent>
          <Typography>
            You have 30 seconds remaining to complete this session.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWarningModal(false)}>Continue</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TimerSystem; 