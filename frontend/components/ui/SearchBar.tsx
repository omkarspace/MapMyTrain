"use client";

import { useState } from "react";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Train No. or Station..."
          className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
