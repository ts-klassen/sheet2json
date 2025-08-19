/**
 * Very simple modal dialog to show exported JSON and provide download link.
 */
export default class ExportDialog {
  constructor(jsonObj) {
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.right = '0';
    this.overlay.style.bottom = '0';
    this.overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    this.overlay.style.display = 'flex';
    this.overlay.style.alignItems = 'center';
    this.overlay.style.justifyContent = 'center';
    // Ensure the modal sits above sticky control bar (z-index 100)
    this.overlay.style.zIndex = '1000';

    const dialog = document.createElement('div');
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '1em';
    dialog.style.maxWidth = '80%';
    dialog.style.maxHeight = '80%';
    dialog.style.overflow = 'auto';

    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(jsonObj, null, 2);

    const download = document.createElement('a');
    try {
      import('../i18n/index.js').then(({ t, onChange }) => {
        const apply = () => {
          download.textContent = t('export.download');
          download.download = t('export.filename');
        };
        apply();
        this._i18nUnsub = onChange(apply);
      });
    } catch (_) {
      download.textContent = 'Download JSON';
      download.download = 'export.json';
    }
    download.style.display = 'inline-block';
    download.style.marginTop = '1em';
    // href set below; filename set by i18n above
    const blob = new Blob([JSON.stringify(jsonObj, null, 2)], { type: 'application/json' });
    download.href = URL.createObjectURL(blob);

    const close = document.createElement('button');
    try {
      import('../i18n/index.js').then(({ t, onChange }) => {
        const apply = () => { close.textContent = t('export.close'); };
        apply();
        this._i18nUnsub2 = onChange(apply);
      });
    } catch (_) {
      close.textContent = 'Close';
    }
    close.style.marginLeft = '1em';
    close.addEventListener('click', () => this.destroy());

    dialog.appendChild(pre);
    dialog.appendChild(download);
    dialog.appendChild(close);
    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);
  }

  destroy() {
    if (this._i18nUnsub) try { this._i18nUnsub(); } catch (_) {}
    if (this._i18nUnsub2) try { this._i18nUnsub2(); } catch (_) {}
    if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
  }
}
