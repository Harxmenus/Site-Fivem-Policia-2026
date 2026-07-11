import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const colors: Record<ToastMessage['type'], string> = {
  success: 'bg-emerald-950/80 border-emerald-700/50 text-emerald-300',
  error: 'bg-red-950/80 border-red-700/50 text-red-300',
  info: 'bg-blue-950/80 border-blue-700/50 text-blue-300',
};

const icons: Record<ToastMessage['type'], typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: AlertCircle,
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((type: ToastMessage['type'], message: string, duration = 4000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}

export default function Toast({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`pointer-events-auto border rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-xl flex items-start gap-3 ${colors[toast.type]}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold flex-1 leading-relaxed">{toast.message}</p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
