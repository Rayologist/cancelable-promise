interface CancelableState {
  onCancelList: (() => void)[];
  isCanceled: boolean;
}

export type MaybeCancelablePromise<T> = Promise<T> | CancelablePromise<T>;

class CancelablePromiseInternal<T> implements Promise<T> {
  #state: CancelableState;
  #promise: Promise<T>;
  #name?: string;

  constructor(promise: Promise<T>, state: CancelableState, name?: string) {
    this.#state = state;
    this.#name = name;
    this.#promise = promise;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((
          value: T,
        ) => TResult1 | PromiseLike<TResult1> | CancelablePromise<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((
          reason: any,
        ) => TResult2 | PromiseLike<TResult2> | CancelablePromise<TResult2>)
      | null
      | undefined,
  ): CancelablePromise<TResult1 | TResult2> {
    return new CancelablePromiseInternal<TResult1 | TResult2>(
      this.#promise.then(
        this.handleCancelState(onfulfilled, this.#state),
        this.handleCancelState(onrejected, this.#state),
      ),
      this.#state,
    );
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult> | CancelablePromise<T>)
      | null
      | undefined,
  ): CancelablePromise<T | TResult> {
    return new CancelablePromiseInternal<T | TResult>(
      this.#promise.catch(this.handleCancelState(onrejected, this.#state)),
      this.#state,
    );
  }

  finally(onfinally?: (() => void) | null | undefined): CancelablePromise<T> {
    let finalCallback: typeof onfinally = null;
    if (onfinally) {
      this.#state.onCancelList.push(onfinally);
      finalCallback = () => {
        this.#state.onCancelList = [];
        return onfinally();
      };
    }
    return new CancelablePromiseInternal(
      this.#promise.finally(this.handleCancelState(finalCallback, this.#state)),
      this.#state,
    );
  }

  cancel() {
    this.#state.isCanceled = true;

    try {
      this.#state.onCancelList.forEach((callback) => {
        callback();
      });
    } finally {
      this.#state.onCancelList = [];
    }
  }

  get name() {
    return this.#name;
  }

  get isCanceled() {
    return this.#state.isCanceled;
  }

  get [Symbol.toStringTag]() {
    return 'CancelablePromise';
  }

  private handleCancelState(
    onResult: ((...args: any[]) => any) | null | undefined,
    state: CancelableState,
  ) {
    if (!onResult) {
      return null;
    }

    return function (args?: any) {
      if (state.isCanceled) {
        return args;
      }

      return onResult(args);
    };
  }
}

export type CancelablePromiseOptions = {
  onCancel?: () => void;
  name?: string;
};

export class CancelablePromise<T> extends CancelablePromiseInternal<T> {
  constructor(promise: Promise<T>, options?: CancelablePromiseOptions) {
    const onCancelList: (() => void)[] = [];

    if (options?.onCancel) {
      onCancelList.push(options.onCancel);
    }

    super(
      promise,
      {
        onCancelList,
        isCanceled: false,
      },
      options?.name,
    );
  }

  static isCancelable<T>(other: any): other is CancelablePromise<T> {
    return other instanceof CancelablePromise;
  }
}

export function toCancelable<T>(
  promise: Promise<T>,
  options?: CancelablePromiseOptions,
) {
  return new CancelablePromise<T>(promise, options);
}
