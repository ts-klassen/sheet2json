import { store } from '../store.js';

export default class ErrorBanner {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;
    this.banner = document.createElement('div');
    this.banner.style.position = 'fixed';
    this.banner.style.bottom = '0';
    this.banner.style.left = '0';
    this.banner.style.right = '0';
    this.banner.style.backgroundColor = '#ffcccc';
    this.banner.style.padding = '0.5em';
    this.banner.style.display = 'none';

    this.parent.appendChild(this.banner);

    this._onStoreChange = this._onStoreChange.bind(this);
    this.unsubscribe = store.subscribe(this._onStoreChange);
  }

  _onStoreChange(newState) {
    const errs = newState.errors || [];
    if (errs.length === 0) {
      this.banner.style.display = 'none';
      return;
    }
    this.banner.innerHTML = '';
    errs.forEach((err) => {
      const span = document.createElement('span');
      span.textContent = err;
      span.style.marginRight = '1em';
      this.banner.appendChild(span);
    });
    this.banner.style.display = '';
  }

  destroy() {
    this.unsubscribe && this.unsubscribe();
    if (this.banner.parentNode) this.banner.parentNode.removeChild(this.banner);
  }
}
