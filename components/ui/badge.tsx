import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/* Every tone resolves through tokens so it re-tunes itself in dark mode. */
const variants = {
  default: "bg-primary-subtle text-primary-subtle-foreground",
  neutral: "bg-secondary text-secondary-foreground",
  /** Alias of `neutral`, kept for existing call sites. */
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success-subtle text-success-subtle-foreground",
  warning: "bg-warning-subtle text-warning-subtle-foreground",
  danger: "bg-danger-subtle text-danger-subtle-foreground",
  info: "bg-info-subtle text-info-subtle-foreground",
  outline: "border border-border-strong bg-transparent text-muted-foreground",
} as const;

const sizes = {
  sm: "h-5 px-2 text-[0.6875rem]",
  md: "h-6 px-2.5 text-xs",
} as const;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Small leading dot — carries status without relying on colour alone. */
  dot?: boolean;
  icon?: ReactNode;
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-medium leading-none",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
