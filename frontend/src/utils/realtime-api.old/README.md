# Custom OpenAI Realtime API Implementation

This is a customized implementation of the OpenAI Realtime API client, based on the official @openai/realtime-api-beta library but with the following key improvements:

1. **No hardcoded model:** The default model parameter has been removed, allowing you to specify any model explicitly
2. **Proper URL construction:** The library properly handles URLs with or without query parameters 
3. **Better error handling:** More robust error handling and WebSocket connection management

## Usage

```javascript
import { RealtimeClient } from '../utils/realtime-api';

// Create a RealtimeClient with explicit model
const client = new RealtimeClient({
  url: 'wss://your-server-url',
  model: 'gpt-4o-mini-realtime-preview' // Explicitly set model
});

// Connect
await client.connect();

// Update session config
client.updateSession({
  input_audio_format: "pcm16",
  output_audio_format: "pcm16",
  voice: "alloy",
  instructions: "You are a helpful assistant."
});

// Send events
client.sendClientEvent('input_audio_buffer.append', { audio: base64AudioString });

// Handle events
client.on('server.response.audio.delta', (event) => {
  // Handle audio delta
});

// Disconnect when done
client.disconnect();
```

This custom implementation gives full control over the model parameter and URL construction, avoiding issues with the original library adding unwanted query parameters. 