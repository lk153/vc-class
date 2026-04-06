import { useCallback, useRef } from "react";

/**
 * Ensures only one audio/video element plays at a time.
 * Call play(element) to start playback — any other playing element is paused first.
 * Call stopAll() on question change to silence everything.
 */
export function useAudioManager() {
  const currentRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

  const play = useCallback((element: HTMLAudioElement | HTMLVideoElement) => {
    if (currentRef.current && currentRef.current !== element) {
      currentRef.current.pause();
      currentRef.current.currentTime = 0;
    }
    currentRef.current = element;
    element.play().catch(() => {});
  }, []);

  const stopAll = useCallback(() => {
    if (currentRef.current) {
      currentRef.current.pause();
      currentRef.current.currentTime = 0;
      currentRef.current = null;
    }
  }, []);

  return { play, stopAll };
}
