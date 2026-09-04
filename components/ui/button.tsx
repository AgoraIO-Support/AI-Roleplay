import type { ButtonHTMLAttributes, ReactNode } from "react";

import { SpinnerIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-hover",
  secondary:
    "bg-surface text-foreground border border-border shadow-xs hover:bg-secondary hover:border-border-strong",
  subtle: "bg-secondary text-secondary-foreground hover:bg-muted",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
  danger: "bg-danger text-danger-foreground shadow-xs hover:bg-danger/90",
  "danger-ghost":
    "bg-transparent text-danger border border-transparent hover:bg-danger-subtle hover:border-danger/30",
  link: "bg-transparent text-primary underline-offset-4 hover:underline px-0",
} as const;

/*
 * Heights are on the control scale: sm=36, md=44 (the touch-target minimum),
 * lg=48. Icon variants stay square at the same heights.
 */
const sizes = {
  // Visually 36px, but the hit area is padded out to the 44px minimum.
  sm: "h-control-sm gap-1.5 rounded-lg px-3 text-sm after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']",
  md: "h-control gap-2 rounded-xl px-4 text-sm",
  lg: "h-control-lg gap-2 rounded-xl px-5 text-base",
} as const;

const iconSizes = {
  sm: "h-control-sm w-control-sm rounded-lg p-0 after:absolute after:-inset-1 after:content-['']",
  md: "h-control w-control rounded-xl p-0",
  lg: "h-control-lg w-control-lg rounded-xl p-0",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Renders a square icon-only button. Requires `aria-label`. */
  iconOnly?: boolean;
  /** Shows a spinner and blocks interaction while an action is in flight. */
  loading?: boolean;
  /** Replaces the label while `loading` is true; falls back to the label. */
  loadingText?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  iconOnly = false,
  loading = false,
  loadingText,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={props.type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-colors duration-fast ease-out [touch-action:manipulation]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        iconOnly ? iconSizes[size] : sizes[size],
        fullWidth && "w-full",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <SpinnerIcon className={cn("h-4 w-4", !iconOnly && "shrink-0")} />
      ) : (
        leadingIcon
      )}
      {iconOnly ? (
        // The icon is the label; `aria-label` carries the accessible name.
        !loading && children
      ) : (
        <span className="truncate">
          {loading ? (loadingText ?? children) : children}
        </span>
      )}
      {!loading && !iconOnly ? trailingIcon : null}
    </button>
  );
}
