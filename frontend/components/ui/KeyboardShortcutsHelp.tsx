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
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
          style={{ backgroundColor: "oklch(0 0 0 / 0.4)" }}>
          <div
            className="max-w-sm w-full mx-4 animate-fade-scale-in rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--color-surface)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded transition-colors duration-150"
                style={{ color: "var(--color-text-tertiary)" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-alt)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="space-y-3">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {shortcut.description}
                    </span>
                    <kbd
                      className="px-2 py-1 rounded text-xs font-mono"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        color: "var(--color-text-secondary)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
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
