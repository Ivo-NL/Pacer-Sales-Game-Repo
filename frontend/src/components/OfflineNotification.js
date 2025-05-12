import React, { useState, useEffect, useRef } from 'react';
import { Snackbar, Alert, Box, Button, Chip, Typography } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';
import { isOnline, getPendingSyncActions } from '../utils/offlineStorage';

/**
 * Component to notify users of offline status and pending sync actions
 * @param {Object} props Component props
 * @param {boolean} props.showOnLoad Whether to show the notification on load
 * @param {Function} props.onSync Callback when sync is triggered
 * @returns {JSX.Element} The component
 */
const OfflineNotification = ({ showOnLoad = false, onSync }) => {
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [wasOffline, setWasOffline] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(showOnLoad && !isOnline());
  const [pendingActions, setPendingActions] = useState([]);
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    // Check for pending sync actions
    const checkPendingActions = () => {
      const actions = getPendingSyncActions();
      setPendingActions(actions || []);
    };
    
    // Handler for online status changes
    const handleOnlineStatusChange = () => {
      const online = isOnline();
      
      if (!online) {
        // Going offline
        setIsOffline(true);
        setShowSnackbar(true);
      } else if (isOffline) {
        // Coming back online after being offline
        setIsOffline(false);
        setWasOffline(true);
        setShowSnackbar(true);
        checkPendingActions();
      }
    };
    
    // Set up event listeners
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Initial checks - but only on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      handleOnlineStatusChange();
      checkPendingActions();
    }
    
    // Set up periodic check for pending actions (reduce frequency to minimize rerenders)
    const intervalId = setInterval(checkPendingActions, 60000); // Check every minute instead of 30 seconds
    
    // Clean up
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      clearInterval(intervalId);
    };
  }, [isOffline]);
  
  // Handle sync button click
  const handleSync = () => {
    if (onSync && typeof onSync === 'function') {
      onSync();
    }
    
    // Close snackbar
    setShowSnackbar(false);
    setWasOffline(false);
  };
  
  // Handle close
  const handleClose = () => {
    setShowSnackbar(false);
  };
  
  // Message for offline status
  const getMessage = () => {
    if (isOffline) {
      return "You're currently offline. Your changes will be saved locally and synced when you reconnect.";
    } else if (wasOffline && pendingActions.length > 0) {
      return `You're back online! You have ${pendingActions.length} pending changes to sync.`;
    } else if (wasOffline) {
      return "You're back online!";
    } else if (pendingActions.length > 0) {
      return `You have ${pendingActions.length} pending changes to sync.`;
    }
    return null;
  };
  
  // Icon for offline status
  const getIcon = () => {
    if (isOffline) {
      return <WifiOffIcon />;
    } else if (pendingActions.length > 0) {
      return <SyncIcon />;
    } else {
      return <CloudOffIcon />;
    }
  };
  
  // Severity for offline status
  const getSeverity = () => {
    if (isOffline) {
      return "warning";
    } else if (pendingActions.length > 0) {
      return "info";
    } else {
      return "success";
    }
  };
  
  // If no message, don't render
  if (!getMessage()) {
    return null;
  }
  
  return (
    <Snackbar
      open={showSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={handleClose}
      // Keep open indefinitely if offline, otherwise close after 6 seconds
      autoHideDuration={isOffline ? null : 6000}
    >
      <Alert 
        severity={getSeverity()} 
        icon={getIcon()}
        onClose={handleClose}
        sx={{ 
          width: '100%',
          display: 'flex',
          alignItems: 'center'
        }}
        action={
          (wasOffline || pendingActions.length > 0) && !isOffline ? (
            <Button color="inherit" size="small" onClick={handleSync}>
              Sync Now
            </Button>
          ) : (
            <Chip
              label={isOffline ? "Offline Mode" : "Online"}
              color={isOffline ? "warning" : "success"}
              size="small"
              variant="outlined"
            />
          )
        }
      >
        <Box>
          <Typography variant="body2">{getMessage()}</Typography>
          {pendingActions.length > 0 && !isOffline && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              These will be automatically synced in the background.
            </Typography>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default OfflineNotification; 