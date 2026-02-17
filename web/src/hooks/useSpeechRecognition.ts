import { useState, useRef, useCallback, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const SILENCE_TIMEOUT_MS = 3000;
const SILENCE_THRESHOLD = 0.01;
const CHECK_INTERVAL_MS = 200;

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  isTranscribing: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSoundTimeRef = useRef(Date.now());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const isSupported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const cleanupSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const transcribeAudio = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch(`${BASE_URL}/api/tts/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.warn('Transcription failed:', res.status);
        return;
      }

      const data = await res.json();
      if (data.text) {
        setTranscript(prev => prev ? prev + ' ' + data.text : data.text);
      }
    } catch (err) {
      console.warn('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const stop = useCallback(() => {
    cleanupSilenceDetection();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, [cleanupSilenceDetection]);

  const start = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up audio analysis for silence detection
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      lastSoundTimeRef.current = Date.now();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }

        if (blob.size > 0) {
          transcribeAudio(blob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);

      // Monitor audio levels for silence detection
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      silenceTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;

        if (avg > SILENCE_THRESHOLD) {
          lastSoundTimeRef.current = Date.now();
        } else if (Date.now() - lastSoundTimeRef.current > SILENCE_TIMEOUT_MS) {
          // Silence for too long, auto-stop
          stop();
        }
      }, CHECK_INTERVAL_MS);
    } catch (err) {
      console.warn('Mic access denied or failed:', err);
      setIsListening(false);
    }
  }, [isSupported, transcribeAudio, stop]);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
    setIsTranscribing(false);
  }, [stop]);

  return { isSupported, isListening, transcript, isTranscribing, start, stop, reset };
}
