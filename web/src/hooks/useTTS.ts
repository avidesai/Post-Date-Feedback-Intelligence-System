import { useState, useRef, useCallback, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface UseTTSReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!enabled) return;

    // Stop any current playback
    stop();

    try {
      const res = await fetch(`${BASE_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        // TTS unavailable, silently skip
        console.warn('TTS unavailable:', res.status);
        return;
      }

      const blob = await res.blob();

      // Revoke previous blob URL
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
          setIsSpeaking(false);
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        audio.play().catch(() => {
          // Autoplay blocked - silently skip
          setIsSpeaking(false);
          resolve();
        });
      });
    } catch {
      // Network error - silently skip
      setIsSpeaking(false);
    }
  }, [enabled, stop]);

  return { isSpeaking, speak, stop, enabled, setEnabled };
}
