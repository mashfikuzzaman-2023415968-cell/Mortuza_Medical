import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, HeartPulse, ChevronDown, Send } from 'lucide-react';
import api from '../api/axios';

/* Escape HTML, then apply lightweight formatting (no markdown lib).
   Escape ALL five HTML-sensitive characters (not just < and >) so the
   output is safe in any context — including attribute values, should the
   formatter ever be extended to emit attributes. & must come first so the
   entities we introduce aren't double-escaped. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function inlineFormat(line) {
  return escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function BotText({ text }) {
  const lines = text.split('\n');
  const blocks = [];
  let list = [];
  const flush = (key) => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${key}`} className="list-disc pl-4 space-y-0.5 my-1">
          {list.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: li }} />)}
        </ul>
      );
      list = [];
    }
  };
  lines.forEach((raw, idx) => {
    const m = raw.match(/^\s*[-•*]\s+(.*)$/);
    if (m) {
      list.push(inlineFormat(m[1]));
    } else {
      flush(idx);
      if (raw.trim() === '') {
        blocks.push(<div key={idx} className="h-1.5" />);
      } else {
        blocks.push(<p key={idx} dangerouslySetInnerHTML={{ __html: inlineFormat(raw) }} />);
      }
    }
  });
  flush('end');
  return <div className="space-y-0.5">{blocks}</div>;
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role:'user'|'bot', text, timestamp }
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState('');

  const endRef = useRef(null);
  const inputRef = useRef(null);

  // fetch the patient's name for the welcome message (once)
  useEffect(() => {
    api.get('/patients/me')
      .then((res) => {
        const full = res.data?.data?.full_name || '';
        setFirstName(full.split(' ')[0] || '');
      })
      .catch(() => {});
  }, []);

  // auto-scroll on new message / typing
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // auto-focus input when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const welcomeText = `Hello ${firstName || 'there'}! 👋 I'm your health assistant at Mortuza Medical Centre.

I can help you with:
- Your visits, prescriptions, and test results
- Questions about your medications and treatments
- General health questions and medical advice
- Medical Centre services and hours

What would you like to know?`;

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', text, timestamp: new Date() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    // convert last 20 messages to Gemini format (welcome is not part of state)
    const history = nextMessages
      .slice(0, -1) // exclude the message we're about to send (sent separately)
      .slice(-20)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));

    try {
      const res = await api.post('/chat', { message: text, history });
      const reply = res.data?.success
        ? res.data.data.reply
        : (res.data?.error || "I couldn't generate a response. Please try again.");
      setMessages((prev) => [...prev, { role: 'bot', text: reply, timestamp: new Date() }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Health assistant is temporarily unavailable. Please try again.';
      setMessages((prev) => [...prev, { role: 'bot', text: msg, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Popup */}
      {isOpen && (
        <div
          className="fixed bottom-[92px] right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[520px] max-h-[70vh]
                     bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ animation: 'cardPop 0.18s cubic-bezier(0.34,1.4,0.64,1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-sky-500 to-teal-500 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <HeartPulse size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Health Assistant</p>
                <p className="text-[11px] text-white/80 leading-tight">Mortuza Medical Centre</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} title="Minimize"
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {/* Welcome (hardcoded, never sent to API) */}
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HeartPulse size={14} className="text-sky-600" />
              </div>
              <div className="max-w-[78%]">
                <div className="bg-white border border-gray-100 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-gray-800">
                  <BotText text={welcomeText} />
                </div>
              </div>
            </div>

            {messages.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} className="flex flex-col items-end">
                  <div className="max-w-[80%] bg-sky-500 text-white rounded-xl rounded-tr-sm px-3 py-2 text-sm whitespace-pre-wrap break-words">
                    {m.text}
                  </div>
                  <span className="text-xs text-sky-300 mt-0.5 mr-1">{fmtTime(m.timestamp)}</span>
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <HeartPulse size={14} className="text-sky-600" />
                  </div>
                  <div className="max-w-[80%]">
                    <div className="bg-white border border-gray-100 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 break-words">
                      <BotText text={m.text} />
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5 ml-1 block">{fmtTime(m.timestamp)}</span>
                  </div>
                </div>
              )
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <HeartPulse size={14} className="text-sky-600" />
                </div>
                <div className="bg-white border border-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 p-2.5 border-t border-gray-100 bg-white flex-shrink-0">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isLoading}
              placeholder="Ask a health question..."
              className="flex-1 resize-none max-h-24 px-3 py-2 text-sm focus:outline-none rounded-lg disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0
                         hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? 'Close chat' : 'Health Assistant'}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-teal-500
                   text-white shadow-lg flex items-center justify-center hover:scale-105 hover:shadow-xl transition-all"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
