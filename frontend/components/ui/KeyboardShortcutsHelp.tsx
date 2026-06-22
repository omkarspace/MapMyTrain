"use client";

import { useState } from "react";
import { Keyboard, X } from "lucide-react";

const shortcuts = [
  { key: "Ctrl/⌘ + K", description: "Focus search" },
  { key: "T", description: "Toggle theme" },
  { key: "+", description: "Zoom in" },
  { key: "-", description: "Zoom out" },
  { key: "0", description: "Reset view" },
  { key: "Esc", description: "Close panels" },
];

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="control-3d-btn"
        title="Keyboard shortcuts"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full mx-4 animate-fade-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {shortcut.description}
                    </span>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
