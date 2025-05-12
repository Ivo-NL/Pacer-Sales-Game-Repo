// api.js
import axios from 'axios';

// Determine the base URL for API calls based on environment
const getBaseUrl = () => {
  // For production environment (deployed on VPS)
  if (process.env.NODE_ENV === 'production') {
    // Use relative path - this will correctly resolve based on hostname
    return '/pacer-api';
  }
  // For development (localhost)
  return process.env.REACT_APP_API_URL || 'http://localhost:8001/api';
};

// Base API URL
const API_URL = getBaseUrl();

// Create axios instance with authorization header
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increase timeout to 30 seconds (30000ms)
  // Retry logic for network errors
  retry: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000; // 1s, 2s, 3s
  },
  withCredentials: true  // Changed back to true to avoid CORS issues with credentials
});

// Add a request interceptor for debugging
axiosInstance.interceptors.request.use(
    // let's not log the GET http://localhost:8001/api/game/sessions/75/timer-status 
  (config) => {
    if (config.url.includes('/timer-status')) {
      return config;
    }
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for debugging
axiosInstance.interceptors.response.use(
  // let's not log the GET http://localhost:8001/api/game/sessions/75/timer-status 
  (response) => {
    if (response.config.url.includes('/timer-status')) {
      return response;
    }
    console.log(`API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`API Error Response: ${error.response.status} ${error.config.method.toUpperCase()} ${error.config.url}`, error.response.data);
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Add retry interceptor
axiosInstance.interceptors.response.use(undefined, async (err) => {
  const { config } = err;
  
  // If config does not exist or the retry option is not set, reject
  if (!config || !config.retry) {
    return Promise.reject(err);
  }
  
  // Set the variable for keeping track of the retry count
  config.__retryCount = config.__retryCount || 0;
  
  // Check if we've maxed out the total number of retries
  if (config.__retryCount >= config.retry) {
    // Reject with the error
    return Promise.reject(err);
  }
  
  // Increase the retry count
  config.__retryCount += 1;
  
  // Check if the error is network-related
  const isNetworkError = err.message.includes('Network Error') || 
                         err.message.includes('ERR_NETWORK') || 
                         err.message.toLowerCase().includes('timeout') ||
                         err.code === 'ECONNABORTED';
  
  // If it's not a network error, reject immediately
  if (!isNetworkError) {
    return Promise.reject(err);
  }
  
  console.log(`Retry attempt #${config.__retryCount} for ${config.url}`);
  
  // Wait using the retry delay
  const delay = config.retryDelay(config.__retryCount);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Check online status before retry
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('Browser is offline, waiting for connection...');
    
    // Wait for online status before continuing
    await new Promise(resolve => {
      const checkOnline = () => {
        if (navigator.onLine) {
          window.removeEventListener('online', checkOnline);
          resolve();
        }
      };
      
      window.addEventListener('online', checkOnline);
      // Check every 2 seconds anyway in case the event doesn't fire
      const interval = setInterval(() => {
        if (navigator.onLine) {
          clearInterval(interval);
          window.removeEventListener('online', checkOnline);
          resolve();
        }
      }, 2000);
    });
  }
  
  // Try the request again
  return axiosInstance(config);
});

// Add authorization header to every request
axiosInstance.interceptors.request.use(
  config => {
    // Always fetch the token directly from localStorage
    // This ensures we have the most recent token even after a page refresh
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token issues
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // Check if error is due to authentication (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // Clear token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/pacer/login') {
        window.location.href = '/pacer/login';
      }
    }
    return Promise.reject(error);
  }
);

// Game API endpoints
const GAME_API = '/game';
const PROGRESS_API = '/progress';
const TEAM_API = '/team';
const CONTENT_API = '/content';
const AUTH_API = '/auth';
const RECORDINGS_API = '/recordings';

