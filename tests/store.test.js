import { store, initialState } from '../src/store.js';

describe('Store', () => {
  afterEach(() => {
    // Reset store to initial state for isolation between tests
    store.setState({ ...initialState });
  });

  test('initial state contains expected slices', () => {
    const state = store.getState();
    expect(state).toHaveProperty('workbook', null);
    expect(state).toHaveProperty('schema', null);
    expect(state).toHaveProperty('mapping');
    expect(state).toHaveProperty('errors');
    expect(state.mapping).toEqual({});
    expect(state.errors).toEqual([]);
  });

  test('set() updates a specific slice', () => {
    const mockWorkbook = { sheets: ['Sheet1'] };
    store.set('workbook', mockWorkbook);
    expect(store.getState().workbook).toBe(mockWorkbook);
  });

  test('setState() merges partial state', () => {
    store.setState({ mapping: { fieldA: [{ sheet: 'Sheet1', row: 1, col: 1 }] } });
    const state = store.getState();
    expect(state.mapping).toHaveProperty('fieldA');
  });

  test('subscribe() receives updates and can unsubscribe', () => {
    const spy = jest.fn();
    const unsubscribe = store.subscribe(spy);
    // First call immediately with initial state
    expect(spy).toHaveBeenCalledTimes(1);

    store.set('errors', ['error1']);
    expect(spy).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.set('errors', ['error1', 'error2']);
    expect(spy).toHaveBeenCalledTimes(2); // no further calls
  });
});
