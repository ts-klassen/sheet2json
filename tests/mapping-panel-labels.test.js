import MappingPanel from '../src/components/MappingPanel.js';
import { store } from '../src/store.js';

describe('MappingPanel labels use description left of colon', () => {
  let container;
  let panel;

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

  test('renders truncated labels for descriptions', () => {
    store.set('schema', {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'title: some more text' },
        another: { type: 'string', description: 'label:text:some::more:::text:::' },
        plain: { type: 'string', description: 'Hello' }
      }
    });

    const items = Array.from(container.querySelectorAll('li[data-field]'));
    const labels = {};
    items.forEach((li) => {
      const key = li.dataset.field;
      const textEl = li.querySelector('span:nth-of-type(2)');
      labels[key] = textEl ? textEl.textContent : '';
    });

    expect(labels.title).toBe('title');
    expect(labels.another).toBe('label');
    expect(labels.plain).toBe('Hello');
  });
});

