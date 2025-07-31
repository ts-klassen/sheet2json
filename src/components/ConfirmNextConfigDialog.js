import { store } from '../store.js';

/**
 * Modal dialog that lets the user choose what the “Confirm & Next” button does.
 * Appears when the user double-clicks the button.
 */
export default class ConfirmNextConfigDialog {
  constructor() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000' // above sticky bar
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      backgroundColor: 'white',
      padding: '1em',
      width: '320px',
      boxSizing: 'border-box'
    });

    const title = document.createElement('h2');
    title.textContent = 'Confirm & Next settings';
    dialog.appendChild(title);

    const form = document.createElement('form');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '0.5em';

    const options = [
      { value: 'shiftRow', label: 'Snapshot + shift mapping down one row' },
      { value: 'advanceField', label: 'Snapshot + focus next schema field' }
    ];

    const current = store.getState().confirmNextMode;

    options.forEach(({ value, label }) => {
      const id = `cn-mode-${value}`;
      const wrapper = document.createElement('label');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'confirm-next-mode';
      radio.id = id;
      radio.value = value;
      radio.checked = value === current;

      const span = document.createElement('span');
      span.textContent = label;
      span.style.marginLeft = '0.5em';

      wrapper.appendChild(radio);
      wrapper.appendChild(span);
      form.appendChild(wrapper);
    });

    dialog.appendChild(form);

    const actions = document.createElement('div');
    actions.style.marginTop = '1em';
    actions.style.textAlign = 'right';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const sel = form.querySelector('input[name="confirm-next-mode"]:checked');
      if (sel) {
        store.set('confirmNextMode', sel.value);
      }
      this.destroy();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginLeft = '0.5em';
    cancelBtn.addEventListener('click', () => this.destroy());

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    dialog.appendChild(actions);

    // Close on overlay click (but not when clicking inside dialog)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.destroy();
    });

    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);
  }

  destroy() {
    if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
  }
}
