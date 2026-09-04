import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Empty views must explain the state and offer the next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
