import { useCallback, useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'error';

// Encapsulates the copy-to-clipboard state machine.
// `trigger` is a stable reference — safe to pass as onClick without causing rerenders.
export function useCopyAction(handler: () => Promise<void>): [CopyState, () => void] {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Keep the handler ref current so `trigger` never captures a stale closure.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const trigger = useCallback(() => {
    clearTimeout(timerRef.current);
    handlerRef.current().then(
      () => {
        setState('copied');
        timerRef.current = setTimeout(() => setState('idle'), 1800);
      },
      () => {
        setState('error');
        timerRef.current = setTimeout(() => setState('idle'), 1800);
      },
    );
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return [state, trigger];
}
