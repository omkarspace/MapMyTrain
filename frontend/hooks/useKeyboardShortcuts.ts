"use client";

import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onSearch?: () => void;
  onToggleTheme?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        options.onSearch?.();
      }

      // T for toggle theme
      if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
        options.onToggleTheme?.();
      }

      // + for zoom in
      if (e.key === "+" || e.key === "=") {
        options.onZoomIn?.();
      }

      // - for zoom out
      if (e.key === "-") {
        options.onZoomOut?.();
      }

      // 0 for reset view
      if (e.key === "0") {
        options.onResetView?.();
      }

      // Escape to close panels
      if (e.key === "Escape") {
        options.onEscape?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options]);
}
