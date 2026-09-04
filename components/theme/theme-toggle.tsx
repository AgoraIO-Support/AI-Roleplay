"use client";

import { useEffect, useState } from "react";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import {
  useTheme,
  type ThemePreference,
} from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const options: Array<{
  value: ThemePreference;
  label: string;
  Icon: typeof SunIcon;
}> = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

/**
 * Segmented light/dark/system control. Rendered as a radiogroup so the whole
 * control is one tab stop and arrow keys move between options.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, isThemeLocked } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The stored preference is only known client-side; render a stable
  // placeholder until then so server and client markup match.
  useEffect(() => setMounted(true), []);

  // Signed-out routes are pinned to light, so the control has nothing to do.
  if (isThemeLocked) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface-sunken p-0.5",
        className,
      )}
    >
      {options.map(({ value, label, Icon }) => {
        const isSelected = mounted && theme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            tabIndex={isSelected || (!mounted && value === "system") ? 0 : -1}
            onClick={() => setTheme(value)}
            className={cn(
              "relative inline-flex h-8 w-8 items-center justify-center rounded-[0.625rem]",
              // Hit area is expanded to the 44px minimum without changing layout.
              "after:absolute after:-inset-1.5 after:content-['']",
              "transition-colors duration-fast ease-out [touch-action:manipulation]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              isSelected
                ? "bg-surface text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
