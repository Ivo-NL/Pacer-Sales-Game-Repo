    // useRealtimeVoice.js
    import React, { useState, useEffect, useRef, useCallback } from 'react';
    import {
      Box, Paper, Typography, IconButton, Chip, Tooltip, Switch, FormControlLabel, FormGroup, CircularProgress, Alert, TextField
    } from '@mui/material';
    import MicIcon from '@mui/icons-material/Mic';
    import VolumeUpIcon from '@mui/icons-material/VolumeUp';
    import VolumeOffIcon from '@mui/icons-material/VolumeOff';
    import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
    import CheckCircleIcon from '@mui/icons-material/CheckCircle';
    import ErrorIcon from '@mui/icons-material/Error';
    import GraphicEqIcon from '@mui/icons-material/GraphicEq';
    import MicOffIcon from '@mui/icons-material/MicOff';
    import apiService from '../../services/api'; // Adjusted path
    import { log, logEveryN } from '../../utils/logging'; // <<< ADDED logging import

    const makeSegment = (sender, text) => ({ sender, text: text.trim() });
    
    // Helper to normalize text for comparison
    const normalizeText = (s) => (s || '').trim().replace(/\s+/g, ' ');

    // Audio configuration
    const PCM_SAMPLE_RATE = 16000;
    const AUDIO_LEVEL_THRESHOLD = 0.0005; // Lower threshold to detect more speech
    const AI_GRACE_MS = 800; // Wait after response.done before restarting mic
    const RESTART_DELAY_MS = 400; // Add a slight delay to prevent empty commits

    // Constants for speech processing
    const MIN_BUFFER_SIZE = 4800; // 300ms at 16kHz (minimum samples for meaningful audio)
    const MIN_COMMIT_INTERVAL_MS = 200; // Minimum time between audio buffer sends (reduced from 500ms)
    const SILENCE_FRAMES_THRESHOLD = 18; // Approximately 1.2 seconds at processor buffer size 4096

    // Improve the downsampling function to handle potential edge cases
    function downSampleTo16k(buffer, fromRate) {
      if (fromRate === 16000) return buffer;
      
      // Extra validation to handle edge cases
      if (!buffer || buffer.length === 0) {
        console.warn("Empty buffer provided to downsampling function");
        return new Float32Array(0);
      }
      
      const ratio = fromRate / 16000;
      const outLength = Math.round(buffer.length / ratio);
      const out = new Float32Array(outLength);
      
      for (let i = 0; i < outLength; i++) {
        const idx = i * ratio;
        const before = Math.floor(idx);
        const after = Math.min(before + 1, buffer.length - 1);
        const weight = idx - before;
        out[i] = buffer[before] * (1 - weight) + buffer[after] * weight;
      }
      
      return out;
    }

    // Add a function to process transcript text for better readability
    const processTranscriptText = (text) => {
      if (!text || typeof text !== 'string') return ''; // Added type check
      
      // Replace common disfluencies with empty strings first
      let processed = text
        .replace(/(\buhm*\b|\buh\b|\ber\b|\bum\b|\buh-huh\b|\byou know\b|\bsort of\b|\bkind of\b|\bI mean\b)/gi, '')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
        
      // Early exit if processed text is empty after removing disfluencies
      if (!processed) return '';

      // Add periods for natural sentence breaks - more robust logic
      // Ensures space after punctuation, removes space before, adds period between lower/upper
      processed = processed
        .replace(/([.!?])\s*([A-Z\d])/g, '$1 $2') 
        .replace(/\s+([.!?,;:])/g, '$1') 
        .replace(/([a-z])([A-Z])/g, '$1. $2'); 

      // Capitalize first letter of the text
      if (processed.length > 0) {
        processed = processed.charAt(0).toUpperCase() + processed.slice(1);
      }
      
      // Ensure proper ending punctuation if none exists
      if (processed.length > 0 && !processed.match(/[.!?]$/)) {
        processed += '.';
      }
      
      return processed;
    };

    // Helper function to format context information for model instructions
    const formatContextForInstructions = (context, conversation_history = [], userName = "Salesperson") => {
       // Directly use context as it contains the persona info, provide defaults
       const clientPersona = context || {}; 
       const pacerStage = context?.pacerStage || 'A'; // Default to A if not provided
       const scenario = context?.scenario || {};
       const productInfo = context?.productInfo || {};

       // Format conversation history summary (last few exchanges)
       const historyLimit = 10; // Limit to last 10 messages (user + assistant)
       const recentHistory = conversation_history.slice(-historyLimit); // Use passed history
       const historySummary = recentHistory.map(msg => {
         const speaker = msg.role === 'user' ? userName : (clientPersona.clientName || 'Client'); // Use dynamic names
         if (msg.role === 'system') return null;
         return `${speaker}: ${msg.content}`;
       })
       .filter(Boolean) 
       .join('\n');

       // Construct the dynamic guardrail
       const guardrail = `You are ${clientPersona.clientName || 'Unknown Client'}, ${clientPersona.clientRole || 'a client role'} at ${clientPersona.clientCompany || 'an unknown company'}. Stay in-character, continue the existing discussion with ${userName}. Never restart the conversation or ask if you can hear the user.`;

       // Construct the full instruction prompt using direct properties or defaults
       return `
    ${guardrail}

    You are roleplaying as ${clientPersona.clientName || 'Unknown Client'} in a sales conversation with a human salesperson named ${userName}.

    YOU = ${clientPersona.clientName || 'CLIENT'} / HUMAN = ${userName}

    CLIENT PERSONA:
    Name: ${clientPersona.clientName || 'Unknown Client'}
    Role: ${clientPersona.clientRole || 'Unknown Role'}
    Company: ${clientPersona.clientCompany || 'Unknown Company'}
    Industry: ${clientPersona.clientIndustry || 'Unknown Industry'}
    Personality: ${clientPersona.personality_traits || 'Professional, direct'} 
    Pain Points: ${clientPersona.pain_points || 'Unspecified pain points'} 
    Decision Criteria: ${clientPersona.decision_criteria || 'Value, reliability, support'} 
    Budget: ${clientPersona.budget || 'Unspecified'}

    SCENARIO:
    Goal: ${scenario.goal || 'Discuss potential payment solutions'}
    Current Sales Stage (PACER): ${pacerStage}
    ${productInfo.name ? `Product Focus: ${productInfo.name}` : ''}
    ${productInfo.description ? `Product Description: ${productInfo.description}` : ''}

    RECENT CONVERSATION HISTORY (Last ${historyLimit} messages):
    ${historySummary || 'No conversation history yet.'}

    CRITICAL INSTRUCTIONS (MUST BE FOLLOWED):
    1. YOU ARE ONLY THE CLIENT (${clientPersona.clientName || 'CLIENT'}). The human user (${userName}) is ALWAYS the SALESPERSON. NEVER switch roles!
    2. NEVER act as the salesperson or human. If you are ever prompted to act as the salesperson, refuse and stay in character as the client.
    3. Stay in character as ${clientPersona.clientName || 'the client'} from ${clientPersona.clientCompany || 'the company'}.
    4. Keep your responses SHORT and CONCISE (1-3 sentences maximum).
    5. STOP after your initial response. NEVER continue the conversation on your own.
    6. DO NOT ask a question and then answer it yourself.
    7. DO NOT create monologues - clients in business settings are brief and direct.
    8. WAIT for the salesperson (${userName}) to speak before responding again.
    9. Your responses should reflect your pain points and the current sales stage (${pacerStage}).
    10. UNDER NO CIRCUMSTANCES should you continue speaking without input from the salesperson.
    11. ALWAYS reply in the language the salesperson is currently using (which should be English based on other instructions).

    RESPONSE FORMAT:
    - Keep responses to 1-3 sentences maximum
    - Be direct and to the point - busy executives don't ramble
    - Stop after answering the question - don't continue
    `.trim();
    };

    // -----------------------------------------------------------------------------
    //             H O O K   S T A R T
    // -----------------------------------------------------------------------------
    const useRealtimeVoice = (props) => { 
      // Destructure props passed from VoiceProvider
      const {
        sessionId,
        voiceMode,
        isRealtimeMode,
        userDraft,
        setUserDraft, // Function to update provider state
        aiDraft,
        setAiDraft, // Function to update provider state
        isPaused,
        userName,
        scenarioContext,
        conversationHistory,
        sessionComplete, // <<< Renamed from props.sessionComplete
        // Callback FUNCTIONS received from Provider (not refs anymore)
        handleSnackbar,
        addMessage,
        processEvaluationData,
        handleTranscriptReady,
        handleUserTranscriptChunk,
        handleUserTranscriptComplete,
        setSessionData
      } = props;
      // -------------------------------------------------------------------------
      //                S T A T E   &   R E F S
      // -------------------------------------------------------------------------
      // Single source of truth for voice transport state
      const [voiceTransport, setVoiceTransport] = useState('none'); // 'none' | 'http' | 'audio_ws' | 'realtime_webrtc'
      
      const [isRealtimeWsConnected, setIsRealtimeWsConnected] = useState(false);
      const [isTransmitting, setIsTransmitting] = useState(false);
      const [isReceiving, setIsReceiving] = useState(false); // For potential future use (e.g., visual feedback)
      const [isSpeaking, setIsSpeaking] = useState(false); // For potential future use (e.g., visual feedback)
      const [isClientSpeaking, setIsClientSpeaking] = useState(false); // AI speaking state (based on audio playback)
      const [isMuted, setIsMuted] = useState(false); // User mic mute
      const [isOutputMuted, setIsOutputMuted] = useState(false); // AI audio output mute
      const [isConnecting, setIsConnecting] = useState(false); // Websocket connecting state
      const [audioPlayback, setAudioPlayback] = useState(null); // This state might be removable if WebRTC audio element is used directly
      const [isAudioProcessingStarted, setIsAudioProcessingStarted] = useState(false);
      const [realtimeError, setRealtimeError] = useState(null); // Add missing state variable
      const [isFinishingPlayback, setIsFinishingPlayback] = useState(false);
      const [wsClientConfig, setWsClientConfig] = useState(null); // WebSocket client configuration
      const [audioLevel, setAudioLevel] = useState(0); // Current audio level
      const [maxAudioLevel, setMaxAudioLevel] = useState(0.01); // Max audio level
      const [sessionTimestamp, setSessionTimestamp] = useState(Date.now()); // Session timestamp
      const [microphonePermission, setMicrophonePermission] = useState('unknown'); // 'unknown', 'granted', 'denied', 'requesting'
      const transcriptRef = useRef([]);      //  ← NEW
      const lastUserPartialRef = useRef(''); //  ← NEW – to collect partial STT
      // Ref to accumulate AI speech transcript (built from response.audio_transcript.delta events)
      const aiSpeechDraftRef = useRef('');

      // --- References ---
      const clientRef = useRef(null); // Client reference (RealtimeClient instance)
      const websocketRef = useRef(null); // Add this line for WebSocket reference
      const audioContextRef = useRef(null); // For input processing
      const scriptProcessorNodeRef = useRef(null);
      const audioStreamRef = useRef(null); // User mic stream
      const mediaRecorderRef = useRef(null); // Used mainly to keep mic active in some browsers
      const recorderStartedRef = useRef(false); // Custom flag to track if recorder/processing has started
      const outputAudioContextRef = useRef(null); // For playback
      const outputAudioQueue = useRef([]); // Queue for decoded audio buffers
      const isPlayingOutputRef = useRef(false); // Flag to prevent overlapping playback
      const gainNodeRef = useRef(null); // For output volume control
      const isTransmittingRef = useRef(false);
      const hasSentAudioRef = useRef(false); // <<< Add this ref
      const onaudioprocessCounterRef = useRef(0); // <<< Add counter ref
      const consecutiveSilenceCounterRef = useRef(0); // <<< Add silence counter ref
      const connectionFailed = useRef(false); // Flag to track if connection failed explicitly
      const audioSourceRef = useRef(null);
      const processorRef = useRef(null);
      const streamRef = useRef(null);
      // Add a ref to track the number of samples sent since last commit
      const samplesSinceLastCommitRef = useRef(0);
      
      // Add connection lock and tracking refs
      const connectionLockRef = useRef(false);
      const connectionAttemptTimestampRef = useRef(0);
      const connectionTimeoutRef = useRef(null);
      const forceReconnectRef = useRef(false);
      const initialConfigSentRef = useRef(false);
      const shouldConnectRef = useRef(false);
      const sessionIdRef = useRef(sessionId);
      const audioStartedRef = useRef(false); // <<< ADDED Guard Ref
      
      // Add stability refs to avoid unnecessary effect triggers
      const isRealtimeModeRef = useRef(isRealtimeMode);
      const voiceModeRef = useRef(voiceMode);
      const mountedRef = useRef(false);
      const pendingConnectionRef = useRef(false);
      const stableCleanupRef = useRef(null);
      const intentionalDisconnectRef = useRef(false);
      const isRealtimeWsConnectedRef = useRef(false); // New ref for immediate connection state checks
      const isGracefulShutdownRef = useRef(false);

      const outputSampleRate = 24000; // OpenAI realtime API output sample rate
      const realtimeModelName = "gpt-4o-mini-realtime-preview"; // Default model for OpenAI Realtime API
      const transcriptionModelName = "gpt-4o-transcribe"; // Default model for OpenAI Transcription API

      // Add this near the top with other state references
      const lastAiResponseTimeRef = useRef(null);
      const aiCooldownPeriodMs = 1500; // 1.5 second cooldown after AI stops speaking
      const minimumUserSpeechDurationMs = 1000; // Increase from 500ms to 1000ms
      const MAX_USER_TURN_MS = 60000; // <<< INCREASED to 60 seconds (was 20000)
      const userSpeechStartTimeRef = useRef(null);
      const hasDetectedUserSpeechRef = useRef(false);
      const userBufferRef = useRef(''); // Buffer for user transcript deltas - DEPRECATED, consider removing if userTranscriptRef fully replaces
      const currentUserItemIdRef = useRef(null); // Ref for current user utterance item ID
      const userTranscriptRef = useRef(''); // Ref for accumulating user transcript deltas

      // Add this with the other refs
      const cachedWsUrlRef = useRef(null);
      const connectionInProgressRef = useRef(false);
      const waitingForAiRef = useRef(false);
      const voiceTransportRef = useRef('none'); // Track voiceTransport in a ref for immediate access

      // Add new ref to track last commit time
      const lastCommitTimeRef = useRef(0);
      const MIN_COMMIT_INTERVAL_MS = 500; // Minimum 500ms between commits
      
      // Add flag to track if any audio has been sent
      const hasSentEnoughAudioRef = useRef(false);
      const requiredSamplesForCommit = 1600; // 100ms at 16kHz (minimum required by OpenAI is 100ms)

      // Add additional state variables
      const [lastEmitTimestamp, setLastEmitTimestamp] = useState(0);
      const [lastBufferCommitTime, setLastBufferCommitTime] = useState(0);
      const lastTranscriptRef = useRef(null);
      const accumulatedTranscriptRef = useRef('');
      
      // Add ref to track if we're currently persisting to prevent duplicates
      const isPersistingRef = useRef(false);
      
      // Function to persist transcripts to the database with debouncing
      const persistTranscript = useCallback(async (text, role) => {
        // Now read sessionComplete from props
        if (!sessionId || props.sessionComplete || isPaused || !text?.trim() || isPersistingRef.current) return;
        
        try {
          isPersistingRef.current = true;
          console.log(`Persisting ${role} transcript: \"${text.substring(0, 50)}...\"`);
          await apiService.sessions.interact(sessionId, {
            message: text,
            role: role,
            generate: false, 
            modality: 'voice'
          });
          console.log('Transcript successfully persisted via interact endpoint.');
        } catch (error) {
          console.error('Failed to persist transcript via interact:', error);
        } finally {
          setTimeout(() => { isPersistingRef.current = false; }, 300);
        }
      }, [sessionId, isPaused, props.sessionComplete]); // Ensure props.sessionComplete is here

      const pushTranscript = useCallback((sender, text) => {
        if (!text || !text.trim()) return;
        transcriptRef.current.push(makeSegment(sender, text));
      }, []);

      // Add the flushTranscriptAndSave function after pushTranscript
      const flushTranscript = useCallback(() => {
        if (transcriptRef.current.length) {
          const copy = [...transcriptRef.current];
          transcriptRef.current = [];
          
          // Pass the transcript segments to the parent component for UI updates
          handleTranscriptReady?.(copy); // <<< Use ref
          
          // No need to save to a separate endpoint - transcripts get saved when interaction is complete
        }
      }, [handleTranscriptReady]);

      const calculateRMS = useCallback((inputData) => {
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        return Math.sqrt(sum / inputData.length);
      }, []);

      /*
      * Send a raw 16-bit-PCM mono buffer (16 kHz) to the current realtime socket.
      * Silently no-ops if the socket isn't ready.
      *
      * @param {ArrayBuffer} pcm16Buffer  Little-endian PCM16 audio
      */
      const sendInputAudio = (pcm16Buffer) => {
        const ws = clientRef.current?.nativeWs;
        
        // Skip if WebSocket is not open or muted
        if (!ws || ws.readyState !== WebSocket.OPEN || isMuted) {
          return;
        }

        // Check if buffer size is sufficient - prevent empty/tiny buffers
        // OpenAI requires at least 100ms of audio (1600 samples at 16kHz)
        if (!pcm16Buffer || pcm16Buffer.byteLength < requiredSamplesForCommit * 2) { // 1600 samples x 2 bytes per sample (16-bit)
          console.log(`Skipping small buffer: ${pcm16Buffer?.byteLength || 0} bytes (min: ${requiredSamplesForCommit * 2} bytes/${requiredSamplesForCommit} samples)`);
          return;
        }
        
        // Throttle buffer sends to avoid overwhelming the server
        const now = Date.now();
        if (now - lastCommitTimeRef.current < MIN_COMMIT_INTERVAL_MS) {
          console.log(`Throttling audio send: ${now - lastCommitTimeRef.current}ms since last send (min: ${MIN_COMMIT_INTERVAL_MS}ms)`);
          return;
        }
        
        // Update the commit time reference
        lastCommitTimeRef.current = now;
        
        // Track buffer size for logging
        samplesSinceLastCommitRef.current += pcm16Buffer.byteLength / 2; // Divide by 2 for 16-bit samples
        
        // PCM bytes → base64
        const bytes = new Uint8Array(pcm16Buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const b64 = btoa(bin);

        // Send the audio data
        ws.send(
          JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: b64,
          }),
        );
      };

      /**
      * Normalise every transcript delta/final we receive and push it through the
      * existing transcript plumbing.  Flushes on finals so the parent gets the
      * completed turn immediately.
      *
      * @param {Object}  p
      * @param {"SALESPERSON"|"CLIENT"} p.sender Logical speaker
      * @param {string} p.text                       The utterance chunk
      * @param {boolean} [p.isFinal=false]           Whether this is the last chunk
      */
      const handleTextEvent = ({ sender, text, isFinal = false }) => {
        if (!text || isPaused || sender !== 'user') return; // Only process user chunks if not paused
        
        // Update userDraft state directly for immediate visual feedback
        if (!isFinal) {
            setUserDraft(prev => (prev + ' ' + text).trim());
            // We don't call addMessage here for intermediate chunks
        }
        // Final transcript processing (calling addMessage, persistTranscript)
        // happens ONLY in the WebSocket message handler for the 
        // 'conversation.item.input_audio_transcription.completed' event.
      };

      // Function to start the appropriate voice transport based on mode
      const startVoiceTransport = useCallback((transportType) => {
        if (sessionComplete) {
          console.log("Session is complete, skipping voice transport start");
          return;
        }

        if (voiceTransportRef.current === transportType) {
          console.log(`Voice transport already set to ${transportType}, skipping start`);
          return;
        }

        // First cleanup any existing transport
        if (voiceTransportRef.current !== 'none') {
          console.log(`Cleaning up existing transport: ${voiceTransportRef.current} before starting: ${transportType}`);
          stopVoiceTransport(true);
        }

        console.log(`Starting voice transport: ${transportType}`);
        
        // Update refs immediately to prevent race conditions
        voiceTransportRef.current = transportType;
        setVoiceTransport(transportType);

        switch (transportType) {
          case 'audio_ws':
            // Start the standard WebSocket for audio
            initializeWebSocket();
            break;
          case 'realtime_webrtc':
            // Start the realtime WebRTC connection
            connectRealtimeVoice();
            break;
          case 'none':
            // No voice transport needed
            console.log("Voice transport set to none");
            break;
          default:
            console.error(`Unknown transport type: ${transportType}`);
        }
      }, [sessionComplete]);

      // --- Transcript flush helper ---
      const flushTranscriptAndClear = useCallback(() => {
        if (transcriptRef.current.length) {
          handleTranscriptReady?.([...transcriptRef.current]); // <<< Use ref
          transcriptRef.current.length = 0;
          lastUserPartialRef.current = '';
        }
      }, [handleTranscriptReady]);

      // Function to stop the current voice transport
      const stopVoiceTransport = useCallback((skipNotification = false) => {
        const currentTransport = voiceTransportRef.current;
        console.warn(`----------- stopVoiceTransport called for transport: ${currentTransport} -----------`);
        console.trace("Trace of stopVoiceTransport call stack");
        
        // Set intentional disconnection to prevent error messages
        intentionalDisconnectRef.current = true;

        // Update refs immediately
        voiceTransportRef.current = 'none';
        setVoiceTransport('none');

        switch (currentTransport) {
          case 'audio_ws':
            // Close the standard WebSocket
            if (websocketRef.current) {
              try {
                websocketRef.current.close();
                websocketRef.current = null;
              } catch (e) {
                console.error("Error closing WebSocket:", e);
              }
            }
            break;
          case 'realtime_webrtc':
            // Close the realtime WebRTC connection
            if (stableCleanupRef.current) {
              stableCleanupRef.current();
            }
            break;
          case 'none':
            // Nothing to clean up
            console.log("No voice transport to stop");
            break;
          default:
            console.error(`Unknown transport type: ${currentTransport}`);
        }

        // Flush transcript on shutdown
        flushTranscriptAndClear();

        // Show notification if needed
        if (!skipNotification) {
          handleSnackbar('Voice transport disconnected', 'info'); // <<< Use ref
        }
      }, [handleSnackbar, flushTranscriptAndClear]);

      // Update the refs when relevant props change
      useEffect(() => {
        sessionIdRef.current = sessionId;
        isRealtimeModeRef.current = isRealtimeMode;
        voiceModeRef.current = voiceMode;
        shouldConnectRef.current = isRealtimeMode && !!sessionId;
        
        // Handle changes in mode props to update transport state
        if (isRealtimeMode && !voiceMode) {
          // Realtime mode is enabled, but standard voice mode is off
          startVoiceTransport('realtime_webrtc');
        } else if (voiceMode && !isRealtimeMode) {
          // Standard voice mode is enabled, but realtime mode is off
          startVoiceTransport('audio_ws');
        } else if (!voiceMode && !isRealtimeMode) {
          // Both modes are off, stop any transport
          stopVoiceTransport();
        } else if (voiceMode && isRealtimeMode) {
          // Both modes are on - prioritize realtime
          console.log("Both voice modes enabled - prioritizing realtime");
          startVoiceTransport('realtime_webrtc');
        }
      }, [isRealtimeMode, voiceMode, sessionId, startVoiceTransport, stopVoiceTransport]);
      
      // Set the mounted flag on component mount
      useEffect(() => {
        mountedRef.current = true;
        return () => {
          mountedRef.current = false;
          intentionalDisconnectRef.current = true;
          // Final cleanup on unmount
          if (stableCleanupRef.current) {
            stableCleanupRef.current();
          }
          // Ensure we stop any active transport
          stopVoiceTransport(true);
          // Flush transcript on unmount
          flushTranscriptAndClear();
        };
      }, [stopVoiceTransport, flushTranscriptAndClear]);

      // WebSocket initialization for voice mode
      const initializeWebSocket = useCallback(async () => {
        try {
          // Skip if we're unmounted or already have a connection
          if (!mountedRef.current || websocketRef.current) {
            return;
          }

          // Get WebSocket URL from API
          const wsUrl = await apiService.sessions.getAudioStreamUrl(sessionId);
          console.log('Connecting to WebSocket:', wsUrl);
          
          if (!wsUrl) {
            handleSnackbar('Failed to get WebSocket URL', 'error'); // <<< Use ref
            setVoiceTransport('none');
            voiceTransportRef.current = 'none';
            return;
          }
          
          // Clear any previous connection
          if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
          }
          
          // Create new WebSocket connection
          const newWs = new WebSocket(wsUrl);
          websocketRef.current = newWs;
          
          newWs.onopen = () => {
            console.log('WebSocket connection opened');
            setIsRealtimeWsConnected(true);
            handleSnackbar('Audio streaming connected', 'success'); // <<< Use ref
          };
          
          newWs.onclose = () => {
            console.log('WebSocket connection closed');
            setIsRealtimeWsConnected(false);
            // Reset transport state if this was our active transport
            if (voiceTransportRef.current === 'audio_ws') {
              setVoiceTransport('none');
              voiceTransportRef.current = 'none';
            }
          };
          
          newWs.onerror = (error) => {
            console.error('WebSocket error:', error);
            handleSnackbar('Error connecting to audio service', 'error');
            setIsRealtimeWsConnected(false);
            // Reset transport state if this was our active transport
            if (voiceTransportRef.current === 'audio_ws') {
              setVoiceTransport('none');
              voiceTransportRef.current = 'none';
            }
          };
        } catch (error) {
          console.error('Error initializing WebSocket:', error);
          handleSnackbar('Failed to initialize audio streaming', 'error');
          // Reset transport state on error
          setVoiceTransport('none');
          voiceTransportRef.current = 'none';
        }
      }, [sessionId, handleSnackbar]);

      // --- Helper Functions ---

      // Function to convert Float32Array audio data to Int16 PCM ArrayBuffer
      const floatTo16BitPCM = useCallback((float32Array) => {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, float32Array[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // little-endian
        }
        return view.buffer;
      }, []);

      // Function to decode Base64 string to ArrayBuffer
      const base64ToArrayBuffer = useCallback((base64) => {
        try {
          const binaryString = window.atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          // console.log(`base64ToArrayBuffer: Input length: ${base64.length}, Output byteLength: ${bytes.buffer.byteLength}`);
          return bytes.buffer;
        } catch (e) {
          console.error("Error in base64ToArrayBuffer:", e, "Input:", base64 ? base64.substring(0, 50) + '...' : 'null');
          return new ArrayBuffer(0); // Return empty buffer on error
        }
      }, []);

      // Initialize or get the output AudioContext
      const getOutputAudioContext = useCallback(() => {
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
          try {
            outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: outputSampleRate });
            // Create GainNode for volume control
            gainNodeRef.current = outputAudioContextRef.current.createGain();
            gainNodeRef.current.gain.value = isOutputMuted ? 0.0 : 1.0; // Set initial volume
            gainNodeRef.current.connect(outputAudioContextRef.current.destination);
            // console.log("Output AudioContext created/resumed with sample rate:", outputAudioContextRef.current.sampleRate);
            log("Output AudioContext created/resumed"); // Keep high-level log
          } catch (e) {
            console.error("Failed to create output AudioContext:", e);
            handleSnackbar("Audio playback initialization failed.", "error");
            return null;
          }
        }
        // <<< ADDED >>> Resume context if needed
        if (outputAudioContextRef.current.state === 'suspended') {
          console.log("Output AudioContext is suspended, attempting to resume...");
          outputAudioContextRef.current.resume().then(() => {
              console.log("Output AudioContext resumed successfully.");
          }).catch(e => console.error("Error resuming output context:", e));
        }
        return outputAudioContextRef.current;
      }, [isOutputMuted, handleSnackbar]);

      // Define stopAudioProcessing before cleanup to avoid circular reference
      const stopAudioProcessing = useCallback((sendFinalCommit = true) => {
        if (!recorderStartedRef.current && !mediaRecorderRef.current && !scriptProcessorNodeRef.current) {
          // console.log("Stop called but audio processing doesn't seem active.");
          setIsTransmitting(false);
          isTransmittingRef.current = false; // Set ref
          return;
        }
        console.log("Attempting to stop audio processing...");

        // Process remaining user transcript from buffer before stopping
        // This is a FALLBACK, primary processing is via conversation.item.input_audio_transcription.completed
        const finalUserTextFromBuffer = userTranscriptRef.current.trim();
        if (finalUserTextFromBuffer && currentUserItemIdRef.current) { // Only if an item was active
            console.warn(`Processing remaining user transcript from userTranscriptRef during stopAudioProcessing for item ${currentUserItemIdRef.current}: "${finalUserTextFromBuffer}"`);
            handleUserTranscriptComplete(finalUserTextFromBuffer); // Update UI
            persistTranscript(finalUserTextFromBuffer, 'user', 'voice', true, currentUserItemIdRef.current); // Persist with item ID
            userTranscriptRef.current = "";
            // userBufferRef.current = ""; // Clear old buffer too
            // setUserDraft("");
            currentUserItemIdRef.current = null; // Reset as this item is now considered handled or abandoned
        } else if (finalUserTextFromBuffer && !currentUserItemIdRef.current) {
            console.warn(`Processing remaining user transcript from userTranscriptRef during stopAudioProcessing (NO active currentUserItemIdRef): "${finalUserTextFromBuffer}". Persisting without item ID.`);
            handleUserTranscriptComplete(finalUserTextFromBuffer); // Update UI
            persistTranscript(finalUserTextFromBuffer, 'user', 'voice', true, null); // Persist without item ID as a last resort
            userTranscriptRef.current = "";
        }


        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          try {
            if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
              mediaRecorderRef.current.stop();
              // console.log("MediaRecorder stopped.");
            } else {
              // console.log(`MediaRecorder already in state: ${mediaRecorderRef.current.state}, not stopping.`);
            }
          } catch (error) {
            console.error("Error stopping MediaRecorder:", error);
          }
        }
        // Don't null out mediaRecorderRef here, cleanup handles it

        // Disconnect ScriptProcessorNode
        if (scriptProcessorNodeRef.current) {
          try {
            scriptProcessorNodeRef.current.disconnect();
            scriptProcessorNodeRef.current.onaudioprocess = null; // Remove handler first
            // console.log("ScriptProcessorNode disconnected.");
            log("ScriptProcessorNode disconnected."); // Keep high-level log
          } catch(e) {
            console.error("Error disconnecting script processor:", e);
          }
        }
        // Don't null out scriptProcessorNodeRef here, cleanup handles it

        // Reset silence counter on stop
        consecutiveSilenceCounterRef.current = 0;
        
        // Reset isPausedByTTS flag to avoid stale mic-paused state
        isPausedByTTSRef.current = false;

        // Don't stop media stream tracks here, cleanup will handle it
        // console.log("stopAudioProcessing finished, setIsTransmitting(false) called.");
        // handleSnackbar('Stopped listening.', 'info'); // Snackbar might be too noisy
        
        // --- reset the "audio-is-running" guards -----------------------------
        recorderStartedRef.current = false;
        setIsAudioProcessingStarted(false);
        samplesSinceLastCommitRef.current = 0;
        hasDetectedUserSpeechRef.current = false;
        
      }, [isTransmitting, handleUserTranscriptComplete, persistTranscript, sessionId, sessionComplete]);

      // -------------------------------------------------------------------------
      // 🧹  CLEAN-UP  – MUST BE DECLARED BEFORE ANYONE CALLS IT
      // -------------------------------------------------------------------------
      const cleanup = useCallback(() => {
        console.warn("----------- CLEANUP FUNCTION CALLED -----------"); // Fixed unescaped backslash
        console.trace("Trace of cleanup function call stack");
        
        // <<< ADDED: Process remaining user transcript before full cleanup >>>
        const finalUserTextFromBufferOnCleanup = userTranscriptRef.current.trim();
        if (finalUserTextFromBufferOnCleanup) {
            console.log("Processing remaining user transcript from buffer during cleanup:", finalUserTextFromBufferOnCleanup);
            const processedText = processTranscriptText(finalUserTextFromBufferOnCleanup); // Process it
            if (processedText) {
                handleUserTranscriptComplete?.(processedText);
                if (sessionIdRef.current && !props.sessionComplete) { // Use sessionIdRef
                    persistTranscript(processedText, 'user');
                }
            }
        }
        userTranscriptRef.current = ''; // Clear buffer
        setUserDraft(''); // Clear draft display
        // <<< END ADDED >>>

        // --- reset refs & state -------------------------------------------------
        recorderStartedRef.current      = false;
        isRealtimeWsConnectedRef.current = false;
        initialConfigSentRef.current     = false;
        hasSentAudioRef.current          = false;
        isGracefulShutdownRef.current    = false;

        if (isPlayingOutputRef.current) {
          isPlayingOutputRef.current = false;
          try { outputAudioContextRef.current?.close(); } catch {}
        }

        outputAudioQueue.current = [];
        setIsClientSpeaking(false);

        // Close live WS if still open
        if (clientRef.current?.nativeWs &&
                [WebSocket.CONNECTING, WebSocket.OPEN].includes(clientRef.current.nativeWs.readyState)) {
          try { clientRef.current.nativeWs.close(1000, 'Client disconnect'); } catch {}
            }
          clientRef.current = null;

        connectionLockRef.current = false;
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;

        setIsRealtimeWsConnected(false);
        setIsConnecting(false);
        setIsTransmitting(false);

        if (voiceTransportRef.current === 'realtime_webrtc' && !intentionalDisconnectRef.current) {
          voiceTransportRef.current = 'none';
          setVoiceTransport('none');
        }
      }, []);

      // -------------------------------------------------------------------------
      // 🚀 INITIAL CONFIG – declare BEFORE connectRealtimeVoice uses it
      // -------------------------------------------------------------------------
      const sendInitialConfiguration = useCallback(
        /**
        * Push the first session.update to OpenAI.
        * Works with either our client wrapper (has sendClientEvent)
        * or a raw WebSocket (falls back to ws.send).
        */
        (client, model = realtimeModelName, context, conversation_history = [], userName = "Salesperson") => { // <<< Added conversation_history and userName
          // sanity checks -------------------------------------------------------
          if (
            !client ||
            (client.nativeWs && client.nativeWs.readyState !== WebSocket.OPEN) ||
            (client.readyState && client.readyState !== WebSocket.OPEN)
          ) {
            console.warn("sendInitialConfiguration: client not ready – aborting");
            return;
          }
          // if (initialConfigSentRef.current) return; // Allow resending if context changes

          // CRITICAL: Verify we have context before marking as sent
          if (!context) {
            console.error("sendInitialConfiguration: missing context - NOT marking as sent");
            return;
          }

          // base config ---------------------------------------------------------
          const session = {
            model,
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            modalities: ["audio", "text"],
            input_audio_transcription: {
              "model": transcriptionModelName,
              "language": "en",
              "prompt": "" // Empty prompt to avoid it showing up in transcription
            },
            voice: "alloy",
            turn_detection: {
              type: "semantic_vad", 
              eagerness: "medium",    
              create_response: true,
              interrupt_response: true
            },
          };

          // voice selection from persona ---------------------------------------
          if (context?.clientPersona) {
            const { personality_traits = "", sex = "" } = context.clientPersona;
            const traits = personality_traits.toLowerCase();
            const s      = sex.toLowerCase();

            session.voice =
              s === "male"
                ? traits.includes("formal") || traits.includes("authoritative")
                  ? "echo"
                  : "verse"
                : s === "female"
                    ? traits.includes("friendly") ? "shimmer"
                      : traits.includes("calm")   ? "sage"
                      : traits.includes("formal") ? "ash"
                      : "shimmer"
                    : traits.includes("formal")   ? "echo"
                    : traits.includes("friendly") ? "shimmer"
                    : traits.includes("calm")     ? "sage"
                    : "alloy";
          }

          // add the big instruction string with history -------------------------
          if (context) {
            // <<< MODIFIED >>> Pass history to formatter
            session.instructions = formatContextForInstructions(context, conversation_history, userName);
          }

          // send it -------------------------------------------------------------
          if (typeof client.sendClientEvent === "function") {
            client.sendClientEvent("session.update", { session });
          } else {
            // raw WS fallback
            client.send(JSON.stringify({ type: "session.update", session }));
          }

          console.log("▶️ Initial/Updated session.update pushed:", session);
          initialConfigSentRef.current = true;
        },
        [formatContextForInstructions], // Keep dependency
      );

      // Safety net to ensure instructions are sent when context becomes available
      useEffect(() => {
        // Create string representation of context for stable dependency
        const contextString = scenarioContext ? JSON.stringify({
          clientName: scenarioContext.clientName,
          clientRole: scenarioContext.clientRole,
          clientCompany: scenarioContext.clientCompany,
          pacerStage: scenarioContext.pacerStage
        }) : '';

        if (clientRef.current?.isConnected && 
            scenarioContext && 
            !initialConfigSentRef.current) {
          console.log("Context is now available, ensuring instructions are sent...");
          // Only send if we're connected but didn't have context before
          clientRef.current.nativeWs.send(JSON.stringify({
            type: 'session.update',
            session: { 
              instructions: formatContextForInstructions(scenarioContext, conversationHistory.slice(-20), userName),
              input_audio_transcription: {
                "model": transcriptionModelName,
                "language": "en"
              },
              turn_detection: {
                type: "semantic_vad", 
                eagerness: "medium",    
                create_response: true,
                interrupt_response: true
              }
            }
          }));
          console.log("✅ Sent focused session.update with context-based instructions");
          initialConfigSentRef.current = true;   // mark as sent
        }
      }, [scenarioContext, formatContextForInstructions, userName, transcriptionModelName, conversationHistory]);

      // -------------------------------------------------------------------------
      // 🔄  UPDATE SESSION WITH semantic_vad – now using raw WebSocket send
      // -------------------------------------------------------------------------
      const updateSessionWithSemanticVad = useCallback(() => {
        if (!scenarioContext) {
          console.log("updateSessionWithSemanticVad: No context available, skipping update");
          return;
        }

        const ws = clientRef.current?.nativeWs;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.log("updateSessionWithSemanticVad: WebSocket not open, aborting");
          return;
        }
        console.log("▶️ Pushing semantic_vad session.update");
        const payload = {
          type: "session.update",
          session: {
            // CRITICAL: Always include instructions to prevent AI reverting to default role
            instructions: formatContextForInstructions(scenarioContext, [], userName),
            modalities: ["audio", "text"],
            input_audio_transcription: {
              "model": transcriptionModelName,
              "language": "en"

            },
            turn_detection: {
              type: "semantic_vad", 
              eagerness: "medium",    
              create_response: true,
              interrupt_response: true
            },
          },
        };
        console.log("Sending session.update payload:", payload);
        ws.send(JSON.stringify(payload));
      }, [scenarioContext, formatContextForInstructions, userName, transcriptionModelName]); // List all dependencies explicitly


      // expose it through the stable ref used elsewhere
      useEffect(() => { stableCleanupRef.current = cleanup; }, [cleanup]);

      // -------------------------------------------------------------------------
      // ⚠️  WEBSOCKET ERROR HANDLER  – NOW SAFE TO CALL cleanup()
      // -------------------------------------------------------------------------
      const handleWebSocketError = useCallback((errorData) => {
        // pull out a readable message / code
        let message = 'Unknown WebSocket error';
        let code    = 'unknown_code';
        const status = errorData?.status;

        if (errorData?.error && typeof errorData.error === 'object') {
          message = errorData.error.message || message;
          code    = errorData.error.code    || code;
        } else if (typeof errorData === 'string') {
          message = errorData;
        } else if (errorData && typeof errorData === 'object') {
          message = errorData.message || errorData.error || message;
          code    = errorData.code    || code;
        }

        const critical = [
          'openai_connection_failed', 'internal_server_error',
          'unauthorized', 'forbidden',
        ].includes(code) || ['openai_connection_failed','internal_server_error'].includes(status);

        const nonCritical = [
          'input_audio_buffer_commit_empty', 'invalid_audio_format',
          'input_too_short', 'no_speech_detected',
          'rate_limit_exceeded', 'conversation_already_has_active_response',
        ].includes(code);

        if (critical) {
          console.error(`Critical WS error: ${message} (${code})`);
          setRealtimeError(`Connection error: ${message}`);
          handleSnackbar('Connection error: ' + message + ' (' + code + ')', 'error');
          connectionFailed.current = true;
          cleanup();                         // ← safe now
        } else if (nonCritical) {
          if (code !== 'input_audio_buffer_commit_empty') {
            console.warn(`Non-critical WS error: ${message} (${code})`);
            handleSnackbar('Warning: ' + message, 'warning');
          }
        } else {
          console.error(`Unhandled WS error: ${message} (${code})`);
          setRealtimeError(`Unhandled error: ${message}`);
          handleSnackbar('Error: ' + message, 'error');
          connectionFailed.current = true;
          cleanup();                         // ← safe now
        }
      }, [cleanup, handleSnackbar]);

      
      // Store the stable cleanup function
      useEffect(() => {
        stableCleanupRef.current = cleanup;
      }, [cleanup]);

      // Define playNextAudioChunk function 
      const playNextAudioChunk = useCallback(async () => {
        // log("playNextAudioChunk: Entered"); // Keep if helpful for debugging entry
        
        if (!isRealtimeModeRef.current && !isGracefulShutdownRef.current) {
          // log("playNextAudioChunk: Realtime mode off & not shutting down gracefully. Clearing queue.");
          outputAudioQueue.current = [];
          isPlayingOutputRef.current = false; // Ensure flag is reset
          return;
        }
        
        if (isPlayingOutputRef.current && !isGracefulShutdownRef.current) { 
          // log("playNextAudioChunk: Already playing, skipping.");
          return;
        }

        if (outputAudioQueue.current.length === 0) {
          log("playNextAudioChunk: Queue empty."); // Keep: Useful endpoint
          isPlayingOutputRef.current = false;
          setIsClientSpeaking(false);
          if (isGracefulShutdownRef.current) {
            log("playNextAudioChunk: Graceful shutdown complete.");
            isGracefulShutdownRef.current = false;
            setIsFinishingPlayback(false);
            if (stableCleanupRef.current) stableCleanupRef.current();
          }
          return;
        }
        
        isPlayingOutputRef.current = true;
        setIsClientSpeaking(true); 
        log(`playNextAudioChunk: Starting playback. Queue size: ${outputAudioQueue.current.length}`); // Keep: Shows playback start
        
        const pcm16Chunk = outputAudioQueue.current.shift(); 
        
        if (!pcm16Chunk || pcm16Chunk.byteLength === 0) {
          log("playNextAudioChunk: Dequeued empty/invalid chunk, skipping.");
          isPlayingOutputRef.current = false;
          setIsClientSpeaking(false); 
          playNextAudioChunk(); 
          return;
        }

        // log(`playNextAudioChunk: Processing ${pcm16Chunk.byteLength} bytes of PCM16 data.`); // REMOVED
        
        const audioCtx = getOutputAudioContext();
        if (!audioCtx) {
          log("playNextAudioChunk: Error - Output AudioContext not available!"); // Keep: Error
          isPlayingOutputRef.current = false;
          setIsClientSpeaking(false); 
          return; 
        }

        // Ensure context is running
        if (audioCtx.state === 'suspended') {
            try {
                await audioCtx.resume();
                log("playNextAudioChunk: AudioContext resumed."); // Keep: Important state change
            } catch (err) {
                log("playNextAudioChunk: Error resuming AudioContext:", err); // Keep: Error
                isPlayingOutputRef.current = false;
                setIsClientSpeaking(false); 
                return; 
            }
        }
        
        try {
            const numChannels = 1; 
            const bytesPerSample = 2;
            const numSamples = pcm16Chunk.byteLength / bytesPerSample;
            // Use fixed 24000Hz rate to match the server output, not the device's sample rate
            const sampleRate = 24000; 

            if (numSamples <= 0) {
                log("playNextAudioChunk: Calculated zero samples from buffer, skipping."); // Keep: Warning
                throw new Error("Zero samples in buffer");
            }
            
            // DIAGNOSTIC: Log buffer size and sample rate for debug
            // console.log(`DIAGNOSTIC: Buffer size: ${pcm16Chunk.byteLength} bytes, ${numSamples} samples, using fixed 24000Hz sample rate`);
            
            // Create the buffer with the FIXED 24000Hz rate, not the actual context rate
            const audioBuffer = audioCtx.createBuffer(numChannels, numSamples, 24000);
            const channelData = audioBuffer.getChannelData(0);
            const dataView = new DataView(pcm16Chunk);

            for (let i = 0; i < numSamples; i++) {
                const int16Sample = dataView.getInt16(i * bytesPerSample, true); 
                channelData[i] = int16Sample / 32768.0; 
            }
            // log(`playNextAudioChunk: Created AudioBuffer (${audioBuffer.duration.toFixed(3)}s)`); // REMOVED

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = isOutputMuted ? 0.0 : 1.0;
            
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            // log("playNextAudioChunk: Audio nodes connected."); // REMOVED

            source.onended = () => {
                // log("playNextAudioChunk: source.onended triggered."); // REMOVED
                isPlayingOutputRef.current = false;
                if (outputAudioQueue.current.length > 0) {
                    // log("playNextAudioChunk: Queue has more items, playing next."); // REMOVED
                    playNextAudioChunk(); 
                } else {
                    log("playNextAudioChunk: Playback finished & queue empty."); // Keep: Useful endpoint
                    setIsClientSpeaking(false); 
                    lastAiResponseTimeRef.current = Date.now(); 
                }
            };

            // log("playNextAudioChunk: Starting playback via source.start()..."); // REMOVED
            source.start();
            
        } catch (error) {
            log("playNextAudioChunk: Error during playback setup:", error); // Keep: Error
            isPlayingOutputRef.current = false;
            setIsClientSpeaking(false); 
            if (outputAudioQueue.current.length > 0) {
                playNextAudioChunk();
            }
        }
      }, [getOutputAudioContext, isOutputMuted, isRealtimeModeRef, isGracefulShutdownRef, setIsClientSpeaking, stableCleanupRef]);

      // Define handleAudioChunk function
      const handleAudioChunk = useCallback(async (base64Chunk) => {
        if (!base64Chunk || base64Chunk.length === 0) {
          // console.log("handleAudioChunk: Received empty base64 chunk, skipping."); // REMOVED
          return;
        }

        // console.log("handleAudioChunk: Received audio chunk delta from server.", `Length: ${base64Chunk.length}`); // REMOVED

        // Don't process audio chunks if realtime mode is off
        if (!isRealtimeModeRef.current) {
          // console.log("handleAudioChunk: Realtime mode is off, skipping audio processing"); // REMOVED
          return;
        }

        const audioContext = getOutputAudioContext();
        if (!audioContext) {
            console.error("handleAudioChunk: Output AudioContext not available!");
            return;
        }

        try {
            // console.log("handleAudioChunk: Decoding base64 chunk..."); // REMOVED
            const arrayBuffer = base64ToArrayBuffer(base64Chunk);
            // console.log("handleAudioChunk: Decoded to ArrayBuffer, length:", arrayBuffer.byteLength); // REMOVED

            if (arrayBuffer.byteLength === 0) {
                // console.log("handleAudioChunk: Decoded ArrayBuffer has zero length, skipping."); // REMOVED
                return;
            }

            // Check if data is valid for PCM
            if (arrayBuffer.byteLength % 2 !== 0) {
                console.error("handleAudioChunk: Received audio data with odd byte length, cannot process as PCM16.");
                return;
            }

            // Push the raw buffer directly to the queue - playNextAudioChunk will convert to AudioBuffer
            // console.log(`handleAudioChunk: Pushing raw PCM buffer to queue, ${arrayBuffer.byteLength} bytes`); // REMOVED
            outputAudioQueue.current.push(arrayBuffer);

            // Start playback if not already playing
            if (!isPlayingOutputRef.current) {
                // console.log("Not currently playing audio. Starting playback."); // REMOVED
                playNextAudioChunk();
            }
        } catch (error) {
            console.error("handleAudioChunk: Error processing audio chunk:", error);
        }
      }, [playNextAudioChunk, getOutputAudioContext, base64ToArrayBuffer]);

      // Define startAudioProcessing function with improved debugging
      const startAudioProcessing = useCallback(async () => {
        console.log("🎤 START AUDIO PROCESSING - Initializing microphone...");

        if (recorderStartedRef.current) {
          console.log("Audio processing already started, skipping initialization.");
          return;                      // Already running – skip
        }
        recorderStartedRef.current = true; // Set guard EARLY

        if (!clientRef.current || !clientRef.current.isConnected) {
          console.error("❌ Cannot start audio processing: WebSocket is not connected");
          recorderStartedRef.current = false; // Reset guard on early exit
          return;
        }

        // Check WebSocket readyState explicitly
        if (clientRef.current.nativeWs && clientRef.current.nativeWs.readyState !== WebSocket.OPEN) {
          console.error(`❌ Cannot start audio processing: WebSocket not OPEN (state=${clientRef.current.nativeWs.readyState})`);
          recorderStartedRef.current = false; // Reset guard on early exit
          return;
        }

        // Skip if realtime mode is off
        if (!isRealtimeModeRef.current) {
          console.log("🛑 Real-time mode is off, skipping audio processing");
          recorderStartedRef.current = false; // Reset guard on early exit
          return;
        }

        console.log("✅ WebSocket is connected and OPEN. Will start audio processing.");

        try {
          // Clear existing audio processing if any
          if (audioSourceRef.current || processorRef.current) {
            console.log("Cleaning up existing audio processing before restart");
            audioSourceRef.current?.disconnect();
            processorRef.current?.disconnect();
            audioSourceRef.current = null;
            processorRef.current = null;
          }

          // Create (or reuse) one AudioContext
          if (!audioContextRef.current || audioContextRef.current.state === "closed") {
            console.log("Creating/Reusing audio context...");
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000 // Higher sample rate for better quality
            });
            console.log(`✅ Audio context created/reused with sample rate ${audioContextRef.current.sampleRate}Hz`);
          } else {
            console.log(`Using existing Audio context (state: ${audioContextRef.current.state})`);
          }
          const audioCtx = audioContextRef.current;
          // Resume if suspended
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
            console.log("Resumed suspended audio context.");
            log("Resumed suspended audio context."); // Keep high-level log
          }

          // Set microphone permission state to 'requesting'
          setMicrophonePermission('requesting');
          handleSnackbar("Please allow microphone access when prompted", "info");
          
          // SIMPLIFIED CONSTRAINTS - More likely to work across browsers
          console.log("🎤 Requesting microphone access with simplified constraints...");
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              // IMPROVED: Set explicit audio constraints for better quality
              echoCancellation: false,     // Disable echo cancellation
              autoGainControl: false,      // Disable automatic gain control
              noiseSuppression: true,      // Keep noise suppression on
              channelCount: 1,             // Force mono audio
              sampleRate: 48000            // Use high sample rate (48kHz)
            }
          }).catch((err) => {
            console.error("🚫 Microphone access error:", err.name, err.message);
            
            // Show specific error messages based on error type
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
              handleSnackbar("Microphone access denied. Please allow microphone access in your browser settings.", "error");
              setRealtimeError("Microphone permission denied");
              setMicrophonePermission('denied');
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
              handleSnackbar("No microphone detected. Please connect a microphone and try again.", "error");
              setRealtimeError("No microphone detected");
              setMicrophonePermission('unavailable');
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
              handleSnackbar("Unable to access microphone. It may be in use by another application.", "error");
              setRealtimeError("Microphone access error");
              setMicrophonePermission('error');
            } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
              handleSnackbar("Your microphone doesn't meet the required constraints.", "error");
              setRealtimeError("Microphone constraints error");
              setMicrophonePermission('error');
            } else {
              handleSnackbar(`Microphone error: ${err.message}`, "error");
              setRealtimeError(`Microphone error: ${err.name}`);
              setMicrophonePermission('error');
            }
            
            // Throw error to be caught by the outer try/catch
            throw err;
          });
          
          if (!stream) {
            console.error("❌ Failed to get microphone stream");
            handleSnackbar("Failed to access microphone", "error");
            return;
          }
          
          // Log audio tracks for debugging
          const audioTracks = stream.getAudioTracks();
          console.log(`🎤 Got ${audioTracks.length} audio tracks`);
          
          // Update microphone permission state
          setMicrophonePermission('granted');
          
          if (audioTracks.length > 0) {
            const track = audioTracks[0];
            console.log(`🎤 Using audio track: "${track.label}"`);
            console.log(`🎤 Track settings:`, track.getSettings());
            console.log(`🎤 Track constraints:`, track.getConstraints());
            console.log(`🎤 Track capabilities:`, track.getCapabilities());
            console.log(`🎤 Track enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
          } else {
            console.warn("⚠️ No audio tracks found in the stream!");
          }
          
          streamRef.current = stream;
          audioStreamRef.current = stream;
          
          // Create source node
          console.log("Creating audio source from microphone stream...");
          const source = audioCtx.createMediaStreamSource(stream);
          audioSourceRef.current = source;
          console.log("✅ Audio source node created successfully");
          log("Audio source node created successfully"); // Keep high-level log
          
          // Reset counters
          onaudioprocessCounterRef.current = 0;
          consecutiveSilenceCounterRef.current = 0;
          hasSentAudioRef.current = false;
          recorderStartedRef.current = true;
          
          // Create script processor for raw PCM data
          console.log("Setting up ScriptProcessorNode for audio capture...");
          // Buffer size of 4096 gives ~256ms of audio at 16kHz
          // which is good for analyzing speech and detecting silence
          // CRITICAL: Must be a power of 2 between 256 and 16384 - DO NOT CHANGE!
          // const bufferSize = 4800; // <<< INCORRECT - Not a power of 2
          // const bufferSize = 4096; // <<< CORRECT (Power of 2)
          // Use direct literal instead of variable to ensure it's correct
          const processor = audioCtx.createScriptProcessor(4096, 1, 1); // HARDCODED to 4096
          processorRef.current = processor;
          scriptProcessorNodeRef.current = processor;
          console.log(`✅ Created ScriptProcessorNode with HARDCODED buffer size 4096`);
          log(`Created ScriptProcessorNode with buffer size 4096`); // Keep high-level log
          
          // Microphone -> Processor -> Destination (silent)
          source.connect(processor);
          processor.connect(audioCtx.destination);
          console.log("✅ Audio nodes connected: source -> processor -> destination");
          log("Audio nodes connected: source -> processor -> destination"); // Keep high-level log
          
          // Set up audio processing with improved logging
          processor.onaudioprocess = (e) => {
            // Skip processing if real-time mode is off
            if (!isRealtimeModeRef.current) {
              return;
            }

            // Skip processing if client is speaking to prevent feedback loop
            if (isClientSpeaking) {
              // CRITICAL: Skip all audio processing while the AI is speaking
              // This prevents audio buffer commits during AI speech
              return;
            }

            // Skip processing during AI cooldown period (right after AI finishes speaking)
            const now = Date.now();
            if (lastAiResponseTimeRef.current && (now - lastAiResponseTimeRef.current < aiCooldownPeriodMs)) {
              // REMOVED periodic log
              return;
            }

            // REFINED CHECK: Only warn about disconnection if it happens unexpectedly during realtime mode
            if (!clientRef.current || !clientRef.current.isConnected) {
              if (isRealtimeModeRef.current) { // Only warn if we *should* be connected
                console.warn("⚠️ WebSocket disconnected unexpectedly during audio processing while realtime mode is active.");
              }
              // Otherwise, silently return if disconnected during expected shutdown (isRealtimeModeRef.current is false)
              return;
            }

            const onaudioprocessCounter = ++onaudioprocessCounterRef.current;

            // REMOVED periodic logging setup
            // const logThisEvent = onaudioprocessCounter % 10 === 0;
            logOnaudioprocess(`onaudioprocess event #${onaudioprocessCounter}`); // USE THROTTLED LOG

            // Get input data (microphone audio) AND DOWNSAMPLE
            const rawInputData = e.inputBuffer.getChannelData(0);
            const inputData = downSampleTo16k(rawInputData, e.inputBuffer.sampleRate);

            // Calculate audio level (volume) from RMS
            const rms = calculateRMS(inputData);
            const currentAudioLevel = rms;
            setAudioLevel(currentAudioLevel);
            setMaxAudioLevel(prev => Math.max(prev, currentAudioLevel));

            // Track maximum level for calibration
            let maxAudioLevel = 0.01; // Initialize with small value to avoid division by zero
            maxAudioLevel = Math.max(maxAudioLevel, currentAudioLevel);

            logOnaudioprocess(`Audio Level: ${currentAudioLevel.toFixed(4)} (Max: ${maxAudioLevel.toFixed(4)})`);

            // Only process/send audio if above threshold and WebSocket is open
            if (currentAudioLevel >= AUDIO_LEVEL_THRESHOLD && clientRef.current?.nativeWs?.readyState === WebSocket.OPEN) {
              // Convert to PCM 16-bit (Int16)
              const pcmBuffer = floatTo16BitPCM(inputData);
              try {
                const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmBuffer)));
                const audioMessage = JSON.stringify({
                  type: "input_audio_buffer.append",
                  audio: base64Audio
                });
                clientRef.current.nativeWs.send(audioMessage);
                hasSentAudioRef.current = true;
                hasSentEnoughAudioRef.current = true; // Assuming if we send, it's enough for this model

                if (onaudioprocessCounterRef.current % 20 === 0) {
                  console.log(`Sent audio chunk (above threshold): ${pcmBuffer.byteLength} bytes (${inputData.length} samples)`);
                }
              } catch (e) {
                console.error("Error converting or sending audio:", e);
              }
            } else if (clientRef.current?.nativeWs?.readyState === WebSocket.OPEN) {
              // Log if below threshold but connected, to show VAD is intentionally skipping
              if (onaudioprocessCounterRef.current % 20 === 0) { // Log occasionally
                // console.log(`Audio level ${currentAudioLevel.toFixed(4)} below threshold, not sending.`);
              }
            } else {
               // console.warn("WebSocket not open or audio below threshold, cannot send audio chunk.");
            }

            // Track if we've detected actual speech (above threshold) from user
            if (currentAudioLevel >= AUDIO_LEVEL_THRESHOLD) {
              if (!userSpeechStartTimeRef.current) {
                userSpeechStartTimeRef.current = Date.now();
                // REMOVED console.log("🎤 User speech started");
                log("🎤 User speech started"); // Keep high-level log
              }
              hasDetectedUserSpeechRef.current = true;
              consecutiveSilenceCounterRef.current = 0;
            }

            // Handle silent audio (below threshold)
            if (currentAudioLevel < AUDIO_LEVEL_THRESHOLD && onaudioprocessCounter > 10) {
              // REMOVED console.log(`🔇 Audio level ... skipping chunk`);

              // Only increment silence counter if we've previously detected speech
              if (hasDetectedUserSpeechRef.current) {
                consecutiveSilenceCounterRef.current++;
              }

              // Only trigger response after valid user speech followed by silence
              // VAD handles actual commit trigger, this is just logging/state reset now
              if (consecutiveSilenceCounterRef.current > SILENCE_FRAMES_THRESHOLD && 
                  hasDetectedUserSpeechRef.current && 
                  !isClientSpeakingRef.current && // <<< ADDED check
                  userSpeechStartTimeRef.current && 
                  (Date.now() - userSpeechStartTimeRef.current > minimumUserSpeechDurationMs)) 
              {
                // console.log(`Detected ${SILENCE_FRAMES_THRESHOLD} frames of silence after speech. VAD should trigger commit.`);
                log(`Silence detected after speech (frames: ${consecutiveSilenceCounterRef.current}). VAD should trigger commit.`); // Keep high-level log
                
                // Reset counters and flags AFTER silence is detected and VAD *should* have acted
                // This prevents premature commits if VAD is slightly delayed
                // consecutiveSilenceCounterRef.current = 0; // Reset by VAD completion? Maybe reset later.
                // hasDetectedUserSpeechRef.current = false; // Keep true until next speech starts?
                // userSpeechStartTimeRef.current = null;
              }

              // CRITICAL CHANGE: Don't skip sending when below threshold if we've detected speech
              if (!hasDetectedUserSpeechRef.current) {
                return; // Only skip if we haven't detected speech at all
              }
              // Otherwise continue processing even if below threshold
            }

            // Accumulate samples since last commit reset
            samplesSinceLastCommitRef.current += inputData.length;

            // <<< ADDED Wall-clock guard >>>
            // if (userSpeechStartTimeRef.current) { // Log only if speech has started
            //   console.log(`User speech duration: ${Date.now() - userSpeechStartTimeRef.current}ms / ${MAX_USER_TURN_MS}ms`);
            // }
            if (hasDetectedUserSpeechRef.current && userSpeechStartTimeRef.current && (Date.now() - userSpeechStartTimeRef.current > MAX_USER_TURN_MS)) {
                console.warn(`User turn exceeded ${MAX_USER_TURN_MS / 1000}s. Forcing commit.`);
                forceCommitAndResponse(); // Use the existing helper
                // Reset speech detection immediately after forcing commit
                hasDetectedUserSpeechRef.current = false;
                userSpeechStartTimeRef.current = null;
                consecutiveSilenceCounterRef.current = 0; // Reset silence counter
                return; // Stop further processing for this chunk
            }
            // <<< END Wall-clock guard >>>

            // Get sample rate of source (typically 44.1kHz or 48kHz)
            const sourceSampleRate = e.inputBuffer.sampleRate;

            // Check if client is connected before processing
            if (clientRef.current && clientRef.current.isConnected) {
              // Convert to PCM 16-bit (Int16)
              const pcmBuffer = floatTo16BitPCM(inputData);

              // SIMPLIFIED: Send every audio chunk immediately without accumulation
              // This provides smaller chunks to the server for better VAD responsiveness
              if (clientRef.current.nativeWs?.readyState === WebSocket.OPEN) {
                try {
                  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmBuffer)));
                  const audioMessage = JSON.stringify({
                    type: "input_audio_buffer.append",
                    audio: base64Audio
                  });
                  // Send the audio message without waiting for accumulation
                  clientRef.current.nativeWs.send(audioMessage);
                  hasSentAudioRef.current = true; // Mark that we've sent something
                  hasSentEnoughAudioRef.current = true; // We've met the minimum at least once
                    
                    // Log occasionally about samples we're sending to monitor buffer size issues
                    if (onaudioprocessCounterRef.current % 20 === 0) {
                      console.log(`Audio buffer sent immediately: ${pcmBuffer.byteLength} bytes (${inputData.length} samples)`);
                    }
                } catch (e) {
                  console.error("Error converting or sending audio:", e);
                }
              } else {
                console.warn("WebSocket not open, cannot send audio chunk.");
              }
            }
          };
          
          // Mark audio processing as started
          setIsAudioProcessingStarted(true);
          setIsTransmitting(true);
          isTransmittingRef.current = true;
          
          console.log("🎤 Audio processing successfully started");
          log("🎤 Audio processing successfully started"); // Keep high-level log

        } catch (error) {
          console.error('❌ Error starting audio processing:', error);
          const errorMsg = `Mic access/setup failed: ${error.message}`;
          setRealtimeError(errorMsg);
          handleSnackbar('Error: ' + errorMsg, 'error');
          if (stableCleanupRef.current) stableCleanupRef.current(); // Use stableCleanupRef instead of direct cleanup call
          setIsTransmitting(false); // Reset state
        }
      }, [sendInputAudio, handleTextEvent, floatTo16BitPCM, handleSnackbar]);

      // Connect using WebSocket with connection lock
      const connectRealtimeVoice = useCallback(async () => {
        // Skip if not mounted
        if (!mountedRef.current) {
          console.log("Component not mounted, skipping connection attempt");
          return;
        }
        
        // CRITICAL: Skip if already connected to prevent reconnection loops
        if (clientRef.current && clientRef.current.isConnected) {
          console.log("Already connected to OpenAI realtime, skipping reconnection");
          return;
        }
        
        console.log("----------- connectRealtimeVoice called -----------");
        
        // CRITICAL: Only connect when scenarioContext is ready
        if (!scenarioContext) {
          console.log("Scenario context not yet available, delaying connection until ready");
          return;
        }
        
        // First, check if we already have an active connection attempt
        if (connectionLockRef.current) {
          console.log("Connection attempt already in progress, skipping.");
          return;
        }

        // If we already have a client, no need to reconnect
        if (clientRef.current && clientRef.current.isConnected) {
          console.log("Already connected, skipping connection attempt");
          return;
        }

        // Check if we have a valid session ID
        if (!sessionId) {
          console.error("Cannot connect realtime voice without sessionId.");
          handleSnackbar("Session ID missing, cannot connect voice.", "error");
          return;
        }

        // Implement debouncing - prevent rapid reconnection attempts
        const now = Date.now();
        const timeSinceLastAttempt = now - connectionAttemptTimestampRef.current;
        if (timeSinceLastAttempt < 2000 && !forceReconnectRef.current) { // 2-second debounce
          console.log(`Throttling connection attempt (${timeSinceLastAttempt}ms since last attempt)`);
          return;
        }

        // Reset intentional disconnect flag
        intentionalDisconnectRef.current = false;

        // Acquire connection lock and update state
        connectionLockRef.current = true;
        connectionAttemptTimestampRef.current = now;
        forceReconnectRef.current = false;
        setIsConnecting(true);
        setRealtimeError(null);
        connectionFailed.current = false;
        
        console.log("Attempting WebSocket connection for session:", sessionId);

        try {
          // 1. Get the standard user JWT
          const jwtToken = localStorage.getItem('token');
          if (!jwtToken) {
            connectionLockRef.current = false; // Release lock
            setIsConnecting(false); 
            throw new Error("User authentication token (JWT) not found.");
          }
          console.log("Using JWT for WebSocket auth message (first 10 chars):", jwtToken.substring(0, 10) + "...");

          // 2. Get ephemeral OpenAI token via HTTP 
          console.log("Requesting ephemeral OpenAI token...");
          let ephemeralKey;
          try {
            ephemeralKey = await apiService.sessions.getRealtimeVoiceToken(sessionId);
            console.log("Received ephemeral OpenAI token.");
          } catch (tokenError) {
            console.error("Failed to obtain token:", tokenError);
            connectionLockRef.current = false; // Release lock
            setIsConnecting(false);
            handleSnackbar("Failed to obtain voice connection token.", "error");
            // Update voice transport state on failure
            voiceTransportRef.current = 'none';
            setVoiceTransport('none');
            return;
          }
          
          if (!ephemeralKey) {
            connectionLockRef.current = false; // Release lock
            setIsConnecting(false);
            voiceTransportRef.current = 'none';
            setVoiceTransport('none');
            throw new Error("Failed to obtain ephemeral OpenAI token.");
          }

          // Cancel operation if we're no longer mounted or session ID changed
          if (!mountedRef.current || sessionId !== sessionIdRef.current) {
            console.log("Component unmounted or session ID changed, aborting connection attempt");
            connectionLockRef.current = false;
            setIsConnecting(false);
            voiceTransportRef.current = 'none';
            setVoiceTransport('none');
            return;
          }

          // 3. Construct the WebSocket URL for the BACKEND PROXY
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          let wsHost = window.location.host;
          let wsPath;

          if (process.env.NODE_ENV === 'production') {
            // Production URL: Include the router prefix and NEW PATH
            const nginxPrefix = process.env.REACT_APP_API_PREFIX || '/pacer-api'; 
            wsPath = `${nginxPrefix}/api/game/ws/rt_proxy_connect/${sessionId}`; 
          } else {
            // Development URL: Include the router prefix and NEW PATH
            wsHost = 'localhost:8001'; 
            wsPath = `/api/game/ws/rt_proxy_connect/${sessionId}`; 
          }
          
          const wsUrl = `${wsProtocol}//${wsHost}${wsPath}`;
          console.log("Connecting to Backend Proxy WebSocket URL:", wsUrl);
          
          // 4. Attempt to connect using native WebSocket
          console.log(`Attempting direct WebSocket connection to backend proxy...`);
          const nativeWs = new WebSocket(wsUrl); 
          
          // 5. Set up WebSocket event handlers
          nativeWs.onerror = (errorEvent) => {
            console.error("❌ WebSocket connection error:", errorEvent);
            // Try to log more details if available
            if (errorEvent instanceof CloseEvent) {
                console.error(`WebSocket Close Details: Code=${errorEvent.code}, Reason=${errorEvent.reason}, WasClean=${errorEvent.wasClean}`);
            } else {
                console.error("Error event details:", errorEvent); // Log the raw event object
            }
            connectionFailed.current = true;
            setRealtimeError("WebSocket connection error. Check console.");
            handleSnackbar("WebSocket connection failed. Check console.", "error"); 
            setIsConnecting(false);
            connectionLockRef.current = false; // Release lock
            
            // Update voice transport state on error
            if (voiceTransportRef.current === 'realtime_webrtc') {
              voiceTransportRef.current = 'none';
              setVoiceTransport('none');
            }
          };

          nativeWs.onopen = () => {
            console.log("🔓 WebSocket connection opened. Sending JWT authentication...");
            // Send JWT auth message first
            nativeWs.send(JSON.stringify({
              type: "auth_jwt",
              token: jwtToken
            }));
            console.log("🔑 JWT auth message sent. Now sending OpenAI ephemeral token...");
            // Send OpenAI ephemeral token immediately after JWT
            nativeWs.send(JSON.stringify({
              type: "auth_openai",
              token: ephemeralKey
            }));
            console.log("🔑 OpenAI ephemeral token sent.");
            
            if (!scenarioContext) {
              console.log("Context not ready – postponing session.update until it is.");
              // we'll resend as soon as the effect below sees context !== null
            } else {
              sendInitialConfiguration(
                nativeWs, 
                realtimeModelName, 
                scenarioContext,
                conversationHistory.slice(-20), // Pass actual history prop, sliced
                userName 
              );
            }

            // Setup heartbeat ping to keep the connection alive
            const pingInterval = setInterval(() => {
              if (nativeWs.readyState === WebSocket.OPEN) {
                console.log("Sending WebSocket ping frame to keep connection alive");
                // Use native WebSocket ping instead of JSON message
                // This won't be forwarded to OpenAI as an app-level event
                if (typeof nativeWs.ping === 'function') {
                  nativeWs.ping(); // Native WebSocket ping frame
                }
                // Remove the fallback ping that causes errors
                // browsers don't need a fallback – we already have the TCP keep-alive
              } else {
                clearInterval(pingInterval); // Clean up if socket is closed
              }
            }, 15000); // Send ping every 15 seconds
            
            // Clean up interval when connection closes
            nativeWs.addEventListener('close', () => {
              clearInterval(pingInterval);
            });

            // Skip if we're no longer mounted
            if (!mountedRef.current) {
              console.log("Component unmounted during WebSocket connection, closing connection");
              nativeWs.close();
              return;
            }
            // DO NOT set isRealtimeWsConnected yet. Wait for 'proxy_ready' confirmation
            console.log("Authentication messages sent. Waiting for 'proxy_ready' from backend...");
          };

          nativeWs.onmessage = (event) => {
            try {
              // Skip if we're no longer mounted
              if (!mountedRef.current) {
                console.log("Component unmounted during message handling, ignoring message");
                return;
              }
              
              const data = JSON.parse(event.data);
              const eventType = data.type;
              
              // <<< Filtered Logging >>> Reduce noise for frequent events
              const noisyTypes = ['response.audio.delta', 'conversation.item.input_audio_transcription.delta', 'input_audio_buffer.vad_status_updated'];
              if (!noisyTypes.includes(eventType)) {
                  log(`Received WebSocket event from Proxy: ${eventType}`);
              } else {
                  // Log noisy types less frequently
                  logEveryN(20)(`Received noisy WebSocket event from Proxy: ${eventType}`);
              }

              switch(eventType) {
                case 'input_audio_buffer.committed':
                    // This event now primarily signals the end of a user's audio input segment.
                    // The item_id here is crucial for linking to subsequent transcription events.
                    log(`[USER EVENT] input_audio_buffer.committed: item_id=${data.item_id}. Preparing for user transcript.`);
                    if (data.item_id) {
                        // This is the most reliable point to set the current user item ID.
                        currentUserItemIdRef.current = data.item_id;
                        userTranscriptRef.current = ''; // Clear any old/partial transcript for this new item.
                        setUserDraft(''); // Clear visual draft.
                    } else {
                        console.warn("[USER EVENT] input_audio_buffer.committed received WITHOUT item_id. This might cause issues.");
                    }
                    // Do NOT persist here. Wait for conversation.item.input_audio_transcription.completed.
                    break;

                // Handle session.created - but don't start audio processing yet
                case 'session.created':
                    log("Session created event received via proxy:", data.session);
                    // Don't attempt to start audio processing yet, wait for session.updated
                    break;
                
                case 'conversation.item.created':
                    log(`[CONVO EVENT] RAW .conversation.item.created event: ${JSON.stringify(data)}`);
                    if (data.item?.role === 'user') {
                        log(`[CONVO EVENT] User item created by conversation.item.created: ID=${data.item.id}, Status=${data.item.status}`);
                        // If input_audio_buffer.committed didn't set it, this is a fallback.
                        // This event might arrive *after* input_audio_buffer.committed.
                        // It's important that currentUserItemIdRef is set by input_audio_buffer.committed ideally.
                        if (!currentUserItemIdRef.current && data.item.id) {
                            console.warn(`[CONVO EVENT] currentUserItemIdRef was not set by input_audio_buffer.committed. Setting it now via conversation.item.created: ${data.item.id}`);
                            currentUserItemIdRef.current = data.item.id;
                            userTranscriptRef.current = ''; // Ensure transcript ref is clean
                            setUserDraft('');
                        } else if (currentUserItemIdRef.current && data.item.id !== currentUserItemIdRef.current) {
                            console.warn(`[CONVO EVENT] conversation.item.created for user has a DIFFERENT item_id (${data.item.id}) than current (${currentUserItemIdRef.current}). This is unexpected if input_audio_buffer.committed was handled correctly.`);
                            // Potentially overwrite if this is a newer item, but this state should be rare.
                            currentUserItemIdRef.current = data.item.id;
                            userTranscriptRef.current = '';
                            setUserDraft('');
                        }
                    } else if (data.item?.role === 'assistant') {
                        log(`[CONVO EVENT] Assistant item created by conversation.item.created: ID=${data.item.id}, Status=${data.item.status}`);
                        // Assistant transcripts are handled by response.audio_transcript.done
                    }
                    break;

                case 'conversation.item.input_audio_transcription.delta':
                    // log("[USER EVENT] RAW .delta event data.item:", JSON.stringify(data)); // Can be very noisy
                    const { item_id: delta_item_id, delta } = data;
                    if (delta_item_id && delta_item_id === currentUserItemIdRef.current) {
                        if (delta) {
                            // log(`[USER EVENT] User transcript delta for ${delta_item_id}:`, delta); // Log specific deltas if needed
                            userTranscriptRef.current += delta;
                            setUserDraft(userTranscriptRef.current);
                        }
                    } else {
                         // This warning can be noisy if item_id is briefly mismatched during event sequences.
                         // console.warn(`[USER EVENT] User transcript delta for MISMATCHED item_id ${delta_item_id} (expected ${currentUserItemIdRef.current}). Delta: \"${delta}\". Ignoring.`);
                    }
                    break;

                case 'conversation.item.input_audio_transcription.completed':
                    log(`[USER EVENT] RAW .completed event data: ${JSON.stringify(data)}`);
                    const { item_id: completed_item_id, transcript: completed_transcript } = data;

                    log(`[USER EVENT .COMPLETED CHECK] Event item_id: ${completed_item_id}, currentUserItemIdRef.current: ${currentUserItemIdRef.current}`);

                    if (completed_item_id && completed_item_id === currentUserItemIdRef.current) {
                        log(`[USER EVENT .COMPLETED CHECK] Item ID matches: ${completed_item_id}.`);
                        if (completed_transcript && completed_transcript.trim().length > 0) {
                            const finalUserText = completed_transcript.trim();
                            log(`[USER EVENT] ✅ User transcript COMPLETE for item ${completed_item_id}: \"${finalUserText}\"`);
                            
                            handleUserTranscriptComplete(finalUserText); // Update UI
                            
                            // Persist the final transcript
                            log(`[USER EVENT] Persisting final user transcript for item ${completed_item_id}.`);
                            persistTranscript(finalUserText, 'user'); // Removed item_id from here, persistTranscript doesn't take it
                            
                            userTranscriptRef.current = ""; // Clear buffer
                            // setUserDraft(""); // Clear draft from UI - handleUserTranscriptComplete should do this
                            currentUserItemIdRef.current = null; // Reset for next user utterance
                        } else {
                            console.error(`[USER EVENT] CRITICAL: User transcript .completed event for ${completed_item_id} received BUT transcript is EMPTY or undefined. Transcript: \"${completed_transcript}\". Not processing.`);
                            // Optionally, still reset currentUserItemIdRef if this item is considered "done" despite empty transcript
                            // currentUserItemIdRef.current = null; 
                        }
                    } else {
                        console.warn(`[USER EVENT] User transcript .completed event for MISMATCHED or MISSING item_id. Event item_id: ${completed_item_id}, expected: ${currentUserItemIdRef.current}. Transcript: \"${completed_transcript}\". Ignoring.`);
                        // If an old .completed event arrives after currentUserItemIdRef has been reset/changed, it should be ignored.
                    }
                    break;

                case 'proxy_ready': // Handle proxy_ready confirmation
                    if (data.status === 'success') {
                        console.log("✅ Backend Proxy reports READY (Connected to OpenAI)!");
                    // mark WS as connected
                        setIsRealtimeWsConnected(true);
                    isRealtimeWsConnectedRef.current = true;
                        setIsConnecting(false);
                    connectionLockRef.current = false;
                        handleSnackbar('Real-time voice connected', 'success');
                        
                        // <<< ADDED >>> Attempt to resume AudioContext after connection
                        const audioCtx = getOutputAudioContext();
                        if (audioCtx && audioCtx.state === 'suspended') {
                            log("Attempting to resume Output AudioContext after successful connection...");
                            audioCtx.resume().catch(err => log("Error resuming context post-connect:", err));
                        }
                        // <<< END >>>

                        // hook up our clientRef so audio processing can start
                        clientRef.current = { nativeWs, isConnected: true };
                    } else {
                        console.error("❌ Backend Proxy failed to confirm readiness:", data.message || "Unknown reason");
                        setRealtimeError("Proxy setup failed after connection.");
                        handleSnackbar("Proxy setup failed.", 'error');
                    connectionLockRef.current = false;
                    if (voiceTransportRef.current === 'realtime_webrtc') {
                      voiceTransportRef.current = 'none';
                      setVoiceTransport('none');
                    }
                        cleanup();
                    }
                    break;

                case 'session.updated': // Forwarded from OpenAI
                    console.log("Session updated, starting audio processing...");
                    // Make sure we set this to true to prevent multiple initializations
                    initialConfigSentRef.current = true;
                    
                    // If we were waiting to start audio, do so now
                    if (!recorderStartedRef.current) {
                      console.log("First session.updated received, starting audio processing");
                      log("First session.updated received, starting audio processing"); // Keep high-level log
                      startAudioProcessing();
                      recorderStartedRef.current = true;
                      
                      // Update session with semantic_vad parameters after initial setup
                      // setTimeout(() => updateSessionWithSemanticVad(), 1000);
                    } else {
                      console.log("Audio processing already started, ignoring session.updated trigger");
                      log("Audio processing already started, ignoring session.updated trigger"); // Keep high-level log
                    }
                    break;
                
                case 'response.audio.delta': // Forwarded from OpenAI
                    if (data.delta && typeof data.delta === 'string') {
                      // <<< MODIFIED >>> Better pause microphone input without full cleanup
                      if (isTransmittingRef.current) {
                          console.log("AI started speaking, pausing microphone input...");
                          
                          // Only disconnect processor to pause input without stopping the context
                          if (processorRef.current) {
                              try {
                                  processorRef.current.disconnect();
                                  console.log("Disconnected processor to pause input without cleanup");
                              } catch(e) {
                                  console.error("Error disconnecting processor:", e);
                              }
                          }
                          
                          // Mark that we've paused for TTS but don't do full cleanup
                          isTransmittingRef.current = false;
                          setIsTransmitting(false);
                          isPausedByTTSRef.current = true;
                      }
                      // <<< END MODIFIED >>>
                      
                      // console.log(`Received audio delta from server, length: ${data.delta.length} chars`); // REMOVED
                      try {
                        const audioChunk = base64ToArrayBuffer(data.delta);
                        
                        if (audioChunk?.byteLength > 0) {
                          console.log(`Successfully decoded audio chunk: ${audioChunk.byteLength} bytes`);
                          logAudioChunk(`Successfully decoded audio chunk: ${audioChunk.byteLength} bytes`); // USE THROTTLED LOG
                          outputAudioQueue.current.push(audioChunk);
                          console.log(`Added to audio queue. Queue size now: ${outputAudioQueue.current.length}`);
                          logAudioChunk(`Added to audio queue. Queue size now: ${outputAudioQueue.current.length}`); // USE THROTTLED LOG

                          // Force resume audio context if it's suspended - browsers often require user interaction
                          const audioContext = getOutputAudioContext();
                          if (audioContext && audioContext.state === 'suspended') {
                            console.log("Attempting to resume suspended audio context...");
                            audioContext.resume().then(() => {
                              console.log("Audio context resumed successfully!");
                            }).catch(err => {
                              console.error("Failed to resume audio context:", err);
                            });
                          }
                          
                          if (!isPlayingOutputRef.current) {
                            console.log("Not currently playing audio. Starting playback.");
                            logAudioChunk("Not currently playing audio. Starting playback."); // USE THROTTLED LOG
                            playNextAudioChunk();
                          }
                        } else {
                          console.warn("Received empty audio chunk after decoding");
                        }
                      } catch (error) {
                        console.error("Error processing audio delta:", error);
                      }
                    } else {
                      console.warn("Received invalid audio delta format:", data);
                    }
                    break;

                case 'response.audio.done': // Add handler for audio completion
                    console.log("Audio playback complete for current response");
                    // You can update UI or state to indicate audio is done if needed
                    // This is a good place to update progress indicators
                break;
                
                case 'response.audio_transcript.done': { 
                    log(`[AI EVENT] response.audio_transcript.done received. Event data: ${JSON.stringify(data)}. Accumulated in aiSpeechDraftRef: "${aiSpeechDraftRef.current}"`);
                    const finalAiTextFromEvent = (data.transcript || '').trim();
                    const finalAiTextFromRef = aiSpeechDraftRef.current.trim();
                    
                    let fullTranscriptText = finalAiTextFromRef; // Prioritize the accumulated ref content

                    // If ref is empty but event has text (e.g., if deltas were missed or this is a non-streaming part of response)
                    if (!fullTranscriptText && finalAiTextFromEvent) {
                        console.warn("[AI EVENT] aiSpeechDraftRef was empty, but event transcript has content. Using event transcript: ", finalAiTextFromEvent);
                        fullTranscriptText = finalAiTextFromEvent;
                    } else if (finalAiTextFromEvent && finalAiTextFromEvent !== finalAiTextFromRef && finalAiTextFromRef) {
                        // This case is less common if deltas are reliably caught, but good to log if ref had content but differed
                        console.warn(`[AI EVENT] Discrepancy: Event transcript "${finalAiTextFromEvent}" vs. Ref transcript "${finalAiTextFromRef}". Using Ref as primary since it was not empty.`);
                    } else if (finalAiTextFromEvent && !finalAiTextFromRef) {
                        // If ref was empty, and event has text (already covered by first 'if', but good for clarity)
                         console.log(`[AI EVENT] aiSpeechDraftRef was empty. Using event transcript: "${finalAiTextFromEvent}"`);
                         fullTranscriptText = finalAiTextFromEvent;
                    }
                    
                    if (fullTranscriptText) { 
                        const processedText = processTranscriptText(fullTranscriptText);
                        if (processedText) {
                            log(`[AI EVENT] response.audio_transcript.done - Calling addMessage for assistant with: "${processedText}" (item_id: ${data.item_id || 'N/A'})`);
                            addMessage?.({ role: 'assistant', content: processedText });

                            if (sessionIdRef.current && !props.sessionComplete) { 
                                log(`[AI EVENT] response.audio_transcript.done - Persisting assistant reply: "${processedText}" (item_id: ${data.item_id || 'N/A'})`);
                                persistTranscript(processedText, 'assistant'); 
                            }
                        } else {
                           console.warn("[AI EVENT] response.audio_transcript.done - Accumulated/event transcript was empty AFTER processing.");
                        }
                    } else {
                        console.warn("[AI EVENT] response.audio_transcript.done - Accumulated/event transcript was empty or whitespace BEFORE processing. Not persisting.");
                    }
                    setAiDraft(''); // Clear UI draft
                    aiSpeechDraftRef.current = ''; // Reset accumulated ref for next utterance
                    break;
                }
                
                case 'response.text.delta': // Add handler for text transcript
                    if (data.delta && typeof data.delta === 'string') {
                      console.log(`Received text transcript delta: "${data.delta}"`);
                      logEveryN(5)(`Received text transcript delta: "${data.delta}"`); // Throttle this log

                      // Update aiDraft field with transcript
                      // Append the text delta to current aiDraft
                      // setAiDraft(prevInput => prevInput + data.delta);
                      pushTranscript('assistant', data.delta); 
                    }
                break;
                
                case 'response.text.done': {
                    const processed = processTranscriptText(data.text ?? data.delta ?? '');
                    if (!processed) {
                      console.log("useRealtimeVoice: response.text.done - processed text is empty, skipping.");
                      break;
                    }

                    console.log("useRealtimeVoice: response.text.done - Calling addMessage for assistant with:", processed);
                    addMessage?.({ role: 'assistant', content: processed });
                    setAiDraft('');

                    console.log("useRealtimeVoice: response.text.done - Persisting assistant reply:", processed);
                    apiService.sessions.interact(sessionId, {
                      role     : 'assistant',
                      message  : processed,
                      generate : false,
                      modality : 'voice'
                    }).catch(e => {
                      console.error('useRealtimeVoice: Failed to persist assistant reply from response.text.done:', e);
                    });
                    break;
                }
                
                case 'response.content_part.added': // Content part added
                    console.log("Content part added to response:", data.content_part?.type);
                    // Track content parts being added to the response
                break;
                
                case 'response.content_part.done': // Content part completed
                    console.log("Content part complete");
                    // Content part is fully received and processed
                break;
                
                case 'response.output_item.added': // New output item added
                    console.log("Output item added to response:", data.item?.type);
                    // New output item was added to the response
                    
                    // If this is an audio transcript, make sure we persist it
                    if (data.item?.type === 'text' && data.item?.text) {
                      const processedText = processTranscriptText(data.item.text);
                      if (processedText) {
                        console.log("Processing output item text for persistence:", processedText);
                        
                        // Persist the assistant response to backend
                        try {
                          apiService.sessions.interact(sessionId, {
                            role: 'assistant',
                            message: processedText,
                            source: 'assistant'  // let the backend treat it as AI
                          });
                          console.log("Persisted output item text to backend");
                        } catch(e) {
                          console.error('Failed to persist output item text:', e);
                        }
                      }
                    }
                break;
                
                case 'response.output_item.done': // Output item complete
                // Returned when an Item is done streaming. Also emitted when a Response is interrupted,
                // incomplete, or cancelled.
                    console.log("Output item complete");
                    // Output item is fully received and processed
                break;
                
                case 'response.done': // Response is done streaming
                    console.log("Response cycle finished via proxy");
                    setIsClientSpeaking(false); // Reset client speaking state
                    lastAiResponseTimeRef.current = Date.now(); // Record finish time
                    
                    // If mic was paused by TTS, reconnect processor instead of full restart
                    if (isPausedByTTSRef.current) {
                      console.log("AI response done - reconnecting processor that was paused by TTS");
                      
                      // Only reconnect processor if we have valid source and processor nodes
                      if (audioSourceRef.current && processorRef.current && audioContextRef.current) {
                        try {
                          // Reconnect nodes: source -> processor -> destination
                          audioSourceRef.current.connect(processorRef.current);
                          processorRef.current.connect(audioContextRef.current.destination);
                          console.log("Reconnected audio nodes after AI finished speaking");
                          
                          // Reset state
                          isTransmittingRef.current = true;
                          setIsTransmitting(true);
                          isPausedByTTSRef.current = false;
                        } catch (e) {
                          console.error("Error reconnecting processor:", e);
                          // Fallback to full restart if reconnection fails
                          setTimeout(() => {
                            if (isRealtimeModeRef.current && !isClientSpeaking) {
                              startAudioProcessing();
                            }
                          }, RESTART_DELAY_MS);
                        }
                      } else {
                        // If nodes aren't available, fall back to full restart with delay
                        console.log("Audio nodes not available, doing full restart after delay");
                        setTimeout(() => {
                          if (isRealtimeModeRef.current && !isClientSpeaking) {
                            startAudioProcessing();
                          }
                        }, RESTART_DELAY_MS);
                      }
                    } else {
                      // Use the delay for all mic restarts after AI responses
                      setTimeout(() => {
                        if (isRealtimeModeRef.current &&
                            !isTransmittingRef.current &&
                            !isPaused &&
                            !isClientSpeaking)
                        {
                            console.log("AI finished speaking (after grace period), restarting user mic processing...");
                            startAudioProcessing();
                        }
                      }, RESTART_DELAY_MS);
                    }
                    
                    break;

                case 'conversation.item.input_audio_transcription.delta': { //text value of an input audio transcription updated
                // Returned when the text value of an input audio transcription content part is updated.
                    // accumulate partial user transcript from data.delta
                    const chunk = data.delta;
                    if (typeof chunk === 'string') { // No need for trim check here
                      userBufferRef.current += chunk;
                      setUserDraft(userTranscriptRef.current); // Update draft for live subtitling
                      // Do NOT call onUserTranscriptChunk or addMessage here
                    }
                    break;
                }

                case 'conversation.item.input_audio_transcription.done':
                    log("RAW .completed event data.item:", JSON.stringify(data.item));
                    log("RAW .completed event full data:", JSON.stringify(data));
                    if (data.item_id === currentUserItemIdRef.current && data.transcript) {
                        const finalUserText = data.transcript.trim();
                        log(`User transcript completed for item ${data.item_id}: \"${finalUserText}\"`);
                        if (finalUserText) {
                            const processedFinalUserText = processTranscriptText(finalUserText); // Process it
                            if (processedFinalUserText) {
                                handleUserTranscriptComplete?.(processedFinalUserText);
                                persistTranscript(processedFinalUserText, 'user');
                            } else {
                                log(`User transcript completed for item ${data.item_id} but was empty after processing and trim.`);
                            }
                        } else {
                            log(`User transcript completed for item ${data.item_id} but was empty after trim.`);
                        }
                        userTranscriptRef.current = ''; // Clear after processing
                        setUserDraft(''); // Clear UI draft
                        // currentUserItemIdRef.current = null; // Clear only when a new utterance starts via 'committed' or 'conversation.item.created' for user
                    } else {
                        log(`CRITICAL: Ignoring transcript completed event. Reason: `);
                        if (data.item_id !== currentUserItemIdRef.current) log(`  - Mismatched item_id. Expected: '${currentUserItemIdRef.current}', Got: '${data.item_id}'`);
                        if (!data.transcript) log(`  - Transcript missing in event data.`);
                        if (data.transcript && !data.transcript.trim()) log(`  - Transcript was empty or whitespace.`);
                    }
                    break;

                case 'input_audio_buffer.speech_stopped': // Added handler
                    log("Received 'input_audio_buffer.speech_stopped'. User may have stopped speaking.", data);
                    // Primarily for UI updates if needed, e.g., setIsSpeaking(false).
                    // DO NOT persist user transcript from here.
                    // DO NOT clear userTranscriptRef or userDraft here.
                    break;
                
                case 'response.audio.delta': // Forwarded from OpenAI
                    if (data.delta && typeof data.delta === 'string') {
                      // <<< MODIFIED >>> Better pause microphone input without full cleanup
                      if (isTransmittingRef.current) {
                          console.log("AI started speaking, pausing microphone input...");
                          
                          // Only disconnect processor to pause input without stopping the context
                          if (processorRef.current) {
                              try {
                                  processorRef.current.disconnect();
                                  console.log("Disconnected processor to pause input without cleanup");
                              } catch(e) {
                                  console.error("Error disconnecting processor:", e);
                              }
                          }
                          
                          // Mark that we've paused for TTS but don't do full cleanup
                          isTransmittingRef.current = false;
                          setIsTransmitting(false);
                          isPausedByTTSRef.current = true;
                      }
                      // <<< END MODIFIED >>>
                      
                      // console.log(`Received audio delta from server, length: ${data.delta.length} chars`); // REMOVED
                      try {
                        const audioChunk = base64ToArrayBuffer(data.delta);
                        
                        if (audioChunk?.byteLength > 0) {
                          console.log(`Successfully decoded audio chunk: ${audioChunk.byteLength} bytes`);
                          logAudioChunk(`Successfully decoded audio chunk: ${audioChunk.byteLength} bytes`); // USE THROTTLED LOG
                          outputAudioQueue.current.push(audioChunk);
                          console.log(`Added to audio queue. Queue size now: ${outputAudioQueue.current.length}`);
                          logAudioChunk(`Added to audio queue. Queue size now: ${outputAudioQueue.current.length}`); // USE THROTTLED LOG

                          // Force resume audio context if it's suspended - browsers often require user interaction
                          const audioContext = getOutputAudioContext();
                          if (audioContext && audioContext.state === 'suspended') {
                            console.log("Attempting to resume suspended audio context...");
                            audioContext.resume().then(() => {
                              console.log("Audio context resumed successfully!");
                            }).catch(err => {
                              console.error("Failed to resume audio context:", err);
                            });
                          }
                          
                          if (!isPlayingOutputRef.current) {
                            console.log("Not currently playing audio. Starting playback.");
                            logAudioChunk("Not currently playing audio. Starting playback."); // USE THROTTLED LOG
                            playNextAudioChunk();
                          }
                        } else {
                          console.warn("Received empty audio chunk after decoding");
                        }
                      } catch (error) {
                        console.error("Error processing audio delta:", error);
                      }
                    } else {
                      console.warn("Received invalid audio delta format:", data);
                    }
                    break;

                case 'response.audio_transcript.delta': // Added to handle AI speech transcript deltas
                    if (data.delta && typeof data.delta === 'string') {
                        log(`[AI EVENT] response.audio_transcript.delta: "${data.delta}" for item_id: ${data.item_id}`);
                        aiSpeechDraftRef.current += data.delta; // Accumulate AI transcript
                        setAiDraft(aiSpeechDraftRef.current); // Update UI draft
                    } else {
                        console.warn("[AI EVENT] response.audio_transcript.delta received with invalid delta:", data);
                    }
                    break;
                
                default:
                    console.log(`Received event via proxy: ${eventType}`, data);
                break;
              }
              
            } catch (error) {
              console.error("Error processing WebSocket message from proxy:", error, "Raw data:", event.data);
            }
          };

          nativeWs.onclose = (event) => {
            // Log more details on close
            console.warn(`📢 [Trace] WebSocket connection to Proxy closed forcefully: Code=${event.code}, Reason=${event.reason || 'No reason specified'}, WasClean=${event.wasClean}`);
            console.trace("WebSocket onclose event stack trace");
            setIsRealtimeWsConnected(false);
            isRealtimeWsConnectedRef.current = false; // Also reset the ref here
            setIsConnecting(false);
            connectionLockRef.current = false; // Release lock
            
            // Avoid duplicate snackbar if connectionFailed was already set by onerror or explicit auth error
            if (!connectionFailed.current && mountedRef.current) {
              // Provide more informative messages based on close code
              let reasonMsg = event.reason || 'Unknown reason';
              if (event.code === 1006) {
                  reasonMsg = "Connection closed abnormally (1006)";
              } else if (event.code === 4001) {
                  reasonMsg = "Authentication failed (JWT)";
              } else if (event.code === 4002) {
                  reasonMsg = "Authentication failed (OpenAI Token)";
              } else if (event.code === 4003) {
                reasonMsg = "Authentication process error";
              } else if (event.code === 1011) {
                reasonMsg = "Server error during connection";
              }
              handleSnackbar(`WebSocket closed: ${reasonMsg}`, 'warning');
            }
            
            // Update voice transport state on close
            if (voiceTransportRef.current === 'realtime_webrtc') {
              voiceTransportRef.current = 'none';
              setVoiceTransport('none');
            }
            
            // Only clean up if we're still mounted and not an intentional disconnect
            if (mountedRef.current && !intentionalDisconnectRef.current) {
              cleanup(); 
            }
          };
          
        } catch (error) { 
          console.error('Failed to initiate WebSocket connection setup:', error);
          const connErrorMsg = `Connection setup failed: ${error.message}`;
          setRealtimeError(connErrorMsg);
          handleSnackbar('Error: ' + connErrorMsg, 'error');
          setIsConnecting(false);
          connectionLockRef.current = false; // Release lock
          
          // Update voice transport state on error
          if (voiceTransportRef.current === 'realtime_webrtc') {
            voiceTransportRef.current = 'none';
            setVoiceTransport('none');
          }
          
          cleanup(); 
        }
      }, [sessionId, handleSnackbar, scenarioContext, conversationHistory, userName, sessionComplete]); // Add scenarioContext as a dependency

      // The main connection logic is now handled in the combined WebSocket effect
      // that handles both fetching the config and establishing the connection
      
      // Separate cleanup effect - this ensures cleanups don't trigger unnecessarily
      useEffect(() => {
        if (isRealtimeMode) {
            // Enabling Realtime Mode
            // console.log("Realtime mode ENABLED - ensuring connection and starting audio...");
            // Check if connection exists and is open
            if (clientRef.current?.isConnected && clientRef.current.nativeWs?.readyState === WebSocket.OPEN) {
                //  console.log("WebSocket already connected. Starting/Restarting audio processing.");
                if (!isTransmittingRef.current && !isPaused) {
                    startAudioProcessing();
                }
            } else {
                // Not connected or connection lost, attempt to connect/reconnect
                console.log("WebSocket not connected or connection lost. Attempting connection...");
                connectRealtimeVoice(); // This handles the connection process
            }
        } else {
            // Disabling Realtime Mode
            // console.log("Realtime mode DISABLED - stopping audio processing, keeping WS open...");
            if (isTransmittingRef.current) {
                stopAudioProcessing(); // Stop sending mic data
            }
            // Explicitly DO NOT call cleanup() here to keep the WS connection alive
            // cleanup(); // <-- Removed
        }
        
        // Update the ref after checking
        isRealtimeModeRef.current = isRealtimeMode;
        
      }, [isRealtimeMode, connectRealtimeVoice, startAudioProcessing, stopAudioProcessing, isPaused]); // Added dependencies

      // --- Control Functions ---
      const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuteState = !prev;
            console.log(`Toggling Mute: ${newMuteState ? 'Muted' : 'Unmuted'}`);
            // Optionally send a config update if API supports dynamic mute?
            // wsRef.current?.send(JSON.stringify({ type: 'session.update', session: { input_muted: newMuteState } }));
            return newMuteState;
        });
      }, []);

      const toggleOutputMute = useCallback(() => {
        setIsOutputMuted(prev => {
            const newMuteState = !prev;
            console.log(`Toggling Output Mute: ${newMuteState ? 'Muted' : 'Unmuted'}`);
            if (gainNodeRef.current && outputAudioContextRef.current) { // Check output context too
                gainNodeRef.current.gain.setValueAtTime(
                  newMuteState ? 0 : 1, 
                  outputAudioContextRef.current.currentTime || 0
                );
            }
            return newMuteState;
        });
      }, []);

      // --- Render Functions ---
      // These functions return JSX and will be called by the parent component

      // Render the main controls (switch, status indicators)
      const renderChatControls = useCallback(() => (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="subtitle2" gutterBottom>Real-time Conversation Controls</Typography>
            <FormGroup row sx={{ justifyContent: 'center', alignItems: 'center' }}>
                {/* Input Mute Toggle */}
                <Tooltip title={isMuted ? "Unmute Microphone" : "Mute Microphone"}>
                    <IconButton onClick={toggleMute} color={isMuted ? "error" : "primary"} size="large" disabled={!isRealtimeWsConnected}>
                        {isMuted ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                </Tooltip>
                {/* Output Mute Toggle */}
                <Tooltip title={isOutputMuted ? "Unmute Speaker" : "Mute Speaker"}>
                    <IconButton onClick={toggleOutputMute} color={isOutputMuted ? "secondary" : "primary"} size="large" disabled={!isRealtimeWsConnected}>
                        {isOutputMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </IconButton>
                </Tooltip>
            </FormGroup>
            {/* Connection Status / Error */}
            <Box sx={{ mt: 1, height: '24px' }}> {/* Reserve space */}
            {isConnecting ? (
                <Chip icon={<CircularProgress size={16} />} label="Connecting..." size="small" variant="outlined" />
            ) : realtimeError ? (
                <Chip icon={<ErrorIcon />} label={realtimeError} size="small" color="error" variant="outlined" />
            ) : isRealtimeWsConnected ? (
                <Chip icon={<CheckCircleIcon />} label="Connected" size="small" color="success" variant="outlined" />
            ) : (
                <Chip icon={<HelpOutlineIcon />} label="Voice Disabled" size="small" variant="outlined" />
            )}
            </Box>
        </Box>
      ), [isMuted, isOutputMuted, toggleMute, toggleOutputMute, realtimeError, isConnecting, isRealtimeWsConnected]);

      // Add a helper function to force a response if detection isn't working well
      const forceCommitAndResponse = useCallback(() => {
        // <<< GUARD >>> Don't commit if client is speaking
        if (isClientSpeakingRef.current) {
            log("Force commit requested, but AI is speaking. Skipping.");
            return;
        }
        if (!clientRef.current || !clientRef.current.isConnected || 
            !clientRef.current.nativeWs || 
            clientRef.current.nativeWs.readyState !== WebSocket.OPEN) {
          log("Cannot force commit - client not connected");
          return;
        }
        // <<< GUARD >>> Only commit if actual speech was detected
        if (!hasDetectedUserSpeechRef.current) {
            log("Force commit requested, but no user speech detected yet. Skipping.");
            return;
        }
        
        // Check if we have enough samples for a valid commit
        if (samplesSinceLastCommitRef.current >= requiredSamplesForCommit) { // Use existing sample count check
          log("🚀 Forcing commit and response creation");
          
          // Send commit message
          clientRef.current.nativeWs.send(JSON.stringify({
            type: "input_audio_buffer.commit"
          }));
          
          // Reset state AFTER commit
          samplesSinceLastCommitRef.current = 0;
          hasDetectedUserSpeechRef.current = false;
          userSpeechStartTimeRef.current = null; 
          
          // <<< MODIFIED >>> Send response.create WITH voice/format/include_text
          setTimeout(() => {
            if (clientRef.current?.nativeWs?.readyState === WebSocket.OPEN) {
              log("🚀 Forcing response.create after forced commit with audio request");
              clientRef.current.nativeWs.send(JSON.stringify({
                type: "response.create",
                // <<< ADDED voice/format/include_text >>>
                voice:  scenarioContext?.clientPersona?.preferredVoice || "alloy",
                format: "pcm16",
                include_text: true  // Always get text transcript along with audio
              }));
            }
          }, 300);
        } else {
          // Not enough audio samples, clear buffer instead of committing
          log(`⏳ Not enough audio for valid commit (${samplesSinceLastCommitRef.current} samples, need ${requiredSamplesForCommit})`);
          
          if (clientRef.current?.nativeWs?.readyState === WebSocket.OPEN) {
            // Clear the buffer instead of committing to avoid errors
            clientRef.current.nativeWs.send(JSON.stringify({
              type: "input_audio_buffer.clear"
            }));
            log("Sent input_audio_buffer.clear to avoid empty buffer commit error");
          }
          
          // Reset state after clearing
          samplesSinceLastCommitRef.current = 0;
          hasDetectedUserSpeechRef.current = false;
          userSpeechStartTimeRef.current = null;
        }
      }, [scenarioContext]); // Added scenarioContext dependency

      // Add the missing toggleRecording function (corrected)
      const toggleRecording = useCallback(() => {
        if (isTransmitting) {
          stopAudioProcessing();
        } else if (isRealtimeWsConnected) {
          startAudioProcessing();
        } else {
          handleSnackbar('Voice system is not ready. Please wait.', 'warning');
        }
      }, [isTransmitting, isRealtimeWsConnected, startAudioProcessing, stopAudioProcessing, handleSnackbar]);

      // Add the missing stopRecording function (corrected)
      const stopRecording = useCallback(() => {
        if (isTransmitting) {
          stopAudioProcessing();
        }
      }, [isTransmitting, stopAudioProcessing]);

      // Render the userDraft area (mic buttons) when real-time is active
      const renderRealtimeVoiceInput = useCallback(() => {
        // Don't allow voice input when session is paused or completed
        const isVoiceDisabled = isPaused || sessionComplete || !isRealtimeWsConnected;
        
        return (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Paper 
              elevation={0} 
          sx={{
                width: '100%', 
            display: 'flex',
            alignItems: 'center', 
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 1,
                pl: 2,
                backgroundColor: isVoiceDisabled ? '#f5f5f5' : 'inherit'
              }}
            >
              <Typography 
                variant="body1" 
                    sx={{ 
                  flexGrow: 1, 
                  color: isVoiceDisabled ? 'text.secondary' : 'text.primary',
                  fontStyle: isVoiceDisabled ? 'italic' : 'normal'
                }}
              >
                {isPaused 
                  ? "Session paused - resume to continue..." 
                  : sessionComplete 
                    ? "Session completed"
                    : !isRealtimeWsConnected
                      ? "Connecting to voice service..."
                      : userDraft || "Speak to interact with the client..."}
              </Typography>
              
              <Tooltip title={isVoiceDisabled 
                ? (isPaused ? "Resume the session to use voice" : "Voice unavailable")
                : (isTransmitting ? "Stop speaking" : "Start speaking")
              }>
                <span>
                  <IconButton 
                    color={isTransmitting ? "error" : "primary"}
                    size="large"
                    disabled={isVoiceDisabled}
                    onClick={toggleRecording}
                    sx={{ 
                      animation: isTransmitting ? 'pulse 1.5s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.1)' },
                        '100%': { transform: 'scale(1)' },
                      },
                    }}
                  >
                    {isTransmitting ? <GraphicEqIcon /> : <MicIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            </Paper>
            </Box>
        );
      }, [isPaused, sessionComplete, isRealtimeWsConnected, isTransmitting, userDraft, toggleRecording]);

      // Add isPaused effect to stop recording/close connection when session is paused
      useEffect(() => {
        if (isPaused && isTransmitting) {
          console.log("Session paused - stopping voice recording");
          stopRecording();
        }
      }, [isPaused]);

      // Add this helper function after the other helper functions


      // Add this effect to reset the cached URL when sessionId changes
      useEffect(() => {
        if (sessionId !== sessionIdRef.current) {
          console.log("Session ID changed, clearing cached WebSocket URL");
          cachedWsUrlRef.current = null;
          sessionIdRef.current = sessionId;
        }
      }, [sessionId]);

      // Add effect to ensure audio processing starts when connection is established
      useEffect(() => {
        // Only proceed if realtime mode is on and websocket is connected
        if (isRealtimeWsConnected && isRealtimeMode && clientRef.current?.isConnected) {
          console.log("🔄 Checking if audio processing needs to be started...");
          
          // Check if audio processing is already active
          if (!audioContextRef.current || !streamRef.current || !processorRef.current) {
            console.log("🎤 Audio processing not active yet, starting now...");
            startAudioProcessing();
          } else {
            console.log("✓ Audio processing already active");
          }
        }
      }, [isRealtimeWsConnected, isRealtimeMode]);

      // -------------------------------------------------------------------------
      //            C L E A N U P  /  T O G G L E   O F F
      // -------------------------------------------------------------------------
      // Whenever voice-mode is disabled from the parent:
      useEffect(() => {
        if (!isRealtimeMode) {
          // voice mode switched OFF  → flush transcript
          flushTranscript();
        }
      }, [isRealtimeMode, flushTranscript]);

      // Also flush when the component unmounts or the peer connection closes
      useEffect(() => () => flushTranscript(), [flushTranscript]);

      // Create a ref to track the client speaking state for use in callbacks
      const isClientSpeakingRef = useRef(false);
      
      // Logging instances (defined once within the hook scope)
      const logOnaudioprocess = logEveryN(10);
      const logPlayback = logEveryN(5);
      const logAudioChunk = logEveryN(10);

      // Update the ref when the state changes
      useEffect(() => {
        isClientSpeakingRef.current = isClientSpeaking;
        
        // Log state changes for debugging
        if (isClientSpeaking) {
          console.log("🔊 AI SPEAKING STATE: TRUE - Client is now speaking");
        } else {
          console.log("🔊 AI SPEAKING STATE: FALSE - Client stopped speaking");
        }
      }, [isClientSpeaking]);

      // Add state for transcript buffer
      const [transcriptBuffer, setTranscriptBuffer] = useState('');
      const transcriptTimerRef = useRef(null);
      
      // Function to flush transcript buffer to the display
      const flushTranscriptBuffer = useCallback(() => {
        if (transcriptBuffer.trim()) {
          const processedChunk = processTranscriptText(transcriptBuffer);
          if (processedChunk) {
            // Call ONCE with the processed chunk from the buffer
            console.log("Flushing buffered transcript chunk:", processedChunk);
            addMessage?.({ role: 'user', content: processedChunk }); // Use direct callback
          }
          setTranscriptBuffer(''); // Clear buffer after flushing
        }
      }, [transcriptBuffer, addMessage]); // Depend on addMessage callback
      
      // Add a new ref to track if mic was paused by AI speaking
      const isPausedByTTSRef = useRef(false);

      // Add these two new refs at the top of the hook
      const latestConnectRef = useRef(null);
      const latestCleanupRef = useRef(null);

      // Add effects to keep the latest references to connectRealtimeVoice and cleanup
      useEffect(() => {
        latestConnectRef.current = connectRealtimeVoice;
      }, [connectRealtimeVoice]);

      useEffect(() => {
        latestCleanupRef.current = cleanup;
      }, [cleanup]); // Keep dependency

      // Ref for stopAudioProcessing needed in the stable effect
      const latestStopAudioProcessingRef = useRef(stopAudioProcessing);
      useEffect(() => {
        latestStopAudioProcessingRef.current = stopAudioProcessing;
      }, [stopAudioProcessing]);

      // Refs to track previous prop values for stable effect
      const prevIsRealtimeModeRef = useRef(isRealtimeMode);
      const prevSessionIdRef = useRef(sessionId);

      // Stable effect for managing connection based on REAL prop changes
      useEffect(() => {
        const currentSessionId = sessionId; // Capture current sessionId for comparison

        // --- Check for Session ID Change --- 
        if (prevSessionIdRef.current !== currentSessionId) {
          console.log(`%cSession ID changed: ${prevSessionIdRef.current} -> ${currentSessionId}. Triggering full cleanup and reconnect.`, 'color: orange; font-weight: bold;');
          if (latestCleanupRef.current) latestCleanupRef.current(); // Cleanup old connection
          prevSessionIdRef.current = currentSessionId; // Update ref
          // Reset realtime mode ref as well, connection needs fresh state
          prevIsRealtimeModeRef.current = isRealtimeMode; 

          if (isRealtimeMode && currentSessionId && latestConnectRef.current) {
            console.log(`%cAttempting connect for new session ${currentSessionId}`, 'color: blue;');
            latestConnectRef.current(); // Connect with new session ID if in realtime mode
          }
          // --- Important: Exit effect early if session ID changed --- 
          return;
        }

        // --- Check for Realtime Mode Change (Session ID is stable) --- 
        if (prevIsRealtimeModeRef.current !== isRealtimeMode) {
          console.log(`%cRealtime mode changed: ${prevIsRealtimeModeRef.current} -> ${isRealtimeMode}`, 'color: purple;');
          prevIsRealtimeModeRef.current = isRealtimeMode; // Update ref

          if (isRealtimeMode) {
            // Mode turned ON
            console.log("%cRealtime mode turned ON. Ensuring connection...", 'color: green;');
            if (latestConnectRef.current) {
              // Attempt connection (it might already be connected, connectRealtimeVoice handles that)
              latestConnectRef.current();
            }
            // Ensure audio starts if connection is already good
            if (clientRef.current?.isConnected && !isTransmittingRef.current && !isPaused) {
              console.log("%cRealtime mode ON - starting audio processing if needed.", 'color: green;');
              if (startAudioProcessing) startAudioProcessing(); // Check if function exists
            }
          } else {
            // Mode turned OFF
            console.log("%cRealtime mode turned OFF. Stopping audio processing only.", 'color: red;');
            if (latestStopAudioProcessingRef.current) { 
              latestStopAudioProcessingRef.current(); // Only stop mic, keep WS open
            }
            // Flush any remaining partial transcript when toggling off
            if (flushTranscript) flushTranscript(); // Check if function exists
          }
        }

        // --- Component Unmount Cleanup --- 
        // This cleanup function runs ONLY when the component unmounts
        // because the dependency array is empty.
        return () => {
           console.warn("%c----------- CLEANUP FROM STABLE MAIN EFFECT (UNMOUNT) -----------%c", 'color: red; font-weight: bold;', 'color:red;');
           if (latestCleanupRef.current) latestCleanupRef.current();
        };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // <<< EMPTY DEPENDENCY ARRAY - runs once on mount, cleanup on unmount

      // --- Return Value ---
      // <<< WRAP in useMemo >>>
      return React.useMemo(() => ({
        isRealtimeMode,
        isRealtimeWsConnected,
        isClientSpeaking,
        isSpeaking,
        audioLevel,
        maxAudioLevel,
        renderChatControls,
        renderRealtimeVoiceInput,
        realtimeError,
        isConnecting,
        isMuted,
        isOutputMuted,
        toggleMute,
        toggleOutputMute,
        sessionTimestamp,
        sessionComplete, // Return sessionComplete directly
        sessionId,
        microphonePermission,
        toggleRealtimeMode: (event) => {
          const checked = event.target.checked;
          // original behaviour …
          if (!checked) flushTranscript(); // manual toggle btn inside hook
        },
        toggleRecording,  // Add this line
        stopRecording,    // Add this line
        persistTranscript,
        // <<< ADD DEPENDENCIES for useMemo >>>
      }), [
        isRealtimeMode, isRealtimeWsConnected, isClientSpeaking, isSpeaking,
        audioLevel, maxAudioLevel, renderChatControls, renderRealtimeVoiceInput,
        realtimeError, isConnecting, isMuted, isOutputMuted, toggleMute, toggleOutputMute,
        sessionTimestamp, sessionComplete, sessionId, microphonePermission,
        flushTranscript, toggleRecording, stopRecording, persistTranscript
      ]);
    };

    export default useRealtimeVoice; 