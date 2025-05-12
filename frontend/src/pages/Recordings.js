import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material';
import RecordingsList from '../components/RecordingsList';
import RecordingPlayback from '../components/RecordingPlayback';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AddIcon from '@mui/icons-material/Add';
import apiService from '../services/api';

const Recordings = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);

  useEffect(() => {
    fetchCompletedSessions();
  }, []);

  // Fetch completed sessions that can be recorded
  const fetchCompletedSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.sessions.getAll();
      
      console.log("All sessions:", response.data);
      
      // Filter for completed sessions
      const completedSessions = response.data.filter(session => 
        session.is_completed === true
      );
      
      console.log("Completed sessions:", completedSessions);
      
      // Make sure these sessions are properly displayed in the UI
      if (completedSessions.length > 0) {
        setSessionsList(completedSessions);
        // Automatically select the first session
        handleSessionSelect(completedSessions[0]);
      } else {
        setSessionsList([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load completed sessions. Please try again.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleCreateDialogOpen = () => {
    setOpenCreateDialog(true);
  };

  const handleCreateDialogClose = () => {
    setOpenCreateDialog(false);
    setSelectedSession(null);
    setTitle('');
    setDescription('');
    setCreateError('');
  };

  const handleSessionSelect = (session) => {
    console.log("Selected session:", session);
    setSelectedSession(session);
    setTitle(`Recording: ${session.scenario?.title || 'Untitled Scenario'}`);
  };

  const handleCreateRecording = async () => {
    if (!selectedSession || !title) {
      console.log("Cannot create recording - missing data:", {
        selectedSession: selectedSession ? "Present" : "Missing",
        title: title ? "Present" : "Missing"
      });
      return;
    }

    try {
      setCreating(true);
      setCreateError('');
      
      // Calculate duration in seconds
      const duration = selectedSession.end_time && selectedSession.start_time
        ? Math.floor((new Date(selectedSession.end_time) - new Date(selectedSession.start_time)) / 1000)
        : 600; // Default 10 minutes if times not available
      
      console.log("Creating recording with data:", {
        session_id: selectedSession.id,
        title,
        description: description || undefined,
        duration_seconds: duration
      });
      
      // Create the recording
      const response = await apiService.recordings.create({
        session_id: selectedSession.id,
        title: title,
        description: description || undefined,
        duration_seconds: duration
      });
      
      console.log("Recording created:", response.data);
      
      // Close dialog and refresh
      handleCreateDialogClose();
      setCreating(false);
      
      // Move to "My Recordings" tab
      setSelectedTab(0);
    } catch (error) {
      console.error('Error creating recording:', error);
      setCreateError('Failed to create recording. Please try again.');
      setCreating(false);
    }
  };

  const handleSelectRecording = (recording) => {
    console.log("handleSelectRecording called with:", recording);
    setSelectedRecording(recording);
  };

  const handleClosePlayback = () => {
    setSelectedRecording(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <VideoLibraryIcon sx={{ mr: 1 }} /> Recordings
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateDialogOpen}
        >
          Create Recording
        </Button>
      </Box>

      {/* Debug button to force load a specific recording */}
      <Box textAlign="center" mb={2}>
        <Button 
          variant="outlined" 
          color="secondary"
          onClick={async () => {
            console.log("Debug: Loading recording ID 5");
            try {
              const response = await apiService.recordings.get(5);
              console.log("Debug: Got recording data:", response.data);
              setSelectedRecording(response.data);
            } catch (err) {
              console.error("Debug: Error loading recording:", err);
            }
          }}
        >
          Debug: Load Recording #5
        </Button>
      </Box>

      {selectedRecording ? (
        <Box>
          <Button onClick={handleClosePlayback} variant="outlined" sx={{ mb: 2 }}>
            Back to Recordings
          </Button>
          <Paper sx={{ p: 3 }}>
            <RecordingPlayback recording={selectedRecording} onClose={handleClosePlayback} />
          </Paper>
        </Box>
      ) : (
        <>
          <Paper sx={{ mb: 3 }}>
            <Tabs value={selectedTab} onChange={handleTabChange} centered>
              <Tab label="My Recordings" />
              <Tab label="Shared With Me" />
            </Tabs>
          </Paper>

          {selectedTab === 0 && (
            <RecordingsList onSelectRecording={handleSelectRecording} />
          )}

          {selectedTab === 1 && (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
              Recordings shared with you will appear here.
            </Typography>
          )}
        </>
      )}

      {/* Create Recording Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={handleCreateDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Recording</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
            Select a completed session to record:
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : sessionsList.length === 0 ? (
            <Typography variant="body1" sx={{ py: 2 }}>
              No completed sessions available. Complete a game session first.
            </Typography>
          ) : (
            <Box sx={{ maxHeight: '200px', overflowY: 'auto', mb: 3, border: '1px solid #ddd', borderRadius: 1 }}>
              {sessionsList.map(session => (
                <Box
                  key={session.id}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    bgcolor: selectedSession?.id === session.id ? 'action.selected' : 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }}
                  onClick={() => handleSessionSelect(session)}
                >
                  <Typography variant="subtitle2">
                    {session.scenario?.title || `Session ${session.id}`}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Completed: {session.end_time ? new Date(session.end_time).toLocaleDateString() : 'No end date'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <TextField
            margin="dense"
            label="Title"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={!selectedSession}
          />

          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!selectedSession}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCreateDialogClose}
            color="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateRecording}
            variant="contained"
            color="primary"
            disabled={!selectedSession || !title || creating}
          >
            {creating ? <CircularProgress size={24} /> : 'Create Recording'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Recordings; 