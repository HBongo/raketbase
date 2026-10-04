// useLive(topics, onUpdate): run onUpdate when the server says one of these topics changed.
// Bursts of signals (e.g. several notifications at once) are combined into one call.
import { useEffect, useRef } from 'react';
import { subscribeLive } from './live';

export function useLive(topics, onUpdate, delay = 400) {
  const callback = useRef(onUpdate);
  useEffect(() => {
    callback.current = onUpdate;
  });

  const key = topics ? topics.join(',') : '*';
  useEffect(() => {
    let timer = null;
    let lastEvent = null;
    const unsubscribe = subscribeLive(key === '*' ? null : key.split(','), (event) => {
      lastEvent = event;
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(lastEvent), delay);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [key, delay]);
}
