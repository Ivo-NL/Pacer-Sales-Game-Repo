import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import OfflineNotification from './components/OfflineNotification';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ScenarioList from './pages/ScenarioList';
import GameSession from './pages/GameSession';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import ProgressDashboard from './pages/ProgressDashboard';
import Teams from './pages/Teams';
import TeamDashboard from './pages/TeamDashboard';
import PeerComparison from './pages/PeerComparison';
import Challenges from './pages/Challenges';
import Sessions from './pages/Sessions';
import Recordings from './pages/Recordings';
import ReviewDashboard from './pages/ReviewDashboard';
import NotFound from './pages/NotFound';

// Context
import { useAuth } from './context/AuthContext';
import { VoiceProvider } from './context/VoiceContext';

// Utilities
import { processPendingSyncActions } from './utils/offlineStorage';
import apiService from './services/api';

// Protected Route component
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading indicator if still checking authentication
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Only redirect if we've finished checking and the user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Return an outlet to render nested routes
  return <Outlet />;
};

function App() {
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  // Handle sync when coming back online
  const handleSync = useCallback(async () => {
    if (syncInProgress) return;
    
    setSyncInProgress(true);
    
    try {
      // Process pending sync actions by passing a function that knows how to handle each action type
      const result = await processPendingSyncActions(async (action) => {
        // Based on action type, call appropriate API
        switch (action.type) {
          case 'SAVE_USER_PROGRESS':
            await apiService.progress.saveProgress(action.data);
            break;
          case 'SAVE_GAME_SESSION':
            await apiService.scenarios.saveSession(action.data);
            break;
          case 'CREATE_TEAM_CHALLENGE':
            await apiService.teams.createChallenge(action.data);
            break;
          case 'JOIN_TEAM':
            await apiService.teams.joinTeam(action.data.teamId, action.data.userId);
            break;
          case 'LEAVE_TEAM':
            await apiService.teams.leaveTeam(action.data.teamId, action.data.userId);
            break;
          default:
            console.warn(`Unknown action type for sync: ${action.type}`);
        }
      });
      
      console.log('Sync result:', result);
      
    } catch (error) {
      console.error('Error during sync process:', error);
    } finally {
      // Small timeout to prevent immediate re-runs if component re-renders quickly
      setTimeout(() => {
        setSyncInProgress(false);
      }, 500);
    }
  }, [syncInProgress]);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <VoiceProvider>
        <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/pacer" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scenarios" element={<ScenarioList />} />
              <Route path="/game/:sessionId" element={<GameSession />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/progress" element={<ProgressDashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/peer-comparison" element={<PeerComparison />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:teamId" element={<TeamDashboard />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/recordings" element={<Recordings />} />
              <Route path="/review-dashboard" element={<ReviewDashboard />} />
            </Route>
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Box>
      </VoiceProvider>
      <Footer />
      
      {/* Offline notifications */}
      <OfflineNotification 
        showOnLoad={false}
        onSync={handleSync}
      />
    </Box>
  );
}

export default App; 