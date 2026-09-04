import { cn } from "@/lib/utils";

const tones = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

const sizes = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
} as const;

export function Progress({
  value,
  className,
  tone = "primary",
  size = "md",
  label,
}: {
  value: number;
  className?: string;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  /** Accessible name; falls back to a generic one so the bar is never unlabelled. */
  label?: string;
}) {
  const clamped = Math.max(
    0,
    Math.min(100, Number.isFinite(value) ? value : 0),
  );

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        sizes[size],
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-slow ease-out",
          tones[tone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
