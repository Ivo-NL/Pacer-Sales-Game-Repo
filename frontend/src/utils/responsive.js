/**
 * Responsive design utility functions and constants
 * This file provides utilities for creating consistent responsive UI across the application
 */

import { useMediaQuery, useTheme } from '@mui/material';

// Breakpoint values (in pixels) - match Material UI's default breakpoints
export const breakpoints = {
  xs: 0,      // Extra small devices (portrait phones)
  sm: 600,    // Small devices (landscape phones)
  md: 900,    // Medium devices (tablets)
  lg: 1200,   // Large devices (desktops)
  xl: 1536    // Extra large devices (large desktops)
};

/**
 * Provides boolean values indicating current screen size
 * @returns {Object} Object containing boolean values for each breakpoint
 */
export const useResponsiveBreakpoints = () => {
  const theme = useTheme();
  
  return {
    isXs: useMediaQuery(theme.breakpoints.only('xs')),
    isSm: useMediaQuery(theme.breakpoints.only('sm')),
    isMd: useMediaQuery(theme.breakpoints.only('md')),
    isLg: useMediaQuery(theme.breakpoints.only('lg')),
    isXl: useMediaQuery(theme.breakpoints.only('xl')),
    
    isDownXs: useMediaQuery(theme.breakpoints.down('xs')),
    isDownSm: useMediaQuery(theme.breakpoints.down('sm')),
    isDownMd: useMediaQuery(theme.breakpoints.down('md')),
    isDownLg: useMediaQuery(theme.breakpoints.down('lg')),
    
    isUpSm: useMediaQuery(theme.breakpoints.up('sm')),
    isUpMd: useMediaQuery(theme.breakpoints.up('md')),
    isUpLg: useMediaQuery(theme.breakpoints.up('lg')),
    isUpXl: useMediaQuery(theme.breakpoints.up('xl')),
    
    isMobile: useMediaQuery(theme.breakpoints.down('sm')),
    isTablet: useMediaQuery(theme.breakpoints.between('sm', 'md')),
    isDesktop: useMediaQuery(theme.breakpoints.up('md')),
    
    // Check for touch-capable devices
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  };
};

/**
 * Returns the appropriate value based on current screen size
 * @param {Object} options - Options object containing values for different breakpoints
 * @param {any} options.xs - Value for extra small screens
 * @param {any} options.sm - Value for small screens
 * @param {any} options.md - Value for medium screens
 * @param {any} options.lg - Value for large screens
 * @param {any} options.xl - Value for extra large screens
 * @param {any} options.default - Default value if no matching breakpoint
 * @returns {any} The appropriate value for the current screen size
 */
export const getResponsiveValue = (options) => {
  const breakpoints = useResponsiveBreakpoints();
  
  if (breakpoints.isXs && options.xs !== undefined) return options.xs;
  if (breakpoints.isSm && options.sm !== undefined) return options.sm;
  if (breakpoints.isMd && options.md !== undefined) return options.md;
  if (breakpoints.isLg && options.lg !== undefined) return options.lg;
  if (breakpoints.isXl && options.xl !== undefined) return options.xl;
  
  return options.default || options.md || options.sm || options.xs;
};

/**
 * Custom hook to get touch-optimized dimensions for UI elements
 * @returns {Object} Object with touch-optimized dimensions
 */
export const useTouchOptimizedSizes = () => {
  const { isTouch, isMobile, isTablet } = useResponsiveBreakpoints();
  
  // Default sizes
  const defaultSizes = {
    buttonMinHeight: 36,
    buttonMinWidth: 64,
    iconButtonSize: 40,
    inputHeight: 40,
    touchTargetSize: 48,  // Minimum recommended touch target size
    spacing: 8           // Base spacing unit
  };
  
  // Touch-optimized sizes
  const touchSizes = {
    buttonMinHeight: 48,
    buttonMinWidth: 88,
    iconButtonSize: 48,
    inputHeight: 56,
    touchTargetSize: 56,
    spacing: 12
  };
  
  // Mobile-specific sizes
  const mobileSizes = {
    ...touchSizes,
    buttonMinHeight: 56,
    iconButtonSize: 56,
    touchTargetSize: 64,
    spacing: 16
  };
  
  if (isMobile) return mobileSizes;
  if (isTouch || isTablet) return touchSizes;
  return defaultSizes;
};

/**
 * Helper class for creating container width constraints based on content type
 * and screen size
 */
export const containerWidths = {
  // Full-width container with margin
  fluid: {
    xs: '100%',
    sm: '100%',
    md: '100%',
    lg: '100%',
    xl: '100%'
  },
  
  // Standard container (default)
  standard: {
    xs: '100%',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px'
  },
  
  // Narrow container for focused content
  narrow: {
    xs: '100%',
    sm: '500px',
    md: '700px',
    lg: '900px',
    xl: '1100px'
  },
  
  // Wide container for expanded content
  wide: {
    xs: '100%',
    sm: '100%',
    md: '1000px',
    lg: '1400px',
    xl: '1800px'
  }
};

/**
 * Helper for creating responsive font sizes
 */
export const fontSizes = {
  h1: {
    xs: '2rem',    // 32px
    sm: '2.25rem', // 36px
    md: '2.5rem',  // 40px
    lg: '2.75rem', // 44px
    xl: '3rem'     // 48px
  },
  h2: {
    xs: '1.75rem', // 28px
    sm: '1.875rem', // 30px
    md: '2rem',    // 32px
    lg: '2.25rem', // 36px
    xl: '2.5rem'   // 40px
  },
  h3: {
    xs: '1.5rem',  // 24px
    sm: '1.625rem', // 26px
    md: '1.75rem', // 28px
    lg: '1.875rem', // 30px
    xl: '2rem'     // 32px
  },
  body1: {
    xs: '0.875rem', // 14px
    sm: '0.9375rem', // 15px
    md: '1rem',    // 16px
    lg: '1rem',    // 16px
    xl: '1.125rem' // 18px
  },
  body2: {
    xs: '0.8125rem', // 13px
    sm: '0.875rem', // 14px
    md: '0.9375rem', // 15px
    lg: '0.9375rem', // 15px
    xl: '1rem'     // 16px
  }
}; 