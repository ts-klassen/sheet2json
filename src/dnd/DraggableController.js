/*
 * DraggableController – centralised facade for the (eventual) Shopify Draggable
 * integration.  For now we keep the implementation lightweight so we can wire
 * it into the app incrementally while still exposing the public contract that
 * the rest of the feature tasks depend on.
 *
 * Public API (stable):
 *   import DraggableController, { FIELD_DROPPED, OVERLAY_MOVED } from '...';
 *
 *   DraggableController.init({ fieldsRoot, overlaysRoot, dropRoot });
 *   DraggableController.addEventListener(FIELD_DROPPED,  (e) => {...});
 *   DraggableController.addEventListener(OVERLAY_MOVED, (e) => {...});
 *
 * The actual Draggable library is *not* required at this early stage of the
 * migration – later tasks will progressively augment this controller with real
 * draggable/dropzone instances.  This file therefore purposefully avoids
 * importing `@shopify/draggable`, because that dependency is heavy and fails
 * to initialise under JSDOM (used by Jest).  Instead we expose the expected
 * custom events and a minimal sensor registry so that the rest of the feature
 * can compile and unit-tests can drive the controller through synthetic
 * events.
 */

export const FIELD_DROPPED = 'FIELD_DROPPED';
export const OVERLAY_MOVED = 'OVERLAY_MOVED';

// ---------------------------------------------------------------------------
// Tiny EventTarget polyfill (Node 14 doesn’t ship a DOM-compatible
// implementation).  We re-implement the subset we need so the controller works
// in Node, browser and JSDOM.
// ---------------------------------------------------------------------------
class MiniEventTarget {
  constructor() {
    this._listeners = {};
  }

  addEventListener(type, callback) {
    if (typeof callback !== 'function') return;
    (this._listeners[type] ||= []).push(callback);
  }

  removeEventListener(type, callback) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter((cb) => cb !== callback);
  }

  dispatchEvent(event) {
    const { type } = event;
    (this._listeners[type] || []).forEach((cb) => {
      try {
        cb.call(this, event);
      } catch (err) {
        /* istanbul ignore next */
        // eslint-disable-next-line no-console
        console.error('Error in event listener', err);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// DraggableController implementation
// ---------------------------------------------------------------------------

class DraggableController extends MiniEventTarget {
  constructor() {
    super();

    if (DraggableController._instance) {
      return DraggableController._instance;
    }

    // Registry of sensor constructors that will later be passed to the actual
    // Draggable library. For the moment they are simple identifiers so unit
    // tests can verify their presence.
    this.sensors = {
      PointerSensor: Symbol('PointerSensor'),
      TouchSensor: Symbol('TouchSensor'),
      KeyboardSensor: Symbol('KeyboardSensor')
    };

    DraggableController._instance = this; // eslint-disable-line no-constructor-return
  }

  /**
   * One-time bootstrap to wire draggable sources & drop targets.  The signature
   * mirrors what we plan to pass to `new Draggable.Draggable()` and
   * `new Draggable.Dropzone()` once the heavy lifting is implemented.
   *
   * The method is currently a no-op – it merely guards against multiple
   * invocations so subsequent tasks can extend it safely.
   */
  init({ fieldsRoot, overlaysRoot, dropRoot } = {}) {
    if (this._initialised) return;

    // We purposely postpone importing @shopify/draggable until a later task
    // because the package manipulates the real DOM API which is problematic in
    // the JSDOM environment used by Jest.  The import will be added when we
    // switch MappingPanel and SheetRenderer over to the new drag logic.

    this._initialised = true;
    this._refs = { fieldsRoot, overlaysRoot, dropRoot };
  }

  /* ----------------------------------------------------------------------- */
  /* Internal helpers – exposed ONLY for unit tests via a symbol getter.     */
  /* ----------------------------------------------------------------------- */

  _emitFieldDropped(detail) {
    this.dispatchEvent(new CustomEvent(FIELD_DROPPED, { detail }));
  }

  _emitOverlayMoved(detail) {
    this.dispatchEvent(new CustomEvent(OVERLAY_MOVED, { detail }));
  }

  /**
   * Synthetic event helper used by Jest tests to mimic the callbacks we will
   * eventually receive from the Draggable library.
   * @param { 'field' | 'overlay' } type
   * @param {any} detail
   */
  /* istanbul ignore next – exercised only in tests */
  __test_emit(type, detail) {
    if (type === 'field') {
      this._emitFieldDropped(detail);
    } else if (type === 'overlay') {
      this._emitOverlayMoved(detail);
    }
  }
}

// Export a singleton instance so consumers can simply `import controller`.
const singleton = new DraggableController();

export default singleton;
