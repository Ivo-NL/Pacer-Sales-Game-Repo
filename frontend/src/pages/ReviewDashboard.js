import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RateReviewIcon from '@mui/icons-material/RateReview';
import FilterListIcon from '@mui/icons-material/FilterList';
import apiService from '../services/api';
import RecordingPlayback from '../components/RecordingPlayback';

const ReviewDashboard = () => {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showPlayback, setShowPlayback] = useState(false);

  // Fetch pending reviews on component mount
  useEffect(() => {
    fetchPendingReviews();
  }, []);

  // Fetch pending reviews from API
  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.recordings.getPendingReviews();
      setPendingReviews(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      setError('Failed to load pending reviews. Please try again.');
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format duration
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open review dialog
  const handleOpenReviewDialog = (recording) => {
    setSelectedRecording(recording);
    setOpenReviewDialog(true);
    setReviewScore(0);
    setReviewComment('');
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!selectedRecording || reviewScore === 0) return;

    try {
      setSubmittingReview(true);
      await apiService.recordings.submitReview(selectedRecording.recording_id, { review_score: reviewScore });
      
      // Add feedback annotation if there's a comment
      if (reviewComment.trim()) {
        await apiService.recordings.createAnnotation(selectedRecording.recording_id, {
          recording_id: selectedRecording.recording_id,
          timestamp_seconds: 0, // At the beginning of the recording
          content: reviewComment,
          annotation_type: 'suggestion',
          pacer_stage: '' // General feedback
        });
      }
      
      setSubmittingReview(false);
      setOpenReviewDialog(false);
      
      // Refresh the list of pending reviews
      fetchPendingReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmittingReview(false);
    }
  };

  // Handle view recording
  const handleViewRecording = async (recording) => {
    try {
      const recordingResponse = await apiService.recordings.get(recording.recording_id);
      setSelectedRecording(recordingResponse.data);
      setShowPlayback(true);
    } catch (error) {
      console.error('Error fetching recording details:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (showPlayback && selectedRecording) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Button 
          onClick={() => setShowPlayback(false)} 
          variant="outlined" 
          sx={{ mb: 2 }}
        >
          Back to Review Dashboard
        </Button>
        <RecordingPlayback 
          recording={selectedRecording} 
          onClose={() => setShowPlayback(false)} 
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Review Dashboard
        </Typography>
        <Button 
          startIcon={<FilterListIcon />} 
          variant="outlined"
          disabled
        >
          Filter
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={fetchPendingReviews} size="small" sx={{ ml: 2 }}>
            Try Again
          </Button>
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Scenario</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" sx={{ py: 3 }}>
                      No pending reviews
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pendingReviews
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((review) => (
                    <TableRow key={review.recording_id}>
                      <TableCell>{review.title}</TableCell>
                      <TableCell>{review.username}</TableCell>
                      <TableCell>{review.scenario_title}</TableCell>
                      <TableCell>{formatDate(review.created_at)}</TableCell>
                      <TableCell>{formatDuration(review.duration_seconds)}</TableCell>
                      <TableCell align="right">
                        <Button
                          startIcon={<PlayArrowIcon />}
                          size="small"
                          onClick={() => handleViewRecording(review)}
                          sx={{ mr: 1 }}
                        >
                          View
                        </Button>
                        <Button
                          startIcon={<RateReviewIcon />}
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleOpenReviewDialog(review)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {pendingReviews.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={pendingReviews.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </Paper>

      {/* Submit Review Dialog */}
      <Dialog 
        open={openReviewDialog} 
        onClose={() => setOpenReviewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Submit Review
        </DialogTitle>
        <DialogContent>
          {selectedRecording && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                {selectedRecording.title}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {selectedRecording.username} - {selectedRecording.scenario_title}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Score (1-10):
              </Typography>
              <Box display="flex" alignItems="center" mb={3}>
                <Rating 
                  value={reviewScore} 
                  onChange={(event, newValue) => setReviewScore(newValue)}
                  max={10}
                  size="large" 
                />
                <Typography variant="h5" sx={{ ml: 2 }}>
                  {reviewScore}
                </Typography>
              </Box>
              <Typography variant="subtitle2" gutterBottom>
                Feedback (Optional):
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Add your feedback here..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReviewDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitReview} 
            variant="contained" 
            color="primary"
            disabled={!reviewScore || submittingReview}
          >
            {submittingReview ? <CircularProgress size={24} /> : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReviewDashboard; 