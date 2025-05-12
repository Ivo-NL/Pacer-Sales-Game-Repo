/**
 * Offline storage utility
 * Provides methods for storing and retrieving data locally,
 * with synchronization when online connectivity is restored
 */

// Constants for storage keys
const STORAGE_KEYS = {
  PENDING_SYNC: 'pacer_pending_sync',
  USER_PROGRESS: 'pacer_user_progress',
  USER_SETTINGS: 'pacer_user_settings',
  CACHED_SCENARIOS: 'pacer_cached_scenarios',
  CACHED_TEAMS: 'pacer_cached_teams'
};

/**
 * Check if the browser is online
 * @returns {boolean} True if online, false otherwise
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Save data to local storage
 * @param {string} key Storage key
 * @param {any} data Data to store
 * @returns {boolean} Success status
 */
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

/**
 * Retrieve data from local storage
 * @param {string} key Storage key
 * @returns {any|null} Retrieved data or null if not found
 */
export const getFromLocalStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error retrieving from localStorage:', error);
    return null;
  }
};

/**
 * Clear specific data from local storage
 * @param {string} key Storage key
 * @returns {boolean} Success status
 */
export const clearFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Save user progress data locally
 * @param {Object} progressData Progress data to save
 * @returns {boolean} Success status
 */
export const saveUserProgress = (progressData) => {
  return saveToLocalStorage(STORAGE_KEYS.USER_PROGRESS, progressData);
};

/**
 * Get user progress data from local storage
 * @returns {Object|null} User progress data or null
 */
export const getUserProgress = () => {
  return getFromLocalStorage(STORAGE_KEYS.USER_PROGRESS);
};

/**
 * Cache scenario data for offline use
 * @param {Array} scenarios Array of scenario data
 * @returns {boolean} Success status
 */
export const cacheScenarios = (scenarios) => {
  return saveToLocalStorage(STORAGE_KEYS.CACHED_SCENARIOS, scenarios);
};

/**
 * Get cached scenario data
 * @returns {Array|null} Cached scenarios or null
 */
export const getCachedScenarios = () => {
  return getFromLocalStorage(STORAGE_KEYS.CACHED_SCENARIOS);
};

/**
 * Cache team data for offline use
 * @param {Array} teams Array of team data
 * @returns {boolean} Success status
 */
export const cacheTeams = (teams) => {
  return saveToLocalStorage(STORAGE_KEYS.CACHED_TEAMS, teams);
};

/**
 * Get cached team data
 * @returns {Array|null} Cached teams or null
 */
export const getCachedTeams = () => {
  return getFromLocalStorage(STORAGE_KEYS.CACHED_TEAMS);
};

/**
 * Add an action to the pending sync queue
 * @param {Object} action Action to queue
 * @param {string} action.type Type of action
 * @param {Object} action.data Action data
 * @returns {boolean} Success status
 */
export const queueForSync = (action) => {
  try {
    // Get current queue
    const pendingSyncActions = getFromLocalStorage(STORAGE_KEYS.PENDING_SYNC) || [];
    
    // Add timestamp to action
    const actionWithTimestamp = {
      ...action,
      timestamp: new Date().toISOString()
    };
    
    // Add to queue
    pendingSyncActions.push(actionWithTimestamp);
    
    // Save updated queue
    return saveToLocalStorage(STORAGE_KEYS.PENDING_SYNC, pendingSyncActions);
  } catch (error) {
    console.error('Error queuing action for sync:', error);
    return false;
  }
};

/**
 * Get all pending actions for sync
 * @returns {Array} Array of pending actions
 */
export const getPendingSyncActions = () => {
  return getFromLocalStorage(STORAGE_KEYS.PENDING_SYNC) || [];
};

/**
 * Clear pending sync queue
 * @returns {boolean} Success status
 */
export const clearPendingSyncActions = () => {
  return clearFromLocalStorage(STORAGE_KEYS.PENDING_SYNC);
};

/**
 * Process pending sync actions when online
 * @param {Function} apiProcessor Function to process API calls
 * @returns {Promise<Object>} Result of sync operation
 */
export const processPendingSyncActions = async (apiProcessor) => {
  if (!isOnline()) {
    return { success: false, message: 'Offline mode detected, sync postponed' };
  }
  
  const pendingActions = getPendingSyncActions();
  
  if (pendingActions.length === 0) {
    return { success: true, message: 'No pending actions to sync', syncedCount: 0 };
  }
  
  try {
    let syncedCount = 0;
    const failedActions = [];
    
    // Process each action in sequence
    for (const action of pendingActions) {
      try {
        await apiProcessor(action);
        syncedCount++;
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        failedActions.push({ ...action, error: error.message });
      }
    }
    
    // If any actions failed, store them back for retry later
    if (failedActions.length > 0) {
      saveToLocalStorage(STORAGE_KEYS.PENDING_SYNC, failedActions);
      return { 
        success: syncedCount > 0, 
        message: `Synced ${syncedCount} actions, ${failedActions.length} failed`,
        syncedCount,
        failedCount: failedActions.length
      };
    }
    
    // All succeeded, clear the queue
    clearPendingSyncActions();
    return { success: true, message: `Successfully synced ${syncedCount} actions`, syncedCount };
    
  } catch (error) {
    console.error('Error during sync process:', error);
    return { success: false, message: `Sync process error: ${error.message}` };
  }
};

/**
 * Initialize offline storage listeners
 * @param {Function} onOnline Callback when coming online
 * @param {Function} onOffline Callback when going offline
 * @returns {Function} Cleanup function to remove listeners
 */
export const initOfflineListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/**
 * Check storage availability and capacity
 * @returns {Object} Storage status information
 */
export const checkStorageStatus = () => {
  try {
    const storageAvailable = typeof localStorage !== 'undefined';
    
    if (!storageAvailable) {
      return { available: false, capacity: 0, used: 0 };
    }
    
    // Calculate estimated used storage (approximate)
    let usedStorage = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      usedStorage += (key.length + value.length) * 2; // UTF-16 chars use 2 bytes
    }
    
    // Convert to KB
    const usedStorageKB = Math.round(usedStorage / 1024);
    
    // Estimate total capacity (5MB is standard for most browsers)
    const estimatedCapacityKB = 5 * 1024;
    
    return {
      available: true,
      capacityKB: estimatedCapacityKB,
      usedKB: usedStorageKB,
      percentUsed: Math.round((usedStorageKB / estimatedCapacityKB) * 100)
    };
  } catch (error) {
    console.error('Error checking storage status:', error);
    return { available: false, error: error.message };
  }
}; 