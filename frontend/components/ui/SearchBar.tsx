"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { Train } from "@/lib/types";

interface SearchBarProps {
  onTrainSelect: (train: Train) => void;
  trains: Train[];
}

export function SearchBar({ onTrainSelect, trains }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Train[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchTrains = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setSuggestions([]);
        return;
      }
      const lower = q.toLowerCase();
      const filtered = trains.filter(
        (t) =>
          t.train_number.includes(lower) ||
          t.train_name.toLowerCase().includes(lower)
      );
      setSuggestions(filtered.slice(0, 10));
    },
    [trains]
  );

  useEffect(() => {
    const timer = setTimeout(() => searchTrains(query), 150);
    return () => clearTimeout(timer);
  }, [query, searchTrains]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      onTrainSelect(suggestions[highlightIndex]);
      setQuery("");
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (train: Train) => {
    onTrainSelect(train);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20 max-w-lg">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search train number or name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {isOpen && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full mt-1 w-full bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden shadow-xl max-h-80 overflow-y-auto"
          >
            {suggestions.map((train, index) => (
              <button
                key={train.train_number}
                onClick={() => handleSelect(train)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-800 transition-colors ${
                  index === highlightIndex ? "bg-slate-800" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-xs font-mono font-bold">
                      {train.train_number.slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {train.train_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {train.train_number} • {train.source_station_code} →{" "}
                      {train.destination_station_code}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {train.average_delay != null && train.average_delay > 0 && (
                      <span className="text-amber-400">
                        +{train.average_delay}m
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
