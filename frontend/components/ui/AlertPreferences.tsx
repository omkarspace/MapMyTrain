"use client";

import { useState } from "react";
import { Bell, MessageSquare, Smartphone } from "lucide-react";

interface AlertPreferencesProps {
  trainNumber: string;
  onClose: () => void;
}

interface AlertConfig {
  delayThreshold: number;
  nextStationAlert: boolean;
  arrivalAlert: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
}

export function AlertPreferences({ trainNumber, onClose }: AlertPreferencesProps) {
  const [config, setConfig] = useState<AlertConfig>({
    delayThreshold: 15,
    nextStationAlert: true,
    arrivalAlert: true,
    whatsappEnabled: false,
    pushEnabled: false,
  });

  const handleSave = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: "oklch(0 0 0 / 0.4)" }}
    >
      <div
        className="w-full max-w-md mx-4 animate-fade-scale-in rounded-xl p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
              }}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Alert Preferences</h3>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Train {trainNumber}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm mb-2 block" style={{ color: "var(--color-text-secondary)" }}>
              Delay Alert Threshold (minutes)
            </label>
            <input
              type="range"
              min="5"
              max="60"
              value={config.delayThreshold}
              onChange={(e) =>
                setConfig({ ...config, delayThreshold: parseInt(e.target.value) })
              }
              className="w-full"
              style={{ accentColor: "var(--color-accent)" }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
              <span>5 min</span>
              <span style={{ color: "var(--color-text-secondary)" }}>{config.delayThreshold} min</span>
              <span>60 min</span>
            </div>
          </div>

          <div className="space-y-3">
            <label
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
              style={{ backgroundColor: "var(--color-bg)" }}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" style={{ color: "var(--color-warning)" }} />
                <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Next Station Alert</span>
              </div>
              <input
                type="checkbox"
                checked={config.nextStationAlert}
                onChange={(e) =>
                  setConfig({ ...config, nextStationAlert: e.target.checked })
                }
                className="w-4 h-4 rounded"
                style={{ accentColor: "var(--color-accent)" }}
              />
            </label>

            <label
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
              style={{ backgroundColor: "var(--color-bg)" }}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" style={{ color: "var(--color-success)" }} />
                <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Final Arrival Alert</span>
              </div>
              <input
                type="checkbox"
                checked={config.arrivalAlert}
                onChange={(e) =>
                  setConfig({ ...config, arrivalAlert: e.target.checked })
                }
                className="w-4 h-4 rounded"
                style={{ accentColor: "var(--color-accent)" }}
              />
            </label>
          </div>

          <div className="pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-tertiary)" }}>Notification Channels</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfig({ ...config, pushEnabled: !config.pushEnabled })}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors text-sm"
                style={{
                  backgroundColor: config.pushEnabled ? "var(--color-accent-subtle)" : "var(--color-bg)",
                  borderColor: config.pushEnabled ? "var(--color-accent)" : "var(--color-border)",
                  color: config.pushEnabled ? "var(--color-accent)" : "var(--color-text-tertiary)",
                }}
              >
                <Smartphone className="w-4 h-4" />
                <span>Push</span>
              </button>
              <button
                onClick={() => setConfig({ ...config, whatsappEnabled: !config.whatsappEnabled })}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors text-sm"
                style={{
                  backgroundColor: config.whatsappEnabled ? "color-mix(in srgb, var(--color-success) 15%, transparent)" : "var(--color-bg)",
                  borderColor: config.whatsappEnabled ? "var(--color-success)" : "var(--color-border)",
                  color: config.whatsappEnabled ? "var(--color-success)" : "var(--color-text-tertiary)",
                }}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg transition-colors text-sm"
            style={{
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 rounded-lg transition-colors text-sm"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#fff",
            }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
