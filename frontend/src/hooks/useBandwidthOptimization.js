import { useState, useEffect, useCallback } from 'react';
import { useResponsiveBreakpoints } from '../utils/responsive';

/**
 * Custom hook for detecting network conditions and optimizing bandwidth usage
 * @param {Object} options Options for bandwidth optimization
 * @param {boolean} options.enabled Whether optimization is enabled
 * @param {Function} options.onNetworkChange Callback when network conditions change
 * @returns {Object} Network info and optimization helpers
 */
const useBandwidthOptimization = (options = {}) => {
  const { enabled = true, onNetworkChange } = options;
  const { isMobile } = useResponsiveBreakpoints();
  
  // Network state
  const [networkInfo, setNetworkInfo] = useState({
    online: navigator.onLine,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
    lowBandwidth: false
  });
  
  // Image quality levels based on network conditions
  const [imageQuality, setImageQuality] = useState({
    highQuality: true,
    qualityLevel: 'high', // high, medium, low, minimal
    maxDimension: 1200,
    preferredFormat: 'webp'
  });

  /**
   * Update network information
   */
  const updateNetworkInfo = useCallback(() => {
    // Basic online status
    const online = navigator.onLine;
    
    // Default network info
    let networkData = {
      online,
      connectionType: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: false
    };
    
    // Check for Network Information API support
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      networkData = {
        ...networkData,
        connectionType: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData || false
      };
    }
    
    // Determine if bandwidth is low
    const lowBandwidth = (
      !networkData.online ||
      networkData.saveData ||
      (networkData.effectiveType && ['slow-2g', '2g', '3g'].includes(networkData.effectiveType)) ||
      (networkData.downlink && networkData.downlink < 1.5) ||
      (networkData.rtt && networkData.rtt > 500)
    );
    
    // Update state with new network info
    setNetworkInfo({
      ...networkData,
      lowBandwidth
    });
    
    // Calculate appropriate image quality level
    let qualityLevel = 'high';
    let maxDimension = 1200;
    let preferredFormat = 'webp';
    let highQuality = true;
    
    if (networkData.saveData || !networkData.online) {
      qualityLevel = 'minimal';
      maxDimension = 400;
      highQuality = false;
    } else if (networkData.effectiveType === 'slow-2g' || networkData.effectiveType === '2g') {
      qualityLevel = 'minimal';
      maxDimension = 400;
      highQuality = false;
    } else if (networkData.effectiveType === '3g' || (networkData.downlink && networkData.downlink < 1)) {
      qualityLevel = 'low';
      maxDimension = 600;
      highQuality = false;
    } else if (isMobile || (networkData.downlink && networkData.downlink < 5)) {
      qualityLevel = 'medium';
      maxDimension = 800;
      highQuality = true;
    }
    
    setImageQuality({
      highQuality,
      qualityLevel,
      maxDimension,
      preferredFormat
    });
    
    // Notify via callback if provided
    if (onNetworkChange) {
      onNetworkChange({
        ...networkData,
        lowBandwidth,
        imageQuality: {
          highQuality,
          qualityLevel,
          maxDimension,
          preferredFormat
        }
      });
    }
  }, [isMobile, onNetworkChange]);
  
  // Set up event listeners for network changes
  useEffect(() => {
    if (!enabled) return;
    
    // Initial update
    updateNetworkInfo();
    
    // Listen for online/offline events
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);
    
    // Listen for connection changes if supported
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateNetworkInfo);
    }
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [enabled, updateNetworkInfo]);
  
  /**
   * Get optimized image URL based on current network conditions
   * @param {string} originalUrl Original image URL
   * @param {Object} options Image optimization options
   * @returns {string} Optimized image URL
   */
  const getOptimizedImageUrl = useCallback((originalUrl, options = {}) => {
    if (!enabled || !originalUrl) return originalUrl;
    
    const {
      width = imageQuality.maxDimension,
      height = imageQuality.maxDimension,
      quality = imageQuality.qualityLevel === 'high' ? 85 : 
                imageQuality.qualityLevel === 'medium' ? 70 :
                imageQuality.qualityLevel === 'low' ? 60 : 40,
      format = imageQuality.preferredFormat
    } = options;
    
    // If URL is from our own image optimization service, update parameters
    if (originalUrl.includes('images.pacer-game.com')) {
      // Remove existing parameters
      const baseUrl = originalUrl.split('?')[0];
      
      // Add new optimization parameters
      return `${baseUrl}?w=${width}&h=${height}&q=${quality}&fmt=${format}`;
    }
    
    // For placeholder.com or similar services
    if (originalUrl.includes('via.placeholder.com')) {
      return `https://via.placeholder.com/${width}x${height}`;
    }
    
    // For external URLs, we can't modify them, so return original
    return originalUrl;
  }, [enabled, imageQuality]);
  
  /**
   * Determine if heavy content should be loaded based on network conditions
   * @param {Object} options Options for the decision
   * @returns {boolean} Whether to load the heavy content
   */
  const shouldLoadHeavyContent = useCallback((options = {}) => {
    if (!enabled) return true;
    
    const {
      sizeKB = 500,
      importance = 'medium', // critical, high, medium, low
      forceLoad = false
    } = options;
    
    // Always load critical content
    if (importance === 'critical' || forceLoad) return true;
    
    // Check against network conditions
    if (!networkInfo.online) {
      return importance === 'high'; // Only load high importance content when offline
    }
    
    if (networkInfo.saveData) {
      return importance === 'high'; // Only load high importance content in saveData mode
    }
    
    // Based on connection type
    if (networkInfo.effectiveType === 'slow-2g') {
      return sizeKB < 50 && importance !== 'low';
    }
    
    if (networkInfo.effectiveType === '2g') {
      return sizeKB < 200 || importance === 'high';
    }
    
    if (networkInfo.effectiveType === '3g') {
      return sizeKB < 1000 || importance !== 'low';
    }
    
    // Default to loading for 4g and better
    return true;
  }, [enabled, networkInfo]);
  
  return {
    networkInfo,
    imageQuality,
    getOptimizedImageUrl,
    shouldLoadHeavyContent,
    updateNetworkInfo
  };
};

export default useBandwidthOptimization; 