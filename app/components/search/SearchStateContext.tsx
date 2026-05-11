"use client";

import { createContext, ReactNode, useContext, useMemo, useRef } from "react";
import type { FormValues } from "./form";

interface SearchStateContextValue {
  getStoredValues: () => FormValues | null;
  setStoredValues: (values: FormValues) => void;
}

const SearchStateContext = createContext<SearchStateContextValue | null>(null);

export function SearchStateProvider({ children }: { children: ReactNode }) {
  const ref = useRef<FormValues | null>(null);

  const value = useMemo<SearchStateContextValue>(
    () => ({
      getStoredValues: () => ref.current,
      setStoredValues: (values) => {
        ref.current = values;
      },
    }),
    [],
  );

  return (
    <SearchStateContext.Provider value={value}>
      {children}
    </SearchStateContext.Provider>
  );
}

export function useSearchState() {
  const ctx = useContext(SearchStateContext);
  if (!ctx) {
    throw new Error("useSearchState must be used within SearchStateProvider");
  }
  return ctx;
}
