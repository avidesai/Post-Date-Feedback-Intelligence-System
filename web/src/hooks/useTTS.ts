import { useState, useRef, useCallback, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface UseTTSReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  prefetch: (text: string) => void;
  stop: () => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, Blob>>(new Map());
  const pendingRef = useRef<Map<string, Promise<Blob | null>>>(new Map());
  // Generation counter: incremented on every speak/stop call.
  // Any in-flight speak whose id doesn't match is stale and must not play.
  const speakIdRef = useRef(0);

  useEffect(() => {
    return () => {
      speakIdRef.current++;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const fetchAudio = useCallback(async (text: string): Promise<Blob | null> => {
    const cached = cacheRef.current.get(text);
    if (cached) return cached;

    const pending = pendingRef.current.get(text);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        cacheRef.current.set(text, blob);
        return blob;
      } catch {
        return null;
      } finally {
        pendingRef.current.delete(text);
      }
    })();

    pendingRef.current.set(text, promise);
    return promise;
  }, []);

  const stop = useCallback(() => {
    speakIdRef.current++; // invalidate any in-flight speak calls
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const prefetch = useCallback((text: string) => {
    if (!enabled) return;
    fetchAudio(text);
  }, [enabled, fetchAudio]);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!enabled) return;

    // Claim a unique id and kill anything currently playing
    const id = ++speakIdRef.current;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);

    const blob = await fetchAudio(text);

    // After the async gap: if stop() or another speak() ran, our id is stale
    if (speakIdRef.current !== id) return;
    if (!blob) return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    setIsSpeaking(true);

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        if (speakIdRef.current === id) setIsSpeaking(false);
        resolve();
      };
      audio.onerror = () => {
        if (speakIdRef.current === id) setIsSpeaking(false);
        resolve();
      };
      audio.play().catch(() => {
        if (speakIdRef.current === id) setIsSpeaking(false);
        resolve();
      });
    });
  }, [enabled, fetchAudio]);

  return { isSpeaking, speak, prefetch, stop, enabled, setEnabled };
}
