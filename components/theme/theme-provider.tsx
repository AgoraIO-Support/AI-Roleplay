"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "airp-theme";

/**
 * Routes that always render light, whatever the user's preference.
 * Signed-out surfaces are brand pages with one fixed look; the light/dark
 * control only governs the workspace behind the login.
 */
export const LIGHT_ONLY_PATHS = ["/login"];

export function isLightOnlyPath(pathname: string) {
  return LIGHT_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

type ThemeContextValue = {
  /** True while the current route is pinned to light (the toggle is hidden). */
  isThemeLocked: boolean;
  /** What the user picked, including "system". */
  theme: ThemePreference;
  /** What is actually painted right now. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  /** Cycles light -> dark -> system. */
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server render and first paint both assume "system"; the inline script in
  // the document head has already applied the correct class, so there is no
  // flash — we only re-sync React state after hydration.
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const pathname = usePathname();
  const isThemeLocked = isLightOnlyPath(pathname ?? "");

  useEffect(() => {
    const stored = window.localStorage.getItem(
      THEME_STORAGE_KEY,
    ) as ThemePreference | null;
    const initial: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setThemeState(initial);
    setResolvedTheme(initial === "system" ? systemTheme() : initial);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(media.matches ? "dark" : "light");

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  // Paint the theme. Locked routes render light while leaving the stored
  // preference untouched, so it comes back as soon as the user is inside.
  useEffect(() => {
    applyTheme(isThemeLocked ? "light" : resolvedTheme);
  }, [isThemeLocked, resolvedTheme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    setResolvedTheme(next === "system" ? systemTheme() : next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled — the theme still applies for this session.
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light",
    );
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, isThemeLocked, setTheme, cycleTheme }),
    [theme, resolvedTheme, isThemeLocked, setTheme, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Runs before first paint to set the `dark` class from storage or the OS
 * preference, so a dark-mode user never sees a white flash.
 */
export const themeInitScript = `(function(){try{
var lightOnly=${JSON.stringify(LIGHT_ONLY_PATHS)};
var p=location.pathname;
var locked=lightOnly.some(function(x){return p===x||p.indexOf(x+"/")===0;});
var s=localStorage.getItem('${THEME_STORAGE_KEY}');
var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
var r=locked?'light':((s==='dark'||s==='light')?s:(d?'dark':'light'));
var e=document.documentElement;
if(r==='dark')e.classList.add('dark');else e.classList.remove('dark');
e.style.colorScheme=r;
}catch(_){}})();`;
