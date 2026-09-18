"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";

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

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4" style={{ color: "var(--color-success)" }} />,
    error: <AlertCircle className="w-4 h-4" style={{ color: "var(--color-error)" }} />,
    warning: <AlertTriangle className="w-4 h-4" style={{ color: "var(--color-warning)" }} />,
    info: <Info className="w-4 h-4" style={{ color: "var(--color-accent)" }} />,
  };

  const borderAccent: Record<ToastType, string> = {
    success: "var(--color-success)",
    error: "var(--color-error)",
    warning: "var(--color-warning)",
    info: "var(--color-accent)",
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${borderAccent[toast.type]}`,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {icons[toast.type]}
      <p className="text-sm flex-1" style={{ color: "var(--color-text-primary)" }}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded transition-colors duration-150 outline-none"
        style={{ color: "var(--color-text-tertiary)" }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-alt)"}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
