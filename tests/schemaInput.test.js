import SchemaInput from '../src/components/SchemaInput.js';
import { store } from '../src/store.js';

describe('SchemaInput component', () => {
  let container;
  let component;

  const validSchema = JSON.stringify({
    properties: { fieldA: { type: 'string' }, fieldB: { type: 'number' } }
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    component = new SchemaInput({ parent: container });
  });

  afterEach(() => {
    component.destroy();
    document.body.innerHTML = '';
    store.set('schema', null);
  });

  test('updates store with valid schema and renders fields', () => {
    component.textarea.value = validSchema;
    component.textarea.dispatchEvent(new Event('input', { bubbles: true }));

    const stateSchema = store.getState().schema;
    expect(stateSchema).not.toBeNull();
    expect(Object.keys(stateSchema.properties)).toContain('fieldA');

    const listItems = container.querySelectorAll('ul.schema-fields li');
    expect(listItems.length).toBe(0); // sidebar list removed
  });

  test('shows error message for invalid JSON', () => {
    component.textarea.value = '{ invalid';
    component.textarea.dispatchEvent(new Event('input', { bubbles: true }));

    expect(component.errorEl.textContent).toMatch('Invalid JSON');
    expect(store.getState().schema).toBeNull();
  });
});
