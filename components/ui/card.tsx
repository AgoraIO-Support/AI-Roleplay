import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** flat = border only; raised = default page card; overlay = modal/popover. */
  elevation?: "flat" | "raised" | "overlay";
  /** Adds hover lift + pointer affordance for cards that act as links. */
  interactive?: boolean;
};

const elevations = {
  flat: "shadow-none",
  raised: "shadow-soft",
  overlay: "shadow-overlay",
} as const;

export function Card({
  className,
  elevation = "raised",
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground",
        elevations[elevation],
        interactive &&
          "cursor-pointer transition-shadow duration-fast ease-out hover:border-border-strong hover:shadow-raised focus-within:border-primary",
        className,
      )}
      {...props}
    />
  );
}

/* Padding is uniform at 20px (p-5) on mobile and 24px (p-6) from sm up, so
 header/content/footer stay optically aligned down the left edge. */
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-5 pb-4 sm:p-6 sm:pb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
