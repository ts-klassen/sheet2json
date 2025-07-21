import MappingPanel from '../src/components/MappingPanel.js';
import { store } from '../src/store.js';

describe('MappingPanel – Draggable sources', () => {
  let container;
  let panel;

  const schema = {
    properties: {
      name: { type: 'string' },
      title: { type: 'string' }
    }
  };

  beforeEach(() => {
    // Fresh DOM container for each test
    container = document.createElement('div');
    document.body.appendChild(container);
    panel = new MappingPanel({ parent: container });
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = '';
    store.set('schema', null);
  });

  test('renders list items for each schema field', () => {
    store.set('schema', schema);
    const items = container.querySelectorAll('li[data-field]');
    expect(items.length).toBe(2);

    // Items should provide draggable attribute so native DnD works until
    // Shopify Draggable is integrated.
    items.forEach((item) => expect(item.draggable).toBe(true));
  });

  test('applies focus style to currentFieldIndex', () => {
    // Inject the index before setting schema so render picks it up
    store.setState({ currentFieldIndex: 1 });
    store.set('schema', schema);
    const items = [...container.querySelectorAll('li[data-field]')];
    expect(items[1].style.outline).toContain('solid blue');
  });
});
