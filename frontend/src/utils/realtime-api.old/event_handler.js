import { RealtimeUtils } from './utils';

/**
 * Event handling base class with on/off/once/dispatch methods
 */
export class RealtimeEventHandler {
  constructor() {
    this.listeners = {};
    this.promises = {};
  }

  /**
   * Adds an event listener
   * @param {string} eventName
   * @param {Function} listener
   * @returns {true}
   */
  on(eventName, listener) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(listener);
    return true;
  }

  /**
   * Removes an event listener
   * @param {string} eventName
   * @param {Function} listener
   * @returns {true}
   */
  off(eventName, listener) {
    if (!this.listeners[eventName]) {
      return true;
    }
    if (!listener) {
      delete this.listeners[eventName];
      return true;
    }
    const index = this.listeners[eventName].indexOf(listener);
    if (index !== -1) {
      this.listeners[eventName].splice(index, 1);
      if (this.listeners[eventName].length === 0) {
        delete this.listeners[eventName];
      }
    }
    return true;
  }

  /**
   * Adds a one-time event listener
   * @param {string} eventName
   * @param {Function} listener
   * @returns {true}
   */
  once(eventName, listener) {
    const wrappedListener = (...args) => {
      this.off(eventName, wrappedListener);
      return listener(...args);
    };
    return this.on(eventName, wrappedListener);
  }

  /**
   * Dispatches an event
   * @param {string} eventName
   * @param {...any} args
   * @returns {true}
   */
  dispatch(eventName, ...args) {
    if (this.listeners[eventName]) {
      for (const listener of [...this.listeners[eventName]]) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      }
    }

    // Resolve any promises waiting for this event
    if (this.promises[eventName]) {
      for (const [promiseId, promiseHandler] of Object.entries(
        this.promises[eventName],
      )) {
        try {
          promiseHandler.resolve(...args);
        } catch (error) {
          console.error(`Error in event promise handler for ${eventName}:`, error);
        }
        delete this.promises[eventName][promiseId];
      }
      if (Object.keys(this.promises[eventName]).length === 0) {
        delete this.promises[eventName];
      }
    }

    return true;
  }

  /**
   * Returns a promise that resolves when the event is next dispatched
   * @param {string} eventName
   * @returns {Promise<any>}
   */
  waitForNext(eventName) {
    this.promises[eventName] = this.promises[eventName] || {};
    const id = RealtimeUtils.generateId();
    const promise = RealtimeUtils.createResolvablePromise();
    this.promises[eventName][id] = promise;
    return promise;
  }

  /**
   * Clears all event listeners
   * @returns {true}
   */
  clearListeners() {
    this.listeners = {};
    return true;
  }
} 