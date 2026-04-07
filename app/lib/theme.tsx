"use client";

// Minimal theme provider — replaces `next-themes` to avoid the React 19 warning
// about <script> tags rendered inside React components. The no-flash inline
// script is now injected once in app/layout.tsx via dangerouslySetInnerHTML
// (the standard pattern for run-once head scripts in Next.js App Router).
//
// API surface intentionally matches `next-themes` so consumers don't change:
//   const { theme, setTheme, resolvedTheme } = useTheme()

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme | undefined;
  resolvedTheme: Theme | undefined;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: undefined,
  resolvedTheme: undefined,
  setTheme: () => {},
});

const STORAGE_KEY = "theme";

function readInitial(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // We seed from the DOM, which the inline head script set before hydration.
  // This guarantees server-rendered HTML and the first client render agree
  // on the class — no flash, no hydration mismatch.
  const [theme, setThemeState] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    // Sync React state with the DOM class set by the inline no-flash script
    // in <head>. This is the documented pattern for hydrating from a
    // pre-React-mount external mutation; the React 19 lint rule against
    // setState-in-effect is overly strict for this case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readInitial());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* quota / disabled */
    }
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// Stringified body of the no-flash script for layout.tsx to inject in <head>.
// Kept here so the storage key + class name stay co-located with the provider.
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
