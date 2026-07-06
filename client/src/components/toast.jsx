import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/* Lightweight toast system: const toast = useToast(); toast.success('Saved');
   Rendered top-right, auto-dismisses, dark-mode aware via existing overrides. */

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600', bar: 'bg-emerald-500' },
  error:   { icon: AlertCircle,  cls: 'text-rose-600',    bar: 'bg-rose-500' },
  info:    { icon: Info,         cls: 'text-sky-600',     bar: 'bg-sky-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((tone, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, tone, message }]); // max 4 on screen
    setTimeout(() => dismiss(id), 3800);
  }, [dismiss]);

  const api = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 w-[min(92vw,340px)] pointer-events-none">
        {toasts.map(({ id, tone, message }) => {
          const t = TONES[tone] || TONES.info;
          return (
            <div
              key={id}
              className="pointer-events-auto flex items-start gap-2.5 bg-white rounded-xl border border-gray-100 shadow-lg pl-3 pr-2 py-2.5 overflow-hidden relative"
              style={{ animation: 'toastIn 0.22s cubic-bezier(0.21,1.02,0.73,1) both' }}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${t.bar}`} />
              <t.icon size={17} className={`${t.cls} flex-shrink-0 mt-0.5`} />
              <p className="text-sm text-gray-700 flex-1 leading-snug">{message}</p>
              <button
                onClick={() => dismiss(id)}
                className="text-gray-300 hover:text-gray-500 p-0.5 flex-shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  // Fallback no-op keeps components safe if provider is missing (e.g. tests)
  return useContext(ToastContext) || { success: () => {}, error: () => {}, info: () => {} };
}
