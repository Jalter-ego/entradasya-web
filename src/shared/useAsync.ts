import { useCallback, useEffect, useState } from 'react';

type State<T> =
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error };

/**
 * Carga datos al montar y cuando cambian las dependencias. Cancela la petición anterior.
 * reload() vuelve a pedir; setData() actualiza localmente tras una mutación.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ status: 'loading', data: prev.data }));
    fn(controller.signal).then(
      (data) => !controller.signal.aborted && setState({ status: 'success', data }),
      (error: Error) => {
        if (!controller.signal.aborted && error.name !== 'AbortError') setState({ status: 'error', error });
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((data: T) => setState({ status: 'success', data }), []);

  return { ...state, reload, setData };
}
