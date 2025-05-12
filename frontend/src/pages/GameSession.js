  // GameSession.js
  import React, { useState, useEffect, useRef, useCallback } from 'react';
  import {
    Container, Grid, Typography, Box, Button, CircularProgress, Paper,
    TextField, Divider, LinearProgress, Chip, Card, CardContent, Alert,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Avatar, Radio, RadioGroup, FormControlLabel, FormControl, Tooltip,
    IconButton, Menu, MenuItem, useTheme, Snackbar, ListItemIcon, ListItemText,
    Switch, FormGroup, Accordion, AccordionSummary, AccordionDetails, List, ListItem
  } from '@mui/material';
  import { useParams, useNavigate } from 'react-router-dom';
  import SendIcon from '@mui/icons-material/Send';
  import AssessmentIcon from '@mui/icons-material/Assessment';
  import AccessTimeIcon from '@mui/icons-material/AccessTime';
  import WarningIcon from '@mui/icons-material/Warning';
  import PauseIcon from '@mui/icons-material/Pause';
  import PlayArrowIcon from '@mui/icons-material/PlayArrow';
  import CheckCircleIcon from '@mui/icons-material/CheckCircle';
  import InfoIcon from '@mui/icons-material/Info';
  import FlagIcon from '@mui/icons-material/Flag';
  import TimerIcon from '@mui/icons-material/Timer';
  import StopIcon from '@mui/icons-material/Stop';
  import ExitToAppIcon from '@mui/icons-material/ExitToApp';
  import EventIcon from '@mui/icons-material/Event';

  import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
  import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
  import apiService from '../services/api';
  import FeedbackCard from '../components/FeedbackCard'; 
  import SettingsVoiceIcon from '@mui/icons-material/SettingsVoice';
  import { useVoice } from '../context/VoiceContext'; // <<< Import context hook
  import ScorePanel from '../components/ScorePanel';
  import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
  import ScienceIcon from '@mui/icons-material/Science';
  import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';
  import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
  import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
  import { hydrateServerTs } from '../utils/messageUtils';

  const GameSession = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const realtimeVoice = useVoice();
    
    // References
    const messagesContainerRef = useRef(null);
    const ws = useRef(null);
    const initializationRef = useRef(false);
    const scoreTimerRef = useRef(null); // Add this ref for score fetch timing
    // Add these back
    const pollIntervalRef = useRef(null);  // For timer polling interval
    const pollDelayRef = useRef(60000);    // Default to 60 seconds
    const firstLoadDoneRef = useRef(false); // Track if first load is done
    
    // Function to merge arrays by ID - memoized for performance
    const mergeById = useCallback((oldArr, newArr) => {
      // Hydrate all messages with server_ts and isUser
      const hydratedOld = oldArr.map(hydrateServerTs);
      const hydratedNew = newArr.map(hydrateServerTs);
      // Create a map of existing messages by ID
      const byId = Object.fromEntries(hydratedOld.map(m => {
        const key = `${m._id || `${m.sender}-${m.timestamp}`}-${m.sender}`;
        return [key, m];
      }));
      
      // Debug output in development
      if (process.env.NODE_ENV !== 'production') {
        console.log("=== MERGING MESSAGES ===");
        console.log("Existing messages:", Object.keys(byId).length);
        console.log("New messages:", newArr.length);
      }
      
      // Process new messages
      let duplicateCount = 0;
      let pendingReplacedCount = 0;
      
      hydratedNew.forEach(m => { 
        // Generate a key for the map lookup that includes the sender
        const key = `${m._id || `${m.sender}-${m.timestamp}`}-${m.sender}`;
        
        // Check if this exact message already exists
        if (byId[key]) {
          duplicateCount++;
          if (process.env.NODE_ENV !== 'production') {
            console.log("Duplicate by ID found:", key, m.sender, m.text?.slice(0, 30));
          }
          return; // Skip exact ID matches
        }
        
        // Helper to normalize strings by trimming and replacing multiple spaces with a single space
        const normalizeString = (s) => (s || '').trim().replace(/\s+/g, ' ');
        
        // SPECIAL CASE: Check if there's a message with the same content but different ID
        // This handles the streaming placeholder vs server-persisted message case
        const contentMatch = Object.values(byId).find(
          existingMsg => 
            existingMsg.sender === m.sender && 
            normalizeString(existingMsg.text) === normalizeString(m.text) &&
            existingMsg.text.trim() !== '' // Don't match on empty messages
        );
        
        if (contentMatch) {
          // If one is pending and the other isn't, keep the non-pending (server) version
          if (contentMatch.pending && !m.pending) {
            // Replace the pending message with the permanent one from server
            const contentMatchKey = `${contentMatch._id || `${contentMatch.sender}-${contentMatch.timestamp}`}-${contentMatch.sender}`;
            const newKey = `${m._id || `${m.sender}-${m.timestamp}`}-${m.sender}`;
            delete byId[contentMatchKey];   // Throw away the temp key
            byId[newKey] = m;               // Re-insert under the real key
            pendingReplacedCount++;
            
            if (process.env.NODE_ENV !== 'production') {
              console.log("Replaced pending message with server version:", 
                m.sender, m.text?.slice(0, 30));
            }
          } else if (!contentMatch.pending && m.pending) {
            // Skip this message as we already have a non-pending version
            duplicateCount++;
            if (process.env.NODE_ENV !== 'production') {
              console.log("Skipping pending duplicate of existing message:", 
                m.sender, m.text?.slice(0, 30));
            }
          } else {
            // Both are either pending or not pending, just count as duplicate
            duplicateCount++;
            if (process.env.NODE_ENV !== 'production') {
              console.log("Content duplicate found:", 
                m.sender, m.text?.slice(0, 30));
            }
          }
          return; // Skip to next message after handling the special case
        }
        
        // If we get here, it's a new unique message - add it to the map
        byId[key] = m;
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Skipped ${duplicateCount} duplicates`);
        console.log(`Replaced ${pendingReplacedCount} pending messages with server versions`);
        console.log("Final message count:", Object.keys(byId).length);
        console.log("========================");
      }
      
      // Return sorted result
      return Object.values(byId).sort((a, b) => {
        // 1. Sort by sequence if both present
        if (a.sequence != null && b.sequence != null && a.sequence !== b.sequence) {
          return a.sequence - b.sequence;
        }
        // 2. Fallback to timestamp
        if (a.server_ts !== b.server_ts) {
          return a.server_ts - b.server_ts;
        }
        // 3. User before assistant
        if ((a.isUser ? 0 : 1) !== (b.isUser ? 0 : 1)) {
          return (a.isUser ? 0 : 1) - (b.isUser ? 0 : 1);
        }
        // 4. Fallback to _id
        return (a._id || '').localeCompare(b._id || '');
      });
    }, []);
    
    // Basic session state
    const [messages, setMessages] = useState([]);
    const [userDraft, setUserDraft] = useState('');
    const [aiDraft,   setAiDraft]   = useState('');
    const [sessionData, setSessionData] = useState(null);
    const [client, setClient] = useState({
      name: '',
      role: '',
      company: '',
      industry: '',
      background: '',
      painPoints: [],
      objectives: []
    });
    const [sessionComplete, setSessionComplete] = useState(false);
    const [isResponseLoading, setIsResponseLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Loading session...');
    const [error, setError] = useState(null);
    const [voiceMode, setVoiceMode] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
    const [isRealtimeMode, setIsRealtimeMode] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimedSession, setIsTimedSession] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
    const [showMobileWarning, setShowMobileWarning] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [sessionScores, setSessionScores] = useState({
      overall: 0,
      methodology: 0,
      rapport: 0,
      progress: 0,
      outcome: 0
    });
    // State for scenario context used by realtime voice
    const [scenarioContext, setScenarioContext] = useState(null);
    
    // Additional state variables
    const [currentScore, setCurrentScore] = useState(0);
    const [evaluationTooltips, setEvaluationTooltips] = useState({});
    const timerRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isManuallyPaused, setIsManuallyPaused] = useState(false);
    const [remainingPauses, setRemainingPauses] = useState(2);
    const [previousScore, setPreviousScore] = useState(null);
    const [pillarScores, setPillarScores] = useState({
      exec: 0,
      meth: 0,
      prog: 0
    });
    const [goalProgress, setGoalProgress] = useState({
      current: 0,
      target: 80
    });
    const [finalScore, setFinalScore] = useState(0);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [timerRunning, setTimerRunning] = useState(true);
    const [expandedAccordion, setExpandedAccordion] = useState(null);
    const [timerInitialized, setTimerInitialized] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    
    // Snackbar for notifications
    const [snackbar, setSnackbar] = useState({
      open: false,
      message: '',
      severity: 'info'
    });
    
    // Function to show snackbar notifications
    const handleSnackbar = useCallback((message, severity = 'info') => {
      setSnackbar({
        open: true,
        message,
        severity
      });
    }, []); // useCallback ensures this function doesn't change unnecessarily
    
    // Toggle audio mode between text and voice input
    const toggleAudioMode = (event) => {
      const checked = event.target.checked;
      setVoiceMode(checked);
      
      handleSnackbar(
        checked 
          ? 'Voice mode enabled. Click the microphone to speak.' 
          : 'Voice mode disabled',
        'info'
      );
      
      // When toggling voice mode off, make sure realtime mode is disabled to avoid collision
      if (!checked && isRealtimeMode) {
        setIsRealtimeMode(false);
      }
      
      // When standard voice mode is enabled, ensure realtime mode is off to avoid collision
      // This will use the existing voice transport state management system
      if (checked && isRealtimeMode) {
        setIsRealtimeMode(false);
      }
    };
    
    // WebSocket initialization for voice mode
    const initializeWebSocket = async () => {
      try {
        // Skip if realtime mode is active - prevent collision
        if (isRealtimeMode) {
          console.log('Skipping standard WebSocket initialization because realtime mode is active');
          return;
        }
        
        // Get WebSocket URL from API
        const wsUrl = await apiService.sessions.getAudioStreamUrl(sessionId);
        console.log('Connecting to WebSocket:', wsUrl);
        
        if (!wsUrl) {
          handleSnackbar('Failed to get WebSocket URL', 'error');
          return;
        }
        
        // Clear any previous connection
        if (ws.current) {
          ws.current.close();
          ws.current = null;
        }
        
        // Create new WebSocket connection
        const newWs = new WebSocket(wsUrl);
        ws.current = newWs;
        
        newWs.onopen = () => {
          console.log('WebSocket connection opened');
          handleSnackbar('Audio streaming connected', 'success');
        };
        
        newWs.onclose = () => {
          console.log('WebSocket connection closed');
        };
        
        newWs.onerror = (error) => {
          console.error('WebSocket error:', error);
          handleSnackbar('Error connecting to audio service', 'error');
        };
      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        handleSnackbar('Failed to initialize audio streaming', 'error');
      }
    };

    // Load session data from API with throttling
    const loadSessionData = useCallback(async () => {
      if (!sessionId) return;
      
      // Add debounce to prevent excessive polling
      const lastDataFetchTime = sessionStorage.getItem(`session_data_fetch_${sessionId}`);
      const now = Date.now();
      
      // Only fetch if we haven't fetched in the last 3 seconds (unless it's an explicit user-initiated request)
      if (lastDataFetchTime && now - parseInt(lastDataFetchTime, 10) < 3000 && !initializationRef.current) {
        console.log("Throttling session data fetch - too frequent");
        return;
      }
      
      // Record this fetch time
      sessionStorage.setItem(`session_data_fetch_${sessionId}`, now.toString());
      
      try {
        setLoading(true);
        setError('');
        
        // Fetch session data
        console.log(`GameSession: Loading session data for ID ${sessionId}`);
        const data = await apiService.sessions.getById(sessionId);
        
        // Set session data and check if complete
        setSessionData(data);
        setSessionComplete(!!data.is_completed);
        
        // Load client persona if available
        if (data.client_persona) {
          // Only try to get score data for completed sessions
          if (data.is_completed) {
            console.log("Loading final scores from backend for completed session...");
            try {
              // Get the official score from the backend
              const scoreData = await apiService.sessions.getScore(sessionId);
              console.log("Loaded final score data from backend:", {
                current: scoreData.total_score,
                methodology: scoreData.methodology_score,
                rapport: scoreData.rapport_score,
                progress: scoreData.progress_score,
                outcome: scoreData.outcome_score
              });
              
              // Use backend scores as the source of truth for completed sessions
              setCurrentScore(scoreData.total_score || 0);
              setFinalScore(scoreData.total_score || 0);
              
              setSessionScores({
                overall: scoreData.total_score || 0,
                methodology: scoreData.methodology_score || 0,
                rapport: scoreData.rapport_score || 0,
                progress: scoreData.progress_score || 0,
                outcome: scoreData.outcome_score || 0
              });
              
              setPillarScores({
                exec: scoreData.rapport_score || 0,
                meth: scoreData.methodology_score || 0,
                prog: ((scoreData.progress_score || 0) + (scoreData.outcome_score || 0)) / 2
              });
            } catch (error) {
              // If score data isn't available yet even for completed session
              console.log("Score data not available for completed session:", error.message);
            }
          } else {
            // For active sessions, we'll calculate scores from evaluations instead of fetching
            console.log("Active session - scores will be calculated from evaluations");
          }
        }
        
        // For completed sessions, set the final score from sessionData.total_score
        if (data.is_completed && data.total_score !== undefined) {
          setFinalScore(data.total_score);
          setCurrentScore(data.total_score);
        }
        
        // Calculate session duration for completed sessions
        if (data.is_completed && data.end_time && data.start_time) {
          try {
            const startDate = new Date(data.start_time);
            const endDate = new Date(data.end_time);
            const duration = Math.round((endDate - startDate) / 1000);
            console.log(`Session duration calculated: ${duration} seconds from ${startDate} to ${endDate}`);
            setSessionDuration(duration > 0 ? duration : 0);
          } catch (err) {
            console.error("Error calculating session duration:", err);
            setSessionDuration(0);
          }
        }
        
        // Extract client info
        console.log("Session data received:", data);

        // Client data is in data.scenario.client_personas[0] for most scenarios
        let clientData = {};
        if (data.scenario && data.scenario.client_personas && data.scenario.client_personas.length > 0) {
          // Get the first client persona
          clientData = data.scenario.client_personas[0];
          console.log("Found client persona:", clientData);
        } else if (data.client) {
          clientData = data.client;
        } else {
          clientData = data;
        }
        
        // Format challenges and objectives which could be arrays or strings
        const formatList = (value) => {
          if (Array.isArray(value)) return value.join(', ');
          return value || '';
        };

        const challenges = clientData.challenges || clientData.pain_points || clientData.client_challenges || '';
        const objectives = clientData.objectives || clientData.goals || clientData.client_objectives || '';

        setClient({
          name: clientData.name || clientData.client_name || 'Unknown Client',
          role: clientData.role || clientData.client_role || 'Unknown Role',
          company: clientData.company || clientData.client_company || 'Unknown Company',
          industry: clientData.industry || clientData.client_industry || 'Unknown Industry',
          background: clientData.background || clientData.client_background || 'No background available',
          challenges: formatList(challenges) || 'No specific challenges mentioned.',
          objectives: formatList(objectives) || 'No specific objectives mentioned'
        });
        
        // Also update scenario context with similar fallback logic
        setScenarioContext({
          clientName: clientData.name || clientData.client_name || 'Unknown Client',
          clientRole: clientData.role || clientData.client_role || 'Unknown Role',
          clientCompany: clientData.company || clientData.client_company || 'Unknown Company',
          clientIndustry: clientData.industry || clientData.client_industry || 'Unknown Industry',
          pacerStage: data.current_stage || data.pacer_stage || 'P',
          productFocus: data.product_focus || data.product || ''
        });
        
        // Check if there are any messages to load
        if (data.interactions && data.interactions.length > 0) {
          // IMPROVED: Create paired messages from interactions with deterministic IDs
          const formattedMessages = [];
          
          data.interactions.forEach(interaction => {
            // Create unique deterministic IDs based on content instead of random values
            const timestamp = interaction.timestamp || new Date().toISOString();
            // Prefer server-side ID if available, otherwise create a deterministic hash
            const createDeterministicId = (role, content) => {
              const contentHash = (content || '')
                .trim()
                .slice(0, 30)
                .replace(/\s+/g, '_');
              return `${role}-${timestamp}-${contentHash}`;
            };
            
            // Base ID to use for the interaction
            const baseId = interaction._id || interaction.id || timestamp;
            
            // 1. Add user message if it exists
            if (interaction.player_input && interaction.player_input.trim()) {
              formattedMessages.push(hydrateServerTs({
                sender : 'user',
                text   : interaction.player_input,
                timestamp,
                _id    : `${baseId}-u`,
                pending: false
              }));
            }
            
            // 2. Add assistant message if it exists
            if (interaction.ai_response && interaction.ai_response.trim()) {
              formattedMessages.push(hydrateServerTs({
                sender : 'assistant',
                text   : interaction.ai_response,
                timestamp,
                _id    : `${baseId}-a`,
                pending: false
              }));
            }
          });
          
          // Sort messages by timestamp for proper chronological order
          formattedMessages.sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
          });
          
          // DEBUG: Log the message IDs to help diagnose duplicates
          if (process.env.NODE_ENV !== 'production') {
            console.log("=== FORMATTED MESSAGES ===");
            formattedMessages.forEach(m => console.log(m._id, m.sender, m.text.slice(0, 30)));
            console.log("========================");
          }
          
          // Set formatted messages, using first load detection
          if (!firstLoadDoneRef.current) {
            setMessages(formattedMessages);
            firstLoadDoneRef.current = true;
          } else {
            // merge instead of replace
            setMessages(prev => mergeById(prev, formattedMessages));
          }
        }
        
        console.log("Session data load complete, component initialized.");
        
      } catch (err) {
        console.error('Error loading session data:', err);
        setError('Failed to load session data. Please refresh or try again later.');
      } finally {
        // If this was the initial load, mark initialization as complete
        if (initializationRef.current) {
          initializationRef.current = false;
        }
        setLoading(false);
      }
    }, [sessionId, setCurrentScore, setFinalScore, setSessionScores, setPillarScores, setSessionDuration]);

    // Helper function to sort interactions by timestamp to ensure consistent ordering
    const sortInteractionsByTimestamp = (interactions) => {
      if (!interactions || !Array.isArray(interactions)) return [];
      return [...interactions].map(hydrateServerTs).sort((a, b) => {
        if (a.server_ts !== b.server_ts) return a.server_ts - b.server_ts;
        if ((a.isUser ? 0 : 1) !== (b.isUser ? 0 : 1)) return (a.isUser ? 0 : 1) - (b.isUser ? 0 : 1);
        return (a._id || '').localeCompare(b._id || '');
      });
    };

    // Message handling functions
    const addMessage = useCallback((newMessage) => {
      console.log("GameSession: addMessage called with:", newMessage); // <<< ADD LOG
      /* ----- NORMALISE ------------------------------------------------------ */
      if (typeof newMessage === 'string') {
        newMessage = { role: 'user', content: newMessage };
      }
      if (!newMessage || !newMessage.content) return;

      const timestamp = new Date().toISOString();
      
      // Generate deterministic ID based on content instead of random value
      const createDeterministicId = (role, content) => {
        const contentHash = (content || '')
          .trim()
          .slice(0, 30)
          .replace(/\s+/g, '_');
        return `${role}-${timestamp}-${contentHash}`;
      };
      
      const messageId = newMessage._id || 
                        createDeterministicId(newMessage.role, newMessage.content);

      // Determine sender from role attribute
      const sender = newMessage.role === 'user' ? 'user' : 'assistant';
      
      const msgObj = {
        sender,
        text: newMessage.content,
        timestamp: newMessage.timestamp || timestamp,
        _id: messageId
      };

      /* ----- 1️⃣  UI - WITH DEDUPLICATION ------------------------------------ */
      setMessages(prev => {
        // Enhanced duplicate detection
        const isDuplicate = prev.some(msg => 
          // Match by ID if available (most reliable)
          (messageId && msg._id === messageId) ||
          // Or match by content and sender (within last 10 seconds)
          (msg.sender === sender && 
           msg.text === newMessage.content &&
           // Only consider messages from the last 10 seconds to avoid false positives
           (new Date() - new Date(msg.timestamp)) < 10000)
        );
        
        if (isDuplicate) {
          console.log("Skipping duplicate message:", newMessage.content.substring(0, 30) + "...");
          return prev;
        }
        
        return [...prev, msgObj];
      });

      /* ----- 2️⃣  PERSISTED STATE ------------------------------------------- */
      setSessionData(prev => {
        if (!prev) return prev;
        
        const updatedMsgs = [...(prev.messages || []), newMessage];

        // Use the existing interactions array if available, or create a new one
        const interactions = sortInteractionsByTimestamp([...(prev.interactions || [])]);
        
        if (sender === 'user') {
          // First check if this exact message already exists in interactions
          const existingUserMsgIndex = interactions.findIndex(i => 
            i.player_input === msgObj.text && 
            Math.abs(new Date(i.timestamp) - new Date(msgObj.timestamp)) < 10000
          );
          
          if (existingUserMsgIndex >= 0) {
            console.log("Found existing user interaction, skipping duplicate");
            return prev;
          }
          
          // Add a new interaction with player input
          interactions.push({ 
            player_input: msgObj.text, 
            ai_response: '', 
            timestamp: msgObj.timestamp 
          });
        } else if (sender === 'assistant') {
          // Check for duplication based on ai_response content
          const existingAiMsgIndex = interactions.findIndex(i => 
            i.ai_response === msgObj.text &&
            Math.abs(new Date(i.timestamp) - new Date(msgObj.timestamp)) < 10000
          );
          
          if (existingAiMsgIndex >= 0) {
            console.log("Found existing AI interaction, skipping duplicate");
            return prev;
          }
          
          // Find the last interaction without an AI response
          const lastInteractionIdx = interactions.findIndex(i => !i.ai_response);
          
          if (lastInteractionIdx >= 0) {
            // Update the existing interaction
            interactions[lastInteractionIdx] = {
              ...interactions[lastInteractionIdx],
              ai_response: msgObj.text,
              timestamp: interactions[lastInteractionIdx].timestamp || msgObj.timestamp
            };
          } else {
            // If all interactions have AI responses, add as a new standalone AI message
            console.log("All interactions have AI responses, adding as standalone AI message");
            interactions.push({ 
              player_input: '', 
              ai_response: msgObj.text, 
              timestamp: msgObj.timestamp 
            });
          }
        }

        return { ...prev, messages: updatedMsgs, interactions };
      });
    }, [setMessages, setSessionData]); // <<< CORRECTED DEPENDENCY ARRAY

    const handleTranscriptReady = useCallback((segments) => {
      // Simply display the received segments in the UI
      segments.forEach(({ sender, text }) => {
        addMessage({ role: sender, content: text });
      });
      
      // No need to fetch additional transcripts - they're saved as regular interactions
      // and will be loaded when the session data is refreshed
    }, [addMessage]);
    
    const handleUserTranscriptChunk = useCallback(chunk => {
      // accumulate into your local `userDraft` field (green bubble in progress)
      setUserDraft(i => i + chunk);
    }, [setUserDraft]);

    // Define fetchCurrentScore function at component level so it can be used anywhere
    // MOVED UP: Define this before any functions that depend on it
    const fetchCurrentScore = useCallback(async () => {
      if (!sessionId || sessionComplete || loading) return;
      
      // Add debounce to prevent excessive polling
      const lastScoreTime = sessionStorage.getItem(`score_poll_${sessionId}`);
      const now = Date.now();
      
      // Only fetch if we haven't fetched in the last 3 seconds
      if (lastScoreTime && now - parseInt(lastScoreTime, 10) < 3000) {
        console.log("Throttling score poll - too frequent");
        return;
      }
      
      // Record this fetch time
      sessionStorage.setItem(`score_poll_${sessionId}`, now.toString());
      
      try {
        console.log("Fetching current score for active session...");
        const scoreData = await apiService.sessions.getCurrentScore(sessionId);
        
        // Check if we got actual score data
        if (scoreData && Object.keys(scoreData).length > 0) {
          // Update all score state based on backend data
          setSessionScores({
            overall: scoreData.total_score || 0,
            methodology: scoreData.methodology_score || 0,
            rapport: scoreData.rapport_score || 0,
            progress: scoreData.progress_score || 0,
            outcome: scoreData.outcome_score || 0
          });
          
          // Save previous score for delta display
          setPreviousScore(currentScore);
          
          // Update current score directly from backend
          setCurrentScore(scoreData.total_score || 0);
          
          // Update pillar scores directly from backend
          setPillarScores({
            exec: scoreData.rapport_score || 0,
            meth: scoreData.methodology_score || 0,
            prog: ((scoreData.progress_score || 0) + (scoreData.outcome_score || 0)) / 2
          });
          
          // Update projected final score
          setFinalScore(scoreData.total_score || 0);
          
          console.log("Updated current score from backend:", {
            currentScore: scoreData.total_score,
            breakdown: scoreData.detailed_breakdown
          });
        } else {
          console.log("No meaningful score data available yet for active session");
        }
      } catch (error) {
        // Don't show errors for expected 404s (no score yet)
        if (error.response && error.response.status === 404) {
          console.log("Current score endpoint returned 404 - waiting for scores");
        } else {
          console.error("Error fetching current scores:", error);
        }
      }
    }, [sessionId, sessionComplete, loading, currentScore, setPreviousScore]);

    // Process evaluation data from stream responses to update scores in real-time
    const processEvaluationData = useCallback((evaluation) => {
      if (!evaluation) return;
      
      console.log("Received evaluation data:", evaluation);
      
      // Store raw scores for tooltip display
      setSessionScores(prev => ({
        overall: prev.overall,
        methodology: evaluation.methodology_score || 0,
        rapport: evaluation.rapport_score || 0,
        progress: evaluation.progress_score || 0,
        outcome: evaluation.outcome_score || 0
      }));
      
      // Update evaluation tooltips for feedback
      if (evaluation.feedback) {
        setEvaluationTooltips(prev => ({
          ...prev,
          methodology: evaluation.feedback.methodology || prev.methodology,
          rapport: evaluation.feedback.rapport || prev.rapport,
          progress: evaluation.feedback.progress || prev.progress,
          outcome: evaluation.feedback.outcome || prev.outcome
        }));
      }
      
      // Update sessionData with evaluation data
      setSessionData(prev => {
        if (!prev) return prev;
        
        // First, sort interactions to ensure consistency
        const sortedInteractions = sortInteractionsByTimestamp(prev.interactions || []);
        
        return {
          ...prev,
          interactions: sortedInteractions,
          // Add evaluation data to latest session data
          evaluation: {
            ...(prev.evaluation || {}),
            methodology_score: evaluation.methodology_score || prev.evaluation?.methodology_score || 0,
            rapport_score: evaluation.rapport_score || prev.evaluation?.rapport_score || 0,
            progress_score: evaluation.progress_score || prev.evaluation?.progress_score || 0,
            outcome_score: evaluation.outcome_score || prev.evaluation?.outcome_score || 0,
            feedback: {
              ...(prev.evaluation?.feedback || {}),
              ...(evaluation.feedback || {})
            }
          }
        };
      });
      
      // Save the evaluation update to the backend
      if (sessionId) {
        clearTimeout(scoreTimerRef.current);
        scoreTimerRef.current = setTimeout(() => {
          fetchCurrentScore();
        }, 3000);
      }
    }, [sessionId, fetchCurrentScore]);

    // Modify the effect for updating current scores from the backend for active sessions
    useEffect(() => {
      // Only fetch current scores for active sessions
      if (sessionId && !sessionComplete && !loading) {
        // Initial fetch happens immediately without throttling
        fetchCurrentScore();
        
        // Record this fetch time in localStorage for potential throttling
        localStorage.setItem(`active_score_fetch_${sessionId}`, Date.now().toString());
        
        // Clean up on unmount - clear any pending score fetch timer
        return () => {
          clearTimeout(scoreTimerRef.current);
          localStorage.removeItem(`active_score_fetch_${sessionId}`);
        };
      }
    }, [sessionId, sessionComplete, loading, fetchCurrentScore]); // Updated dependencies

    // Send a User message
    const handleSendMessage = useCallback(async () => {
      console.error("!!!! TEXT handleSendMessage CALLED UNEXPECTEDLY !!!!"); // <<< ADD THIS LOG
      // <<< UNCOMMENT THIS BLOCK >>>
      
      // <<< UPDATED CHECK >>> Use context state
      if (realtimeVoice.isRealtimeMode) {
        console.warn("handleSendMessage called while in real-time mode. Ignoring.");
        return;
      }
      
      // Don't allow sending messages if session is paused, completed, or already loading a response
      // <<< UNCOMMENT realtimeVoice.isPaused CHECK >>>
      if (!userDraft.trim() || isResponseLoading || sessionComplete || realtimeVoice.isPaused) return;
      
      const messageText = userDraft.trim();
      setUserDraft('');
      setIsResponseLoading(true);
      // --- ATOMIC INSERT: Add user and assistant placeholder in one update ---
      // <<< UNCOMMENT realtimeVoice CHECKS >>>
      if (!realtimeVoice.isRealtimeMode && !voiceMode) { 
        const nowIso = new Date().toISOString();
        const conversationId = Date.now().toString();
        setMessages(prev => {
          const userMsg = {
            _id: `u-${nowIso}`,
            sender: 'user',
            text: messageText,
            timestamp: nowIso,
          };
          const placeholder = {
            _id: conversationId, // unique for this exchange
            sender: 'assistant',
            text: '',
            timestamp: nowIso,
            pending: true,
          };
          return [...prev, userMsg, placeholder];
        });
        // streaming logic continues as before
        let hasReceivedFinalChunk = false;
        let finalMessage = null;
        try {
          console.log(`[STREAM ${conversationId}] Starting streaming for message:`, messageText);
          await apiService.sessions.streamInteractFetch(
            sessionId,
            { message: messageText },
            async (chunk) => {
              if (hasReceivedFinalChunk) {
                console.log(`[STREAM ${conversationId}] Ignoring chunk, final already received:`, chunk);
                return;
              }
              console.log(`[STREAM ${conversationId}] Chunk received:`, chunk);
              setMessages(prev => {
                const lastClientIdx = prev.map((m, i) => ({...m, i}))
                  .reverse()
                  .find(m => m.sender === 'assistant' && m._id === conversationId)?.i;
                let appendText = '';
                if (typeof chunk === 'object' && chunk !== null) {
                  if (typeof chunk.text === 'string' && chunk.is_final) {
                    console.log(`[STREAM ${conversationId}] Final chunk received with text:`, chunk.text);
                    finalMessage = chunk.text;
                    hasReceivedFinalChunk = true;
                    if (chunk.evaluation) {
                      processEvaluationData(chunk.evaluation);
                    }
                    const createDeterministicId = (role, content) => {
                      const contentHash = (content || '')
                        .trim()
                        .slice(0, 30)
                        .replace(/\s+/g, '_');
                      return `${role}-${new Date().toISOString()}-${contentHash}`;
                    };
                    const realId = createDeterministicId('assistant', chunk.text);
                    if (lastClientIdx === undefined) {
                      console.warn(`[STREAM ${conversationId}] Cannot find conversation for final chunk, creating new entry`);
                      const newMessages = [...prev];
                      newMessages.push({
                        _id: realId,
                        sender: 'assistant',
                        text: chunk.text,
                        timestamp: new Date().toISOString(),
                        pending: true
                      });
                      return newMessages;
                    }
                    const newMessages = [...prev];
                    newMessages[lastClientIdx] = {
                      ...newMessages[lastClientIdx],
                      _id: realId,
                      text: chunk.text
                    };
                    return newMessages;
                  } else if (typeof chunk.chunk === 'string') {
                    appendText = chunk.chunk;
                  } else if (chunk.message) {
                    appendText = chunk.message;
                  } else if (chunk.content) {
                    appendText = chunk.content;
                  } else if (typeof chunk.choices === 'object' && chunk.choices[0]?.delta?.content) {
                    appendText = chunk.choices[0].delta.content;
                  } else if (chunk.status === 'complete') {
                    hasReceivedFinalChunk = true;
                    return prev;
                  } else if (chunk.status) {
                    return prev;
                  } else {
                    console.warn(`[STREAM ${conversationId}] Unexpected chunk object:`, chunk);
                    return prev;
                  }
                } else if (typeof chunk === 'string') {
                  appendText = chunk;
                } else {
                  console.warn(`[STREAM ${conversationId}] Unexpected chunk type:`, chunk);
                  return prev;
                }
                if (!appendText) {
                  return prev;
                }
                if (lastClientIdx === undefined) {
                  console.warn(`[STREAM ${conversationId}] Cannot find conversation entry, creating new one`);
                  const newMessages = [...prev];
                  newMessages.push({
                    _id: conversationId,
                    sender: 'assistant',
                    text: appendText,
                    timestamp: new Date().toISOString()
                  });
                  return newMessages;
                }
                const newMessages = [...prev];
                newMessages[lastClientIdx] = {
                  ...newMessages[lastClientIdx],
                  text: (newMessages[lastClientIdx].text || '') + appendText,
                };
                return newMessages;
              });
            }
          );
          // For text mode, update the session with conversation history after streaming completes
          // <<< UNCOMMENT THIS BLOCK >>>
          if (realtimeVoice && realtimeVoice.clientRef && realtimeVoice.clientRef.current?.nativeWs?.readyState === WebSocket.OPEN) {
            console.log("Sending session.update with latest conversation history after text interaction...");
            const simplifiedHistory = messages.slice(-12).map(msg => {
              const normalizedRole = msg.role || (msg.sender === 'user' ? 'user' : 'assistant');
              return {
                role: normalizedRole,
                content: msg.text || msg.content || ""
              };
            });
            const contextUpdate = {
              type: "session.update",
              session: {
                instructions: `\n                  Continue the conversation with the salesperson. \n                  Here are the last 12 message exchanges:\n                  ${simplifiedHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}\n                `
              }
            };
            realtimeVoice.clientRef.current.nativeWs.send(JSON.stringify(contextUpdate));
          }
        } catch (error) {
          console.error('Error in stream interaction:', error);
          setError('An error occurred while processing your message.'); // Keep setError for local errors
          handleSnackbar('Failed to process message', 'error');
        } finally {
          setIsResponseLoading(false);
        }
      } else {
        // For non-streaming mode, use standard interact call
        try {
          addMessage({ role: 'user', content: messageText }); // Keep local addMessage
          await apiService.sessions.interact(sessionId, { message: messageText });
          await loadSessionData(); // Reload to get interaction and updated score
        } catch (error) {
          console.error('Error in interaction:', error);
          handleSnackbar('Failed to process message', 'error');
        } finally {
          setIsResponseLoading(false);
        }
      }
    }, [addMessage, sessionId, userDraft, isResponseLoading, sessionComplete, realtimeVoice.isRealtimeMode, voiceMode, loadSessionData, handleSnackbar, realtimeVoice.isPaused, processEvaluationData, realtimeVoice]);
    

    const handleUserTranscriptComplete = useCallback(fullText => {
      console.log("GameSession: handleUserTranscriptComplete called with:", fullText); // <<< ADD LOG
      // 1) show the finished bubble - Keep local addMessage call
      addMessage({ role: 'user', content: fullText });
    
      // 2) persist it into sessionData.interactions
      setSessionData(prev => ({
        ...prev,
        interactions: [
          ...prev.interactions,
          {
            player_input: fullText,
            ai_response:   null,
            timestamp:     new Date().toISOString(),
            evaluation:    null
          }
        ]
      }));
    }, [addMessage, setSessionData]);
    
    // Timer functions
    const toggleTimer = () => {
      setIsTimedSession(prev => !prev);
    };
    
    // Format time display (mm:ss)
    const formatTime = (seconds) => {
      if (seconds === null || seconds === undefined) return '--:--';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Get timer status indicators
    const getTimerColor = () => {
      if (sessionComplete || !sessionData) return 'text.primary';
      
      if (timeRemaining <= 30) return 'error.main'; // Last 30 seconds
      if (timeRemaining <= 60) return 'warning.main'; // Last minute
      return 'text.primary';
    };
    
    // Complete the session
    const completeSession = useCallback(async (skipFeedback = false) => {
        // If we already know the session is complete, don't try to complete it again
        if (sessionComplete) {
          console.log("Session is already marked as complete - showing feedback directly");
          
          // Check if feedback was already shown for this session
          const feedbackShown = localStorage.getItem(`feedback_shown_${sessionId}`);
          
          if (!skipFeedback && !feedbackShown) {
            setShowFeedbackDialog(true);
          } else {
            console.log("Feedback already shown for this session, not displaying again");
          }
          
          setLoading(false);
          return;
        }

        setLoading(true);
        setLoadingMessage("Completing session...");
      
        try {
          console.log("Completing session...");
          
          // Mark session as complete on backend
          await apiService.sessions.complete(sessionId);
          console.log("Session marked as complete on backend");
          
          // Fetch updated session data to get official score from backend
          const updatedData = await apiService.sessions.getById(sessionId);
          console.log("Updated session data:", updatedData);
          
          // Update session with data from backend
          setSessionData(updatedData);
          
          // Update scores with values from backend
          const backendScore = updatedData.total_score || 0;
          setCurrentScore(backendScore);
          setFinalScore(backendScore);
          
          // Update session complete status
          setSessionComplete(true);
          
          // Calculate session duration for completed session
          if (updatedData.start_time && updatedData.completion_time) {
            const startTime = new Date(updatedData.start_time);
            const completionTime = new Date(updatedData.completion_time);
            const durationMs = completionTime - startTime;
            const durationSeconds = Math.floor(durationMs / 1000);
            console.log(`Session duration: ${durationSeconds} seconds`);
            setSessionDuration(durationSeconds);
          }
          
          // Show feedback dialog if not skipped
          if (!skipFeedback) {
            setShowFeedbackDialog(true);
          }
          
          setLoading(false);
          console.log("Session completed successfully");
        } catch (error) {
          console.error("Error completing session:", error);
          
          // Handle the case where the session is already completed
          if (error.response && error.response.status === 400 && 
              error.response.data && error.response.data.detail === 'Game session is already completed') {
            console.log("Session was already completed on the backend");
            setSessionComplete(true);
            
            // Check if feedback was already shown for this session
            const feedbackShown = localStorage.getItem(`feedback_shown_${sessionId}`);
            
            // Show feedback dialog if not skipped and not already shown
            if (!skipFeedback && !feedbackShown) {
              setShowFeedbackDialog(true);
            } else {
              console.log("Feedback already shown for this session, not displaying again");
            }
          } else {
            // For other errors, show a notification
            handleSnackbar("Failed to complete session", "error");
          }
          
          setLoading(false);
        }
    }, [sessionId, handleSnackbar, setShowFeedbackDialog, sessionComplete]);

    // Update the autoCompleteSession function
    const autoCompleteSession = useCallback(() => {
      // Check if session is already completed
      if (sessionComplete) {
        console.log("Session already completed, not auto-completing");
        return;
      }
      
      console.log("Timer expired, auto-completing session");
      
      // Auto-complete the session without showing the feedback dialog
      completeSession(true); // true = skipFeedback
      
      // Show notification that session time expired
      handleSnackbar("Session time expired", "info");
    }, [sessionComplete, completeSession, handleSnackbar]);

    // Update the timer initialization effect
    useEffect(() => {
      if (sessionData?.is_timed && !sessionComplete) {
        console.log("Initializing timer and pause settings based on session data:", {
          is_timed: sessionData.is_timed,
          time_limit_seconds: sessionData.time_limit_seconds,
          timer_started_at: sessionData.timer_started_at,
          timer_paused_at: sessionData.timer_paused_at,
          difficulty: sessionData.difficulty
        });
        
        // Set initial time remaining
        if (sessionData.time_limit_seconds) {
          setTimeRemaining(sessionData.time_limit_seconds);
        }
        
        // Check if timer was already started
        if (sessionData.timer_started_at) {
          // Timer was already started
          console.log("Timer was previously started at:", sessionData.timer_started_at);
          
          // Check if timer is paused
          if (sessionData.timer_paused_at) {
            console.log("Timer is paused at:", sessionData.timer_paused_at);
            setIsPaused(true);
            setIsManuallyPaused(true);
            setTimerRunning(false);
          } else {
            // Timer is running, calculate elapsed time
            const startTime = new Date(sessionData.timer_started_at).getTime();
            const currentTime = new Date().getTime();
            const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
            
            // Calculate remaining time
            const remainingTime = Math.max(0, sessionData.time_limit_seconds - elapsedSeconds);
            console.log(`Timer started ${elapsedSeconds}s ago, ${remainingTime}s remaining`);
            
            setTimeRemaining(remainingTime);
            setTimerRunning(true);
            setIsPaused(false);
          }
        }
        
        // First check localStorage for stored pause count 
        const storedPauses = localStorage.getItem(`session_${sessionId}_pauses`);
        if (storedPauses !== null) {
          const pauseCount = parseInt(storedPauses, 10);
          console.log(`Loaded ${pauseCount} remaining pauses from localStorage`);
          setRemainingPauses(pauseCount);
        } else {
          // Otherwise calculate based on difficulty
          let initialPauses = 2; // Default for medium difficulty
          
          if (sessionData.difficulty >= 3) {
            initialPauses = 1; // Hard: only 1 pause
          } else if (sessionData.difficulty <= 1) {
            initialPauses = 3; // Easy: 3 pauses
          }
          
          console.log(`Setting initial pause count to ${initialPauses} based on difficulty ${sessionData.difficulty}`);
          setRemainingPauses(initialPauses);
          
          // Update session data with initial pause count
          setSessionData(prev => ({
            ...prev,
            remaining_pauses: initialPauses
          }));
          
          // Store in localStorage for persistence
          try {
            localStorage.setItem(`session_${sessionId}_pauses`, initialPauses.toString());
            console.log(`Initialized remaining pauses in localStorage: ${initialPauses}`);
          } catch (err) {
            console.warn('Could not store initial pause count:', err);
          }
        }
        
        // Set timer as initialized
        setTimerInitialized(true);
      }
    }, [sessionData?.id, sessionComplete, sessionId, setSessionData]);

    // Handle closing feedback dialog
    const handleCloseFeedback = () => {
      setShowFeedbackDialog(false);
      
      // Store in localStorage that we've shown feedback for this session
      // This prevents the dialog from reopening on subsequent renders
      try {
        localStorage.setItem(`feedback_shown_${sessionId}`, 'true');
      } catch (err) {
        console.warn('Could not store feedback shown state:', err);
      }
    };

    // Handle ending session button click
    const handleEndSessionClick = () => {
      setCompleteDialogOpen(true);
    };
    
    // Handle completion confirmation from dialog
    const handleDialogComplete = () => {
      setCompleteDialogOpen(false); // Close the dialog immediately
      completeSession();            // Then complete the session
    };
    
    // Utility to get color based on score
    const getScoreColor = (score) => {
      // Handle undefined or null scores
      if (score === undefined || score === null) return 'info';
      
      if (score >= 80) return 'success';
      if (score >= 60) return 'info';
      if (score >= 40) return 'warning';
      return 'error';
    };

    // Toggle WebSocket streaming vs HTTP API mode
    const toggleStreamingMode = (event) => {
      const enableStreaming = event.target.checked;
      
      handleSnackbar(
        enableStreaming 
          ? 'Real-time streaming mode enabled' 
          : 'Using regular API mode for voice',
        'info'
      );
    };
    
    // RESTORE: Original handleRealtimeToggle function completely
    const handleRealtimeToggle = (event) => {
      
      const newValue = event.target.checked;
      console.log(`GameSession: handleRealtimeToggle received checked value: ${newValue}`);
      
      // <<< UPDATE CONTEXT STATE >>>
      realtimeVoice.updateIsRealtimeMode(newValue);

      // When turning real-time OFF, append the last transcript to the chat
      if (!newValue && userDraft.trim()) {
        addMessage({ role: 'user', content: userDraft.trim() }); // Keep local addMessage
        setUserDraft('');
      }

      handleSnackbar(
        newValue 
          ? 'Real-time voice mode enabled' 
          : 'Real-time voice mode disabled',
        'info'
      );
      
      // console.warn("Realtime toggle disabled for debugging"); // Remove warning
    };

    // --- Effects to update Voice Context --- 
    // <<< UNCOMMENT ALL THESE EFFECTS >>>
    
    // Update context with session ID
    useEffect(() => {
      realtimeVoice.updateSessionId(sessionId);
    }, [sessionId, realtimeVoice.updateSessionId]);

    // Update context with pause state
    useEffect(() => {
      realtimeVoice.updateIsPaused(isPaused);
    }, [isPaused, realtimeVoice.updateIsPaused]);

    // Update context with scenario context
    useEffect(() => {
      realtimeVoice.updateScenarioContext(scenarioContext);
    }, [scenarioContext, realtimeVoice.updateScenarioContext]);

    // Update context with conversation history
    useEffect(() => {
      realtimeVoice.updateConversationHistory(messages);
    }, [messages, realtimeVoice.updateConversationHistory]);

    // Update context with user name
    useEffect(() => {
      realtimeVoice.updateUserName(currentUser?.username);
    }, [currentUser, realtimeVoice.updateUserName]);

    // Update context with voice mode (from local state)
    useEffect(() => {
      realtimeVoice.updateVoiceMode(voiceMode);
    }, [voiceMode, realtimeVoice.updateVoiceMode]);

    // Update context with session complete state
    useEffect(() => {
      realtimeVoice.updateSessionComplete(sessionComplete);
    }, [sessionComplete, realtimeVoice.updateSessionComplete]);

    // Register callbacks with the context on mount
    useEffect(() => {
      realtimeVoice.registerHandleSnackbar(handleSnackbar);
      realtimeVoice.registerAddMessage(addMessage);
      realtimeVoice.registerProcessEvaluationData(processEvaluationData);
      realtimeVoice.registerHandleTranscriptReady(handleTranscriptReady);
      realtimeVoice.registerHandleUserTranscriptChunk(handleUserTranscriptChunk);
      realtimeVoice.registerHandleUserTranscriptComplete(handleUserTranscriptComplete);
      realtimeVoice.registerSetSessionData(setSessionData);

      // Cleanup: Unregister callbacks (optional, but good practice)
      return () => {
        realtimeVoice.registerHandleSnackbar(null);
        realtimeVoice.registerAddMessage(null);
        realtimeVoice.registerProcessEvaluationData(null);
        realtimeVoice.registerHandleTranscriptReady(null);
        realtimeVoice.registerHandleUserTranscriptChunk(null);
        realtimeVoice.registerHandleUserTranscriptComplete(null);
        realtimeVoice.registerSetSessionData(null);
      };
      // Ensure correct dependencies for registration effect
    }, [
      realtimeVoice,
      handleSnackbar,
      addMessage,
      processEvaluationData,
      handleTranscriptReady,
      handleUserTranscriptChunk,
      handleUserTranscriptComplete,
      setSessionData
    ]);
    

    // useEffect for data loading
    useEffect(() => {
      // Guard against React strict mode double invocation
      if (initializationRef.current) {
        console.log("Skipping duplicate initialization in React Strict Mode");
        return;
      }

      // Only load data if we have a sessionId
      if (sessionId) {
        // Set initialization flag BEFORE loading to prevent multiple loads
        initializationRef.current = true;
        console.log("Setting initialization flag to true - preventing duplicate loads");
        
        // Load data with a slight delay to avoid React 18 strict mode double-mount issues
        const initialLoadTimeout = setTimeout(() => {
          loadSessionData()
            .then(() => {
              console.log("Initial session data load complete");
              // Flag stays true to prevent any subsequent auto-loads
            })
            .catch(error => {
              console.error("Failed to load session data:", error);
              // Don't reset flag on failure - we still consider it initialized
            });
        }, 100);
        
        // Clean up timeout on unmount
        return () => {
          clearTimeout(initialLoadTimeout);
          // Clear sessionStorage to prevent memory leaks
          sessionStorage.removeItem(`session_data_fetch_${sessionId}`);
        };
      }
    }, [sessionId, loadSessionData]); // Only depend on these values
    
    // Scroll to bottom of messages when new ones arrive
    useEffect(() => {
      // console.log("--- GameSession useEffect [messages] --- Triggered (Scrolling)"); 
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, [messages]); // Trigger effect whenever messages array changes

    // Effect for component cleanup
    useEffect(() => {
      console.log("GameSession component mounted");
      
      // Cleanup function for component unmount
      return () => {
        console.log("GameSession component unmounting - cleaning up connections");
        
        // Close standard WebSocket if open
        if (ws.current) {
          console.log("Closing standard WebSocket connection on unmount");
          try {
            ws.current.close();
          } catch (e) {
            console.error("Error closing WebSocket:", e);
          }
          ws.current = null;
        }
        
        // voiceTransport cleanup is handled by the useRealtimeVoice hook's own cleanup
      };
    }, []); // Empty dependency array - run only on mount/unmount

    useEffect(() => {
      const fetchUserProfile = async () => {
        try {
          console.log("Fetching user profile..."); // Use log helper if you replaced console.log
          const response = await apiService.auth.getProfile();
          if (response && response.data) {
            setCurrentUser(response.data);
            console.log("User profile fetched:", response.data); // Use log helper
          } else {
            throw new Error("Invalid profile response");
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          setError("Failed to load user profile. Some features might be limited.");
          // Optionally redirect to login or handle error appropriately
        }
      };
      fetchUserProfile();
    }, []); // Empty dependency array ensures this runs only once on mount

    // Add a debounce ref for togglePause
    const togglePauseDebounceRef = useRef(false);

    // Toggle pause/resume with debounce
    const togglePause = useCallback(async () => {
      // Prevent rapid consecutive clicks
      if (togglePauseDebounceRef.current) {
        console.log('Debouncing togglePause - ignoring rapid click');
        return;
      }

      // Set debounce flag
      togglePauseDebounceRef.current = true;
      
      try {
        setLoading(true);
        
        if (isPaused) {
          // Resuming
          console.log('Resuming timer...');
          // First update UI state immediately 
          setIsPaused(false);
          setIsManuallyPaused(false);
          
          // Then call API
          await apiService.sessions.startTimer(sessionId);
        } else {
          // Only decrement when pausing and if we have pauses left
          if (remainingPauses > 0) {
            console.log(`Decremented pauses from ${remainingPauses} to ${remainingPauses - 1}`);
            const newRemainingPauses = remainingPauses - 1;
            
            // First update UI state immediately
            setRemainingPauses(newRemainingPauses);
            setIsPaused(true);
            setIsManuallyPaused(true);
            
            // Update session data to maintain state
            setSessionData(prev => ({
              ...prev,
              remaining_pauses: newRemainingPauses
            }));
            
            console.log('Pausing timer...');
            await apiService.sessions.pauseTimer(sessionId);
            
            // Since there's no metadata API, we'll use localStorage for persistence
            try {
              localStorage.setItem(`session_${sessionId}_pauses`, newRemainingPauses.toString());
              console.log(`Saved remaining pauses to localStorage: ${newRemainingPauses}`);
            } catch (storageError) {
              console.error('Error saving pause count to localStorage:', storageError);
            }
          } else {
            console.log('No pauses remaining');
            return; // Exit early if no pauses left
          }
        }
        
        // Update timer status without reloading the entire session data
        // This prevents remainingPauses from being reset
        const response = await apiService.sessions.timerStatus(sessionId);
        console.log('Timer status response:', response);
        
        const status = response.data || response;
        
        if (status) {
          // Handle different possible property formats
          setTimeRemaining(status.time_remaining_seconds || status.remaining_seconds || 0);
          setTimerRunning(!status.is_paused && !status.timer_paused_at);
        }
        
      } catch (error) {
        console.error('Error toggling pause:', error);
        setError('Failed to toggle pause. Please try again.');
        
        // Roll back UI state on error
        if (isPaused) {
          setIsPaused(true);
          setIsManuallyPaused(true);
        } else {
          setIsPaused(false);
          setIsManuallyPaused(false);
          setRemainingPauses(prev => prev + 1);
        }
      } finally {
        setLoading(false);
        
        // Reset debounce flag after 1 second
        setTimeout(() => {
          togglePauseDebounceRef.current = false;
        }, 1000);
      }
    }, [isPaused, remainingPauses, sessionId, setError, setSessionData]);

    // Update the pollTimerStatus function with more aggressive throttling 
    const pollTimerStatus = useCallback(async () => {
      if (sessionComplete || !sessionData?.is_timed) return;
      
      // Add more aggressive debounce to prevent excessive polling
      const lastPollTime = sessionStorage.getItem(`timer_poll_${sessionId}`);
      const now = Date.now();
      
      // Only poll if we haven't polled in the last 10 seconds (was 2 seconds)
      if (lastPollTime && now - parseInt(lastPollTime, 10) < 10000) {
        console.log("Throttling timer status poll - too frequent");
        return;
      }
      
      // Record this poll time
      sessionStorage.setItem(`timer_poll_${sessionId}`, now.toString());
      
      try {
        console.log("Polling timer status from server...");
        const response = await apiService.sessions.timerStatus(sessionId);
        
        // Handle both response formats - direct or nested in data
        const status = response.data || response;
        
        if (status) {
          // Store the server's time as a reference point for our client-side timer
          const serverRemainingSeconds = status.remaining_seconds || status.time_remaining_seconds || 0;
          const serverIsPaused = !!status.is_paused || !!status.timer_paused_at;
          
          console.log(`Server timer status: ${serverRemainingSeconds}s remaining, paused: ${serverIsPaused}`);
          
          // Store the server time and current timestamp as a reference
          sessionStorage.setItem(`timer_server_time_${sessionId}`, JSON.stringify({
            remainingSeconds: serverRemainingSeconds,
            timestamp: Date.now(),
            isPaused: serverIsPaused
          }));
          
          // Update time remaining based on server
          setTimeRemaining(serverRemainingSeconds);
          
          // Only update isPaused if we haven't manually paused
          if (!isManuallyPaused) {
            setIsPaused(serverIsPaused);
          }
          
          // Auto-complete session when time is up
          if (serverRemainingSeconds <= 0 && !serverIsPaused && !sessionComplete) {
            console.log('Timer expired, auto-completing session');
            autoCompleteSession();
          }
        }
      } catch (error) {
        console.error('Error polling timer status:', error);
      }
    }, [sessionId, sessionComplete, sessionData?.is_timed, isManuallyPaused, autoCompleteSession]);

    // Update the timing effect to use client-side countdown with occasional server sync
    useEffect(() => {
      if (sessionData?.is_timed && !sessionComplete) {
        // <<< UNCOMMENT THIS BLOCK TO RESTORE TIMER >>>
        console.log("Initializing timer with client-side countdown...");
        
        // Set initial time remaining
        if (sessionData.time_limit_seconds) {
          setTimeRemaining(sessionData.time_limit_seconds);
        }
        
        // Initialize timer based on server state
        pollTimerStatus();
        
        // Use client-side countdown logic to reduce server load
        const timer = setInterval(() => {
          if (!isPaused) {
            setTimeRemaining(prevTime => {
              const newTime = Math.max(0, prevTime - 1);
              
              // Auto-complete when time expires
              if (newTime <= 0 && !sessionComplete) {
                console.log("Client timer reached zero, auto-completing session");
                clearInterval(timer);
                autoCompleteSession();
              }
              
              return newTime;
            });
          }
        }, 1000);
        
        // Set up periodic server sync with a much longer interval (2 minutes)
        // This ensures we stay somewhat in sync with the server, but without hammering it
        const syncInterval = setInterval(() => {
          if (!sessionComplete) {
            console.log("Periodic server sync of timer...");
            pollTimerStatus();
          }
        }, 120000); // Sync with server every 2 minutes
        
        // Clean up timers on unmount
        return () => {
          clearInterval(timer);
          clearInterval(syncInterval);
          sessionStorage.removeItem(`timer_poll_${sessionId}`);
          sessionStorage.removeItem(`timer_server_time_${sessionId}`);
        };
        // <<< END OF BLOCK TO UNCOMMENT >>>
      }
    }, [sessionData, sessionComplete, isPaused, autoCompleteSession, pollTimerStatus, sessionId]);

    // Remove the separate timer polling effect that was causing duplicate calls
    // and replace with a simplified effect that only sets up initial polling on mount
    useEffect(() => {
      // Skip if session is complete or no valid session data
      if (sessionComplete || !sessionData?.is_timed) {
        return;
      }
      
      // Do initial poll when component mounts
      console.log("Initial timer status poll");
      pollTimerStatus();
      
      // Clean up on unmount
      return () => {
        sessionStorage.removeItem(`timer_poll_${sessionId}`);
      };
    }, [sessionId, sessionComplete, sessionData?.is_timed, pollTimerStatus]);
    
    // Remove the dynamic polling frequency adjustment effect
    // This was causing unnecessary complexity and possibly triggering extra calls

    // Update the effect for refreshing scores to use a longer interval
    // useEffect(() => {
    //   // Only fetch current scores for active sessions
    //   if (sessionId && !sessionComplete && !loading) {
    //     // Initial fetch happens immediately (throttled internally)
    //     fetchCurrentScore();
        
    //     // Set up interval for periodic score updates with a much longer delay
    //     const scoreInterval = setInterval(() => {
    //       fetchCurrentScore(); // Throttled internally
    //     }, 30000); // Poll every 30 seconds instead of continuously
        
    //     // Clean up on unmount
    //     return () => {
    //       clearInterval(scoreInterval);
    //       clearTimeout(scoreTimerRef.current);
    //       sessionStorage.removeItem(`score_poll_${sessionId}`);
    //     };
    //   }
    // }, [sessionId, sessionComplete, loading, fetchCurrentScore]);

    // Refresh timer status periodically using refs
    // useEffect(() => {
    //   // Skip if session is complete or no valid session data
    //   if (sessionComplete || !sessionData?.is_timed) {
    //     // Clear any existing interval when session completes or becomes invalid
    //     if (pollIntervalRef.current) {
    //       console.log("Clearing poll interval due to session completion/invalidity");
    //       clearInterval(pollIntervalRef.current);
    //       pollIntervalRef.current = null;
    //     }
    //     return;
    //   }
      
    //   // Define a function to set up polling with the current delay
    //   const setupPolling = () => {
    //     // Clear any existing interval first
    //     if (pollIntervalRef.current) {
    //       clearInterval(pollIntervalRef.current);
    //     }
        
    //     // Initial poll (with throttling built into the function)
    //     pollTimerStatus();
        
    //     // Set up new interval with much longer delay (60s default)
    //     const pollInterval = 60000; // Poll every 60 seconds instead of every 5 seconds
    //     console.log(`Setting up timer status polling with ${pollInterval/1000}s interval`);
    //     pollIntervalRef.current = setInterval(pollTimerStatus, pollInterval);
    //   };
      
    //   // Initial setup
    //   setupPolling();
      
    //   // Cleanup function
    //   return () => {
    //     if (pollIntervalRef.current) {
    //       console.log("Cleaning up timer status polling interval");
    //       clearInterval(pollIntervalRef.current);
    //       pollIntervalRef.current = null;
    //     }
        
    //     // Also clean up session storage
    //     sessionStorage.removeItem(`timer_poll_${sessionId}`);
    //   };
    // }, [sessionId, sessionComplete, sessionData?.is_timed, pollTimerStatus]);

    // Separate effect to adjust polling frequency based on time remaining
    // useEffect(() => {
    //   // Only adjust if polling is active
    //   if (!pollIntervalRef.current || sessionComplete || !sessionData?.is_timed) return;
      
    //   // Determine desired polling interval
    //   const desiredDelay = timeRemaining > 60 ? 60000 : 5000;
      
    //   // Only update if there's a change needed
    //   if (desiredDelay !== pollDelayRef.current) {
    //     console.log(`Adjusting poll frequency from ${pollDelayRef.current/1000}s to ${desiredDelay/1000}s`);
    //     pollDelayRef.current = desiredDelay;
        
    //     // Reset the interval with new delay
    //     clearInterval(pollIntervalRef.current);
    //     pollIntervalRef.current = setInterval(() => {
    //       if (typeof pollTimerStatus === 'function') {
    //         pollTimerStatus();
    //       }
    //     }, pollDelayRef.current);
    //   }
    // }, [timeRemaining, sessionComplete, sessionData?.is_timed]);

    // Replace it with a simpler useEffect that updates scores from backend after each interaction
    useEffect(() => {
      // Only poll for updated scores if the session is completed
      // For active sessions, we calculate scores from streaming evaluations
      if (sessionId && sessionComplete && !loading) {
        // Add debounce to prevent too many API calls
        const lastFetchTime = localStorage.getItem(`score_fetch_${sessionId}`);
        const now = Date.now();
        
        // Only fetch if we haven't fetched in the last 5 seconds
        if (!lastFetchTime || now - parseInt(lastFetchTime, 10) > 5000) {
          localStorage.setItem(`score_fetch_${sessionId}`, now.toString());
          
          const fetchCurrentScore = async () => {
            try {
              console.log("Fetching final score for completed session...");
              const scoreData = await apiService.sessions.getScore(sessionId);
              
              // Check if we got actual score data
              if (scoreData && Object.keys(scoreData).length > 0) {
                // Update all score state based on backend data
                setSessionScores({
                  overall: scoreData.total_score || 0,
                  methodology: scoreData.methodology_score || 0,
                  rapport: scoreData.rapport_score || 0,
                  progress: scoreData.progress_score || 0,
                  outcome: scoreData.outcome_score || 0
                });
                
                // Save previous score for delta display
                setPreviousScore(currentScore);
                
                // Update current score directly from backend
                setCurrentScore(scoreData.total_score || 0);
                
                // Update pillar scores directly from backend
                setPillarScores({
                  exec: scoreData.rapport_score || 0,
                  meth: scoreData.methodology_score || 0,
                  prog: ((scoreData.progress_score || 0) + (scoreData.outcome_score || 0)) / 2
                });
                
                // For completed sessions, use the final score as is
                setFinalScore(scoreData.total_score || 0);
                
                console.log("Updated final score from backend:", {
                  finalScore: scoreData.total_score
                });
              } else {
                console.log("No meaningful score data available yet for completed session");
              }
            } catch (error) {
              // Don't show errors for expected 404s (no score yet)
              if (error.response && error.response.status === 404) {
                console.log("Score endpoint returned 404 - waiting for final scores");
              } else {
                console.error("Error fetching updated scores:", error);
              }
            }
          };
          
          fetchCurrentScore();
        } else {
          console.log("Skipping score fetch - throttling to prevent too many API calls");
        }
        
        // Return cleanup function to remove localStorage key on unmount
        return () => {
          localStorage.removeItem(`score_fetch_${sessionId}`);
        };
      }
    }, [sessionId, sessionComplete, loading, currentScore]); // Removed messages.length dependency

    // Add a new effect for updating current scores from the backend for active sessions
    useEffect(() => {
      // Only fetch current scores for active sessions
      if (sessionId && !sessionComplete && !loading) {
        /* COMMENTED OUT FOR DEBUGGING REMOUNTS
        // Initial fetch happens immediately without throttling
        fetchCurrentScore();
        
        // Record this fetch time in localStorage for potential throttling
        localStorage.setItem(`active_score_fetch_${sessionId}`, Date.now().toString());
        
        // Clean up on unmount - clear any pending score fetch timer
        return () => {
          clearTimeout(scoreTimerRef.current);
          localStorage.removeItem(`active_score_fetch_${sessionId}`);
        };
        */
      }
    }, [sessionId, sessionComplete, loading, fetchCurrentScore]); // Updated dependencies

    // Accordion handler
    const handleAccordionChange = (panel) => (event, isExpanded) => {
      setExpandedAccordion(isExpanded ? panel : null);
    };

    // Move getGoalForPacerStage to proper scope - define it at the component level
    const getGoalForPacerStage = (stage) => {
      if (!stage) return 'Build a relationship and understand the client\'s needs.';
      
      const goals = {
        'P': 'Qualify the prospect and identify their business needs.',
        'A': 'Understand pain points and assess decision criteria.',
        'C': 'Create value by presenting a tailored solution addressing specific needs.',
        'E': 'Execute a plan to navigate stakeholders and handle objections.',
        'R': 'Retain the client by planning ongoing support and expansion opportunities.'
      };
      
      return goals[stage.charAt(0).toUpperCase()] || 'Build a relationship and understand the client\'s needs.';
    };

    // Enhance the pause button tooltip
    const getPauseButtonTooltip = () => {
      if (loading) {
        return "Loading...";
      } else if (isPaused) {
        return "Resume the session timer";
      } else if (remainingPauses <= 0) {
        return "You've used all your pause opportunities";
      } else {
        return `Pause the session timer (${remainingPauses} pause${remainingPauses !== 1 ? 's' : ''} remaining)`;
      }
    };

    // Add getTimerBackgroundColor function - place near other timer-related functions
    const getTimerBackgroundColor = () => {
      if (sessionComplete) return 'grey.100';
      if (isPaused) return 'warning.light';
      if (timeRemaining <= 30) return 'error.light';
      if (timeRemaining <= 60) return 'warning.light';
      return 'success.light';
    };

    // Fetch session data on mount
    useEffect(() => {
      if (!sessionId) return;
      
      setLoading(true);
      loadSessionData()
        .then(() => {
          // Data is already loaded and processed in loadSessionData
          // Check if voice settings should be enabled based on the loaded session data
          if (sessionData?.is_voice_enabled && sessionData?.is_realtime_voice_enabled) {
            setVoiceMode(true);
            setIsRealtimeMode(true);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Error in loadSessionData:", err);
          handleSnackbar("Error loading session data", "error");
          setLoading(false);
        });
    }, [sessionId, handleSnackbar, loadSessionData, sessionData, setVoiceMode, setIsRealtimeMode]);

    // render the actual component UI
    // console.log(`--- GameSession Rendering --- Switch 'checked' prop will be: ${isRealtimeMode}`);
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Session header and controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {loading 
                ? 'Loading session...' 
                : (sessionData?.scenario?.title || sessionData?.scenarioTitle || 'Game Session')}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {loading
                ? 'Please wait while we load your session data.'
                : (sessionData?.scenario?.description || sessionData?.description || '')}
            </Typography>
            
            {/* Session status */}
            {sessionData && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={sessionData.status === 'completed' ? <CheckCircleIcon /> : <TimerIcon />} 
                  label={sessionData.status === 'completed' ? 'Completed' : 'In Progress'}
                  color={sessionData.status === 'completed' ? 'success' : 'primary'}
              variant="outlined"
                />
                
                {!sessionComplete ? (
                  // For active sessions, show that this is a projected score
                  <Tooltip title="Current projected score based on your interactions so far. The final score may differ when the session is completed.">
                    <Chip 
                      icon={<AssessmentIcon />} 
                      label={`Projected Score: ${Math.round(currentScore || 0)}/100`}
                      color={getScoreColor(currentScore || 0)}
                      variant="filled"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Tooltip>
                ) : (
                  // For completed sessions, show the final official score
                  <Tooltip title="Final official score calculated by the system">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label={`Final Score: ${Math.round(finalScore || 0)}/100`}
                      color={getScoreColor(finalScore || 0)}
                      variant="filled"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Tooltip>
                )}
                
                    <Chip 
                  icon={<EventIcon />} 
                  label={`Created: ${new Date(sessionData.createdAt).toLocaleDateString()}`}
                  variant="outlined"
                  color="default"
                    />
                  </Box>
            )}
          </Box>

          {/* Removed duplicate timer display from header */}
          <Box>
            <Tooltip title="End this session now">
              <Button 
                variant="outlined" 
                color="error" 
                size="small" 
                startIcon={<StopIcon />}
                onClick={handleEndSessionClick}
                disabled={sessionComplete}
              >
                End Session
              </Button>
            </Tooltip>
          </Box>
          </Box>
            
        {/* Main content grid */}
        <Grid container spacing={3}>
          {loading ? (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <CircularProgress size={60} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Loading session data...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This may take a moment
                </Typography>
                {error && (
                  <Alert severity="error" sx={{ mt: 2, maxWidth: '500px' }}>
                    {error}
                    <Box sx={{ mt: 1 }}>
                      <Button variant="outlined" size="small" onClick={loadSessionData}>
                        Retry
                      </Button>
                    </Box>
                  </Alert>
          )}
              </Box>
            </Grid>
          ) : (
            <>
              {/* Left sidebar - Client info */}
              <Grid item xs={12} md={3}>
              <Paper 
                  elevation={2}
                sx={{ 
                        p: 2, 
                    height: '100%',
                    minHeight: { xs: 'auto', md: '600px' }
                  }}
                >
                  <Typography variant="h6" gutterBottom component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <InfoIcon sx={{ mr: 1 }} /> Client Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{
                        mr: 2,
                        width: 56,
                        height: 56,
                        // <<< UNCOMMENT BORDER/SHADOW >>>
                        border: realtimeVoice.isClientSpeaking ? `3px solid ${theme.palette.success.main}` : `3px solid transparent`,
                        boxShadow: realtimeVoice.isClientSpeaking ? `0 0 12px ${theme.palette.success.light}` : 'none',
                        // border: `3px solid transparent`, // Keep border for layout
                        // boxShadow: 'none',
                        transition: 'border 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                        // <<< UNCOMMENT ANIMATION >>>
                        animation: realtimeVoice.isClientSpeaking ? 'speakingPulse 1.5s infinite ease-in-out' : 'none',
                        // animation: 'none',
                        '@keyframes speakingPulse': {
                          '0%': {
                            boxShadow: `0 0 8px ${theme.palette.success.light}`,
                          },
                          '50%': {
                            boxShadow: `0 0 16px ${theme.palette.success.main}`,
                          },
                          '100%': {
                            boxShadow: `0 0 8px ${theme.palette.success.light}`,
                          },
                        }
                      }}
                    >
                      {client.name ? client.name.charAt(0).toUpperCase() : 'C'} 
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {client.name || 'Unknown Client'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {client.role || 'Unknown Role'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Name:</strong> {client.name || 'Unknown Client'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Role:</strong> {client.role || 'Unknown Role'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Company:</strong> {client.company || 'Unknown Company'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Industry:</strong> {client.industry || 'Unknown Industry'}
                        </Typography>
                      </CardContent>
                    </Card>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Client Background
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {client.background || 'No background information available.'}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Business Challenges
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {client.challenges || 'No specific challenges mentioned.'}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Objectives
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {client.objectives || 'No specific objectives mentioned.'}
                    </Typography>
          </Box>
                  
                  {/* Realtime Mode Switch */}
                  <FormGroup sx={{ mt: 2, mb: 2, borderTop: 1, borderBottom: 1, borderColor: 'divider', py: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          // <<< RESTORE CHECKED/ONCHANGE/DISABLED using realtimeVoice >>>
                          checked={realtimeVoice.isRealtimeMode} // <<< Use context state
                          // checked={isRealtimeMode} // Use local state for now (will be non-functional)
                          // onChange={handleRealtimeToggle} // Keep toggle, but it will be disabled
                          
                          onChange={(e) => { // Restore original onChange if preferred
                            // Update context state directly
                            const newValue = e.target.checked;
                            realtimeVoice.updateIsRealtimeMode(newValue);
                            // Optional: Keep snackbar logic if desired
                            handleSnackbar(newValue ? 'Real-time voice mode enabled' : 'Real-time voice mode disabled', 'info');
                          }}
                          
                          icon={<SettingsVoiceIcon fontSize="small" />}
                          checkedIcon={<SettingsVoiceIcon fontSize="small" />}
                          disabled={sessionComplete || realtimeVoice.isConnecting} // <<< Use context state
                          // disabled={sessionComplete || true} // Keep disabled visually
                        />
                      }
                      labelPlacement="start"
                      label="Real-time Voice Mode"
                      sx={{ justifyContent: 'space-between', ml: 0, mr: 0.5 }}
                    />
                  </FormGroup>
                  
                  {/* Chat controls */}
                  {/* <<< UNCOMMENT THIS LINE >>> */}
                  {realtimeVoice.renderChatControls && realtimeVoice.renderChatControls()} 
                </Paper>
              </Grid>
              
              {/* Main chat area */}
              <Grid item xs={12} md={6}>
              <Paper 
                  elevation={2}
                sx={{ 
                  display: 'flex', 
                    flexDirection: 'column',
                    height: { xs: 'auto', md: '80vh' },
                    minHeight: { xs: 'auto', md: '600px' },
                  }}
                >
                  {/* Timer and session controls - This is the primary timer that we'll keep */}
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccessTimeIcon sx={{ 
                        mr: 1,
                        color: getTimerColor(),
                        animation: timeRemaining <= 60 ? 'pulse 1s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                          '100%': { opacity: 1 }
                        }
                      }} />
                      <Box display="flex" alignItems="center">
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            ml: 2,
                            color: timeRemaining <= 60 ? 'error.main' : 'text.primary',
                            animation: timeRemaining <= 60 && !isPaused ? 'pulse 2s infinite' : 'none',
                            '@keyframes pulse': {
                              '0%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                              '100%': { opacity: 1 },
                            },
                          }}
                        >
                          {formatTime(timeRemaining)}
                </Typography>
                
                        {/* Pause Button */}
                        {sessionData?.is_timed && !sessionComplete && (
                          <Tooltip title={getPauseButtonTooltip()}>
                            <span> {/* Wrap in span to allow tooltip on disabled button */}
                              <Button
                                variant="outlined"
                                color={isPaused ? "success" : "primary"}
                        size="small"
                                startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent event bubbling
                                  togglePause();
                                }}
                                disabled={!isPaused && remainingPauses <= 0} // Only disable when not paused AND no pauses left
                                sx={{ 
                                  ml: 2,
                                  position: 'relative',
                                  '&::after': {
                                    // Display a badge with count
                                    display: (!isPaused && remainingPauses > 0) ? 'flex' : 'none',
                                    content: `"${remainingPauses}"`,
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    backgroundColor: 'primary.main',
                                    color: 'primary.contrastText',
                                    fontSize: '0.75rem',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }
                                }}
                              >
                                {isPaused ? "Resume" : "Pause"}
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
            </Box>
                    
                    <Box>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<StopIcon />}
                        onClick={handleEndSessionClick}
                        disabled={sessionComplete}
                      >
                        End Session
                      </Button>
                      </Box>
                    </Box>
                  
                  {/* Conversation area */}
                  {/* <<< UNCOMMENT CHECK >>> */}
                  {!realtimeVoice.isRealtimeMode ? ( 
                  // {true ? ( // Always render text chat for now
                  <Box 
                    ref={messagesContainerRef}
                    sx={{ 
                      flexGrow: 1, 
                      overflowY: 'auto', 
                      p: 2,
                      display: 'flex',
                        flexDirection: 'column',
                        position: 'relative' // Add position relative to contain the pause overlay
                      }}
                    >
                      {/* Pause overlay - IMPORTANT: Keep this to prevent interaction while paused */}
                      {/* <<< UNCOMMENT CHECK >>> */}
                      {realtimeVoice.isPaused && ( 
                      // {isPaused && ( // Use local isPaused state
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <PauseCircleFilledIcon sx={{ fontSize: 80, color: 'white', mb: 2 }} />
                          <Typography variant="h5" color="white" gutterBottom>
                            Session Paused
                          </Typography>
                          <Typography variant="body1" color="white" align="center" sx={{ mb: 3 }}>
                            The timer and dialogue are paused.<br />
                            Click "Resume" to continue.
                          </Typography>
                          <Button
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<PlayArrowIcon />}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              togglePause();      // Call the same toggle function 
                            }}
                          >
                            Resume Session
                          </Button>
                        </Box>
                      )}
                      
                    {/* Loading state */}
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : error ? (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                      </Alert>
                    ) : (
                      /* Messages */
                      messages.map((message, index) => (
                        <Box key={message._id ?? message.timestamp}
                          sx={{
                            alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            mb: 2,
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ ml: message.sender === 'user' ? 'auto' : 0 }}
                          >
                              {message.sender === 'user' ? 'You' : client.name || 'Client'}
                          </Typography>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                              bgcolor: message.sender === 'user' ? 'primary.light' : 'grey.100',
                              color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                borderRadius: 2,
                              position: 'relative'
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        component="div" 
                        sx={{ alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start', mb: 1 }}
                      >
                        {message.text}
                      </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography 
                              variant="caption" 
                              color={message.sender === 'user' ? 'primary.contrastText' : 'text.secondary'}
                                  sx={{ opacity: 0.8 }}
                            >
                              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </Typography>
                                
                                {message.sender === 'user' && evaluationTooltips[index] && (
                                  <Tooltip
                                    title={
                                      <div>
                                        <Typography variant="subtitle2">Feedback:</Typography>
                                        <Typography variant="body2">{evaluationTooltips[index].feedback}</Typography>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="body2">Methodology: {evaluationTooltips[index].methodology_score}%</Typography>
                                        <Typography variant="body2">Rapport: {evaluationTooltips[index].rapport_score}%</Typography>
                                        <Typography variant="body2">Progress: {evaluationTooltips[index].progress_score}%</Typography>
                                        <Typography variant="body2">Outcome: {evaluationTooltips[index].outcome_score}%</Typography>
                                      </div>
                                    }
                                    placement="left"
                                    arrow
                                  >
                                    <IconButton size="small" sx={{ ml: 1 }}>
                                      <InfoOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                          </Paper>
                        </Box>
                      ))
                      )}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        flexGrow: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        position: 'relative' // Add position relative for pause overlay
                      }}
                    >
                      {/* Pause overlay for real-time mode */}
                      {/* <<< UNCOMMENT CHECK >>> */}
                      {realtimeVoice.isPaused && ( 
                      // {isPaused && ( // Use local isPaused state
                        <Box 
                          sx={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                          }}
                        >
                          <PauseCircleFilledIcon sx={{ fontSize: 80, color: 'white', mb: 2 }} />
                          <Typography variant="h5" color="white" gutterBottom>
                            Session Paused
                          </Typography>
                          <Typography variant="body1" color="white" align="center" sx={{ mb: 3 }}>
                            The timer and dialogue are paused.<br />
                            Click "Resume" to continue.
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              togglePause();
                            }}
                            startIcon={<PlayArrowIcon />}
                            sx={{ mt: 2 }}
                          >
                            Resume Session
                          </Button>
                        </Box>
                      )}
                      
                      <Avatar
                        sx={{
                          width: 120,
                          height: 120,
                          fontSize: 48,
                          '@keyframes speakingPulse': {
                            '0%': { transform: 'scale(1)' },
                            '50%': { transform: 'scale(1.2)' },
                            '100%': { transform: 'scale(1)' }
                          },
                          // <<< UNCOMMENT ANIMATION >>>
                          animation: realtimeVoice.isClientSpeaking ? 'speakingPulse 1.5s infinite ease-in-out' : 'none'
                          // animation: 'none'
                        }}
                      >
                        {client.name ? client.name.split(' ').map(n => n[0]).join('') : 'C'}
                      </Avatar>
                      <Typography variant="h6" sx={{ mt: 2 }}>
                        {client.name}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Text input or realtime voice input */}
                  {/* <<< UNCOMMENT CHECK >>> */}
                  {realtimeVoice.isRealtimeMode ? ( 
                  // {false ? ( // Force render text input for now
                     // <<< UNCOMMENT THIS LINE >>>
                    realtimeVoice.renderRealtimeVoiceInput && realtimeVoice.renderRealtimeVoiceInput() // Use context value
                    // <Box>Realtime Input Placeholder (Disabled)</Box>
                  ) : (
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
                      {/* <<< UNCOMMENT TEXTFIELD >>> */}
                      
                      <TextField
                        fullWidth
                        value={userDraft}
                        onChange={(e) => setUserDraft(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isPaused && handleSendMessage()}
                        variant="outlined"
                        // <<< UNCOMMENT CHECK >>>
                        placeholder={realtimeVoice.isPaused ? "Session paused - resume to continue..." : "Type your message..."}
                        // placeholder={isPaused ? "Session paused - resume to continue..." : "Type your message..."} // Use local isPaused
                        // <<< UNCOMMENT CHECK >>>
                        disabled={isResponseLoading || sessionComplete || realtimeVoice.isPaused}
                        // disabled={isResponseLoading || sessionComplete || isPaused} // Use local isPaused
                      />
                      
                      {/* <<< REMOVE TEST BUTTON >>> */}
                      {/* <Typography sx={{flexGrow: 1}}>Input Disabled for Debug</Typography> */}
                      {/* <Button 
                        variant="outlined" 
                        onClick={() => setUserDraft(prev => prev + 't')} 
                        disabled={isResponseLoading || sessionComplete || isPaused}
                      >
                        Test State Update
                      </Button>*/}
                      <Button 
                        variant="contained"
                        color="primary"
                        onClick={handleSendMessage}
                        // <<< UNCOMMENT CHECK >>>
                        disabled={!userDraft.trim() || isResponseLoading || sessionComplete || realtimeVoice.isPaused}
                        // disabled={!userDraft.trim() || isResponseLoading || sessionComplete || isPaused} // Use local isPaused
                        endIcon={<SendIcon />}
                      >
                        Send
                      </Button>
            </Box>
          )}
        </Paper>
              </Grid>
              
              {/* Right sidebar - PACER & Progress */}
              <Grid item xs={12} md={3} order={{ xs: 2, md: 3 }}>
            <Paper 
                  elevation={2}
              sx={{ 
                    p: 2,
                height: '100%',
                    minHeight: { xs: 'auto', md: '600px' },
                  }}
                >
                  <Typography variant="h6" gutterBottom component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <AssessmentIcon sx={{ mr: 1 }} /> PACER & Progress
                  </Typography>
                  
                  <ScorePanel 
                    currentScore={currentScore}
                    finalScore={finalScore}
                    executionScore={pillarScores.exec}
                    methodologyScore={pillarScores.meth}
                    progressScore={pillarScores.prog}
                    previousScore={previousScore}
                    timeRemaining={timeRemaining}
                    goalTarget={goalProgress.target}
                    goalCurrent={goalProgress.current}
                    sessionComplete={sessionComplete}
                    sessionDuration={sessionDuration}
                    showTimer={false}
                    scoreLabel={sessionComplete ? "Final Score (official)" : "Projected Score (EMA)"}
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom component="h3" sx={{ display: 'flex', alignItems: 'center' }}>
                      <FlagIcon fontSize="small" sx={{ mr: 1 }} /> Goal
                        </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {getGoalForPacerStage(scenarioContext?.pacerStage || 'A')}
                        </Typography>
                    
                    <Typography variant="h6" gutterBottom component="h3" sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                      <ScienceIcon fontSize="small" sx={{ mr: 1 }} /> PACER Methodology
                    </Typography>
                    
                    <div>
                      <Accordion 
                        expanded={expandedAccordion === 'prospect'} 
                        onChange={handleAccordionChange('prospect')}
                        sx={{ mb: 1 }}
                      >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                            P: Prospect
                    </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                          <Typography variant="body2">
                            In the Prospect stage, identify high-potential leads through referrals, market intelligence, and personalized outreach strategies.
                        </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemIcon><CheckCircleOutlineIcon color="success" fontSize="small" /></ListItemIcon>
                              <ListItemText primary="Qualify prospect fit" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon><CheckCircleOutlineIcon color="success" fontSize="small" /></ListItemIcon>
                              <ListItemText primary="Identify business needs" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon><CheckCircleOutlineIcon color="success" fontSize="small" /></ListItemIcon>
                              <ListItemText primary="Research company background" />
                            </ListItem>
                          </List>
                      </AccordionDetails>
                    </Accordion>
                    </div>
                  </Box>
                </Paper>
              </Grid>
            </>
          )}
        </Grid>
        
        {/* End session dialog */}
        <Dialog
          open={completeDialogOpen}
          onClose={() => setCompleteDialogOpen(false)}
        >
          <DialogTitle>End Session</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to end this sales session? This will calculate your final score and mark the session as complete.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDialogComplete} variant="contained" color="primary">
              End Session
            </Button>
          </DialogActions>
        </Dialog>

        {/* Feedback dialog */}
        <Dialog 
          open={showFeedbackDialog}
          onClose={handleCloseFeedback}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Session Feedback & Analysis</DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              Your session is complete. Here is your performance feedback:
            </DialogContentText>
            
            <FeedbackCard 
              sessionId={sessionId}
              scores={sessionScores}
              loading={loading}
              feedback={feedback || { 
                summary: "No feedback available yet.",
                strengths: [],
                areas_for_improvement: []
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseFeedback} 
              color="secondary"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                handleCloseFeedback();
                navigate('/sessions');
              }} 
              color="primary"
              startIcon={<ExitToAppIcon />}
            >
              Back to Session List
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Mobile device warning dialog */}
        <Dialog 
          open={showMobileWarning}
          onClose={() => setShowMobileWarning(false)}
        >
          <DialogTitle>
            <WarningIcon color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Mobile Device Detected
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              We've detected you're using a mobile device. For the best experience with voice features and interactive elements, 
              we recommend using a desktop browser.
            </DialogContentText>
            <DialogContentText sx={{ mt: 2 }}>
              You can continue, but some features may have limited functionality.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowMobileWarning(false)} color="primary">
              I Understand
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity} 
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Pause/Resume Button or Session Completion Status */}
        {sessionData?.is_timed && !sessionComplete ? (
          <Tooltip title={getPauseButtonTooltip()}>
            <span> {/* <<< ADDED SPAN WRAPPER >>> */}
              <IconButton
                color={isPaused ? "primary" : "default"}
                onClick={(event) => {
                  event.stopPropagation(); // Prevent event bubbling
                  if (remainingPauses > 0 || isPaused) {
                    togglePause();
                  }
                }}
                disabled={loading || (remainingPauses <= 0 && !isPaused)}
                sx={{ mx: 0.5 }}
              >
                {isPaused ? (
                  <PlayCircleOutlineIcon />
                ) : (
                  <PauseCircleOutlineIcon />
                )}
              </IconButton>
            </span> {/* <<< ADDED SPAN WRAPPER >>> */}
          </Tooltip>
        ) : null}

        {/* Pause Overlay - Only show when session is paused */}
        {isPaused && !sessionComplete && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(event) => event.stopPropagation()} // Prevent clicks on overlay from propagating
          >
            <Paper
              elevation={5}
              sx={{
                p: 4,
                maxWidth: '450px',
                width: '90%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Typography variant="h5" gutterBottom>
                Session Paused
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
                Take a moment to gather your thoughts. The timer is paused.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<PlayCircleOutlineIcon />}
                onClick={(event) => {
                  event.stopPropagation(); // Prevent event bubbling
                  togglePause();
                }}
                sx={{ mt: 2 }}
              >
                Resume Session
              </Button>
            </Paper>
          </Box>
        )}
      </Container>
    ); 
  }

  export default GameSession; 
