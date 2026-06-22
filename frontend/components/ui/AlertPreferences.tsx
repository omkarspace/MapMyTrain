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
    // TODO: save to user preferences API
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl animate-fade-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Alert Preferences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Train {trainNumber}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-700 dark:text-slate-300 mb-2 block">
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
            />
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
              <span>5 min</span>
              <span className="text-slate-700 dark:text-slate-300">{config.delayThreshold} min</span>
              <span>60 min</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Next Station Alert</span>
              </div>
              <input
                type="checkbox"
                checked={config.nextStationAlert}
                onChange={(e) =>
                  setConfig({ ...config, nextStationAlert: e.target.checked })
                }
                className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-green-500 dark:text-green-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Final Arrival Alert</span>
              </div>
              <input
                type="checkbox"
                checked={config.arrivalAlert}
                onChange={(e) =>
                  setConfig({ ...config, arrivalAlert: e.target.checked })
                }
                className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Notification Channels</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setConfig({ ...config, pushEnabled: !config.pushEnabled })
                }
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  config.pushEnabled
                    ? "bg-blue-500/20 border-blue-500 text-blue-500 dark:text-blue-400"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-sm">Push</span>
              </button>
              <button
                onClick={() =>
                  setConfig({ ...config, whatsappEnabled: !config.whatsappEnabled })
                }
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  config.whatsappEnabled
                    ? "bg-green-500/20 border-green-500 text-green-500 dark:text-green-400"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
