import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid, 
  Chip, 
  IconButton, 
  Menu, 
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CommentIcon from '@mui/icons-material/Comment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GetAppIcon from '@mui/icons-material/GetApp';
import RateReviewIcon from '@mui/icons-material/RateReview';
import apiService from '../services/api';

const RecordingsList = ({ onSelectRecording }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch recordings on component mount
  useEffect(() => {
    fetchRecordings();
  }, []);

  // Fetch recordings from API
  const fetchRecordings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.recordings.getAll();
      setRecordings(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError('Failed to load recordings. Please try again.');
      setLoading(false);
    }
  };

  // Handle menu open
  const handleMenuOpen = (event, recording) => {
    setAnchorEl(event.currentTarget);
    setSelectedRecording(recording);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  // Format duration
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Handle play recording
  const handlePlayRecording = (recording) => {
    console.log("PlayRecording clicked for:", recording);
    if (onSelectRecording) {
      console.log("Calling onSelectRecording callback");
      onSelectRecording(recording);
    } else {
      console.log("onSelectRecording callback not provided");
    }
    handleMenuClose();
  };

  // Handle share recording
  const handleShareClick = () => {
    setOpenShareDialog(true);
    handleMenuClose();
  };

  // Submit share
  const handleShareSubmit = async () => {
    if (!shareEmail) return;

    try {
      setSharingLoading(true);
      setShareError('');
      
      // First get user ID from email
      const usersResponse = await apiService.users.search(shareEmail);
      const users = usersResponse.data;
      
      if (users.length === 0) {
        setShareError('User not found');
        setSharingLoading(false);
        return;
      }
      
      const userId = users[0].id;
      
      // Share the recording
      await apiService.recordings.share(selectedRecording.id, {
        user_id: userId,
        recording_id: selectedRecording.id,
        permission_level: sharePermission
      });
      
      setOpenShareDialog(false);
      setShareEmail('');
      setSharePermission('view');
      setSharingLoading(false);
      
      // Refresh recordings to show updated share status
      fetchRecordings();
    } catch (error) {
      console.error('Error sharing recording:', error);
      setShareError('Failed to share recording. Please try again.');
      setSharingLoading(false);
    }
  };

  // Handle request review
  const handleRequestReview = async () => {
    try {
      await apiService.recordings.requestReview(selectedRecording.id);
      fetchRecordings();
      handleMenuClose();
    } catch (error) {
      console.error('Error requesting review:', error);
    }
  };

  // Handle delete recording
  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await apiService.recordings.delete(selectedRecording.id);
      setOpenDeleteDialog(false);
      setDeleteLoading(false);
      
      // Refresh recordings list
      fetchRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      setDeleteLoading(false);
    }
  };

  // Handle export recording
  const handleExport = async (format) => {
    try {
      await apiService.recordings.export(selectedRecording.id, {
        recording_id: selectedRecording.id,
        export_format: format
      });
      handleMenuClose();
    } catch (error) {
      console.error('Error exporting recording:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchRecordings} sx={{ mt: 2 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (recordings.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No recordings found
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Complete a game session to create a recording
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {recordings.map((recording) => (
          <Grid item xs={12} md={6} lg={4} key={recording.id}>
            <Card 
              variant="outlined" 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': { boxShadow: 2 }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" component="h2" noWrap>
                    {recording.title}
                  </Typography>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, recording)}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Created: {formatDate(recording.created_at)}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Duration: {formatDuration(recording.duration_seconds)}
                </Typography>
                
                {recording.description && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {recording.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', mt: 2, gap: 1, flexWrap: 'wrap' }}>
                  {recording.is_shared && (
                    <Chip size="small" icon={<ShareIcon />} label="Shared" color="info" />
                  )}
                  {recording.review_requested && !recording.is_reviewed && (
                    <Chip size="small" icon={<RateReviewIcon />} label="Review Requested" color="warning" />
                  )}
                  {recording.is_reviewed && (
                    <Chip 
                      size="small" 
                      icon={<RateReviewIcon />} 
                      label={`Reviewed: ${recording.review_score || '-'}/10`} 
                      color="success" 
                    />
                  )}
                </Box>
              </CardContent>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                <Button
                  startIcon={<PlayArrowIcon />}
                  size="small"
                  onClick={() => handlePlayRecording(recording)}
                >
                  Play
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Recording Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handlePlayRecording(selectedRecording)}>
          <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
          Play Recording
        </MenuItem>
        <MenuItem onClick={handleShareClick}>
          <ShareIcon fontSize="small" sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <MenuItem onClick={handleRequestReview}>
          <RateReviewIcon fontSize="small" sx={{ mr: 1 }} />
          Request Review
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>
          <GetAppIcon fontSize="small" sx={{ mr: 1 }} />
          Export as PDF
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} color="error" />
          Delete
        </MenuItem>
      </Menu>
      
      {/* Share Dialog */}
      <Dialog open={openShareDialog} onClose={() => setOpenShareDialog(false)}>
        <DialogTitle>Share Recording</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="User Email"
            type="email"
            fullWidth
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            error={Boolean(shareError)}
            helperText={shareError}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            label="Permission Level"
            value={sharePermission}
            onChange={(e) => setSharePermission(e.target.value)}
            fullWidth
          >
            <MenuItem value="view">View Only</MenuItem>
            <MenuItem value="comment">Comment</MenuItem>
            <MenuItem value="edit">Edit</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShareDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleShareSubmit} 
            disabled={!shareEmail || sharingLoading}
            color="primary"
            variant="contained"
          >
            {sharingLoading ? <CircularProgress size={24} /> : 'Share'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Recording</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this recording? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            disabled={deleteLoading}
            color="error"
            variant="contained"
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordingsList; 