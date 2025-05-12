/**
 * Utility methods for the Realtime API
 */
export class RealtimeUtils {
  /**
   * Generates a random ID with a specified prefix
   * @param {string} prefix
   * @returns {string}
   */
  static generateId(prefix = 'id_') {
    return `${prefix}${Math.random().toString(36).substring(2, 12)}`;
  }

  /**
   * Creates a new promise with methods to resolve/reject it externally
   * @returns {Promise & {resolve: Function, reject: Function}}
   */
  static createResolvablePromise() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    promise.resolve = resolve;
    promise.reject = reject;
    return promise;
  }
} 