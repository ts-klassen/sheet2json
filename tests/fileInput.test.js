import FileInput from '../src/components/FileInput.js';

describe('FileInput component', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders an input element with correct attributes', () => {
    const fi = new FileInput({ parent: container });
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input.accept).toBe('.xlsx,.xlsm,.xlsb,.xls,.ods,.csv');
    fi.destroy();
  });

  test('invokes callback on file selection', () => {
    const mockCallback = jest.fn();
    const fi = new FileInput({ parent: container, onFileSelected: mockCallback });

    // Simulate change event with mock FileList
    const fakeEvent = {
      target: {
        files: [
          { name: 'book.xlsx', size: 123, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        ]
      }
    };

    fi._handleChange(fakeEvent);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(expect.any(Array));
    expect(mockCallback.mock.calls[0][0][0].name).toBe('book.xlsx');

    fi.destroy();
  });
});
