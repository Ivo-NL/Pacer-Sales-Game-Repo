import { RealtimeEventHandler } from './event_handler';
import { RealtimeUtils } from './utils';

export class RealtimeAPI extends RealtimeEventHandler {
  /**
   * Create a new RealtimeAPI instance
   * @param {{url?: string, apiKey?: string, dangerouslyAllowAPIKeyInBrowser?: boolean, debug?: boolean}} [settings]
   * @returns {RealtimeAPI}
   */
  constructor({ url, apiKey, dangerouslyAllowAPIKeyInBrowser, debug } = {}) {
    super();
    this.defaultUrl = 'wss://api.openai.com/v1/realtime';
    this.url = url || this.defaultUrl;
    this.apiKey = apiKey || null;
    this.debug = !!debug;
    this.ws = null;

    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && this.apiKey) {
      if (!dangerouslyAllowAPIKeyInBrowser) {
        throw new Error(
          `Can not provide API key in the browser without "dangerouslyAllowAPIKeyInBrowser" set to true`,
        );
      }
    }
  }

  /**
   * Tells us whether or not the WebSocket is connected
   * @returns {boolean}
   */
  isConnected() {
    return !!this.ws;
  }

  /**
   * Writes WebSocket logs to console
   * @param {...any} args
   * @returns {true}
   */
  log(...args) {
    const date = new Date().toISOString();
    const logs = [`[Websocket/${date}]`].concat(args).map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2);
      } else {
        return arg;
      }
    });

    if (this.debug) {
      console.log(...logs);
    }
    return true;
  }

  /**
   * Connects to Realtime API Websocket Server
   * @param {{model?: string}} [settings]
   * @returns {Promise<true>}
   */
  async connect({ model } = {}) {
    // Model is fully optional now - no hardcoded default
    if (!this.apiKey && this.url === this.defaultUrl) {
      console.warn(`No apiKey provided for connection to "${this.url}"`);
    }

    if (this.isConnected()) {
      throw new Error(`Already connected`);
    }

    // Check if we're in a browser environment with WebSocket support
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      /**
       * Web browser
       */
      if (typeof window !== 'undefined' && this.apiKey) {
        console.warn(
          'Warning: Connecting using API key in the browser, this is not recommended',
        );
      }

      const BrowserWebSocket = window.WebSocket;
      const wsUrl = this.url;
      
      console.log(`Connecting to WebSocket URL: ${wsUrl}`);
      
      let ws;
      
      // Check if connecting to the proxy endpoint
      if (wsUrl.includes('/realtime-proxy/') || wsUrl.includes('/realtime-voice')) {
        // For proxy connections, don't include any protocols
        console.log('Connecting to proxy endpoint without protocols');
        ws = new BrowserWebSocket(wsUrl);
      } else {
        // For direct OpenAI connections, use the protocols
        console.log('Connecting to OpenAI directly with protocols');
        ws = new BrowserWebSocket(wsUrl, [
          'realtime',
          `openai-insecure-api-key.${this.apiKey}`,
          'openai-beta.realtime-v1',
        ]);
      }

      ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        this.receive(message.type, message);
      });

      return new Promise((resolve, reject) => {
        const connectionErrorHandler = () => {
          this.disconnect(ws);
          reject(new Error(`Could not connect to "${this.url}"`));
        };

        ws.addEventListener('error', connectionErrorHandler);

        ws.addEventListener('open', () => {
          this.log(`Connected to "${this.url}"`);
          ws.removeEventListener('error', connectionErrorHandler);

          ws.addEventListener('error', () => {
            this.disconnect(ws);
            this.log(`Error, disconnected from "${this.url}"`);
            this.dispatch('close', { error: true });
          });

          ws.addEventListener('close', () => {
            this.disconnect(ws);
            this.log(`Disconnected from "${this.url}"`);
            this.dispatch('close', { error: false });
          });

          this.ws = ws;
          resolve(true);
        });
      });
    } else {
      /**
       * Node.js (this code path is unlikely to be used in a browser environment,
       * but keeping it for completeness)
       */
      try {
        const moduleName = 'ws';
        // Using dynamic import which might not work in all bundlers
        // This code path should generally not be executed in a browser
        const wsModule = await import(/* webpackIgnore: true */ moduleName);
        const NodeWebSocket = wsModule.default;

        const wsUrl = this.url;
        
        console.log(`Node.js connecting to WebSocket URL: ${wsUrl}`);
        
        let ws;
        
        // Check if connecting to the proxy endpoint
        if (wsUrl.includes('/realtime-proxy/') || wsUrl.includes('/realtime-voice')) {
          // For proxy connections, don't include any protocols or headers
          console.log('Connecting to proxy endpoint without protocols (Node.js)');
          ws = new NodeWebSocket(wsUrl);
        } else {
          // For direct OpenAI connections, use the protocols and headers
          console.log('Connecting to OpenAI directly with protocols and headers (Node.js)');
          ws = new NodeWebSocket(
            wsUrl,
            [],
            {
              finishRequest: (request) => {
                // Auth
                request.setHeader('Authorization', `Bearer ${this.apiKey}`);
                request.setHeader('OpenAI-Beta', 'realtime=v1');
                request.end();
              },
            },
          );
        }

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          this.receive(message.type, message);
        });

        return new Promise((resolve, reject) => {
          const connectionErrorHandler = () => {
            this.disconnect(ws);
            reject(new Error(`Could not connect to "${this.url}"`));
          };

          ws.on('error', connectionErrorHandler);

          ws.on('open', () => {
            this.log(`Connected to "${this.url}"`);
            ws.removeListener('error', connectionErrorHandler);

            ws.on('error', () => {
              this.disconnect(ws);
              this.log(`Error, disconnected from "${this.url}"`);
              this.dispatch('close', { error: true });
            });

            ws.on('close', () => {
              this.disconnect(ws);
              this.log(`Disconnected from "${this.url}"`);
              this.dispatch('close', { error: false });
            });

            this.ws = ws;
            resolve(true);
          });
        });
      } catch (error) {
        console.error('Error importing Node.js WebSocket module:', error);
        throw new Error('WebSocket support not available in this environment');
      }
    }
  }

  /**
   * Disconnects from Realtime API server
   * @param {WebSocket} [ws]
   * @returns {true}
   */
  disconnect(ws) {
    if (!ws || this.ws === ws) {
      this.ws && this.ws.close();
      this.ws = null;
      return true;
    }
  }

  /**
   * Receives an event from WebSocket and dispatches as "server.{eventName}" and "server.*" events
   * @param {string} eventName
   * @param {{[key: string]: any}} event
   * @returns {true}
   */
  receive(eventName, event) {
    this.log(`received:`, eventName, event);
    this.dispatch(`server.${eventName}`, event);
    this.dispatch('server.*', event);
    return true;
  }

  /**
   * Sends an event to WebSocket and dispatches as "client.{eventName}" and "client.*" events
   * @param {string} eventName
   * @param {{[key: string]: any}} event
   * @returns {true}
   */
  send(eventName, data) {
    if (!this.isConnected()) {
      throw new Error(`RealtimeAPI is not connected`);
    }

    data = data || {};
    if (typeof data !== 'object') {
      throw new Error(`data must be an object`);
    }

    const event = {
      event_id: RealtimeUtils.generateId('evt_'),
      type: eventName,
      ...data,
    };

    this.dispatch(`client.${eventName}`, event);
    this.dispatch('client.*', event);
    this.log(`sent:`, eventName, event);
    this.ws.send(JSON.stringify(event));
    return true;
  }
} 