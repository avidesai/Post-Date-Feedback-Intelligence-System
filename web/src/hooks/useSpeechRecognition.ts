import { useState, useRef, useCallback, useEffect } from 'react';

// Browser speech recognition with vendor prefix
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const isSupported = !!SpeechRecognitionAPI;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    // Stop any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are expected, not real errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setTranscript('');
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
  }, [stop]);

  return { isSupported, isListening, transcript, start, stop, reset };
}
