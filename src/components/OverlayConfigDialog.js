import { store } from '../store.js';
import { getSchemaProperties } from '../utils/schemaUtils.js';

/**
 * Modal dialog to configure how a specific overlay moves when Confirm & Next
 * is pressed.  Two modes are supported:
 *   1. Constant row offset (step) – positive, zero or negative integer.
 *   2. Custom JavaScript – user-provided code that returns either:
 *        • a number (delta rows)
 *        • an object { row, col } with absolute coordinates.
 *
 * The script receives (row, col, sheet, field, index) as parameters.
 *
 * The chosen config is persisted inside mapping[field][index] as either
 * `{ step: n }` or `{ script: 'code' }` so shiftMappingDown can interpret it.
 */
export default class OverlayConfigDialog {
  constructor(field, index) {
    this.field = field;
    this.index = index;

    this._buildUi();
  }

  _buildUi() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000'
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      backgroundColor: 'white',
      padding: '1em',
      width: '340px',
      boxSizing: 'border-box'
    });

    const title = document.createElement('h3');
    // Use display name from schema (description -> title -> field)
    const schema = store.getState().schema;
    const propsForTitle = getSchemaProperties(schema) || {};
    const metaForTitle = propsForTitle[this.field] || {};
    const displayName = metaForTitle.description || metaForTitle.title || this.field;
    title.textContent = `Movement for ${displayName}`;
    dialog.appendChild(title);

    const modeWrapper = document.createElement('div');
    modeWrapper.style.marginBottom = '0.75em';

    const stepRadio = this._makeRadio('mode', 'step', 'Exact offset');
    const jumpRadio = this._makeRadio('mode', 'jump', 'Jump to next value');
    const scriptRadio = this._makeRadio('mode', 'script', 'Custom JavaScript');
    const followRadio = this._makeRadio('mode', 'follow', 'Follow another field');

    // Order: Jump to next value (top), Exact offset, Follow, Custom JavaScript
    modeWrapper.appendChild(jumpRadio.wrapper);
    modeWrapper.appendChild(stepRadio.wrapper);
    modeWrapper.appendChild(followRadio.wrapper);
    modeWrapper.appendChild(scriptRadio.wrapper);
    dialog.appendChild(modeWrapper);

    // Row & Column offset inputs
    const rowLabel = document.createElement('label');
    rowLabel.textContent = 'Row Δ:';
    rowLabel.style.display = 'block';

    const rowInput = document.createElement('input');
    rowInput.type = 'number';
    rowInput.step = '1';
    rowInput.style.width = '100%';
    rowInput.style.marginBottom = '0.5em';
    rowLabel.appendChild(rowInput);

    const colLabel = document.createElement('label');
    colLabel.textContent = 'Col Δ:';
    colLabel.style.display = 'block';

    const colInput = document.createElement('input');
    colInput.type = 'number';
    colInput.step = '1';
    colInput.style.width = '100%';
    colInput.style.marginBottom = '0.5em';
    colLabel.appendChild(colInput);

    // Follow controls
    const followFieldLabel = document.createElement('label');
    followFieldLabel.textContent = 'Follow field:';
    followFieldLabel.style.display = 'none';
    const followFieldSelect = document.createElement('select');
    followFieldSelect.style.width = '100%';
    followFieldSelect.style.marginBottom = '0.5em';
    followFieldLabel.appendChild(followFieldSelect);

    const followIndexLabel = document.createElement('label');
    followIndexLabel.textContent = 'Follow index (1-based):';
    followIndexLabel.style.display = 'none';
    const followIndexSelect = document.createElement('select');
    followIndexSelect.style.width = '100%';
    followIndexLabel.appendChild(followIndexSelect);

    // JS textarea (custom script)
    const scriptArea = document.createElement('textarea');
    scriptArea.rows = 6;
    scriptArea.style.width = '100%';
    scriptArea.style.fontFamily = 'monospace';
    scriptArea.style.display = 'none';

    dialog.appendChild(rowLabel);
    dialog.appendChild(colLabel);
    dialog.appendChild(followFieldLabel);
    dialog.appendChild(followIndexLabel);
    dialog.appendChild(scriptArea);

    // Load existing config
    const mapping = store.getState().mapping;
    const cfg = mapping?.[this.field]?.[this.index] || {};

    // Populate follow field options from mapping keys that have at least one address
    const fields = Object.keys(mapping || {}).filter((f) => (mapping[f] || []).length > 0);
    const props = getSchemaProperties(store.getState().schema) || {};
    // Default selection excludes current field to avoid obvious cycles, but allow if desired
    followFieldSelect.innerHTML = '';
    fields.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f;
      const meta = props[f] || {};
      opt.textContent = meta.description || meta.title || f;
      followFieldSelect.appendChild(opt);
    });

    const populateIndexOptions = (fieldName) => {
      followIndexSelect.innerHTML = '';
      const count = (mapping[fieldName] || []).length;
      for (let i = 0; i < count; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = String(i + 1);
        followIndexSelect.appendChild(opt);
      }
    };
    followFieldSelect.addEventListener('change', () => populateIndexOptions(followFieldSelect.value));
    if (typeof cfg.script === 'string') {
      scriptRadio.input.checked = true;
      rowLabel.style.display = 'none';
      colLabel.style.display = 'none';
      scriptArea.style.display = 'block';
      scriptArea.value = cfg.script;
    } else if (cfg.follow && cfg.follow.field) {
      followRadio.input.checked = true;
      rowLabel.style.display = 'none';
      colLabel.style.display = 'none';
      scriptArea.style.display = 'none';
      followFieldLabel.style.display = 'block';
      followIndexLabel.style.display = 'block';
      // Prefill follow selections
      const f = cfg.follow.field;
      if (fields.includes(f)) {
        followFieldSelect.value = f;
      }
      populateIndexOptions(followFieldSelect.value || fields[0]);
      const idx = Number.isFinite(cfg.follow.index) ? String(cfg.follow.index) : '0';
      followIndexSelect.value = idx;
    } else if (cfg.jumpNext) {
      jumpRadio.input.checked = true;
      rowInput.value = Number.isFinite(cfg.dy) ? cfg.dy : 1;
      colInput.value = Number.isFinite(cfg.dx) ? cfg.dx : 0;
      rowLabel.style.display = 'block';
      colLabel.style.display = 'block';
      scriptArea.style.display = 'none';
    } else {
      stepRadio.input.checked = true;
      rowInput.value = Number.isFinite(cfg.dy) ? cfg.dy : Number.isFinite(cfg.step) ? cfg.step : 1;
      colInput.value = Number.isFinite(cfg.dx) ? cfg.dx : 0;
      rowLabel.style.display = 'block';
      colLabel.style.display = 'block';
    }

    // Switch UI on radio change
    stepRadio.input.addEventListener('change', () => {
      if (stepRadio.input.checked) {
      rowLabel.style.display = 'block';
      colLabel.style.display = 'block';
      scriptArea.style.display = 'none';
      }
    });
    scriptRadio.input.addEventListener('change', () => {
      if (scriptRadio.input.checked) {
      rowLabel.style.display = 'none';
      colLabel.style.display = 'none';
        scriptArea.style.display = 'block';
        followFieldLabel.style.display = 'none';
        followIndexLabel.style.display = 'none';
      }
    });
    jumpRadio.input.addEventListener('change', () => {
      if (jumpRadio.input.checked) {
        rowLabel.style.display = 'block';
        colLabel.style.display = 'block';
        scriptArea.style.display = 'none';
        followFieldLabel.style.display = 'none';
        followIndexLabel.style.display = 'none';
      }
    });
    followRadio.input.addEventListener('change', () => {
      if (followRadio.input.checked) {
        rowLabel.style.display = 'none';
        colLabel.style.display = 'none';
        scriptArea.style.display = 'none';
        followFieldLabel.style.display = 'block';
        followIndexLabel.style.display = 'block';
        if (!followFieldSelect.value && fields.length) {
          followFieldSelect.value = fields[0];
        }
        populateIndexOptions(followFieldSelect.value);
      }
    });

    // Actions
    const actions = document.createElement('div');
    actions.style.marginTop = '1em';
    actions.style.textAlign = 'right';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () =>
      this._save(stepRadio.input.checked, jumpRadio.input.checked, followRadio.input.checked, followFieldSelect.value, followIndexSelect.value, rowInput.value, colInput.value, scriptArea.value)
    );

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginLeft = '0.5em';
    cancelBtn.addEventListener('click', () => this.destroy());

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    dialog.appendChild(actions);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.destroy();
    });

    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);
  }

  _makeRadio(name, value, labelText) {
    const wrapper = document.createElement('label');
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.marginRight = '1em';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;

    const span = document.createElement('span');
    span.textContent = labelText;
    span.style.marginLeft = '0.25em';

    wrapper.appendChild(input);
    wrapper.appendChild(span);
    return { wrapper, input };
  }

  _save(isStepMode, isJumpMode, isFollowMode, followField, followIndex, rowVal, colVal, scriptValue) {
    const state = store.getState();
    const mapping = { ...state.mapping };
    mapping[this.field] = [...(mapping[this.field] || [])];
    const base = { ...mapping[this.field][this.index] };

    if (isFollowMode) {
      base.follow = { field: String(followField || ''), index: parseInt(followIndex, 10) || 0 };
      delete base.dy;
      delete base.dx;
      delete base.step;
      delete base.script;
      delete base.jumpNext;
    } else if (isStepMode || isJumpMode) {
      const dy = parseInt(rowVal, 10);
      const dx = parseInt(colVal, 10);
      base.dy = Number.isFinite(dy) ? dy : 1;
      base.dx = Number.isFinite(dx) ? dx : 0;
      base.jumpNext = !!isJumpMode;
      delete base.step;
      delete base.script;
      delete base.follow;
    } else {
      base.script = String(scriptValue || '').trim();
      delete base.dy;
      delete base.dx;
      delete base.jumpNext;
      delete base.follow;
    }

    mapping[this.field][this.index] = base;
    store.set('mapping', mapping);
    this.destroy();
  }

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
