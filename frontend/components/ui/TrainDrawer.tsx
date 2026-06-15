"use client";

import { TrainPosition } from "@/lib/types";

interface TrainDrawerProps {
  train: TrainPosition | null;
  onClose: () => void;
}

export default function TrainDrawer({ train, onClose }: TrainDrawerProps) {
  if (!train) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm rounded-t-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold">Train #{train.train_id}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-400">Status:</span>
          <span className={`ml-2 ${train.delay > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {train.delay > 0 ? `${train.delay} min delayed` : "On time"}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Bearing:</span>
          <span className="ml-2 text-white">{train.bearing}°</span>
        </div>
      </div>
    </div>
  );
}
