import DraggableController, {
  FIELD_DROPPED,
  OVERLAY_MOVED
} from '../src/dnd/DraggableController.js';

describe('DraggableController singleton', () => {
  test('exports a singleton instance', () => {
    const ctrlA = DraggableController;
    // eslint-disable-next-line global-require
    const ctrlB = require('../src/dnd/DraggableController.js').default;
    expect(ctrlA).toBe(ctrlB);
  });

  test('initialises sensor registry', () => {
    const sensors = DraggableController.sensors;
    expect(sensors).toHaveProperty('PointerSensor');
    expect(sensors).toHaveProperty('TouchSensor');
    expect(sensors).toHaveProperty('KeyboardSensor');
  });

  test('emits FIELD_DROPPED event', () => {
    const payload = { foo: 'bar' };
    const listener = jest.fn();
    DraggableController.addEventListener(FIELD_DROPPED, listener);

    // Simulate internal callback as if Draggable fired it
    DraggableController.__test_emit('field', payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toBe(payload);

    DraggableController.removeEventListener(FIELD_DROPPED, listener);
  });

  test('emits OVERLAY_MOVED event', () => {
    const payload = { index: 2 };
    const listener = jest.fn();
    DraggableController.addEventListener(OVERLAY_MOVED, listener);

    DraggableController.__test_emit('overlay', payload);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toBe(payload);

    DraggableController.removeEventListener(OVERLAY_MOVED, listener);
  });
});
