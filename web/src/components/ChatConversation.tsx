import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

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
  const transcriptRef = useRef<{ question: string; answer: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechRecognition();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Show first question on mount
  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => {
      setMessages([{ role: 'ai', text: questions[0] }]);
      setTyping(false);
    }, 600);
    return () => clearTimeout(t);
  }, [questions]);

  // Scroll on new messages or speech transcript changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, speech.transcript, scrollToBottom]);

  // Focus input when typing indicator clears (only if not listening)
  useEffect(() => {
    if (!typing && !done && !speech.isListening && inputRef.current) {
      inputRef.current.focus();
    }
  }, [typing, done, speech.isListening]);

  // Sync speech transcript into input field
  useEffect(() => {
    if (speech.transcript) {
      setInput(speech.transcript);
    }
  }, [speech.transcript]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || typing || done) return;

    // Stop listening if active
    if (speech.isListening) {
      speech.stop();
    }

    // Add user message
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    speech.reset();

    // Record in transcript
    transcriptRef.current.push({
      question: questions[currentQ],
      answer: text,
    });

    const nextQ = currentQ + 1;

    if (nextQ >= questions.length) {
      setDone(true);
      onComplete(transcriptRef.current);
    } else {
      setTyping(true);
      setCurrentQ(nextQ);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', text: questions[nextQ] }]);
        setTyping(false);
      }, 500 + Math.random() * 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (speech.isListening) {
      speech.stop();
    } else {
      speech.start();
    }
  };

  return (
    <div className="chat-container">
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
        <div className={`chat-input-bar ${speech.isListening ? 'listening' : ''}`}>
          {speech.isListening && (
            <div className="listening-indicator">
              <div className="listening-wave"><span /><span /><span /><span /><span /></div>
              <span className="listening-label">Listening...</span>
            </div>
          )}
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={speech.isListening ? 'Speak now...' : 'Type your answer...'}
            rows={1}
            disabled={typing}
          />
          <div className="chat-actions">
            {speech.isSupported && (
              <button
                className={`chat-mic ${speech.isListening ? 'active' : ''}`}
                onClick={toggleMic}
                disabled={typing || done}
                type="button"
                title={speech.isListening ? 'Stop listening' : 'Speak your answer'}
              >
                {speech.isListening ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            )}
            <button
              className="chat-send"
              onClick={handleSend}
              disabled={!input.trim() || typing}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
