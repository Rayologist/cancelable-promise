# CancelablePromise

A TypeScript implementation of cancelable promises that allows you to cancel pending promise chains and handle cleanup operations gracefully.

## Features

- Fully compatible with native Promise API
- Cancel pending promise chains
- Execute cleanup operations on cancellation
- Optional naming for better debugging
- Strongly typed with TypeScript
- Easy detection of cancelable promises

## Installation

You can either copy the code from `src/cancelable-promise.ts` into your project or clone this repository.

## Usage

### Basic Usage

```typescript
import { CancelablePromise, toCancelable } from './cancelable-promise';

// Create a cancelable promise
const promise = new CancelablePromise(fetch('https://api.example.com/data'));

// Or convert an existing promise
const cancelable = toCancelable(fetch('https://api.example.com/data'));

// Cancel the promise at any time
promise.cancel();

// Check if the promise has been canceled
console.log(promise.isCanceled); // true
```

### With Cleanup Operations

```typescript
const promise = new CancelablePromise(fetch('https://api.example.com/data'), {
  onCancel: () => {
    console.log('Cleaning up resources...');
    // Perform cleanup operations
  },
  name: 'DataFetch' // Optional name for debugging
});

// The cleanup function will be called when the promise is canceled
promise.cancel();
```

### Promise Chaining

```typescript
const promise = new CancelablePromise(fetch('https://api.example.com/data'))
  .then(response => response.json())
  .then(data => {
    // Process data
    return transformedData;
  })
  .finally(() => {
    console.log('Operation completed or canceled');
  });

// Canceling will stop the chain at the current step
promise.cancel();
```

### Type Checking

```typescript
const promise = toCancelable(fetch('https://api.example.com/data'));

if (CancelablePromise.isCancelable(promise)) {
  // TypeScript knows this is a CancelablePromise<Response>
  promise.cancel();
}
```

## API Reference

### `CancelablePromise<T>`

#### Constructor

```typescript
new CancelablePromise<T>(promise: Promise<T>, options?: CancelablePromiseOptions)
```

#### Options

```typescript
interface CancelablePromiseOptions {
  onCancel?: () => void;  // Cleanup function called on cancellation
  name?: string;          // Optional name for debugging
}
```

#### Methods

- `cancel(): void` - Cancels the promise and executes cleanup operations
- `then<TResult1, TResult2>()` - Same as Promise.then
- `catch<TResult>()` - Same as Promise.catch
- `finally()` - Same as Promise.finally

#### Properties

- `name: string | undefined` - Get the promise name
- `isCanceled: boolean` - Check if the promise has been canceled

### Helper Functions

#### `toCancelable<T>`

```typescript
function toCancelable<T>(
  promise: Promise<T>, 
  options?: CancelablePromiseOptions
): CancelablePromise<T>
```

Converts a regular Promise into a CancelablePromise.

#### `CancelablePromise.isCancelable`

```typescript
static isCancelable<T>(other: any): other is CancelablePromise<T>
```

Type guard function that not only checks if a value is a CancelablePromise, but also provides type narrowing in TypeScript. When this returns true, TypeScript will know that the checked value is a `CancelablePromise<T>`.

## Contact

If you have any questions, please feel free to file issues or contact the maintainer at `bwchen.dev@gmail.com`.
