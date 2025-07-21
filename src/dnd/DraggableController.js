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
   * Return true when Shopify Draggable has been successfully wired.
   */
  isWired() {
    return !!this._wired;
  }

  /**
   * One-time bootstrap to wire draggable sources & drop targets.  The signature
   * mirrors what we plan to pass to `new Draggable.Draggable()` and
   * `new Draggable.Dropzone()` once the heavy lifting is implemented.
   *
   * The method is currently a no-op – it merely guards against multiple
   * invocations so subsequent tasks can extend it safely.
   */
  /**
   * Bootstrap or augment the controller with DOM roots that will later be
   * passed to the real Shopify Draggable constructors.  The method is
   * intentionally idempotent – it can be invoked by individual components in
   * any order.  Subsequent calls merge the newly supplied options with the
   * already stored ones so that the very first component does not have to
   * know every root element in advance.
   */
  init({ fieldsRoot, overlaysRoot, dropRoot } = {}) {
    // Lazily create the refs holder
    this._refs = { ...(this._refs || {}) };

    // Merge any newly provided refs so later calls can contribute additional
    // root elements without resetting the controller.
    if (fieldsRoot) this._refs.fieldsRoot = fieldsRoot;
    if (overlaysRoot) this._refs.overlaysRoot = overlaysRoot;
    if (dropRoot) this._refs.dropRoot = dropRoot;

    // We purposely postpone importing @shopify/draggable until a later task
    // because the package manipulates the real DOM API which is problematic in
    // the JSDOM environment used by Jest.  The import will be added when we
    // switch MappingPanel and SheetRenderer over to the new drag logic.

    // Mark initialisation flag once – the expensive Draggable wiring will be
    // performed only the first time.  Subsequent calls simply merge refs.
    if (!this._initialised) {
      this._initialised = true;

      // Attempt to wire Shopify Draggable in real browser contexts. We avoid
      // doing so under Jest/Node because the library touches DOM APIs that do
      // not exist in JSDOM and would therefore crash unit tests.
      if (typeof window !== 'undefined') {
        // Defer wiring to the next micro-task so all components have had a
        // chance to register their roots – this guarantees we know both
        // fieldsRoot *and* dropRoot before instantiating the library.
        Promise.resolve().then(() => {
          this._tryWireDraggable();
        });
      }
    }
  }

  /* --------------------------------------------------------------------- */
  /* Private – wire Shopify Draggable                                       */
  /* --------------------------------------------------------------------- */

  async _tryWireDraggable() {
    if (this._wired) return;

    // Ensure we have the minimum required refs.
    if (!this._refs || !this._refs.fieldsRoot || !this._refs.dropRoot) {
      return; // Not enough information yet – will try again on next init()
    }

    try {
      // Avoid build-time module resolution by using variable for the spec so
      // dev-servers will not attempt to statically resolve when the package
      // is absent (e.g. in CI or when working offline).  At runtime the
      // `import()` will still attempt to load the real library from
      // node_modules; failure is caught below and a native-DnD fallback is
      // used.
      const spec = '@shopify/draggable';
      const mod = await import(spec);
      const { Draggable, Plugins } = mod;

      if (!Draggable) return; // Defensive – unexpected build shape

      // ------------------------------------------------------------------
      // Draggable instance for schema field list (drag sources)
      // ------------------------------------------------------------------

      this._fieldDraggable = new Draggable(this._refs.fieldsRoot, {
        draggable: 'li',
        delay: 0,
        plugins: [Plugins.PointerSensor, Plugins.TouchSensor, Plugins.KeyboardSensor, Plugins.Mirror],
        mirror: {
          constrainDimensions: true
        }
      });

      // ------------------------------------------------------------------
      // Event routing – when drag stops we determine the <td> under cursor
      // and, if found, emit our high-level FIELD_DROPPED custom event so that
      // SheetRenderer updates the mapping.
      // ------------------------------------------------------------------

      this._fieldDraggable.on('drag:stop', (evt) => {
        const { source, sensorEvent } = evt;
        if (!source || !sensorEvent) return;

        // Translate sensorEvent coordinates to element under pointer.
        const clientX = sensorEvent.clientX;
        const clientY = sensorEvent.clientY;
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return;
        const td = el.closest('td[data-r][data-c]');
        if (!td || !this._refs.dropRoot.contains(td)) return;

        // Extract address.
        const row = parseInt(td.dataset.r, 10);
        const col = parseInt(td.dataset.c, 10);
        if (Number.isNaN(row) || Number.isNaN(col)) return;

        const field = source.dataset.field;
        if (!field) return;

        this._emitFieldDropped({ field, row, col });
      });

      // ------------------------------------------------------------------
      // TODO: Overlay draggable wiring will be added later.
      // ------------------------------------------------------------------

      this._wired = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Shopify Draggable unavailable – falling back to native DnD', err);
    }
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

// Expose the singleton on the global object so Cypress E2E tests can access
// it directly without having to rely on module resolution inside the browser
// bundle.  Wrapped in a feature test to avoid polluting the global namespace
// during Jest runs (Node environment does not provide `window`).
if (typeof window !== 'undefined') {
  // Non-enumerable to minimise surface area in production while still being
  // discoverable from test code.
  Object.defineProperty(window, 'DraggableController', {
    value: singleton,
    writable: false,
    configurable: false
  });
}
