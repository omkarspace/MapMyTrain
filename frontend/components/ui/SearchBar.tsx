"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Train } from "@/lib/types";
import { API_BASE_URL, getTrainTypeColor } from "@/lib/constants";
import { TrainCardSkeleton } from "./Skeleton";
import { useToast } from "./Toast";

interface SearchBarProps {
  onTrainSelect: (train: Train) => void;
  trains: Train[];
}

export function SearchBar({ onTrainSelect, trains }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [sourceStation, setSourceStation] = useState("");
  const [destStation, setDestStation] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [suggestions, setSuggestions] = useState<Train[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [searchMode, setSearchMode] = useState<"train" | "route">("train");
  const [isLoading, setIsLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [destError, setDestError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const validateStationCode = (code: string): boolean => {
    return code.length >= 2 && code.length <= 5;
  };

  const searchTrains = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      if (searchMode === "route" && sourceStation && destStation) {
        const filtered = trains.filter(
          (t) =>
            t.source_station_code?.toUpperCase() === sourceStation.toUpperCase() &&
            t.destination_station_code?.toUpperCase() === destStation.toUpperCase()
        );
        setSuggestions(filtered.slice(0, 10));
        setIsLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/trains/search/${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(data.trains?.slice(0, 10) || []);
      } catch {
        const lower = q.toLowerCase();
        const filtered = trains.filter(
          (t) =>
            t.train_number.includes(lower) ||
            t.train_name.toLowerCase().includes(lower)
        );
        setSuggestions(filtered.slice(0, 10));
      } finally {
        setIsLoading(false);
      }
    },
    [trains, searchMode, sourceStation, destStation]
  );

  useEffect(() => {
    const timer = setTimeout(() => searchTrains(query), 200);
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
    toast(`Tracking ${train.train_name} (${train.train_number})`, "success");
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20 max-w-lg animate-slide-down-enter">
      <div className="relative">
        <div className="flex gap-2 mb-2" role="tablist" aria-label="Search mode">
          <button
            onClick={() => setSearchMode("train")}
            role="tab"
            aria-selected={searchMode === "train"}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              searchMode === "train"
                ? "bg-blue-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            By Train
          </button>
          <button
            onClick={() => setSearchMode("route")}
            role="tab"
            aria-selected={searchMode === "route"}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              searchMode === "route"
                ? "bg-blue-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            By Route
          </button>
        </div>

        {searchMode === "route" && (
          <div className="mb-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="From (e.g., NDLS)"
                  value={sourceStation}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setSourceStation(val);
                    setSourceError(val && !validateStationCode(val) ? "2-5 characters" : "");
                  }}
                  onBlur={() => {
                    if (sourceStation && !validateStationCode(sourceStation)) {
                      setSourceError("2-5 characters required");
                    }
                  }}
                  className={`w-full px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase ${
                    sourceError
                      ? "border-red-500 dark:border-red-500"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                  maxLength={5}
                  aria-invalid={!!sourceError}
                  aria-describedby={sourceError ? "source-error" : undefined}
                />
                {sourceError && (
                  <p id="source-error" className="text-xs text-red-500 mt-1">
                    {sourceError}
                  </p>
                )}
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 self-center" />
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="To (e.g., HWH)"
                  value={destStation}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setDestStation(val);
                    setDestError(val && !validateStationCode(val) ? "2-5 characters" : "");
                  }}
                  onBlur={() => {
                    if (destStation && !validateStationCode(destStation)) {
                      setDestError("2-5 characters required");
                    }
                  }}
                  className={`w-full px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase ${
                    destError
                      ? "border-red-500 dark:border-red-500"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                  maxLength={5}
                  aria-invalid={!!destError}
                  aria-describedby={destError ? "dest-error" : undefined}
                />
                {destError && (
                  <p id="dest-error" className="text-xs text-red-500 mt-1">
                    {destError}
                  </p>
                )}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              searchMode === "train"
                ? "Search train number or name..."
                : "Search trains on this route..."
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            aria-label={
              searchMode === "train"
                ? "Search trains by number or name"
                : "Search trains by route"
            }
            aria-autocomplete="list"
            className="w-full pl-10 pr-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {isOpen && (isLoading || suggestions.length > 0 || query.length > 0) && (
            <div
              ref={dropdownRef}
              role="listbox"
              aria-label="Search results"
              className="absolute top-full mt-1 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-xl max-h-80 overflow-y-auto animate-fade-scale-in"
            >
              {isLoading ? (
                <div className="p-2 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TrainCardSkeleton key={i} />
                  ))}
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-4 text-center">
                  <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No trains found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Try searching by train number or name
                  </p>
                </div>
              ) : suggestions.map((train, index) => (
                <button
                  key={train.train_number}
                  role="option"
                  aria-selected={index === highlightIndex}
                  onClick={() => handleSelect(train)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    index === highlightIndex ? "bg-slate-100 dark:bg-slate-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-blue-500 dark:text-blue-400 text-xs font-mono font-bold">
                        {train.train_number.slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {train.train_name}
                        </p>
                        {train.train_type && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                            style={{
                              backgroundColor: getTrainTypeColor(train.train_type) + "22",
                              color: getTrainTypeColor(train.train_type),
                            }}
                          >
                            {train.train_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {train.train_number} • {train.source_station_code} →{" "}
                        {train.destination_station_code}
                        {train.distance_km ? ` • ${train.distance_km} km` : ""}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {train.average_delay != null && train.average_delay > 0 && (
                        <span className="text-amber-500 dark:text-amber-400">
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
    </div>
  );
}