// API service object
const apiService = {
  // Auth endpoints
  auth: {
    login: (email, password) => axiosInstance.post('/login', { email, password }),
    register: (userData) => axiosInstance.post('/register', userData),
    getProfile: () => axiosInstance.get('/me'),
    webSocketToken: async () => {
      try {
        // Get a dedicated token for WebSocket connections
        const response = await axiosInstance.post(`${AUTH_API}/websocket-token`);
        return response.data.access_token;
      } catch (error) {
        console.error('Error getting WebSocket token:', error);
        return null;
      }
    },
    getWebSocketToken: () => axiosInstance.post(`${AUTH_API}/websocket-token`),
  },
  
  // Scenarios
  scenarios: {
    getAll: (params) => axiosInstance.get(`${GAME_API}/scenarios`, { params }),
    getById: (id) => axiosInstance.get(`${GAME_API}/scenarios/${id}`),
    create: (data) => axiosInstance.post(`${GAME_API}/scenarios`, data),
  },
  
  // Game sessions
  sessions: {
    create: (data) => axiosInstance.post(`${GAME_API}/sessions`, data),
    getById: async (id) => {
      try {
        console.log(`Fetching session with ID: ${id}`);
        const response = await axiosInstance.get(`${GAME_API}/sessions/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching session ${id}:`, error.response || error);
        throw error;
      }
    },
    getAll: (params) => axiosInstance.get(`${GAME_API}/sessions`, { params }),
    getSession: async (id) => {
      try {
        console.log(`Fetching detailed session with ID: ${id}`);
        const response = await axiosInstance.get(`${GAME_API}/sessions/${id}`);
        
        if (!response.data) {
          console.error("Empty response from server for session:", id);
          throw new Error("Empty response from server");
        }
        
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.error(`Session with ID ${id} not found`);
          throw new Error(`Session not found: ${id}`);
        }
        console.error(`Error fetching session details for ${id}:`, error.response || error);
        throw error;
      }
    },
    listInputItems: async (id) => {
        const response = await axiosInstance.get(`${GAME_API}/sessions/${id}`);
        
        // Transform the data to match the expected structure in GameSession.js
        const items = response.data.interactions
            .filter(interaction => interaction.player_input) // Only include items with player input
            .map(interaction => ({
                // Each item should have:
                role: 'user', // We only care about user transcripts
                content: [
                    {
                        type: 'input_audio_transcript',
                        text: interaction.player_input
                    }
                ]
            }));
        
        return { data: items };
    },

    getMessages: async (id) => {
      try {
        console.log(`Fetching messages for session ${id}`);
        // Implement the message retrieval once backend supports it
        // For now, return an empty array
        return [];
      } catch (error) {
        console.error(`Error fetching messages for session ${id}:`, error.response || error);
        return [];
      }
    },
    interact: (sessionId, data) => axiosInstance.post(`/game/sessions/${sessionId}/interact`, data),
    streamInteract: (sessionId, data) => ({
      url: `/game/sessions/${sessionId}/stream-interact`,
      method: 'POST',
      data,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
    streamInteractFetch: async (sessionId, data, onMessage) => {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Use the full backend API URL for fetch
      const url = `${API_URL}/game/sessions/${sessionId}/stream-interact`;
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulated = '';
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: !done });
            accumulated += chunk;
            // Optionally, split on newlines for SSE-like streaming
            let lines = accumulated.split('\n');
            accumulated = lines.pop(); // last partial line
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const parsed = JSON.parse(line);
                  onMessage(parsed);
                } catch (e) {
                  // If not JSON, just send raw line
                  onMessage(line);
                }
              }
            }
          }
        }
        // Handle any remaining data
        if (accumulated && accumulated.trim()) {
          try {
            const parsed = JSON.parse(accumulated);
            onMessage(parsed);
          } catch (e) {
            onMessage(accumulated);
          }
        }
      } catch (error) {
        console.error('Error in streamInteractFetch:', error);
        throw error;
      }
    },
    speechToText: (sessionId, audioBlob) => {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'audio.wav');
      
      return axiosInstance.post(`/game/sessions/${sessionId}/speech-to-text`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    textToSpeech: (sessionId, text, voice = 'alloy') => {
      return axiosInstance.post(`/game/sessions/${sessionId}/text-to-speech`, 
        { text, voice },
        { responseType: 'blob' }
      );
    },
    getAudioStreamUrl: async (sessionId) => {
      try {
        // Get a WebSocket token
        const response = await axiosInstance.post(`${AUTH_API}/websocket-token`);
        const token = response.data.access_token;
        
        if (!token) {
          console.error('Failed to get WebSocket token');
          return null;
        }
        
        // Build WebSocket URL with token
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Determine host based on environment
        let wsHost;
        if (process.env.NODE_ENV === 'production') {
          // In production, use the same host as the application
          wsHost = window.location.host;
          return `${wsProtocol}//${wsHost}/pacer-api/game/sessions/${sessionId}/audio-stream?token=${token}`;
        } else {
          // In development, use localhost with backend port
          wsHost = 'localhost:8001';
          return `${wsProtocol}//${wsHost}/api/game/sessions/${sessionId}/audio-stream?token=${token}`;
        }
      } catch (error) {
        console.error('Error getting WebSocket URL:', error);
        return null;
      }
    },
    getRealtimeVoiceUrl: async function (sessionId) {
      try {
        // Get WebSocket token
        const token = await this.getWebSocketToken();
        
        if (!token) {
          console.error("Failed to get WebSocket token");
          return null;
        }
        
        // Determine protocol and host
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsHost;
        let wsPath;
        
        if (process.env.NODE_ENV === 'production') {
          // In production, use the same host as the application
          wsHost = window.location.host;
          wsPath = '/pacer-api/game/ws/rt_proxy_connect';
        } else {
          // In development, use localhost with backend port
          wsHost = 'localhost:8001';
          wsPath = '/api/game/ws/rt_proxy_connect';
        }
        
        // Return URL for the proxy endpoint
        const url = `${wsProtocol}//${wsHost}${wsPath}/${sessionId}`;
        console.log("Using realtime voice WebSocket URL:", url);
        return url;
      } catch (error) {
        console.error("Error constructing realtime voice WebSocket URL:", error);
        return null;
      }
    },
    getRealtimeVoiceToken: async (sessionId) => {
      try {
        // POST to the backend to get the ephemeral OpenAI token
        const response = await axiosInstance.post(`/game/sessions/${sessionId}/realtime-token`);
        if (!response || !response.data || !response.data.token) {
          throw new Error('Failed to retrieve OpenAI token');
        }
        return response.data.token;
      } catch (error) {
        console.error('Error getting OpenAI token:', error);
        throw error;
      }
    },
    complete: (sessionId) => axiosInstance.post(`/game/sessions/${sessionId}/complete`),
    getScore: async (sessionId) => {
      try {
        console.log(`Fetching scores for session ${sessionId}`);
        const response = await axiosInstance.get(`/game/sessions/${sessionId}/score`);
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`No scores available yet for session ${sessionId}`);
          // Return default scores object instead of null
          return {
            total_score: 0,
            prospect_score: 0,
            assess_score: 0,
            challenge_score: 0,
            execute_score: 0,
            retain_score: 0
          };
        }
        console.error(`Error fetching scores for session ${sessionId}:`, error.response || error);
        throw error;
      }
    },
    getCurrentScore: async (sessionId) => {
      try {
        console.log(`Fetching current score for in-progress session ${sessionId}`);
        const response = await axiosInstance.get(`/game/sessions/${sessionId}/current-score`);
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`No current score available yet for session ${sessionId}`);
          // Return default scores object instead of null
          return {
            total_score: 0,
            methodology_score: 0,
            rapport_score: 0,
            progress_score: 0,
            outcome_score: 0,
            detailed_breakdown: {}
          };
        }
        console.error(`Error fetching current score for session ${sessionId}:`, error.response || error);
        throw error;
      }
    },
    delete: (sessionId) => axiosInstance.delete(`/game/sessions/${sessionId}`),
    restart: (sessionId) => axiosInstance.post(`/game/sessions/${sessionId}/restart`),
    
    startTimer: (sessionId) => axiosInstance.post(`/game/sessions/${sessionId}/start-timer`),
    pauseTimer: (sessionId) => axiosInstance.post(`/game/sessions/${sessionId}/pause-timer`),
    resumeTimer: (sessionId) => axiosInstance.post(`/game/sessions/${sessionId}/start-timer`),
    timerStatus: (sessionId) => axiosInstance.get(`/game/sessions/${sessionId}/timer-status`),
    
    triggerEvent: (sessionId, eventData) => axiosInstance.post(`/game/sessions/${sessionId}/trigger-event`, eventData),
    respondToEvent: (sessionId, eventData) => axiosInstance.post(`/game/sessions/${sessionId}/event-response`, eventData),
  },
  
  // Game events
  events: {
    getScenarioEvents: (scenarioId) => axiosInstance.get(`/game/game-events/${scenarioId}`),
    create: (data) => axiosInstance.post(`/game/game-events`, data)
  },
  
  // Timed challenges
  challenges: {
    getSessionChallenges: (sessionId) => axiosInstance.get(`/game/timed-challenges/${sessionId}`),
    create: (data) => axiosInstance.post(`/game/timed-challenges`, data),
    update: (id, data) => axiosInstance.put(`/game/timed-challenges/${id}`, data)
  },
  
  // Difficulty settings
  difficulty: {
    get: () => axiosInstance.get(`/game/difficulty-settings`),
    update: (data) => axiosInstance.put(`/game/difficulty-settings`, data),
    create: (data) => axiosInstance.post(`/game/difficulty-settings`, data)
  },
  
  // Seasonal content
  seasonal: {
    getActive: () => axiosInstance.get(`/game/seasonal-content`),
    create: (data) => axiosInstance.post(`/game/seasonal-content`, data)
  },
  
  // Progress tracking
  progress: {
    getProgress: () => axiosInstance.get(`${PROGRESS_API}`),
    getDetailedProgress: () => axiosInstance.get(`${PROGRESS_API}/detailed`),
    getAllBadges: () => axiosInstance.get(`${PROGRESS_API}/badges`),
    getUserBadges: (userId = null) => axiosInstance.get(`${PROGRESS_API}/badges/user`, { params: { user_id: userId }}),
    checkAchievements: () => axiosInstance.post(`${PROGRESS_API}/check-achievements`),
    getSkillRecommendations: () => axiosInstance.get(`${PROGRESS_API}/skills/recommendations`),
  },
  
  // Leaderboard
  leaderboard: {
    get: (params) => axiosInstance.get(`${GAME_API}/leaderboard`, { params }),
  },
  
  // Team features
  teams: {
    getAll: () => axiosInstance.get(`${TEAM_API}/teams`),
    get: (id) => axiosInstance.get(`${TEAM_API}/teams/${id}`),
    create: (data) => axiosInstance.post(`${TEAM_API}/teams`, data),
    update: (id, data) => axiosInstance.put(`${TEAM_API}/teams/${id}`, data),
    delete: (id) => axiosInstance.delete(`${TEAM_API}/teams/${id}`),
    getMembers: (teamId) => axiosInstance.get(`${TEAM_API}/teams/${teamId}/members`),
    addMember: (teamId, data) => axiosInstance.post(`${TEAM_API}/teams/${teamId}/members`, data),
    removeMember: (teamId, userId) => axiosInstance.delete(`${TEAM_API}/teams/${teamId}/members/${userId}`),
    join: (teamId) => axiosInstance.post(`${TEAM_API}/teams/${teamId}/join`),
    leave: (teamId) => axiosInstance.post(`${TEAM_API}/teams/${teamId}/leave`),
    getChallenges: (teamId) => axiosInstance.get(`${TEAM_API}/challenges?team_id=${teamId}`),
    createChallenge: (teamId, data) => axiosInstance.post(`${TEAM_API}/challenges`, {...data, team_id: teamId}),
    getChallengeById: (challengeId) => axiosInstance.get(`${TEAM_API}/challenges/${challengeId}`),
    getChallengeResults: (challengeId) => axiosInstance.get(`${TEAM_API}/challenges/${challengeId}/results`),
  },

  // Content library
  content: {
    getPacerMethodology: () => axiosInstance.get(`${CONTENT_API}/pacer_methodology`),
    getIndustryApplications: () => axiosInstance.get(`${CONTENT_API}/industry_applications`),
    getRegionalConsiderations: () => axiosInstance.get(`${CONTENT_API}/regional_considerations`),
  },
  
  // Recording system
  recordings: {
    list: () => axiosInstance.get(`${RECORDINGS_API}`),
    get: (id) => axiosInstance.get(`${RECORDINGS_API}/${id}`),
    create: (data) => axiosInstance.post(`${RECORDINGS_API}`, data),
    update: (id, data) => axiosInstance.put(`${RECORDINGS_API}/${id}`, data),
    delete: (id) => axiosInstance.delete(`${RECORDINGS_API}/${id}`),
    requestReview: (id) => axiosInstance.post(`${RECORDINGS_API}/${id}/request-review`),
    getPendingReviews: () => axiosInstance.get(`${RECORDINGS_API}/reviews/pending`),
    submitReview: (id, data) => axiosInstance.post(`${RECORDINGS_API}/${id}/review`, data),
   
    // Annotations
    getAnnotations: (recordingId) => axiosInstance.get(`${RECORDINGS_API}/${recordingId}/annotations`),
    createAnnotation: (recordingId, data) => axiosInstance.post(`${RECORDINGS_API}/${recordingId}/annotations`, data),
   
    // Bookmarks
    getBookmarks: (recordingId) => axiosInstance.get(`${RECORDINGS_API}/${recordingId}/bookmarks`),
    createBookmark: (recordingId, data) => axiosInstance.post(`${RECORDINGS_API}/${recordingId}/bookmarks`, data),
   
    // Sharing
    share: (recordingId, data) => axiosInstance.post(`${RECORDINGS_API}/${recordingId}/share`, data),
   
    // Export
    export: (recordingId, data) => axiosInstance.post(`${RECORDINGS_API}/${recordingId}/export`, data),
  },
};

export default apiService;