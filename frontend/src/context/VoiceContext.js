import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useRealtimeVoice from '../components/voice/useRealtimeVoice'; // Adjust path if needed

// 1. Create the context
const VoiceContext = createContext(null);

// 2. Create the Provider component
export const VoiceProvider = ({ children }) => {
  // --- State managed by Provider, passed to hook or used to update hook ---
  // We need state here to hold values that GameSession will update via context methods
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentScenarioContext, setCurrentScenarioContext] = useState(null);
  const [currentIsPaused, setCurrentIsPaused] = useState(false);
  const [currentVoiceMode, setCurrentVoiceMode] = useState(false); // From GameSession
  const [currentIsRealtimeMode, setCurrentIsRealtimeMode] = useState(false); // From GameSession
  const [currentUserDraft, setCurrentUserDraft] = useState(''); // From GameSession
  const [currentAiDraft, setCurrentAiDraft] = useState(''); // From GameSession
  const [currentUserName, setCurrentUserName] = useState('Salesperson'); // From GameSession user profile
  const [currentConversationHistory, setCurrentConversationHistory] = useState([]); // From GameSession messages
  const [currentSessionComplete, setCurrentSessionComplete] = useState(false); // <<< ADDED

  // --- Refs to hold callback functions from GameSession ---
  // Define refs directly in the Provider
  const handleSnackbarRef = useRef(null);
  const addMessageRef = useRef(null);
  const processEvaluationDataRef = useRef(null);
  const handleTranscriptReadyRef = useRef(null);
  const handleUserTranscriptChunkRef = useRef(null);
  const handleUserTranscriptCompleteRef = useRef(null);
  const setSessionDataRef = useRef(null);

  // --- Functions passed TO GameSession for it to update Provider state ---
  // These allow GameSession to tell the central hook instance about its state changes
  const updateSessionId = useCallback((id) => setCurrentSessionId(id), []);
  const updateScenarioContext = useCallback((context) => setCurrentScenarioContext(context), []);
  const updateIsPaused = useCallback((paused) => setCurrentIsPaused(paused), []);
  const updateVoiceMode = useCallback((mode) => setCurrentVoiceMode(mode), []);
  const updateIsRealtimeMode = useCallback((mode) => setCurrentIsRealtimeMode(mode), []);
  const updateUserDraft = useCallback((draft) => setCurrentUserDraft(draft), []);
  const updateAiDraft = useCallback((draft) => setCurrentAiDraft(draft), []);
  const updateUserName = useCallback((name) => setCurrentUserName(name || 'Salesperson'), []);
  const updateConversationHistory = useCallback((history) => setCurrentConversationHistory(history), []);
  const updateSessionComplete = useCallback((complete) => setCurrentSessionComplete(complete), []); // <<< ADDED

  // --- Define stable callback wrappers ---
  // These functions call the `.current` of the Provider's refs
  const handleSnackbarCallback = useCallback((...args) => handleSnackbarRef.current?.(...args), []);
  const addMessageCallback = useCallback((...args) => addMessageRef.current?.(...args), []);
  const processEvaluationDataCallback = useCallback((...args) => processEvaluationDataRef.current?.(...args), []);
  const handleTranscriptReadyCallback = useCallback((...args) => handleTranscriptReadyRef.current?.(...args), []);
  const handleUserTranscriptChunkCallback = useCallback((...args) => handleUserTranscriptChunkRef.current?.(...args), []);
  const handleUserTranscriptCompleteCallback = useCallback((...args) => handleUserTranscriptCompleteRef.current?.(...args), []);
  const setSessionDataCallback = useCallback((...args) => setSessionDataRef.current?.(...args), []);

  // --- Call the hook ONCE here, passing necessary stable functions/state ---
  // Note: We pass the Provider's state down to the hook.
  //       The hook itself won't need direct access to GameSession's state anymore.
  //       We pass placeholder functions for callbacks initially, they will be updated below.
  const voiceHookValue = useRealtimeVoice({
    sessionId: currentSessionId,
    voiceMode: currentVoiceMode,
    isRealtimeMode: currentIsRealtimeMode,
    userDraft: currentUserDraft,
    setUserDraft: updateUserDraft, // Hook calls this to update provider state
    aiDraft: currentAiDraft,
    setAiDraft: updateAiDraft, // Hook calls this to update provider state
    isPaused: currentIsPaused,
    sessionComplete: currentSessionComplete, // <<< ADDED
    userName: currentUserName,
    scenarioContext: currentScenarioContext,
    conversationHistory: currentConversationHistory,

    // Pass stable callback wrappers to the hook
    handleSnackbar: handleSnackbarCallback,
    addMessage: addMessageCallback,
    processEvaluationData: processEvaluationDataCallback,
    handleTranscriptReady: handleTranscriptReadyCallback, // Renamed prop for clarity
    handleUserTranscriptChunk: handleUserTranscriptChunkCallback, // Renamed prop
    handleUserTranscriptComplete: handleUserTranscriptCompleteCallback, // Renamed prop
    setSessionData: setSessionDataCallback, // Pass the callback wrapper
  });

  // --- Context Value ---
  // Use useMemo for stable context value
  const contextValue = useMemo(() => ({
    // Values/State from the hook instance
    ...voiceHookValue, // Spread all return values from the hook

    // Functions for GameSession to update the Provider's state
    updateSessionId,
    updateScenarioContext,
    updateIsPaused,
    updateVoiceMode,
    updateIsRealtimeMode,
    updateUserDraft,
    updateAiDraft,
    updateUserName,
    updateConversationHistory,
    updateSessionComplete,

    // Functions for GameSession to register its callbacks
    // These update the refs defined directly in the Provider
    registerHandleSnackbar: (fn) => { handleSnackbarRef.current = fn; },
    registerAddMessage: (fn) => { addMessageRef.current = fn; },
    registerProcessEvaluationData: (fn) => { processEvaluationDataRef.current = fn; },
    registerHandleTranscriptReady: (fn) => { handleTranscriptReadyRef.current = fn; },
    registerHandleUserTranscriptChunk: (fn) => { handleUserTranscriptChunkRef.current = fn; },
    registerHandleUserTranscriptComplete: (fn) => { handleUserTranscriptCompleteRef.current = fn; },
    registerSetSessionData: (fn) => { setSessionDataRef.current = fn; },
  }), [
      voiceHookValue, updateSessionId, updateScenarioContext, updateIsPaused,
      updateVoiceMode, updateIsRealtimeMode, updateUserDraft, updateAiDraft,
      updateUserName, updateConversationHistory, updateSessionComplete
  ]); // Add all updater functions to dependency array

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}
    </VoiceContext.Provider>
  );
};

// 3. Custom hook to use the context easily
export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}; 