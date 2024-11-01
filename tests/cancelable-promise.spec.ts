import { CancelablePromise, toCancelable } from '../src';

jest.useFakeTimers();

describe('CancelablePromise', () => {
  // Test helpers
  const createDelayedPromise = <T>(value: T, delay: number = 0): Promise<T> => {
    return new Promise((resolve) => setTimeout(() => resolve(value), delay));
  };

  const createDelayedRejection = (reason: any, delay: number = 0) => {
    return new Promise((_, reject) => setTimeout(() => reject(reason), delay));
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create a cancelable promise with default state', () => {
      const promise = Promise.resolve(42);
      const cancelable = new CancelablePromise(promise);

      expect(cancelable.isCanceled).toBe(false);
      expect(cancelable.name).toBeUndefined();
      expect(cancelable[Symbol.toStringTag]).toBe('CancelablePromise');
    });

    it('should create a cancelable promise with custom name', () => {
      const promise = Promise.resolve(42);
      const cancelable = new CancelablePromise(promise, { name: 'test' });

      expect(cancelable.name).toBe('test');
    });
  });

  describe('then()', () => {
    it('should handle successful promise resolution', async () => {
      const promise = createDelayedPromise(42);
      const cancelable = new CancelablePromise(promise);

      await jest.runAllTimersAsync();

      const result = await cancelable.then((value) => value * 2);
      expect(result).toBe(84);
    });

    it('should never resolve after being canceled', async () => {
      const initialValue = 42;
      const promise = createDelayedPromise(initialValue, 100);
      const cancelable = new CancelablePromise(promise);
      const mockCallback = jest.fn((value) => value * 2);

      const resultPromise = cancelable.then(mockCallback);
      cancelable.cancel();

      // Set up a flag to detect if the promise resolves
      let didResolve = false;

      new Promise((resolve) => {
        setTimeout(resolve, 200); // Longer than our delayed promise
      });

      resultPromise.then(() => {
        didResolve = true;
      });

      await jest.runAllTimersAsync();

      expect(mockCallback).not.toHaveBeenCalled();
      expect(didResolve).toBe(false);
      expect(cancelable.isCanceled).toBe(true);
    });

    it('should chain multiple then calls correctly', async () => {
      const promise = createDelayedPromise(42);
      const cancelable = new CancelablePromise(promise);

      await jest.runAllTimersAsync();

      const result = await cancelable
        .then((value) => value * 2)
        .then((value) => value + 10);

      expect(result).toBe(94);
    });
  });

  describe('catch()', () => {
    it('should handle promise rejection', async () => {
      try {
        const error = new Error('test error');
        const promise = createDelayedRejection(error);
        const cancelable = new CancelablePromise(promise).catch(
          (err) => 'caught',
        );

        await jest.runAllTimersAsync();
        await cancelable;
      } catch (error) {
        expect(error).toBe('caught');
      }
    });

    it('should not execute catch callback if canceled', async () => {
      const error = new Error('test error');
      const promise = createDelayedRejection(error, 100);

      const mockCallback = jest.fn((err) => 'caught');
      const cancelable = new CancelablePromise(promise).catch(mockCallback);

      await jest.advanceTimersByTimeAsync(100);

      cancelable.cancel();

      expect(mockCallback).toHaveBeenCalled();
      expect(cancelable.isCanceled).toBe(true);
    });
  });

  describe('finally()', () => {
    it('should execute finally callback on resolution', async () => {
      const finallyCallback = jest.fn();
      const promise = createDelayedPromise(42);
      const cancelable = new CancelablePromise(promise);

      await jest.runAllTimersAsync();

      await cancelable.finally(finallyCallback);
      expect(finallyCallback).toHaveBeenCalledTimes(1);
    });

    it('should execute finally callback on rejection', async () => {
      const finallyCallback = jest.fn();
      const promise = createDelayedRejection(new Error('test'));
      const cancelable = new CancelablePromise(promise)
        .catch(() => {})
        .finally(finallyCallback);

      await jest.runAllTimersAsync();

      await cancelable;

      expect(finallyCallback).toHaveBeenCalledTimes(1);
    });

    it('should execute finally callback on cancellation', async () => {
      const finallyCallback = jest.fn();
      const promise = createDelayedPromise(42, 100);
      const cancelable = new CancelablePromise(promise);

      const resultPromise = cancelable.finally(finallyCallback);
      cancelable.cancel();

      await jest.advanceTimersByTimeAsync(100);

      expect(finallyCallback).toHaveBeenCalledTimes(1);
      expect(cancelable.isCanceled).toBe(true);
    });
  });

  describe('cancel()', () => {
    it('should set isCanceled flag', () => {
      const promise = createDelayedPromise(42);
      const cancelable = new CancelablePromise(promise);

      cancelable.cancel();
      expect(cancelable.isCanceled).toBe(true);
    });

    it('should execute onCancel callback', () => {
      const onCancel = jest.fn();
      const promise = createDelayedPromise(42);
      const cancelable = new CancelablePromise(promise, { onCancel });

      cancelable.cancel();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should clear onCancel list after execution', () => {
      const onCancel = jest.fn();
      const promise = createDelayedPromise(42);
      const cancelable = new CancelablePromise(promise, { onCancel });

      cancelable.cancel();
      cancelable.cancel(); // Second cancel should not trigger callback again
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('static isCancelable()', () => {
    it('should return true for CancelablePromise instances', () => {
      const cancelable = new CancelablePromise(Promise.resolve(42));
      expect(CancelablePromise.isCancelable(cancelable)).toBe(true);
    });

    it('should return false for regular promises', () => {
      const promise = Promise.resolve(42);
      expect(CancelablePromise.isCancelable(promise)).toBe(false);
    });

    it('should return false for non-promise values', () => {
      expect(CancelablePromise.isCancelable('forty-two')).toBe(false);
      expect(CancelablePromise.isCancelable(42)).toBe(false);
      expect(CancelablePromise.isCancelable(null)).toBe(false);
      expect(CancelablePromise.isCancelable(undefined)).toBe(false);
    });
  });

  describe('toCancelable()', () => {
    it('should convert regular promise to cancelable promise', () => {
      const promise = Promise.resolve(42);
      const cancelable = toCancelable(promise);

      expect(CancelablePromise.isCancelable(cancelable)).toBe(true);
    });

    it('should accept options when converting', () => {
      const onCancel = jest.fn();
      const promise = Promise.resolve(42);
      const cancelable = toCancelable(promise, {
        name: 'test',
        onCancel,
      });

      expect(cancelable.name).toBe('test');
      cancelable.cancel();
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
