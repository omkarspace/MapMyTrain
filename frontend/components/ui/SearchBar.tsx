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
    <div className="absolute top-4 left-4 right-4 z-20 max-w-lg mx-auto sm:mx-4">
      <div className="relative">
        <div className="flex gap-1.5 mb-2" role="tablist" aria-label="Search mode">
          <button
            onClick={() => setSearchMode("train")}
            role="tab"
            aria-selected={searchMode === "train"}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: searchMode === "train" ? "var(--color-accent)" : "var(--color-surface)",
              color: searchMode === "train" ? "#fff" : "var(--color-text-secondary)",
              border: searchMode === "train" ? "none" : "1px solid var(--color-border)",
            }}
          >
            By Train
          </button>
          <button
            onClick={() => setSearchMode("route")}
            role="tab"
            aria-selected={searchMode === "route"}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: searchMode === "route" ? "var(--color-accent)" : "var(--color-surface)",
              color: searchMode === "route" ? "#fff" : "var(--color-text-secondary)",
              border: searchMode === "route" ? "none" : "1px solid var(--color-border)",
            }}
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
                  onBlur={(e) => {
                    if (sourceStation && !validateStationCode(sourceStation)) {
                      setSourceError("2-5 characters required");
                    }
                    if (!sourceError) e.target.style.borderColor = "var(--color-border)";
                  }}
                  maxLength={5}
                  aria-invalid={!!sourceError}
                  aria-describedby={sourceError ? "source-error" : undefined}
                  className="w-full px-3 py-2 rounded-md text-sm uppercase transition-all duration-150 outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: sourceError ? "1px solid var(--color-error)" : "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                  onFocus={(e) => {
                    if (!sourceError) e.target.style.borderColor = "var(--color-accent)";
                  }}
                />
                {sourceError && (
                  <p id="source-error" className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
                    {sourceError}
                  </p>
                )}
              </div>
              <div className="flex items-center self-center" style={{ color: "var(--color-text-tertiary)" }}>
                <ArrowRight className="w-4 h-4" />
              </div>
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
                  onBlur={(e) => {
                    if (destStation && !validateStationCode(destStation)) {
                      setDestError("2-5 characters required");
                    }
                    if (!destError) e.target.style.borderColor = "var(--color-border)";
                  }}
                  maxLength={5}
                  aria-invalid={!!destError}
                  aria-describedby={destError ? "dest-error" : undefined}
                  className="w-full px-3 py-2 rounded-md text-sm uppercase transition-all duration-150 outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: destError ? "1px solid var(--color-error)" : "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                  onFocus={(e) => {
                    if (!destError) e.target.style.borderColor = "var(--color-accent)";
                  }}
                />
                {destError && (
                  <p id="dest-error" className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
                    {destError}
                  </p>
                )}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-2 rounded-md text-sm transition-all duration-150 outline-none"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: "var(--color-text-tertiary)" }}>
            {isLoading ? (
              <div className="h-4 w-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }} />
            ) : (
              <Search className="h-4 w-4" />
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
            onKeyDown={handleKeyDown}
            aria-label={
              searchMode === "train"
                ? "Search trains by number or name"
                : "Search trains by route"
            }
            aria-autocomplete="list"
            className="w-full pl-9 pr-4 py-2.5 rounded-md text-sm outline-none transition-all duration-150"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            onFocus={(e) => {
              setIsOpen(true);
              e.target.style.borderColor = "var(--color-accent)";
              e.target.style.boxShadow = "0 0 0 2px var(--color-accent-subtle)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border)";
              e.target.style.boxShadow = "none";
            }}
          />
          {isOpen && (isLoading || suggestions.length > 0 || query.length > 0) && (
            <div
              ref={dropdownRef}
              role="listbox"
              aria-label="Search results"
              className="absolute top-full mt-1.5 w-full rounded-lg overflow-hidden max-h-80 overflow-y-auto"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {isLoading ? (
                <div className="p-2 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TrainCardSkeleton key={i} />
                  ))}
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-5 text-center">
                  <Search className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    No trains found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Try searching by train number or name
                  </p>
                </div>
              ) : suggestions.map((train, index) => (
                <button
                  key={train.train_number}
                  role="option"
                  aria-selected={index === highlightIndex}
                  onClick={() => handleSelect(train)}
                  className="w-full px-4 py-2.5 text-left transition-colors duration-75"
                  style={{
                    backgroundColor: index === highlightIndex ? "var(--color-accent-subtle)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (index !== highlightIndex) e.currentTarget.style.backgroundColor = "var(--color-surface-alt)";
                  }}
                  onMouseLeave={(e) => {
                    if (index !== highlightIndex) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: "var(--color-accent-subtle)",
                        color: "var(--color-accent)",
                      }}
                    >
                      <span className="text-xs font-semibold font-mono">
                        {train.train_number.slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                          {train.train_name}
                        </p>
                        {train.train_type && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                            style={{
                              backgroundColor: getTrainTypeColor(train.train_type) + "1a",
                              color: getTrainTypeColor(train.train_type),
                            }}
                          >
                            {train.train_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                        {train.train_number} • {train.source_station_code} →{" "}
                        {train.destination_station_code}
                        {train.distance_km ? ` • ${train.distance_km} km` : ""}
                      </p>
                    </div>
                    <div className="text-xs shrink-0">
                      {train.average_delay != null && train.average_delay > 0 && (
                        <span style={{ color: "var(--color-warning)" }}>
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
