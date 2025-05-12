export const log = (...args) => {
  // Check for a global debug flag (e.g., set via browser console: window.DEBUG_RT = true)
  if (process.env.NODE_ENV !== "production" && window.DEBUG_RT) {
    console.log(...args);
  }
};

export const logEveryN = (n) => {
  let i = 0;
  // Return a function that logs only every nth call
  return (...args) => {
    i++;
    if (i % n === 0) {
      // Use the conditional log function internally
      log(...args);
      // Reset counter after logging to avoid large numbers if needed
      // i = 0; // Optional: Reset counter if you prefer
    }
  };
}; 