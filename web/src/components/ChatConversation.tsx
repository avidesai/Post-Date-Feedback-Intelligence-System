import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTTS } from '../hooks/useTTS';
import VoiceOrb from './VoiceOrb';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

interface Props {
  questions: string[];
  onComplete: (transcript: { question: string; answer: string }[]) => void;
  processing?: boolean;
  processingText?: string;
}

export default function ChatConversation({ questions, onComplete, processing, processingText }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const transcriptRef = useRef<{ question: string; answer: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userIsTyping = useRef(false);

  const speech = useSpeechRecognition();
  const tts = useTTS();
  const didInitRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Init effect: show first question and speak it. Must only run ONCE per mount.
  // The guard ref prevents re-firing if the questions array reference changes
  // due to parent re-renders (e.g. submitting state changes).
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    tts.prefetch(questions[0]);
    setTyping(true);
    const t = setTimeout(() => {
      setMessages([{ role: 'ai', text: questions[0] }]);
      setTyping(false);
      speakQuestion(questions[0]);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, speech.transcript, speech.isListening, speech.isTranscribing, scrollToBottom]);

  useEffect(() => {
    if (!aiSpeaking && !typing && !done && !speech.isListening && !speech.isTranscribing && !userIsTyping.current) {
      const t = setTimeout(() => {
        if (!userIsTyping.current) {
          speech.start();
        }
      }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSpeaking, typing, done]);

  useEffect(() => {
    if (speech.transcript) {
      setInput(speech.transcript);
    }
  }, [speech.transcript]);

  const pendingAutoSend = useRef(false);
  useEffect(() => {
    if (!speech.isListening && speech.isTranscribing) {
      pendingAutoSend.current = true;
    }
    if (pendingAutoSend.current && !speech.isListening && !speech.isTranscribing && speech.transcript) {
      pendingAutoSend.current = false;
      setTimeout(() => {
        const sendBtn = document.querySelector('.chat-send') as HTMLButtonElement;
        if (sendBtn && !sendBtn.disabled) sendBtn.click();
      }, 100);
    }
  }, [speech.isListening, speech.isTranscribing, speech.transcript]);

  const speakQuestion = async (text: string) => {
    setAiSpeaking(true);
    await tts.speak(text);
    setAiSpeaking(false);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || typing || done) return;

    if (aiSpeaking) {
      tts.stop();
      setAiSpeaking(false);
    }

    if (speech.isListening) {
      speech.stop();
    }

    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    speech.reset();
    pendingAutoSend.current = false;

    transcriptRef.current.push({
      question: questions[currentQ],
      answer: text,
    });

    const nextQ = currentQ + 1;

    if (nextQ >= questions.length) {
      setDone(true);
      onComplete(transcriptRef.current);
    } else {
      tts.prefetch(questions[nextQ]);
      userIsTyping.current = false;

      setTyping(true);
      setCurrentQ(nextQ);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', text: questions[nextQ] }]);
        setTyping(false);
        speakQuestion(questions[nextQ]);
      }, 500 + Math.random() * 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // User is manually typing - stop the mic so it doesn't fight
    if (!speech.transcript || val !== speech.transcript) {
      userIsTyping.current = true;
      if (speech.isListening) {
        speech.reset();
      }
    }
  };

  const toggleMic = () => {
    if (speech.isListening) {
      speech.stop();
    } else {
      userIsTyping.current = false;
      if (aiSpeaking) {
        tts.stop();
        setAiSpeaking(false);
      }
      speech.start();
    }
  };

  const toggleMute = () => {
    if (tts.isSpeaking) {
      tts.stop();
      setAiSpeaking(false);
    }
    tts.setEnabled(!tts.enabled);
  };

  return (
    <div className="chat-container">
      <div className="chat-voice-header">
        <VoiceOrb active={aiSpeaking} />
        <button
          className={`mute-btn ${!tts.enabled ? 'muted' : ''}`}
          onClick={toggleMute}
          title={tts.enabled ? 'Mute AI voice' : 'Unmute AI voice'}
          type="button"
        >
          {tts.enabled ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {typing && (
          <div className="chat-bubble chat-ai">
            <span className="typing-dots">
              <span /><span /><span />
            </span>
          </div>
        )}
        {done && (processing || processingText) && (
          <div className="chat-bubble chat-ai">
            <span className="typing-dots">
              <span /><span /><span />
            </span>
            {processingText && (
              <span className="chat-processing-text">{processingText}</span>
            )}
          </div>
        )}
      </div>

      {!done && (
        <div className="chat-input-bar">
          {(speech.isListening || speech.isTranscribing) && (
            <div className="listening-indicator">
              <div className="listening-wave"><span /><span /><span /><span /><span /></div>
              <span className="listening-label">
                {speech.isTranscribing ? 'Transcribing...' : 'Listening...'}
              </span>
            </div>
          )}
          <div className="chat-input-row">
            <button
              className={`chat-mic ${speech.isListening ? 'active' : ''}`}
              onClick={toggleMic}
              disabled={typing || done}
              type="button"
              title={speech.isListening ? 'Stop listening' : 'Speak your answer'}
            >
              {speech.isListening ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                speech.isListening ? 'Speak now...'
                : speech.isTranscribing ? 'Transcribing...'
                : 'Type or speak...'
              }
              rows={1}
              disabled={typing}
            />
            <button
              className="chat-send"
              onClick={handleSend}
              disabled={!input.trim() || typing}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
