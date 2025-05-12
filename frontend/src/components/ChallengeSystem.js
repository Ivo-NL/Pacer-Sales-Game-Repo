import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Button, TextField, LinearProgress,
  Box, Chip, Alert, CircularProgress
} from '@mui/material';
import AlarmIcon from '@mui/icons-material/Alarm';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import apiService from '../services/api';

const ChallengeSystem = ({
  sessionId,
  challenge,
  isOpen,
  onClose,
  onComplete
}) => {
  const [response, setResponse] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [challengeStarted, setChallengeStarted] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [result, setResult] = useState(null);

  // Initialize timer when component mounts
  useEffect(() => {
    if (isOpen && challenge) {
      setTimeRemaining(challenge.time_limit_seconds);
    }
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isOpen, challenge]);

  // Start the challenge timer
  const startChallenge = () => {
    if (!challenge) return;
    
    setChallengeStarted(true);
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, challenge.time_limit_seconds - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeUp();
      }
    }, 1000);
    
    setTimerInterval(interval);
    
    // Mark challenge as started in the database
    apiService.challenges.update(challenge.id, {
      started_at: new Date().toISOString()
    }).catch(error => {
      console.error('Error updating challenge start time:', error);
    });
  };

  // Handle timer expiration
  const handleTimeUp = async () => {
    try {
      setIsSubmitting(true);
      
      // Submit whatever response we have when time is up
      const result = await apiService.challenges.update(challenge.id, {
        is_completed: true,
        player_response: response || "Time expired before response was completed",
        completed_at: new Date().toISOString()
      });
      
      // Show result
      setResult({
        status: 'timeout',
        message: 'You ran out of time! The challenge has been marked as incomplete.',
        score: 0
      });
      
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error handling time up:', error);
      setError('Error submitting response. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle challenge submission
  const handleSubmit = async () => {
    if (!response.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      // Stop timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // Calculate score based on remaining time and response length
      // More time remaining = better score, but only if response is substantial
      const timeScore = Math.round((timeRemaining / challenge.time_limit_seconds) * 50);
      const contentScore = Math.min(50, Math.round(response.length / 10));
      const totalScore = timeScore + contentScore;
      
      // Submit challenge
      const result = await apiService.challenges.update(challenge.id, {
        is_completed: true,
        player_response: response,
        completed_at: new Date().toISOString(),
        score: totalScore
      });
      
      // Show result
      setResult({
        status: 'success',
        message: 'Challenge completed successfully!',
        score: totalScore,
        timeScore,
        contentScore
      });
      
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error submitting challenge:', error);
      setError('Error submitting response. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Format time in MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Close the dialog and pass result to parent component
  const handleClose = () => {
    if (result && onComplete) {
      onComplete({
        challenge,
        response,
        result,
        completed: true
      });
    }
    
    if (onClose) {
      onClose();
    }
    
    // Reset state
    setResponse('');
    setResult(null);
    setChallengeStarted(false);
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Get challenge type display name
  const getChallengeTypeName = (type) => {
    const typeNames = {
      'response_time': 'Quick Response',
      'decision_making': 'Decision Making',
      'recovery': 'Recovery',
      'crisis_management': 'Crisis Management'
    };
    
    return typeNames[type] || 'Challenge';
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AlarmIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">
            {challenge ? getChallengeTypeName(challenge.challenge_type) : ''} Challenge
          </Typography>
          
          {challengeStarted && (
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="body1" 
                fontWeight="bold" 
                color={timeRemaining < 10 ? 'error.main' : 'primary.main'}
              >
                {formatTime(timeRemaining)}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        
        {result ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <EmojiEventsIcon 
              sx={{ 
                fontSize: 60, 
                color: result.status === 'success' ? 'success.main' : 'text.secondary',
                mb: 2 
              }} 
            />
            
            <Typography variant="h5" gutterBottom>
              {result.status === 'success' ? 'Challenge Completed!' : 'Time Expired'}
            </Typography>
            
            <Typography variant="body1" paragraph>
              {result.message}
            </Typography>
            
            {result.status === 'success' && (
              <Box sx={{ maxWidth: 300, mx: 'auto', mb: 3 }}>
                <Typography variant="subtitle1" align="center" gutterBottom>
                  Score: {result.score}/100
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={result.score} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Chip label={`Time: ${result.timeScore}/50`} color="primary" size="small" />
                  <Chip label={`Content: ${result.contentScore}/50`} color="secondary" size="small" />
                </Box>
              </Box>
            )}
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Your Response:</Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.default', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                mt: 1
              }}>
                <Typography variant="body2">
                  {response}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : challenge ? (
          <>
            {!challengeStarted ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  {challenge.description}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  You will have {formatTime(challenge.time_limit_seconds)} to complete this challenge.
                  The timer will start when you click "Start Challenge".
                </Typography>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  onClick={startChallenge}
                >
                  Start Challenge
                </Button>
              </Box>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    {challenge.description}
                  </Typography>
                  <Typography variant="caption">
                    Time remaining: {formatTime(timeRemaining)}
                  </Typography>
                </Alert>
                
                <LinearProgress 
                  variant="determinate" 
                  value={(timeRemaining / challenge.time_limit_seconds) * 100} 
                  color={timeRemaining < 10 ? 'error' : 'primary'}
                  sx={{ height: 5, mb: 3 }}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Your Response"
                  placeholder="Type your response here..."
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  disabled={isSubmitting}
                />
              </>
            )}
          </>
        ) : (
          <CircularProgress />
        )}
      </DialogContent>
      
      <DialogActions>
        {result ? (
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        ) : challengeStarted ? (
          <>
            <Button onClick={handleClose} disabled={isSubmitting}>
              Skip Challenge
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              color="primary" 
              disabled={!response.trim() || isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Submit Response'}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>
            Cancel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ChallengeSystem; 