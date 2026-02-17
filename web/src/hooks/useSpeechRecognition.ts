import { useState, useRef, useCallback, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const CHUNK_INTERVAL_MS = 2500;    // send audio to Whisper every 2.5s
const SILENCE_TIMEOUT_MS = 3000;   // auto-stop after 3s of silence
const SILENCE_THRESHOLD = 0.01;
const LEVEL_CHECK_MS = 200;

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  isTranscribing: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

async function transcribeBlob(blob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const res = await fetch(`${BASE_URL}/api/tts/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch {
    return null;
  }
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSoundRef = useRef(Date.now());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stoppingRef = useRef(false);
  const pendingTranscriptions = useRef(0);
  const segmentsRef = useRef<string[]>([]);

  const isSupported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    chunkTimerRef.current = null;
    silenceTimerRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }

  // Harvest current chunks into a blob and send to Whisper
  const harvestAndTranscribe = useCallback((isFinal: boolean) => {
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    // Keep chunks for the full recording (Whisper needs the WebM header from chunk 0)
    // But we only transcribe the full accumulated audio each time
    const segmentIndex = segmentsRef.current.length;

    pendingTranscriptions.current++;
    setIsTranscribing(true);

    transcribeBlob(blob).then(text => {
      pendingTranscriptions.current--;
      if (text) {
        // Replace entire transcript with latest full transcription
        // Since we're sending all accumulated audio each time, the latest result is the most complete
        setTranscript(text);
        // Track segment for final
        if (segmentIndex >= segmentsRef.current.length) {
          segmentsRef.current.push(text);
        } else {
          segmentsRef.current[segmentIndex] = text;
        }
      }
      if (pendingTranscriptions.current <= 0) {
        pendingTranscriptions.current = 0;
        setIsTranscribing(false);
      }
    });
  }, []);

  const stop = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    // Clear timers
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    chunkTimerRef.current = null;
    silenceTimerRef.current = null;

    // Stop recorder - this triggers ondataavailable for remaining data
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    // Clean up audio analysis
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    // Stop mic
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setIsListening(false);

    // Do a final transcription with all data
    // Small delay to let the final ondataavailable fire
    setTimeout(() => {
      harvestAndTranscribe(true);
      stoppingRef.current = false;
    }, 100);
  }, [harvestAndTranscribe]);

  const start = useCallback(async () => {
    if (!isSupported) return;
    stoppingRef.current = false;
    segmentsRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Audio analysis for silence detection
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      lastSoundRef.current = Date.now();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorderRef.current = recorder;
      // Use timeslice to get data frequently
      recorder.start(500);
      setIsListening(true);

      // Periodically send accumulated audio to Whisper for live transcription
      chunkTimerRef.current = setInterval(() => {
        if (chunksRef.current.length > 0 && !stoppingRef.current) {
          harvestAndTranscribe(false);
        }
      }, CHUNK_INTERVAL_MS);

      // Silence detection
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      silenceTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;

        if (avg > SILENCE_THRESHOLD) {
          lastSoundRef.current = Date.now();
        } else if (Date.now() - lastSoundRef.current > SILENCE_TIMEOUT_MS) {
          stop();
        }
      }, LEVEL_CHECK_MS);
    } catch (err) {
      console.warn('Mic access denied or failed:', err);
      setIsListening(false);
    }
  }, [isSupported, harvestAndTranscribe, stop]);

  const reset = useCallback(() => {
    cleanup();
    setIsListening(false);
    setTranscript('');
    setIsTranscribing(false);
    segmentsRef.current = [];
    chunksRef.current = [];
    pendingTranscriptions.current = 0;
    stoppingRef.current = false;
  }, []);

  return { isSupported, isListening, transcript, isTranscribing, start, stop, reset };
}
