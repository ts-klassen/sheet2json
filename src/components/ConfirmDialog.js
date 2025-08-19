/**
 * Lightweight promise-based confirm dialog.
 * Usage: const ok = await confirmDialog({ title, message, confirmText, cancelText })
 */
export default function confirmDialog({
  title = 'Confirm',
  message = '',
  items = null, // optional array of strings to show as a list
  note = '',    // optional small footer message
  confirmText = 'Continue',
  cancelText = 'Cancel'
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.style.background = '#fff';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    dialog.style.padding = '16px';
    dialog.style.maxWidth = '520px';
    dialog.style.width = '90%';
    dialog.style.fontFamily = 'system-ui, sans-serif';

    const h = document.createElement('h3');
    h.textContent = title;
    h.style.margin = '0 0 8px 0';
    h.style.fontSize = '18px';
    dialog.appendChild(h);

    if (message) {
      const p = document.createElement('p');
      p.textContent = message;
      p.style.margin = '0 0 8px 0';
      p.style.whiteSpace = 'pre-wrap';
      dialog.appendChild(p);
    }

    if (Array.isArray(items) && items.length) {
      const ul = document.createElement('ul');
      ul.style.margin = '0 0 8px 1em';
      ul.style.padding = '0';
      items.forEach((it) => {
        const li = document.createElement('li');
        li.style.margin = '0 0 4px 0';
        const code = document.createElement('code');
        code.textContent = String(it);
        code.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
        li.appendChild(code);
        ul.appendChild(li);
      });
      dialog.appendChild(ul);
    }

    if (note) {
      const p2 = document.createElement('p');
      p2.textContent = note;
      p2.style.margin = '0 0 12px 0';
      p2.style.whiteSpace = 'pre-wrap';
      dialog.appendChild(p2);
    }

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    actions.style.gap = '8px';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = cancelText;
    cancel.style.padding = '8px 12px';
    cancel.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = confirmText;
    ok.style.padding = '8px 12px';
    ok.style.background = '#2563eb';
    ok.style.color = '#fff';
    ok.style.border = 'none';
    ok.style.borderRadius = '4px';
    ok.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    actions.appendChild(cancel);
    actions.appendChild(ok);

    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function onKey(ev) {
      if (ev.key === 'Escape') {
        cleanup();
        resolve(false);
      }
    }
    document.addEventListener('keydown', onKey);

    function cleanup() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  });
}
