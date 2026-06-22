"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <Info className="w-4 h-4 text-blue-500" />,
  };

  const borderColors = {
    success: "border-emerald-500/50",
    error: "border-red-500/50",
    warning: "border-amber-500/50",
    info: "border-blue-500/50",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border rounded-lg shadow-lg animate-slide-down-enter",
        borderColors[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
      >
        <X className="w-3 h-3 text-slate-400" />
      </button>
    </div>
  );
}
