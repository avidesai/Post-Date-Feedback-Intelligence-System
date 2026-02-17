import { useState, useEffect, useRef, useCallback } from 'react';

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

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  // Focus input when typing indicator clears
  useEffect(() => {
    if (!typing && !done && inputRef.current) {
      inputRef.current.focus();
    }
  }, [typing, done]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || typing || done) return;

    // Add user message
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Record in transcript
    transcriptRef.current.push({
      question: questions[currentQ],
      answer: text,
    });

    const nextQ = currentQ + 1;

    if (nextQ >= questions.length) {
      // All questions asked
      setDone(true);
      onComplete(transcriptRef.current);
    } else {
      // Show next question with typing delay
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
        <div className="chat-input-bar">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            rows={1}
            disabled={typing}
          />
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
      )}
    </div>
  );
}
