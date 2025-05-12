import { RealtimeAPI } from './api';
import { RealtimeUtils } from './utils';

/**
 * Main client for the OpenAI Realtime API
 */
export class RealtimeClient {
  /**
   * Creates a new RealtimeClient instance
   * @param {{url?: string, apiKey?: string, model?: string, dangerouslyAllowAPIKeyInBrowser?: boolean, debug?: boolean}} settings
   */
  constructor({
    url,
    apiKey,
    model,
    dangerouslyAllowAPIKeyInBrowser,
    debug,
  } = {}) {
    this.model = model;
    this.inputAudioBuffer = new Int16Array(0);
    this.realtime = new RealtimeAPI({
      url,
      apiKey,
      dangerouslyAllowAPIKeyInBrowser,
      debug,
    });

    // Set up event handler forwarding
    this.on = this.realtime.on.bind(this.realtime);
    this.off = this.realtime.off.bind(this.realtime);
    this.once = this.realtime.once.bind(this.realtime);
    this.dispatch = this.realtime.dispatch.bind(this.realtime);
    this.waitForNext = this.realtime.waitForNext.bind(this.realtime);
  }

  /**
   * Tells us if the client is connected to the server
   * @returns {boolean}
   */
  get isConnected() {
    return this.realtime.isConnected();
  }

  /**
   * Tells us the URL the client is connected to (or will connect to)
   * @returns {string}
   */
  get url() {
    return this.realtime.url;
  }

  /**
   * Connects to the Realtime API
   * @returns {Promise<true>}
   */
  async connect() {
    await this.realtime.connect();
    
    // If a model was specified, set it immediately after connection
    // via session update instead of in the URL
    if (this.model) {
      try {
        console.log(`Setting model via session update: ${this.model}`);
        // Send a complete session configuration including but not limited to the model
        this.updateSession({
          model: this.model,
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          // Default voice
          voice: "alloy",
          // Turn detection settings
          turn_detection: {
            type: "semantic_vad",
            eagerness: "medium",
            create_response: false,
            interrupt_response: false
          }
        });
      } catch (error) {
        console.warn(`Failed to set model via session update: ${error.message}`);
      }
    }
    
    return true;
  }

  /**
   * Disconnects from the server
   * @returns {true}
   */
  disconnect() {
    this.realtime.disconnect();
    return true;
  }

  /**
   * Updates the session configuration
   * @param {{model?: string, instructions?: string, voice?: string, temperature?: number, max_tokens?: number, frequency_penalty?: number, presence_penalty?: number, similarity_penalty?: number, turn_detection?: {type?: string, eagerness?: string, create_response?: boolean, interrupt_response?: boolean, input_audio_buffer_commit_empty?: boolean}}} session
   * @returns {true}
   */
  updateSession(session) {
    this.realtime.send('session.update', { session });
    return true;
  }

  /**
   * Resets the session configuration back to default
   * @returns {true}
   */
  resetSession() {
    this.realtime.send('session.reset');
    return true;
  }

  /**
   * Adds audio data to the input buffer
   * @param {string} base64Audio Base64 encoded audio data
   * @returns {true}
   */
  addInputAudio(base64Audio) {
    this.realtime.send('input_audio_buffer.append', { audio: base64Audio });
    return true;
  }

  /**
   * Commits the input audio buffer and triggers a response
   * @returns {true}
   */
  commitInputAudio() {
    this.realtime.send('input_audio_buffer.commit');
    return true;
  }

  /**
   * Creates a response from the server
   * @returns {true}
   */
  createResponse() {
    this.realtime.send('response.create');
    return true;
  }

  /**
   * Cancels the response from the server
   * @returns {true}
   */
  cancelResponse() {
    this.realtime.send('response.cancel');
    return true;
  }

  /**
   * Send a client event to the server
   * @param {string} eventName 
   * @param {object} data 
   * @returns {true}
   */
  sendClientEvent(eventName, data = {}) {
    this.realtime.send(eventName, data);
    return true;
  }
} 