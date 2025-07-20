import MappingPanel from '../src/components/MappingPanel.js';
import { store } from '../src/store.js';

// JSDOM lacks DataTransfer; polyfill minimal subset for drag events.
class MockDataTransfer {
  constructor() {
    this.data = {};
  }
  setData(type, val) {
    this.data[type] = val;
  }
  getData(type) {
    return this.data[type];
  }
}

describe('MappingPanel drag source', () => {
  let container;
  let panel;

  const schema = {
    properties: {
      name: { type: 'string' },
      title: { type: 'string' }
    }
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    panel = new MappingPanel({ parent: container });
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = '';
    store.set('schema', null);
  });

  test('renders draggable list items for each schema field', () => {
    store.set('schema', schema);
    const items = container.querySelectorAll('li[data-field]');
    expect(items.length).toBe(2);
    items.forEach((item) => expect(item.draggable).toBe(true));
  });

  test('dragstart sets field name in dataTransfer', () => {
    store.set('schema', schema);
    const item = container.querySelector('li[data-field="name"]');
    const evt = new Event('dragstart', { bubbles: true, cancelable: true });
    evt.dataTransfer = new MockDataTransfer();
    item.dispatchEvent(evt);
    expect(evt.dataTransfer.getData('text/plain')).toBe('name');
  });
});
