// messageUtils.js
// Utility to hydrate a canonical numeric timestamp (ms since epoch) and isUser flag on every message
export const hydrateServerTs = (msg) => {
  let ts = msg.timestamp || msg.created_at || msg._received_at || new Date().toISOString();
  // Patch: If timestamp is a string and missing 'Z', append it to ensure UTC parsing
  if (typeof ts === 'string' && !ts.endsWith('Z')) {
    ts += 'Z';
  }
  return {
    ...msg,
    server_ts: Date.parse(ts) || Date.now(),
    isUser: (msg.sender === 'user' || msg.role === 'user'),
    sequence: msg.sequence ?? null // Always keep sequence if present
  };
}; 