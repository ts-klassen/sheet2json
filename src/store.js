// Simple observable store implementation adhering to project design.
// The store is a singleton so components can import and share state.

const initialState = {
  workbook: null, // Parsed workbook data
  schema: null, // Parsed JSON schema
  mapping: {}, // Field name -> CellAddress[]
  // Tracks which schema field is currently being mapped in the "Next" workflow
  currentFieldIndex: 0,
  errors: [], // Array of error objects / strings
  records: [] // Array of mapping snapshots (for multi-record sheets)
};

/**
 * Deep-freeze utility in development to avoid accidental mutations.
 * (No-op in production for performance.)
 */
function deepFreeze(obj) {
  // Determine production mode in a way that works both in Node (tests, build)
  // and in the browser where the `process` global might be undefined.
  const isProd =
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'production';

  if (isProd || obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    if (obj[prop] && typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

class Store {
  constructor() {
    this._state = { ...initialState };
    this._listeners = new Set();
  }

  /**
   * Returns the current state object (frozen in non-production environments).
   */
  getState() {
    // Return a shallow copy to discourage direct mutation.
    return deepFreeze({ ...this._state });
  }

  /**
   * Merge the provided partial state into the current state and notify listeners.
   * @param {Object} partial
   */
  setState(partial) {
    if (partial == null || typeof partial !== 'object') {
      throw new TypeError('partial state must be an object');
    }
    const prevState = this._state;
    this._state = { ...this._state, ...partial };
    this._notifyListeners(this._state, prevState);
  }

  /**
   * Mutate a specific slice by key.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (!(key in this._state)) {
      throw new Error(`Unknown state key: ${key}`);
    }
    this.setState({ [key]: value });
  }

  /**
   * Register a listener that will be called with (newState, prevState).
   * Returns an unsubscribe function.
   * @param {(newState: object, prevState: object) => void} listener
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }
    this._listeners.add(listener);
    // Immediately call the listener with current state for convenience
    listener(this.getState(), null);

    return () => {
      this._listeners.delete(listener);
    };
  }

  _notifyListeners(newState, prevState) {
    this._listeners.forEach((listener) => {
      try {
        listener(newState, prevState);
      } catch (err) {
        // Catch errors so one bad listener doesn't break the loop
        // eslint-disable-next-line no-console
        console.error('Error in store listener:', err);
      }
    });
  }
}

// Export a singleton instance
export const store = new Store();

// For tests, export initialState for resetting if needed.
export { initialState };
