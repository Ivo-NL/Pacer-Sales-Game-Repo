import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Slider,
  Divider,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CommentIcon from '@mui/icons-material/Comment';
import AddCommentIcon from '@mui/icons-material/AddComment';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AddIcon from '@mui/icons-material/Add';
import apiService from '../services/api';

const RecordingPlayback = ({ recording, onClose }) => {
  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedTab, setSelectedTab] = useState(0);
  const timerRef = useRef(null);

  // Recording data
  const [interactions, setInteractions] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Annotation form
  const [newAnnotation, setNewAnnotation] = useState('');
  const [annotationType, setAnnotationType] = useState('positive');
  const [annotationPacerStage, setAnnotationPacerStage] = useState('');
  const [submittingAnnotation, setSubmittingAnnotation] = useState(false);

  // Bookmark form
  const [newBookmark, setNewBookmark] = useState('');
  const [submittingBookmark, setSubmittingBookmark] = useState(false);

  // Load recording data
  useEffect(() => {
    loadRecordingData();
    return () => {
      // Clean up timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recording.id]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime(time => {
          const newTime = time + (playbackSpeed * 0.1);
          if (newTime >= recording.duration_seconds) {
            clearInterval(timerRef.current);
            setIsPlaying(false);
            return recording.duration_seconds;
          }
          return newTime;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, recording.duration_seconds]);

  const loadRecordingData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch recording data (In a real implementation, this would get the actual interactions)
      const sessionResponse = await apiService.sessions.getById(recording.session_id);
      
      // Fetch annotations
      const annotationsResponse = await apiService.recordings.getAnnotations(recording.id);
      
      // Fetch bookmarks
      const bookmarksResponse = await apiService.recordings.getBookmarks(recording.id);

      // Set data
      setInteractions(sessionResponse.data.interactions || []);
      setAnnotations(annotationsResponse.data || []);
      setBookmarks(bookmarksResponse.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading recording data:', error);
      setError('Failed to load recording data. Please try again.');
      setLoading(false);
    }
  };

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle play/pause
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle seek
  const handleSeek = (event, newValue) => {
    setCurrentTime(newValue);
  };

  // Skip forward/backward
  const skip = (seconds) => {
    setCurrentTime(time => {
      const newTime = time + seconds;
      if (newTime < 0) return 0;
      if (newTime > recording.duration_seconds) return recording.duration_seconds;
      return newTime;
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Jump to bookmark
  const jumpToBookmark = (timestamp) => {
    setCurrentTime(timestamp);
    if (!isPlaying) setIsPlaying(true);
  };

  // Add annotation
  const handleAddAnnotation = async () => {
    if (!newAnnotation) return;

    try {
      setSubmittingAnnotation(true);
      await apiService.recordings.createAnnotation(recording.id, {
        recording_id: recording.id,
        timestamp_seconds: Math.floor(currentTime),
        content: newAnnotation,
        annotation_type: annotationType,
        pacer_stage: annotationPacerStage || undefined
      });

      // Clear form and refresh annotations
      setNewAnnotation('');
      const annotationsResponse = await apiService.recordings.getAnnotations(recording.id);
      setAnnotations(annotationsResponse.data || []);
      setSubmittingAnnotation(false);
    } catch (error) {
      console.error('Error adding annotation:', error);
      setSubmittingAnnotation(false);
    }
  };

  // Add bookmark
  const handleAddBookmark = async () => {
    if (!newBookmark) return;

    try {
      setSubmittingBookmark(true);
      await apiService.recordings.createBookmark(recording.id, {
        recording_id: recording.id,
        timestamp_seconds: Math.floor(currentTime),
        label: newBookmark
      });

      // Clear form and refresh bookmarks
      setNewBookmark('');
      const bookmarksResponse = await apiService.recordings.getBookmarks(recording.id);
      setBookmarks(bookmarksResponse.data || []);
      setSubmittingBookmark(false);
    } catch (error) {
      console.error('Error adding bookmark:', error);
      setSubmittingBookmark(false);
    }
  };

  // Get interactions at current time
  const getCurrentInteractions = () => {
    if (!interactions || interactions.length === 0) {
      return 'No interactions found for this session.';
    }
    
    // Sort interactions by timestamp (if they have it) or by sequence
    const sortedInteractions = [...interactions].sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp) - new Date(b.timestamp);
      }
      return (a.sequence || 0) - (b.sequence || 0);
    });
    
    // Calculate the timestamp position based on recording duration
    const recordingDuration = recording.duration_seconds || 600;
    const progressPercentage = Math.min(currentTime / recordingDuration, 1);
    
    // Determine which interactions to show based on current playback position
    const interactionIndex = Math.floor(progressPercentage * sortedInteractions.length);
    const currentInteraction = sortedInteractions[Math.min(interactionIndex, sortedInteractions.length - 1)];
    
    if (!currentInteraction) {
      return 'No interaction to display at this time point.';
    }
    
    // Format the interaction for display
    return (
      <Box>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          {currentInteraction.player_input ? 'You:' : 'AI:'}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {currentInteraction.player_input || currentInteraction.ai_response || currentInteraction.message || 'No content'}
        </Typography>
        {currentInteraction.ai_response && (
          <>
            <Typography variant="subtitle2" color="secondary" gutterBottom>
              Response:
            </Typography>
            <Typography variant="body1">
              {currentInteraction.ai_response}
            </Typography>
          </>
        )}
      </Box>
    );
  };

  // Get annotation color
  const getAnnotationColor = (type) => {
    switch (type) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      case 'suggestion': return 'warning';
      default: return 'info';
    }
  };

  // Get annotation icon
  const getAnnotationIcon = (type) => {
    switch (type) {
      case 'positive': return <ThumbUpIcon />;
      case 'negative': return <ThumbDownIcon />;
      case 'suggestion': return <LightbulbIcon />;
      default: return <CommentIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={loadRecordingData} sx={{ mt: 2 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom>
        {recording.title}
      </Typography>

      {/* Playback controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton onClick={() => skip(-10)}>
            <FastRewindIcon />
          </IconButton>
          <IconButton onClick={togglePlayback} color="primary" sx={{ mx: 1 }}>
            {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
          </IconButton>
          <IconButton onClick={() => skip(10)}>
            <FastForwardIcon />
          </IconButton>
          <Box sx={{ mx: 2, flexGrow: 1 }}>
            <Slider
              value={currentTime}
              max={recording.duration_seconds}
              onChange={handleSeek}
              aria-labelledby="playback-slider"
            />
          </Box>
          <Typography sx={{ minWidth: 60, textAlign: 'right' }}>
            {formatTime(currentTime)} / {formatTime(recording.duration_seconds)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2">
            Speed: {playbackSpeed}x
          </Typography>
          <Box>
            <Button 
              size="small" 
              onClick={() => setPlaybackSpeed(0.5)} 
              variant={playbackSpeed === 0.5 ? "contained" : "text"}
              sx={{ minWidth: 0, px: 1 }}
            >
              0.5x
            </Button>
            <Button 
              size="small" 
              onClick={() => setPlaybackSpeed(1)} 
              variant={playbackSpeed === 1 ? "contained" : "text"}
              sx={{ minWidth: 0, px: 1 }}
            >
              1x
            </Button>
            <Button 
              size="small" 
              onClick={() => setPlaybackSpeed(1.5)} 
              variant={playbackSpeed === 1.5 ? "contained" : "text"}
              sx={{ minWidth: 0, px: 1 }}
            >
              1.5x
            </Button>
            <Button 
              size="small" 
              onClick={() => setPlaybackSpeed(2)} 
              variant={playbackSpeed === 2 ? "contained" : "text"}
              sx={{ minWidth: 0, px: 1 }}
            >
              2x
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Current interaction display */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Current Interaction:
        </Typography>
        
        {/* Add debug info for session data */}
        <Box sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Recording ID: {recording.id} | Session ID: {recording.session_id} | Duration: {formatTime(recording.duration_seconds)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Interactions found: {interactions.length} | Current position: {Math.floor(currentTime)} seconds
          </Typography>
        </Box>
        
        {/* Display current interaction content */}
        <Box sx={{ mt: 2 }}>
          {getCurrentInteractions()}
        </Box>
      </Paper>

      {/* Annotations and Bookmarks */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} centered>
          <Tab label="Annotations" />
          <Tab label="Bookmarks" />
        </Tabs>
        <Divider />
        
        {/* Annotations Tab */}
        {selectedTab === 0 && (
          <Box sx={{ p: 2 }}>
            {/* New Annotation Form */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Add Annotation at {formatTime(currentTime)}
              </Typography>
              <TextField
                multiline
                rows={2}
                fullWidth
                placeholder="Add your comment..."
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Tooltip title="Positive Comment">
                  <IconButton 
                    color={annotationType === 'positive' ? 'success' : 'default'} 
                    onClick={() => setAnnotationType('positive')}
                  >
                    <ThumbUpIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Needs Improvement">
                  <IconButton 
                    color={annotationType === 'negative' ? 'error' : 'default'} 
                    onClick={() => setAnnotationType('negative')}
                  >
                    <ThumbDownIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Suggestion">
                  <IconButton 
                    color={annotationType === 'suggestion' ? 'warning' : 'default'}
                    onClick={() => setAnnotationType('suggestion')}
                  >
                    <LightbulbIcon />
                  </IconButton>
                </Tooltip>
                <Box sx={{ ml: 'auto' }}>
                  <TextField
                    select
                    size="small"
                    label="PACER Stage"
                    value={annotationPacerStage}
                    onChange={(e) => setAnnotationPacerStage(e.target.value)}
                    SelectProps={{
                      native: true,
                    }}
                    sx={{ minWidth: 120 }}
                  >
                    <option value=""></option>
                    <option value="P">Prospect</option>
                    <option value="A">Assess</option>
                    <option value="C">Challenge</option>
                    <option value="E">Execute</option>
                    <option value="R">Retain</option>
                  </TextField>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddCommentIcon />}
                onClick={handleAddAnnotation}
                disabled={!newAnnotation || submittingAnnotation}
              >
                {submittingAnnotation ? <CircularProgress size={24} /> : 'Add Annotation'}
              </Button>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Annotation List */}
            <Typography variant="subtitle1" gutterBottom>
              Annotations ({annotations.length})
            </Typography>
            {annotations.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No annotations yet. Add the first one!
              </Typography>
            ) : (
              annotations
                .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
                .map((annotation) => (
                  <Paper 
                    key={annotation.id} 
                    variant="outlined" 
                    sx={{ p: 2, mb: 2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        icon={getAnnotationIcon(annotation.annotation_type)} 
                        label={formatTime(annotation.timestamp_seconds)}
                        color={getAnnotationColor(annotation.annotation_type)}
                        size="small"
                        variant="outlined"
                        onClick={() => setCurrentTime(annotation.timestamp_seconds)}
                        sx={{ mr: 1 }}
                      />
                      {annotation.pacer_stage && (
                        <Chip
                          label={`PACER: ${annotation.pacer_stage}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">
                      {annotation.content}
                    </Typography>
                  </Paper>
                ))
            )}
          </Box>
        )}
        
        {/* Bookmarks Tab */}
        {selectedTab === 1 && (
          <Box sx={{ p: 2 }}>
            {/* New Bookmark Form */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Add Bookmark at {formatTime(currentTime)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Bookmark label..."
                  value={newBookmark}
                  onChange={(e) => setNewBookmark(e.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddBookmark}
                  disabled={!newBookmark || submittingBookmark}
                >
                  {submittingBookmark ? <CircularProgress size={24} /> : 'Add'}
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Bookmark List */}
            <Typography variant="subtitle1" gutterBottom>
              Bookmarks ({bookmarks.length})
            </Typography>
            {bookmarks.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No bookmarks yet. Add the first one!
              </Typography>
            ) : (
              bookmarks
                .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
                .map((bookmark) => (
                  <Chip
                    key={bookmark.id}
                    icon={<BookmarkIcon />}
                    label={`${formatTime(bookmark.timestamp_seconds)} - ${bookmark.label}`}
                    onClick={() => jumpToBookmark(bookmark.timestamp_seconds)}
                    sx={{ m: 0.5 }}
                    color="primary"
                    variant="outlined"
                  />
                ))
            )}
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </Box>
    </Box>
  );
};

export default RecordingPlayback; 